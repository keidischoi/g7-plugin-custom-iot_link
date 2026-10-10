<?php

namespace Plugins\Custom\IotLink\Support;

/**
 * 0.2.0 SmartThings (WebHook SmartApp) — 고르는 칸 · 받은 값 바꾸기 · 설정 화면 JSON (DB · Laravel 없이 검사: tests/run.php)
 *
 *  SmartThings 는 그냥 또 하나의 「보내는 곳」 — 받은 DEVICE_EVENT 를 {temperature, humidity, state} 로 바꿔 HaService::ingest 로 넘김.
 *  온습도 · 가동 상태가 아닌 값(문 열림 · 움직임 · 배터리 …)은 센서 값으로만 남겨 화면에 보임.
 */
final class SmartThings
{
    public const API = 'https://api.smartthings.com/v1';

    /** 토큰 받기 · 새로 받기 — SDK(core-sdk) · 공식 예제가 쓰는 곳을 먼저, 그 주소가 안 받으면 Home Assistant 가 쓰는 곳 · 새 문서(/v1)의 곳 */
    public const TOKEN_URLS = ['https://api.smartthings.com/oauth/token', 'https://auth-global.api.smartthings.com/oauth/token', 'https://api.smartthings.com/v1/oauth/token'];

    /**
     * 1.1.0 로그인 연결 (API Access App · OAuth) — 회원을 보내는 곳.
     *  1.1.1 새 문서의 `/v1/oauth/authorize` 는 로그인한 뒤 허용 화면에서 「Resource representation is only available with these types: text/html」(406)로 막힘
     *  (/v1 길은 JSON 만 주는 길 — 허용 화면은 HTML) → 공식 예제 · Home Assistant 가 쓰는 `/oauth/authorize` 로
     */
    public const AUTHORIZE_URL = 'https://api.smartthings.com/oauth/authorize';

    /** 1.1.0 로그인 연결에서 고를 수 있는 SmartThings 기기 수 (기기 하나에 구독 하나 — 설치 하나의 구독 한도는 40) */
    public const MAX_PICKS = 30;

    /**
     * 1.1.0 로그인 연결 — capability → 칸. 기기를 고르면 그 기기가 가진 이 capability 들을 모두 받음.
     *  switch 는 전력 측정(powerMeter)이 같이 있으면 「그 밖의 스위치」(값만) — 가동 상태는 전력으로 봄
     */
    public const CAP_SLOTS = ['temperatureMeasurement' => 'temp', 'relativeHumidityMeasurement' => 'hum', 'powerMeter' => 'power_meter', 'switch' => 'power_switch', 'contactSensor' => 'contact',
        'motionSensor' => 'motion', 'presenceSensor' => 'presence', 'waterSensor' => 'water', 'battery' => 'battery', 'energyMeter' => 'energy', 'illuminanceMeasurement' => 'illuminance'];

    /** 서명 공개 키 — keyId(/pl/useast2/…)를 그대로 붙임 (SDK HttpKeyResolver). 새 문서의 /key/{keyId} 도 시도 */
    public const KEY_HOST = 'https://key.smartthings.com';

    public const SCOPES = ['r:devices:*', 'r:locations:*'];

    /** installedApp 하나에 만드는 구독 수 한도 */
    public const MAX_SUBS = 20;

    /**
     * 설정 화면의 기기 칸 — id => [capability, attribute(구독), 이름, 역할(temp · hum · state · power · ''), 여러 개]
     *  역할이 있는 칸은 하나만 (그 값이 사이트 기기의 온도 · 습도 · 가동 상태가 됨)
     */
    public const SLOTS = [
        'temp' => ['temperatureMeasurement', 'temperature', '🌡️ 온도 센서', 'temp', false],
        'hum' => ['relativeHumidityMeasurement', 'humidity', '💧 습도 센서', 'hum', false],
        'power_switch' => ['switch', 'switch', '🔌 전원 스위치 · 플러그 (켜짐 = 가동 중)', 'state', false],
        'power_meter' => ['powerMeter', 'power', '⚡ 전력 측정 (정한 W 넘으면 가동 중)', 'power', false],
        'contact' => ['contactSensor', 'contact', '🚪 문 · 뚜껑 열림 센서', '', true],
        'motion' => ['motionSensor', 'motion', '🏃 움직임 센서', '', true],
        'presence' => ['presenceSensor', 'presence', '🏠 재실 센서', '', true],
        'water' => ['waterSensor', 'water', '💦 누수 센서', '', true],
        'battery' => ['battery', 'battery', '🔋 배터리', '', true],
        'energy' => ['energyMeter', 'energy', '📈 누적 전력량', '', true],
        'switches' => ['switch', 'switch', '💡 그 밖의 스위치', '', true],
        'illuminance' => ['illuminanceMeasurement', 'illuminance', '☀️ 밝기 센서', '', true],
    ];

