<?php

namespace Plugins\Custom\IotLink;

use App\Extension\AbstractPlugin;
use Plugins\Custom\IotLink\Listeners\IntegrationListener;
use Plugins\Custom\IotLink\Listeners\MenuListener;
use Plugins\Custom\IotLink\Listeners\RouteListener;
use Plugins\Custom\IotLink\Support\Schema;
use Plugins\Custom\IotLink\Support\Settings;

/**
 * 📡 IoT 연결 (custom-iot_link) — 회원의 Home Assistant · SmartThings 가 보내는 온습도 · 기기 상태를 받아 정비 수첩 · 내 프린터에 이음
 *
 *  1.0.0 이름 바꿈: 🏠 HA 연결(custom-ha_link) → 📡 IoT 연결(custom-iot_link). 표(hal_*) · 설정(hal_settings) · 사진 폴더(storage/app/ha_link) ·
 *  알림 종류(custom_ha_link_alert) · 홈 디자인 메뉴 키(ha_link) · 화면 표시(data-hal-*, #hal-nav)는 예전 그대로라 데이터가 그대로 이어짐.
 *  예전 주소 /api/plugins/custom-ha_link/… · /ha-link · /admin/ha-link 와 예전 필터 custom-ha_link.printer_snapshot 도 계속 받음.
 *
 *  - 기기 = 받는 주소 하나. 필라멘트 · 레진 보관함 / 내 프린터 / 업체 장비 / 그 밖의 장비 · 공간에 붙임 (여러 대)
 *  - 온습도: 지금 값 · 이틀 그래프 · 기준(습도 · 온도)을 넘으면 알림 (그 보관함에 든 필라멘트도 알려 줌)
 *  - 상태: 가동 시간 기록 → 정비 수첩의 「가동 몇 시간마다」 · 내 프린터에 붙인 기기는 출력 상태를 그 프린터로 넘김
 *  - 사이트가 회원 집으로 접속하지 않음 (회원 쪽에서 보내오는 값만 받음) · 화면: /iot-link · 관리자: /admin/iot-link
 *  - 0.2.0 SmartThings (WebHook SmartApp) — 회원이 SmartThings 앱에서 센서를 고르면 값이 바뀔 때마다 바로 들어옴 (같은 받기로)
 *  - 1.1.0 SmartThings 로그인 연결 (API Access App · OAuth) — 회원은 「SmartThings 연결하기」 → 삼성 계정 로그인 → 허용 → 사이트에서 센서 고르기.
 *    센서 하나가 사이트 기기 하나. 예전 연결 코드(SmartApp) 방식은 설정으로 켰을 때만.
 */
class Plugin extends AbstractPlugin
{
    public const IDENTIFIER = 'custom-iot_link';

    /** 1.0.0 예전 식별자 (HA 연결) */
    public const LEGACY_IDENTIFIER = 'custom-ha_link';

    public const ADMIN_URL = '/admin/iot-link';

    public const USER_LAYOUT = 'custom-iot_link.iot_link';

    public const TABLES = ['hal_devices', 'hal_readings', 'hal_runs', 'hal_settings', 'hal_links', 'hal_st_installs', 'hal_st_sensors', 'hal_st_codes', 'hal_st_states', 'hal_slots'];   // 1.4.8 💳 센서 칸

    private static bool $autoload = false;

    /** 이 플러그인 클래스를 스스로 불러오게 (확장 autoload 캐시가 늦게 갱신돼도 켜기 · 훅이 되게) */
    public static function autoload(): void
    {
        if (self::$autoload) {
            return;
        }
        $here = __DIR__;
        spl_autoload_register(static function (string $class) use ($here): void {
            $p = 'Plugins\\Custom\\IotLink\\';
            if (! str_starts_with($class, $p)) {
                return;
            }
            $rel = '/src/'.str_replace('\\', '/', substr($class, strlen($p))).'.php';
            $roots = [];
            try {
                if (function_exists('base_path')) {
                    $roots[] = base_path('plugins/'.self::IDENTIFIER);
                }
            } catch (\Throwable) {
            }
            $roots[] = $here;
            foreach ($roots as $r) {
                if (is_string($r) && is_file($r.$rel)) {
                    require_once $r.$rel;

                    return;
                }
            }
        });
        self::$autoload = true;
    }

