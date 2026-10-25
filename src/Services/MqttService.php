<?php

namespace Plugins\Custom\IotLink\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * 1.15.0 📨 MQTT 중계 — 회원의 브로커 설정 · 찾은 토픽 · 고른 토픽
 *  hal_links.mqtt  {host, port, user, pass(Crypt), tls, topics[], pick{토픽 키: 기기 id}}  — 회원마다 하나 (연결 코드와 같은 줄)
 *  찾은 토픽 · 중계 상태는 캐시 (자주 바뀌고 잃어도 30초 안에 다시 옴): iotl:mq:seen:{회원} · iotl:mq:relay:{회원}
 *  중계는 연결 코드로 POST hub/{code}/mqtt — 찾은 토픽을 알리고 설정(비밀번호 포함) · 고른 토픽의 받는 키를 받아 감
 */
final class MqttService
{
    public const MAX_SEEN = 150;

    public const MAX_TOPICS = 10;

    public const SEEN_DAYS = 7;


    public function __construct(private HaService $ha) {}

    /** @return array{host: string, port: int, user: string, pass: string, tls: bool, topics: list<string>, pick: array<string, int>, saved: bool} */
    public function get(int $uid): array
    {
        $raw = Schema::ensure() ? DB::table(Schema::LINKS)->where('user_id', $uid)->value('mqtt') : null;
        $c = is_string($raw) && $raw !== '' ? (array) json_decode($raw, true) : [];
        $pass = '';
        if (! empty($c['pass'])) {
            try {
                $pass = Crypt::decryptString((string) $c['pass']);
            } catch (\Throwable) {
            }
        }

        return ['host' => (string) ($c['host'] ?? ''), 'port' => (int) ($c['port'] ?? 1883) ?: 1883, 'user' => (string) ($c['user'] ?? ''), 'pass' => $pass, 'tls' => (bool) ($c['tls'] ?? false),
            'topics' => array_values(array_filter(array_map('strval', (array) ($c['topics'] ?? ['#'])))) ?: ['#'], 'pick' => array_map('intval', (array) ($c['pick'] ?? [])), 'saved' => $c !== []];
    }

    /** @param array<string, mixed> $c */
    private function put(int $uid, array $c): void
    {
        $this->ha->linkCode($uid);   // 줄이 없으면 만듦
        $row = ['host' => $c['host'], 'port' => $c['port'], 'user' => $c['user'], 'pass' => $c['pass'] !== '' ? Crypt::encryptString($c['pass']) : '', 'tls' => $c['tls'], 'topics' => $c['topics'], 'pick' => (object) $c['pick']];
        DB::table(Schema::LINKS)->where('user_id', $uid)->update(['mqtt' => json_encode($row, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)]);
    }

    /** 중계가 다시 붙어야 하는지 가리는 표 — 브로커 쪽 설정만 (고른 토픽은 붙은 채로 바뀜) */
    public static function rev(array $c): string
    {
        return substr(md5(json_encode([$c['host'], $c['port'], $c['user'], $c['pass'], $c['tls'], $c['topics']])), 0, 12);
    }

    /** MQTT 토픽 필터 한 줄 — + 는 한 칸 · # 는 맨 끝에만 */
    public static function topicOk(string $t): bool
    {
        if ($t === '' || strlen($t) > 200 || preg_match('/[\x00-\x1F\x7F]/', $t)) {
            return false;
        }
        $parts = explode('/', $t);
        foreach ($parts as $i => $p) {
            if ((str_contains($p, '#') && ($p !== '#' || $i !== count($parts) - 1)) || (str_contains($p, '+') && $p !== '+')) {
                return false;
            }
        }

        return true;
    }

    public static function hostOk(string $h): bool
    {
        return (bool) preg_match('/^(?=.{1,100}$)[A-Za-z0-9]([A-Za-z0-9.\-]*[A-Za-z0-9])?$/', $h) || (bool) preg_match('/^\[?[0-9a-fA-F:]{2,60}\]?$/', $h);
    }

