<?php

/**
 * Laravel 없이 도는 가벼운 검사: php tests/run.php
 */

require __DIR__.'/../src/Support/Rules.php';
require __DIR__.'/../src/Support/Settings.php';
require __DIR__.'/../src/Support/SmartThings.php';
require __DIR__.'/../src/Support/StSignature.php';

use Plugins\Custom\IotLink\Support\Rules as R;
use Plugins\Custom\IotLink\Support\Settings as S;
use Plugins\Custom\IotLink\Support\SmartThings as ST;
use Plugins\Custom\IotLink\Support\StSignature as SIG;

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
    && S::normalize(['send_mode' => 'interval', 'interval_min' => 20, 'away_interval_min' => 5])['away_interval_min'] === 20 && S::DEFAULTS['refresh_sec'] === 60 && S::normalize(['refresh_sec' => 3])['refresh_sec'] === 5 && S::normalize(['refresh_sec' => 0])['refresh_sec'] === 0 && S::normalize(['refresh_sec' => 99999])['refresh_sec'] === 3600 && S::DEFAULTS['interval_min'] === 10 && S::normalize(['interval_min' => 0])['interval_min'] === 1 && S::normalize(['interval_min' => 999])['interval_min'] === 60 && $n['stale_hours'] === 1 && $n['timezone'] === 'Asia/Seoul' && $n['menu_label'] === '집' && S::normalize([])['menu_label'] === 'IoT 연결' && $n['hacs_repo'] === 'keidischoi/ha-3ds-link'
    && S::normalize(['hacs_repo' => 'me/my-repo'])['hacs_repo'] === 'me/my-repo' && S::normalize(['hacs_repo' => 'https://evil/x y'])['hacs_repo'] === 'keidischoi/ha-3ds-link', '설정 정리');

// ── 0.2.0 SmartThings ──
check(S::DEFAULTS['st_enabled'] === false && S::normalize(['st_client_id' => ' 1a2b-3c '])['st_client_id'] === '1a2b-3c' && S::normalize(['st_client_id' => 'x y/../'])['st_client_id'] === ''
    && S::normalize(['st_client_secret' => 'plain-secret'])['st_client_secret'] === '' && S::normalize(['st_client_secret' => 'enc:abc'])['st_client_secret'] === 'enc:abc'
    && S::normalize(['st_public_key' => 'evil'])['st_public_key'] === '' && S::normalize(['st_code_min' => 1])['st_code_min'] === 5 && S::normalize([])['menu_label'] === 'IoT 연결', '0.2.0 SmartThings 설정 정리 (Secret 은 암호화한 것만 · 메뉴 이름 규칙과 따로)');
$c = ST::newCode();
check(strlen($c) === 8 && ST::normCode(strtolower(substr($c, 0, 4)).' - '.substr($c, 4)) === $c && ST::normCode('ABCD-EFG') === '' && ST::normCode('ABCD-EFG0') === '' && ST::showCode('ABCDEFGH') === 'ABCD-EFGH', '연결 코드: 8글자 · 소문자 · 줄표 · 빈칸 괜찮음 · 헷갈리는 글자(0 · O · 1 · I) 없음');
check(ST::celsius(77, 'F') === 25.0 && ST::celsius(86, '°F') === 30.0 && ST::celsius(21.5, 'C') === 21.5 && ST::celsius(21.5, null) === 21.5 && ST::celsius(-40, 'fahrenheit') === -40.0, '°F → °C');
$cfg = ['link_code' => [['valueType' => 'STRING', 'stringConfig' => ['value' => 'ABCD-2345']]], 'temp' => [['valueType' => 'DEVICE', 'deviceConfig' => ['deviceId' => 'dev-aaaa-0001', 'componentId' => 'main']]],
    'hum' => [['valueType' => 'DEVICE', 'deviceConfig' => ['deviceId' => 'dev-aaaa-0001', 'componentId' => 'main']]], 'power_meter' => [['valueType' => 'DEVICE', 'deviceConfig' => ['deviceId' => 'dev-plug-0001', 'componentId' => 'main']]],
    'contact' => [['valueType' => 'DEVICE', 'deviceConfig' => ['deviceId' => 'bad id!', 'componentId' => 'main']], ['valueType' => 'DEVICE', 'deviceConfig' => ['deviceId' => 'dev-door-0001', 'componentId' => '../x']]],
    'nope' => [['valueType' => 'DEVICE', 'deviceConfig' => ['deviceId' => 'dev-zzzz-0001']]], 'power_on_w' => [['valueType' => 'STRING', 'stringConfig' => ['value' => '25']]]];
