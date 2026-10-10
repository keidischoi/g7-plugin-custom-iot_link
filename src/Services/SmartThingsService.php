<?php

namespace Plugins\Custom\HaLink\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Plugins\Custom\HaLink\Support\Rules;
use Plugins\Custom\HaLink\Support\Schema;
use Plugins\Custom\HaLink\Support\Settings;
use Plugins\Custom\HaLink\Support\SmartThings;
use Plugins\Custom\HaLink\Support\StSignature;

/**
 * 0.2.0 SmartThings (WebHook SmartApp) — 회원의 SmartThings 센서 값을 받아 HA 연결의 같은 받기(HaService::ingest)로 넘김.
 *
 *  POST /api/plugins/custom-ha_link/smartthings (로그인 없음) — 모든 요청의 HTTP 서명을 확인 (StSignature)
 *   PING(예전) · CONFIRMATION(주소 확인 — confirmationUrl 을 받아 봄) · CONFIGURATION(INITIALIZE · PAGE — 연결 코드 → 센서 고르기)
 *   INSTALL · UPDATE(토큰 · installedAppId · locationId 저장, 구독 만들기) · EVENT(DEVICE_EVENT → 받기) · UNINSTALL(정리)
 *  회원과 잇기: 회원이 /ha-link 에서 만든 일회용 코드(8글자)를 SmartThings 앱의 설정 화면에 적음 → INSTALL 때 그 회원 · 기기와 이음.
 *  토큰은 Laravel Crypt 로 암호화해 둠 · 로그에 토큰 · 서명 · 코드를 남기지 않음.
 */
class SmartThingsService
{
    /** 검사용 — (method, url, headers, body) => [status, body] */
    public static $http = null;

    /** 검사용 — 「응답 뒤에 할 일」을 바로 함 */
    public static bool $inline = false;

    /** @var array<string, list<string>> */
    private static array $keyMemo = [];

    private HaService $ha;

    public function __construct(?HaService $ha = null)
    {
        $this->ha = $ha ?? new HaService();
    }

    public static function targetUrl(): string
    {
        return rtrim((string) config('app.url'), '/').'/api/plugins/custom-ha_link/smartthings';
    }

    public static function ready(): bool
    {
        return (bool) Settings::get('enabled') && (bool) Settings::get('st_enabled');
    }

    private static function now(): string
    {
        return HaService::now();
    }

    private static function at(int $sec): string
    {
        return date('Y-m-d H:i:s', strtotime(self::now()) + $sec);
    }

    /* ───────── 받는 곳 (SmartThings → 사이트) ───────── */

    /**
     * 요청 하나 — [HTTP 상태, 답 JSON]
     *
     * @param  list<string>  $targets  (request-target) 후보 — 경로 · 경로+쿼리
     * @param  array<string, string>  $headers  소문자 이름 => 값 (authorization · digest · date)
     * @return array{0: int, 1: array<string, mixed>}
     */
    public function handle(string $method, array $targets, array $headers, string $body): array
    {
        if (! self::ready() || ! Schema::ensure()) {
            return [404, ['error' => 'off']];
        }
        if (strlen($body) > 262144) {
            return [413, ['error' => 'too large']];
        }
        $json = json_decode($body, true);
        $life = is_array($json) ? strtoupper((string) ($json['lifecycle'] ?? ($json['messageType'] ?? ''))) : '';
        // (예전) PING 은 SmartThings 가 서명하지 않던 것 — 관리자가 켰을 때만, challenge 만 돌려줌 (아무것도 바꾸지 않음)
        if ($life === 'PING' && Settings::get('st_ping_unsigned') && ! isset($headers['authorization']) && is_scalar($json['pingData']['challenge'] ?? null)) {
            return [200, ['pingData' => ['challenge' => (string) $json['pingData']['challenge']]]];
        }
        $why = StSignature::verify($method, $targets, $headers, $body, fn (string $k) => $this->keys($k));
        if ($why !== null) {
            $this->log('서명이 맞지 않아 거부', ['why' => $why, 'lifecycle' => preg_replace('/[^A-Z_]/', '', $life)]);

            return [401, ['error' => 'unauthorized']];
        }
        if (! is_array($json) || $life === '') {
            return [400, ['error' => 'bad request']];
        }
        $app = (string) Settings::get('st_app_id');
        $got = $json['appId'] ?? ($json['confirmationData']['appId'] ?? null);
        if ($app !== '' && is_string($got) && $got !== '' && ! hash_equals($app, $got)) {
            return [403, ['error' => 'app']];
        }
        $empty = new \stdClass();
        switch ($life) {
            case 'PING':
                return [200, ['pingData' => ['challenge' => is_scalar($json['pingData']['challenge'] ?? null) ? (string) $json['pingData']['challenge'] : '']]];
            case 'CONFIRMATION':
                return $this->confirm(is_array($json['confirmationData'] ?? null) ? $json['confirmationData'] : []);
            case 'CONFIGURATION':
                return [200, $this->configuration(is_array($json['configurationData'] ?? null) ? $json['configurationData'] : [])];
            case 'INSTALL':
            case 'UPDATE':
                $this->install(is_array($json[$life === 'INSTALL' ? 'installData' : 'updateData'] ?? null) ? $json[$life === 'INSTALL' ? 'installData' : 'updateData'] : [], is_string($got) ? $got : '');

                return [200, [$life === 'INSTALL' ? 'installData' : 'updateData' => $empty]];
            case 'EVENT':
                $this->event(is_array($json['eventData'] ?? null) ? $json['eventData'] : []);

                return [200, ['eventData' => $empty]];
            case 'UNINSTALL':
                $this->uninstall(SmartThings::id($json['uninstallData']['installedApp']['installedAppId'] ?? ''));

                return [200, ['uninstallData' => $empty]];
            case 'OAUTH_CALLBACK':
                return [200, ['oAuthCallbackData' => $empty]];
            case 'EXECUTE':
                return [200, ['executeData' => $empty]];
        }

        return [200, []];
    }