    /** 화면에서 브로커 설정 저장 — 비밀번호는 적었을 때만 바꿈 (clear_pass 면 지움) @return array{0: bool, 1: string} */
    public function save(int $uid, array $in): array
    {
        $c = $this->get($uid);
        $host = trim((string) ($in['host'] ?? ''));
        $host = (string) preg_replace('#^(mqtts?|tcp|ssl)://#i', '', $host);
        if (! self::hostOk($host)) {
            return [false, '브로커 주소를 다시 적어 주세요 (예: 192.168.0.54 · mqtt.local).'];
        }
        $port = (int) ($in['port'] ?? 1883);
        if ($port < 1 || $port > 65535) {
            return [false, '포트는 1~65535 예요 (보통 1883 · TLS 는 8883).'];
        }
        $user = trim((string) ($in['user'] ?? ''));
        if (mb_strlen($user) > 80 || preg_match('/[\x00-\x1F\x7F]/', $user)) {
            return [false, '사용자 이름을 다시 적어 주세요.'];
        }
        $pass = (string) ($in['pass'] ?? '');
        if (mb_strlen($pass) > 120) {
            return [false, '비밀번호가 너무 길어요.'];
        }
        $topics = is_array($in['topics'] ?? null) ? $in['topics'] : preg_split('/[\r\n,]+/', (string) ($in['topics'] ?? ''));
        $topics = array_values(array_unique(array_filter(array_map(static fn ($t) => trim((string) $t), $topics ?: []), static fn ($t) => $t !== '')));
        if ($topics === []) {
            $topics = ['#'];
        }
        if (count($topics) > self::MAX_TOPICS) {
            return [false, '토픽은 '.self::MAX_TOPICS.'줄까지예요.'];
        }
        foreach ($topics as $t) {
            if (! self::topicOk($t)) {
                return [false, '토픽 「'.mb_substr($t, 0, 40).'」 모양이 맞지 않아요 (+ 는 한 칸 · # 는 맨 끝에만).'];
            }
        }
        $c = ['host' => $host, 'port' => $port, 'user' => $user, 'pass' => ! empty($in['clear_pass']) || $user === '' ? '' : ($pass !== '' ? $pass : $c['pass']), 'tls' => filter_var($in['tls'] ?? false, FILTER_VALIDATE_BOOLEAN), 'topics' => $topics, 'pick' => $c['pick']];
        $this->put($uid, $c);

        return [true, '저장했어요 — 중계가 30초 안에 이 설정으로 다시 붙어요.'];
    }

