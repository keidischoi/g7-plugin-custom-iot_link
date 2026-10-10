<?php

namespace Plugins\Custom\IotLink\Listeners;

use App\Contracts\Extension\HookListenerInterface;
use Plugins\Custom\IotLink\Plugin;

/**
 * 사용자 화면 주소 (/iot-link · 예전 /ha-link) — 코어는 플러그인 routes.json 을 관리자 템플릿에만 합치므로 사용자 화면은 이 필터로
 * (레이아웃 resources/layouts/user/iot_link.json → 플러그인 켤 때 custom-iot_link.iot_link 로 등록됨).
 */
class RouteListener implements HookListenerInterface
{
    /** 1.0.0 새 주소 /iot-link · 예전 주소 /ha-link 도 같은 화면 (화면 스크립트가 주소 줄을 /iot-link 로 바꿔 보임) */
    public const PATHS = ['/iot-link', '/ha-link'];

    public static function getSubscribedHooks(): array
    {
        return [
            'core.routes.filter_merged' => ['method' => 'addUserRoutes', 'priority' => 50, 'type' => 'filter', 'sync' => true],
        ];
    }

    public function handle(...$args): void {}

    public function addUserRoutes(mixed $routes = [], mixed $templateType = 'user', mixed $identifier = null): mixed
    {
        if (! is_array($routes) || $templateType !== 'user') {
            return $routes;
        }
        foreach ($routes as $r) {
            if (is_array($r) && ($r['layout'] ?? '') === Plugin::USER_LAYOUT) {
                return $routes;
            }
        }
        foreach (self::PATHS as $p) {
            $routes[] = ['path' => '*'.$p, 'layout' => Plugin::USER_LAYOUT, 'auth_required' => false,
                'meta' => ['title' => '$t:custom-iot_link.user.title'], 'source' => ['kind' => 'plugin', 'identifier' => Plugin::IDENTIFIER]];
        }

        return $routes;
    }
}