    /** CONFIRMATION — Developer Workspace 에 적은 주소가 맞는지 SmartThings 가 물어봄 → confirmationUrl 을 GET */
    private function confirm(array $c): array
    {
        $url = $c['confirmationUrl'] ?? null;
        if (! SmartThings::confirmUrlOk($url)) {
            return [400, ['error' => 'confirmationUrl']];
        }
        [$st] = $this->http('GET', (string) $url, ['Accept: application/json'], null);
        $this->state(['confirmed_at' => $st >= 200 && $st < 300 ? self::now() : null, 'confirm_status' => $st, 'app_id' => SmartThings::id($c['appId'] ?? '')]);
        $this->log('CONFIRMATION', ['status' => $st]);

        return [200, ['targetUrl' => self::targetUrl()]];
    }

    /** SmartThings 앱의 설정 화면 */
    private function configuration(array $c): array
    {
        $site = Rules::text(config('app.name') ?: '사이트', 30) ?: '사이트';
        if (strtoupper((string) ($c['phase'] ?? '')) === 'INITIALIZE') {
            return SmartThings::initialize($site);
        }
        $config = is_array($c['config'] ?? null) ? $c['config'] : [];
        $typed = SmartThings::configString($config, 'link_code');
        $code = SmartThings::normCode($typed);

        return SmartThings::page((string) ($c['pageId'] ?? '1'), $site, $this->linkedName(SmartThings::id($c['installedAppId'] ?? '')), $code !== '' ? $this->codeTarget($code) : null, $typed !== '');
    }

    /** 이미 이어진 설치면 그 기기 이름 */
    private function linkedName(string $iid): ?string
    {
        if ($iid === '') {
            return null;
        }
        $i = DB::table(Schema::ST_INSTALLS)->where('installed_app_id', $iid)->first();
        if ($i === null || ! $i->user_id) {
            return null;
        }
        $name = $i->device_id ? DB::table(Schema::DEVICES)->where('id', $i->device_id)->where('user_id', $i->user_id)->value('name') : null;

        return $name !== null ? (string) $name : 'HA 연결';
    }

    /** 코드가 맞으면 붙일 곳 이름 (쓰지는 않음 — INSTALL 때 씀) */
    private function codeTarget(string $code): ?string
    {
        $c = DB::table(Schema::ST_CODES)->where('code', $code)->whereNull('used_at')->where('expires_at', '>', self::now())->first();
        if ($c === null) {
            return null;
        }
        $name = $c->device_id ? DB::table(Schema::DEVICES)->where('id', $c->device_id)->where('user_id', $c->user_id)->value('name') : null;

        return $name !== null ? '「'.$name.'」' : '새 기기 「SmartThings」';
    }