    /**
     * 1.3.0 🖨️ 프린터 기기 — 커뮤니티 Edge 드라이버가 SmartThings 에 만든 3D 프린터 (Bambu Lab LAN · Klipper/Moonraker …). 역할 => 화면 이름.
     *  드라이버마다 capability 이름이 달라(맞춤 capability: 이름공간.이름) 고를 때 칸 · capability · attribute 를 같이 적어 둠: [역할, deviceId, componentId, capability, attribute]
     *  본 것: Bambu(칸 printing 의 contactSensor = 출력 중 · 칸 progress 의 *.printProgress · 칸 nozzle/bed 의 온도 · amsHumidity · light · main 스위치 = 연결)
     *        Klipper(main 의 *.klipperstatus.printer · 칸 printJob 의 *.percentcomplete · *.printtime.remainingTime · *.filename · 칸 extruder/bed 의 온도 · *.printerfan.speed)
     */
    public const PRINTER = ['p_state' => '출력 상태', 'p_progress' => '진행률', 'p_remaining' => '남은 시간', 'p_job' => '출력물', 'p_nozzle' => '노즐 온도', 'p_bed' => '베드 온도',
        'p_chamber' => '챔버 온도', 'p_hum' => 'AMS 습도', 'p_light' => '조명', 'p_online' => '프린터 연결', 'p_fan' => '팬'];

    /** 화면에 보일 이름 (capability.attribute → 한국어 · 값 바꾸기) */
    public const LABELS = [
        'temperatureMeasurement' => '온도', 'relativeHumidityMeasurement' => '습도', 'switch' => '스위치', 'powerMeter' => '전력', 'energyMeter' => '전력량',
        'contactSensor' => '열림', 'motionSensor' => '움직임', 'presenceSensor' => '재실', 'waterSensor' => '누수', 'battery' => '배터리', 'illuminanceMeasurement' => '밝기',
    ];

    /** 값에 단위가 같이 오지 않을 때 (DEVICE_EVENT 에는 단위가 없음) */
    public const UNITS = ['powerMeter' => 'W', 'energyMeter' => 'kWh', 'battery' => '%', 'illuminanceMeasurement' => 'lux'];

    public const VALUES = ['on' => '켜짐', 'off' => '꺼짐', 'open' => '열림', 'closed' => '닫힘', 'active' => '움직임 있음', 'inactive' => '조용함', 'present' => '있음', 'not present' => '없음', 'wet' => '물 감지!', 'dry' => '정상'];

    /** 연결 코드 글자 (헷갈리는 0 · O · 1 · I 뺌) */
    private const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    /* ───────── 연결 코드 ───────── */

    /** 새 일회용 코드 — 8글자 (XXXX-XXXX 로 보임) */
    public static function newCode(): string
    {
        $s = '';
        for ($i = 0; $i < 8; $i++) {
            $s .= self::CODE_CHARS[random_int(0, strlen(self::CODE_CHARS) - 1)];
        }

        return $s;
    }

    /** 회원이 적은 코드 → 비교할 글 (빈칸 · 줄표 빼고 대문자, 8글자가 아니면 빈 글) */
    public static function normCode(mixed $v): string
    {
        $s = strtoupper((string) preg_replace('/[^A-Za-z0-9]/', '', is_scalar($v) ? (string) $v : ''));

        return strlen($s) === 8 && strspn($s, self::CODE_CHARS) === 8 ? $s : '';
    }

    public static function showCode(string $code): string
    {
        return strlen($code) === 8 ? substr($code, 0, 4).'-'.substr($code, 4) : $code;
    }

    /* ───────── 설정 값 (installedApp.config) ───────── */

    /** TEXT · NUMBER 칸 값 */
    public static function configString(array $config, string $key): string
    {
        $v = $config[$key][0] ?? null;
        if (! is_array($v)) {
            return '';
        }
        $s = $v['stringConfig']['value'] ?? ($v['decimalConfig']['value'] ?? ($v['numberConfig']['value'] ?? ''));

        return is_scalar($s) ? trim((string) $s) : '';
    }

    /**
     * 고른 기기 — [slot, deviceId, componentId] (알 수 없는 칸 · 이상한 id 는 뺌)
     *
     * @return list<array{0: string, 1: string, 2: string}>
     */
    public static function configDevices(array $config): array
    {
        $out = [];
        foreach (self::SLOTS as $slot => $_) {
            foreach (is_array($config[$slot] ?? null) ? $config[$slot] : [] as $item) {
                $dev = is_array($item) ? ($item['deviceConfig'] ?? null) : null;
                if (! is_array($dev)) {
                    continue;
                }
                $id = self::id($dev['deviceId'] ?? '');
                $comp = self::comp($dev['componentId'] ?? 'main');
                if ($id !== '') {
                    $out[] = [$slot, $id, $comp];
                }
            }
        }

        return $out;
    }

