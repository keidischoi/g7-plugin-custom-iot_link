<?php

namespace Plugins\Custom\IotLink\Support;

use Illuminate\Support\Facades\DB;

/**
 * 관리자 설정 (hal_settings 의 key 'general' 한 줄).
 */
final class Settings
{
    public const DEFAULTS = [
        'enabled' => true,             // IoT 연결 쓰기
        'menu_enabled' => true,        // 헤더 메인 메뉴에 넣기 (홈 디자인 「메인 메뉴 보이기」와 서로 맞춤)
        'menu_label' => 'IoT 연결',      // 헤더 메뉴 이름 (12글자까지)
        'max_devices' => 20,           // 회원 한 명이 연결할 수 있는 기기
        'send_mode' => 'change',       // 0.1.6 전송 방식 — change: 값이 변하면 보냄 (+ 변화가 없어도 idle_min 마다 한 번) · interval: interval_min 마다 보냄
        'change_hum' => 1,             // 0.1.6 「변하면」: 습도가 이만큼(%) 변하면 보냄 (온도는 0.5°C)
        'idle_min' => 30,              // 0.1.6 「변하면」: 변화가 없어도 이만큼(분)마다 한 번 (살아 있다는 신호)
        'interval_min' => 10,          // 0.1.3 값 보내는 주기 (분) — 통합이 이 주기로 보냄. 회원은 이보다 길게만 고를 수 있음
        'refresh_sec' => 60,           // 0.1.5 화면이 값을 다시 받는 간격 (초) — 0 = 끔, 5~3600
        'away_after_min' => 30,        // 0.1.5 회원이 사이트의 IoT 연결 · 정비 수첩 화면을 이만큼(분) 안 보면 「자리 비움」 — 0 = 이 기능 끔 (늘 같은 주기)
        'away_interval_min' => 60,     // 0.1.5 자리 비움일 때 값 보내는 주기 (분) — 통합이 스스로 늦춤. 상태 변화(출력 시작 · 끝)는 그대로 바로 보냄
        'keep_days' => 30,             // 온습도 기록을 며칠 둘지 (한 시간에 한 줄)
        'stale_hours' => 3,            // 이 시간 넘게 소식이 없으면 「끊김」
        'alert_gap_hours' => 12,       // 같은 기기의 경고를 다시 보내기까지
        'notify_site' => true,         // 사이트 알림 (기준을 넘으면)
        'notify_mail' => false,        // 메일
        'snapshot' => true,            // 카메라 사진 받기 (기기마다 최신 한 장, 주인만 봄)
        'snap_gap_min' => 5,           // 사진을 받는 가장 짧은 간격 (분)
        'printer_link' => true,        // 내 프린터(custom-my_printer)로 프린터 상태 넘기기
        'company_link' => true,        // 업체 보유 장비에 연결 (1.4.0 업체는 업체검색 · 장비는 재고 관리 Api 에 물어봄)
        'timezone' => 'Asia/Seoul',    // 날짜 기준 시간대
        'hacs_repo' => 'keidischoi/ha-3ds-link',   // HACS 에 넣을 통합 저장소 (GitHub 주인/이름)
        // 0.2.0 SmartThings — 앱을 등록하고 받은 값 (1.1.0 API Access App · OAuth-In. 예전: Developer Workspace 의 WebHook SmartApp)
        'st_enabled' => false,         // SmartThings 연결 쓰기
        'st_app_id' => '',             // App ID (요청의 appId 와 맞춰 봄 — 비우면 안 봄 · 1.1.0 회원이 처음 연결할 때 알아서 채움)
        'st_client_id' => '',          // Client ID (로그인 연결 · 토큰 새로 받기)
        'st_client_secret' => '',      // Client Secret — 저장할 때 Crypt 로 암호화 ('enc:…'), 화면 · API 에는 내보내지 않음
        'st_public_key' => '',         // (고급) 서명 공개 키 PEM — 비우면 key.smartthings.com 에서 keyId 로 받음
        'st_ping_unsigned' => false,   // (예전 방식) 서명 없는 PING 에도 답하기 — 답은 challenge 를 그대로 돌려줄 뿐
        'st_code_flow' => false,       // 1.1.0 (예전 방식) SmartApp 연결 코드도 화면에 보이기 — 기본은 로그인 연결(API Access App · OAuth)만
        'st_code_min' => 30,           // 연결 코드가 쓸 수 있는 시간 (분)
        'st_max_events_min' => 120,    // 설치 하나가 1분에 보낼 수 있는 값 (넘으면 버림 — 답은 200)
    ];