    /** INSTALL · UPDATE — 토큰 · 설정 저장, 코드로 회원과 잇기, 응답 뒤에 구독 만들기 */
    private function install(array $data, string $appId): void
    {
        $ia = is_array($data['installedApp'] ?? null) ? $data['installedApp'] : [];
        $iid = SmartThings::id($ia['installedAppId'] ?? '');
        if ($iid === '') {
            return;
        }
        $config = is_array($ia['config'] ?? null) ? $ia['config'] : [];
        $row = DB::table(Schema::ST_INSTALLS)->where('installed_app_id', $iid)->first();
        $set = ['location_id' => SmartThings::id($ia['locationId'] ?? '') ?: ($row->location_id ?? null), 'app_id' => SmartThings::id($appId) ?: ($row->app_id ?? null),
            'config' => json_encode(SmartThings::cleanConfig($config)), 'status' => 'syncing', 'last_error' => null, 'updated_at' => self::now()];
        if (is_string($data['authToken'] ?? null) && $data['authToken'] !== '') {
            $set['auth_token'] = self::enc($data['authToken']);
            $set['token_expires_at'] = self::at(86400 - 600);   // INSTALL · UPDATE 의 토큰은 24시간
        }
        if (is_string($data['refreshToken'] ?? null) && $data['refreshToken'] !== '') {
            $set['refresh_token'] = self::enc($data['refreshToken']);
        }
        $code = SmartThings::normCode(SmartThings::configString($config, 'link_code'));
        if ($code !== '') {
            $link = $this->consumeCode($code);
            if ($link !== null) {
                [$set['user_id'], $set['device_id']] = $link;
                if ($set['device_id'] === null) {
                    $set['last_error'] = '기기 수 한도라 새 기기를 못 만들었어요 — 사이트에서 붙일 기기를 골라 주세요.';
                }
            } elseif (! ($row->user_id ?? null)) {
                $set['last_error'] = '연결 코드가 맞지 않거나 시간이 지났어요.';
            }
        }
        if ($row) {
            DB::table(Schema::ST_INSTALLS)->where('id', $row->id)->update($set);
            $id = (int) $row->id;
        } else {
            $id = (int) DB::table(Schema::ST_INSTALLS)->insertGetId($set + ['installed_app_id' => $iid, 'created_at' => self::now()]);
        }
        if (! ($set['user_id'] ?? ($row->user_id ?? null))) {
            DB::table(Schema::ST_INSTALLS)->where('id', $id)->update(['status' => 'unlinked']);
        }
        $this->later(fn () => $this->sync($id));
    }

    /** 일회용 코드 쓰기 → [회원, 기기 id|null] (한 번만 — 동시에 두 번 와도 하나만 성공) */
    private function consumeCode(string $code): ?array
    {
        $c = DB::table(Schema::ST_CODES)->where('code', $code)->whereNull('used_at')->where('expires_at', '>', self::now())->first();
        if ($c === null || ! DB::table(Schema::ST_CODES)->where('id', $c->id)->whereNull('used_at')->update(['used_at' => self::now()])) {
            return null;
        }
        $uid = (int) $c->user_id;
        $dev = $c->device_id ? DB::table(Schema::DEVICES)->where('id', $c->device_id)->where('user_id', $uid)->value('id') : null;
        if ($dev === null) {
            $dev = $this->newDevice($uid);
        }

        return [$uid, $dev !== null ? (int) $dev : null];
    }

    /** SmartThings 용 새 기기 (기기 수 한도 안에서) */
    private function newDevice(int $uid): ?int
    {
        if (DB::table(Schema::DEVICES)->where('user_id', $uid)->count() >= (int) Settings::get('max_devices')) {
            return null;
        }

        return (int) DB::table(Schema::DEVICES)->insertGetId(['user_id' => $uid, 'token' => Rules::token(), 'name' => 'SmartThings', 'target' => 'other', 'source' => 'smartthings',
            'entities' => json_encode(array_fill_keys(Rules::ENTITIES, '')), 'notify' => true, 'created_at' => now(), 'updated_at' => now()]);
    }