    /** 저장해 둘 설정 (기기 고른 것 · 가동 기준 W 만 — 코드 같은 것은 남기지 않음) @return array{devices: list<array{0: string, 1: string, 2: string}>, power_on_w: float} */
    public static function cleanConfig(array $config): array
    {
        $w = self::configString($config, 'power_on_w');

        return ['devices' => array_slice(self::configDevices($config), 0, self::MAX_SUBS), 'power_on_w' => is_numeric($w) ? max(0.5, min(5000.0, (float) $w)) : 10.0];
    }

    public static function id(mixed $v): string
    {
        $s = is_scalar($v) ? trim((string) $v) : '';

        return preg_match('/^[A-Za-z0-9-]{8,64}$/', $s) ? $s : '';
    }

    public static function comp(mixed $v): string
    {
        $s = is_scalar($v) ? trim((string) $v) : '';

        return preg_match('/^[A-Za-z0-9_-]{1,40}$/', $s) ? $s : 'main';
    }

    /* ───────── 값 바꾸기 ───────── */

    /** 온도 → °C (화씨면 바꿈). 단위를 모르면 그대로 (°C 로 봄) */
    public static function celsius(float $v, ?string $unit): float
    {
        $u = strtolower(trim((string) $unit, " \t°º"));

        return round(in_array($u, ['f', 'fahrenheit', '°f'], true) ? ($v - 32) * 5 / 9 : $v, 1);
    }

    /**
     * DEVICE_EVENT 하나 → 센서 값 한 줄 + 사이트 기기로 넘길 값.
     *  고른 기기가 아니면 null (남의 기기 · 지운 칸의 값은 버림).
     *
     * @param  array<string, mixed>  $ev  deviceEvent
     * @param  list<array{0: string, 1: string, 2: string}>  $devices  cleanConfig()['devices']
     * @return array{sensor: array{device: string, component: string, capability: string, attribute: string, value: string, unit: string, num: ?float}, payload: array<string, mixed>}|null
     */
    public static function event(array $ev, array $devices, ?string $scale = null, float $powerOnW = 10.0, ?string $knownUnit = null): ?array
    {
        $dev = self::id($ev['deviceId'] ?? '');
        $comp = self::comp($ev['componentId'] ?? 'main');
        $cap = is_string($ev['capability'] ?? null) && preg_match('/^[A-Za-z0-9.]{1,60}$/', $ev['capability']) ? $ev['capability'] : '';
        $attr = is_string($ev['attribute'] ?? null) && preg_match('/^[A-Za-z0-9_]{1,60}$/', $ev['attribute']) ? $ev['attribute'] : '';
        if ($dev === '' || $cap === '' || $attr === '') {
            return null;
        }
        $roles = [];
        foreach ($devices as $d) {
            if (($d[1] ?? '') !== $dev || ($d[2] ?? '') !== $comp) {
                continue;
            }
            if (isset($d[4])) {   // 1.3.0 프린터 기기 — capability · attribute 를 적어 둔 칸
                if ($d[3] === $cap && $d[4] === $attr && isset(self::PRINTER[$d[0]])) {
                    $roles[] = $d[0];
                }
            } elseif ((self::SLOTS[$d[0]][0] ?? '') === $cap) {
                $roles[] = self::SLOTS[$d[0]][3];
            }
        }
        if ($roles === []) {
            return null;
        }
        $pr = isset(self::PRINTER[$roles[0]]) ? $roles[0] : '';
        $raw = $ev['value'] ?? null;
        if (is_bool($raw)) {
            $raw = $raw ? 'true' : 'false';
        }
        if (! is_scalar($raw)) {
            return null;   // 묶음 값(JSON)은 아직 안 받음
        }
        $unit = $ev['unit'] ?? (is_array($ev['data'] ?? null) ? ($ev['data']['unit'] ?? null) : null);
        $unit = is_string($unit) && $unit !== '' ? mb_substr($unit, 0, 12) : (string) ($knownUnit ?? '');
        if ($unit === '' && is_numeric($raw) && isset(self::UNITS[$cap]) && $attr === (self::SLOTS[self::CAP_SLOTS[$cap]][1] ?? '')) {
            $unit = self::UNITS[$cap];   // 1.1.0 이벤트에는 단위가 없어 「3.2」로만 보였음 → 「3.2 W」
        }
        $num = is_numeric($raw) ? (float) $raw : null;
        $value = mb_substr(trim(strip_tags((string) $raw)), 0, 60);
        $payload = [];
        if ($pr !== '') {
            // 1.3.0 프린터 기기의 값 — 사이트 기기의 온습도(주변 값)로 넣지 않고 프린터 값으로 (HaService::ingest 가 내 프린터로 넘김)
            $low = strtolower($value);
            $none = $value === '' || in_array($low, ['-', '...', 'n/a', 'na', 'none', 'unknown', 'unavailable'], true);
            if (in_array($pr, ['p_nozzle', 'p_bed', 'p_chamber'], true)) {
                if ($num !== null) {
                    $num = self::celsius($num, $unit !== '' ? $unit : $scale);
                    $value = (string) $num;
                    $unit = '°C';
                    $payload[substr($pr, 2)] = $num;
                }
            } elseif ($pr === 'p_state') {
                // contactSensor(칸 printing): 열림 = 출력 중 · 닫힘 = 쉬는 중 / 맞춤 상태 글(standby · printing · paused · complete · cancelled · error …)은 그대로
                $payload['state'] = $cap === 'contactSensor' ? ($low === 'open' ? 'printing' : 'idle') : ($none ? null : $low);
            } elseif ($pr === 'p_progress') {
                if ($num !== null && $num >= 0 && $num <= 100) {
                    $payload['progress'] = $num;
                    $unit = '%';
                }
            } elseif ($pr === 'p_remaining') {
                $payload['remaining'] = $none ? null : $value;
            } elseif ($pr === 'p_job') {
                $payload['job'] = $none ? null : $value;
            } elseif ($pr === 'p_hum') {
                if ($num !== null) {
                    $payload['ams_humidity'] = $num;
                    $unit = '%';
                }
            } elseif ($pr === 'p_fan') {
                if ($num !== null) {
                    $payload['fan'] = $num;
                    $unit = '%';
                }
            } elseif ($pr === 'p_light' || $pr === 'p_online') {
                $payload[substr($pr, 2)] = $low === 'on';
            }
            $payload = array_filter($payload, static fn ($x) => $x !== null) + ['_printer' => true];
        } elseif ($cap === 'temperatureMeasurement' && $num !== null) {
            $num = self::celsius($num, $unit !== '' ? $unit : $scale);
            $value = (string) $num;
            $unit = '°C';
            if (in_array('temp', $roles, true)) {
                $payload['temperature'] = $num;
            }
        } elseif ($cap === 'relativeHumidityMeasurement' && $num !== null) {
            $unit = '%';
            if (in_array('hum', $roles, true)) {
                $payload['humidity'] = $num;
            }
        } elseif ($cap === 'switch' && in_array('state', $roles, true)) {
            $payload['state'] = strtolower($value) === 'on' ? 'on' : 'off';
        } elseif ($cap === 'powerMeter' && $num !== null && in_array('power', $roles, true)) {
            $payload['state'] = $num >= $powerOnW ? 'on' : 'off';
        }

        return ['sensor' => ['device' => $dev, 'component' => $comp, 'capability' => $cap, 'attribute' => $attr, 'value' => $value, 'unit' => $unit, 'num' => $num !== null ? round($num, 2) : null], 'payload' => $payload];
    }

