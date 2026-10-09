<?php

namespace Plugins\Custom\HaLink\Support;

use Illuminate\Support\Facades\DB;

/**
 * 관리자 설정 (hal_settings 의 key 'general' 한 줄).
 */
final class Settings
{
    public const DEFAULTS = [
        'enabled' => true,             // HA 연결 쓰기
        'menu_enabled' => true,        // 헤더 메인 메뉴에 넣기 (홈 디자인 「메인 메뉴 보이기」와 서로 맞춤)
        'menu_label' => 'HA 연결',      // 헤더 메뉴 이름 (12글자까지)
        'max_devices' => 20,           // 회원 한 명이 연결할 수 있는 기기
        'interval_min' => 10,          // 0.1.3 값 보내는 주기 (분) — 통합이 이 주기로 보냄. 회원은 이보다 길게만 고를 수 있음
        'keep_days' => 30,             // 온습도 기록을 며칠 둘지 (한 시간에 한 줄)
        'stale_hours' => 3,            // 이 시간 넘게 소식이 없으면 「끊김」
        'alert_gap_hours' => 12,       // 같은 기기의 경고를 다시 보내기까지
        'notify_site' => true,         // 사이트 알림 (기준을 넘으면)
        'notify_mail' => false,        // 메일
        'snapshot' => true,            // 카메라 사진 받기 (기기마다 최신 한 장, 주인만 봄)
        'snap_gap_min' => 5,           // 사진을 받는 가장 짧은 간격 (분)
        'printer_link' => true,        // 내 프린터(custom-my_printer)로 프린터 상태 넘기기
        'company_link' => true,        // 업체검색(custom-companies) 보유 장비에 연결
        'timezone' => 'Asia/Seoul',    // 날짜 기준 시간대
        'hacs_repo' => 'keidischoi/ha-3ds-link',   // HACS 에 넣을 통합 저장소 (GitHub 주인/이름)
    ];

    /** @var array<string, mixed>|null */
    private static ?array $memo = null;

    /** @return array<string, mixed> */
    public static function all(): array
    {
        if (self::$memo !== null) {
            return self::$memo;
        }
        $raw = [];
        try {
            if (Schema::ensure()) {
                $raw = json_decode((string) DB::table(Schema::SETTINGS)->where('key', 'general')->value('value'), true) ?: [];
            }
        } catch (\Throwable) {
        }

        return self::$memo = self::normalize($raw);
    }

    public static function get(string $key): mixed
    {
        return self::all()[$key] ?? (self::DEFAULTS[$key] ?? null);
    }

    /**
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public static function normalize(array $in): array
    {
        $out = [];
        foreach (self::DEFAULTS as $k => $d) {
            $v = $in[$k] ?? $d;
            $out[$k] = is_bool($d) ? (is_bool($v) ? $v : (filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $d)) : (is_string($d) ? self::label($v, $d) : (is_numeric($v) ? (int) $v : $d));
        }
        $out['max_devices'] = max(1, min(200, $out['max_devices']));
        $out['interval_min'] = max(1, min(60, $out['interval_min']));
        $out['keep_days'] = max(1, min(365, $out['keep_days']));
        $out['stale_hours'] = max(1, min(72, $out['stale_hours']));
        $out['alert_gap_hours'] = max(1, min(168, $out['alert_gap_hours']));
        $out['snap_gap_min'] = max(1, min(120, $out['snap_gap_min']));
        $repo = is_string($in['hacs_repo'] ?? null) ? trim($in['hacs_repo']) : '';
        if ($repo === 'keidischoi/ha-g7-link') {
            $repo = self::DEFAULTS['hacs_repo'];   // 0.1.2 저장소 이름이 바뀜
        }
        $out['hacs_repo'] = preg_match('#^[A-Za-z0-9_.-]{1,39}/[A-Za-z0-9_.-]{1,100}$#', $repo) ? $repo : self::DEFAULTS['hacs_repo'];
        $tz = is_string($in['timezone'] ?? null) ? trim($in['timezone']) : '';
        $out['timezone'] = $tz !== '' && in_array($tz, \DateTimeZone::listIdentifiers(), true) ? $tz : self::DEFAULTS['timezone'];

        return $out;
    }

    /** 메뉴 이름 — 태그 · 줄바꿈 빼고 12글자, 비면 기본 */
    private static function label(mixed $v, string $d): string
    {
        $s = is_scalar($v) ? mb_substr(trim((string) preg_replace('/\s+/u', ' ', strip_tags((string) $v))), 0, 12) : '';

        return $s !== '' ? $s : $d;
    }

    /**
     * @param  array<string, mixed>  $in
     * @return array<string, mixed>
     */
    public static function save(array $in): array
    {
        Schema::ensure();
        $next = self::normalize(array_merge(self::all(), $in));
        DB::table(Schema::SETTINGS)->updateOrInsert(['key' => 'general'], ['value' => json_encode($next), 'updated_at' => now()]);
        self::$memo = null;

        return self::all();
    }

    public static function forget(): void
    {
        self::$memo = null;
    }
}