    /** 찾은 토픽 하나를 받기(기기 만들기) · 그만 받기(기기는 그대로) @return array{0: bool, 1: string, 2?: array<string, mixed>} */
    public function pick(int $uid, string $key, bool $on, string $name = ''): array
    {
        $key = trim($key);
        if ($key === '' || strlen($key) > 200) {
            return [false, '토픽을 다시 골라 주세요.'];
        }
        $c = $this->get($uid);
        $c['pick'] = $this->alive($uid, $c['pick']);
        if (! $on) {
            unset($c['pick'][$key]);
            $this->put($uid, $c);

            return [true, '그만 받아요 — 기기와 기록은 그대로 남아요.'];
        }
        if (isset($c['pick'][$key])) {
            return [true, '이미 받는 중이에요.', ['id' => $c['pick'][$key]]];
        }
        $seen = $this->seen($uid);
        $name = trim($name) !== '' ? $name : (string) ($seen[$key]['name'] ?? $key);
        $name = mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $name)), 0, 60) ?: 'MQTT 센서';
        $r = $this->ha->save($uid, null, $this->ha->autoAttach($uid, $name) + ['name' => $name, 'target' => 'other', 'source' => 'mqtt']);   // 이름이 보관함 · 프린터 · 장비와 거의 같으면 거기에
        if (! $r[0]) {
            return $r;
        }
        $id = (int) $r[2]['id'];
        $c['pick'][$key] = $id;
        $this->put($uid, $c);
        if (isset($seen[$key])) {   // 이미 아는 값은 바로 (중계가 다음에 보낼 때까지 비어 있지 않게)
            $this->ha->ingest((string) DB::table(Schema::DEVICES)->where('id', $id)->value('token'), array_intersect_key($seen[$key], ['temperature' => 1, 'humidity' => 1]), 'mqtt');
        }

        return [true, '받기 시작했어요 — 📡 대기 칸에서 보관함 · 프린터에 붙여 주세요.', ['id' => $id]];
    }

    /** @param array<string, int> $pick @return array<string, int> 지운 기기는 뺌 */
    private function alive(int $uid, array $pick): array
    {
        if ($pick === []) {
            return [];
        }
        $ids = DB::table(Schema::DEVICES)->where('user_id', $uid)->whereIn('id', array_values($pick))->pluck('id')->map(fn ($v) => (int) $v)->all();

        return array_filter($pick, static fn ($id) => in_array((int) $id, $ids, true));
    }

    /** @return array<string, array{key: string, name: string, temperature?: float, humidity?: float, at: string}> */
    public function seen(int $uid): array
    {
        try {
            $v = Cache::get('iotl:mq:seen:'.$uid);
        } catch (\Throwable) {   // 캐시가 안 돼도 화면은 그려지게
            return [];
        }

        return is_array($v) ? $v : [];
    }

    /**
     * 중계가 부름 (연결 코드) — 찾은 토픽을 쌓고, 설정 · 고른 토픽의 받는 키 · 보내는 규칙을 돌려줌
     *
     * @param  list<mixed>  $seen
     * @param  array{id: string, name: string}|null  $srv
     * @return array<string, mixed>
     */
    public function relay(int $uid, array $seen, string $broker, ?array $srv, string $ver = '', string $ble = ''): array
    {
        $now = HaService::now();
        $all = $this->seen($uid);
        foreach (array_slice($seen, 0, self::MAX_SEEN) as $s) {
            $key = is_array($s) ? trim((string) ($s['key'] ?? '')) : '';
            if ($key === '' || strlen($key) > 200 || (! isset($all[$key]) && count($all) >= self::MAX_SEEN)) {
                continue;
            }
            $row = ['key' => $key, 'name' => mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', (string) ($s['name'] ?? ''))), 0, 60) ?: $key, 'at' => $now];
            foreach (['temperature' => [-40, 150], 'humidity' => [0, 100]] as $f => [$lo, $hi]) {
                if (isset($s[$f]) && is_numeric($s[$f]) && $s[$f] >= $lo && $s[$f] <= $hi) {
                    $row[$f] = round((float) $s[$f], 1);
                }
            }
            $all[$key] = $row + array_intersect_key($all[$key] ?? [], ['temperature' => 1, 'humidity' => 1]);
        }
        $old = (new \DateTimeImmutable($now))->modify('-'.self::SEEN_DAYS.' days')->format('Y-m-d H:i:s');
        $all = array_filter($all, static fn ($r) => (string) ($r['at'] ?? '') >= $old);
        $broker = mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $broker)), 0, 200);
        try {
            if ($seen !== []) {
                Cache::put('iotl:mq:seen:'.$uid, $all, now()->addDays(self::SEEN_DAYS));
            }
            $was = Cache::get('iotl:mq:relay:'.$uid);
            Cache::put('iotl:mq:relay:'.$uid, ['name' => $srv['name'] ?? '', 'id' => $srv['id'] ?? '', 'at' => $now, 'broker' => $broker === 'start' ? (string) ($was['broker'] ?? 'start') : $broker, 'ver' => mb_substr($ver, 0, 12), 'ble' => mb_substr(trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $ble)), 0, 120)], now()->addDays(30));   // 1.16.0 📶 윈도우 중계의 블루투스 (on · off · 까닭)   // start = 붙기 전 (지난 까닭을 그대로 둠)
        } catch (\Throwable) {
        }
        $c = $this->get($uid);
        $pick = $this->alive($uid, $c['pick']);
        if ($pick !== $c['pick']) {   // 사이트에서 지운 기기 — 그 토픽은 그만 받음
            $c['pick'] = $pick;
            $this->put($uid, $c);
        }
        $tok = $pick ? DB::table(Schema::DEVICES)->whereIn('id', array_values($pick))->pluck('token', 'id')->all() : [];
        $map = [];
        foreach ($pick as $k => $id) {
            if (isset($tok[$id])) {
                $map[$k] = (string) $tok[$id];
            }
        }
        if ($srv && $pick) {
            DB::table(Schema::DEVICES)->whereIn('id', array_values($pick))->where(fn ($q) => $q->whereNull('ha_server')->orWhere('ha_server', '!=', $srv['id'])->orWhereNull('ha_server_name')->orWhere('ha_server_name', '!=', $srv['name']))
                ->update(['ha_server' => $srv['id'], 'ha_server_name' => $srv['name']]);   // 어느 중계에서 오는지 (연결 지도)
        }
        $pace = $this->ha->pace($uid);
        $live = $c['host'] !== '';

        return ['config' => ['host' => $live ? $c['host'] : '', 'port' => $c['port'], 'user' => $c['user'], 'pass' => $c['pass'], 'tls' => $c['tls'], 'topics' => $c['topics']], 'rev' => self::rev($c),
            'map' => (object) $map, 'pace' => $pace + ['send_mode' => $pace['mode']]];
    }

    /** 화면에 보일 것 — 비밀번호는 빼고 (적혀 있는지만) · 1.16.5 처음에 남의 브로커 주소를 채워 두지 않음 (블루투스만 쓰는 사람이 헷갈림) @return array<string, mixed> */
    public function view(int $uid): array
    {
        $c = $this->get($uid);
        $pick = $this->alive($uid, $c['pick']);
        $seen = array_values(array_map(static fn ($r) => $r + ['device_id' => $pick[$r['key']] ?? null], $this->seen($uid)));
        usort($seen, static fn ($a, $b) => ((int) ($b['device_id'] !== null) <=> (int) ($a['device_id'] !== null)) ?: strcmp((string) $a['name'], (string) $b['name']));
        try {
            $relay = Cache::get('iotl:mq:relay:'.$uid);
        } catch (\Throwable) {
            $relay = null;
        }

        return ['host' => $c['host'], 'port' => $c['port'], 'user' => $c['user'], 'has_pass' => $c['pass'] !== '', 'tls' => $c['tls'], 'topics' => $c['topics'], 'saved' => $c['saved'] && $c['host'] !== '',
            'seen' => $seen, 'picked' => count($pick), 'relay' => is_array($relay) ? $relay : null, 'max_seen' => self::MAX_SEEN];
    }
}