    /** 화면에 보일 값 글 (켜짐 · 열림 …) */
    public static function show(string $cap, string $value, string $unit): string
    {
        $v = self::VALUES[strtolower($value)] ?? $value;

        return $v.($unit !== '' && is_numeric($value) ? ($unit === '%' || str_starts_with($unit, '°') ? '' : ' ').$unit : '');
    }

    /** 구독 본문 (POST /installedapps/{id}/subscriptions) — 칸마다 그 capability 의 모든 attribute */
    public static function subscription(string $slot, string $deviceId, string $comp, int $i): ?array
    {
        $s = self::SLOTS[$slot] ?? null;

        return $s === null ? null : ['sourceType' => 'DEVICE', 'device' => ['deviceId' => $deviceId, 'componentId' => $comp, 'capability' => $s[0], 'attribute' => '*', 'value' => '*', 'stateChangeOnly' => true, 'subscriptionName' => substr($slot, 0, 24).'_'.$i]];
    }

    /** 처음 값 (GET /devices/{id}/status) → deviceEvent 모양 @return list<array<string, mixed>> */
    public static function statusEvents(array $status, string $deviceId, string $comp, string $cap): array
    {
        $out = [];
        foreach (is_array($status['components'][$comp][$cap] ?? null) ? $status['components'][$comp][$cap] : [] as $attr => $st) {
            if (is_array($st) && array_key_exists('value', $st) && is_scalar($st['value'])) {
                $out[] = ['deviceId' => $deviceId, 'componentId' => $comp, 'capability' => $cap, 'attribute' => (string) $attr, 'value' => $st['value'], 'unit' => $st['unit'] ?? null];
            }
        }

        return $out;
    }

    /* ───────── SmartThings 앱의 설정 화면 (CONFIGURATION) ───────── */

