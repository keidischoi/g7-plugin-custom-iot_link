<?php

namespace Plugins\Custom\IotLink\Support;

/**
 * 받은 값 정리 (DB · Laravel 없이 검사: tests/run.php)
 */
final class Rules
{
    public const TARGETS = ['location' => '필라멘트 · 레진 보관함', 'printer' => '내 프린터', 'equipment' => '업체 장비', 'other' => '그 밖의 장비 · 공간'];

    /** 설정 글을 만들 때 쓰는 HA 엔티티 칸 */
    public const ENTITIES = ['temp', 'hum', 'state', 'progress', 'remaining', 'job'];

    /** 「가동 중」으로 치는 상태 글 (프린터 상태 · 스위치 · 플러그) */
    private const ON = ['on', 'true', '1', 'printing', 'print', 'running', 'busy', 'starting', 'resuming', 'prepare', 'preparing', 'heating', 'paused', 'pause', 'pausing', 'printing from sd', 'working', 'active', 'heat', 'drying',
        'processing', 'self-testing', 'leveling', 'calibrating', 'homing'];   // 0.1.7 Creality WS 등

    /**
     * HA 가 보낸 수 — 'unavailable' · 'unknown' · 빈 글은 null. 범위를 벗어나면 null.
     */
    public static function num(mixed $v, float $min, float $max): ?float
    {
        if (is_string($v)) {
            $v = trim(str_replace(',', '.', $v));
        }
        if (! is_numeric($v)) {
            return null;
        }
        $f = round((float) $v, 1);

        return $f >= $min && $f <= $max ? $f : null;
    }

    /** 상태 글 정리 (40자) — 값이 없으면 null */
    public static function state(mixed $v): ?string
    {
        if (is_bool($v)) {
            return $v ? 'on' : 'off';
        }
        $s = is_scalar($v) ? mb_substr(trim(strip_tags((string) $v)), 0, 40) : '';

        return $s === '' || in_array(strtolower($s), ['unavailable', 'unknown', 'none', 'null'], true) ? null : $s;
    }

    /**
     * 0.1.9 프린터 라운지(내 프린터)로 넘길 상태 글 — 그쪽이 아는 말로 바꿈.
     *  그쪽은 모르는 글을 「쉬는 중」으로 보고, 출력 중에 「쉬는 중」이 오면 출력을 「그만둠」으로 닫음 → 가동 중인데 모르는 글(processing 등)은 printing 으로.
     *  멈춤(stopped · aborted)은 cancelled, 스위치 꺼짐(off)은 idle. 이미 아는 글은 그대로.
     */
    public static function printerState(?string $state): string
    {
        $s = strtolower(trim((string) $state));
        if (in_array($s, ['paused', 'pause', 'pausing'], true)) {
            return 'paused';
        }
        if (in_array($s, ['stopped', 'stop', 'aborted', 'abort', 'canceled', 'cancelled', 'cancelling'], true)) {
            return 'cancelled';
        }
        if (in_array($s, ['complete', 'completed', 'finish', 'finished', 'done', 'success', 'succeeded', 'error', 'failed', 'fail', 'failure'], true)) {
            return $s;
        }

        return self::isOn($s) ? 'printing' : 'idle';
    }

    /** 그 상태 글이 「가동 중」인가 */
    public static function isOn(?string $state): bool
    {
        return $state !== null && in_array(strtolower($state), self::ON, true);
    }

    /**
     * 받은 내용 → 쓸 값만. 온도 · 습도 · 상태 (없으면 null) + 프린터용(진행률 · 남은 분 · 작업 이름)
     *
     * @param  array<string, mixed>  $in
     * @return array{temp: ?float, humidity: ?float, state: ?string, progress: ?float, remaining_min: ?float, job: ?string}
     */
    public static function payload(array $in): array
    {
        $pick = static function (array $keys) use ($in) {
            foreach ($keys as $k) {
                if (array_key_exists($k, $in) && $in[$k] !== null && $in[$k] !== '') {
                    return $in[$k];
                }
            }

            return null;
        };
        $job = self::state($pick(['job', 'name', 'task']));

        return [
            'temp' => self::num($pick(['temperature', 'temp', 't']), -50, 400),
            'humidity' => self::num($pick(['humidity', 'hum', 'h']), 0, 100),
            'state' => self::state(array_key_exists('on', $in) && $in['on'] !== null && $in['on'] !== '' ? (filter_var($in['on'], FILTER_VALIDATE_BOOLEAN) ? 'on' : 'off') : $pick(['state', 'status'])),
            'progress' => self::num($pick(['progress', 'percent']), 0, 100),
            'remaining_min' => self::minutes($pick(['remaining_min', 'remaining'])),
            'job' => $job !== null ? mb_substr($job, 0, 40) : null,
        ];
    }

    /**
     * 0.1.7 남은 시간 → 분. 수는 분으로 보고, 글은 "1h 04m" · "2d 3h" · "45m" · "01:04:00"(시:분:초) · "64:30"(분:초) 를 읽음. 모르면 null.
     */
    public static function minutes(mixed $v): ?float
    {
        if ($v === null || is_bool($v)) {
            return null;
        }
        $n = self::num($v, 0, 100000);
        if ($n !== null) {
            return $n;
        }
        $s = strtolower(trim(is_scalar($v) ? (string) $v : ''));
        if (preg_match('/^(\d{1,4}):(\d{2})(?::(\d{2}))?$/', $s, $m)) {
            $min = isset($m[3]) ? (int) $m[1] * 60 + (int) $m[2] + (int) $m[3] / 60 : (int) $m[1] + (int) $m[2] / 60;

            return round(min(100000, $min), 1);
        }
        if (preg_match_all('/(\d+(?:\.\d+)?)\s*(d|h|m|s)/', $s, $mm, PREG_SET_ORDER) && $mm !== []) {
            $min = 0.0;
            foreach ($mm as $x) {
                $min += (float) $x[1] * ['d' => 1440, 'h' => 60, 'm' => 1, 's' => 1 / 60][$x[2]];
            }

            return round(min(100000, $min), 1);
        }

        return null;
    }

    /** HA 엔티티 이름만 (sensor.xxx_yyy) — 아니면 빈 글 */
    public static function entity(mixed $v): string
    {
        $s = is_scalar($v) ? strtolower(trim((string) $v)) : '';

        return preg_match('/^[a-z_]+\.[a-z0-9_]{1,80}$/', $s) ? $s : '';
    }

    /** 글 정리 — 태그 · 앞뒤 빈칸 빼고 길이 */
    public static function text(mixed $v, int $max): string
    {
        $s = is_scalar($v) ? strip_tags((string) $v) : '';

        return mb_substr(trim((string) preg_replace('/\s+/u', ' ', $s)), 0, $max);
    }

    /** 보관 위치 견주기용 (빈칸 · 대소문자 무시) */
    public static function loc(mixed $v): string
    {
        return mb_strtolower((string) preg_replace('/\s+/u', '', is_scalar($v) ? (string) $v : ''));
    }

    public static function token(): string
    {
        return bin2hex(random_bytes(16));
    }
}
