<?php

namespace Plugins\Custom\IotLink\Support;

use Illuminate\Container\Container;
use Illuminate\Routing\Route;

/**
 * 1.0.0 예전 이름(HA 연결 custom-ha_link) 주소를 계속 받음.
 *
 * 회원의 Home Assistant rest_command · HACS 통합(3ds) · SmartThings Target URL 이 `/api/plugins/custom-ha_link/…` 를 씀.
 * 코어(PluginRouteServiceProvider)는 이 플러그인 라우트를 `api/plugins/custom-iot_link` 묶음 안에서만 부르므로, 묶음 접두어를 벗어나려고
 * 방금 등록된 이 플러그인 라우트를 하나씩 그대로 베껴(같은 컨트롤러 · 미들웨어 · 제한 · 조건) 예전 접두어로 라우트 목록에 직접 넣음.
 * 예전 플러그인이 아직 켜져 있어도 이 플러그인이 나중에 불려 덮어씀 (같은 표를 쓰므로 어느 쪽이 받아도 같음).
 */
final class LegacyRoutes
{
    public const PREFIX = 'api/plugins/custom-iot_link';

    public const LEGACY_PREFIX = 'api/plugins/custom-ha_link';

    /** 라우트 이름 접두어 (코어가 붙임) */
    public const NAME = 'api.plugins.custom-iot_link.';

    public const LEGACY_NAME = 'api.plugins.custom-ha_link.';

    /** 예전 경로 (새 경로 → 예전 경로), 이 플러그인 경로가 아니면 null */
    public static function legacyUri(string $uri): ?string
    {
        $uri = ltrim($uri, '/');
        if ($uri === self::PREFIX) {
            return self::LEGACY_PREFIX;
        }

        return str_starts_with($uri, self::PREFIX.'/') ? self::LEGACY_PREFIX.substr($uri, strlen(self::PREFIX)) : null;
    }

    /**
     * 이 플러그인 라우트를 예전 접두어로 베낌 — 베낀 수
     *
     * @param  \Illuminate\Routing\Router  $router
     */
    public static function mirror(mixed $router): int
    {
        if (! is_object($router) || ! method_exists($router, 'getRoutes')) {
            return 0;
        }
        $routes = $router->getRoutes();
        $n = 0;
        foreach ($routes->getRoutes() as $r) {
            $old = self::legacyUri($r->uri());
            if ($old === null) {
                continue;
            }
            $action = $r->getAction();
            $action['prefix'] = self::LEGACY_PREFIX;
            if (is_string($action['as'] ?? null) && str_starts_with($action['as'], self::NAME)) {
                $action['as'] = self::LEGACY_NAME.substr($action['as'], strlen(self::NAME));
            }
            unset($action['where']);
            // Route 가 action 의 prefix 를 앞에 붙이므로 접두어 뒤쪽만 넘김
            $copy = new Route($r->methods(), ltrim(substr($old, strlen(self::LEGACY_PREFIX)), '/'), $action);
            $copy->where($r->wheres);
            $copy->setRouter($router)->setContainer(Container::getInstance());
            $routes->add($copy);
            $n++;
        }

        return $n;
    }
}