    /** @return array<string, mixed> */
    public static function initialize(string $site): array
    {
        return ['configurationData' => ['initialize' => ['id' => 'ha_link', 'name' => mb_substr($site.' 연결', 0, 40), 'description' => '센서 값을 사이트의 IoT 연결로 보내요', 'permissions' => self::SCOPES, 'firstPageId' => '1']]];
    }

    /**
     * @param  string|null  $linked  이미 이어진 사이트 기기 이름 (고치기) — null 이면 처음
     * @return array<string, mixed>
     */
    public static function page(string $pageId, string $site, ?string $linked, ?string $codeTarget, bool $codeTyped): array
    {
        $para = static fn (string $id, string $name, string $desc) => ['id' => $id, 'name' => $name, 'description' => $desc, 'type' => 'PARAGRAPH', 'required' => false];
        if ($pageId !== '2') {
            $s = [$para('intro', $site.' 의 「IoT 연결」과 이어요', '사이트 → IoT 연결 → SmartThings 카드에서 「연결 코드 만들기」를 누르고 나온 8글자를 적어 주세요. 코드는 한 번만 · 30분 안에 쓸 수 있어요.'),
                ['id' => 'link_code', 'name' => '연결 코드', 'description' => $linked !== null ? '지금 「'.$linked.'」에 이어져 있어요. 다른 기기로 바꿀 때만 새 코드를 적어요.' : '예: ABCD-2345', 'type' => 'TEXT', 'required' => $linked === null, 'maxLength' => 12]];

            return ['configurationData' => ['page' => ['pageId' => '1', 'name' => '사이트와 연결', 'nextPageId' => '2', 'previousPageId' => null, 'complete' => false, 'sections' => [['name' => '연결 코드', 'settings' => $s]]]]];
        }
        if ($codeTarget === null && $linked === null) {
            return ['configurationData' => ['page' => ['pageId' => '2', 'name' => '코드를 확인해 주세요', 'nextPageId' => null, 'previousPageId' => '1', 'complete' => false,
                'sections' => [['name' => '연결 코드', 'settings' => [$para('bad', $codeTyped ? '⚠️ 코드가 맞지 않거나 시간이 지났어요' : '⚠️ 연결 코드를 적어 주세요', '뒤로 가서 사이트에서 새로 만든 코드를 적어 주세요.')]]]]]];
        }
        $dev = static function (string $slot) {
            $s = self::SLOTS[$slot];

            return ['id' => $slot, 'name' => $s[2], 'description' => $s[4] ? '여러 개 고를 수 있어요' : '하나만', 'type' => 'DEVICE', 'required' => false, 'multiple' => $s[4], 'capabilities' => [$s[0]], 'permissions' => ['r']];
        };
        $sections = [
            ['name' => '✅ '.($codeTarget ?? $linked).' 에 붙여요', 'settings' => [$para('ok', '고른 센서의 값이 바뀔 때마다 바로 사이트로 가요', '온도 · 습도 · 가동 상태는 사이트 기기의 값(그래프 · 습도 경고 · 가동 시간)이 되고, 나머지는 센서 값으로 보여요.')]],
            ['name' => '온습도 — 필라멘트 보관함 · 작업실', 'settings' => [$dev('temp'), $dev('hum')]],
            ['name' => '가동 상태 — 정비 수첩 「가동 시간」 · 내 프린터', 'settings' => [$dev('power_switch'), $dev('power_meter'),
                ['id' => 'power_on_w', 'name' => '이 전력(W)보다 크면 가동 중', 'description' => '프린터 · 건조기 대기 전력보다 조금 높게 (기본 10W)', 'type' => 'NUMBER', 'required' => false, 'defaultValue' => '10']]],
            ['name' => '그 밖의 센서 — 화면에 값만 보여요', 'settings' => array_map($dev, ['contact', 'motion', 'presence', 'water', 'battery', 'energy', 'switches', 'illuminance'])],
        ];

        return ['configurationData' => ['page' => ['pageId' => '2', 'name' => '센서 고르기', 'nextPageId' => null, 'previousPageId' => '1', 'complete' => true, 'sections' => $sections]]];
    }

    /* ───────── 1.1.0 로그인 연결 (API Access App · OAuth) ───────── */

    /** 일회용 state — 40글자 hex */
    public static function newState(): string
    {
        return bin2hex(random_bytes(20));
    }

    /** 회원을 보낼 SmartThings 로그인 · 허용 주소 */
    public static function authorizeUrl(string $clientId, string $redirectUri, string $state): string
    {
        return self::AUTHORIZE_URL.'?'.http_build_query(['client_id' => $clientId, 'response_type' => 'code', 'redirect_uri' => $redirectUri, 'scope' => implode(' ', self::SCOPES), 'state' => $state], '', '&', PHP_QUERY_RFC3986);
    }

