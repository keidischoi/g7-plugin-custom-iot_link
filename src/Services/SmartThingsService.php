<?php

namespace Plugins\Custom\IotLink\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Plugins\Custom\IotLink\Support\Rules;
use Plugins\Custom\IotLink\Support\Schema;
use Plugins\Custom\IotLink\Support\Settings;
use Plugins\Custom\IotLink\Support\SmartThings;
use Plugins\Custom\IotLink\Support\StSignature;

/**
 * 0.2.0 SmartThings (WebHook SmartApp) — 회원의 SmartThings 센서 값을 받아 IoT 연결의 같은 받기(HaService::ingest)로 넘김.
 *
 *  POST /api/plugins/custom-iot_link/smartthings (로그인 없음) — 모든 요청의 HTTP 서명을 확인 (StSignature)
 *   PING(예전) · CONFIRMATION(주소 확인 — confirmationUrl 을 받아 봄) · CONFIGURATION(INITIALIZE · PAGE — 연결 코드 → 센서 고르기)
 *   INSTALL · UPDATE(토큰 · installedAppId · locationId 저장, 구독 만들기) · EVENT(DEVICE_EVENT → 받기) · UNINSTALL(정리)
 *  회원과 잇기: 회원이 /iot-link 에서 만든 일회용 코드(8글자)를 SmartThings 앱의 설정 화면에 적음 → INSTALL 때 그 회원 · 기기와 이음.
 *  토큰은 Laravel Crypt 로 암호화해 둠 · 로그에 토큰 · 서명 · 코드를 남기지 않음.
 *
 * 1.1.0 로그인 연결 (API Access App · OAuth-In) — 지금 SmartThings 가 권하는 방식. 회원이 할 일은 「연결하기」 → 삼성 계정 로그인 → 허용 → 센서 고르기.
 *  1) oauthStart: 그 회원의 일회용 state 를 만들고 SmartThings 로그인 주소를 줌
 *  2) SmartThings 가 /iot-link?code=…&state=… 로 돌려보냄 → 화면이 로그인 정보와 함께 oauthFinish 를 부름 (state 가 그 회원 것일 때만 code 를 토큰으로 바꿈)
 *  3) oauthDevices · oauthPick: SmartThings 기기 목록에서 고름 — 기기 하나가 사이트 기기 하나 (config.map), 기기마다 구독 하나
 *  값은 같은 받는 곳(EVENT · HTTP 서명 확인)으로 들어옴. 예전 연결 코드(SmartApp) 방식은 설정 st_code_flow 를 켰을 때만 화면에 보임.
 */
