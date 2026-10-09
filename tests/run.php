<?php

/**
 * Laravel 없이 도는 가벼운 검사: php tests/run.php
 */

require __DIR__.'/../src/Support/Rules.php';
require __DIR__.'/../src/Support/Settings.php';

use Plugins\Custom\HaLink\Support\Rules as R;
use Plugins\Custom\HaLink\Support\Settings as S;

$pass = 0;
$fail = 0;
function check(bool $ok, string $label): void
{
    global $pass, $fail;
    $ok ? $pass++ : $fail++;
    echo ($ok ? 'ok   ' : 'FAIL ').$label."\n";
}

check(R::num('23.46', -50, 400) === 23.5 && R::num('unavailable', 0, 100) === null && R::num('', 0, 100) === null && R::num(120, 0, 100) === null && R::num('45,2', 0, 100) === 45.2, '수: 반올림 · unavailable · 범위 밖');
check(R::state('unknown') === null && R::state(true) === 'on' && R::state(' Printing ') === 'Printing' && R::isOn('Printing') && R::isOn('running') && R::isOn('on') && ! R::isOn('idle') && ! R::isOn('finish') && ! R::isOn(null), '상태 글 · 가동 중인지');
$p = R::payload(['temperature' => '24.1', 'humidity' => 'unavailable', 'state' => 'running', 'progress' => '42', 'remaining_min' => '75', 'job' => "benchy.3mf"]);
check($p['temp'] === 24.1 && $p['humidity'] === null && $p['state'] === 'running' && $p['progress'] === 42.0 && $p['remaining_min'] === 75.0 && $p['job'] === 'benchy.3mf', '받은 내용 정리');
check(R::payload(['on' => 'true'])['state'] === 'on' && R::payload(['on' => false])['state'] === 'off' && R::payload([])['state'] === null && R::payload(['temp' => 5, 'hum' => 30])['humidity'] === 30.0, '켜짐(on) · 짧은 이름');
check(R::minutes('75') === 75.0 && R::minutes('1h 04m') === 64.0 && R::minutes('2d 3h') === 3060.0 && R::minutes('01:04:00') === 64.0 && R::minutes('64:30') === 64.5 && R::minutes('unknown') === null && R::minutes('') === null
    && R::payload(['state' => 'processing', 'remaining' => '1h 30m'])['remaining_min'] === 90.0 && R::isOn('processing') && R::isOn('self-testing') && ! R::isOn('completed') && ! R::isOn('stopped'), '0.1.7 남은 시간 글 읽기 · Creality 상태 글');
check(R::printerState('processing') === 'printing' && R::printerState('self-testing') === 'printing' && R::printerState('running') === 'printing' && R::printerState('on') === 'printing' && R::printerState('Paused') === 'paused'
    && R::printerState('stopped') === 'cancelled' && R::printerState('completed') === 'completed' && R::printerState('finish') === 'finish' && R::printerState('error') === 'error' && R::printerState('idle') === 'idle' && R::printerState('off') === 'idle' && R::printerState('whatever') === 'idle', '0.1.9 프린터 라운지로 넘길 상태 글 (그쪽이 아는 말로)');