$cc = ST::cleanConfig($cfg);
check(ST::configString($cfg, 'link_code') === 'ABCD-2345' && $cc['power_on_w'] === 25.0 && count($cc['devices']) === 4 && $cc['devices'][3] === ['contact', 'dev-door-0001', 'main'] && ! str_contains(json_encode($cc), 'ABCD'), '설정 값: 고른 기기만 (이상한 id · 모르는 칸 뺌) · 코드는 안 남김');
$e = ST::event(['deviceId' => 'dev-aaaa-0001', 'componentId' => 'main', 'capability' => 'temperatureMeasurement', 'attribute' => 'temperature', 'value' => 77], $cc['devices'], 'F');
$h = ST::event(['deviceId' => 'dev-aaaa-0001', 'componentId' => 'main', 'capability' => 'relativeHumidityMeasurement', 'attribute' => 'humidity', 'value' => '41.5'], $cc['devices']);
$pw = ST::event(['deviceId' => 'dev-plug-0001', 'capability' => 'powerMeter', 'attribute' => 'power', 'value' => 30.2, 'unit' => 'W'], $cc['devices'], null, $cc['power_on_w']);
$pw2 = ST::event(['deviceId' => 'dev-plug-0001', 'capability' => 'powerMeter', 'attribute' => 'power', 'value' => 3], $cc['devices'], null, $cc['power_on_w']);
$door = ST::event(['deviceId' => 'dev-door-0001', 'capability' => 'contactSensor', 'attribute' => 'contact', 'value' => 'open'], $cc['devices']);
check($e['payload'] === ['temperature' => 25.0] && $e['sensor']['unit'] === '°C' && ST::event(['deviceId' => 'dev-aaaa-0001', 'capability' => 'temperatureMeasurement', 'attribute' => 'temperature', 'value' => 20, 'unit' => 'C'], $cc['devices'], 'F')['payload'] === ['temperature' => 20.0]
    && $h['payload'] === ['humidity' => 41.5] && $pw['payload'] === ['state' => 'on'] && $pw2['payload'] === ['state' => 'off'] && $door['payload'] === [] && $door['sensor']['value'] === 'open'
    && ST::event(['deviceId' => 'dev-other-0001', 'capability' => 'temperatureMeasurement', 'attribute' => 'temperature', 'value' => 20], $cc['devices']) === null
    && ST::event(['deviceId' => 'dev-door-0001', 'capability' => 'temperatureMeasurement', 'attribute' => 'temperature', 'value' => 20], $cc['devices']) === null
    && ST::event(['deviceId' => 'dev-door-0001', 'capability' => 'contactSensor', 'attribute' => 'contact', 'value' => ['x' => 1]], $cc['devices']) === null, '값 바꾸기: 온도(°F→°C · 이벤트 단위 우선) · 습도 · 전력→가동 · 문은 센서 값만 · 고르지 않은 기기 · 칸이 다른 capability · 묶음 값은 버림');