    /**
     * 앱 등록 본문 (POST /v1/apps — SmartThings CLI 의 「OAuth-In App」과 같은 모양)
     *
     * @return array<string, mixed>
     */
    public static function appRequest(string $site, string $targetUrl, string $redirectUri, string $uuid): array
    {
        $site = trim($site) !== '' ? trim($site) : 'IoT Link';
        $slug = strtolower((string) preg_replace('/[^A-Za-z0-9]+/', '', $site));
        $name = mb_substr($site, 0, 60).' IoT 연결';

        return ['appName' => ($slug !== '' && preg_match('/^[a-z]/', $slug) ? substr($slug, 0, 40) : 'iotlink').'-'.$uuid, 'displayName' => $name, 'description' => mb_substr($site.' — 온습도 · 기기 상태를 사이트로 보내요 (읽기만)', 0, 250),
            'appType' => 'API_ONLY', 'classifications' => ['CONNECTED_SERVICE'], 'singleInstance' => true, 'iconImage' => new \stdClass(), 'apiOnly' => ['targetUrl' => $targetUrl], 'principalType' => 'LOCATION',
            'oauth' => ['clientName' => $name, 'scope' => self::SCOPES, 'redirectUris' => [$redirectUri]]];
    }

    /** GET /devices?includeStatus=true 의 기기 하나 → /devices/{id}/status 와 같은 모양 {components: {칸: {capability: {attribute: {value, unit}}}}} */
    public static function listStatus(array $item): array
    {
        $out = [];
        foreach (is_array($item['components'] ?? null) ? $item['components'] : [] as $c) {
            $comp = is_array($c) ? self::comp($c['id'] ?? 'main') : 'main';
            foreach (is_array($c) && is_array($c['capabilities'] ?? null) ? $c['capabilities'] : [] as $cap) {
                if (is_array($cap) && is_string($cap['id'] ?? null) && is_array($cap['status'] ?? null)) {
                    $out[$comp][$cap['id']] = $cap['status'];
                }
            }
        }

        return ['components' => $out];
    }

    /**
     * 고를 수 있는 기기 — 받을 수 있는 capability 가 하나라도 있는 것만. 온습도계가 먼저.
     *
     * @param  list<mixed>  $items  GET /devices 의 items
     * @return list<array{id: string, label: string, caps: array<string, string>, values: array<string, string>, kind: string}>  caps = capability => componentId
     */
    public static function candidates(array $items, ?string $scale = null): array
    {
        $out = [];
        foreach ($items as $it) {
            $id = is_array($it) ? self::id($it['deviceId'] ?? '') : '';
            if ($id === '') {
                continue;
            }
            $comps = array_values(array_filter(is_array($it['components'] ?? null) ? $it['components'] : [], 'is_array'));
            usort($comps, static fn ($a, $b) => (($b['id'] ?? '') === 'main') <=> (($a['id'] ?? '') === 'main'));   // main 먼저
            $caps = [];
            foreach ($comps as $c) {
                foreach (is_array($c['capabilities'] ?? null) ? $c['capabilities'] : [] as $cap) {
                    $cid = is_array($cap) ? ($cap['id'] ?? '') : '';
                    if (is_string($cid) && isset(self::CAP_SLOTS[$cid]) && ! isset($caps[$cid])) {
                        $caps[$cid] = self::comp($c['id'] ?? 'main');
                    }
                }
            }
            $status = self::listStatus($it);
            $label = Rules::text($it['label'] ?? '', 60) ?: (Rules::text($it['name'] ?? '', 60) ?: 'SmartThings 기기');
            // 1.3.0 🖨️ 프린터 기기(커뮤니티 Edge 드라이버) — 칸마다 뜻이 달라(노즐 온도 · 베드 온도 · AMS 습도 · 연결 스위치) 온습도계 · 플러그처럼 읽으면 안 됨
            $pt = self::printerTriples($id, $comps, $status);
            if ($pt !== []) {
                $values = [];
                foreach ($pt as $t) {
                    foreach (self::statusEvents($status, $id, $t[2], $t[3]) as $ev) {
                        $r = $ev['attribute'] === $t[4] ? self::event($ev, [$t], $scale) : null;
                        if ($r !== null) {
                            $values[$t[0]] = self::showRole($t[0], $r['sensor']['capability'], $r['sensor']['value'], $r['sensor']['unit']);
                        }
                    }
                }
                $out[] = ['id' => $id, 'label' => $label, 'caps' => [], 'values' => $values, 'kind' => 'printer', 'triples' => $pt];

                continue;
            }
            if ($caps === []) {
                continue;
            }
            $values = [];
            foreach (self::triples($id, $caps) as $t) {
                foreach (self::statusEvents($status, $id, $t[2], self::SLOTS[$t[0]][0]) as $ev) {
                    $r = self::event($ev, [$t], $scale);
                    if ($r !== null && $ev['attribute'] === self::SLOTS[$t[0]][1]) {
                        $values[$r['sensor']['capability']] = self::show($r['sensor']['capability'], $r['sensor']['value'], $r['sensor']['unit']);
                    }
                }
            }
            $kind = isset($caps['temperatureMeasurement']) || isset($caps['relativeHumidityMeasurement']) ? 'env' : (isset($caps['powerMeter']) || isset($caps['switch']) ? 'power' : 'other');
            $out[] = ['id' => $id, 'label' => $label, 'caps' => $caps, 'values' => $values, 'kind' => $kind, 'triples' => self::triples($id, $caps)];
        }
        usort($out, static fn ($a, $b) => [array_search($a['kind'], ['printer', 'env', 'power', 'other'], true), $a['label']] <=> [array_search($b['kind'], ['printer', 'env', 'power', 'other'], true), $b['label']]);

        return $out;
    }

