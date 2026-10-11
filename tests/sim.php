<?php

/**
 * 서버 쪽 흐름 검사 (SQLite 메모리): G7_VENDOR=C:/Users/gbook/source/g7-core/vendor php tests/sim.php
 */

declare(strict_types=1);

namespace App\Contracts\Extension {
    interface HookListenerInterface
    {
        public static function getSubscribedHooks(): array;

        public function handle(...$args): void;
    }
}

namespace {
    use Illuminate\Database\Capsule\Manager as Capsule;
    use Illuminate\Support\Facades\DB;
    use Plugins\Custom\IotLink\Listeners\IntegrationListener;
    use Plugins\Custom\IotLink\Services\HaService;
    use Plugins\Custom\IotLink\Services\SmartThingsService;
    use Plugins\Custom\IotLink\Support\Notify;
    use Plugins\Custom\IotLink\Support\Settings;

    require (getenv('G7_VENDOR') ?: 'C:/Users/gbook/source/g7-core/vendor').'/autoload.php';
    spl_autoload_register(function (string $c): void {
        $p = 'Plugins\\Custom\\IotLink\\';
        if (str_starts_with($c, $p) && is_file($f = dirname(__DIR__).'/src/'.str_replace('\\', '/', substr($c, strlen($p))).'.php')) {
            require $f;
        }
    });
    $app = new Illuminate\Container\Container();
    Illuminate\Container\Container::setInstance($app);
    $app->instance('config', new Illuminate\Config\Repository(['app' => ['url' => 'https://3ds.test', 'timezone' => 'UTC']]));
    $capsule = new Capsule($app);
    $capsule->addConnection(['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '']);
    $capsule->setAsGlobal();
    $capsule->bootEloquent();
    $app->instance('db', $capsule->getDatabaseManager());
    $app->bind('db.schema', fn () => $capsule->getConnection()->getSchemaBuilder());
    $app->instance('encrypter', new Illuminate\Encryption\Encrypter(random_bytes(32), 'AES-256-CBC'));   // 0.2.0 토큰 암호화
    Illuminate\Support\Facades\Facade::setFacadeApplication($app);
    if (! function_exists('now')) {
        function now()
        {
            return Illuminate\Support\Carbon::now();
        }
    }
    if (! function_exists('config')) {
        function config(string $k)
        {
            return Illuminate\Container\Container::getInstance()->make('config')->get($k);
        }
    }

    $pass = $fail = 0;
    function t(bool $ok, string $label): void
    {
        global $pass, $fail;
        echo ($ok ? '  ok   ' : '  FAIL ').$label."\n";
        $ok ? $pass++ : $fail++;
    }

    /** 1.2.0 프린터 라운지 0.1.28+ 흉내 — SmartThings 표시(via st) · 주변 온습도(env)를 앎 */
    final class FakePrinter28
    {
        public const IOT_CAPS = ['via_st', 'env'];

        public static array $got = [];

        public function hook(string $token, array $payload, string $via = 'ha'): array
        {
            self::$got[] = [$token, $payload, $via];

            return [true, 'ok'];
        }
    }

    /** 내 프린터 서비스 흉내 — 넘겨받은 것을 적어 둠 */
    final class FakePrinter
    {
        public static array $got = [];

        public function hook(string $token, array $payload): array
        {
            self::$got[] = [$token, $payload];

            return [true, 'ok'];
        }
    }

    $sb = DB::connection()->getSchemaBuilder();
    $sb->create('mpr_printers', function ($t) { $t->id(); $t->integer('user_id'); $t->string('brand'); $t->string('model'); $t->string('nickname')->nullable(); $t->string('hook_token'); $t->integer('sort')->default(0); });
    DB::table('mpr_printers')->insert([['id' => 5, 'user_id' => 1, 'brand' => 'Bambu Lab', 'model' => 'P1S', 'nickname' => '거실', 'hook_token' => str_repeat('a', 32)], ['id' => 7, 'user_id' => 2, 'brand' => 'X', 'model' => 'Y', 'nickname' => null, 'hook_token' => str_repeat('b', 32)]]);
    // 1.4.0 업체검색 · 재고 관리는 가짜 Api 로 (그 표를 만들지 않음 — 직접 읽지 않는지 함께 봄)
    final class FakeCompanies
    {
        public static function active(): bool
        {
            return true;
        }

        public static function companiesOf(int $uid, array $roles = ['owner', 'manager']): array
        {
            return ['1' => [['id' => 10, 'name' => '삼디 공방', 'kind' => 'shop', 'role' => 'owner']], '2' => [['id' => 11, 'name' => '남의 업체', 'kind' => 'shop', 'role' => 'owner']]][(string) $uid] ?? [];
        }
    }
    final class FakeInventory
    {
        public static bool $on = true;

        /** 개인 것: [회원, 이름, 재료, 위치, 상태] · 업체 것: [업체, 이름, 위치, 상태] */
        public static array $mine = [[1, 'PETG 검정', 'PETG', '드라이 박스', 'open'], [1, 'PLA 흰색', 'PLA', 'AMS', 'open'], [2, '남의 것', 'PA', '드라이박스', 'open']];

        public static array $company = [[10, 'eSun PETG 빨강', '드라이박스', 'in_use'], [11, 'PA', '드라이박스', 'in_use'], [10, 'PLA', '드라이박스', 'new']];

        public static function active(): bool
        {
            return self::$on;
        }

        public static function equipmentFor(array $cids, bool $publicOnly = false): array
        {
            $all = [10 => [['id' => 100, 'company_id' => 10, 'name' => 'Bambu Lab X1C', 'kind' => 'fdm', 'status' => 'ok']], 11 => [['id' => 102, 'company_id' => 11, 'name' => 'Elegoo Mars', 'kind' => 'sla', 'status' => 'ok']]];

            return array_intersect_key($all, array_flip($cids));
        }

        public static function spoolLocations(int $uid): array
        {
            $l = array_values(array_unique(array_map(fn ($s) => $s[3], array_filter(self::$mine, fn ($s) => $s[0] === $uid))));
            sort($l);

            return $l;
        }

        public static function spoolsAt(int $uid, string $location): array
        {
            $k = fn ($v) => mb_strtolower((string) preg_replace('/\s+/u', '', (string) $v));
            $cids = array_column(FakeCompanies::companiesOf($uid), 'id');

            return ['mine' => array_values(array_map(fn ($s) => $s[1].' ('.$s[2].')', array_filter(self::$mine, fn ($s) => $s[0] === $uid && $s[4] !== 'empty' && $k($s[3]) === $k($location)))),
                'company' => array_values(array_map(fn ($s) => $s[1], array_filter(self::$company, fn ($s) => in_array($s[0], $cids, true) && in_array($s[3], ['in_use', 'low'], true) && $k($s[2]) === $k($location))))];
        }
    }
    \Plugins\Custom\IotLink\Support\Links::$override = ['companies' => FakeCompanies::class, 'inventory' => FakeInventory::class];


    $svc = new HaService();
    HaService::$printerService = FakePrinter::class;
    HaService::$nowOverride = '2026-10-09 08:00:00';
    $sent = [];
    Notify::$override = function (int $uid, array $ch, string $sub, string $body) use (&$sent): void { $sent[] = [$uid, $ch, $sub, $body]; };

    echo "■ 기기 넣기\n";
    t(! $svc->save(1, null, ['target' => 'location', 'ent_hum' => 'sensor.box_humidity'])[0] && ! $svc->save(1, null, ['target' => 'location', 'location' => '드라이박스'])[0], '보관 위치 · 센서 이름이 있어야');
    [$ok, , $x] = $svc->save(1, null, ['target' => 'location', 'location' => '드라이박스', 'ent_hum' => 'sensor.Box_Humidity', 'ent_temp' => 'sensor.box_temperature', 'humidity_max' => 40]);
    $box = DB::table('hal_devices')->where('id', $x['id'] ?? 0)->first();
    t($ok && $box->name === '드라이박스' && strlen($box->token) === 32 && json_decode($box->entities, true)['hum'] === 'sensor.box_humidity' && (int) $box->humidity_max === 40, '보관함 센서 (이름은 위치에서 · 엔티티는 소문자)');
    t(! $svc->save(1, null, ['target' => 'printer', 'printer_id' => 7, 'ent_state' => 'sensor.x'])[0] && ! $svc->save(1, null, ['target' => 'equipment', 'equipment_id' => 102, 'ent_state' => 'sensor.x'])[0], '남의 프린터 · 남의 업체 장비에는 못 붙임');
    [$ok, , $x] = $svc->save(1, null, ['target' => 'printer', 'printer_id' => 5, 'ent_state' => 'sensor.p1s_print_status', 'ent_progress' => 'sensor.p1s_print_progress', 'ent_job' => 'sensor.p1s_task_name']);
    $prn = DB::table('hal_devices')->where('id', $x['id'] ?? 0)->first();
    [$ok2, , $x] = $svc->save(1, null, ['target' => 'equipment', 'equipment_id' => 100, 'ent_state' => 'switch.x1c_plug']);
    $eq = DB::table('hal_devices')->where('id', $x['id'] ?? 0)->first();
    t($ok && $prn->name === '거실 · Bambu Lab P1S' && $ok2 && (int) $eq->company_id === 10 && $eq->name === 'Bambu Lab X1C', '내 프린터 · 업체 장비에 붙임');
    Settings::save(['max_devices' => 3]);
    t(! $svc->save(1, null, ['target' => 'other', 'name' => '작업실', 'ent_temp' => 'sensor.room_t'])[0], '기기 수 제한');
    Settings::save(['max_devices' => 20]);

    echo "■ 받기\n";
    t(! $svc->ingest(str_repeat('f', 32), ['humidity' => 30])[0] && ! $svc->ingest('nope', [])[0], '모르는 주소는 안 받음');
    [$ok] = $svc->ingest($box->token, ['temperature' => '23.44', 'humidity' => '35.2']);
    $o = $svc->overview(1);
    $d = array_values(array_filter($o['devices'], fn ($v) => $v['id'] === (int) $box->id))[0];
    t($ok && $d['temp'] === 23.4 && $d['humidity'] === 35.2 && ! $d['stale'] && ! $d['over'] && count($d['history']) === 1 && $sent === [] && $o['config']['base'] === 'https://3ds.test/api/plugins/custom-iot_link/in/' && $o['locations'] === ['AMS', '드라이 박스'], '온습도 받음 · 기준 안 넘음');
    HaService::$nowOverride = '2026-10-09 08:20:00';
    $svc->ingest($box->token, ['temperature' => 'unavailable', 'humidity' => 47]);
    t(DB::table('hal_readings')->where('device_id', $box->id)->count() === 1 && (float) DB::table('hal_readings')->where('device_id', $box->id)->value('humidity') === 47.0 && (float) DB::table('hal_readings')->where('device_id', $box->id)->value('temp') === 23.4, '같은 시간은 한 줄 (마지막 값) · unavailable 은 건너뜀');
    t(count($sent) === 1 && $sent[0][0] === 1 && str_contains($sent[0][2], '습도가 높아요') && str_contains($sent[0][3], '습도 47% (기준 40%)') && str_contains($sent[0][3], 'PETG 검정 (PETG)') && ! str_contains($sent[0][3], '남의 것') && ! str_contains($sent[0][3], 'PLA 흰색')
        && str_contains($sent[0][3], '🏢 업체 재고: eSun PETG 빨강 —') && ! str_contains($sent[0][3], 'PA') , '기준을 넘으면 알림 — 그 보관함의 내 필라멘트 이름도 (빈칸 달라도 같은 위치)');
    HaService::$nowOverride = '2026-10-09 09:00:00';
    $svc->ingest($box->token, ['humidity' => 52]);
    t(count($sent) === 1, '계속 높아도 다시 보내지 않음');
    HaService::$nowOverride = '2026-10-09 10:00:00';
    $svc->ingest($box->token, ['humidity' => 39]);
    t(DB::table('hal_devices')->where('id', $box->id)->value('alerted_at') !== null, '기준 바로 아래(3% 안)는 아직 풀지 않음');
    $svc->ingest($box->token, ['humidity' => 30]);
    HaService::$nowOverride = '2026-10-09 11:00:00';
    $svc->ingest($box->token, ['humidity' => 45]);
    t(count($sent) === 2 && DB::table('hal_readings')->where('device_id', $box->id)->count() === 4, '내려갔다 다시 넘으면 또 알림 · 한 시간에 한 줄');

    echo "■ 0.1.5 자리 비움 — 회원이 화면을 안 보면 느리게\n";
    $svc->overview(1);   // 화면을 봄
    $r = $svc->ingest($box->token, ['humidity' => 30]);
    t($r[2]['next_min'] === 30 && $r[2]['mode'] === 'change' && $r[2]['change_hum'] === 1 && $r[2]['gap_sec'] === 60 && $r[2]['away'] === false && $r[2]['snap'] === true, '「변하면」 방식(기본): 변화가 없을 때의 신호 주기 30분 · 변해서 보낼 때 최소 60초');
    Settings::save(['send_mode' => 'interval']);
    $r = $svc->ingest($box->token, ['humidity' => 30]);
    t($r[2]['next_min'] === 10 && $r[2]['mode'] === 'interval' && $svc->hub(1)['send_mode'] === 'interval' && $svc->hub(1)['next_min'] === 10, '「주기적으로」 방식: 정한 주기');
    DB::table('hal_links')->where('user_id', 1)->update(['updated_at' => now()->subMinutes(45)]);
    $r = $svc->ingest($box->token, ['humidity' => 30]);
    t($r[2]['next_min'] === 60 && $r[2]['gap_sec'] === 600 && $r[2]['away'] === true && $r[2]['snap'] === false && $svc->pace(1, true)['snap'] === true, '30분 넘게 안 보면 느린 주기 · 사진은 안 받음 (공개 사진은 받음)');
    Settings::save(['away_after_min' => 0]);
    t($svc->ingest($box->token, ['humidity' => 30])[2]['next_min'] === 10, '기능을 끄면 늘 평소 주기');
    Settings::save(['away_after_min' => 30]);
    $svc->overview(1);
    t($svc->pace(1)['away'] === false, '화면을 다시 열면 평소 주기로');
    Settings::save(['send_mode' => 'change']);
    t($svc->hub(1)['next_min'] === 30 && $svc->hub(1)['send_mode'] === 'change', '허브: 통합이 켤 때 받아 가는 방식 · 주기');

    echo "■ 가동 시간 · 내 프린터\n";
    HaService::$nowOverride = '2026-10-09 12:00:00';
    $svc->ingest($prn->token, ['state' => 'running', 'progress' => '10', 'job' => 'benchy.3mf']);
    t(count(FakePrinter::$got) === 1 && FakePrinter::$got[0][0] === str_repeat('a', 32) && FakePrinter::$got[0][1] === ['state' => 'printing', 'progress' => 10.0, 'job' => 'benchy.3mf'] && DB::table('hal_runs')->where('device_id', $prn->id)->whereNull('ended_at')->count() === 1, '프린터 상태 → 내 프린터의 자동 연결로 넘김 · 가동 시작');
    HaService::$nowOverride = '2026-10-09 13:00:00';
    $svc->ingest($prn->token, ['state' => 'running', 'progress' => '60']);
    t(DB::table('hal_runs')->where('device_id', $prn->id)->count() === 1 && $svc->hours([(int) $prn->id], '2026-10-09 00:00:00') === 1.0, '계속 가동 — 구간은 하나 · 지금까지 1시간');
    HaService::$nowOverride = '2026-10-09 14:30:00';
    $svc->ingest($prn->token, ['state' => 'finish']);
    t($svc->hours([(int) $prn->id], '2026-10-09 00:00:00') === 2.5 && $svc->hours([(int) $prn->id], '2026-10-09 13:30:00') === 1.0 && DB::table('hal_devices')->where('id', $prn->id)->value('is_on') == 0, '끝나면 구간 닫음 · 그 뒤부터만 세기');
    $svc->ingest($eq->token, ['on' => true]);
    HaService::$nowOverride = '2026-10-10 09:00:00';
    $svc->ingest($eq->token, ['on' => true]);
    t(DB::table('hal_runs')->where('device_id', $eq->id)->count() === 2 && $svc->hours([(int) $eq->id], '2026-10-09 00:00:00') === 0.0 && count(FakePrinter::$got) === 3, '오래 끊겼다 오면 예전 구간은 마지막 소식 때로 닫음 (끊긴 동안은 안 셈) · 업체 장비는 내 프린터로 안 넘김');
    HaService::$nowOverride = '2026-10-10 11:00:00';
    $o = $svc->overview(1);
    $de = array_values(array_filter($o['devices'], fn ($v) => $v['id'] === (int) $eq->id))[0];
    $db = array_values(array_filter($o['devices'], fn ($v) => $v['id'] === (int) $box->id))[0];
    t($de['is_on'] && $de['where'] === 'Bambu Lab X1C' && $db['stale'] && ! $db['over'] && $svc->overview(2)['devices'] === [], '화면: 가동 중 · 오래된 값은 「끊김」(경고 아님) · 남의 기기는 안 보임');

    echo "■ 0.1.9 프린터 라운지와 맞춤\n";
    FakePrinter::$got = [];
    $svc->ingest($prn->token, ['state' => 'processing', 'temperature' => '41.5', 'humidity' => '22', 'remaining' => '1h 04m']);
    $svc->ingest($prn->token, ['temperature' => '42', 'humidity' => '23']);   // 상태 없이 온 값은 넘기지 않음 (그쪽이 출력을 닫지 않게)
    $svc->ingest($prn->token, ['state' => 'stopped']);
    t(count(FakePrinter::$got) === 2 && FakePrinter::$got[0][1] === ['state' => 'printing', 'remaining_min' => 64.0, 'chamber' => 41.5, 'humidity' => 22.0] && FakePrinter::$got[1][1] === ['state' => 'cancelled'], '모르는 가동 상태 → printing · 내부 온도 · 습도 같이 · 멈춤 → cancelled · 상태 없는 값은 안 넘김');

    echo "■ 연결 코드 · 허브 (HACS 통합)\n";
    $code = $svc->linkCode(1);
    t(strlen($code) === 32 && $svc->linkCode(1) === $code && $svc->linkUser($code) === 1 && $svc->linkUser(str_repeat('0', 32)) === 0 && $svc->linkUser('x') === 0 && $svc->overview(1)['link']['code'] === $code, '연결 코드 — 회원마다 하나 · 틀린 코드는 0');
    Settings::save(['interval_min' => 5]);
    t($svc->hub(1)['interval_min'] === 5 && $svc->overview(1)['config']['interval_min'] === 5, '0.1.3 값 보내는 주기 — 관리자 설정이 통합 · 설정 글에 전해짐');
    Settings::save(['interval_min' => 10]);
    $h = $svc->hub(1);
    t($h['locations'] === ['AMS', '드라이 박스'] && $h['printers'][0]['id'] === 5 && $h['printers'][0]['model'] === 'P1S' && $h['printers'][0]['nickname'] === '거실' && array_key_exists('printer_id', $h['devices'][0]) && $h['equipment'][0]['name'] === '삼디 공방 — Bambu Lab X1C' && count($h['devices']) === 3 && strlen($h['devices'][0]['token']) === 32 && $h['push_url'] === 'https://3ds.test/api/plugins/custom-iot_link/in/', '허브: 붙일 곳 목록 · 내 기기');
    [$ok, , $nd] = $svc->hubSave(1, null, ['target' => 'location', 'location' => 'AMS', 'ent_hum' => 'sensor.ams_humidity', 'humidity_max' => 30]);
    t($ok && $nd['name'] === 'AMS' && str_ends_with($nd['push_url'], '/in/'.$nd['token']) && $svc->ingest($nd['token'], ['humidity' => 20])[0], '통합이 기기를 만들고 그 주소로 보냄');
    [$ok, , $ud] = $svc->hubSave(1, $nd['id'], ['target' => 'location', 'location' => 'AMS', 'ent_hum' => 'sensor.ams2_humidity', 'humidity_max' => 35]);
    t($ok && $ud['token'] === $nd['token'] && (int) DB::table('hal_devices')->where('id', $nd['id'])->value('humidity_max') === 35 && ! $svc->hubSave(2, $nd['id'], ['target' => 'other', 'ent_temp' => 'sensor.x'])[0], '통합이 고침 (주소는 그대로) · 남의 기기는 못 고침');
    $svc->rotateLink(1);
    t($svc->linkUser($code) === 0 && $svc->linkUser($svc->linkCode(1)) === 1 && $svc->ingest($nd['token'], ['humidity' => 21])[0], '연결 코드를 새로 만들면 옛 코드는 안 됨 — 이미 만든 기기는 계속 보냄');
    $svc->delete(1, (int) $nd['id']);

    echo "■ 1.4.5 여러 기기 한 번에 지우기\n";
    $mk = fn (int $u, string $n) => (int) DB::table('hal_devices')->insertGetId(['user_id' => $u, 'token' => bin2hex(random_bytes(16)), 'name' => $n, 'target' => 'other', 'entities' => '{}', 'created_at' => '2026-10-11 00:00:00', 'updated_at' => '2026-10-11 00:00:00']);
    [$x1, $x2, $x3] = [$mk(1, '지울 1'), $mk(1, '지울 2'), $mk(2, '남의 것')];
    DB::table('hal_readings')->insert([['device_id' => $x1, 'at' => '2026-10-11 01:00:00', 'humidity' => 40], ['device_id' => $x3, 'at' => '2026-10-11 01:00:00', 'humidity' => 41]]);
    DB::table('hal_runs')->insert(['device_id' => $x2, 'started_at' => '2026-10-11 01:00:00']);
    [$dOk, $dMsg] = $svc->deleteMany(1, [$x1, (string) $x2, $x3, 'abc', 0, -5, $x1]);
    t($dOk && str_contains($dMsg, '2개') && ! DB::table('hal_devices')->whereIn('id', [$x1, $x2])->exists() && DB::table('hal_devices')->where('id', $x3)->exists()
        && ! DB::table('hal_readings')->where('device_id', $x1)->exists() && ! DB::table('hal_runs')->where('device_id', $x2)->exists() && DB::table('hal_readings')->where('device_id', $x3)->exists()
        && ! $svc->deleteMany(1, [])[0] && ! $svc->deleteMany(1, [$x3])[0] && ! $svc->deleteMany(0, [$x3])[0], '내 것만 지움 (남의 것 · 이상한 번호는 건너뜀) · 기록 · 가동 시간도 · 고른 게 없으면 안 됨');
    DB::table('hal_devices')->where('id', $x3)->delete();
    DB::table('hal_readings')->where('device_id', $x3)->delete();

    echo "■ 카메라 사진\n";
    $jpg = (string) base64_decode('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=');   // 1×1 JPEG (GD 없이)
    HaService::$nowOverride = '2026-10-10 11:10:00';
    t(! $svc->snapshot($prn->token, 'not an image at all '.str_repeat('x', 300))[0] && ! $svc->snapshot($prn->token, "\x89PNG".str_repeat('x', 300))[0] && ! $svc->snapshot(str_repeat('f', 32), $jpg)[0], 'JPEG 이 아니면 · 모르는 주소면 안 받음');
    [$ok, $msg] = $svc->snapshot($prn->token, $jpg);
    $pid = (int) $prn->id;
    t($ok && $msg === 'ok' && is_file(HaService::snapPath($pid)) && $svc->snapFile(1, $pid) !== null && $svc->snapFile(2, $pid) === null && array_values(array_filter($svc->overview(1)['devices'], fn ($v) => $v['id'] === $pid))[0]['snap_at'] === '2026-10-10 11:10:00', '사진 받음 — 주인만 봄');
    HaService::$nowOverride = '2026-10-10 11:12:00';
    t($svc->snapshot($prn->token, $jpg)[1] === 'skip', '정한 간격보다 잦으면 버림');
    HaService::$nowOverride = '2026-10-10 11:16:00';
    t($svc->snapshot($prn->token, $jpg)[1] === 'ok' && count(glob(dirname(HaService::snapPath($pid)).'/'.$pid.'.*')) === 1 && ! $svc->snapshot($eq->token, "\xFF\xD8\xFF".str_repeat('x', HaService::SNAP_MAX))[0], '기기마다 한 장만 (덮어씀) · 너무 크면 안 받음');
    $IL = new IntegrationListener();
    t($svc->publicSnap($pid) === null && $svc->printerSnapshot(5) === null && $IL->printerSnapshot('x', 5) === 'x', '사진은 기본 비공개');
    $svc->save(1, $pid, ['target' => 'printer', 'printer_id' => 5, 'ent_state' => 'sensor.p1s_print_status', 'snap_public' => true]);
    $ps = $IL->printerSnapshot(null, 5);
    t($svc->publicSnap($pid) !== null && is_array($ps) && str_starts_with($ps['url'], '/api/plugins/custom-iot_link/snap/'.$pid.'.jpg?t=') && $ps['at'] === '2026-10-10 11:16:00' && $IL->printerSnapshot(null, 7) === null && $svc->hub(1)['devices'] !== [], '회원이 공개로 두면 — 그 프린터의 사진 주소 (훅)');
    HaService::$nowOverride = '2026-10-12 11:16:00';
    t($svc->publicSnap($pid) === null, '하루 넘게 오래된 사진은 공개하지 않음');
    HaService::$nowOverride = '2026-10-10 11:16:00';
    $svc->save(1, $pid, ['target' => 'printer', 'printer_id' => 5, 'ent_state' => 'sensor.p1s_print_status', 'snap_public' => false]);
    t($svc->publicSnap($pid) === null, '다시 끄면 바로 비공개');
    $svc->delete(1, $pid);
    t(! is_file(HaService::snapPath($pid)), '기기를 지우면 사진도 지움');
    [, , $x] = $svc->save(1, null, ['target' => 'printer', 'printer_id' => 5, 'ent_state' => 'sensor.p1s_print_status']);
    $prn = DB::table('hal_devices')->where('id', $x['id'])->first();

    echo "■ 0.2.0 SmartThings (WebHook SmartApp)\n";
    // 서명 열쇠 — SmartThings 흉내 (key.smartthings.com 은 인증서 PEM 을 줌)
    $ossl = ['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA];
    $pk = openssl_pkey_new($ossl);
    $cert = '';
    openssl_x509_export(openssl_csr_sign(openssl_csr_new(['commonName' => 'key.smartthings.test'], $pk, $ossl), null, $pk, 1, $ossl), $cert);
    $evil = openssl_pkey_new($ossl);
    $calls = [];
    $stFail = ['subs' => false, 'token' => false];
    // 1.1.0 로그인 연결 흉내 — code → 설치 id · 구독 목록 · 기기 목록(지금 값과 함께) · 앱 등록
    $fake = ['v1' => true, 'codes' => ['CODE1' => 'ia-oauth-0001', 'CODE2' => 'ia-oauth-0002', 'CODE3' => 'ia-oauth-0001'], 'subs' => [], 'n' => 0, 'apps' => 201, 'used' => []];
    $capSt = static fn (string $id, array $status = []) => ['id' => $id, 'version' => 1] + ($status ? ['status' => $status] : []);
    $fakeDevices = [
        ['deviceId' => 'dev-th-0001', 'label' => '드라이박스 온습도계', 'components' => [['id' => 'main', 'capabilities' => [$capSt('temperatureMeasurement', ['temperature' => ['value' => 77, 'unit' => 'F']]), $capSt('relativeHumidityMeasurement', ['humidity' => ['value' => 33, 'unit' => '%']]), $capSt('battery', ['battery' => ['value' => 90, 'unit' => '%']]), $capSt('refresh')]]]],
        ['deviceId' => 'dev-plug-001', 'label' => '프린터 플러그', 'components' => [['id' => 'main', 'capabilities' => [$capSt('switch', ['switch' => ['value' => 'on']]), $capSt('powerMeter', ['power' => ['value' => 120.5, 'unit' => 'W']])]]]],
        ['deviceId' => 'dev-door-001', 'label' => '보관함 문', 'components' => [['id' => 'main', 'capabilities' => [$capSt('contactSensor', ['contact' => ['value' => 'closed']])]]]],
        ['deviceId' => 'dev-th-0002', 'label' => 'AMS', 'components' => [['id' => 'sub', 'capabilities' => [$capSt('battery', ['battery' => ['value' => 50, 'unit' => '%']])]], ['id' => 'main', 'capabilities' => [$capSt('relativeHumidityMeasurement', ['humidity' => ['value' => 21, 'unit' => '%']])]]]],
        ['deviceId' => 'dev-tv-00001', 'label' => '거실 TV', 'components' => [['id' => 'main', 'capabilities' => [$capSt('audioVolume')]]]],
    ];
    SmartThingsService::$inline = true;
    SmartThingsService::$http = function (string $m, string $url, array $h, ?string $b) use (&$calls, &$stFail, &$fake, $fakeDevices, $cert): array {
        $calls[] = [$m, $url, $h, $b];
        $j = static fn ($x) => json_encode($x);
        parse_str((string) $b, $form);
        if (str_ends_with($url, '/oauth/token') && ($form['grant_type'] ?? '') === 'authorization_code') {
            if (! $fake['v1'] && $url === 'https://api.smartthings.com/oauth/token') return [406, "Resource representation is only available with these types:\ntext/html"];   // 그 주소가 요청을 받지 않음 → 다음 곳
            $iid = $fake['codes'][$form['code'] ?? ''] ?? null;
            if ($iid === null || in_array($form['code'], $fake['used'], true)) return [400, '{"error":"invalid_grant","error_description":"Invalid authorization code"}'];
            $fake['used'][] = $form['code'];

            return [200, $j(['access_token' => 'AT-OAUTH-'.$form['code'], 'refresh_token' => 'RT-OAUTH-'.$form['code'], 'token_type' => 'bearer', 'expires_in' => 86399, 'scope' => 'r:devices:* r:locations:*', 'installed_app_id' => $iid])];
        }
        if (preg_match('#/installedapps/(ia-oauth-\d+)$#', $url, $x) && $m === 'GET') return [200, $j(['installedAppId' => $x[1], 'installedAppType' => 'API_ONLY', 'installedAppStatus' => 'AUTHORIZED', 'appId' => 'app-9999-0000', 'locationId' => 'loc-0000-1111'])];
        if (preg_match('#/installedapps/(ia-oauth-\d+)/subscriptions(?:/([\w-]+))?$#', $url, $x)) {
            $iid = $x[1];
            if ($m === 'GET') return [200, $j(['items' => array_values($fake['subs'][$iid] ?? [])])];
            if ($m === 'DELETE') { if (isset($x[2])) { unset($fake['subs'][$iid][$x[2]]); } else { $fake['subs'][$iid] = []; } return [200, '{"count":1}']; }
            if ($stFail['subs']) return [429, '{}'];
            $sid = 'sub-0000-'.(++$fake['n']);
            $fake['subs'][$iid][$sid] = ['id' => $sid, 'installedAppId' => $iid] + json_decode((string) $b, true);

            return [200, $j($fake['subs'][$iid][$sid])];
        }
        if (str_contains($url, '/devices?includeStatus=true')) return [200, $j(['items' => array_map(fn ($it) => in_array($it['deviceId'] ?? '', $fake['dead'] ?? [], true) ? ['components' => []] + $it : $it, array_merge($fakeDevices, $fake['extra'] ?? [])), '_links' => new stdClass()])];
        if (str_ends_with($url, '/v1/apps') && $m === 'POST') return $fake['apps'] === 201 ? [200, $j(['app' => ['appId' => 'app-auto-7777', 'appType' => 'API_ONLY'], 'oauthClientId' => 'cid-auto-7777', 'oauthClientSecret' => 'sec-auto-7777'])] : [$fake['apps'], '{"requestId":"r","error":{"code":"ForbiddenError","message":"Plan required","details":[]}}'];
        if (preg_match('#/v1/apps/[\w-]+/register$#', $url) && $m === 'PUT') return [202, '{}'];
        if (str_starts_with($url, 'https://key.smartthings.com/pl/')) return [200, $cert];
        if (str_contains($url, '/confirm-registration')) return [200, '{}'];
        if (str_ends_with($url, '/oauth/token')) return $stFail['token'] ? [401, '{"error":"invalid_grant"}'] : [200, $j(['access_token' => 'AT-NEW-'.count($calls), 'refresh_token' => 'RT-NEW-'.count($calls), 'expires_in' => 86399])];
        if (preg_match('#/locations/#', $url)) return [200, $j(['name' => '우리집', 'temperatureScale' => 'F'])];
        if (str_ends_with($url, '/subscriptions')) return $m === 'POST' && $stFail['subs'] ? [403, '{}'] : [200, '{}'];
        if (preg_match('#/devices/([^/]+)/health$#', $url, $x)) return [200, $j(['deviceId' => $x[1], 'state' => in_array($x[1], $fake['offline'] ?? [], true) ? 'OFFLINE' : 'ONLINE'])];   // 1.4.1
        if (preg_match('#/devices/([^/]+)/status$#', $url, $x) && in_array($x[1], $fake['dead'] ?? [], true)) return [404, '{}'];   // 1.4.5 정말 꺼짐
        if (preg_match('#/devices/([^/]+)/status$#', $url, $x)) {
            return [200, $j(['components' => ['main' => ['temperatureMeasurement' => ['temperature' => ['value' => 77, 'unit' => 'F']], 'relativeHumidityMeasurement' => ['humidity' => ['value' => 33, 'unit' => '%']],
                'contactSensor' => ['contact' => ['value' => 'closed']], 'powerMeter' => ['power' => ['value' => 2.5, 'unit' => 'W']]]]])];
        }
        if (preg_match('#/devices/([^/]+)$#', $url, $x)) return [200, $j(['deviceId' => $x[1], 'label' => ['dev-th-0001' => '드라이박스 온습도계', 'dev-door-001' => '보관함 문', 'dev-plug-001' => '프린터 플러그'][$x[1]] ?? '기기']) ];
        if (preg_match('#/installedapps/[^/]+$#', $url) && $m === 'DELETE') return [200, '{}'];

        return [404, '{}'];
    };
    $path = '/api/plugins/custom-iot_link/smartthings';
    $sign = function (array $body, $key = null, array $over = []) use ($pk, $path): array {
        $raw = json_encode($body);
        $date = gmdate('D, d M Y H:i:s \G\M\T', $over['time'] ?? time());
        $dg = 'SHA-256='.base64_encode(hash('sha256', $raw, true));
        openssl_sign("(request-target): post $path\ndigest: $dg\ndate: $date", $sig, $key ?? $pk, OPENSSL_ALGO_SHA256);
        $h = ['authorization' => 'Signature keyId="/pl/useast2/1b-75-test",signature="'.base64_encode($sig).'",headers="(request-target) digest date",algorithm="rsa-sha256"', 'digest' => $dg, 'date' => $date];

        return [$over['raw'] ?? $raw, array_merge($h, $over['h'] ?? [])];
    };
    $st = new SmartThingsService($svc);
    $send = function (array $body, $key = null, array $over = []) use ($st, $sign, $path): array {
        [$raw, $h] = $sign($body, $key, $over);

        return $st->handle('POST', [$path], $h, $raw);
    };
    HaService::$nowOverride = '2026-10-10 11:20:00';
    t($send(['lifecycle' => 'PING', 'pingData' => ['challenge' => 'abc']])[0] === 404, 'SmartThings 를 안 켰으면 404');
    Settings::save(['st_poll_min' => 0]);   // 1.4.1 시간을 건너뛰는 검사라 — 「값이 오래 안 오면 물어보기」는 그 검사에서만 켬
    Settings::save(['st_enabled' => true, 'st_client_id' => 'cid-1234-abcd', 'st_client_secret' => 'enc:'.Illuminate\Support\Facades\Crypt::encryptString('sec-ret')]);
    t(SmartThingsService::clientSecret() === 'sec-ret' && Settings::public()['st_client_secret'] === '' && Settings::public()['st_client_secret_set'] === true && ! str_contains(json_encode(Settings::public()), 'sec-ret'), 'Client Secret 은 암호화해 두고 밖으로 안 내보냄');

    echo "  · 서명\n";
    $ping = ['lifecycle' => 'PING', 'executionId' => 'e1', 'pingData' => ['challenge' => 'abc']];
    t($st->handle('POST', [$path], [], json_encode($ping))[0] === 401, '서명 없는 요청은 거부 (PING 도 — 기본)');
    t($send($ping) === [200, ['pingData' => ['challenge' => 'abc']]], '서명이 맞으면 PING 에 challenge');
    t($send($ping, $evil)[0] === 401, '다른 열쇠로 서명하면 거부');
    [$raw, $h] = $sign($ping);
    $req = Illuminate\Http\Request::create($path, 'POST', [], [], [], ['HTTP_AUTHORIZATION' => $h['authorization'], 'HTTP_DIGEST' => $h['digest'], 'HTTP_DATE' => $h['date'], 'CONTENT_TYPE' => 'application/json'], $raw);
    $res = (new Plugins\Custom\IotLink\Http\Controllers\SmartThingsController($st, $svc))->webhook($req);
    $req2 = Illuminate\Http\Request::create('/api/plugins/custom-iot_link/smartthingz', 'POST', [], [], [], ['HTTP_AUTHORIZATION' => $h['authorization'], 'HTTP_DIGEST' => $h['digest'], 'HTTP_DATE' => $h['date']], $raw);
    t($res->getStatusCode() === 200 && $res->getContent() === '{"pingData":{"challenge":"abc"}}' && (new Plugins\Custom\IotLink\Http\Controllers\SmartThingsController($st, $svc))->webhook($req2)->getStatusCode() === 401, '컨트롤러: 실제 요청의 (request-target) 로 확인 · 다른 경로로 보낸 서명은 거부');
    t($send($ping, null, ['raw' => json_encode(['lifecycle' => 'PING', 'pingData' => ['challenge' => 'evil']])])[0] === 401, '본문을 바꾸면 거부 (digest)');
    t($send($ping, null, ['time' => time() - 3600])[0] === 401, '오래된 Date 는 거부 (다시 보내기 공격)');
    t($send($ping, null, ['h' => ['authorization' => str_replace('rsa-sha256', 'hmac-sha256', $sign($ping)[1]['authorization'])]])[0] === 401, '알고리즘이 rsa-sha256 이 아니면 거부');
    t($send($ping, null, ['h' => ['authorization' => str_replace('/pl/useast2/1b-75-test', '/../../evil', $sign($ping)[1]['authorization'])]])[0] === 401, '이상한 keyId 는 거부 (공개 키 주소 밖으로 못 나감)');
    $keyCalls = count(array_filter($calls, fn ($c) => str_starts_with($c[1], 'https://key.smartthings.com/')));
    t($keyCalls === 1, '공개 키는 한 번 받아 둠 (keyId 마다 캐시)');
    Settings::save(['st_ping_unsigned' => true]);
    t($st->handle('POST', [$path], [], json_encode($ping)) === [200, ['pingData' => ['challenge' => 'abc']]] && $st->handle('POST', [$path], [], json_encode(['lifecycle' => 'INSTALL']))[0] === 401, '(예전) 서명 없는 PING 은 켰을 때만 — 다른 것은 여전히 거부');
    Settings::save(['st_ping_unsigned' => false, 'st_public_key' => $cert]);
    t(Settings::get('st_public_key') !== '' && $send($ping)[0] === 200, '관리자가 넣은 공개 키(PEM)로도 확인');
    Settings::save(['st_public_key' => '']);

    echo "  · CONFIRMATION · CONFIGURATION\n";
    $calls = [];
    t($send(['lifecycle' => 'CONFIRMATION', 'appId' => 'app-1111-2222', 'confirmationData' => ['appId' => 'app-1111-2222', 'confirmationUrl' => 'https://evil.example.com/x']])[0] === 400 && $calls === [], 'SmartThings 주소가 아니면 confirmationUrl 을 부르지 않음');
    $r = $send(['lifecycle' => 'CONFIRMATION', 'appId' => 'app-1111-2222', 'confirmationData' => ['appId' => 'app-1111-2222', 'confirmationUrl' => 'https://api.smartthings.com/v1/apps/app-1111-2222/confirm-registration?token=t']]);
    t($r === [200, ['targetUrl' => 'https://3ds.test/api/plugins/custom-iot_link/smartthings']] && $calls[0][0] === 'GET' && str_contains($calls[0][1], 'confirm-registration') && $st->adminInfo()['confirmed_at'] === '2026-10-10 11:20:00', 'CONFIRMATION → confirmationUrl 을 GET · targetUrl 답');
    Settings::save(['st_app_id' => 'app-1111-2222']);
    t($send(['lifecycle' => 'PING', 'appId' => 'other-app-999', 'pingData' => ['challenge' => 'x']])[0] === 403 && $send(['messageType' => 'PING', 'appId' => 'app-1111-2222', 'pingData' => ['challenge' => 'x']])[0] === 200, 'App ID 를 정하면 다른 앱의 요청은 거부 · messageType 도 읽음');
    $r = $send(['lifecycle' => 'CONFIGURATION', 'appId' => 'app-1111-2222', 'configurationData' => ['installedAppId' => 'ia-new-0001', 'phase' => 'INITIALIZE', 'config' => []]])[1];
    t($r['configurationData']['initialize']['permissions'] === ['r:devices:*', 'r:locations:*'] && $r['configurationData']['initialize']['firstPageId'] === '1', 'INITIALIZE — 권한 r:devices:* · r:locations:*');
    $p1 = $send(['lifecycle' => 'CONFIGURATION', 'configurationData' => ['installedAppId' => 'ia-new-0001', 'phase' => 'PAGE', 'pageId' => '1', 'config' => []]])[1]['configurationData']['page'];
    t($p1['nextPageId'] === '2' && $p1['complete'] === false && $p1['sections'][0]['settings'][1]['id'] === 'link_code' && $p1['sections'][0]['settings'][1]['required'] === true, '1쪽: 연결 코드 칸');
    t(! $st->createCode(2, (int) $box->id)[0], '남의 기기로는 코드를 못 만듦');
    [$ok] = $st->createCode(1, (int) $box->id);
    $code = str_replace('-', '', (string) $svc->overview(1)['smartthings']['code']['code']);
    t($ok && strlen($code) === 8 && $svc->overview(1)['smartthings']['code']['device_id'] === (int) $box->id && $svc->overview(1)['smartthings']['ready'], '회원이 일회용 코드를 만듦 (붙일 기기와 함께)');
    $cfgPage = fn (string $c) => ['link_code' => [['valueType' => 'STRING', 'stringConfig' => ['value' => $c]]]];
    $p2 = $send(['lifecycle' => 'CONFIGURATION', 'configurationData' => ['installedAppId' => 'ia-new-0001', 'phase' => 'PAGE', 'pageId' => '2', 'config' => $cfgPage('ZZZZ-ZZZZ')]])[1]['configurationData']['page'];
    t($p2['complete'] === false && str_contains(json_encode($p2, JSON_UNESCAPED_UNICODE), '코드가 맞지 않거나'), '2쪽: 틀린 코드면 끝낼 수 없음');
    $p2 = $send(['lifecycle' => 'CONFIGURATION', 'configurationData' => ['installedAppId' => 'ia-new-0001', 'phase' => 'PAGE', 'pageId' => '2', 'config' => $cfgPage(strtolower(substr($code, 0, 4)).' '.substr($code, 4))]])[1]['configurationData']['page'];
    $ids = []; foreach ($p2['sections'] as $sec) { foreach ($sec['settings'] as $x) { $ids[$x['id']] = $x; } }
    t($p2['complete'] === true && str_contains($p2['sections'][0]['name'], '드라이박스') && $ids['temp']['capabilities'] === ['temperatureMeasurement'] && $ids['temp']['multiple'] === false && $ids['contact']['multiple'] === true
        && isset($ids['hum'], $ids['power_switch'], $ids['power_meter'], $ids['motion'], $ids['presence'], $ids['water'], $ids['battery'], $ids['energy'], $ids['power_on_w']), '2쪽: 맞는 코드(소문자 · 빈칸 괜찮음) → capability 별 센서 고르기');

    echo "  · INSTALL · EVENT\n";
    $dc = fn (string $id) => [['valueType' => 'DEVICE', 'deviceConfig' => ['deviceId' => $id, 'componentId' => 'main']]];
    $config = $cfgPage($code) + ['temp' => $dc('dev-th-0001'), 'hum' => $dc('dev-th-0001'), 'contact' => $dc('dev-door-001'), 'power_meter' => $dc('dev-plug-001'), 'power_on_w' => [['valueType' => 'STRING', 'stringConfig' => ['value' => '15']]]];
    $calls = [];
    $sentBefore = count($sent);
    $r = $send(['lifecycle' => 'INSTALL', 'appId' => 'app-1111-2222', 'installData' => ['authToken' => 'AT-SECRET-1', 'refreshToken' => 'RT-SECRET-1', 'installedApp' => ['installedAppId' => 'ia-new-0001', 'locationId' => 'loc-0000-1111', 'config' => $config]]]);
    $in = DB::table('hal_st_installs')->where('installed_app_id', 'ia-new-0001')->first();
    t($r[0] === 200 && json_encode($r[1]) === '{"installData":{}}' && (int) $in->user_id === 1 && (int) $in->device_id === (int) $box->id && $in->location_id === 'loc-0000-1111' && $in->status === 'active', 'INSTALL → 회원 · 기기와 이음 · installData {}');
    t(! str_contains(json_encode(DB::table('hal_st_installs')->get()), 'SECRET') && $st->token($in) === 'AT-SECRET-1' && ! str_contains((string) $in->config, $code), '토큰은 암호화해 둠 (DB 에 글 그대로 없음) · 코드는 설정에 안 남김');
    $subs = array_values(array_filter($calls, fn ($c) => $c[0] === 'POST' && str_ends_with($c[1], '/installedapps/ia-new-0001/subscriptions')));
    $sb = array_map(fn ($c) => json_decode($c[3], true)['device'], $subs);
    t(count($subs) === 4 && $sb[0]['capability'] === 'temperatureMeasurement' && $sb[0]['deviceId'] === 'dev-th-0001' && $sb[0]['attribute'] === '*' && json_decode($subs[0][3], true)['sourceType'] === 'DEVICE'
        && in_array('Authorization: Bearer AT-SECRET-1', $subs[0][2], true) && str_starts_with($subs[0][1], 'https://api.smartthings.com/v1/installedapps/') && $calls[1][0] === 'DELETE', '구독: 예전 것 지우고 고른 센서마다 POST /v1/installedapps/{id}/subscriptions');
    $b = DB::table('hal_devices')->where('id', $box->id)->first();
    t($in->temp_scale === 'F' && (float) $b->temp === 25.0 && (float) $b->humidity === 33.0 && DB::table('hal_st_sensors')->where('install_id', $in->id)->count() === 4
        && DB::table('hal_st_sensors')->where('capability', 'contactSensor')->value('label') === '보관함 문', '처음 값: 77°F → 25°C 로 기기에 · 센서 이름 · 값 4줄');
    HaService::$nowOverride = '2026-10-10 11:25:00';
    $ev = fn (string $dev, string $cap, string $attr, $val, array $more = []) => ['eventTime' => '2026-10-10T02:25:00Z', 'eventType' => 'DEVICE_EVENT', 'deviceEvent' => ['eventId' => uniqid(), 'locationId' => 'loc-0000-1111', 'deviceId' => $dev, 'componentId' => 'main', 'capability' => $cap, 'attribute' => $attr, 'value' => $val, 'valueType' => 'number', 'stateChange' => true, 'subscriptionName' => 'x_0'] + $more];
    $r = $send(['lifecycle' => 'EVENT', 'appId' => 'app-1111-2222', 'eventData' => ['authToken' => 'EPHEMERAL', 'installedApp' => ['installedAppId' => 'ia-new-0001', 'locationId' => 'loc-0000-1111'], 'events' => [
        $ev('dev-th-0001', 'relativeHumidityMeasurement', 'humidity', 55), $ev('dev-th-0001', 'temperatureMeasurement', 'temperature', 86, ['unit' => 'F']), $ev('dev-door-001', 'contactSensor', 'contact', 'open'), $ev('dev-plug-001', 'powerMeter', 'power', 120.5),
        $ev('dev-not-chosen', 'temperatureMeasurement', 'temperature', 99)]]]);
    $b = DB::table('hal_devices')->where('id', $box->id)->first();
    t($r === [200, ['eventData' => new stdClass()]] || json_encode($r[1]) === '{"eventData":{}}', 'EVENT → eventData {}');
    t((float) $b->humidity === 55.0 && (float) $b->temp === 30.0 && $b->state === 'on' && (bool) $b->is_on && $b->last_seen_at === '2026-10-10 11:25:00', 'DEVICE_EVENT → 같은 받기: 습도 · 온도(86°F→30°C) · 전력 120W(기준 15W) → 가동 중');
    t(count($sent) === $sentBefore + 1 && str_contains($sent[count($sent) - 1][3], '습도 55%'), '습도 기준을 넘으면 HA 와 똑같이 알림');
    t(DB::table('hal_st_sensors')->where('st_device_id', 'dev-not-chosen')->doesntExist() && DB::table('hal_st_sensors')->where('capability', 'contactSensor')->value('value') === 'open', '고르지 않은 기기의 값은 버림 · 문 열림은 센서 값으로');
    $o = $svc->overview(1);
    $sts = $o['smartthings']['installs'][0];
    $bd = array_values(array_filter($o['devices'], fn ($v) => $v['id'] === (int) $box->id))[0];
    t($sts['location'] === '우리집' && $sts['device_name'] === '드라이박스' && $sts['status'] === 'active' && in_array('열림', array_column($sts['sensors'], 'value'), true) && in_array('30°C', array_column($sts['sensors'], 'value'), true)
        && count($bd['sensors']) === 4 && $svc->overview(2)['smartthings']['installs'] === [] && ! str_contains(json_encode($o), 'AT-SECRET'), '화면: 연결 상태 · 센서 값 · 시각 (기기 카드에도) · 남은 안 보임 · 토큰 안 나감');

    echo "  · 코드 · 토큰 · 고치기\n";
    $r = $send(['lifecycle' => 'INSTALL', 'installData' => ['authToken' => 'AT-2', 'refreshToken' => 'RT-2', 'installedApp' => ['installedAppId' => 'ia-other-0002', 'locationId' => 'loc-0000-2222', 'config' => $cfgPage($code) + ['temp' => $dc('dev-th-0001')]]]]);
    $in2 = DB::table('hal_st_installs')->where('installed_app_id', 'ia-other-0002')->first();
    t($r[0] === 200 && $in2->user_id === null && $in2->status === 'unlinked' && str_contains((string) $in2->last_error, '코드'), '코드는 한 번만 — 다시 쓰면 잇지 않음');
    $before = (float) DB::table('hal_devices')->where('id', $box->id)->value('temp');
    $send(['lifecycle' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-other-0002'], 'events' => [$ev('dev-th-0001', 'temperatureMeasurement', 'temperature', 50, ['unit' => 'C'])]]]);
    t((float) DB::table('hal_devices')->where('id', $box->id)->value('temp') === $before, '잇지 않은 설치의 값은 어느 기기에도 안 들어감');
    DB::table('hal_st_installs')->where('id', $in->id)->update(['token_expires_at' => '2026-10-10 11:00:00']);
    $calls = [];
    $tok = $st->token(DB::table('hal_st_installs')->where('id', $in->id)->first());
    $tc = $calls[0] ?? ['', '', [], ''];
    parse_str((string) $tc[3], $form);
    $in = DB::table('hal_st_installs')->where('id', $in->id)->first();
    t(str_starts_with((string) $tok, 'AT-NEW-') && $tc[1] === 'https://api.smartthings.com/oauth/token' && in_array('Authorization: Basic '.base64_encode('cid-1234-abcd:sec-ret'), $tc[2], true) && $form === ['grant_type' => 'refresh_token', 'client_id' => 'cid-1234-abcd', 'refresh_token' => 'RT-SECRET-1']
        && $st->token($in) === $tok && $in->refreshing_at === null && $in->token_expires_at > '2026-10-11 11:00:00' && ! str_contains(json_encode($in), 'RT-NEW'), '토큰이 끝나면 refresh_token 으로 새로 받음 (Basic · 둘 다 바꿔 암호화해 둠)');
    DB::table('hal_st_installs')->where('id', $in->id)->update(['token_expires_at' => '2026-10-10 11:00:00']);
    $stFail['token'] = true;
    $calls = [];
    t($st->token(DB::table('hal_st_installs')->where('id', $in->id)->first()) === null && count($calls) === 1 && str_contains((string) DB::table('hal_st_installs')->where('id', $in->id)->value('last_error'), '토큰'), '새로 받기가 거절되면(401) 다른 곳에 다시 묻지 않고 알림');
    $stFail['token'] = false;
    DB::table('hal_st_installs')->where('id', $in->id)->update(['refreshing_at' => '2026-10-10 11:24:50']);
    t($st->refresh(DB::table('hal_st_installs')->where('id', $in->id)->first()) === null, '다른 요청이 새로 받는 중이면 기다림 (한 번에 하나)');
    DB::table('hal_st_installs')->where('id', $in->id)->update(['refreshing_at' => null]);
    $r = $send(['lifecycle' => 'UPDATE', 'updateData' => ['authToken' => 'AT-3', 'refreshToken' => 'RT-3', 'installedApp' => ['installedAppId' => 'ia-new-0001', 'locationId' => 'loc-0000-1111', 'config' => ['temp' => $dc('dev-th-0001'), 'hum' => $dc('dev-th-0001')]], 'previousConfig' => []]]);
    $in = DB::table('hal_st_installs')->where('id', $in->id)->first();
    t(json_encode($r[1]) === '{"updateData":{}}' && (int) $in->user_id === 1 && (int) $in->device_id === (int) $box->id && $st->token($in) === 'AT-3' && DB::table('hal_st_sensors')->where('install_id', $in->id)->where('st_device_id', 'dev-door-001')->doesntExist(), 'UPDATE: 코드 없이도 이음 그대로 · 새 토큰 · 뺀 센서 값은 지움');
    $p1 = $send(['lifecycle' => 'CONFIGURATION', 'configurationData' => ['installedAppId' => 'ia-new-0001', 'phase' => 'PAGE', 'pageId' => '2', 'config' => []]])[1]['configurationData']['page'];
    t($p1['complete'] === true, '이미 이은 설치는 코드 없이 센서만 고침');
    $stFail['subs'] = true;
    $send(['lifecycle' => 'UPDATE', 'updateData' => ['authToken' => 'AT-4', 'refreshToken' => 'RT-4', 'installedApp' => ['installedAppId' => 'ia-new-0001', 'locationId' => 'loc-0000-1111', 'config' => ['temp' => $dc('dev-th-0001')]]]]);
    $stFail['subs'] = false;
    t(DB::table('hal_st_installs')->where('id', $in->id)->value('status') === 'error' && str_contains((string) DB::table('hal_st_installs')->where('id', $in->id)->value('last_error'), '구독'), '구독을 못 만들면 화면에 오류로');

    echo "  · 주인 확인 · 끊기 · UNINSTALL\n";
    t(! $st->relink(2, (int) $in->id, (int) $prn->id)[0] && ! $st->relink(1, (int) $in->id, 999)[0] && ! $st->disconnect(2, (int) $in->id)[0], '남의 연결은 못 바꾸고 못 끊음 · 남의(없는) 기기로는 못 이음');
    t($st->relink(1, (int) $in->id, (int) $prn->id)[0] && (int) DB::table('hal_st_installs')->where('id', $in->id)->value('device_id') === (int) $prn->id, '내 다른 기기로 바꿔 이음');
    $svc->delete(1, (int) $prn->id);
    t(DB::table('hal_st_installs')->where('id', $in->id)->value('device_id') === null && DB::table('hal_st_installs')->where('id', $in->id)->exists(), '이은 기기를 지우면 연결은 남고 기기만 비움');
    [, , $x] = $svc->save(1, null, ['target' => 'printer', 'printer_id' => 5, 'ent_state' => 'sensor.p1s_print_status']);
    $prn = DB::table('hal_devices')->where('id', $x['id'])->first();
    $calls = [];
    [$ok, $msg] = $st->disconnect(1, (int) $in->id);
    t($ok && str_contains($msg, '끊었어요') && $calls[array_key_last($calls)][0] === 'DELETE' && str_ends_with($calls[array_key_last($calls)][1], '/installedapps/ia-new-0001') && DB::table('hal_st_installs')->where('id', $in->id)->doesntExist() && DB::table('hal_st_sensors')->where('install_id', $in->id)->doesntExist(), '끊기: SmartThings 에서 앱 지우기 · 여기 토큰 · 값 지움');
    t(json_encode($send(['lifecycle' => 'UNINSTALL', 'uninstallData' => ['installedApp' => ['installedAppId' => 'ia-other-0002']]])[1]) === '{"uninstallData":{}}' && DB::table('hal_st_installs')->where('installed_app_id', 'ia-other-0002')->doesntExist(), 'UNINSTALL → 정리 · uninstallData {}');
    $st->createCode(1, null);
    $c2 = str_replace('-', '', (string) $svc->overview(1)['smartthings']['code']['code']);
    $send(['lifecycle' => 'INSTALL', 'installData' => ['authToken' => 'AT-5', 'refreshToken' => 'RT-5', 'installedApp' => ['installedAppId' => 'ia-third-0003', 'locationId' => 'loc-0000-1111', 'config' => $cfgPage($c2) + ['power_switch' => $dc('dev-plug-001')]]]]);
    $i3 = DB::table('hal_st_installs')->where('installed_app_id', 'ia-third-0003')->first();
    $nd = DB::table('hal_devices')->where('id', $i3->device_id)->first();
    $send(['lifecycle' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-third-0003'], 'events' => [$ev('dev-plug-001', 'switch', 'switch', 'on')]]]);
    t($nd->source === 'smartthings' && $nd->name === 'SmartThings' && (int) $nd->user_id === 1 && DB::table('hal_devices')->where('id', $nd->id)->value('state') === 'on' && $svc->save(1, (int) $nd->id, ['target' => 'other', 'name' => '건조기 플러그'])[0]
        && ! in_array((int) $nd->id, array_column($svc->hub(1)['devices'], 'id'), true), '기기를 안 고르면 새 SmartThings 기기 (센서 이름 없이 고칠 수 있음 · HA 통합에는 안 보임) · 스위치 → 가동 상태');
    $send(['lifecycle' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-third-0003'], 'events' => [['eventType' => 'INSTALLED_APP_LIFECYCLE_EVENT', 'installedAppLifecycleEvent' => ['installedAppId' => 'ia-third-0003', 'lifecycle' => 'DELETE', 'delete' => []]]]]]);
    t(DB::table('hal_st_installs')->where('installed_app_id', 'ia-third-0003')->doesntExist() && DB::table('hal_devices')->where('id', $nd->id)->exists(), 'EVENT 안의 DELETE(앱 지움)도 정리 — 사이트 기기 · 기록은 남김');
    $st->createCode(1, (int) $box->id);
    $send(['lifecycle' => 'INSTALL', 'installData' => ['authToken' => 'AT-6', 'refreshToken' => 'RT-6', 'installedApp' => ['installedAppId' => 'ia-four-0004', 'locationId' => 'loc-0000-1111', 'config' => $cfgPage(str_replace('-', '', (string) $svc->overview(1)['smartthings']['code']['code'])) + ['temp' => $dc('dev-th-0001')]]]]);
    t((int) DB::table('hal_st_installs')->where('installed_app_id', 'ia-four-0004')->value('user_id') === 1, '(회원 삭제 검사용 설치 하나 더)');

    echo "■ 1.1.0 SmartThings 로그인 연결 (API Access App · OAuth)\n";
    HaService::$nowOverride = '2026-10-11 09:00:00';
    $subsOf = function (string $iid) use (&$fake): array {
        return array_values(array_map(fn ($x) => $x['device']['deviceId'], $fake['subs'][$iid] ?? []));
    };
    t(! $st->oauthStart(0)[0], '로그인하지 않았으면 시작하지 못함');
    [$ok, , $d] = $st->oauthStart(1);
    parse_str((string) parse_url((string) ($d['url'] ?? ''), PHP_URL_QUERY), $q);
    t($ok && str_starts_with($d['url'], 'https://api.smartthings.com/oauth/authorize?') && $q['client_id'] === 'cid-1234-abcd' && $q['response_type'] === 'code' && $q['redirect_uri'] === 'https://3ds.test/iot-link'
        && $q['scope'] === 'r:devices:* r:locations:*' && preg_match('/^[a-f0-9]{40}$/', $q['state']) === 1, '연결하기 → SmartThings 로그인 주소 (돌아올 곳 = 회원 화면 · 읽기 권한만 · 일회용 state)');
    $state = $q['state'];
    $calls = [];
    t(! $st->oauthFinish(2, 'CODE1', $state)[0] && ! $st->oauthFinish(1, 'CODE1', str_repeat('0', 40))[0] && ! $st->oauthFinish(1, 'bad code!', $state)[0] && $calls === [], '남의 state · 모르는 state · 이상한 code 는 거부 (SmartThings 에 묻지도 않음)');
    $fake['v1'] = false;
    [$ok, $msg, $d] = $st->oauthFinish(1, 'CODE1', $state);
    $fake['v1'] = true;
    $oi = DB::table('hal_st_installs')->where('installed_app_id', 'ia-oauth-0001')->first();
    $tcs = array_values(array_filter($calls, fn ($c) => str_ends_with($c[1], '/oauth/token')));
    parse_str((string) $tcs[1][3], $form);
    t($ok && $d === ['install_id' => (int) $oi->id, 'choose' => true] && count($tcs) === 2 && $tcs[0][1] === 'https://api.smartthings.com/oauth/token' && $tcs[1][1] === 'https://auth-global.api.smartthings.com/oauth/token'
        && $form === ['grant_type' => 'authorization_code', 'code' => 'CODE1', 'client_id' => 'cid-1234-abcd', 'redirect_uri' => 'https://3ds.test/iot-link'] && in_array('Authorization: Basic '.base64_encode('cid-1234-abcd:sec-ret'), $tcs[1][2], true),
        '돌아옴 → code 를 토큰으로 (Basic · redirect_uri 같게 · 그 주소가 요청을 받지 않으면(406) 다음 곳)');
    t((int) $oi->user_id === 1 && $oi->location_id === 'loc-0000-1111' && $oi->location_name === '우리집' && $oi->temp_scale === 'F' && $oi->status === 'choose' && $st->token($oi) === 'AT-OAUTH-CODE1'
        && ! str_contains(json_encode($oi), 'OAUTH-CODE1') && $oi->token_expires_at > '2026-10-12 08:00:00', '설치를 그 회원에게 이음 · 위치 이름 · 온도 단위 · 토큰은 암호화 · 「센서를 골라 주세요」');
    t(Settings::get('st_app_id') === 'app-9999-0000', 'App ID 를 안 적었거나 틀려도 우리 Client 로 받은 설치의 앱으로 맞춤 (틀리면 값 받기가 403)');
    $calls = [];
    t(! $st->oauthFinish(1, 'CODE2', $state)[0] && $calls === [], 'state 는 한 번만');
    [, , $d] = $st->oauthStart(1);
    parse_str((string) parse_url($d['url'], PHP_URL_QUERY), $q);
    [$ok, $msg] = $st->oauthFinish(1, 'NOPE', $q['state']);
    t(! $ok && str_contains($msg, 'HTTP 400') && str_contains($msg, 'Invalid authorization code') && str_contains($msg, '무료 이용이 중지'), 'SmartThings 가 받아 주지 않으면 그 답 + 유료 이용제 전환 때문일 수 있다고 알림');
    $o = $svc->overview(1);
    $me = array_values(array_filter($o['smartthings']['installs'], fn ($x) => $x['id'] === (int) $oi->id))[0];
    t($o['smartthings']['oauth'] === true && $o['smartthings']['code_flow'] === false && $me['mode'] === 'oauth' && $me['status'] === 'choose' && $me['picked'] === 0 && $me['location'] === '우리집', '화면 값: 로그인 연결 쓸 수 있음 · 예전 코드 방식은 꺼짐 · 설치(위치)');

    echo "  · 센서 고르기\n";
    [$ok, , $list] = $st->oauthDevices(1, (int) $oi->id);
    $L = array_column($list['devices'], null, 'id');
    t($ok && ! $st->oauthDevices(2, (int) $oi->id)[0] && array_keys($L) === ['dev-th-0002', 'dev-th-0001', 'dev-plug-001', 'dev-door-001'] && ! isset($L['dev-tv-00001']) && $list['location'] === '우리집' && $list['max'] === 30,
        '목록: 받을 값이 있는 기기만 (TV 는 빠짐) · 온습도계가 먼저 · 남의 연결은 못 봄');
    t($L['dev-th-0001']['values'] === [['what' => '온도', 'value' => '25°C'], ['what' => '습도', 'value' => '33%'], ['what' => '배터리', 'value' => '90%']] && $L['dev-plug-001']['values'][1] === ['what' => '전력', 'value' => '120.5 W']
        && $L['dev-th-0001']['picked'] === false && $L['dev-th-0001']['suggest'] === null && $L['dev-door-001']['kind'] === 'other', '목록: 지금 값(77°F → 25°C) · 아직 안 고름');
    $before = DB::table('hal_devices')->where('user_id', 1)->count();
    $calls = [];
    [$ok, $msg] = $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001', 'site_device_id' => (int) $box->id], ['id' => 'dev-plug-001', 'site_device_id' => null], ['id' => 'dev-th-0002'], ['id' => 'dev-tv-00001'], ['id' => 'dev-nope-0000'], ['id' => 'dev-plug-001']], 15);
    $oi = DB::table('hal_st_installs')->where('id', $oi->id)->first();
    $cfg = json_decode((string) $oi->config, true);
    $plug = DB::table('hal_devices')->where('id', $cfg['map']['dev-plug-001'] ?? 0)->first();
    $ams = DB::table('hal_devices')->where('id', $cfg['map']['dev-th-0002'] ?? 0)->first();
    t($ok && str_contains($msg, '센서 3개') && str_contains($msg, '새 기기 2개') && array_keys($cfg['map']) === ['dev-th-0001', 'dev-plug-001', 'dev-th-0002'] && $cfg['map']['dev-th-0001'] === (int) $box->id && $cfg['mode'] === 'oauth' && (float) $cfg['power_on_w'] === 15.0
        && DB::table('hal_devices')->where('user_id', 1)->count() === $before + 2, '고른 것 저장: 기기 하나가 사이트 기기 하나 (고른 내 기기 · 없으면 새로) · 못 받는 기기 · 없는 기기 · 두 번 온 것은 뺌');
    t($plug->name === '프린터 플러그' && $plug->source === 'smartthings' && $plug->target === 'other' && $ams->name === 'AMS' && $ams->target === 'location' && $ams->location === 'AMS', '새 기기 이름 = SmartThings 이름 · 필라멘트 보관 위치와 이름이 같으면 그 보관함에 붙임');
    $b = DB::table('hal_devices')->where('id', $box->id)->first();
    t((float) $b->temp === 25.0 && (float) $b->humidity === 33.0 && $plug->state === 'on' && (bool) $plug->is_on && (float) $ams->humidity === 21.0 && $oi->status === 'active'
        && DB::table('hal_st_sensors')->where('install_id', $oi->id)->count() === 7 && DB::table('hal_st_sensors')->where('install_id', $oi->id)->where('st_device_id', 'dev-th-0002')->where('capability', 'battery')->value('component_id') === 'sub',
        '지금 값이 바로 들어감 (온습도 · 전력 120W ≥ 15W → 가동 중 · main 이 아닌 칸의 값도)');
    $posts = array_values(array_filter($calls, fn ($c) => $c[0] === 'POST' && str_ends_with($c[1], '/installedapps/ia-oauth-0001/subscriptions')));
    $sb = json_decode($posts[0][3], true);
    t(count($posts) === 3 && $sb['sourceType'] === 'DEVICE' && $sb['device']['capability'] === '*' && $sb['device']['attribute'] === '*' && $sb['device']['stateChangeOnly'] === true && strlen($sb['device']['subscriptionName']) <= 36
        && $subsOf('ia-oauth-0001') === ['dev-th-0001', 'dev-plug-001', 'dev-th-0002'] && in_array('Authorization: Bearer AT-OAUTH-CODE1', $posts[0][2], true), '구독: 고른 기기마다 하나 (그 기기의 모든 값 · 바뀔 때만)');
    $calls = [];
    $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001'], ['id' => 'dev-th-0002'], ['id' => 'dev-door-001', 'site_device_id' => (int) $box->id], ['id' => 'dev-plug-001', 'site_device_id' => (int) DB::table('hal_devices')->where('user_id', 2)->value('id')]]);
    $cfg = json_decode((string) DB::table('hal_st_installs')->where('id', $oi->id)->value('config'), true);
    $posts = array_values(array_filter($calls, fn ($c) => $c[0] === 'POST' && str_ends_with($c[1], '/subscriptions')));
    t(count($posts) === 1 && json_decode($posts[0][3], true)['device']['deviceId'] === 'dev-door-001' && ! array_filter($calls, fn ($c) => $c[0] === 'DELETE') && $cfg['map']['dev-th-0001'] === (int) $box->id && $cfg['map']['dev-door-001'] === (int) $box->id
        && $cfg['map']['dev-plug-001'] === (int) $plug->id && (float) $cfg['power_on_w'] === 15.0, '다시 저장: 있는 구독은 그대로 · 새 것만 만듦 · 붙인 곳은 그대로 · 남의 기기로는 못 붙임 (예전 것 그대로) · 두 센서를 한 기기에');
    [, , $list] = $st->oauthDevices(1, (int) $oi->id);
    $L = array_column($list['devices'], null, 'id');
    t($L['dev-th-0001']['picked'] && $L['dev-th-0001']['site_device_id'] === (int) $box->id && $L['dev-plug-001']['suggest'] === (int) $plug->id, '목록: 고른 것 · 붙은 사이트 기기');

    echo "  · 값 받기 (같은 받는 곳 · 서명 확인)\n";
    HaService::$nowOverride = '2026-10-11 09:10:00';
    $sentBefore = count($sent);
    $r = $send(['messageType' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-oauth-0001', 'locationId' => 'loc-0000-1111'], 'events' => [
        $ev('dev-th-0001', 'relativeHumidityMeasurement', 'humidity', 61), $ev('dev-th-0001', 'temperatureMeasurement', 'temperature', 68), $ev('dev-plug-001', 'powerMeter', 'power', 3.2), $ev('dev-plug-001', 'switch', 'switch', 'on'),
        $ev('dev-th-0002', 'relativeHumidityMeasurement', 'humidity', 19), $ev('dev-door-001', 'contactSensor', 'contact', 'open'), $ev('dev-th-0001', 'refresh', 'x', 1), $ev('dev-tv-00001', 'switch', 'switch', 'on')]]]);
    $b = DB::table('hal_devices')->where('id', $box->id)->first();
    $plug = DB::table('hal_devices')->where('id', $plug->id)->first();
    t($r[0] === 200 && (float) $b->humidity === 61.0 && (float) $b->temp === 20.0 && $b->last_seen_at === '2026-10-11 09:10:00' && $plug->state === 'off' && ! (bool) $plug->is_on && (float) DB::table('hal_devices')->where('id', $ams->id)->value('humidity') === 19.0
        && DB::table('hal_st_sensors')->where('st_device_id', 'dev-tv-00001')->doesntExist() && DB::table('hal_st_sensors')->where('capability', 'refresh')->doesntExist(),
        'EVENT(messageType) → 센서마다 그 사이트 기기로: 습도 · 온도(68°F → 20°C · 위치 단위) · 전력 3.2W < 15W → 쉬는 중 (스위치가 켜져 있어도) · 안 고른 기기 · 모르는 값은 버림');
    t(count($sent) === $sentBefore + 1 && str_contains($sent[count($sent) - 1][3], '습도 61%'), '습도 기준을 넘으면 알림 (HA 와 같은 길)');
    $o = $svc->overview(1);
    $me = array_values(array_filter($o['smartthings']['installs'], fn ($x) => $x['id'] === (int) $oi->id))[0];
    $card = fn (int $id) => array_values(array_filter($o['devices'], fn ($v) => $v['id'] === $id))[0];
    $onBox = array_values(array_filter($card((int) $box->id)['sensors'], fn ($x) => in_array($x['label'], ['드라이박스 온습도계', '보관함 문'], true) && $x['at'] >= '2026-10-11'));
    t($me['picked'] === 4 && $me['status'] === 'active' && count($me['site_devices']) === 3 && $me['sensors'] === [] && array_column($onBox, 'what') === ['배터리', '습도', '온도', '열림'] && array_column($onBox, 'value') === ['90%', '61%', '20°C', '열림']
        && count($card((int) $box->id)['sensors']) >= 4 && array_column($card((int) $plug->id)['sensors'], 'value') === ['3.2 W', '켜짐'] && $card((int) $plug->id)['source'] === 'smartthings' && ! str_contains(json_encode($o), 'OAUTH-CODE'),
        '화면: 기기 카드마다 그 센서 값 (문 센서 + 온습도계가 한 카드에 · 단위 없는 값에도 W) · 토큰은 안 나감');

    echo "  · 1.4.1 값이 오래 안 오면 지금 값을 물어봄 (끊김 풀기 · 다시 잇기)\n";
    $keep = DB::table('hal_devices')->whereIn('id', [(int) $box->id, (int) $ams->id])->pluck('last_seen_at', 'id');
    HaService::$nowOverride = '2026-10-11 13:30:00';   // 마지막 값 09:10 — 4시간 넘게 소식 없음 (값이 그대로라 SmartThings 가 안 보냄)
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['status' => 'error', 'last_error' => '구독 1개를 만들지 못했어요']);
    $fake['offline'] = $fake['dead'] = ['dev-th-0002'];   // AMS 쪽 온습도계는 정말 꺼짐 (값도 못 받음)
    $fake['subs']['ia-oauth-0001'] = array_slice($fake['subs']['ia-oauth-0001'] ?? [], 0, 1, true);   // 구독이 빠짐
    Settings::save(['st_poll_min' => 60]);
    $calls = [];
    $st->pollDue([1]);
    $bx = DB::table('hal_devices')->where('id', $box->id)->first();
    $am = DB::table('hal_devices')->where('id', $ams->id)->first();
    $in = DB::table('hal_st_installs')->where('id', $oi->id)->first();
    $healthAsked = count(array_filter($calls, fn ($c) => str_contains($c[1], '/health')));
    $reSub = count(array_filter($calls, fn ($c) => $c[0] === 'POST' && str_ends_with($c[1], '/subscriptions')));
    t($bx->last_seen_at === '2026-10-11 13:30:00' && $am->last_seen_at === $keep[(int) $ams->id] && $in->polled_at === '2026-10-11 13:30:00' && $in->status === 'active' && $in->last_error === null && $healthAsked >= 2 && $reSub >= 1,
        '오래 소식 없는 설치 → 켜진 기기는 지금 값으로 「받음」(끊김 풀림) · OFFLINE 기기는 끊김 그대로 · 빠진 구독은 다시 만들고 오류 풀림');
    $calls = [];
    $st->pollDue([1]);
    $st->pollDue([2, 0]);
    Settings::save(['st_poll_min' => 0]);
    HaService::$nowOverride = '2026-10-11 20:00:00';
    $st->pollDue([1]);
    t($calls === [] && Settings::get('st_poll_min') === 0, '같은 설치는 st_poll_min 안에 다시 안 물음 · 다른 회원 것은 안 건드림 · 0 이면 끔');
    Settings::save(['st_poll_min' => 5]);
    t(Settings::get('st_poll_min') === 15, '설정 st_poll_min (15~1440)');
    Settings::save(['st_poll_min' => 0]);
    unset($fake['offline'], $fake['dead']);
    DB::table('hal_readings')->where('at', '>=', '2026-10-11 10:00:00')->where('at', '<', '2026-10-11 14:00:00')->delete();   // 이 검사가 넣은 시간별 기록
    foreach ($keep as $kid => $kv) {
        DB::table('hal_devices')->where('id', $kid)->update(['last_seen_at' => $kv]);
    }
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['last_event_at' => '2026-10-11 09:10:00', 'polled_at' => null]);
    HaService::$nowOverride = '2026-10-11 09:10:00';

    // 컨트롤러 — 로그인한 회원의 것만 · 답에 화면 값(overview)을 같이
    $STC = new Plugins\Custom\IotLink\Http\Controllers\SmartThingsController($st, $svc);
    $as = function (int $uid, string $method, array $body = []) {
        $r = Illuminate\Http\Request::create('/x', $method, [], [], [], ['CONTENT_TYPE' => 'application/json'], json_encode($body));
        $r->setUserResolver(fn () => $uid ? (object) ['id' => $uid] : null);

        return $r;
    };
    $js = fn ($res) => json_decode($res->getContent(), true);
    $r1 = $STC->oauthStart($as(1, 'POST'));
    $r2 = $STC->devices($as(1, 'GET'), (int) $oi->id);
    $r3 = $STC->pick($as(1, 'PUT', ['devices' => [['id' => 'dev-th-0001'], ['id' => 'dev-th-0002'], ['id' => 'dev-door-001'], ['id' => 'dev-plug-001']], 'power_on_w' => '15']), (int) $oi->id);
    t($r1->getStatusCode() === 200 && str_starts_with($js($r1)['data']['url'], 'https://api.smartthings.com/oauth/authorize?') && ! isset($js($r1)['data']['overview']) && $STC->oauthStart($as(0, 'POST'))->getStatusCode() === 422
        && count($js($r2)['data']['devices']) === 4 && $STC->devices($as(2, 'GET'), (int) $oi->id)->getStatusCode() === 422 && $r3->getStatusCode() === 200 && isset($js($r3)['data']['overview']['devices']) && str_contains($js($r3)['message'], '센서 4개')
        && $STC->pick($as(2, 'PUT', ['devices' => []]), (int) $oi->id)->getStatusCode() === 422 && $STC->oauthFinish($as(1, 'POST', ['code' => ['x'], 'state' => null]))->getStatusCode() === 422 && $r3->headers->get('Cache-Control') !== null
        && str_contains((string) $r3->headers->get('Cache-Control'), 'no-store'), '컨트롤러: 시작 · 목록 · 저장 (내 것만 · 이상한 입력은 422 · 캐시하지 않음)');

    echo "  · 1.4.2 기기 카드마다 봄 (자주 바뀌는 센서가 있어도) · 「🔄 다시 잇기」\n";
    $keep = DB::table('hal_devices')->whereIn('id', [(int) $box->id, (int) $ams->id])->pluck('last_seen_at', 'id');
    $keepI = DB::table('hal_st_installs')->where('id', $oi->id)->first();
    HaService::$nowOverride = '2026-10-11 13:30:00';
    DB::table('hal_devices')->whereIn('id', [(int) $box->id, (int) $ams->id])->update(['last_seen_at' => '2026-10-11 09:10:00']);
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['last_event_at' => '2026-10-11 13:20:00', 'polled_at' => null]);   // 문 센서 · 플러그는 10분 전에 값을 보냄 — 온습도계만 조용함
    Settings::save(['st_poll_min' => 60]);
    $st->pollDue([1]);
    $polled = DB::table('hal_devices')->where('id', $box->id)->value('last_seen_at') === '2026-10-11 13:30:00';
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['polled_at' => null]);
    DB::table('hal_devices')->whereIn('id', [(int) $box->id, (int) $ams->id])->update(['last_seen_at' => '2026-10-11 13:00:00']);
    $calls = [];
    $st->pollDue([1]);
    t($polled && $calls === [], '같은 위치의 다른 센서가 값을 보내도, 조용한 기기 카드가 있으면 지금 값을 물어봄 · 모두 새 값이면 안 물음');
    Settings::save(['st_poll_min' => 0]);
    HaService::$nowOverride = '2026-10-11 15:00:00';
    DB::table('hal_devices')->where('id', $box->id)->update(['last_seen_at' => '2026-10-11 09:10:00']);
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['status' => 'error', 'last_error' => '구독 1개를 만들지 못했어요', 'polled_at' => '2026-10-11 14:59:00']);
    $fake['offline'] = $fake['dead'] = ['dev-th-0002'];
    [$rOk, $rMsg] = $st->reviveNow(1);
    $in = DB::table('hal_st_installs')->where('id', $oi->id)->first();
    $rv = $STC->revive($as(1, 'POST'));
    t($rOk && str_contains($rMsg, '다시 이었어요') && str_contains($rMsg, '오프라인') && DB::table('hal_devices')->where('id', $box->id)->value('last_seen_at') === '2026-10-11 15:00:00' && $in->status === 'active' && $in->last_error === null
        && $st->reviveNow(0)[0] === false && $rv->getStatusCode() === 200 && isset($js($rv)['data']['overview']['devices']) && $STC->revive($as(0, 'POST'))->getStatusCode() === 422,
        '「🔄 다시 잇기」: 끈 설정(st_poll_min 0)이어도 바로 · 켜진 기기는 지금 값 · 오프라인 기기는 알려 줌 · 오류 풀림 · 로그인 안 했으면 422');
    unset($fake['offline'], $fake['dead']);
    DB::table('hal_readings')->where('at', '>=', '2026-10-11 10:00:00')->where('at', '<', '2026-10-11 16:00:00')->delete();
    foreach ($keep as $kid => $kv) {
        DB::table('hal_devices')->where('id', $kid)->update(['last_seen_at' => $kv]);
    }
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['status' => $keepI->status, 'last_error' => $keepI->last_error, 'last_event_at' => $keepI->last_event_at, 'polled_at' => $keepI->polled_at]);
    HaService::$nowOverride = '2026-10-11 09:10:00';

    echo "  · 1.4.4 스케줄 — 화면을 안 봐도 저절로 다시 잇기 (custom-iot_link:st-poll)\n";
    $keep = DB::table('hal_devices')->whereIn('id', [(int) $box->id, (int) $ams->id])->pluck('last_seen_at', 'id');
    $keepI = DB::table('hal_st_installs')->where('id', $oi->id)->first();
    HaService::$nowOverride = '2026-10-11 18:00:00';
    DB::table('hal_devices')->where('id', $box->id)->update(['last_seen_at' => '2026-10-11 12:00:00']);
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['last_event_at' => '2026-10-11 17:55:00', 'polled_at' => null, 'token_checked_at' => '2026-10-11 17:00:00']);
    Settings::save(['st_poll_min' => 60]);
    $a1 = $st->pollAll();
    $back = DB::table('hal_devices')->where('id', $box->id)->value('last_seen_at') === '2026-10-11 18:00:00';
    $calls = [];
    $a2 = $st->pollAll();
    Settings::save(['st_poll_min' => 0]);
    $a3 = $st->pollAll();
    t($back && $a1['polled'] >= 1 && $a2['polled'] === 0 && $calls === [] && $a3['polled'] === 0,
        '15분마다: 회원이 화면을 안 봐도 조용한 기기는 지금 값으로 끊김이 풀림 · 방금 물은 것은 다시 안 물음 · st_poll_min 0 이면 끔');
    DB::table('hal_readings')->where('at', '>=', '2026-10-11 16:00:00')->where('at', '<', '2026-10-11 19:00:00')->delete();
    foreach ($keep as $kid => $kv) {
        DB::table('hal_devices')->where('id', $kid)->update(['last_seen_at' => $kv]);
    }
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['status' => $keepI->status, 'last_error' => $keepI->last_error, 'last_event_at' => $keepI->last_event_at, 'polled_at' => $keepI->polled_at, 'token_checked_at' => $keepI->token_checked_at]);
    HaService::$nowOverride = '2026-10-11 09:10:00';

    echo "  · 1.4.5 SmartThings 가 OFFLINE 이라 해도 값을 받으면 다시 이음 (클라우드 센서)\n";
    $keep = DB::table('hal_devices')->whereIn('id', [(int) $box->id, (int) $ams->id])->pluck('last_seen_at', 'id');
    $keepI = DB::table('hal_st_installs')->where('id', $oi->id)->first();
    HaService::$nowOverride = '2026-10-11 20:00:00';
    DB::table('hal_devices')->whereIn('id', [(int) $box->id, (int) $ams->id])->update(['last_seen_at' => '2026-10-11 12:00:00']);
    $fake['offline'] = ['dev-th-0001', 'dev-th-0002'];   // 둘 다 OFFLINE 이라 나옴 — 0001 은 값을 주고(클라우드 센서), 0002 는 정말 꺼짐
    $fake['dead'] = ['dev-th-0002'];
    [$rOk, $rMsg] = $st->reviveNow(1);
    t($rOk && DB::table('hal_devices')->where('id', $box->id)->value('last_seen_at') === '2026-10-11 20:00:00' && DB::table('hal_devices')->where('id', $ams->id)->value('last_seen_at') === '2026-10-11 12:00:00'
        && str_contains($rMsg, '1개는') && str_contains($rMsg, '오프라인'), 'OFFLINE 이어도 지금 값을 받으면 끊김이 풀림 (센서 고르기 저장과 같게) · 값도 못 받은 것만 오프라인으로 알림');
    unset($fake['offline'], $fake['dead']);
    DB::table('hal_readings')->where('at', '>=', '2026-10-11 19:00:00')->where('at', '<', '2026-10-11 21:00:00')->delete();
    foreach ($keep as $kid => $kv) {
        DB::table('hal_devices')->where('id', $kid)->update(['last_seen_at' => $kv]);
    }
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['status' => $keepI->status, 'last_error' => $keepI->last_error, 'last_event_at' => $keepI->last_event_at, 'polled_at' => $keepI->polled_at, 'token_checked_at' => $keepI->token_checked_at]);
    HaService::$nowOverride = '2026-10-11 09:10:00';

    echo "  · 1.2.0 프린터 라운지 — 내 프린터에 붙이기 · 출력 상태 · 주변 온습도\n";
    [, , $list] = $st->oauthDevices(1, (int) $oi->id);
    t(array_key_exists('suggest_printer', $list['devices'][0]) && $st->forUser(1)['oauth'] === true && $svc->sources() === ['ha' => true, 'smartthings' => true], '목록에 「이름이 같은 내 프린터」 칸 · 보내는 곳: SmartThings 켜짐');
    $devsBefore = DB::table('hal_devices')->where('user_id', 1)->count();
    FakePrinter::$got = [];
    [$ok, $msg] = $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001', 'printer_id' => 5], ['id' => 'dev-plug-001', 'printer_id' => 5], ['id' => 'dev-door-001', 'printer_id' => 7], ['id' => 'dev-th-0002', 'printer_id' => 999]], 15);
    $cfg = json_decode((string) DB::table('hal_st_installs')->where('id', $oi->id)->value('config'), true);
    $onPrn = DB::table('hal_devices')->where('id', $cfg['map']['dev-plug-001'])->first();
    t($ok && $cfg['map']['dev-th-0001'] === (int) $prn->id && $cfg['map']['dev-plug-001'] === (int) $prn->id && $onPrn->target === 'printer' && (int) $onPrn->printer_id === 5
        && DB::table('hal_devices')->where('user_id', 1)->where('target', 'printer')->where('printer_id', 5)->count() === 1, '「🖨️ 내 프린터에 붙이기」: 그 프린터의 카드에 (이미 있으면 거기에 — 온습도계 + 플러그가 한 카드에)');
    t($cfg['map']['dev-door-001'] !== (int) $prn->id && DB::table('hal_devices')->where('id', $cfg['map']['dev-door-001'])->value('target') !== 'printer' && DB::table('hal_devices')->where('id', $cfg['map']['dev-th-0002'])->value('target') !== 'printer',
        '남의 프린터 · 없는 프린터로는 못 붙임 (예전 카드 · 새 카드로)');
    $last = FakePrinter::$got[count(FakePrinter::$got) - 1] ?? null;
    t($last !== null && $last[0] === str_repeat('a', 32) && $last[1]['state'] === 'printing' && (float) $last[1]['chamber'] === 25.0 && (float) $last[1]['humidity'] === 33.0, '전력 120W ≥ 15W → 프린터 라운지로 「출력 중」 (라운지가 예전 버전이면 온습도도 같이)');
    FakePrinter::$got = [];
    $send(['messageType' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-oauth-0001'], 'events' => [$ev('dev-plug-001', 'powerMeter', 'power', 4.1)]]]);
    t((FakePrinter::$got[0][1]['state'] ?? '') === 'done', '전력이 내려가면 「완료」로 넘김 (플러그는 진행률을 몰라 「쉬는 중」으로 넘기면 출력 기록이 늘 「그만둠」으로 닫힘)');
    FakePrinter28::$got = [];
    HaService::$printerService = FakePrinter28::class;
    $send(['messageType' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-oauth-0001'], 'events' => [$ev('dev-plug-001', 'powerMeter', 'power', 150)]]]);
    $send(['messageType' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-oauth-0001'], 'events' => [$ev('dev-th-0001', 'relativeHumidityMeasurement', 'humidity', 38)]]]);
    HaService::$printerService = FakePrinter::class;
    t(count(FakePrinter28::$got) === 1 && FakePrinter28::$got[0][2] === 'st' && FakePrinter28::$got[0][1] === ['state' => 'printing'], '프린터 라운지 0.1.28+: SmartThings 로 받았다고 표시(via st) · 온습도는 상태에 섞지 않음 · 상태 없는 값(습도)은 넘기지 않음');
    $env = $svc->printerEnv(5);
    $hk = Plugins\Custom\IotLink\Listeners\IntegrationListener::getSubscribedHooks();
    t($env !== null && $env['humidity'] === 38.0 && $env['temp'] === 25.0 && $env['source'] === 'ha' && $env['name'] === $prn->name && $svc->printerEnv(7) === null && $svc->printerEnv(0) === null
        && (new Plugins\Custom\IotLink\Listeners\IntegrationListener())->printerEnv(null, 5)['humidity'] === 38.0 && (new Plugins\Custom\IotLink\Listeners\IntegrationListener())->printerEnv('x', 7) === 'x'
        && ($hk['custom-iot_link.printer_env']['type'] ?? '') === 'filter' && ($hk['custom-iot_link.sources']['method'] ?? '') === 'sources' && (new Plugins\Custom\IotLink\Listeners\IntegrationListener())->sources(null)['smartthings'] === true,
        '주변 온습도 필터(custom-iot_link.printer_env): 그 프린터에 붙인 기기의 온도 · 습도 — 붙인 것이 없으면 받은 그대로');
    HaService::$nowOverride = '2026-10-11 13:30:00';
    t($svc->printerEnv(5) === null, '소식이 끊긴 기기의 온습도는 주지 않음');
    HaService::$nowOverride = '2026-10-11 09:10:00';
    [$ok] = $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001', 'site_device_id' => (int) $box->id], ['id' => 'dev-plug-001', 'site_device_id' => (int) $plug->id], ['id' => 'dev-th-0002', 'site_device_id' => (int) $ams->id], ['id' => 'dev-door-001', 'site_device_id' => (int) $box->id]], 15);
    t($ok && DB::table('hal_devices')->where('user_id', 1)->count() >= $devsBefore, '(다음 검사를 위해 붙인 곳을 되돌림)');

    echo "  · 1.3.0 🖨️ 프린터 기기 (커뮤니티 Edge 드라이버 — Bambu Lab LAN · Klipper)\n";
    $comp = static fn (string $id, array $caps) => ['id' => $id, 'capabilities' => $caps];
    $fake['extra'] = [
        // 회원이 보내 준 Bambu Lab Printer (BooungEdge) 의 속성 표 그대로
        ['deviceId' => 'dev-bambu-01', 'label' => 'Bambu Lab Printer', 'components' => [
            $comp('main', [$capSt('switch', ['switch' => ['value' => 'on']])]), $comp('amsHumidity', [$capSt('relativeHumidityMeasurement', ['humidity' => ['value' => 22, 'unit' => '%']])]),
            $comp('bed', [$capSt('temperatureMeasurement', ['temperature' => ['value' => 24, 'unit' => 'C'], 'temperatureRange' => ['value' => null]])]), $comp('light', [$capSt('switch', ['switch' => ['value' => 'off']])]),
            $comp('nozzle', [$capSt('temperatureMeasurement', ['temperature' => ['value' => 25, 'unit' => 'C'], 'temperatureRange' => ['value' => null]])]), $comp('printing', [$capSt('contactSensor', ['contact' => ['value' => 'closed']])]),
            $comp('progress', [$capSt('flutefabric12437.printProgress', ['printProgress' => ['value' => 0, 'unit' => '%']])])]],
        // againtalent/SmartThings-Klipper 의 profiles/moonraker-klipper.v1.yaml 그대로
        ['deviceId' => 'dev-klip-001', 'label' => 'Voron', 'components' => [
            $comp('main', [$capSt('againtalent19519.klipperstatus', ['printer' => ['value' => 'standby']]), $capSt('againtalent19519.message', ['message' => ['value' => '-']])]),
            $comp('printJob', [$capSt('againtalent19519.filename', ['filename' => ['value' => '-']]), $capSt('againtalent19519.percentcomplete', ['percentComplete' => ['value' => 0, 'unit' => '%']]), $capSt('againtalent19519.printtime', ['totalTime' => ['value' => '-'], 'remainingTime' => ['value' => '-']])]),
            $comp('extruder', [$capSt('temperatureMeasurement', ['temperature' => ['value' => 0, 'unit' => 'C']]), $capSt('againtalent19519.printerfan', ['speed' => ['value' => 0, 'unit' => '%']])]), $comp('bed', [$capSt('temperatureMeasurement', ['temperature' => ['value' => 0, 'unit' => 'C']])])]],
        // 프린터가 아닌 것 — 맞춤 「…status」 · 「…progress」가 있어도 프린터로 보지 않음
        ['deviceId' => 'dev-wash-001', 'label' => '세탁기', 'components' => [$comp('main', [$capSt('switch', ['switch' => ['value' => 'on']]), $capSt('acme12345.washerStatus', ['status' => ['value' => 'run']]), $capSt('acme12345.progress', ['progress' => ['value' => 40]])])]],
    ];
    [, , $list] = $st->oauthDevices(1, (int) $oi->id);
    $row = array_column($list['devices'], null, 'id');
    $vv = array_column($row['dev-bambu-01']['values'], 'value', 'what');
    t($list['devices'][0]['kind'] === 'printer' && $row['dev-bambu-01']['kind'] === 'printer' && $row['dev-klip-001']['kind'] === 'printer' && $row['dev-wash-001']['kind'] === 'power' && $row['dev-th-0001']['kind'] === 'env',
        '프린터 기기를 알아봄 (Bambu · Klipper) — 목록 맨 위 · 세탁기의 맞춤 status/progress 는 프린터가 아님');
    t($vv === ['프린터 연결' => '연결됨', 'AMS 습도' => '22%', '베드 온도' => '24°C', '조명' => '꺼짐', '노즐 온도' => '25°C', '출력 상태' => '쉬는 중', '진행률' => '0%'] && $row['dev-bambu-01']['suggest_printer'] === 5 && $row['dev-bambu-01']['resave'] === false,
        'Bambu: 칸마다 뜻대로 (연결 · AMS 습도 · 베드/노즐 온도 · 조명 · 출력 상태 · 진행률) · 상표가 같은 내 프린터를 권함');
    $kv = array_column($row['dev-klip-001']['values'], 'value', 'what');
    t(array_keys($kv) === ['출력 상태', '출력물', '진행률', '남은 시간', '노즐 온도', '팬', '베드 온도'] && $kv['출력 상태'] === '쉬는 중', 'Klipper: 상태 글 · 출력물 · 진행률 · 남은 시간 · 노즐/베드 온도 · 팬');
    $prnBefore = DB::table('hal_devices')->where('id', $prn->id)->first();
    DB::table('hal_devices')->where('id', $prn->id)->update(['is_on' => false, 'state' => 'off']);
    FakePrinter28::$got = [];
    HaService::$printerService = FakePrinter28::class;
    $base = [['id' => 'dev-th-0001', 'site_device_id' => (int) $box->id], ['id' => 'dev-plug-001', 'site_device_id' => (int) $plug->id], ['id' => 'dev-th-0002', 'site_device_id' => (int) $ams->id], ['id' => 'dev-door-001', 'site_device_id' => (int) $box->id]];
    [$ok] = $st->oauthPick(1, (int) $oi->id, array_merge($base, [['id' => 'dev-bambu-01', 'printer_id' => 5]]), 15);
    $cfg = json_decode((string) DB::table('hal_st_installs')->where('id', $oi->id)->value('config'), true);
    $five = array_values(array_filter($cfg['devices'], static fn ($d) => count($d) === 5));
    $prnNow = DB::table('hal_devices')->where('id', $prn->id)->first();
    t($ok && $cfg['map']['dev-bambu-01'] === (int) $prn->id && count($five) === 7 && in_array(['p_progress', 'dev-bambu-01', 'progress', 'flutefabric12437.printProgress', 'printProgress'], $five, true)
        && in_array(['p_state', 'dev-bambu-01', 'printing', 'contactSensor', 'contact'], $five, true), '저장: 칸 · capability · attribute 를 같이 적어 둠 (맞춤 capability 이름공간이 드라이버마다 달라서)');
    t(FakePrinter28::$got === [] && (string) $prnNow->temp === (string) $prnBefore->temp && (string) $prnNow->humidity === (string) $prnBefore->humidity && ! $prnNow->is_on,
        '쉬는 중인 프린터를 처음 이어도 프린터 라운지에 「쉬는 중」을 보내지 않음 (손으로 시작한 출력이 닫히지 않게) · 노즐 온도 · AMS 습도를 주변 온습도로 넣지 않음');
    $pev = fn (string $dev, string $c, string $cap, string $attr, $val, ?string $unit = null) => ['eventTime' => '2026-10-11T00:10:00Z', 'eventType' => 'DEVICE_EVENT', 'deviceEvent' => ['eventId' => uniqid(), 'locationId' => 'loc-0000-1111', 'deviceId' => $dev, 'componentId' => $c, 'capability' => $cap, 'attribute' => $attr, 'value' => $val, 'unit' => $unit, 'stateChange' => true]];
    $psend = fn (array $evs) => $send(['messageType' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-oauth-0001'], 'events' => $evs]]);
    $psend([$pev('dev-bambu-01', 'nozzle', 'temperatureMeasurement', 'temperature', 221, 'C')]);
    t(FakePrinter28::$got === [], '쉬는 중에 온도만 바뀌면 넘기지 않음 (「쉬는 중」을 거듭 보내지 않음)');
    $psend([$pev('dev-bambu-01', 'printing', 'contactSensor', 'contact', 'open')]);
    $g = FakePrinter28::$got[0] ?? [null, [], null];
    t(count(FakePrinter28::$got) === 1 && $g[0] === str_repeat('a', 32) && $g[2] === 'st' && $g[1]['state'] === 'printing' && (float) $g[1]['progress'] === 0.0 && (float) $g[1]['nozzle'] === 221.0 && (float) $g[1]['bed'] === 24.0
        && (float) $g[1]['humidity'] === 22.0 && $g[1]['hum_src'] === 'ams' && $g[1]['light'] === false && $g[1]['source'] === 'printer' && ! isset($g[1]['chamber']),
        '출력 시작(열림) → 프린터 라운지로 「출력 중」 + 지금까지의 값 모두 (노즐 · 베드 · AMS 습도 · 조명 · 진행률) — 값이 하나씩 와도 묶어서');
    $psend([$pev('dev-bambu-01', 'progress', 'flutefabric12437.printProgress', 'printProgress', 42, '%')]);
    $psend([$pev('dev-bambu-01', 'bed', 'temperatureMeasurement', 'temperature', 60, 'C'), $pev('dev-bambu-01', 'light', 'switch', 'switch', 'on')]);
    $g = FakePrinter28::$got[2] ?? [null, [], null];
    t(count(FakePrinter28::$got) === 3 && (float) FakePrinter28::$got[1][1]['progress'] === 42.0 && FakePrinter28::$got[1][1]['state'] === 'printing' && (float) $g[1]['bed'] === 60.0 && (float) $g[1]['nozzle'] === 221.0 && (float) $g[1]['progress'] === 42.0 && $g[1]['light'] === true,
        '진행률 · 온도가 바뀔 때마다 「출력 중」과 함께 (상태가 같이 가야 라운지가 받음)');
    $psend([$pev('dev-bambu-01', 'printing', 'contactSensor', 'contact', 'closed')]);
    t(count(FakePrinter28::$got) === 4 && FakePrinter28::$got[3][1]['state'] === 'idle', '진행률 42% 에서 끝남(닫힘) → 「쉬는 중」 그대로 (라운지가 마지막 진행률로 「그만둠」)');
    $psend([$pev('dev-bambu-01', 'printing', 'contactSensor', 'contact', 'open')]);
    $psend([$pev('dev-bambu-01', 'progress', 'flutefabric12437.printProgress', 'printProgress', 100, '%')]);
    $psend([$pev('dev-bambu-01', 'printing', 'contactSensor', 'contact', 'closed')]);
    $psend([$pev('dev-bambu-01', 'nozzle', 'temperatureMeasurement', 'temperature', 80, 'C')]);
    t(count(FakePrinter28::$got) === 7 && FakePrinter28::$got[6][1]['state'] === 'done' && (float) FakePrinter28::$got[6][1]['progress'] === 100.0, '100% 에서 끝남 → 「완료」 · 그 뒤 식는 동안의 온도는 넘기지 않음');
    $mineI = array_column($st->forUser(1)['installs'], null, 'id')[(int) $oi->id];
    $sens = array_column(array_filter($mineI['sensors'], static fn ($x) => str_starts_with($x['capability'], 'printer.')), 'value', 'what');
    t($sens['출력 상태'] === '쉬는 중' && $sens['노즐 온도'] === '80°C' && $sens['진행률'] === '100%' && $sens['프린터 연결'] === '연결됨' && $sens['조명'] === '켜짐' && count($sens) === 7, '기기 카드의 센서 값도 역할 이름으로 (노즐 온도 · 베드 온도 · 출력 상태 …)');
    // Klipper — 상태 글 · 남은 시간 「1h 4m」 · 출력물
    FakePrinter28::$got = [];
    [$ok] = $st->oauthPick(1, (int) $oi->id, array_merge($base, [['id' => 'dev-klip-001', 'printer_id' => 5]]), 15);
    $psend([$pev('dev-klip-001', 'printJob', 'againtalent19519.filename', 'filename', 'benchy 0.2mm'), $pev('dev-klip-001', 'printJob', 'againtalent19519.printtime', 'remainingTime', '1h 4m'),
        $pev('dev-klip-001', 'printJob', 'againtalent19519.percentcomplete', 'percentComplete', 12.5, '%'), $pev('dev-klip-001', 'extruder', 'temperatureMeasurement', 'temperature', 215, 'C'), $pev('dev-klip-001', 'main', 'againtalent19519.klipperstatus', 'printer', 'printing')]);
    $g = FakePrinter28::$got[0] ?? [null, [], null];
    t($ok && count(FakePrinter28::$got) === 1 && $g[1]['state'] === 'printing' && $g[1]['job'] === 'benchy 0.2mm' && (float) $g[1]['remaining_min'] === 64.0 && (float) $g[1]['progress'] === 12.5 && (float) $g[1]['nozzle'] === 215.0, 'Klipper: 출력 중 · 출력물 · 남은 64분 · 진행률 · 노즐 온도');
    $psend([$pev('dev-klip-001', 'main', 'againtalent19519.klipperstatus', 'printer', 'complete')]);
    t(count(FakePrinter28::$got) === 2 && FakePrinter28::$got[1][1]['state'] === 'complete', 'Klipper: complete 는 그대로 넘김 (라운지가 「완료」로)');
    // 예전 버전(1.2.0)으로 골라 둔 프린터 기기 — 다시 저장하라고 알림
    $cfgOld = json_decode((string) DB::table('hal_st_installs')->where('id', $oi->id)->value('config'), true);
    $cfgOld['devices'] = array_values(array_merge(array_filter($cfgOld['devices'], static fn ($d) => $d[1] !== 'dev-klip-001'), [['temp', 'dev-bambu-01', 'bed'], ['power_switch', 'dev-bambu-01', 'main']]));
    $cfgOld['map']['dev-bambu-01'] = (int) $box->id;
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['config' => json_encode($cfgOld)]);
    [, , $list] = $st->oauthDevices(1, (int) $oi->id);
    $row = array_column($list['devices'], null, 'id');
    t($row['dev-bambu-01']['resave'] === true && $row['dev-bambu-01']['picked'] === true && $row['dev-bambu-01']['suggest_printer'] === 5, '예전 방식으로 골라 둔 프린터 기기는 「한 번 다시 저장」 표시 · 내 프린터를 권함');
    HaService::$printerService = FakePrinter::class;
    $fake['extra'] = [];
    [$ok] = $st->oauthPick(1, (int) $oi->id, $base, 15);
    DB::table('hal_devices')->where('id', $prn->id)->update(['is_on' => $prnBefore->is_on, 'state' => $prnBefore->state]);
    t($ok, '(다음 검사를 위해 되돌림)');

    echo "  · 한도 · 빼기 · 지우기 · 끊기 · 다시 연결\n";
    Settings::save(['max_devices' => DB::table('hal_devices')->where('user_id', 1)->count()]);
    DB::table('hal_st_installs')->where('id', $oi->id)->update(['config' => json_encode(['mode' => 'oauth', 'devices' => [], 'map' => [], 'power_on_w' => 15])]);
    [$ok, $msg] = $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-door-001']]);
    t($ok && str_contains($msg, '한도') && str_contains($msg, '보관함 문') && DB::table('hal_st_installs')->where('id', $oi->id)->value('status') === 'choose', '기기 수 한도면 새 기기를 만들지 않고 알림');
    Settings::save(['max_devices' => 20]);
    $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001', 'site_device_id' => (int) $box->id], ['id' => 'dev-plug-001', 'site_device_id' => (int) $plug->id], ['id' => 'dev-th-0002', 'site_device_id' => (int) $ams->id]]);
    $calls = [];
    $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001'], ['id' => 'dev-plug-001']]);
    $dels = array_values(array_filter($calls, fn ($c) => $c[0] === 'DELETE'));
    t($subsOf('ia-oauth-0001') === ['dev-th-0001', 'dev-plug-001'] && count($dels) === 1 && preg_match('#/subscriptions/sub-0000-\d+$#', $dels[0][1]) === 1 && DB::table('hal_devices')->where('id', $ams->id)->exists()
        && DB::table('hal_st_sensors')->where('st_device_id', 'dev-th-0002')->doesntExist(), '센서를 빼면 그 구독만 지움 · 사이트 기기 · 기록은 남김');
    $svc->delete(1, (int) $plug->id);
    $cfg = json_decode((string) DB::table('hal_st_installs')->where('id', $oi->id)->value('config'), true);
    t(array_keys($cfg['map']) === ['dev-th-0001'] && array_unique(array_column($cfg['devices'], 1)) === ['dev-th-0001'] && $subsOf('ia-oauth-0001') === ['dev-th-0001'], '사이트 기기를 지우면 그 SmartThings 센서도 고른 것에서 빠지고 구독도 지움');
    $stFail['subs'] = true;
    $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001'], ['id' => 'dev-door-001', 'site_device_id' => (int) $box->id]]);
    $stFail['subs'] = false;
    $x = DB::table('hal_st_installs')->where('id', $oi->id)->first();
    t($x->status === 'error' && str_contains((string) $x->last_error, '구독 1개') && str_contains((string) $x->last_error, '센서 고르기') && str_contains((string) $x->last_error, '무료 이용이 중지') && mb_strlen((string) $x->last_error) <= 160, '구독을 못 만들면(429) 화면에 오류로 — 다시 저장하라고 · 유료 전환 때문일 수 있다고 (160자 안)');
    $st->oauthPick(1, (int) $oi->id, [['id' => 'dev-th-0001'], ['id' => 'dev-door-001']]);
    t(DB::table('hal_st_installs')->where('id', $oi->id)->value('status') === 'active' && DB::table('hal_st_installs')->where('id', $oi->id)->value('last_error') === null, '다시 저장하면 풀림');
    // SmartThings 쪽에서 끊고 다시 연결 → 설치 id 가 바뀜: 고른 센서를 물려받음
    [, , $d] = $st->oauthStart(1);
    parse_str((string) parse_url($d['url'], PHP_URL_QUERY), $q);
    [$ok, $msg, $d] = $st->oauthFinish(1, 'CODE2', $q['state']);
    $n2 = DB::table('hal_st_installs')->where('installed_app_id', 'ia-oauth-0002')->first();
    t($ok && $d['choose'] === false && str_contains($msg, '다시 연결') && DB::table('hal_st_installs')->where('installed_app_id', 'ia-oauth-0001')->doesntExist() && array_keys(json_decode((string) $n2->config, true)['map']) === ['dev-th-0001', 'dev-door-001']
        && $subsOf('ia-oauth-0002') === ['dev-th-0001', 'dev-door-001'] && $n2->status === 'active' && DB::table('hal_st_installs')->where('user_id', 1)->where('location_id', 'loc-0000-1111')->where('config', 'like', '%oauth%')->count() === 1,
        '같은 위치를 다시 연결 (설치 id 가 바뀜) → 고른 센서 · 붙인 곳을 물려받고 예전 줄은 지움');
    // 다른 회원이 같은 설치를 연결 → 지금 로그인한 사람의 것으로 (예전 회원의 기기와는 끊김)
    DB::table('hal_st_installs')->where('id', $n2->id)->update(['installed_app_id' => 'ia-oauth-0001']);
    [, , $d] = $st->oauthStart(2);
    parse_str((string) parse_url($d['url'], PHP_URL_QUERY), $q);
    [$ok, , $d] = $st->oauthFinish(2, 'CODE3', $q['state']);
    $x = DB::table('hal_st_installs')->where('id', $n2->id)->first();
    t($ok && $d['choose'] === true && (int) $x->user_id === 2 && json_decode((string) $x->config, true)['map'] === [] && DB::table('hal_st_sensors')->where('install_id', $x->id)->doesntExist() && $svc->overview(1)['smartthings']['installs'] !== $svc->overview(2)['smartthings']['installs']
        && ! $st->oauthPick(1, (int) $x->id, [])[0], '다른 회원이 같은 위치를 연결하면 그 회원 것으로 — 예전 회원의 센서 · 붙인 곳은 넘어가지 않음');
    $calls = [];
    [$ok, $msg] = $st->disconnect(2, (int) $x->id);
    $dels = array_values(array_filter($calls, fn ($c) => $c[0] === 'DELETE'));
    t($ok && count($dels) === 2 && str_ends_with($dels[0][1], '/installedapps/ia-oauth-0001/subscriptions') && str_ends_with($dels[1][1], '/installedapps/ia-oauth-0001') && DB::table('hal_st_installs')->where('id', $x->id)->doesntExist()
        && DB::table('hal_devices')->where('id', $box->id)->exists(), '끊기: 구독 지우기 → 앱 지우기 · 사이트 기기는 남김');

    echo "  · 관리자: 주소 확인 · 자동 등록\n";
    Settings::save(['st_enabled' => false, 'st_app_id' => 'app-old-00001']);
    $r = $send(['messageType' => 'CONFIRMATION', 'confirmationData' => ['appId' => 'app-auto-7777', 'confirmationUrl' => 'https://api.smartthings.com/apps/app-auto-7777/confirm-registration?token=t2']]);
    t($r[0] === 200 && $send($ping)[0] === 404 && $send(['messageType' => 'EVENT', 'eventData' => ['installedApp' => ['installedAppId' => 'ia-four-0004'], 'events' => []]])[0] === 404 && $st->adminInfo()['confirmed_at'] === null,
        '주소 확인(CONFIRMATION)은 연결을 켜기 전 · App ID 가 예전 것이어도 답함 (앱을 등록하는 그때 오므로) · 다른 것은 켜야 받음 · 지금 앱의 확인이 아니면 「확인됨」 아님');
    t(! $st->oauthStart(1)[0] && $svc->overview(1)['smartthings']['oauth'] === false, '꺼 두면 회원은 연결을 시작하지 못함');
    $calls = [];
    t(! $st->register('short')[0] && $calls === [], '자동 등록: 토큰 모양이 아니면 SmartThings 에 묻지 않음');
    $fake['apps'] = 403;
    [$ok, $msg] = $st->register('11111111-2222-3333-4444-555555555555');
    t(! $ok && str_contains($msg, 'HTTP 403') && str_contains($msg, 'Plan required') && Settings::get('st_client_id') === 'cid-1234-abcd' && Settings::get('st_enabled') === false, '자동 등록이 거절되면 SmartThings 의 답을 그대로 알려 주고 설정은 그대로');
    $fake['apps'] = 201;
    $calls = [];
    [$ok, $msg] = $st->register(' 11111111-2222-3333-4444-555555555555 ');
    $body = json_decode((string) $calls[0][3], true);
    t($ok && $calls[0][0] === 'POST' && $calls[0][1] === 'https://api.smartthings.com/v1/apps' && in_array('Authorization: Bearer 11111111-2222-3333-4444-555555555555', $calls[0][2], true) && $body['appType'] === 'API_ONLY' && $body['classifications'] === ['CONNECTED_SERVICE']
        && $body['apiOnly'] === ['targetUrl' => 'https://3ds.test/api/plugins/custom-iot_link/smartthings'] && $body['oauth']['redirectUris'] === ['https://3ds.test/iot-link'] && $body['oauth']['scope'] === ['r:devices:*', 'r:locations:*'] && $body['principalType'] === 'LOCATION'
        && preg_match('/^[a-z][a-z0-9]*-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/', $body['appName']) === 1 && $calls[1][0] === 'PUT' && str_ends_with($calls[1][1], '/v1/apps/app-auto-7777/register'),
        '자동 등록: SmartThings CLI 의 OAuth-In App 과 같은 요청 (받는 곳 · 돌아올 곳 · 읽기 권한) → 주소 확인 요청');
    $fake['apps'] = 403;
    $AC = new Plugins\Custom\IotLink\Http\Controllers\AdminController();
    $bad = $AC->register($as(1, 'POST', ['token' => '11111111-2222-3333-4444-555555555555']));
    $fake['apps'] = 201;
    $good = $AC->register($as(1, 'POST', ['token' => '11111111-2222-3333-4444-555555555555']));
    t($bad->getStatusCode() === 422 && $js($bad)['data'] === null && str_contains($js($bad)['message'], '403') && $good->getStatusCode() === 200 && $js($good)['data']['settings']['st_client_secret'] === '' && $js($good)['data']['settings']['st_client_secret_set'] === true
        && $js($good)['data']['smartthings']['oauth_ready'] === true && ! str_contains($good->getContent(), 'sec-auto') && ! str_contains($good->getContent(), '11111111-2222') && $AC->register($as(1, 'POST', ['token' => ['a']]))->getStatusCode() === 422,
        '관리자 컨트롤러: 자동 등록 답에 Secret · 토큰이 없음');
    t(Settings::get('st_enabled') === true && Settings::get('st_app_id') === 'app-auto-7777' && Settings::get('st_client_id') === 'cid-auto-7777' && SmartThingsService::clientSecret() === 'sec-auto-7777' && ! str_contains(json_encode(Settings::public()), 'sec-auto')
        && ! str_contains(json_encode(DB::table('hal_settings')->get()), '11111111-2222') && ! str_contains(json_encode(DB::table('hal_settings')->get()), 'sec-auto-7777') && $st->adminInfo()['confirmed_at'] !== null && $st->adminInfo()['oauth_ready'] === true
        && $st->adminInfo()['redirect_uri'] === 'https://3ds.test/iot-link', '자동 등록: App ID · Client ID · Client Secret(암호화) 저장 · 연결 켬 · 개인 토큰은 저장하지 않음 · 그 앱의 주소 확인이 「확인됨」으로');

    echo "■ 고치기 · 지우기\n";
    [$ok] = $svc->rotate(1, (int) $box->id);
    t($ok && ! $svc->ingest($box->token, ['humidity' => 20])[0] && ! $svc->rotate(2, (int) $box->id)[0] && ! $svc->delete(2, (int) $box->id)[0], '주소 새로 만들기 — 옛 주소는 안 받음 · 남은 못 함');
    Settings::save(['keep_days' => 1]);
    HaService::$nowOverride = '2026-10-12 11:00:00';
    $svc->tidy();
    t(DB::table('hal_readings')->count() === 0, '오래된 온습도 기록 지움');
    (new IntegrationListener())->onUserDeleted((object) ['id' => 1]);
    t(DB::table('hal_devices')->count() === 0 && DB::table('hal_runs')->count() === 0, '회원 삭제 → 기기 · 기록 정리');
    t(DB::table('hal_st_installs')->where('user_id', 1)->count() === 0 && DB::table('hal_st_codes')->where('user_id', 1)->count() === 0 && DB::table('hal_st_states')->where('user_id', 1)->count() === 0, '회원 삭제 → SmartThings 연결 · 코드 · state 도 정리');
    Settings::save(['enabled' => false]);
    t(! $svc->ingest(str_repeat('a', 32), [])[0], '꺼 두면 안 받음');

    echo "■ 1.4.0 Api\Ha — 다른 확장이 묻는 것\n";
    $H = \Plugins\Custom\IotLink\Api\Ha::class;
    $tables = array_map(fn ($r) => $r->name, DB::select("SELECT name FROM sqlite_master WHERE type = 'table'"));
    t(! array_filter($tables, fn ($n) => str_starts_with($n, 'cmp_') || str_starts_with($n, 'mnt_') || str_starts_with($n, 'inv_')), '업체검색 · 정비 수첩 · 재고 관리 표 없이 돎');
    Settings::save(['enabled' => true]);
    HaService::$nowOverride = '2026-10-20 10:00:00';
    [$ok, , $b1] = $svc->save(3, null, ['target' => 'location', 'location' => '드라이 박스', 'ent_hum' => 'sensor.a', 'humidity_max' => 40]);
    [$ok2, , $b2] = $svc->save(4, null, ['target' => 'location', 'location' => '드라이박스', 'ent_hum' => 'sensor.b', 'humidity_max' => 30]);
    $t1 = (string) DB::table('hal_devices')->where('id', $b1['id'])->value('token');
    $t2 = (string) DB::table('hal_devices')->where('id', $b2['id'])->value('token');
    $svc->ingest($t1, ['humidity' => 33, 'temperature' => 21]);
    $svc->ingest($t2, ['humidity' => 55]);
    $ls = $H::locationSensors([4, 3, 0]);
    t($H::active() && count($ls) === 2 && $ls[0]['user_id'] === 4 && $ls[0]['humidity'] === 55.0 && $ls[0]['humidity_max'] === 30 && $ls[1]['location'] === '드라이 박스' && $ls[1]['temp'] === 21.0 && $ls[1]['last_seen_at'] !== null && $H::locationSensors([]) === [], 'locationSensors — 그 회원들 보관함 센서 (첫 회원 것 먼저)');
    $hh = $H::humidityHistory([3, 4]);
    t(array_keys($hh) === ['드라이박스'] && $hh['드라이박스']['limit'] === 40 && $hh['드라이박스']['rows'][0][1] === 33.0 && $H::humidityHistory([4])['드라이박스']['limit'] === 30, 'humidityHistory — 보관 위치(빈칸 · 대소문자 무시)마다 한 센서 · 첫 회원 것');
    [$okE, , $e9] = $svc->save(1, null, ['target' => 'equipment', 'equipment_id' => 100, 'ent_state' => 'switch.e9']);
    DB::table('hal_runs')->insert([['device_id' => $e9['id'], 'started_at' => '2026-10-19 00:00:00', 'ended_at' => '2026-10-19 10:00:00'], ['device_id' => $e9['id'], 'started_at' => '2026-10-20 08:00:00', 'ended_at' => null]]);
    DB::table('hal_devices')->where('id', $e9['id'])->update(['last_seen_at' => '2026-10-20 09:30:00']);
    $rh = $H::runHours('equipment_id', 100, '2026-10-19 05:00:00');
    t($okE && $rh === 6.5 && $H::runHours('equipment_id', 999, '2026-10-01 00:00:00') === null && $H::runHours('user_id', 1, '2026-10-01 00:00:00') === null, 'runHours — 붙인 기기의 가동 시간 (켜져 있는 것은 마지막 소식까지) · 없으면 null · 아무 칸이나 안 받음');
    DB::table('hal_links')->where('user_id', 3)->update(['updated_at' => '2020-01-01 00:00:00']);
    $H::touch(3);
    t((string) DB::table('hal_links')->where('user_id', 3)->value('updated_at') > '2020-01-01 00:00:00', 'touch — 「화면 보고 있음」 적음');
    FakeInventory::$on = false;
    $o9 = $svc->overview(1);
    t($o9['equipment'] === [] && $o9['locations'] === [] && $o9['config']['inventory'] === false && ! $svc->save(1, null, ['target' => 'equipment', 'equipment_id' => 100, 'ent_state' => 'switch.z'])[0], '재고 관리가 꺼지면 장비 · 보관 위치 목록은 비고 장비에 못 붙임');
    FakeInventory::$on = true;
    Settings::save(['enabled' => false]);
    t(! $H::active() && $H::locationSensors([3]) === [] && $H::runHours('equipment_id', 100, '2026-10-19 05:00:00') === null, 'HA 연결을 끄면 빈 값');
    Settings::save(['enabled' => true]);

    echo "■ 1.4.6 📁 분류 (장비 · 개인 재고 · 업체마다 · 미분류)\n";
    $G = HaService::class;
    t($G::group('', 'printer', null, [10]) === 'equip' && $G::group('', 'location', null, [10]) === 'mine' && $G::group('', 'equipment', 10, [10]) === 'c10' && $G::group('', 'equipment', 11, [10]) === 'equip' && $G::group('', 'other', null, [10]) === 'none'
        && $G::group('mine', 'printer', null, []) === 'mine' && $G::group('c10', 'other', null, [10]) === 'c10' && $G::group('c11', 'location', null, [10]) === 'mine' && $G::group('zzz', 'other', null, []) === 'none', '붙인 곳 따라 자동 · 고른 것이 맞으면 그것 · 남의 업체 · 모르는 값은 자동');
    [$okG, , $xg] = $svc->save(1, null, ['target' => 'location', 'location' => '창고 선반', 'ent_hum' => 'sensor.shelf_h', 'grp' => 'c10']);
    $og = collect($svc->overview(1)['devices'])->firstWhere('id', $xg['id'] ?? 0);
    t($okG && $og['grp'] === 'c10' && $og['group'] === 'c10' && $og['group_auto'] === 'mine' && ! $svc->save(1, null, ['target' => 'location', 'location' => '창고', 'ent_hum' => 'sensor.y', 'grp' => 'c11'])[0], '기기에 분류 고르기 (내 업체만) · 자동이면 어디였을지도');
    $ids6 = collect($svc->overview(1)['devices'])->pluck('id')->all();
    [$okM, $msgM] = $svc->groupMany(1, $ids6, 'none');
    $allNone = collect($svc->overview(1)['devices'])->every(fn ($d) => $d['group'] === 'none');
    [$okM2] = $svc->groupMany(1, $ids6, '');
    $back = collect($svc->overview(1)['devices'])->firstWhere('id', $xg['id'])['group'];
    t($okM && str_contains($msgM, '옮겼어요') && $allNone && $okM2 && $back === 'mine' && ! $svc->groupMany(2, $ids6, 'none')[0] && ! $svc->groupMany(1, $ids6, 'c11')[0], '여러 기기 한 번에 옮기기 · 자동으로 되돌리기 · 남의 기기 · 남의 업체는 안 됨');
    $js6 = (string) file_get_contents(dirname(__DIR__).'/resources/assets/iot-link-app.js');
    t(str_contains($js6, 'function grouped()') && str_contains($js6, "'/devices/group'") && str_contains($js6, '<select name="grp">') && str_contains($js6, "['all', '📡', '전체'") && str_contains($js6, "['banner', '▬', '배너']"), '화면 — 분류 묶음 · 고치기의 분류 · 여러 개 옮기기 · 전체 · 카드 · 한 줄 · 배너');
    echo "\n통과 {$pass} · 실패 {$fail}\n";
    exit($fail ? 1 : 0);
}