check(ST::show('contactSensor', 'open', '') === '열림' && ST::show('battery', '87', '%') === '87%' && ST::show('powerMeter', '12.5', 'W') === '12.5 W' && ST::show('temperatureMeasurement', '25', '°C') === '25°C', '화면 글 (열림 · 87% · 12.5 W)');
$sub = ST::subscription('temp', 'dev-aaaa-0001', 'main', 0);
check($sub['sourceType'] === 'DEVICE' && $sub['device']['capability'] === 'temperatureMeasurement' && $sub['device']['attribute'] === '*' && $sub['device']['stateChangeOnly'] === true && strlen($sub['device']['subscriptionName']) <= 36 && ST::subscription('nope', 'x', 'main', 0) === null, '구독 본문');
check(count(ST::statusEvents(['components' => ['main' => ['temperatureMeasurement' => ['temperature' => ['value' => 72, 'unit' => 'F']]]]], 'd1', 'main', 'temperatureMeasurement')) === 1 && ST::statusEvents([], 'd1', 'main', 'x') === [], '처음 값 (기기 status → 이벤트 모양)');
$ini = ST::initialize('3DS');
$p2 = ST::page('2', '3DS', null, '「드라이박스」', true);
$p2bad = ST::page('2', '3DS', null, null, true);
check($ini['configurationData']['initialize']['permissions'] === ['r:devices:*', 'r:locations:*'] && ST::page('1', '3DS', null, null, false)['configurationData']['page']['nextPageId'] === '2' && $p2['configurationData']['page']['complete'] === true && $p2bad['configurationData']['page']['complete'] === false
    && ST::page('1', '3DS', '드라이박스', null, false)['configurationData']['page']['sections'][0]['settings'][1]['required'] === false, '설정 화면: 권한 · 1쪽 코드 · 2쪽 센서 (틀린 코드면 못 끝냄 · 이미 이었으면 코드 없이)');
check(ST::confirmUrlOk('https://api.smartthings.com/v1/apps/x/confirm-registration?token=a') && ! ST::confirmUrlOk('http://api.smartthings.com/x') && ! ST::confirmUrlOk('https://api.smartthings.com.evil.io/x') && ! ST::confirmUrlOk('https://evil.io/?smartthings.com') && ! ST::confirmUrlOk('https://u@api.smartthings.com/') && ! ST::confirmUrlOk(['x']), 'confirmationUrl 은 https://*.smartthings.com 만');
// 1.1.0 로그인 연결 (API Access App · OAuth)
$au = ST::authorizeUrl('cid-1', 'https://3ds.test/iot-link', str_repeat('a', 40));
parse_str((string) parse_url($au, PHP_URL_QUERY), $aq);
check(str_starts_with($au, 'https://api.smartthings.com/v1/oauth/authorize?') && $aq === ['client_id' => 'cid-1', 'response_type' => 'code', 'redirect_uri' => 'https://3ds.test/iot-link', 'scope' => 'r:devices:* r:locations:*', 'state' => str_repeat('a', 40)]
    && ! str_contains($au, '+') && preg_match('/^[a-f0-9]{40}$/', ST::newState()) === 1 && ST::newState() !== ST::newState(), '로그인 주소: client_id · code · redirect_uri · 읽기 권한(빈칸은 %20) · state — state 는 40글자 hex');
check(ST::TOKEN_URLS[0] === 'https://api.smartthings.com/v1/oauth/token' && in_array('https://api.smartthings.com/oauth/token', ST::TOKEN_URLS, true), '토큰 받는 곳: 지금 문서의 주소 먼저 · 예전 주소도');
$cs = static fn (string $id, array $st = []) => ['id' => $id] + ($st ? ['status' => $st] : []);
$items = [
    ['deviceId' => 'dev-plug-0001', 'label' => '건조기 플러그', 'components' => [['id' => 'main', 'capabilities' => [$cs('switch', ['switch' => ['value' => 'on']]), $cs('powerMeter', ['power' => ['value' => 120.5, 'unit' => 'W']]), $cs('energyMeter', ['energy' => ['value' => 3, 'unit' => 'kWh']])]]]],
    ['deviceId' => 'dev-th-00001', 'label' => '<b>드라이박스</b>', 'name' => 'th', 'components' => [['id' => 'sub', 'capabilities' => [$cs('temperatureMeasurement', ['temperature' => ['value' => 1, 'unit' => 'C']]), $cs('battery', ['battery' => ['value' => 80]])]],
        ['id' => 'main', 'capabilities' => [$cs('temperatureMeasurement', ['temperature' => ['value' => 68, 'unit' => 'F']]), $cs('relativeHumidityMeasurement', ['humidity' => ['value' => 30.4]]), $cs('healthCheck')]]]],
    ['deviceId' => 'dev-bulb-0001', 'name' => '전구', 'components' => [['id' => 'main', 'capabilities' => [$cs('switch'), $cs('colorControl')]]]],
    ['deviceId' => 'dev-tv-000001', 'label' => 'TV', 'components' => [['id' => 'main', 'capabilities' => [$cs('audioVolume')]]]], ['deviceId' => 'x', 'label' => '이상한 id'], 'junk',
];
$cd = ST::candidates($items, 'F');
$cm = array_column($cd, null, 'id');
check(array_column($cd, 'id') === ['dev-th-00001', 'dev-plug-0001', 'dev-bulb-0001'] && $cm['dev-th-00001']['label'] === '드라이박스' && $cm['dev-th-00001']['kind'] === 'env' && $cm['dev-plug-0001']['kind'] === 'power'
    && $cm['dev-th-00001']['caps'] === ['temperatureMeasurement' => 'main', 'relativeHumidityMeasurement' => 'main', 'battery' => 'sub'] && $cm['dev-bulb-0001']['label'] === '전구' && $cm['dev-bulb-0001']['values'] === [],
    '고를 기기: 받을 값이 있는 것만 · 온습도계 먼저 · main 칸 먼저(없으면 다른 칸) · 이름의 태그는 뺌');