    /**
     * 1.3.0 이 기기가 「프린터 기기」면 그 칸들 [역할, deviceId, componentId, capability, attribute] — 아니면 빈 목록.
     *  프린터로 보는 때: 노즐 + 베드 온도가 같이 있거나 · 출력 상태 + 노즐/베드 온도 · 이름에 print · klipper … 가 든 맞춤 진행률/상태 capability 가 있을 때
     *  (다른 기기의 맞춤 「…status」 · 「…progress」(세탁기 · 청소기)를 프린터로 잘못 보지 않게).
     *
     * @param  list<array<string, mixed>>  $comps  기기의 components (main 먼저)
     * @param  array<string, mixed>  $status  listStatus() 모양
     * @return list<array{0: string, 1: string, 2: string, 3: string, 4: string}>
     */
    public static function printerTriples(string $id, array $comps, array $status): array
    {
        $got = [];
        $custom = false;
        foreach ($comps as $c) {
            $comp = self::comp($c['id'] ?? 'main');
            $lc = strtolower($comp);
            foreach (is_array($c['capabilities'] ?? null) ? $c['capabilities'] : [] as $capRow) {
                $cap = is_array($capRow) && is_string($capRow['id'] ?? null) && preg_match('/^[A-Za-z0-9.]{1,60}$/', $capRow['id']) ? $capRow['id'] : '';
                if ($cap === '') {
                    continue;
                }
                $attrs = [];
                foreach (is_array($status['components'][$comp][$cap] ?? null) ? $status['components'][$comp][$cap] : [] as $a => $st) {
                    if (is_string($a) && preg_match('/^[A-Za-z0-9_]{1,60}$/', $a) && is_array($st) && (! array_key_exists('value', $st) || is_scalar($st['value']) || $st['value'] === null)) {
                        $attrs[] = $a;
                    }
                }
                $first = static function (string $re) use ($attrs): string {
                    foreach ($attrs as $a) {
                        if (preg_match($re, $a)) {
                            return $a;
                        }
                    }

                    return $attrs[0] ?? '';
                };
                $isCustom = str_contains($cap, '.');
                $last = strtolower($isCustom ? substr($cap, (int) strrpos($cap, '.') + 1) : $cap);
                $role = '';
                $attr = '';
                if ($isCustom) {
                    if (preg_match('/progress|percent|completion/', $last)) {
                        [$role, $attr] = ['p_progress', $first('/progress|percent|complet/i')];
                    } elseif (preg_match('/remain|time|eta/', $last)) {
                        $attr = $first('/remain|left/i');
                        $role = preg_match('/remain|left/i', $attr) ? 'p_remaining' : '';
                    } elseif (preg_match('/file|job|task|model/', $last)) {
                        [$role, $attr] = ['p_job', $first('/name|file|job/i')];
                    } elseif (preg_match('/fan/', $last)) {
                        [$role, $attr] = ['p_fan', $first('/speed|fan/i')];
                    } elseif (preg_match('/(status|state|stage)$/', $last)) {
                        [$role, $attr] = ['p_state', $first('/print|state|status/i')];
                    }
                } elseif ($cap === 'contactSensor' && preg_match('/print/', $lc)) {
                    [$role, $attr] = ['p_state', 'contact'];
                } elseif ($cap === 'temperatureMeasurement') {
                    $role = preg_match('/nozzle|hotend|hot_end|extruder|tool/', $lc) ? 'p_nozzle' : (preg_match('/bed|plate/', $lc) ? 'p_bed' : (preg_match('/chamber|enclosure|box/', $lc) ? 'p_chamber' : ''));
                    $attr = 'temperature';
                } elseif ($cap === 'relativeHumidityMeasurement') {
                    [$role, $attr] = ['p_hum', 'humidity'];
                } elseif ($cap === 'switch') {
                    $role = preg_match('/light|lamp|led/', $lc) ? 'p_light' : ($lc === 'main' ? 'p_online' : '');
                    $attr = 'switch';
                }
                if ($role !== '' && $attr !== '' && ! isset($got[$role])) {
                    $got[$role] = [$role, $id, $comp, $cap, $attr];
                    $custom = $custom || ($isCustom && in_array($role, ['p_progress', 'p_state'], true) && preg_match('/print|klipper|moonraker|octo/i', $cap) === 1);
                }
            }
        }
        $isPrinter = $custom || (isset($got['p_state']) && (isset($got['p_nozzle']) || isset($got['p_bed']))) || (isset($got['p_nozzle'], $got['p_bed']));

        return $isPrinter ? array_values($got) : [];
    }

