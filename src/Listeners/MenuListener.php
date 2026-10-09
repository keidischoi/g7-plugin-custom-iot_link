<?php

namespace Plugins\Custom\HaLink\Listeners;

use App\Contracts\Extension\HookListenerInterface;
use Plugins\Custom\HaLink\Support\Settings;

/**
 * 0.1.0 헤더 메인 메뉴 「HA 연결」 (#hal-nav · #hal-nav-mobile — 그리는 것은 plugin.iife.js)
 *  - core.frontend.filter_app_config: 화면 HTML 에 메뉴 설정을 실음 — G7Config.appConfig.cextNav["custom-ha_link"].cfg (따로 요청 없음)
 *  - 홈 디자인(0.7.67+) 메뉴 맞춤: 「메인 메뉴 보이기」 · 이름을 서로 맞춤 — 값의 원본은 이 플러그인 설정 (menu_enabled · menu_label)
 * CRITICAL: 훅 필터는 예외를 던지지 않음 — 실패하면 받은 그대로.
 */
class MenuListener implements HookListenerInterface
{
    public const KEY = 'ha_link';

    public const PATH = '/ha-link';

    public static function getSubscribedHooks(): array
    {
        return [
            'core.frontend.filter_app_config' => ['method' => 'embed', 'priority' => 50, 'type' => 'filter', 'sync' => true],
            'custom-home_design.menus' => ['method' => 'homeMenus', 'priority' => 48, 'type' => 'filter'],
            'custom-home_design.menu.update' => ['method' => 'onHomeMenuUpdate', 'priority' => 20, 'sync' => true],
        ];
    }

    public function handle(...$args): void {}

    public function embed(mixed $config = null): mixed
    {
        if (! is_array($config)) {
            return $config;
        }
        try {
            $nav = is_array($config['cextNav'] ?? null) ? $config['cextNav'] : [];
            $nav['custom-ha_link'] = ['cfg' => ['enabled' => (bool) Settings::get('enabled'), 'menu_enabled' => (bool) Settings::get('menu_enabled'), 'menu_label' => (string) Settings::get('menu_label'), 'path' => self::PATH]];
            $config['cextNav'] = $nav;
        } catch (\Throwable) {
        }

        return $config;
    }

    /** 홈 디자인 메뉴 목록에 이 메뉴의 지금 이름 · 켜짐을 알림 */
    public function homeMenus(mixed $list = []): array
    {
        $list = is_array($list) ? array_values($list) : [];
        try {
            $list[] = ['key' => self::KEY, 'label' => (string) Settings::get('menu_label'), 'enabled' => (bool) Settings::get('menu_enabled'), 'default_label' => (string) Settings::DEFAULTS['menu_label']];
        } catch (\Throwable) {
        }

        return $list;
    }

    /** 홈 디자인에서 이름 · 켜기/끄기를 바꾸면 이 플러그인 설정에 저장 ($change = 바뀐 것만: label · enabled) */
    public function onHomeMenuUpdate(mixed $key = null, mixed $change = null): void
    {
        if ($key !== self::KEY || ! is_array($change)) {
            return;
        }
        try {
            $in = [];
            if (isset($change['label']) && trim((string) $change['label']) !== '') {
                $in['menu_label'] = trim((string) $change['label']);
            }
            if (array_key_exists('enabled', $change)) {
                $in['menu_enabled'] = (bool) $change['enabled'];
            }
            if ($in !== []) {
                Settings::save($in);
            }
        } catch (\Throwable $e) {
            if (function_exists('report')) {
                report($e);
            }
        }
    }
}