check($cm['dev-th-00001']['values'] === ['temperatureMeasurement' => '20°C', 'relativeHumidityMeasurement' => '30.4%', 'battery' => '80%'] && $cm['dev-plug-0001']['values'] === ['switch' => '켜짐', 'powerMeter' => '120.5 W', 'energyMeter' => '3 kWh'], '고를 기기의 지금 값 (68°F → 20°C · 단위)');
$tp = ST::triples('dev-plug-0001', $cm['dev-plug-0001']['caps']);
$tb = ST::triples('dev-bulb-0001', $cm['dev-bulb-0001']['caps']);
check($tp === [['switches', 'dev-plug-0001', 'main'], ['power_meter', 'dev-plug-0001', 'main'], ['energy', 'dev-plug-0001', 'main']] && $tb === [['power_switch', 'dev-bulb-0001', 'main']]
    && ST::event(['deviceId' => 'dev-plug-0001', 'capability' => 'switch', 'attribute' => 'switch', 'value' => 'on'], $tp)['payload'] === [] && ST::event(['deviceId' => 'dev-plug-0001', 'capability' => 'powerMeter', 'attribute' => 'power', 'value' => 3], $tp)['payload'] === ['state' => 'off']
    && ST::event(['deviceId' => 'dev-bulb-0001', 'capability' => 'switch', 'attribute' => 'switch', 'value' => 'on'], $tb)['payload'] === ['state' => 'on'], '고른 기기 → 칸: 전력을 재는 플러그는 전력으로 가동 상태(스위치는 값만) · 못 재면 켜짐 = 가동 중');
check(ST::event(['deviceId' => 'dev-plug-0001', 'capability' => 'powerMeter', 'attribute' => 'power', 'value' => 3.2], $tp)['sensor']['unit'] === 'W' && ST::event(['deviceId' => 'dev-th-00001', 'capability' => 'battery', 'attribute' => 'battery', 'value' => 80], ST::triples('dev-th-00001', $cm['dev-th-00001']['caps']))=== null
    && ST::event(['deviceId' => 'dev-th-00001', 'componentId' => 'sub', 'capability' => 'battery', 'attribute' => 'battery', 'value' => 80], ST::triples('dev-th-00001', $cm['dev-th-00001']['caps']))['sensor']['unit'] === '%', '이벤트에 단위가 없으면 채움 (3.2 → 3.2 W) · 칸(component)이 다르면 그 값이 아님');
$ds = ST::deviceSubscription('dev-plug-0001');
check($ds['sourceType'] === 'DEVICE' && $ds['device'] === ['deviceId' => 'dev-plug-0001', 'componentId' => '*', 'capability' => '*', 'attribute' => '*', 'value' => '*', 'stateChangeOnly' => true, 'subscriptionName' => $ds['device']['subscriptionName']]
    && preg_match('/^d_[a-f0-9]{24}$/', $ds['device']['subscriptionName']) === 1 && $ds === ST::deviceSubscription('dev-plug-0001') && $ds != ST::deviceSubscription('dev-bulb-0001') && ST::MAX_PICKS <= 40, '구독: 기기 하나에 하나 · 이름은 늘 같음 · 한도(40) 안');
