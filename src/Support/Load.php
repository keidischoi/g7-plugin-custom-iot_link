<?php

namespace Plugins\Custom\IotLink\Support;

use Illuminate\Support\Facades\Cache;

/**
 * 1.17.0 🧯 서버 부하가 높으면 기기 연결이 먼저 느려짐 — 내 프린터(custom-my_printer Pace)와 같은 계산 · 같은 캐시 svcload:level
 *  1분 평균 부하 ÷ 코어 수가 0.9 넘으면 바쁨(2배) · 1.5 넘으면 아주 바쁨(4배) — 설정 load_slow 로 끔
 *  서버 상태 페이지가 읽는 요청 수: 캐시 svcstat:iot_link:{in|batch|mqtt}:{YmdHi} (1분마다 · 2시간)
 */
final class Load
{
    private static ?int $level = null;

    /** 0 여유 · 1 바쁨 · 2 아주 바쁨 (15초 기억) */
    public static function level(): int
    {
        if (self::$level !== null) {
            return self::$level;
        }
        try {
            return self::$level = (int) Cache::remember('svcload:level', 15, static function (): int {
                $l = function_exists('sys_getloadavg') ? (sys_getloadavg() ?: [0])[0] : 0;
                $r = (float) $l / max(1, self::cores());

                return $r >= 1.5 ? 2 : ($r >= 0.9 ? 1 : 0);
            });
        } catch (\Throwable) {
            return self::$level = 0;
        }
    }

    public static function cores(): int
    {
        try {
            return (int) Cache::remember('svcload:cores', 86400, static function (): int {
                $t = @file_get_contents('/proc/cpuinfo');

                return is_string($t) ? max(1, preg_match_all('/^processor\s*:/m', $t)) : max(1, (int) getenv('NUMBER_OF_PROCESSORS'));
            });
        } catch (\Throwable) {
            return 1;
        }
    }

    /** 부하에 따라 늘리는 배수 (설정으로 끌 수 있음) */
    public static function factor(): int
    {
        return Settings::get('load_slow') ? [1, 2, 4][self::level()] : 1;
    }

    /** 서버 상태 페이지용 요청 수 (1분마다) */
    public static function hit(string $metric, int $n = 1): void
    {
        try {
            $k = 'svcstat:iot_link:'.$metric.':'.date('YmdHi');
            Cache::add($k, 0, 7200);
            Cache::increment($k, $n);
        } catch (\Throwable) {
        }
    }
}