    /**
     * 구독 다시 만들기 + 위치 온도 단위 · 기기 이름 · 지금 값 (응답 뒤에)
     *  POST https://api.smartthings.com/v1/installedapps/{id}/subscriptions
     */
    public function sync(int $id): void
    {
        $i = DB::table(Schema::ST_INSTALLS)->where('id', $id)->first();
        if ($i === null) {
            return;
        }
        $tok = $this->token($i);
        if ($tok === null) {
            DB::table(Schema::ST_INSTALLS)->where('id', $id)->update(['status' => $i->user_id ? 'error' : 'unlinked', 'last_error' => 'SmartThings 토큰이 없어요 — 앱에서 설정을 한 번 더 저장해 주세요.']);

            return;
        }
        $iid = (string) $i->installed_app_id;
        $cfg = self::config($i);
        $set = [];
        if ($i->location_id) {
            [$st, $loc] = $this->api($tok, 'GET', '/locations/'.$i->location_id);
            if ($st === 200) {
                $set['temp_scale'] = in_array($loc['temperatureScale'] ?? '', ['C', 'F'], true) ? $loc['temperatureScale'] : null;
                $set['location_name'] = Rules::text($loc['name'] ?? '', 80) ?: null;
                $i->temp_scale = $set['temp_scale'];
            }
        }
        $this->api($tok, 'DELETE', '/installedapps/'.$iid.'/subscriptions');
        $bad = 0;
        foreach ($cfg['devices'] as $n => [$slot, $dev, $comp]) {
            $body = SmartThings::subscription($slot, $dev, $comp, $n);
            [$st] = $body ? $this->api($tok, 'POST', '/installedapps/'.$iid.'/subscriptions', $body) : [0];
            if ($st < 200 || $st >= 300) {
                $bad++;
            }
        }
        // 기기 이름 · 지금 값 — 화면에 바로 보이게
        $labels = [];
        $status = [];
        $events = [];
        foreach ($cfg['devices'] as [$slot, $dev, $comp]) {
            if (! isset($labels[$dev])) {
                [$st, $d] = $this->api($tok, 'GET', '/devices/'.$dev);
                $labels[$dev] = $st === 200 ? Rules::text($d['label'] ?? ($d['name'] ?? ''), 80) : '';
                [$st, $x] = $this->api($tok, 'GET', '/devices/'.$dev.'/status');
                $status[$dev] = $st === 200 ? $x : [];
            }
            array_push($events, ...SmartThings::statusEvents($status[$dev], $dev, $comp, SmartThings::SLOTS[$slot][0]));
        }
        DB::table(Schema::ST_SENSORS)->where('install_id', $id)->whereNotIn('st_device_id', array_column($cfg['devices'], 1) ?: ['-'])->delete();   // 뺀 기기의 값은 지움
        if ($i->user_id) {
            $set += $bad ? ['status' => 'error', 'last_error' => '구독 '.$bad.'개를 만들지 못했어요 — 앱에서 설정을 다시 저장해 주세요.'] : ['status' => 'active'];
        }
        DB::table(Schema::ST_INSTALLS)->where('id', $id)->update($set + ['updated_at' => self::now()]);
        $this->absorb(DB::table(Schema::ST_INSTALLS)->where('id', $id)->first(), $events, $labels);
    }

    /** EVENT — DEVICE_EVENT 는 받기로 · 설치 지우기(INSTALLED_APP_LIFECYCLE_EVENT DELETE)는 정리 */
    private function event(array $ed): void
    {
        $iid = SmartThings::id($ed['installedApp']['installedAppId'] ?? '');
        if ($iid === '') {
            return;
        }
        $evs = [];
        foreach (is_array($ed['events'] ?? null) ? array_slice($ed['events'], 0, 100) : [] as $e) {
            if (! is_array($e)) {
                continue;
            }
            $type = (string) ($e['eventType'] ?? '');
            if ($type === 'INSTALLED_APP_LIFECYCLE_EVENT' && strtoupper((string) ($e['installedAppLifecycleEvent']['lifecycle'] ?? '')) === 'DELETE'
                && ($e['installedAppLifecycleEvent']['installedAppId'] ?? $iid) === $iid) {
                $this->uninstall($iid);

                return;
            }
            if ($type === 'DEVICE_EVENT' && is_array($e['deviceEvent'] ?? null)) {
                $evs[] = $e['deviceEvent'];
            }
        }
        $i = DB::table(Schema::ST_INSTALLS)->where('installed_app_id', $iid)->first();
        if ($i === null || $evs === []) {
            return;
        }
        if (! $this->allow('hal-st:'.$i->id, (int) Settings::get('st_max_events_min'))) {
            return;   // 너무 잦음 — 버림 (답은 200: SmartThings 가 구독을 끄지 않게)
        }
        $this->absorb($i, $evs);
        if ($i->token_checked_at === null || (string) $i->token_checked_at < self::at(-6 * 3600)) {
            $this->later(fn () => $this->keepFresh((int) $i->id));
        }
    }