    public function install(): bool
    {
        self::autoload();
        try {
            Schema::ensure();
        } catch (\Throwable $e) {
            report($e);
        }

        return true;
    }

    public function activate(): bool
    {
        self::autoload();
        try {
            Schema::ensure();
            Settings::forget();
        } catch (\Throwable $e) {
            report($e);
        }

        return true;
    }

    public function deactivate(): bool
    {
        self::autoload();
        try {
            Settings::forget();
        } catch (\Throwable) {
        }

        return true;
    }

    public function uninstall(): bool
    {
        self::autoload();

        return true;
    }

    /** @return list<string> 「데이터까지 지우기」 때 지울 표 */
    public function getDynamicTables(): array
    {
        return self::TABLES;
    }

    /** @return array<int, array<string, mixed>> */
    public function getAdminMenus(): array
    {
        return [[
            'name' => ['ko' => 'IoT 연결', 'en' => 'IoT Link'],
            'slug' => self::IDENTIFIER,
            'url' => self::ADMIN_URL,
            'icon' => 'fas fa-satellite-dish',
            'order' => 17,
        ]];
    }

    /** @return array<int, array<string, mixed>> */
    public function getNotificationDefinitions(): array
    {
        return [[
            'type' => 'custom_ha_link_alert',
            'hook_prefix' => self::IDENTIFIER,
            'name' => ['ko' => 'IoT 연결 경고', 'en' => 'IoT Link alert'],
            'description' => ['ko' => 'Home Assistant · SmartThings 로 연결한 기기의 습도 · 온도가 회원이 정한 기준을 넘으면 보냄.', 'en' => 'Sent when a linked device goes over the humidity / temperature limit.'],
            'channels' => ['mail', 'database'],
            'hooks' => [],
            'variables' => [
                ['key' => 'subject', 'description' => '완성된 제목'],
                ['key' => 'body', 'description' => '완성된 본문'],
                ['key' => 'body_html', 'description' => '완성된 본문 HTML (메일)'],
                ['key' => 'name', 'description' => '회원 이름'],
                ['key' => 'drawer_url', 'description' => 'IoT 연결 화면 주소'],
            ],
            'templates' => [
                ['channel' => 'mail', 'recipients' => [['type' => 'trigger_user']], 'subject' => ['ko' => '{subject}', 'en' => '{subject}'], 'body' => ['ko' => '{body_html}', 'en' => '{body_html}']],
                ['channel' => 'database', 'recipients' => [['type' => 'trigger_user']], 'subject' => ['ko' => '{subject}', 'en' => '{subject}'], 'body' => ['ko' => '{body}', 'en' => '{body}'], 'click_url' => '{drawer_url}'],
            ],
        ]];
    }

    /** @return array<int, array<string, mixed>> 1.4.4 SmartThings 자동 다시 잇기 — 회원이 화면을 보지 않아도 */
    public function getSchedules(): array
    {
        return [
            ['command' => 'custom-iot_link:st-poll', 'schedule' => '*/15 * * * *', 'description' => 'IoT 연결 — SmartThings 끊긴 기기 자동 다시 잇기 (값이 오래 안 오면 지금 값 · 빠진 구독) · 토큰 미리 새로 받기'],
        ];
    }

    /** @return array<int, class-string> */
    public function getHookListeners(): array
    {
        self::autoload();

        return [RouteListener::class, IntegrationListener::class, MenuListener::class, \Plugins\Custom\IotLink\Listeners\AiLinkListener::class, \Plugins\Custom\IotLink\Listeners\CoinPackListener::class];   // 1.5.1 🤖 IoT 기기 도구 · 1.17.7 📦 코인 팩
    }

    /** @return array<string, mixed> */
    public function getMetadata(): array
    {
        return ['author' => 'keidischoi', 'license' => 'MIT', 'keywords' => ['3d printing', 'home assistant', 'hacs', 'smartthings', 'sensor', 'humidity', 'temperature', 'printer', 'iot']];
    }
}
