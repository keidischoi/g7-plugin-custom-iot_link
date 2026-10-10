<?php

namespace Plugins\Custom\IotLink\Support;

/**
 * 0.2.0 SmartThings 요청 서명 (HTTP Signatures, rsa-sha256) — DB · Laravel 없이 검사: tests/run.php
 *
 *  Authorization: Signature keyId="/pl/useast2/…",signature="…",headers="(request-target) digest date",algorithm="rsa-sha256"
 *  1) keyId 로 공개 키(인증서)를 받음  2) (request-target) · digest · date 로 서명할 글을 다시 만듦
 *  3) rsa-sha256 으로 서명 확인  4) Digest 가 본문의 SHA-256 과 같은지  5) Date 가 너무 오래되지 않았는지
 */
final class StSignature
{
    /** Date 허용 차이 (초) — 다시 보내기 · 시계 차이를 생각해 넉넉히 */
    public const SKEW = 600;

    /** @return array<string, string>|null keyId · signature · headers · algorithm */
    public static function parse(?string $auth): ?array
    {
        $auth = trim((string) $auth);
        if (stripos($auth, 'Signature ') !== 0 || strlen($auth) > 4096) {
            return null;
        }
        preg_match_all('/([A-Za-z]+)\s*=\s*"([^"]*)"/', substr($auth, 10), $m, PREG_SET_ORDER);
        $out = [];
        foreach ($m as $x) {
            $out[strtolower($x[1])] = $x[2];
        }
        if (($out['keyid'] ?? '') === '' || ($out['signature'] ?? '') === '') {
            return null;
        }

        return ['keyId' => $out['keyid'], 'signature' => $out['signature'], 'headers' => strtolower(trim($out['headers'] ?? 'date')), 'algorithm' => strtolower($out['algorithm'] ?? '')];
    }

    /** keyId 모양 (주소에 붙이므로 엄격히 — 경로 밖으로 못 나가게) */
    public static function keyIdOk(string $keyId): bool
    {
        return (bool) preg_match('#^/[A-Za-z0-9._~:/-]{1,200}$#', $keyId) && ! str_contains($keyId, '..') && ! str_contains($keyId, '//');
    }

    /** @return list<string> 공개 키를 받아 볼 주소 (차례대로) */
    public static function keyUrls(string $keyId): array
    {
        return self::keyIdOk($keyId) ? [SmartThings::KEY_HOST.$keyId, SmartThings::KEY_HOST.'/key'.$keyId] : [];
    }

    /**
     * 서명할 글
     *
     * @param  array<string, string>  $headers  소문자 이름 => 값
     */
    public static function signingString(string $method, string $target, array $headers, string $list): ?string
    {
        $lines = [];
        foreach (preg_split('/\s+/', trim($list)) ?: [] as $h) {
            if ($h === '(request-target)') {
                $lines[] = '(request-target): '.strtolower($method).' '.$target;
            } elseif (isset($headers[$h])) {
                $lines[] = $h.': '.trim($headers[$h]);
            } else {
                return null;
            }
        }

        return implode("\n", $lines);
    }

    /** Digest: SHA-256=… (또는 SHA256=…) 가 본문과 맞는가 */
    public static function digestOk(?string $digest, string $body): bool
    {
        $want = base64_encode(hash('sha256', $body, true));
        foreach (explode(',', (string) $digest) as $part) {
            if (preg_match('/^\s*sha-?256=(.+?)\s*$/i', $part, $m) && hash_equals($want, $m[1])) {
                return true;
            }
        }

        return false;
    }

    public static function dateOk(?string $date, ?int $now = null): bool
    {
        $t = $date ? strtotime($date) : false;

        return $t !== false && abs(($now ?? time()) - $t) <= self::SKEW;
    }

    /**
     * 요청 확인 — 맞으면 null, 아니면 이유 (로그 · 답에 비밀은 넣지 않음)
     *
     * @param  array<string, string>  $headers  소문자 이름 => 값
     * @param  list<string>  $targets  (request-target) 후보 — 경로만 · 경로+쿼리
     * @param  callable(string): list<string>  $keys  keyId → PEM(공개 키 · 인증서) 후보
     */
    public static function verify(string $method, array $targets, array $headers, string $body, callable $keys, ?int $now = null): ?string
    {
        $p = self::parse($headers['authorization'] ?? null);
        if ($p === null) {
            return 'unsigned';
        }
        if ($p['algorithm'] !== 'rsa-sha256' && $p['algorithm'] !== 'hs2019') {
            return 'algorithm';
        }
        $need = preg_split('/\s+/', $p['headers']) ?: [];
        foreach (['(request-target)', 'digest', 'date'] as $h) {
            if (! in_array($h, $need, true)) {
                return 'headers';
            }
        }
        if (! self::digestOk($headers['digest'] ?? null, $body)) {
            return 'digest';
        }
        if (! self::dateOk($headers['date'] ?? null, $now)) {
            return 'date';
        }
        if (! self::keyIdOk($p['keyId'])) {
            return 'keyid';
        }
        $sig = base64_decode($p['signature'], true);
        if ($sig === false || $sig === '') {
            return 'signature';
        }
        $pems = $keys($p['keyId']);
        if ($pems === []) {
            return 'key';
        }
        foreach (array_unique($targets) as $t) {
            $str = self::signingString($method, $t, $headers, $p['headers']);
            if ($str === null) {
                return 'headers';
            }
            foreach ($pems as $pem) {
                $k = @openssl_pkey_get_public($pem);
                if ($k !== false && openssl_verify($str, $sig, $k, OPENSSL_ALGO_SHA256) === 1) {
                    return null;
                }
            }
        }

        return 'signature';
    }
}