$ar = ST::appRequest('3DS 놀이터', 'https://3ds.test/t', 'https://3ds.test/iot-link', 'u-u-i-d');
check($ar['appType'] === 'API_ONLY' && $ar['classifications'] === ['CONNECTED_SERVICE'] && $ar['singleInstance'] === true && $ar['principalType'] === 'LOCATION' && $ar['apiOnly'] === ['targetUrl' => 'https://3ds.test/t'] && $ar['oauth'] === ['clientName' => '3DS 놀이터 IoT 연결', 'scope' => ST::SCOPES, 'redirectUris' => ['https://3ds.test/iot-link']]
    && $ar['appName'] === 'iotlink-u-u-i-d' && ST::appRequest('My Site', '', '', 'x')['appName'] === 'mysite-x' && json_encode($ar['iconImage']) === '{}' && mb_strlen($ar['displayName']) <= 75 && mb_strlen(ST::appRequest(str_repeat('가', 200), '', '', 'x')['displayName']) <= 75, '앱 등록 본문 (SmartThings CLI 의 OAuth-In App 과 같은 모양 · 이름은 글자로 시작)');
check(ST::errorText(['requestId' => 'r', 'error' => ['code' => 'X', 'message' => 'Bad <b>thing</b>', 'details' => [['message' => 'scope'], ['message' => 'uri']]]]) === 'Bad thing · scope · uri' && ST::errorText(['error' => 'invalid_grant', 'error_description' => 'Invalid code']) === 'Invalid code' && ST::errorText('x') === '' && ST::errorText([]) === '', 'SmartThings 오류 글 (태그 빼고 · 짧게)');
check(ST::listStatus(['components' => [['id' => 'main', 'capabilities' => [['id' => 'switch', 'status' => ['switch' => ['value' => 'on']]], ['id' => 'x']]]]]) === ['components' => ['main' => ['switch' => ['switch' => ['value' => 'on']]]]] && ST::listStatus([]) === ['components' => []], '목록의 값 → 기기 상태 모양');

// 서명
$k = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
$pub = openssl_pkey_get_details($k)['key'];
$k2 = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
$body = '{"lifecycle":"EVENT"}';
$now = 1791600000;
$date = gmdate('D, d M Y H:i:s \G\M\T', $now);
$dg = 'SHA-256='.base64_encode(hash('sha256', $body, true));
$mk = function ($key, string $target = '/api/plugins/custom-iot_link/smartthings', string $list = '(request-target) digest date', string $alg = 'rsa-sha256', string $kid = '/pl/useast2/1b-75-d2') use ($dg, $date) {
    openssl_sign(SIG::signingString('POST', $target, ['digest' => $dg, 'date' => $date], $list), $sig, $key, OPENSSL_ALGO_SHA256);

    return ['authorization' => 'Signature keyId="'.$kid.'",signature="'.base64_encode($sig).'",headers="'.$list.'",algorithm="'.$alg.'"', 'digest' => $dg, 'date' => $date];
};
$keys = fn (string $kid) => $kid === '/pl/useast2/1b-75-d2' ? [$pub] : [];
$T = ['/api/plugins/custom-iot_link/smartthings'];
check(SIG::parse($mk($k)['authorization'])['keyId'] === '/pl/useast2/1b-75-d2' && SIG::parse('Bearer abc') === null && SIG::parse('Signature keyId=""') === null, '서명 머리 읽기');
check(SIG::verify('POST', $T, $mk($k), $body, $keys, $now) === null, '맞는 서명 → 통과');
check(SIG::verify('POST', $T, [], $body, $keys, $now) === 'unsigned' && SIG::verify('POST', $T, $mk($k2), $body, $keys, $now) === 'signature' && SIG::verify('POST', $T, $mk($k), $body.' ', $keys, $now) === 'digest'
    && SIG::verify('POST', $T, $mk($k), $body, $keys, $now + 3600) === 'date' && SIG::verify('POST', $T, $mk($k, '/other'), $body, $keys, $now) === 'signature' && SIG::verify('POST', $T, $mk($k, $T[0], 'digest date'), $body, $keys, $now) === 'headers'
    && SIG::verify('POST', $T, $mk($k, $T[0], '(request-target) digest date', 'hmac-sha256'), $body, $keys, $now) === 'algorithm' && SIG::verify('POST', $T, $mk($k, $T[0], '(request-target) digest date', 'rsa-sha256', '/pl/x'), $body, $keys, $now) === 'key'
    && SIG::verify('POST', $T, $mk($k, $T[0], '(request-target) digest date', 'rsa-sha256', '/../etc'), $body, $keys, $now) === 'keyid', '거부: 서명 없음 · 다른 열쇠 · 본문 바뀜(digest) · 오래된 Date · 다른 경로 · 서명 머리 빠짐 · 알고리즘 · 모르는 키 · 이상한 keyId');