class SmartThingsService
{
    /** 1.1.0 고지 — SmartThings 가 받아 주지 않을 때의 오류 글 끝에 붙임 (삼성이 API 를 유료 이용제로 바꾸는 중 — 무료 이용이 중지됐을 수 있음) */
    public const PAY_HINT = ' 계속 안 되면 삼성의 유료 이용제 전환으로 무료 이용이 중지된 것일 수 있어요.';

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
        return rtrim((string) config('app.url'), '/').'/api/plugins/custom-iot_link/smartthings';
    }

    /** 1.0.0 예전 이름(HA 연결) 때의 Target URL — 이미 등록한 SmartApp 은 이 주소로 계속 받음 (바꾸지 않아도 됨) */
    public static function legacyTargetUrl(): string
    {
        return rtrim((string) config('app.url'), '/').'/api/plugins/custom-ha_link/smartthings';
    }

    /** 1.1.0 로그인 연결에서 SmartThings 가 회원을 돌려보내는 곳 (Redirect URI) — 회원 화면 */
    public static function redirectUri(): string
    {
        return rtrim((string) config('app.url'), '/').'/iot-link';
    }

    public static function ready(): bool
    {
        return (bool) Settings::get('enabled') && (bool) Settings::get('st_enabled');
    }

    /** 1.1.0 로그인 연결을 쓸 수 있나 (켜짐 · Client ID · Client Secret) */
    public static function oauthReady(): bool
    {
        return self::ready() && Settings::get('st_client_id') !== '' && self::clientSecret() !== '';
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
        if (! Settings::get('enabled') || ! Schema::ensure()) {
            return [404, ['error' => 'off']];
        }
        if (strlen($body) > 262144) {
            return [413, ['error' => 'too large']];
        }
        $json = json_decode($body, true);
        $life = is_array($json) ? strtoupper((string) ($json['lifecycle'] ?? ($json['messageType'] ?? ''))) : '';
        // 1.1.0 주소 확인(CONFIRMATION)은 「SmartThings 연결 쓰기」를 켜기 전에도 답함 — 앱을 등록하는 바로 그때 오므로 (서명은 똑같이 확인). 그 밖의 것은 켜야 받음
        if (! self::ready() && $life !== 'CONFIRMATION') {
            return [404, ['error' => 'off']];
        }
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
        // 주소 확인(CONFIRMATION)은 App ID 를 맞춰 보지 않음 — 앱을 새로 등록하면 App ID 가 바뀌는데, 그 확인이 예전 App ID 때문에 막히면 안 됨 (답은 SmartThings 주소를 한 번 받아 보는 것뿐)
        if ($life !== 'CONFIRMATION' && $app !== '' && is_string($got) && $got !== '' && ! hash_equals($app, $got)) {
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

        return $name !== null ? (string) $name : 'IoT 연결';
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

    /** SmartThings 용 새 기기 (기기 수 한도 안에서). 1.1.0 이름 = SmartThings 기기 이름 · 필라멘트 보관 위치와 이름이 같으면 그 보관함에 붙임 */
    private function newDevice(int $uid, string $name = 'SmartThings', ?string $location = null, ?int $printerId = null): ?int
    {
        if (DB::table(Schema::DEVICES)->where('user_id', $uid)->count() >= (int) Settings::get('max_devices')) {
            return null;
        }

        return (int) DB::table(Schema::DEVICES)->insertGetId(['user_id' => $uid, 'token' => Rules::token(), 'name' => Rules::text($name, 60) ?: 'SmartThings',
            'target' => $printerId ? 'printer' : ($location !== null ? 'location' : 'other'), 'location' => $printerId ? null : $location, 'printer_id' => $printerId ?: null, 'source' => 'smartthings', 'entities' => json_encode(array_fill_keys(Rules::ENTITIES, '')), 'notify' => true, 'created_at' => now(), 'updated_at' => now()]);
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
        $cfg = self::config($i);
        $tok = $this->token($i);
        if ($tok === null) {
            DB::table(Schema::ST_INSTALLS)->where('id', $id)->update(['status' => $i->user_id ? 'error' : 'unlinked',
                'last_error' => 'SmartThings 토큰이 없어요 — '.($cfg['mode'] === 'oauth' ? '「🔗 다시 연결」을 눌러 주세요.' : '앱에서 설정을 한 번 더 저장해 주세요.')]);

            return;
        }
        $iid = (string) $i->installed_app_id;
        $set = [];
        if ($i->location_id) {
            [$st, $loc] = $this->api($tok, 'GET', '/locations/'.$i->location_id);
            if ($st === 200) {
                $set['temp_scale'] = in_array($loc['temperatureScale'] ?? '', ['C', 'F'], true) ? $loc['temperatureScale'] : null;
                $set['location_name'] = Rules::text($loc['name'] ?? '', 80) ?: null;
                $i->temp_scale = $set['temp_scale'];
            }
        }
        $oauth = $cfg['mode'] === 'oauth';
        $bad = $this->resubscribe($tok, $iid, $cfg);
        // 기기 이름 · 지금 값 — 화면에 바로 보이게 (로그인 연결은 목록 한 번으로 · 안 되면 하나씩)
        $labels = [];
        $status = [];
        $events = [];
        $list = $oauth && $cfg['devices'] !== [] ? $this->listDevices($tok) : null;
        foreach ($list ?? [] as $it) {
            $dev = is_array($it) ? SmartThings::id($it['deviceId'] ?? '') : '';
            $x = $dev !== '' ? SmartThings::listStatus($it) : ['components' => []];
            if ($dev !== '' && $x['components'] !== []) {
                $labels[$dev] = Rules::text($it['label'] ?? ($it['name'] ?? ''), 80);
                $status[$dev] = $x;
            }
        }
        foreach ($cfg['devices'] as $t) {
            [$slot, $dev, $comp] = $t;
            if (! isset($status[$dev])) {
                [$st, $d] = $this->api($tok, 'GET', '/devices/'.$dev);
                $labels[$dev] = $st === 200 ? Rules::text($d['label'] ?? ($d['name'] ?? ''), 80) : '';
                [$st, $x] = $this->api($tok, 'GET', '/devices/'.$dev.'/status');
                $status[$dev] = $st === 200 ? $x : [];
            }
            array_push($events, ...SmartThings::statusEvents($status[$dev], $dev, $comp, $t[3] ?? SmartThings::SLOTS[$slot][0]));
        }
        DB::table(Schema::ST_SENSORS)->where('install_id', $id)->whereNotIn('st_device_id', array_column($cfg['devices'], 1) ?: ['-'])->delete();   // 뺀 기기의 값은 지움
        if ($i->user_id) {
            $again = $oauth ? '「⚙️ 센서 고르기」에서 다시 저장해 주세요.' : '앱에서 설정을 다시 저장해 주세요.';
            $set += $bad ? ['status' => 'error', 'last_error' => '구독 '.$bad.'개를 만들지 못했어요 — 조금 뒤 '.$again.self::PAY_HINT] : ['status' => $oauth && $cfg['devices'] === [] ? 'choose' : 'active'];
        }
        DB::table(Schema::ST_INSTALLS)->where('id', $id)->update($set + ['updated_at' => self::now()]);
        $this->absorb(DB::table(Schema::ST_INSTALLS)->where('id', $id)->first(), $events, $labels);
    }

    /** 구독 만들기 — 로그인 연결은 없는 것만 새로, 예전 방식은 모두 지우고 새로. 못 만든 수 */
    private function resubscribe(string $tok, string $iid, array $cfg): int
    {
        if ($cfg['mode'] === 'oauth') {
            return $this->subscribeDevices($tok, $iid, array_values(array_unique(array_column($cfg['devices'], 1))));
        }
        $bad = 0;
        $this->api($tok, 'DELETE', '/installedapps/'.$iid.'/subscriptions');
        foreach ($cfg['devices'] as $n => [$slot, $dev, $comp]) {
            $body = SmartThings::subscription($slot, $dev, $comp, $n);
            [$st] = $body ? $this->api($tok, 'POST', '/installedapps/'.$iid.'/subscriptions', $body) : [0];
            if ($st < 200 || $st >= 300) {
                $bad++;
            }
        }

        return $bad;
    }

    /**
     * 1.4.1 값이 오래(st_poll_min 분) 안 온 설치 — 지금 값을 직접 물어봄 (응답 뒤에 · 한 번에 다섯 설치까지 · 같은 설치는 st_poll_min 에 한 번)
     *  SmartThings 는 값이 바뀔 때만 보내서, 습도가 그대로인 센서도 시간이 지나면 「끊김」이 됐음. 끊긴 뒤에는 다시 잇지도 않았음
     *  1.4.2 설치 전체가 아니라 기기 카드마다 봄 — 같은 위치에 자주 바뀌는 센서(움직임 · 전력)가 있으면 조용한 온습도계는 끝내 안 물어보던 것
     *
     * @param  list<int>  $uids
     */
    public function pollDue(array $uids): void
    {
        $min = (int) Settings::get('st_poll_min');
        $uids = array_values(array_filter(array_map('intval', $uids), static fn ($u) => $u > 0));
        if ($min <= 0 || $uids === [] || ! self::ready() || ! Schema::ensure()) {
            return;
        }
        $cut = self::at(-$min * 60);
        $ids = [];
        foreach (DB::table(Schema::ST_INSTALLS)->whereIn('user_id', $uids)->whereIn('status', ['active', 'error'])
            ->where(fn ($w) => $w->whereNull('polled_at')->orWhere('polled_at', '<', $cut))->orderBy('id')->get() as $i) {
            if ($this->quiet($i, $cut)) {
                $ids[] = (int) $i->id;
            }
            if (count($ids) >= 5) {
                break;
            }
        }
        if ($ids === []) {
            return;
        }
        DB::table(Schema::ST_INSTALLS)->whereIn('id', $ids)->update(['polled_at' => self::now()]);   // 먼저 적어 겹치지 않게
        $this->later(function () use ($ids) {
            foreach ($ids as $id) {
                $this->revive($id);
            }
        });
    }

    /** 1.4.2 그 설치에서 값이 오래 안 온 것이 있나 — 설치 전체 · 또는 이 설치가 값을 넘기는 사이트 기기 카드 하나라도 */
    private function quiet(object $i, string $cut): bool
    {
        if ($i->last_event_at === null ? (string) $i->updated_at < $cut : (string) $i->last_event_at < $cut) {   // 아직 값이 한 번도 안 왔으면 연결(저장)한 때부터 셈
            return true;
        }
        $cfg = self::config($i);
        $devs = array_column($cfg['devices'], 1);
        $site = $cfg['mode'] === 'oauth' ? array_values(array_unique(array_intersect_key($cfg['map'], array_flip($devs)))) : array_filter([(int) ($i->device_id ?? 0)]);

        return $site !== [] && DB::table(Schema::DEVICES)->whereIn('id', $site)->where('user_id', $i->user_id)
            ->where(fn ($w) => $w->whereNull('last_seen_at')->orWhere('last_seen_at', '<', $cut))->exists();
    }

    /**
     * 1.4.2 「🔄 다시 잇기」 — 회원이 누르면 그 회원의 SmartThings 연결을 지금 바로 다시 이음 (기다리지 않음 · 구독은 모두 다시 확인)
     *
     * @return array{0: bool, 1: string}
     */
    public function reviveNow(int $uid): array
    {
        if ($uid <= 0 || ! self::ready() || ! Schema::ensure()) {
            return [false, 'SmartThings 연결을 쓸 수 없어요.'];
        }
        $ids = DB::table(Schema::ST_INSTALLS)->where('user_id', $uid)->whereIn('status', ['active', 'error'])->orderBy('id')->limit(10)->pluck('id')->map(fn ($x) => (int) $x)->all();
        if ($ids === []) {
            return [false, '다시 이을 SmartThings 연결이 없어요 — 「➕ 기기 연결」에서 SmartThings 를 연결해 주세요.'];
        }
        DB::table(Schema::ST_INSTALLS)->whereIn('id', $ids)->update(['polled_at' => self::now()]);
        $sum = ['token' => 0, 'offline' => 0, 'bad' => 0, 'got' => 0];
        foreach ($ids as $id) {
            foreach ($this->revive($id, true) as $k => $v) {
                $sum[$k] += $v;
            }
        }
        $oauth = DB::table(Schema::ST_INSTALLS)->whereIn('id', $ids)->get()->contains(fn ($i) => self::config($i)['mode'] === 'oauth');
        if ($sum['token'] > 0) {
            return [false, 'SmartThings 로그인이 끝났어요 — '.($oauth ? '「🔗 다시 연결」을 눌러 한 번 더 로그인해 주세요.' : '앱에서 설정을 한 번 더 저장해 주세요.')];
        }
        $msg = [];
        if ($sum['got'] > 0) {
            $msg[] = 'SmartThings 에서 지금 값을 받아 다시 이었어요.';
        }
        if ($sum['offline'] > 0) {
            $msg[] = '기기 '.$sum['offline'].'개는 SmartThings 에서도 「오프라인」이에요 — 기기 전원 · 배터리 · 허브(와이파이)를 확인해 주세요. 켜지면 저절로 다시 이어요.';
        }
        if ($sum['bad'] > 0) {
            $msg[] = '구독 '.$sum['bad'].'개를 만들지 못했어요 — 조금 뒤 다시 눌러 주세요.'.self::PAY_HINT;
        }

        return [$sum['got'] > 0 || $msg !== [], $msg !== [] ? implode(' ', $msg) : 'SmartThings 에서 값을 받지 못했어요 — 조금 뒤 다시 눌러 주세요.'];
    }

    /**
     * 1.4.1 다시 잇기 — 구독 확인(로그인 연결: 빠진 것만 새로) · 기기 상태(ONLINE · OFFLINE) · 지금 값
     *  켜져 있는 기기는 값이 그대로여도 「받음」으로 (끊김이 풀림), SmartThings 가 OFFLINE 이라 하는 기기는 「끊김」 그대로 (정말 꺼짐)
     *  1.4.2 $full — 회원이 「🔄 다시 잇기」를 눌렀을 때: 예전 방식(연결 코드)도 구독을 모두 다시 만듦
     *
     * @return array{token: int, offline: int, bad: int, got: int}
     */
    public function revive(int $id, bool $full = false): array
    {
        $none = ['token' => 0, 'offline' => 0, 'bad' => 0, 'got' => 0];
        $i = DB::table(Schema::ST_INSTALLS)->where('id', $id)->first();
        if ($i === null || ! $i->user_id) {
            return $none;
        }
        $cfg = self::config($i);
        if ($cfg['devices'] === []) {
            return $none;
        }
        $tok = $this->token($i);
        if ($tok === null) {
            return ['token' => 1] + $none;   // 토큰 문제는 refresh 가 last_error 에 적음 — 회원이 「🔗 다시 연결」
        }
        $oauth = $cfg['mode'] === 'oauth';
        $bad = $oauth || $full ? $this->resubscribe($tok, (string) $i->installed_app_id, $cfg) : 0;   // 예전 방식은 모두 지우고 새로 만들어야 해서 앱에서 저장할 때 · 회원이 「다시 잇기」를 누를 때만
        $devs = array_values(array_unique(array_column($cfg['devices'], 1)));
        $status = [];
        $health = [];
        foreach (($oauth ? $this->listDevices($tok, true) : null) ?? [] as $it) {
            $dev = is_array($it) ? SmartThings::id($it['deviceId'] ?? '') : '';
            if ($dev === '' || ! in_array($dev, $devs, true)) {
                continue;
            }
            $x = SmartThings::listStatus($it);
            if ($x['components'] !== []) {
                $status[$dev] = $x;
            }
            $health[$dev] = strtoupper((string) ($it['healthState']['state'] ?? ''));
        }
        foreach ($devs as $dev) {
            if (($health[$dev] ?? '') === '') {
                [$st, $h] = $this->api($tok, 'GET', '/devices/'.$dev.'/health');
                $health[$dev] = $st === 200 ? strtoupper((string) ($h['state'] ?? '')) : '';
            }
            if ($health[$dev] === 'OFFLINE' || isset($status[$dev])) {
                continue;
            }
            [$st, $x] = $this->api($tok, 'GET', '/devices/'.$dev.'/status');
            if ($st === 200) {
                $status[$dev] = $x;
            }
        }
        $events = [];
        foreach ($cfg['devices'] as $t) {
            [$slot, $dev, $comp] = $t;
            if (($health[$dev] ?? '') !== 'OFFLINE' && isset($status[$dev])) {
                array_push($events, ...SmartThings::statusEvents($status[$dev], $dev, $comp, $t[3] ?? SmartThings::SLOTS[$slot][0]));
            }
        }
        if (($oauth || $full) && $bad === 0 && (string) $i->status === 'error') {
            DB::table(Schema::ST_INSTALLS)->where('id', $id)->update(['status' => 'active', 'last_error' => null, 'updated_at' => self::now()]);   // 구독을 다시 만들었음
        }
        $this->absorb($i, $events);
        $off = array_keys(array_filter($health, static fn ($h) => $h === 'OFFLINE'));
        if ($off !== [] || $bad) {
            $this->log('다시 잇기', ['install' => $id, 'offline' => count($off), 'subs_failed' => $bad]);
        }

        return ['token' => 0, 'offline' => count($off), 'bad' => $bad, 'got' => $events !== [] ? 1 : 0];
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
        $byDev = [];
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
            $byDev[$s['device']] = array_merge($byDev[$s['device']] ?? [], $r['payload']);
            $n++;
        }
        if ($n === 0) {
            return;
        }
        DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->update(['last_event_at' => $now]);
        if (! $i->user_id) {
            return;
        }
        // 1.3.0 프린터 기기 — 값이 하나씩 따로 오므로(노즐 온도만 · 진행률만) 저장해 둔 그 기기의 값을 모두 모아 한 번에 넘김
        //  (프린터 라운지는 받은 온도 묶음을 통째로 바꿔 적고, 출력 상태가 같이 있어야 받음)
        $pd = [];
        foreach ($cfg['devices'] as $d) {
            if (isset($d[4])) {
                $pd[$d[1]] = true;
            }
        }
        foreach (array_keys(array_intersect_key($pd, $byDev)) as $dev) {
            $all = [];
            foreach (DB::table(Schema::ST_SENSORS)->where('install_id', $i->id)->where('st_device_id', $dev)->limit(40)->get() as $row) {
                $r = SmartThings::event(['deviceId' => $dev, 'componentId' => (string) $row->component_id, 'capability' => (string) $row->capability, 'attribute' => (string) $row->attribute,
                    'value' => $row->value, 'unit' => $row->unit], $cfg['devices'], null, (float) $cfg['power_on_w']);
                if ($r !== null) {
                    $all = array_merge($all, $r['payload']);
                }
            }
            $byDev[$dev] = array_merge($all, $byDev[$dev]);
        }
        // 넘길 사이트 기기 — 로그인 연결은 SmartThings 기기마다 (map), 예전 방식은 설치에 이은 기기 하나
        $to = [];
        foreach ($byDev as $dev => $payload) {
            $site = $cfg['mode'] === 'oauth' ? ($cfg['map'][$dev] ?? 0) : (int) ($i->device_id ?? 0);
            if ($site > 0) {
                $to[$site] = array_merge($to[$site] ?? [], $payload);
            }
        }
        if ($to === []) {
            return;
        }
        $tokens = DB::table(Schema::DEVICES)->whereIn('id', array_keys($to))->where('user_id', $i->user_id)->pluck('token', 'id');
        foreach ($to as $site => $payload) {
            if (! empty($tokens[$site])) {
                $this->ha->ingest((string) $tokens[$site], $payload, 'smartthings');
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

    /**
     * 저장해 둔 설정 — mode: oauth(1.1.0 로그인 연결) · smartapp(예전 연결 코드). map: SmartThings 기기 → 사이트 기기 (로그인 연결만)
     *
     * @return array{mode: string, devices: list<array{0: string, 1: string, 2: string}>, map: array<string, int>, power_on_w: float}
     */
    private static function config(object $i): array
    {
        $c = json_decode((string) ($i->config ?? ''), true);
        $map = [];
        foreach (is_array($c['map'] ?? null) ? $c['map'] : [] as $k => $v) {
            if (SmartThings::id($k) !== '' && is_numeric($v) && (int) $v > 0) {
                $map[(string) $k] = (int) $v;
            }
        }

        return ['mode' => ($c['mode'] ?? '') === 'oauth' ? 'oauth' : 'smartapp',
            // 1.3.0 프린터 기기의 칸은 [역할, deviceId, componentId, capability, attribute]
            'devices' => array_values(array_filter(is_array($c['devices'] ?? null) ? $c['devices'] : [], static fn ($d) => is_array($d) && array_is_list($d) && count(array_filter($d, 'is_string')) === count($d)
                && ((count($d) === 3 && isset(SmartThings::SLOTS[$d[0]])) || (count($d) === 5 && isset(SmartThings::PRINTER[$d[0]]))))),
            'map' => $map, 'power_on_w' => is_numeric($c['power_on_w'] ?? null) ? (float) $c['power_on_w'] : 10.0];
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
        $how = (self::config($i)['mode'] === 'oauth' ? '「🔗 다시 연결」을 눌러 주세요.' : '앱에서 설정을 한 번 더 저장해 주세요.').self::PAY_HINT;
        DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->update(['refreshing_at' => null, 'token_checked_at' => self::now(), 'last_error' => 'SmartThings 토큰을 새로 받지 못했어요 (HTTP '.$st.') — '.$how]);
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
        $out = ['ready' => self::ready() && Settings::get('st_client_id') !== '', 'oauth' => self::oauthReady(), 'code_flow' => (bool) Settings::get('st_code_flow'), 'max_picks' => SmartThings::MAX_PICKS,
            'code' => null, 'code_min' => (int) Settings::get('st_code_min'), 'installs' => []];
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
            $cfg = self::config($i);
            $oauth = $cfg['mode'] === 'oauth';
            $map = array_filter($cfg['map'], static fn ($site) => isset($names[$site]));
            $out['installs'][] = ['id' => (int) $i->id, 'mode' => $cfg['mode'], 'location' => (string) ($i->location_name ?? ''), 'device_id' => $i->device_id && isset($names[$i->device_id]) ? (int) $i->device_id : null,
                'device_name' => $i->device_id ? (string) ($names[$i->device_id] ?? '') : '', 'status' => (string) $i->status, 'last_error' => (string) ($i->last_error ?? ''),
                'picked' => count(array_unique(array_column($cfg['devices'], 1))), 'site_devices' => array_values(array_unique(array_values($map))), 'power_on_w' => $cfg['power_on_w'],
                'last_event_at' => $i->last_event_at ? (string) $i->last_event_at : null,
                'sensors' => $this->sensors((int) $i->id, $oauth ? $map : null, $i->device_id && isset($names[$i->device_id]) ? (int) $i->device_id : null, $cfg['devices'])];
            $due = $due || $i->token_checked_at === null || (string) $i->token_checked_at < self::at(-6 * 3600);
        }
        $this->pollDue([$uid]);   // 1.4.1 값이 오래 안 온 것은 지금 값을 물어봄 (응답 뒤에)
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

    /**
     * 그 설치의 센서 값. site = 그 값이 보일 사이트 기기 (로그인 연결: SmartThings 기기마다 · 예전 방식: 설치에 이은 기기)
     *
     * @param  array<string, int>|null  $map  로그인 연결의 SmartThings 기기 → 사이트 기기 (예전 방식이면 null)
     * @return list<array<string, mixed>>
     */
    public function sensors(int $installId, ?array $map = null, ?int $deviceId = null, array $devices = []): array
    {
        $out = [];
        foreach (DB::table(Schema::ST_SENSORS)->where('install_id', $installId)->orderBy('label')->orderBy('capability')->limit(240)->get() as $s) {
            // 1.3.0 프린터 기기의 값은 그 역할 이름으로 (노즐 온도 · 베드 온도 · AMS 습도 · 출력 상태 …)
            $role = $devices !== [] ? SmartThings::roleOf($devices, (string) $s->st_device_id, (string) $s->component_id, (string) $s->capability, (string) $s->attribute) : '';
            $out[] = ['label' => (string) ($s->label ?: 'SmartThings 기기'), 'capability' => $role !== '' ? 'printer.'.$role : (string) $s->capability, 'what' => $role !== '' ? SmartThings::PRINTER[$role] : (SmartThings::LABELS[$s->capability] ?? (string) $s->attribute),
                'attribute' => (string) $s->attribute, 'value' => $role !== '' ? SmartThings::showRole($role, (string) $s->capability, (string) $s->value, (string) ($s->unit ?? '')) : SmartThings::show((string) $s->capability, (string) $s->value, (string) ($s->unit ?? '')), 'at' => $s->updated_at ? (string) $s->updated_at : null,
                'site' => $map !== null ? ($map[(string) $s->st_device_id] ?? null) : $deviceId];
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
        $oauth = self::config($i)['mode'] === 'oauth';
        if ($tok !== null && $oauth) {
            $this->api($tok, 'DELETE', '/installedapps/'.$i->installed_app_id.'/subscriptions');   // 앱을 못 지워도 값은 더 안 오게
        }
        $st = $tok !== null ? $this->api($tok, 'DELETE', '/installedapps/'.$i->installed_app_id)[0] : 0;
        $this->uninstall((string) $i->installed_app_id);

        return [true, $st >= 200 && $st < 300 ? 'SmartThings 연결을 끊었어요.' : ($oauth ? '사이트에서는 끊었어요 — SmartThings 앱의 연결된 서비스에서도 이 사이트를 지워 주세요.' : '사이트에서는 끊었어요 — SmartThings 앱의 자동화 › SmartApps 에서도 지워 주세요.')];
    }

    public function removeUser(int $uid): void
    {
        foreach (DB::table(Schema::ST_INSTALLS)->where('user_id', $uid)->pluck('installed_app_id') as $iid) {
            $this->uninstall((string) $iid);
        }
        DB::table(Schema::ST_CODES)->where('user_id', $uid)->delete();
        DB::table(Schema::ST_STATES)->where('user_id', $uid)->delete();
    }

    /** @return array<string, mixed> 관리자 화면 */
    public function adminInfo(): array
    {
        $st = [];
        try {
            $st = json_decode((string) DB::table(Schema::SETTINGS)->where('key', 'st_state')->value('value'), true) ?: [];
        } catch (\Throwable) {
        }

        // 주소 확인은 지금 쓰는 앱(App ID)의 것일 때만 「확인됨」
        $app = (string) Settings::get('st_app_id');
        $ours = $app === '' || ($st['app_id'] ?? '') === '' || $st['app_id'] === $app;

        return ['target_url' => self::targetUrl(), 'legacy_target_url' => self::legacyTargetUrl(), 'redirect_uri' => self::redirectUri(), 'https' => str_starts_with(self::targetUrl(), 'https://'),
            'app_name' => SmartThings::appRequest(self::siteName(), '', '', '')['displayName'], 'oauth_ready' => self::oauthReady(),
            'scopes' => SmartThings::SCOPES, 'confirmed_at' => $ours ? ($st['confirmed_at'] ?? null) : null, 'confirm_status' => $ours ? ($st['confirm_status'] ?? null) : null,
            'installs' => Schema::ensure() ? DB::table(Schema::ST_INSTALLS)->count() : 0, 'linked' => Schema::ensure() ? DB::table(Schema::ST_INSTALLS)->whereNotNull('user_id')->count() : 0];
    }

    /* ───────── 1.1.0 로그인 연결 (API Access App · OAuth) ───────── */

    private static function siteName(): string
    {
        return Rules::text(config('app.name') ?: (parse_url((string) config('app.url'), PHP_URL_HOST) ?: '사이트'), 40) ?: '사이트';
    }

    /** 「SmartThings 연결하기」 — 그 회원의 일회용 state(15분 · 한 번)를 만들고 SmartThings 로그인 주소를 줌 @return array{0: bool, 1: string, 2?: array{url: string}} */
    public function oauthStart(int $uid): array
    {
        if ($uid <= 0 || ! self::oauthReady() || ! Schema::ensure()) {
            return [false, 'SmartThings 연결이 아직 준비되지 않았어요 — 관리자에게 알려 주세요.'];
        }
        DB::table(Schema::ST_STATES)->where('expires_at', '<', self::at(-3600))->delete();
        $keep = DB::table(Schema::ST_STATES)->where('user_id', $uid)->whereNull('used_at')->orderByDesc('id')->limit(2)->pluck('id')->all();   // 쌓이지 않게 — 안 쓴 것은 최근 것만
        DB::table(Schema::ST_STATES)->where('user_id', $uid)->whereNull('used_at')->whereNotIn('id', $keep ?: [0])->delete();
        $state = SmartThings::newState();
        DB::table(Schema::ST_STATES)->insert(['user_id' => $uid, 'state' => $state, 'expires_at' => self::at(900), 'created_at' => self::now()]);

        return [true, 'ok', ['url' => SmartThings::authorizeUrl((string) Settings::get('st_client_id'), self::redirectUri(), $state)]];
    }

    /**
     * SmartThings 에서 돌아옴 — state 가 **이 회원이 방금 만든 것**일 때만 code 를 토큰으로 바꿔 설치를 이음.
     *  (남이 만든 주소로 허용하게 속여도 그 state 는 남의 것이라 이어지지 않음)
     *
     * @return array{0: bool, 1: string, 2?: array{install_id: int, choose: bool}}
     */
    public function oauthFinish(int $uid, string $code, string $state): array
    {
        if ($uid <= 0 || ! self::oauthReady() || ! Schema::ensure()) {
            return [false, 'SmartThings 연결이 아직 준비되지 않았어요 — 관리자에게 알려 주세요.'];
        }
        if (! preg_match('/^[a-f0-9]{40}$/', $state) || ! preg_match('/^[A-Za-z0-9._~+\/=-]{1,512}$/', $code)) {
            return [false, '연결 정보가 올바르지 않아요 — 「SmartThings 연결하기」를 다시 눌러 주세요.'];
        }
        $s = DB::table(Schema::ST_STATES)->where('state', $state)->where('user_id', $uid)->whereNull('used_at')->where('expires_at', '>', self::now())->first();
        if ($s === null || ! DB::table(Schema::ST_STATES)->where('id', $s->id)->whereNull('used_at')->update(['used_at' => self::now()])) {
            return [false, '연결 시간이 지났거나 이미 쓴 연결이에요 — 「SmartThings 연결하기」를 다시 눌러 주세요.'];
        }
        [$st, $j] = $this->redeem($code);
        $at = is_string($j['access_token'] ?? null) ? $j['access_token'] : '';
        $iid = SmartThings::id($j['installed_app_id'] ?? '');
        if ($st !== 200 || $at === '' || $iid === '') {
            $this->log('로그인 연결: 토큰 받기 실패', ['status' => $st]);
            $why = SmartThings::errorText($j);

            return [false, 'SmartThings 가 연결을 받아 주지 않았어요 (HTTP '.$st.($why !== '' ? ' · '.$why : '').') — 다시 연결해 주세요.'.self::PAY_HINT];
        }
        [$st2, $isa] = $this->api($at, 'GET', '/installedapps/'.$iid);
        $loc = $st2 === 200 ? SmartThings::id($isa['locationId'] ?? '') : '';
        $appId = $st2 === 200 ? SmartThings::id($isa['appId'] ?? '') : '';
        if ($appId !== '' && Settings::get('st_app_id') !== $appId) {
            Settings::save(['st_app_id' => $appId]);   // 우리 Client 로 받은 설치이므로 그 앱이 우리 앱 — App ID 를 안 적었거나 잘못 적었어도 맞춤 (틀리면 값 받기가 403)
        }
        $row = DB::table(Schema::ST_INSTALLS)->where('installed_app_id', $iid)->first();
        $mine = $row !== null && (int) $row->user_id === $uid && self::config($row)['mode'] === 'oauth';
        $cfg = $mine ? self::config($row) : ['mode' => 'oauth', 'devices' => [], 'map' => [], 'power_on_w' => 10.0];
        // 같은 위치를 예전에 연결했던 것 (SmartThings 쪽에서 끊고 다시 연결하면 설치 id 가 바뀜) → 고른 센서를 물려받고 예전 줄은 지움
        if (! $mine && $loc !== '') {
            foreach (DB::table(Schema::ST_INSTALLS)->where('user_id', $uid)->where('location_id', $loc)->where('installed_app_id', '!=', $iid)->get() as $old) {
                $oc = self::config($old);
                if ($oc['mode'] === 'oauth') {
                    $cfg = $cfg['devices'] === [] ? $oc : $cfg;
                    DB::table(Schema::ST_SENSORS)->where('install_id', $old->id)->delete();
                    DB::table(Schema::ST_INSTALLS)->where('id', $old->id)->delete();
                }
            }
        }
        $rt = is_string($j['refresh_token'] ?? null) && $j['refresh_token'] !== '' ? self::enc($j['refresh_token']) : null;
        $set = ['user_id' => $uid, 'device_id' => null, 'location_id' => $loc !== '' ? $loc : ($row->location_id ?? null), 'app_id' => $appId !== '' ? $appId : null, 'auth_token' => self::enc($at), 'refresh_token' => $rt,
            'token_expires_at' => self::at(max(600, (int) ($j['expires_in'] ?? 86400)) - 300), 'refreshing_at' => null, 'token_checked_at' => self::now(), 'config' => json_encode($cfg),
            'status' => $cfg['devices'] === [] ? 'choose' : 'syncing', 'last_error' => null, 'updated_at' => self::now()];
        if ($row !== null) {
            if (! $mine) {
                DB::table(Schema::ST_SENSORS)->where('install_id', $row->id)->delete();   // 다른 회원이 연결했던 위치 — 지금 로그인한 사람의 것으로
            }
            DB::table(Schema::ST_INSTALLS)->where('id', $row->id)->update($set);
            $id = (int) $row->id;
        } else {
            $id = (int) DB::table(Schema::ST_INSTALLS)->insertGetId($set + ['installed_app_id' => $iid, 'created_at' => self::now()]);
        }
        $this->sync($id);   // 위치 이름 · 온도 단위 (+ 다시 연결이면 구독 · 지금 값)

        return [true, $cfg['devices'] === [] ? 'SmartThings 와 연결했어요 — 받을 센서를 골라 주세요.' : 'SmartThings 를 다시 연결했어요.', ['install_id' => $id, 'choose' => $cfg['devices'] === []]];
    }

    /**
     * code → 토큰 (POST …/oauth/token · Basic base64(clientId:clientSecret) · grant_type=authorization_code)
     *  code 는 한 번만 쓸 수 있으므로 그 주소가 요청을 받지 않았을 때(연결 실패 · 404 · 405 · 406 · 415)만 다음 곳에 물음
     *
     * @return array{0: int, 1: array<string, mixed>}
     */
    private function redeem(string $code): array
    {
        $cid = (string) Settings::get('st_client_id');
        $hdr = ['Authorization: Basic '.base64_encode($cid.':'.self::clientSecret()), 'Content-Type: application/x-www-form-urlencoded', 'Accept: application/json'];
        $body = http_build_query(['grant_type' => 'authorization_code', 'code' => $code, 'client_id' => $cid, 'redirect_uri' => self::redirectUri()]);
        $st = 0;
        $j = [];
        foreach (SmartThings::TOKEN_URLS as $url) {
            [$st, $res] = $this->http('POST', $url, $hdr, $body);
            $j = json_decode((string) $res, true);
            if (! in_array($st, [0, 404, 405, 406, 415], true)) {
                break;
            }
        }

        return [$st, is_array($j) ? $j : []];
    }

    /** 내 로그인 연결 설치 (남의 것 · 예전 방식이면 null) */
    private function ownOauth(int $uid, int $id): ?object
    {
        $i = $uid > 0 && Schema::ensure() ? DB::table(Schema::ST_INSTALLS)->where('id', $id)->where('user_id', $uid)->first() : null;

        return $i !== null && self::config($i)['mode'] === 'oauth' ? $i : null;
    }

    /** 그 설치(위치)의 SmartThings 기기 — 지금 값과 함께 (5쪽까지). 못 받으면 null @return list<mixed>|null */
    private function listDevices(string $tok, bool $health = false): ?array
    {
        $out = [];
        $path = '/devices?includeStatus=true'.($health ? '&includeHealth=true' : '');
        for ($n = 0; $n < 5 && $path !== null; $n++) {
            [$st, $j] = $this->api($tok, 'GET', $path);
            if ($st !== 200) {
                return $n === 0 ? null : $out;
            }
            array_push($out, ...array_values(is_array($j['items'] ?? null) ? $j['items'] : []));
            $next = $j['_links']['next']['href'] ?? null;
            $path = is_string($next) && str_starts_with($next, SmartThings::API.'/') ? substr($next, strlen(SmartThings::API)) : null;
        }

        return $out;
    }

    /**
     * 「⚙️ 센서 고르기」 목록 — 받을 수 있는 값이 있는 SmartThings 기기 · 지금 값 · 고른 것 · 붙은 사이트 기기 (이름이 같은 사이트 기기가 있으면 권함)
     *
     * @return array{0: bool, 1: string, 2?: array<string, mixed>}
     */
    public function oauthDevices(int $uid, int $id): array
    {
        $i = $this->ownOauth($uid, $id);
        if ($i === null) {
            return [false, '연결을 찾을 수 없어요.'];
        }
        $tok = $this->token($i);
        if ($tok === null) {
            return [false, 'SmartThings 로그인이 끝났어요 — 「🔗 다시 연결」을 눌러 주세요.'];
        }
        $items = $this->listDevices($tok);
        if ($items === null) {
            return [false, 'SmartThings 에서 기기 목록을 받지 못했어요 — 조금 뒤 다시 해 주세요.'];
        }
        $cfg = self::config($i);
        $picked = array_flip(array_column($cfg['devices'], 1));
        $mine = DB::table(Schema::DEVICES)->where('user_id', $uid)->orderBy('id')->pluck('name', 'id');
        $byName = [];
        foreach ($mine as $did => $name) {
            $byName[Rules::loc($name)] ??= (int) $did;
        }
        // 1.2.0 SmartThings 이름이 내 프린터의 별명 · 기종 · 이름과 같으면 그 프린터에 붙이기를 권함
        $prn = [];
        foreach ($this->ha->printers($uid) as $p) {
            foreach ([$p['nickname'], $p['model'], $p['brand'].' '.$p['model'], $p['name']] as $nm) {
                if (Rules::loc($nm) !== '') {
                    $prn[Rules::loc($nm)] ??= (int) $p['id'];
                }
            }
        }
        $mineP = $this->ha->printers($uid);
        $rows = [];
        foreach (SmartThings::candidates($items, $i->temp_scale ?? null) as $c) {
            $site = isset($cfg['map'][$c['id']], $mine[$cfg['map'][$c['id']]]) ? $cfg['map'][$c['id']] : null;
            $vals = [];
            if ($c['kind'] === 'printer') {
                foreach ($c['triples'] as $t) {   // 1.3.0 프린터 기기 — 역할 이름으로 (출력 상태 · 진행률 · 노즐 온도 …)
                    $vals[] = ['what' => SmartThings::PRINTER[$t[0]], 'value' => $c['values'][$t[0]] ?? ''];
                }
            } else {
                foreach (array_keys($c['caps']) as $cap) {
                    $vals[] = ['what' => SmartThings::LABELS[$cap] ?? $cap, 'value' => $c['values'][$cap] ?? ''];
                }
            }
            $sp = $prn[Rules::loc($c['label'])] ?? null;
            if ($sp === null && $c['kind'] === 'printer') {
                // 이름이 같지 않아도 — 상표가 이름에 든 프린터가 하나뿐이면 그것 (「Bambu Lab Printer」 ↔ 내 「Bambu Lab A1」), 내 프린터가 하나뿐이면 그것
                $hit = array_values(array_filter($mineP, static fn ($p) => ($w = Rules::loc(explode(' ', trim((string) $p['brand']))[0] ?? '')) !== '' && str_contains(Rules::loc($c['label']), $w)));
                $sp = count($hit) === 1 ? (int) $hit[0]['id'] : (count($mineP) === 1 ? (int) $mineP[0]['id'] : null);
            }
            // 1.3.0 예전 버전으로 골라 둔 프린터 기기 — 온습도계 · 플러그처럼 읽고 있으니 한 번 다시 저장해야 함
            $old = $c['kind'] === 'printer' && isset($picked[$c['id']]) && ! array_filter($cfg['devices'], static fn ($d) => $d[1] === $c['id'] && isset($d[4]));
            $rows[] = ['id' => $c['id'], 'label' => $c['label'], 'kind' => $c['kind'], 'values' => $vals, 'picked' => isset($picked[$c['id']]), 'site_device_id' => $site, 'suggest' => $site ?? ($byName[Rules::loc($c['label'])] ?? null),
                'suggest_printer' => $site === null || $old ? $sp : null, 'resave' => $old];
        }

        return [true, 'ok', ['install_id' => (int) $i->id, 'location' => (string) ($i->location_name ?? ''), 'devices' => $rows, 'max' => SmartThings::MAX_PICKS, 'power_on_w' => $cfg['power_on_w'],
            'room' => max(0, (int) Settings::get('max_devices') - count($mine))]];
    }

    /**
     * 센서 고른 것 저장 — SmartThings 기기 하나가 사이트 기기 하나 (없으면 그 이름으로 새로 · 필라멘트 보관 위치와 이름이 같으면 그 보관함에).
     *  지금 값은 바로 넣고, 구독은 응답을 보낸 뒤에 맞춤. 고른 것에서 뺀 기기의 사이트 기기 · 기록은 남김.
     *
     * @param  list<mixed>  $picks  [{id: SmartThings 기기 id, site_device_id: 붙일 내 사이트 기기 | null, printer_id: 붙일 내 프린터 | null (1.2.0 — 그 프린터의 카드에, 없으면 새로)}]
     * @return array{0: bool, 1: string}
     */
    public function oauthPick(int $uid, int $id, array $picks, mixed $powerOnW = null): array
    {
        $i = $this->ownOauth($uid, $id);
        if ($i === null) {
            return [false, '연결을 찾을 수 없어요.'];
        }
        if (count($picks) > SmartThings::MAX_PICKS) {
            return [false, '센서는 '.SmartThings::MAX_PICKS.'개까지 고를 수 있어요.'];
        }
        $tok = $this->token($i);
        $items = $tok !== null ? $this->listDevices($tok) : null;
        if ($items === null) {
            return [false, $tok === null ? 'SmartThings 로그인이 끝났어요 — 「🔗 다시 연결」을 눌러 주세요.' : 'SmartThings 에서 기기 목록을 받지 못했어요 — 조금 뒤 다시 해 주세요.'];
        }
        $raw = [];
        foreach ($items as $it) {
            if (is_array($it) && ($x = SmartThings::id($it['deviceId'] ?? '')) !== '') {
                $raw[$x] = $it;
            }
        }
        $cand = array_column(SmartThings::candidates($items, $i->temp_scale ?? null), null, 'id');
        $old = self::config($i);
        $mine = DB::table(Schema::DEVICES)->where('user_id', $uid)->pluck('name', 'id')->all();
        $locs = [];
        foreach ($this->ha->locations($uid) as $l) {
            $locs[Rules::loc($l)] = $l;
        }
        $printers = array_column($this->ha->printers($uid), null, 'id');
        $triples = [];
        $map = [];
        $labels = [];
        $made = 0;
        $skip = [];
        foreach ($picks as $p) {
            $sid = is_array($p) ? SmartThings::id($p['id'] ?? '') : '';
            if ($sid === '' || ! isset($cand[$sid]) || isset($map[$sid])) {
                continue;   // SmartThings 에 (더는) 없는 기기 · 두 번 온 것
            }
            $c = $cand[$sid];
            $site = is_array($p) && is_numeric($p['site_device_id'] ?? null) ? (int) $p['site_device_id'] : 0;
            // 1.2.0 「🖨️ 내 프린터에 붙이기」 — 그 프린터에 이미 붙인 카드가 있으면 거기에 (온습도계 + 플러그가 한 카드에), 없으면 그 프린터에 붙인 새 카드
            $pid = is_array($p) && is_numeric($p['printer_id'] ?? null) ? (int) $p['printer_id'] : 0;
            if ($pid > 0 && isset($printers[$pid])) {
                $on = DB::table(Schema::DEVICES)->where('user_id', $uid)->where('target', 'printer')->where('printer_id', $pid)->orderByRaw("case when source = 'smartthings' then 0 else 1 end")->orderBy('id')->value('id');
                $site = $on ? (int) $on : (int) $this->newDevice($uid, $printers[$pid]['name'], null, $pid);
                if ($site <= 0) {
                    $skip[] = $c['label'];

                    continue;   // 기기 수 한도
                }
                if (! isset($mine[$site])) {
                    $mine[$site] = $printers[$pid]['name'];
                    $made++;
                }
            }
            if ($site <= 0 || ! isset($mine[$site])) {
                $site = isset($old['map'][$sid], $mine[$old['map'][$sid]]) ? $old['map'][$sid] : 0;   // 남의 기기 · 없는 기기로는 못 붙임 → 예전에 붙였던 것 · 없으면 새로
            }
            if ($site <= 0) {
                $site = (int) $this->newDevice($uid, $c['label'], $locs[Rules::loc($c['label'])] ?? null);
                if ($site <= 0) {
                    $skip[] = $c['label'];

                    continue;   // 기기 수 한도
                }
                $mine[$site] = $c['label'];
                $made++;
            }
            $map[$sid] = $site;
            $labels[$sid] = $c['label'];
            array_push($triples, ...$c['triples']);
        }
        $w = is_numeric($powerOnW) ? max(0.5, min(5000.0, (float) $powerOnW)) : $old['power_on_w'];
        DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->update(['config' => json_encode(['mode' => 'oauth', 'devices' => $triples, 'map' => $map, 'power_on_w' => $w]),
            'status' => $triples === [] ? 'choose' : 'syncing', 'last_error' => null, 'updated_at' => self::now()]);
        DB::table(Schema::ST_SENSORS)->where('install_id', $i->id)->whereNotIn('st_device_id', array_keys($map) ?: ['-'])->delete();
        // 지금 값 — 방금 받은 목록의 값으로 바로 (화면에 곧바로 보이게)
        $events = [];
        foreach ($triples as $t) {
            [$slot, $dev, $comp] = $t;
            array_push($events, ...SmartThings::statusEvents(SmartThings::listStatus($raw[$dev] ?? []), $dev, $comp, $t[3] ?? SmartThings::SLOTS[$slot][0]));
        }
        $this->absorb(DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->first(), $events, $labels);
        $iid = (int) $i->id;
        $this->later(fn () => $this->sync($iid));
        $n = count($map);
        $msg = $n === 0 ? '고른 센서가 없어요 — 값을 받지 않아요.' : '센서 '.$n.'개를 이었어요'.($made > 0 ? ' (새 기기 '.$made.'개)' : '').' — 값이 바뀔 때마다 바로 들어와요.';

        return [true, $msg.($skip !== [] ? ' 기기 수 한도('.Settings::get('max_devices').'개)라 못 만든 것: '.implode(' · ', array_slice($skip, 0, 5)) : '')];
    }

    /**
     * 구독 맞추기 (로그인 연결) — 고른 기기마다 하나. 이미 있는 것은 두고, 뺀 것만 지우고, 새 것만 만듦 (구독 만들기는 15분에 40번쯤까지라서 다시 만들지 않음). 못 만든 수.
     *
     * @param  list<string>  $want  SmartThings 기기 id
     */
    private function subscribeDevices(string $tok, string $iid, array $want): int
    {
        $base = '/installedapps/'.$iid.'/subscriptions';
        [$st, $j] = $this->api($tok, 'GET', $base);
        $have = [];
        $stale = [];
        foreach ($st === 200 && is_array($j['items'] ?? null) ? $j['items'] : [] as $sub) {
            $sid = is_array($sub) ? SmartThings::id($sub['id'] ?? '') : '';
            $dev = is_array($sub) ? SmartThings::id($sub['device']['deviceId'] ?? '') : '';
            if (is_array($sub) && ($sub['sourceType'] ?? '') === 'DEVICE' && $sid !== '' && $dev !== '' && in_array($dev, $want, true) && ! isset($have[$dev]) && ($sub['device']['capability'] ?? '*') === '*') {
                $have[$dev] = $sid;
            } else {
                $stale[] = $sid;
            }
        }
        if ($st !== 200 || count($stale) > 5 || in_array('', $stale, true)) {
            $this->api($tok, 'DELETE', $base);   // 목록을 못 받았거나 지울 것이 많음 — 모두 지우고 새로
            $have = [];
        } else {
            foreach ($stale as $sid) {
                $this->api($tok, 'DELETE', $base.'/'.$sid);
            }
        }
        $bad = 0;
        foreach ($want as $dev) {
            if (isset($have[$dev])) {
                continue;
            }
            [$s2] = $this->api($tok, 'POST', $base, SmartThings::deviceSubscription($dev));
            if ($s2 < 200 || $s2 >= 300) {
                $bad++;
            }
        }

        return $bad;
    }

    /**
     * 사이트 기기를 지웠을 때 — 예전 방식: 설치에 이은 기기를 비움 (연결은 남김) · 로그인 연결: 그 기기에 붙인 SmartThings 센서를 고른 것에서 빼고 구독도 지움
     */
    public function deviceDeleted(int $uid, int $deviceId): void
    {
        DB::table(Schema::ST_INSTALLS)->where('device_id', $deviceId)->update(['device_id' => null, 'last_error' => '이은 기기를 지웠어요 — 값을 넘길 기기를 골라 주세요.']);
        foreach (DB::table(Schema::ST_INSTALLS)->where('user_id', $uid)->get() as $i) {
            $cfg = self::config($i);
            $gone = $cfg['mode'] === 'oauth' ? array_map('strval', array_keys($cfg['map'], $deviceId, true)) : [];
            if ($gone === []) {
                continue;
            }
            $cfg['map'] = array_diff_key($cfg['map'], array_flip($gone));
            $cfg['devices'] = array_values(array_filter($cfg['devices'], static fn ($d) => ! in_array($d[1], $gone, true)));
            DB::table(Schema::ST_INSTALLS)->where('id', $i->id)->update(['config' => json_encode($cfg), 'status' => $cfg['devices'] === [] ? 'choose' : $i->status, 'updated_at' => self::now()]);
            DB::table(Schema::ST_SENSORS)->where('install_id', $i->id)->whereIn('st_device_id', $gone)->delete();
            $id = (int) $i->id;
            $this->later(fn () => $this->sync($id));
        }
    }

    /**
     * 관리자 「⚡ 자동 등록」 — 관리자의 개인 액세스 토큰(PAT)으로 SmartThings 에 API Access App(OAuth-In)을 만들고 Client ID · Client Secret 을 저장.
     *  SmartThings CLI 의 `smartthings apps:create` 와 같은 요청 (POST /v1/apps). 토큰은 이 요청에만 쓰고 저장 · 기록하지 않음.
     *  주소 확인(CONFIRMATION)은 SmartThings 가 받는 곳으로 보내면 사이트가 알아서 답함.
     *
     * @return array{0: bool, 1: string}
     */
    public function register(string $pat): array
    {
        $pat = trim($pat);
        if (! preg_match('/^[A-Za-z0-9._-]{20,200}$/', $pat)) {
            return [false, '토큰 모양이 아니에요 — account.smartthings.com/tokens 에서 만든 토큰을 그대로 붙여 넣어 주세요.'];
        }
        if (! str_starts_with(self::targetUrl(), 'https://')) {
            return [false, '사이트 주소(APP_URL)가 https 여야 SmartThings 에 등록할 수 있어요.'];
        }
        if (! Schema::ensure()) {
            return [false, '잠시 뒤 다시 해 주세요.'];
        }
        $b = bin2hex(random_bytes(16));
        $uuid = substr($b, 0, 8).'-'.substr($b, 8, 4).'-4'.substr($b, 13, 3).'-a'.substr($b, 17, 3).'-'.substr($b, 20, 12);
        [$st, $j] = $this->api($pat, 'POST', '/apps', SmartThings::appRequest(self::siteName(), self::targetUrl(), self::redirectUri(), $uuid));
        $cid = SmartThings::id($j['oauthClientId'] ?? '');
        $sec = is_string($j['oauthClientSecret'] ?? null) ? trim($j['oauthClientSecret']) : '';
        $appId = SmartThings::id($j['app']['appId'] ?? '');
        if ($st < 200 || $st >= 300 || $cid === '' || $sec === '') {
            $this->log('앱 자동 등록 실패', ['status' => $st]);
            $why = SmartThings::errorText($j);
            $hint = match (true) {
                $st === 401 => '토큰이 틀렸거나 시간이 지났어요 (토큰은 24시간만 살아 있어요).',
                $st === 403 => '이 토큰으로는 앱을 만들 수 없어요 — 토큰을 만들 때 「애플리케이션(Applications)」 권한을 체크했는지, SmartThings API 플랜(유료)이 필요한 계정은 아닌지 확인해 주세요.',
                $st === 422 || $st === 400 => 'SmartThings 가 등록 내용을 받아 주지 않았어요.',
                $st === 0 => 'SmartThings 에 연결하지 못했어요 — 서버에서 api.smartthings.com 으로 나갈 수 있는지 확인해 주세요.',
                default => '아래 「📝 직접 등록」으로 해 주세요.',
            };

            return [false, '자동 등록을 못 했어요 (HTTP '.$st.($why !== '' ? ' · '.$why : '').') — '.$hint];
        }
        Settings::save(['st_enabled' => true, 'st_app_id' => $appId, 'st_client_id' => $cid, 'st_client_secret' => 'enc:'.self::enc($sec)]);
        if ($appId !== '') {
            $this->api($pat, 'PUT', '/apps/'.$appId.'/register');   // 주소 확인 요청을 (다시) 보내 달라고 — 사이트가 알아서 답함
        }
        $this->log('앱 자동 등록', ['status' => $st]);

        return [true, 'SmartThings 에 등록했어요 — Client ID · Client Secret 을 저장하고 연결을 켰어요. 주소 확인(✅)은 잠시 뒤 화면을 새로 고치면 보여요.'];
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
            \Illuminate\Support\Facades\Log::info('[custom-iot_link] SmartThings '.$msg, $ctx);
        } catch (\Throwable) {
        }
    }
}