check(R::entity('sensor.DryBox_humidity') === 'sensor.drybox_humidity' && R::entity('switch.dryer') === 'switch.dryer' && R::entity("sensor.x'); drop") === '' && R::entity('nodot') === '', 'HA 엔티티 이름만');
check(R::loc(' Dry Box ') === 'drybox' && R::loc('드라이 박스') === R::loc('드라이박스') && strlen(R::token()) === 32, '보관 위치 견주기 · 비밀 키');
$n = S::normalize(['max_devices' => 9999, 'stale_hours' => 0, 'timezone' => 'Mars/Base', 'menu_label' => '<b>집</b>']);
check($n['max_devices'] === 200 && S::DEFAULTS['send_mode'] === 'change' && S::normalize(['send_mode' => 'x'])['send_mode'] === 'change' && S::normalize(['send_mode' => 'interval'])['send_mode'] === 'interval'
    && S::normalize(['change_hum' => 0])['change_hum'] === 1 && S::normalize(['idle_min' => 1])['idle_min'] === 5 && S::normalize(['send_mode' => 'change', 'idle_min' => 90, 'away_interval_min' => 60])['away_interval_min'] === 90 && S::DEFAULTS['away_after_min'] === 30 && S::normalize(['away_after_min' => 0])['away_after_min'] === 0 && S::normalize(['away_after_min' => 2])['away_after_min'] === 5
    && S::normalize(['send_mode' => 'interval', 'interval_min' => 20, 'away_interval_min' => 5])['away_interval_min'] === 20 && S::DEFAULTS['refresh_sec'] === 60 && S::normalize(['refresh_sec' => 3])['refresh_sec'] === 5 && S::normalize(['refresh_sec' => 0])['refresh_sec'] === 0 && S::normalize(['refresh_sec' => 99999])['refresh_sec'] === 3600 && S::DEFAULTS['interval_min'] === 10 && S::normalize(['interval_min' => 0])['interval_min'] === 1 && S::normalize(['interval_min' => 999])['interval_min'] === 60 && $n['stale_hours'] === 1 && $n['timezone'] === 'Asia/Seoul' && $n['menu_label'] === '집' && S::normalize([])['menu_label'] === 'HA 연결' && $n['hacs_repo'] === 'keidischoi/ha-3ds-link'
    && S::normalize(['hacs_repo' => 'me/my-repo'])['hacs_repo'] === 'me/my-repo' && S::normalize(['hacs_repo' => 'https://evil/x y'])['hacs_repo'] === 'keidischoi/ha-3ds-link', '설정 정리');

$root = dirname(__DIR__);
$pj = json_decode((string) file_get_contents($root.'/plugin.json'), true);
$cj = json_decode((string) file_get_contents($root.'/composer.json'), true);
$ver = $pj['version'] ?? '';
check(($pj['identifier'] ?? '') === 'custom-ha_link' && $ver !== '' && ($cj['version'] ?? '') === $ver, 'plugin.json · composer.json 식별자 · 버전');
foreach (['resources/routes.json', 'resources/layouts/user/ha_link.json', 'resources/layouts/admin/plugin_settings.json', 'resources/lang/ko.json', 'resources/lang/en.json'] as $f) {
    check(is_array(json_decode((string) file_get_contents($root.'/'.$f), true)), $f.' JSON');
}
check(str_contains((string) file_get_contents($root.'/CHANGELOG.md'), '## '.$ver), 'CHANGELOG 에 지금 버전');
$dist = (string) @file_get_contents($root.'/dist/js/plugin.iife.js');
check($dist !== '' && $dist === (string) file_get_contents($root.'/resources/js/ha_link.js') && str_contains($dist, "V = '".$ver."'") && str_contains($dist, "NAV_ID = 'hal-nav', NAV_MOB = 'hal-nav-mobile', NAV_PATH = '/ha-link'"), '번들(dist) = 불러오기 스크립트 · 버전 · 헤더 메뉴');
$app = (string) file_get_contents($root.'/resources/assets/ha-link-app.js');
check(str_contains((string) file_get_contents($root.'/resources/layouts/admin/plugin_settings.json'), 'ha-link-app.js?v='.$ver) && str_contains($app, 'custom-ha_link '.$ver)
    && str_contains((string) file_get_contents($root.'/resources/assets/ha-link.css'), $ver), '관리자 화면 · 앱 · CSS 버전');
$pp = (string) file_get_contents($root.'/plugin.php');
check(str_contains($pp, "'custom_ha_link_alert'") && str_contains($pp, "'hal_devices', 'hal_readings', 'hal_runs', 'hal_settings', 'hal_links'") && ! str_contains($pp, 'getSchedules'), '알림 정의 · 표 목록 · 스케줄 없음');
foreach (array_keys(S::DEFAULTS) as $k) {
    if (! str_contains($app, "['".$k."'")) {
        check(false, '관리자 화면에 설정 '.$k);
    }
}
check(! str_contains($app, 'backdrop-filter') && str_contains($app, "| tojson"), '설정 글: 값은 tojson 으로 (따옴표가 든 작업 이름도 안전)');

echo "\n".($fail === 0 ? "OK ({$pass} checks)" : "{$fail} FAILED / ".($pass + $fail))."\n";
exit($fail === 0 ? 0 : 1);
