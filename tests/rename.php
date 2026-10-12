<?php

/**
 * 1.0.0 이름 바꿈 검사 — 🏠 HA 연결(custom-ha_link) → 📡 IoT 연결(custom-iot_link)
 *  - 식별자 · 네임스페이스 · 저장소 주소 · 레이아웃 · 자산 이름
 *  - 예전 주소 /api/plugins/custom-ha_link/… 가 같은 컨트롤러 · 미들웨어 · 조건 · 이름으로 (진짜 Laravel 라우터에 api.php 를 코어처럼 불러 봄)
 *  - /ha-link · /admin/ha-link 화면, 예전 필터, 메뉴 이름 바꿈, 그대로 둔 것(표 · 알림 종류 · 메뉴 키 · 사진 폴더)
 *   G7_VENDOR=…/vendor php tests/rename.php
 */

namespace {
    use Illuminate\Container\Container;
    use Illuminate\Events\Dispatcher;
    use Illuminate\Http\Request;
    use Illuminate\Routing\Router;
    use Illuminate\Support\Facades\Facade;
    use Plugins\Custom\IotLink\Listeners\IntegrationListener;
    use Plugins\Custom\IotLink\Listeners\MenuListener;
    use Plugins\Custom\IotLink\Listeners\RouteListener;
    use Plugins\Custom\IotLink\Plugin;
    use Plugins\Custom\IotLink\Support\LegacyRoutes;
    use Plugins\Custom\IotLink\Support\Notify;
    use Plugins\Custom\IotLink\Support\Settings;

    require (getenv('G7_VENDOR') ?: 'C:/Users/gbook/source/g7-core/vendor').'/autoload.php';
    $root = dirname(__DIR__);
    spl_autoload_register(function (string $c) use ($root): void {
        $p = 'Plugins\\Custom\\IotLink\\';
        if (str_starts_with($c, $p) && is_file($f = $root.'/src/'.str_replace('\\', '/', substr($c, strlen($p))).'.php')) {
            require $f;
        }
    });

    $pass = 0;
    $fail = 0;
    function check(bool $ok, string $label): void
    {
        global $pass, $fail;
        $ok ? $pass++ : $fail++;
        echo ($ok ? '  ok   ' : '  FAIL ').$label."\n";
    }

    $read = static fn (string $f): string => (string) file_get_contents($root.'/'.$f);
    $pj = json_decode($read('plugin.json'), true);
    $cj = json_decode($read('composer.json'), true);

    echo "■ 식별자 · 네임스페이스\n";
    require_once $root.'/plugin.php';
    check(Plugin::IDENTIFIER === 'custom-iot_link' && Plugin::LEGACY_IDENTIFIER === 'custom-ha_link' && ($pj['identifier'] ?? '') === 'custom-iot_link', 'Plugin::IDENTIFIER · LEGACY_IDENTIFIER · plugin.json');
    check(($pj['name']['ko'] ?? '') === 'IoT 연결' && ($pj['name']['en'] ?? '') === 'IoT Link' && str_starts_with((string) ($pj['description']['ko'] ?? ''), '📡 IoT 연결'), '이름 「IoT 연결」 / 「IoT Link」');
    check(($pj['github_url'] ?? '') === 'https://github.com/keidischoi/g7-plugin-custom-iot_link' && ($pj['github_changelog_url'] ?? '') === 'https://github.com/keidischoi/g7-plugin-custom-iot_link/blob/main/CHANGELOG.md', '저장소 주소 · CHANGELOG 주소');
    check(($cj['name'] ?? '') === 'plugins/custom-iot_link' && isset($cj['autoload']['psr-4']['Plugins\\Custom\\IotLink\\']) && \App\Extension\ExtensionManager::pluginIdentifierToNamespace('custom-iot_link') === 'Plugins\\Custom\\IotLink\\', 'composer · 코어가 만드는 네임스페이스와 같음');
    $src = '';
    foreach (new RecursiveIteratorIterator(new RecursiveDirectoryIterator($root.'/src', FilesystemIterator::SKIP_DOTS)) as $f) {
        $src .= file_get_contents((string) $f);
    }
    $src .= $read('plugin.php');
    check(! str_contains($src, 'HaLink') && ! str_contains($read('composer.json'), 'HaLink'), '예전 네임스페이스(HaLink)가 코드에 없음');
    check(Plugin::USER_LAYOUT === 'custom-iot_link.iot_link' && json_decode($read('resources/layouts/user/iot_link.json'), true)['layout_name'] === 'iot_link' && Plugin::ADMIN_URL === '/admin/iot-link' && ($pj['assets']['js']['entry'] ?? '') === 'resources/js/iot_link.js', '레이아웃 · 관리자 주소 · 자산 이름');
    $ko = json_decode($read('resources/lang/ko.json'), true);
    $en = json_decode($read('resources/lang/en.json'), true);
    check($ko['name'] === 'IoT 연결' && $ko['user']['title'] === '📡 IoT 연결' && $en['name'] === 'IoT Link', '언어 파일');
    $admin = $read('resources/layouts/admin/plugin_settings.json');
    check(str_contains($admin, '/api/plugins/custom-iot_link/assets/iot-link-app.js?v='.$pj['version']) && str_contains($admin, '$t:custom-iot_link.settings.title') && ! str_contains($admin, 'custom-ha_link'), '관리자 레이아웃 — 새 식별자 · 새 자산');