    /**
     * 값 반영 — 센서 값 한 줄씩 + 온습도 · 상태는 사이트 기기로 (HaService::ingest — HA 와 같은 길)
     *
     * @param  list<array<string, mixed>>  $events  deviceEvent 모양
     * @param  array<string, string>  $labels  deviceId => 이름
     */
    private function absorb(?object $i, array $events, array $labels = []): void
    {
        if ($i === null || $events === []) {
            return;
        }
        $cfg = self::config($i);
        $now = self::now();
        $payload = [];
        $n = 0;
        foreach ($events as $ev) {
            $r = SmartThings::event($ev, $cfg['devices'], $i->temp_scale ?? null, (float) $cfg['power_on_w']);
            if ($r === null) {
                continue;   // 고르지 않은 기기
            }
            $s = $r['sensor'];
            $key = ['install_id' => $i->id, 'st_device_id' => $s['device'], 'component_id' => $s['component'], 'capability' => $s['capability'], 'attribute' => $s['attribute']];
            $vals = ['value' => $s['value'], 'unit' => $s['unit'] ?: null, 'num' => $s['num'], 'updated_at' => $now];
            if (($labels[$s['device']] ?? '') !== '') {
                $vals['label'] = $labels[$s['device']];
            }
            DB::table(Schema::ST_SENSORS)->updateOrInsert($key, $vals);
            $payload = array_merge($payload, $r['payload']);
            $n++;
        }
        if ($n === 0) {
            return;
        }
        DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->update(['last_event_at' => $now]);
        if ($i->user_id && $i->device_id) {
            $tok = DB::table(Schema::DEVICES)->where('id', $i->device_id)->where('user_id', $i->user_id)->value('token');
            if ($tok) {
                $this->ha->ingest((string) $tok, $payload);
            }
        }
    }

    /** UNINSTALL — 토큰 · 센서 값 지움 (사이트 기기와 그 기록은 남김) */
    private function uninstall(string $iid): void
    {
        $id = $iid !== '' ? DB::table(Schema::ST_INSTALLS)->where('installed_app_id', $iid)->value('id') : null;
        if ($id) {
            DB::table(Schema::ST_SENSORS)->where('install_id', $id)->delete();
            DB::table(Schema::ST_INSTALLS)->where('id', $id)->delete();
            $this->log('UNINSTALL', ['install' => (int) $id]);
        }
    }

    /* ───────── 토큰 ───────── */

    /** @return array{devices: list<array{0: string, 1: string, 2: string}>, power_on_w: float} */
    private static function config(object $i): array
    {
        $c = json_decode((string) ($i->config ?? ''), true);

        return ['devices' => array_values(array_filter(is_array($c['devices'] ?? null) ? $c['devices'] : [], static fn ($d) => is_array($d) && count($d) === 3 && isset(SmartThings::SLOTS[$d[0]]))),
            'power_on_w' => is_numeric($c['power_on_w'] ?? null) ? (float) $c['power_on_w'] : 10.0];
    }

    private static function enc(string $v): string
    {
        return Crypt::encryptString($v);
    }

    private static function dec(?string $v): ?string
    {
        if ($v === null || $v === '') {
            return null;
        }
        try {
            return Crypt::decryptString($v);
        } catch (\Throwable) {
            return null;
        }
    }

    /** 쓸 수 있는 토큰 — 10분 안에 끝나면 새로 받음 */
    public function token(object $i): ?string
    {
        $auth = self::dec($i->auth_token ?? null);
        if ($auth !== null && $i->token_expires_at && (string) $i->token_expires_at > self::at(600)) {
            return $auth;
        }

        return $this->refresh($i);
    }

    /**
     * refresh_token 으로 새 토큰 (둘 다 바뀜 — 같이 저장). 한 설치에 하나만 (refreshing_at 으로 잠금)
     *  POST https://api.smartthings.com/oauth/token · Basic base64(clientId:clientSecret) · grant_type=refresh_token&client_id=…&refresh_token=…
     */
    public function refresh(object $i): ?string
    {
        $rt = self::dec($i->refresh_token ?? null);
        $cid = (string) Settings::get('st_client_id');
        $sec = self::clientSecret();
        if ($rt === null || $cid === '' || $sec === '') {
            return null;
        }
        $got = DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->where(fn ($w) => $w->whereNull('refreshing_at')->orWhere('refreshing_at', '<', self::at(-60)))->update(['refreshing_at' => self::now()]);
        if (! $got) {
            return null;   // 다른 요청이 받는 중
        }
        $body = http_build_query(['grant_type' => 'refresh_token', 'client_id' => $cid, 'refresh_token' => $rt]);
        $hdr = ['Authorization: Basic '.base64_encode($cid.':'.$sec), 'Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'];
        $st = 0;
        foreach (SmartThings::TOKEN_URLS as $url) {
            [$st, $res] = $this->http('POST', $url, $hdr, $body);
            $j = json_decode((string) $res, true);
            if ($st === 200 && is_array($j) && is_string($j['access_token'] ?? null) && $j['access_token'] !== '') {
                DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->update(['auth_token' => self::enc($j['access_token']),
                    'refresh_token' => is_string($j['refresh_token'] ?? null) && $j['refresh_token'] !== '' ? self::enc($j['refresh_token']) : $i->refresh_token,
                    'token_expires_at' => self::at(max(600, (int) ($j['expires_in'] ?? 86400)) - 300), 'refreshing_at' => null, 'token_checked_at' => self::now()]);

                return $j['access_token'];
            }
            if ($st === 400 || $st === 401) {
                break;   // 토큰이 안 맞음 — 다른 곳에 물어도 같음
            }
        }
        DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->update(['refreshing_at' => null, 'token_checked_at' => self::now(), 'last_error' => 'SmartThings 토큰을 새로 받지 못했어요 (HTTP '.$st.') — 앱에서 설정을 한 번 더 저장해 주세요.']);
        $this->log('토큰 새로 받기 실패', ['install' => (int) $i->id, 'status' => $st]);

        return null;
    }

