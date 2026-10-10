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
    $sb->create('cmp_companies', function ($t) { $t->id(); $t->string('name'); $t->timestamp('deleted_at')->nullable(); });
    $sb->create('cmp_members', function ($t) { $t->id(); $t->integer('company_id'); $t->integer('user_id'); $t->string('role'); $t->string('status')->default('active'); });
    $sb->create('cmp_equipment', function ($t) { $t->id(); $t->integer('company_id'); $t->string('kind'); $t->string('brand')->nullable(); $t->string('model')->nullable(); $t->integer('sort')->default(0); $t->timestamp('deleted_at')->nullable(); });
    DB::table('cmp_companies')->insert([['id' => 10, 'name' => '삼디 공방'], ['id' => 11, 'name' => '남의 업체']]);
    DB::table('cmp_members')->insert([['company_id' => 10, 'user_id' => 1, 'role' => 'owner', 'status' => 'active'], ['company_id' => 11, 'user_id' => 2, 'role' => 'owner', 'status' => 'active']]);
    DB::table('cmp_equipment')->insert([['id' => 100, 'company_id' => 10, 'kind' => 'fdm', 'brand' => 'Bambu Lab', 'model' => 'X1C'], ['id' => 102, 'company_id' => 11, 'kind' => 'sla', 'brand' => 'Elegoo', 'model' => 'Mars']]);
    $sb->create('cmp_spools', function ($t) { $t->id(); $t->integer('company_id'); $t->string('material'); $t->string('color')->nullable(); $t->string('brand')->nullable(); $t->string('status'); $t->string('location')->nullable(); $t->timestamp('deleted_at')->nullable(); });
    DB::table('cmp_spools')->insert([['company_id' => 10, 'material' => 'PETG', 'color' => '빨강', 'brand' => 'eSun', 'status' => 'in_use', 'location' => '드라이박스'], ['company_id' => 11, 'material' => 'PA', 'color' => null, 'brand' => null, 'status' => 'in_use', 'location' => '드라이박스'],
        ['company_id' => 10, 'material' => 'PLA', 'color' => null, 'brand' => null, 'status' => 'new', 'location' => '드라이박스']]);
    $sb->create('mnt_spools', function ($t) { $t->id(); $t->integer('user_id'); $t->string('name'); $t->string('material'); $t->string('location')->nullable(); $t->string('status')->default('open'); });
    DB::table('mnt_spools')->insert([['user_id' => 1, 'name' => 'PETG 검정', 'material' => 'PETG', 'location' => '드라이 박스', 'status' => 'open'], ['user_id' => 1, 'name' => 'PLA 흰색', 'material' => 'PLA', 'location' => 'AMS', 'status' => 'open'], ['user_id' => 2, 'name' => '남의 것', 'material' => 'PA', 'location' => '드라이박스', 'status' => 'open']]);

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
    SmartThingsService::$inline = true;
    SmartThingsService::$http = function (string $m, string $url, array $h, ?string $b) use (&$calls, &$stFail, $cert): array {
        $calls[] = [$m, $url, $h, $b];
        $j = static fn ($x) => json_encode($x);
        if (str_starts_with($url, 'https://key.smartthings.com/pl/')) return [200, $cert];
        if (str_contains($url, '/confirm-registration')) return [200, '{}'];
        if (str_ends_with($url, '/oauth/token')) return $stFail['token'] ? [401, '{"error":"invalid_grant"}'] : [200, $j(['access_token' => 'AT-NEW-'.count($calls), 'refresh_token' => 'RT-NEW-'.count($calls), 'expires_in' => 86399])];
        if (preg_match('#/locations/#', $url)) return [200, $j(['name' => '우리집', 'temperatureScale' => 'F'])];
        if (str_ends_with($url, '/subscriptions')) return $m === 'POST' && $stFail['subs'] ? [403, '{}'] : [200, '{}'];
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

    echo "■ 고치기 · 지우기\n";
    [$ok] = $svc->rotate(1, (int) $box->id);
    t($ok && ! $svc->ingest($box->token, ['humidity' => 20])[0] && ! $svc->rotate(2, (int) $box->id)[0] && ! $svc->delete(2, (int) $box->id)[0], '주소 새로 만들기 — 옛 주소는 안 받음 · 남은 못 함');
    Settings::save(['keep_days' => 1]);
    HaService::$nowOverride = '2026-10-12 11:00:00';
    $svc->tidy();
    t(DB::table('hal_readings')->count() === 0, '오래된 온습도 기록 지움');
    (new IntegrationListener())->onUserDeleted((object) ['id' => 1]);
    t(DB::table('hal_devices')->count() === 0 && DB::table('hal_runs')->count() === 0, '회원 삭제 → 기기 · 기록 정리');
    t(DB::table('hal_st_installs')->count() === 0 && DB::table('hal_st_codes')->where('user_id', 1)->count() === 0, '회원 삭제 → SmartThings 연결 · 코드도 정리');
    Settings::save(['enabled' => false]);
    t(! $svc->ingest(str_repeat('a', 32), [])[0], '꺼 두면 안 받음');

    echo "\n통과 {$pass} · 실패 {$fail}\n";
    exit($fail ? 1 : 0);
}