    echo "■ 그대로 둔 것 (데이터가 이어짐)\n";
    check(Plugin::TABLES === ['hal_devices', 'hal_readings', 'hal_runs', 'hal_settings', 'hal_links', 'hal_st_installs', 'hal_st_sensors', 'hal_st_codes', 'hal_st_states', 'hal_slots'] && Plugin::TABLES === \Plugins\Custom\IotLink\Support\Schema::TABLES, '표 이름 hal_* 그대로 (1.1.0 hal_st_states · 1.4.8 hal_slots 더함) · 플러그인 = 표 정의');
    $defs = (new Plugin())->getNotificationDefinitions();
    check(Notify::TYPE === 'custom_ha_link_alert' && $defs[0]['type'] === Notify::TYPE && $defs[0]['hook_prefix'] === 'custom-iot_link', '알림 종류 키 그대로 (관리자가 고친 문구가 이어짐) · hook_prefix 는 새 식별자');
    check(MenuListener::KEY === 'ha_link' && MenuListener::PATH === '/iot-link', '홈 디자인 메뉴 키 ha_link 그대로 · 메뉴 주소 /iot-link');
    check(str_contains($read('src/Services/HaService.php'), "DIRECTORY_SEPARATOR.'ha_link'.DIRECTORY_SEPARATOR"), '카메라 사진 폴더 storage/app/ha_link 그대로');
    $loader = $read('resources/js/iot_link.js');
    check(str_contains($loader, "NAV_ID = 'hal-nav', NAV_MOB = 'hal-nav-mobile', NAV_PATH = '/iot-link', NAV_LABEL = 'IoT 연결'") && str_contains($loader, "n['custom-iot_link']") && $loader === $read('dist/js/plugin.iife.js'), '헤더 메뉴 #hal-nav 그대로 · 새 주소 · 새 설정 키 · 번들 = 불러오기');

    echo "■ 설정\n";
    check(Settings::DEFAULTS['menu_label'] === 'IoT 연결' && Settings::normalize(['menu_label' => 'HA 연결'])['menu_label'] === 'IoT 연결' && Settings::normalize(['menu_label' => '우리 집 센서'])['menu_label'] === '우리 집 센서', '예전 기본 메뉴 이름 「HA 연결」→「IoT 연결」 · 직접 바꾼 이름은 그대로');

    echo "■ 예전 필터 · 화면 주소\n";
    $hooks = IntegrationListener::getSubscribedHooks();
    check(($hooks['custom-iot_link.printer_snapshot']['method'] ?? '') === 'printerSnapshot' && ($hooks['custom-ha_link.printer_snapshot']['method'] ?? '') === 'printerSnapshot' && ($hooks['custom-ha_link.printer_snapshot']['type'] ?? '') === 'filter', '카메라 사진 필터: 새 이름 · 예전 이름 둘 다');
    $ur = (new RouteListener())->addUserRoutes([], 'user');
    check(array_column($ur, 'path') === ['*/iot-link', '*/ha-link'] && count(array_unique(array_column($ur, 'layout'))) === 1 && $ur[0]['layout'] === Plugin::USER_LAYOUT && $ur[1]['source']['identifier'] === 'custom-iot_link', '회원 화면 /iot-link · 예전 /ha-link 같은 레이아웃');
    check((new RouteListener())->addUserRoutes($ur, 'user') === $ur && (new RouteListener())->addUserRoutes([], 'admin') === [], '두 번 넣지 않음 · 관리자 템플릿은 그대로');
    $rj = json_decode($read('resources/routes.json'), true);
    check(array_column($rj['routes'], 'path') === ['*/admin/iot-link', '*/admin/ha-link'] && $rj['routes'][1]['params']['identifier'] === 'custom-iot_link' && $rj['routes'][1]['layout'] === 'plugin_settings', '관리자 화면 /admin/iot-link · 예전 /admin/ha-link');
    $app = $read('resources/assets/iot-link-app.js');
    check(str_contains($app, "var API = '/api/plugins/custom-iot_link', BASE = '/iot-link'") && str_contains($app, "replace(/(^|\\/)ha-link(?=\\/|$)/, '\$1iot-link')") && str_contains($app, 'history.replaceState(history.state'), '화면: 새 주소 · 예전 주소로 오면 주소 줄만 새 주소로');
    check(str_contains($app, 'I.legacy_target_url') && \Plugins\Custom\IotLink\Services\SmartThingsService::class !== '', '관리자 SmartThings 안내: 예전 Target URL 도 그대로 둬도 된다고');