    /** 가끔(6시간에 한 번) 토큰이 곧 끝나면 미리 새로 받음 — refresh_token(30일)이 계속 살아 있게 */
    public function keepFresh(int $id): void
    {
        $i = DB::table(Schema::ST_INSTALLS)->where('id', $id)->first();
        if ($i === null) {
            return;
        }
        if (! $i->token_expires_at || (string) $i->token_expires_at < self::at(3 * 3600)) {
            $this->refresh($i);
        } else {
            DB::table(Schema::ST_INSTALLS)->where('id', $id)->update(['token_checked_at' => self::now()]);
        }
    }

    public static function clientSecret(): string
    {
        $s = (string) Settings::get('st_client_secret');

        return str_starts_with($s, 'enc:') ? (string) self::dec(substr($s, 4)) : '';
    }

    /* ───────── 회원 화면 ───────── */

    /** @return array<string, mixed> */
    public function forUser(int $uid): array
    {
        $out = ['ready' => self::ready() && Settings::get('st_client_id') !== '', 'code' => null, 'code_min' => (int) Settings::get('st_code_min'), 'installs' => []];
        if ($uid <= 0 || ! Schema::ensure()) {
            return $out;
        }
        $c = DB::table(Schema::ST_CODES)->where('user_id', $uid)->whereNull('used_at')->where('expires_at', '>', self::now())->orderByDesc('id')->first();
        if ($c) {
            $out['code'] = ['code' => SmartThings::showCode((string) $c->code), 'expires_at' => (string) $c->expires_at, 'device_id' => $c->device_id ? (int) $c->device_id : null];
        }
        $names = DB::table(Schema::DEVICES)->where('user_id', $uid)->pluck('name', 'id');
        $due = false;
        foreach (DB::table(Schema::ST_INSTALLS)->where('user_id', $uid)->orderBy('id')->get() as $i) {
            $out['installs'][] = ['id' => (int) $i->id, 'location' => (string) ($i->location_name ?? ''), 'device_id' => $i->device_id && isset($names[$i->device_id]) ? (int) $i->device_id : null,
                'device_name' => $i->device_id ? (string) ($names[$i->device_id] ?? '') : '', 'status' => (string) $i->status, 'last_error' => (string) ($i->last_error ?? ''),
                'last_event_at' => $i->last_event_at ? (string) $i->last_event_at : null, 'sensors' => $this->sensors((int) $i->id)];
            $due = $due || $i->token_checked_at === null || (string) $i->token_checked_at < self::at(-6 * 3600);
        }
        if ($due) {
            $ids = array_column($out['installs'], 'id');
            $this->later(function () use ($ids) {
                foreach ($ids as $id) {
                    $this->keepFresh($id);
                }
            });
        }

        return $out;
    }

    /** @return list<array<string, mixed>> */
    public function sensors(int $installId): array
    {
        $out = [];
        foreach (DB::table(Schema::ST_SENSORS)->where('install_id', $installId)->orderBy('label')->orderBy('capability')->limit(60)->get() as $s) {
            $out[] = ['label' => (string) ($s->label ?: 'SmartThings 기기'), 'capability' => (string) $s->capability, 'what' => SmartThings::LABELS[$s->capability] ?? (string) $s->attribute,
                'attribute' => (string) $s->attribute, 'value' => SmartThings::show((string) $s->capability, (string) $s->value, (string) ($s->unit ?? '')), 'at' => $s->updated_at ? (string) $s->updated_at : null];
        }

        return $out;
    }