    /** 0.2.0 SmartThings 글 칸 (메뉴 이름 규칙과 따로) */
    private const ST_TEXT = ['st_app_id', 'st_client_id', 'st_client_secret', 'st_public_key'];

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
    /** 1.0.0 예전 기본 메뉴 이름 (HA 연결 0.x) */
    public const LEGACY_MENU_LABEL = 'HA 연결';

    public static function normalize(array $in): array
    {
        $out = [];
        foreach (self::DEFAULTS as $k => $d) {
            $v = $in[$k] ?? $d;
            $out[$k] = is_bool($d) ? (is_bool($v) ? $v : (filter_var($v, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? $d)) : (in_array($k, self::ST_TEXT, true) ? (is_scalar($v) ? trim((string) $v) : '') : (is_string($d) ? self::label($v, $d) : (is_numeric($v) ? (int) $v : $d)));
        }
        if ($out['menu_label'] === self::LEGACY_MENU_LABEL) {
            $out['menu_label'] = self::DEFAULTS['menu_label'];   // 1.0.0 예전 기본 이름(HA 연결)은 새 이름으로 · 직접 바꾼 이름은 그대로
        }
        // 0.2.0 SmartThings
        foreach (['st_app_id', 'st_client_id'] as $k) {
            $out[$k] = preg_match('/^[A-Za-z0-9-]{1,64}$/', $out[$k]) ? $out[$k] : '';
        }
        $sec = $out['st_client_secret'];
        $out['st_client_secret'] = str_starts_with($sec, 'enc:') && strlen($sec) < 4000 ? $sec : '';   // 암호화한 것만 둠 (AdminController 가 암호화)
        $pem = str_replace("\r", '', $out['st_public_key']);
        $out['st_public_key'] = strlen($pem) < 6000 && preg_match('/^-----BEGIN (PUBLIC KEY|CERTIFICATE|RSA PUBLIC KEY)-----[A-Za-z0-9+\/=\s]+-----END (PUBLIC KEY|CERTIFICATE|RSA PUBLIC KEY)-----$/', $pem) ? $pem : '';
        $out['st_code_min'] = max(5, min(1440, $out['st_code_min']));
        $out['st_max_events_min'] = max(10, min(2000, $out['st_max_events_min']));
        $out['max_devices'] = max(1, min(200, $out['max_devices']));
        $out['interval_min'] = max(1, min(60, $out['interval_min']));
        $out['send_mode'] = in_array($in['send_mode'] ?? '', ['change', 'interval'], true) ? (string) $in['send_mode'] : self::DEFAULTS['send_mode'];
        $out['change_hum'] = max(1, min(10, $out['change_hum']));
        $out['idle_min'] = max(5, min(180, $out['idle_min']));
        $out['refresh_sec'] = $out['refresh_sec'] <= 0 ? 0 : max(5, min(3600, $out['refresh_sec']));   // 0 = 끔 · 5초보다 짧게는 안 됨
        $out['away_after_min'] = $out['away_after_min'] <= 0 ? 0 : max(5, min(1440, $out['away_after_min']));
        $out['away_interval_min'] = max($out['send_mode'] === 'change' ? $out['idle_min'] : $out['interval_min'], min(1440, $out['away_interval_min']));   // 평소 주기보다 짧을 수 없음
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

    /** 0.2.0 화면 · API 로 내보낼 설정 — 비밀(Client Secret)은 빼고 「있음」만 */
    public static function public(): array
    {
        $s = self::all();
        $s['st_client_secret_set'] = $s['st_client_secret'] !== '';
        $s['st_client_secret'] = '';

        return $s;
    }

    public static function forget(): void
    {
        self::$memo = null;
    }
}