    echo "■ 예전 API 주소 (진짜 라우터)\n";
    $c = new Container();
    Container::setInstance($c);
    $c->instance('config', new Illuminate\Config\Repository(['app' => ['url' => 'https://3ds.test']]));
    $router = new Router(new Dispatcher($c), $c);
    $c->instance('router', $router);
    Facade::setFacadeApplication($c);
    // 코어(PluginRouteServiceProvider)와 같게 묶어 부름
    $router->prefix('api/plugins/custom-iot_link')->name('api.plugins.custom-iot_link.')->middleware('api')->group($root.'/src/routes/api.php');
    $all = $router->getRoutes()->getRoutes();
    $new = array_values(array_filter($all, static fn ($r) => str_starts_with($r->uri(), 'api/plugins/custom-iot_link/')));
    $old = [];
    foreach ($all as $r) {
        if (str_starts_with($r->uri(), 'api/plugins/custom-ha_link/')) {
            $old[implode('|', $r->methods()).' '.$r->uri()] = $r;
        }
    }
    $same = count($new) >= 20;
    foreach ($new as $r) {
        $o = $old[implode('|', $r->methods()).' '.LegacyRoutes::legacyUri($r->uri())] ?? null;
        $same = $same && $o !== null && $o->getActionName() === $r->getActionName() && $o->gatherMiddleware() === $r->gatherMiddleware() && $o->wheres === $r->wheres
            && $o->getName() === str_replace('api.plugins.custom-iot_link.', 'api.plugins.custom-ha_link.', (string) $r->getName());
    }
    check($same && count($old) === count($new), '새 라우트 '.count($new).'개 모두 예전 주소로 — 같은 컨트롤러 · 미들웨어(api · throttle · auth · permission) · 조건 · 이름');
    $match = static function (string $m, string $uri) use ($router): ?string {
        try {
            return $router->getRoutes()->match(Request::create($uri, $m))->getActionName();
        } catch (\Throwable) {
            return null;
        }
    };
    $tok = str_repeat('ab', 16);
    $C = 'Plugins\\Custom\\IotLink\\Http\\Controllers\\';
    check($match('POST', '/api/plugins/custom-ha_link/in/'.$tok) === $C.'HaController@ingest' && $match('POST', '/api/plugins/custom-iot_link/in/'.$tok) === $C.'HaController@ingest', 'Home Assistant 값 받기: 예전 · 새 주소');
    check($match('POST', '/api/plugins/custom-ha_link/in/'.$tok.'/snap') === $C.'HaController@snap' && $match('GET', '/api/plugins/custom-ha_link/snap/7.jpg') === $C.'HaController@snapPublic', '카메라 사진 받기 · 공개 사진: 예전 주소');
    check($match('GET', '/api/plugins/custom-ha_link/hub/'.$tok) === $C.'HaController@hub' && $match('DELETE', '/api/plugins/custom-ha_link/hub/'.$tok.'/devices/3') === $C.'HaController@hubDelete', 'HACS 허브: 예전 주소');
    check($match('POST', '/api/plugins/custom-ha_link/smartthings') === $C.'SmartThingsController@webhook' && $match('POST', '/api/plugins/custom-iot_link/smartthings') === $C.'SmartThingsController@webhook', 'SmartThings Target URL: 예전 · 새 주소');
    check($match('GET', '/api/plugins/custom-ha_link/assets/ha-link-app.js') === $C.'AssetController@show' && $match('GET', '/api/plugins/custom-iot_link/assets/iot-link.css') === $C.'AssetController@show' && $match('GET', '/api/plugins/custom-iot_link/assets/other.js') === null, '자산: 예전 이름 · 새 이름 · 그 밖은 없음');
    // 1.1.0 SmartThings 로그인 연결 — 새 주소 · 예전 주소 모두 · 로그인(auth:sanctum) 뒤
    $om = $router->getRoutes()->match(Request::create('/api/plugins/custom-iot_link/smartthings/oauth/finish', 'POST'));
    $rm = $router->getRoutes()->match(Request::create('/api/plugins/custom-iot_link/admin/smartthings/register', 'POST'));
    check($match('POST', '/api/plugins/custom-iot_link/smartthings/oauth/start') === $C.'SmartThingsController@oauthStart' && $om->getActionName() === $C.'SmartThingsController@oauthFinish' && in_array('auth:sanctum', $om->gatherMiddleware(), true) && in_array('throttle:10,1', $om->gatherMiddleware(), true)
        && $match('GET', '/api/plugins/custom-iot_link/smartthings/installs/3/devices') === $C.'SmartThingsController@devices' && $match('PUT', '/api/plugins/custom-ha_link/smartthings/installs/3/devices') === $C.'SmartThingsController@pick' && $match('GET', '/api/plugins/custom-iot_link/smartthings/installs/x/devices') === null
        && $match('GET', '/api/plugins/custom-iot_link/smartthings/oauth/finish') === null && $rm->getActionName() === $C.'AdminController@register' && in_array('permission:admin,core.plugins.update', $rm->gatherMiddleware(), true) && in_array('auth:sanctum', $rm->gatherMiddleware(), true),
        '1.1.0 SmartThings 로그인 연결 · 센서 고르기 · 자동 등록 라우트 (로그인 · 권한 · 1분 한도)');
    check($match('POST', '/api/plugins/custom-ha_link/in/nothex') === null && $match('GET', '/api/plugins/custom-ha_link/in/'.$tok) === null, '예전 주소도 조건 그대로 (32자 hex · POST 만)');
    $sm = $router->getRoutes()->match(Request::create('/api/plugins/custom-ha_link/smartthings', 'POST'));
    check(in_array('throttle:600,1', $sm->gatherMiddleware(), true) && in_array('api', $sm->gatherMiddleware(), true), '예전 SmartThings 주소도 api · 1분 600번 제한');
    $ad = $router->getRoutes()->match(Request::create('/api/plugins/custom-ha_link/admin/settings', 'PUT'));
    check(in_array('auth:sanctum', $ad->gatherMiddleware(), true) && in_array('permission:admin,core.plugins.update', $ad->gatherMiddleware(), true), '예전 관리자 API 도 로그인 · 권한 그대로');
    check(LegacyRoutes::legacyUri('api/plugins/custom-iot_link/in/x') === 'api/plugins/custom-ha_link/in/x' && LegacyRoutes::legacyUri('api/plugins/custom-iot_linkx/a') === null && LegacyRoutes::legacyUri('api/plugins/other/a') === null, '예전 경로 만들기 — 이 플러그인 것만');
    $n1 = count($router->getRoutes()->getRoutes());
    LegacyRoutes::mirror($router);
    check(count($router->getRoutes()->getRoutes()) === $n1, '두 번 불러도 늘지 않음 (덮어씀)');