    /** 일회용 연결 코드 만들기 (예전 것은 지움) @return array{0: bool, 1: string} */
    public function createCode(int $uid, ?int $deviceId): array
    {
        if (! self::ready() || ! Schema::ensure()) {
            return [false, 'SmartThings 연결이 꺼져 있어요.'];
        }
        if ($deviceId && ! DB::table(Schema::DEVICES)->where('id', $deviceId)->where('user_id', $uid)->exists()) {
            return [false, '기기를 찾을 수 없어요.'];
        }
        DB::table(Schema::ST_CODES)->where('user_id', $uid)->whereNull('used_at')->delete();
        DB::table(Schema::ST_CODES)->where('expires_at', '<', self::at(-86400))->delete();
        for ($n = 0; $n < 5; $n++) {
            $code = SmartThings::newCode();
            if (! DB::table(Schema::ST_CODES)->where('code', $code)->exists()) {
                DB::table(Schema::ST_CODES)->insert(['user_id' => $uid, 'code' => $code, 'device_id' => $deviceId ?: null, 'expires_at' => self::at((int) Settings::get('st_code_min') * 60), 'created_at' => self::now()]);

                return [true, '연결 코드를 만들었어요 — SmartThings 앱의 설정 화면에 적어 주세요.'];
            }
        }

        return [false, '잠시 뒤 다시 해 주세요.'];
    }

    /** 이을 사이트 기기 바꾸기 (내 설치 · 내 기기만) @return array{0: bool, 1: string} */
    public function relink(int $uid, int $id, int $deviceId): array
    {
        $i = Schema::ensure() ? DB::table(Schema::ST_INSTALLS)->where('id', $id)->where('user_id', $uid)->first() : null;
        if ($i === null) {
            return [false, '연결을 찾을 수 없어요.'];
        }
        if (! DB::table(Schema::DEVICES)->where('id', $deviceId)->where('user_id', $uid)->exists()) {
            return [false, '기기를 찾을 수 없어요.'];
        }
        DB::table(Schema::ST_INSTALLS)->where('id', $id)->update(['device_id' => $deviceId, 'last_error' => null, 'status' => $i->status === 'unlinked' ? 'active' : $i->status, 'updated_at' => self::now()]);

        return [true, '이을 기기를 바꿨어요.'];
    }

    /** 연결 끊기 — SmartThings 에서 앱 지우기를 시도하고(안 되면 앱에서 지우라고 알림) 여기 토큰 · 센서 값 지움 @return array{0: bool, 1: string} */
    public function disconnect(int $uid, int $id): array
    {
        $i = Schema::ensure() ? DB::table(Schema::ST_INSTALLS)->where('id', $id)->where('user_id', $uid)->first() : null;
        if ($i === null) {
            return [false, '연결을 찾을 수 없어요.'];
        }
        $tok = $this->token($i);
        $st = $tok !== null ? $this->api($tok, 'DELETE', '/installedapps/'.$i->installed_app_id)[0] : 0;
        $this->uninstall((string) $i->installed_app_id);

        return [true, $st >= 200 && $st < 300 ? 'SmartThings 연결을 끊었어요.' : '사이트에서는 끊었어요 — SmartThings 앱의 자동화 › SmartApps 에서도 지워 주세요.'];
    }

    public function removeUser(int $uid): void
    {
        foreach (DB::table(Schema::ST_INSTALLS)->where('user_id', $uid)->pluck('installed_app_id') as $iid) {
            $this->uninstall((string) $iid);
        }
        DB::table(Schema::ST_CODES)->where('user_id', $uid)->delete();
    }

    /** @return array<string, mixed> 관리자 화면 */
    public function adminInfo(): array
    {
        $st = [];
        try {
            $st = json_decode((string) DB::table(Schema::SETTINGS)->where('key', 'st_state')->value('value'), true) ?: [];
        } catch (\Throwable) {
        }

        return ['target_url' => self::targetUrl(), 'scopes' => SmartThings::SCOPES, 'confirmed_at' => $st['confirmed_at'] ?? null, 'confirm_status' => $st['confirm_status'] ?? null,
            'installs' => Schema::ensure() ? DB::table(Schema::ST_INSTALLS)->count() : 0, 'linked' => Schema::ensure() ? DB::table(Schema::ST_INSTALLS)->whereNotNull('user_id')->count() : 0];
    }

    /* ───────── 바깥 요청 ───────── */

    /** SmartThings API (Bearer) @return array{0: int, 1: array<string, mixed>} */
    private function api(string $tok, string $method, string $path, ?array $body = null): array
    {
        [$st, $res] = $this->http($method, SmartThings::API.$path, ['Authorization: Bearer '.$tok, 'Accept: application/json', 'Content-Type: application/json'], $body !== null ? json_encode($body) : null);
        $j = json_decode((string) $res, true);

        return [$st, is_array($j) ? $j : []];
    }