check(SIG::digestOk('SHA256='.base64_encode(hash('sha256', 'x', true)), 'x') && SIG::digestOk('sha-256='.base64_encode(hash('sha256', 'x', true)), 'x') && ! SIG::digestOk('MD5=abc', 'x') && ! SIG::digestOk(null, 'x'), 'Digest — SHA-256= · SHA256= 둘 다');
check(SIG::keyUrls('/pl/useast2/1b-75') === ['https://key.smartthings.com/pl/useast2/1b-75', 'https://key.smartthings.com/key/pl/useast2/1b-75'] && SIG::keyUrls('//evil.com/x') === [] && SIG::keyUrls('@evil.com') === [], '공개 키 주소 — key.smartthings.com 밖으로 못 나감');

$root = dirname(__DIR__);
$pj = json_decode((string) file_get_contents($root.'/plugin.json'), true);
$cj = json_decode((string) file_get_contents($root.'/composer.json'), true);
$ver = $pj['version'] ?? '';
check(($pj['identifier'] ?? '') === 'custom-iot_link' && $ver !== '' && ($cj['version'] ?? '') === $ver, 'plugin.json · composer.json 식별자 · 버전');
foreach (['plugin.json', 'composer.json', 'resources/routes.json', 'resources/layouts/user/iot_link.json', 'resources/layouts/admin/plugin_settings.json', 'resources/lang/ko.json', 'resources/lang/en.json'] as $f) {
    check(is_array(json_decode((string) file_get_contents($root.'/'.$f), true)), $f.' JSON');
}
check(str_contains((string) file_get_contents($root.'/CHANGELOG.md'), '## '.$ver), 'CHANGELOG 에 지금 버전');
$dist = (string) @file_get_contents($root.'/dist/js/plugin.iife.js');
check($dist !== '' && $dist === (string) file_get_contents($root.'/resources/js/iot_link.js') && str_contains($dist, "V = '".$ver."'") && str_contains($dist, "NAV_ID = 'hal-nav', NAV_MOB = 'hal-nav-mobile', NAV_PATH = '/iot-link'"), '번들(dist) = 불러오기 스크립트 · 버전 · 헤더 메뉴');
$app = (string) file_get_contents($root.'/resources/assets/iot-link-app.js');
check(str_contains((string) file_get_contents($root.'/resources/layouts/admin/plugin_settings.json'), 'iot-link-app.js?v='.$ver) && str_contains($app, 'custom-iot_link '.$ver)
    && str_contains((string) file_get_contents($root.'/resources/assets/iot-link.css'), $ver), '관리자 화면 · 앱 · CSS 버전');
$pp = (string) file_get_contents($root.'/plugin.php');
check(str_contains($pp, "'custom_ha_link_alert'") && str_contains($pp, "'hal_devices', 'hal_readings', 'hal_runs', 'hal_settings', 'hal_links', 'hal_st_installs', 'hal_st_sensors', 'hal_st_codes', 'hal_st_states']") && ! str_contains($pp, 'getSchedules'), '알림 정의 · 표 목록 · 스케줄 없음');
$api = (string) file_get_contents($root.'/src/routes/api.php');
check(is_file($root.'/database/migrations/2026_10_10_000001_add_smartthings_tables.php') && str_contains($api, "Route::post('smartthings', [SmartThingsController::class, 'webhook'])->middleware('throttle:")
    && preg_match("/auth:sanctum.*smartthings\/code.*throttle:10,1/s", $api) && str_contains($app, 'data-st-new') && str_contains($app, 'stAdmin('), '0.2.0 마이그레이션 · 받는 곳(서명 확인) · 회원 API(로그인 · 1분 한도) · 화면');