    $AC = \Plugins\Custom\IotLink\Http\Controllers\AssetController::class;
    $ok = $AC::LEGACY === ['ha-link-app.js' => 'iot-link-app.js', 'ha-link.css' => 'iot-link.css'];
    foreach ($AC::LEGACY as $to) {
        $ok = $ok && is_file($root.'/resources/assets/'.$to);
    }
    check($ok && str_contains($read('src/Http/Controllers/AssetController.php'), '$file = self::LEGACY[$file] ?? $file;'), '자산: 예전 파일 이름 → 지금 파일');

    echo "■ 새 주소로 안내\n";
    check(str_contains($read('src/Services/HaService.php'), "'/api/plugins/custom-iot_link/in/'") && str_contains($read('src/Services/SmartThingsService.php'), "'/api/plugins/custom-iot_link/smartthings'")
        && \Plugins\Custom\IotLink\Services\SmartThingsService::legacyTargetUrl() === 'https://3ds.test/api/plugins/custom-ha_link/smartthings' && \Plugins\Custom\IotLink\Services\SmartThingsService::targetUrl() === 'https://3ds.test/api/plugins/custom-iot_link/smartthings' && \Plugins\Custom\IotLink\Services\SmartThingsService::redirectUri() === 'https://3ds.test/iot-link', '설정 글 push_url · SmartThings Target URL 은 새 주소 (예전 주소도 알려 줌)');
    check(str_contains($read('README.md'), 'plugin:install custom-iot_link') && str_contains($read('README.md'), 'plugin:deactivate custom-ha_link') && str_contains($read('CHANGELOG.md'), '## '.$pj['version']), 'README 옮기기 순서 · CHANGELOG');

    echo "■ 1.4.10 보관함 이름 따라가기\n";
    check(method_exists(\Plugins\Custom\IotLink\Api\Ha::class, 'renameLocation') && str_contains($read('src/Api/Ha.php'), 'Rules::loc((string) $d->location) === $old'), 'Api\Ha::renameLocation — 내 보관함 센서 위치를 새 이름으로 (빈칸 · 대소문자 무시)');

    echo "\n".($fail === 0 ? "OK ({$pass} checks)" : "{$fail} FAILED / ".($pass + $fail))."\n";
    exit($fail === 0 ? 0 : 1);
}
