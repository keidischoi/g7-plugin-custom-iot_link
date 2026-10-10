<?php

namespace Plugins\Custom\HaLink\Support;

/**
 * 0.2.0 SmartThings (WebHook SmartApp) — 고르는 칸 · 받은 값 바꾸기 · 설정 화면 JSON (DB · Laravel 없이 검사: tests/run.php)
 *
 *  SmartThings 는 그냥 또 하나의 「보내는 곳」 — 받은 DEVICE_EVENT 를 {temperature, humidity, state} 로 바꿔 HaService::ingest 로 넘김.
 *  온습도 · 가동 상태가 아닌 값(문 열림 · 움직임 · 배터리 …)은 센서 값으로만 남겨 화면에 보임.
 */
final class SmartThings
{
    public const API = 'https://api.smartthings.com/v1';

    /** 토큰 새로 받기 — SDK(core-sdk)가 쓰는 곳을 먼저, 안 되면 예전 문서의 곳 */
    public const TOKEN_URLS = ['https://api.smartthings.com/oauth/token', 'https://auth-global.api.smartthings.com/oauth/token'];

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

    /** 화면에 보일 이름 (capability.attribute → 한국어 · 값 바꾸기) */
    public const LABELS = [
        'temperatureMeasurement' => '온도', 'relativeHumidityMeasurement' => '습도', 'switch' => '스위치', 'powerMeter' => '전력', 'energyMeter' => '전력량',
        'contactSensor' => '열림', 'motionSensor' => '움직임', 'presenceSensor' => '재실', 'waterSensor' => '누수', 'battery' => '배터리', 'illuminanceMeasurement' => '밝기',
    ];

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
        foreach ($devices as [$slot, $id, $c]) {
            if ($id === $dev && $c === $comp && (self::SLOTS[$slot][0] ?? '') === $cap) {
                $roles[] = self::SLOTS[$slot][3];
            }
        }
        if ($roles === []) {
            return null;
        }
        $raw = $ev['value'] ?? null;
        if (is_bool($raw)) {
            $raw = $raw ? 'true' : 'false';
        }
        if (! is_scalar($raw)) {
            return null;   // 묶음 값(JSON)은 아직 안 받음
        }
        $unit = $ev['unit'] ?? (is_array($ev['data'] ?? null) ? ($ev['data']['unit'] ?? null) : null);
        $unit = is_string($unit) && $unit !== '' ? mb_substr($unit, 0, 12) : (string) ($knownUnit ?? '');
        $num = is_numeric($raw) ? (float) $raw : null;
        $value = mb_substr(trim(strip_tags((string) $raw)), 0, 60);
        $payload = [];
        if ($cap === 'temperatureMeasurement' && $num !== null) {
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
        return ['configurationData' => ['initialize' => ['id' => 'ha_link', 'name' => mb_substr($site.' 연결', 0, 40), 'description' => '센서 값을 사이트의 HA 연결로 보내요', 'permissions' => self::SCOPES, 'firstPageId' => '1']]];
    }

    /**
     * @param  string|null  $linked  이미 이어진 사이트 기기 이름 (고치기) — null 이면 처음
     * @return array<string, mixed>
     */
    public static function page(string $pageId, string $site, ?string $linked, ?string $codeTarget, bool $codeTyped): array
    {
        $para = static fn (string $id, string $name, string $desc) => ['id' => $id, 'name' => $name, 'description' => $desc, 'type' => 'PARAGRAPH', 'required' => false];
        if ($pageId !== '2') {
            $s = [$para('intro', $site.' 의 「HA 연결」과 이어요', '사이트 → HA 연결 → SmartThings 카드에서 「연결 코드 만들기」를 누르고 나온 8글자를 적어 주세요. 코드는 한 번만 · 30분 안에 쓸 수 있어요.'),
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