$svcSrc = (string) file_get_contents($root.'/src/Services/SmartThingsService.php');
check(! preg_match('/log\([^;]*(token|secret|authorization|signature|code)\W*=>/i', $svcSrc) && str_contains($svcSrc, 'Crypt::encryptString'), '로그에 토큰 · Secret · 서명 · 코드를 남기지 않음 · 토큰 암호화');
foreach (array_keys(S::DEFAULTS) as $k) {
    if (! str_contains($app, "['".$k."'")) {
        check(false, '관리자 화면에 설정 '.$k);
    }
}
check(! str_contains($app, 'backdrop-filter') && str_contains($app, "| tojson"), '설정 글: 값은 tojson 으로 (따옴표가 든 작업 이름도 안전)');
// 1.1.0 로그인 연결
$open = (string) strstr($api, "Route::middleware(['auth:sanctum'", true);   // 로그인 없이 열린 라우트 부분
check(is_file($root.'/database/migrations/2026_10_11_000001_add_smartthings_oauth_tables.php') && $open !== '' && ! str_contains($open, 'smartthings/oauth') && ! str_contains($open, 'smartthings/installs') && ! str_contains($open, 'admin/')
    && preg_match("/smartthings\/oauth\/start'[^;]*throttle:10,1/", $api) === 1 && preg_match("/smartthings\/oauth\/finish'[^;]*throttle:10,1/", $api) === 1 && substr_count($api, "smartthings/installs/{id}/devices'") === 2
    && preg_match("/admin\/smartthings\/register'[^;]*permission:admin,core\.plugins\.update/", $api) === 1, '1.1.0 마이그레이션 · 로그인 연결 API 는 모두 로그인 뒤 (1분 한도) · 자동 등록은 관리자 권한');
check(str_contains($app, 'data-st-go') && str_contains($app, "'/smartthings/oauth/start'") && str_contains($app, "'/smartthings/oauth/finish'") && str_contains($app, 'function stReturn()') && str_contains($app, "history.replaceState(history.state, '', location.pathname + location.hash)")
    && str_contains($app, 'function stPick(') && str_contains($app, 'function guideSt()') && str_contains($app, "guideBox('st')") && str_contains($app, 'data-st-reg') && str_contains($app, 'https://developer.smartthings.com/console') && ! str_contains($app, 'developer.samsung.com'),
    '화면: 연결하기 단추 · 돌아오면 주소 줄에서 code 를 지우고 이음 · 센서 고르기 · SmartThings 연결 방법(그림) · 관리자 자동 등록 · 예전 Workspace 주소 없음');
$reg = (string) strstr((string) strstr($svcSrc, 'public function register(string $pat)'), '/* ─────────', true);
$patUses = preg_match_all('/[^\n]*\$pat\b[^\n]*/', $reg, $pm) ? $pm[0] : [];
$patOk = $reg !== '' && count($patUses) >= 4;
foreach ($patUses as $line) {
    $patOk = $patOk && (bool) preg_match('/^\s*(public function register|\$pat = trim\(\$pat\);|if \(! preg_match\(|\[\$st, \$j\] = \$this->api\(\$pat, |\$this->api\(\$pat, )/', $line);   // 다듬기 · 모양 확인 · SmartThings 요청에만
}
check($patOk && ! preg_match('/->log\([^;]*\$(pat|code|state|at|rt|sec)\b/', $svcSrc) && str_contains($svcSrc, "->where('state', \$state)->where('user_id', \$uid)"), '개인 액세스 토큰은 SmartThings 요청에만 쓰임 (저장 · 기록 없음) · state 는 그 회원 것일 때만');

echo "\n".($fail === 0 ? "OK ({$pass} checks)" : "{$fail} FAILED / ".($pass + $fail))."\n";
exit($fail === 0 ? 0 : 1);
