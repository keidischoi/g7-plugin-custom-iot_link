<?php

namespace Plugins\Custom\IotLink\Support;

/**
 * 1.4.8 💰 IoT 기기 칸 결제 — 마일리지(custom-mileage) · 코인(custom-coin) 공개 필터 (현상금 · 의뢰/입찰과 같은 방식)
 *   차감  {plugin}.spend (ref slot:{칸 id}[:{달}]) — 같은 ref 는 한 번만 차감
 * 그 화폐 플러그인이 없거나 꺼져 있거나 관리자가 값을 0 으로 두면 그 화폐로는 못 삼.
 */
final class Points
{
    public const CURRENCIES = ['coin', 'mileage'];

    /** 코어 클래스 (검사에서만 바꿈) */
    public static string $hookManager = 'App\\Extension\\HookManager';

    /** @var array<string, array<string, mixed>> */
    private static array $api = [];

    public static function reset(): void
    {
        self::$api = [];
    }

    private static function prefix(string $cur): string
    {
        return $cur === 'coin' ? 'custom-coin' : 'custom-mileage';
    }

    /** 1.4.8 센서 칸 값 — $n = 1(한 개) · 10(열 개 묶음) · 관리자 설정 (0 = 그 화폐 · 그 묶음으로는 안 팖) */
    public static function price(string $cur, int $n = 1): int
    {
        return (int) Settings::get('slot_'.($cur === 'coin' ? 'coin' : 'mileage').'_price'.($n === 10 ? '10' : ''));
    }

    /**
     * 1.8.3 개수를 정해 살 때 값 — 10개마다 묶음 값(있으면) + 나머지는 1개 값. 못 사는 조합이면 0
     */
    public static function total(string $cur, int $q): int
    {
        if ($q < 1) {
            return 0;
        }
        $one = self::price($cur, 1);
        $ten = self::price($cur, 10);
        $packs = $ten > 0 ? intdiv($q, 10) : 0;
        $rest = $q - $packs * 10;
        if ($rest > 0 && $one <= 0) {
            return 0;
        }

        return $packs * $ten + $rest * $one;
    }

    /**
     * 1.8.3 돌려주기 — {plugin}.refund(null, 'custom-iot_link', ref, ['amount' => …, 'reason' => …]) · 같은 ref 에서 남은 만큼까지
     *
     * @return array{0: bool, 1: string}
     */
    public static function refund(string $cur, string $ref, int $amount, string $reason): array
    {
        if ($amount <= 0) {
            return [true, ''];
        }
        try {
            $r = self::filter(self::prefix($cur).'.refund', null, 'custom-iot_link', $ref, ['amount' => $amount, 'reason' => $reason]);
        } catch (\Throwable) {
            $r = null;
        }
        if (is_array($r) && ! empty($r['ok'])) {
            return [true, self::format($amount, $cur).' 돌려줬어요.'];
        }

        return [false, is_array($r) && trim((string) ($r['message'] ?? '')) !== '' ? (string) $r['message'] : self::label($cur).'(을)를 돌려주지 못했어요. 잠시 뒤 다시 해 주세요.'];
    }

    /** @return array<string, mixed> */
    public static function api(string $cur): array
    {
        if (isset(self::$api[$cur])) {
            return self::$api[$cur];
        }
        try {
            $r = self::filter(self::prefix($cur).'.api', null);
            $ok = is_array($r) && ! empty($r['spend']) && (! array_key_exists('available', $r) || ! empty($r['available']));

            return self::$api[$cur] = $ok ? $r : [];
        } catch (\Throwable) {
            return self::$api[$cur] = [];
        }
    }

    public static function available(string $cur): bool
    {
        return in_array($cur, self::CURRENCIES, true) && (self::price($cur) > 0 || self::price($cur, 10) > 0) && self::api($cur) !== [];
    }

    /** @return list<string> */
    public static function usable(): array
    {
        return array_values(array_filter(self::CURRENCIES, static fn ($c) => self::available($c)));
    }

    public static function label(string $cur): string
    {
        if ($cur !== 'coin') {
            return '마일리지';
        }
        try {
            $s = self::filter('custom-coin.settings', null);
            $n = is_array($s) ? trim((string) ($s['name'] ?? '')) : '';

            return $n !== '' ? mb_substr($n, 0, 10) : '코인';
        } catch (\Throwable) {
            return '코인';
        }
    }

    public static function format(int $amount, string $cur): string
    {
        if ($cur === 'coin') {
            try {
                $s = self::filter('custom-coin.format', null, $amount);
                if (is_string($s) && $s !== '') {
                    return $s;
                }
            } catch (\Throwable) {
            }

            return number_format($amount).'C';
        }

        return number_format($amount).'P';
    }

    public static function balance(int $userId, string $cur): ?int
    {
        if ($userId < 1 || self::api($cur) === []) {
            return null;
        }
        try {
            $b = self::filter(self::prefix($cur).'.balance', null, $userId);
            if (is_array($b)) {
                $b = $b['balance'] ?? null;
            }

            return is_numeric($b) ? (int) $b : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /** 충전 · 채우기 화면 주소 (화폐 플러그인이 알려 주면) */
    public static function chargeUrl(string $cur): string
    {
        $a = self::api($cur);

        return is_string($a['charge_url'] ?? null) ? (string) $a['charge_url'] : ($cur === 'coin' ? '/coin' : '/mypage/mileage');
    }

    /**
     * 차감 — [성공?, 회원에게 보일 말, 'insufficient'?]
     *
     * @return array{0: bool, 1: string, 2?: string}
     */
    public static function spend(int $userId, int $amount, string $cur, string $ref, string $reason): array
    {
        if (! self::available($cur)) {
            return [false, '지금은 '.self::label($cur).'(으)로 살 수 없어요.'];
        }
        try {
            $r = self::filter(self::prefix($cur).'.spend', null, $userId, $amount, $reason, ['extension' => 'custom-iot_link', 'ref' => $ref]);
        } catch (\Throwable) {
            $r = null;
        }
        if (is_array($r) && ! empty($r['ok']) && ! empty($r['duplicate'])) {
            return [true, '이미 결제했어요.'];
        }
        if (! is_array($r) || empty($r['ok']) || (int) ($r['amount'] ?? $amount) !== $amount) {
            $msg = is_array($r) ? trim((string) ($r['message'] ?? '')) : '';
            if (is_array($r) && ($r['status'] ?? '') === 'insufficient') {
                return [false, self::label($cur).'이(가) 모자라요.', 'insufficient'];
            }

            return [false, $msg !== '' ? $msg : self::label($cur).'(으)로 결제하지 못했어요. 잠시 뒤 다시 해 주세요.'];
        }

        return [true, self::format($amount, $cur).' 결제했어요.'];
    }

    private static function filter(string $hook, mixed ...$args): mixed
    {
        $hm = self::$hookManager;
        if (! class_exists($hm) || ! method_exists($hm, 'applyFilters')) {
            return null;
        }

        return $hm::applyFilters($hook, ...$args);
    }
}