    /** @param list<string> $headers @return array{0: int, 1: string} */
    private function http(string $method, string $url, array $headers, ?string $body): array
    {
        if (self::$http !== null) {
            return (self::$http)($method, $url, $headers, $body);
        }
        if (! str_starts_with($url, 'https://')) {
            return [0, ''];
        }
        if (function_exists('curl_init')) {
            $ch = curl_init($url);
            curl_setopt_array($ch, [CURLOPT_CUSTOMREQUEST => $method, CURLOPT_RETURNTRANSFER => true, CURLOPT_HTTPHEADER => $headers, CURLOPT_CONNECTTIMEOUT => 4, CURLOPT_TIMEOUT => 8,
                CURLOPT_FOLLOWLOCATION => false, CURLOPT_PROTOCOLS => CURLPROTO_HTTPS, CURLOPT_SSL_VERIFYPEER => true]);
            if ($body !== null) {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
            }
            $res = curl_exec($ch);
            $st = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

            return [$res === false ? 0 : $st, $res === false ? '' : (string) $res];
        }
        $ctx = stream_context_create(['http' => ['method' => $method, 'header' => implode("\r\n", $headers), 'content' => (string) $body, 'timeout' => 8, 'ignore_errors' => true, 'follow_location' => 0]]);
        $res = @file_get_contents($url, false, $ctx);
        $st = isset($http_response_header[0]) && preg_match('#\s(\d{3})\s#', $http_response_header[0].' ', $m) ? (int) $m[1] : 0;

        return [$st, $res === false ? '' : (string) $res];
    }

    /** keyId → 공개 키 PEM 후보 (관리자가 넣은 키 + key.smartthings.com 에서 받은 인증서 — 하루 캐시) @return list<string> */
    private function keys(string $keyId): array
    {
        $out = [];
        $pem = (string) Settings::get('st_public_key');
        if ($pem !== '') {
            $out[] = $pem;
        }
        $ck = 'hal_st_key_'.sha1($keyId);
        if (! isset(self::$keyMemo[$ck])) {
            $got = null;
            try {
                $got = \Illuminate\Support\Facades\Cache::get($ck);
            } catch (\Throwable) {
            }
            if (! is_string($got) || $got === '') {
                foreach (StSignature::keyUrls($keyId) as $url) {
                    [$st, $res] = $this->http('GET', $url, ['Accept: application/x-pem-file, text/plain, */*'], null);
                    if ($st === 200 && str_contains($res, '-----BEGIN') && strlen($res) < 20000) {
                        $got = $res;
                        try {
                            \Illuminate\Support\Facades\Cache::put($ck, $got, 86400);
                        } catch (\Throwable) {
                        }
                        break;
                    }
                }
            }
            self::$keyMemo[$ck] = is_string($got) && $got !== '' ? [$got] : [];
        }

        return array_merge($out, self::$keyMemo[$ck]);
    }

    /** 설치마다 1분 한도 (Laravel RateLimiter — 없으면 그냥 받음) */
    private function allow(string $key, int $max): bool
    {
        try {
            $rl = app(\Illuminate\Cache\RateLimiter::class);
            if ($rl->tooManyAttempts($key, $max)) {
                return false;
            }
            $rl->hit($key, 60);
        } catch (\Throwable) {
        }

        return true;
    }

    /** 응답을 보낸 뒤에 할 일 (Laravel terminating — 검사 · 그 밖에는 바로) */
    private function later(callable $fn): void
    {
        $run = function () use ($fn): void {
            try {
                $fn();
            } catch (\Throwable $e) {
                $this->log('나중 일 실패', ['error' => mb_substr(get_class($e), 0, 80)]);
            }
        };
        if (! self::$inline) {
            try {
                if (function_exists('app') && method_exists(app(), 'terminating') && ! app()->runningInConsole()) {
                    app()->terminating($run);

                    return;
                }
            } catch (\Throwable) {
            }
        }
        $run();
    }

    private function state(array $v): void
    {
        try {
            DB::table(Schema::SETTINGS)->updateOrInsert(['key' => 'st_state'], ['value' => json_encode($v), 'updated_at' => now()]);
        } catch (\Throwable) {
        }
    }

    /** 로그 — 토큰 · 서명 · 코드 · 헤더는 절대 넣지 않음 */
    private function log(string $msg, array $ctx = []): void
    {
        try {
            \Illuminate\Support\Facades\Log::info('[custom-ha_link] SmartThings '.$msg, $ctx);
        } catch (\Throwable) {
        }
    }
}