    /** 1.3.0 저장해 둔 칸에서 이 값의 역할 (프린터 기기만 — 아니면 빈 글) @param list<array<int, string>> $devices */
    public static function roleOf(array $devices, string $dev, string $comp, string $cap, string $attr): string
    {
        foreach ($devices as $d) {
            if (isset($d[4]) && $d[1] === $dev && $d[2] === $comp && $d[3] === $cap && $d[4] === $attr) {
                return (string) $d[0];
            }
        }

        return '';
    }

    /** 1.3.0 프린터 기기의 값 글 — 출력 상태(열림 = 출력 중) · 연결(켜짐 = 연결됨) 은 그 뜻으로 */
    public static function showRole(string $role, string $cap, string $value, string $unit): string
    {
        $v = strtolower($value);
        if ($role === 'p_state') {
            return ['open' => '출력 중', 'closed' => '쉬는 중', 'printing' => '출력 중', 'paused' => '일시정지', 'standby' => '쉬는 중', 'idle' => '쉬는 중', 'complete' => '완료', 'cancelled' => '그만둠', 'error' => '오류'][$v] ?? $value;
        }
        if ($role === 'p_online') {
            return $v === 'on' ? '연결됨' : '꺼짐 · 끊김';
        }

        return self::show($cap, $value, $unit);
    }

    /**
     * 고른 기기 하나 → 저장할 칸 [칸, deviceId, componentId] (가진 capability 마다 하나)
     *
     * @param  array<string, string>  $caps  capability => componentId
     * @return list<array{0: string, 1: string, 2: string}>
     */
    public static function triples(string $deviceId, array $caps): array
    {
        $out = [];
        foreach ($caps as $cap => $comp) {
            if (isset(self::CAP_SLOTS[$cap])) {
                $out[] = [$cap === 'switch' && isset($caps['powerMeter']) ? 'switches' : self::CAP_SLOTS[$cap], $deviceId, self::comp($comp)];
            }
        }

        return $out;
    }

    /** 로그인 연결의 구독 — 기기 하나에 하나 (그 기기의 모든 값 · 바뀔 때만). 이름은 기기마다 늘 같음 (다시 만들지 않으려고) */
    public static function deviceSubscription(string $deviceId): array
    {
        return ['sourceType' => 'DEVICE', 'device' => ['deviceId' => $deviceId, 'componentId' => '*', 'capability' => '*', 'attribute' => '*', 'value' => '*', 'stateChangeOnly' => true, 'subscriptionName' => 'd_'.substr(sha1($deviceId), 0, 24)]];
    }

    /** SmartThings 의 오류 답에서 사람이 읽을 글만 (비밀이 들어갈 일은 없지만 길이 · 태그를 정리) */
    public static function errorText(mixed $json): string
    {
        if (! is_array($json)) {
            return '';
        }
        $e = is_array($json['error'] ?? null) ? $json['error'] : $json;
        $parts = [is_scalar($e['message'] ?? null) ? (string) $e['message'] : (is_scalar($json['error_description'] ?? null) ? (string) $json['error_description'] : (is_scalar($json['error'] ?? null) ? (string) $json['error'] : ''))];
        foreach (is_array($e['details'] ?? null) ? array_slice($e['details'], 0, 3) : [] as $d) {
            if (is_array($d) && is_scalar($d['message'] ?? null)) {
                $parts[] = (string) $d['message'];
            }
        }

        return Rules::text(implode(' · ', array_filter($parts, static fn ($x) => $x !== '')), 200);
    }

    /** CONFIRMATION 의 주소가 SmartThings 의 것인가 (https · *.smartthings.com) */
    public static function confirmUrlOk(mixed $url): bool
    {
        if (! is_string($url) || strlen($url) > 2000) {
            return false;
        }
        $p = parse_url($url);
        $host = strtolower((string) ($p['host'] ?? ''));

        return ($p['scheme'] ?? '') === 'https' && ! isset($p['user']) && ! isset($p['port']) && ($host === 'smartthings.com' || str_ends_with($host, '.smartthings.com'));
    }
}
