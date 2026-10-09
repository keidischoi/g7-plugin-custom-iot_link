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
    use Plugins\Custom\HaLink\Listeners\IntegrationListener;
    use Plugins\Custom\HaLink\Services\HaService;
    use Plugins\Custom\HaLink\Support\Notify;
    use Plugins\Custom\HaLink\Support\Settings;

    require (getenv('G7_VENDOR') ?: 'C:/Users/gbook/source/g7-core/vendor').'/autoload.php';
    spl_autoload_register(function (string $c): void {
        $p = 'Plugins\\Custom\\HaLink\\';
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
    t($ok && $d['temp'] === 23.4 && $d['humidity'] === 35.2 && ! $d['stale'] && ! $d['over'] && count($d['history']) === 1 && $sent === [] && $o['config']['base'] === 'https://3ds.test/api/plugins/custom-ha_link/in/' && $o['locations'] === ['AMS', '드라이 박스'], '온습도 받음 · 기준 안 넘음');
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

    echo "■ 가동 시간 · 내 프린터\n";
    HaService::$nowOverride = '2026-10-09 12:00:00';
    $svc->ingest($prn->token, ['state' => 'running', 'progress' => '10', 'job' => 'benchy.3mf']);
    t(count(FakePrinter::$got) === 1 && FakePrinter::$got[0][0] === str_repeat('a', 32) && FakePrinter::$got[0][1] === ['state' => 'running', 'progress' => 10.0, 'job' => 'benchy.3mf'] && DB::table('hal_runs')->where('device_id', $prn->id)->whereNull('ended_at')->count() === 1, '프린터 상태 → 내 프린터의 자동 연결로 넘김 · 가동 시작');
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

    echo "■ 연결 코드 · 허브 (HACS 통합)\n";
    $code = $svc->linkCode(1);
    t(strlen($code) === 32 && $svc->linkCode(1) === $code && $svc->linkUser($code) === 1 && $svc->linkUser(str_repeat('0', 32)) === 0 && $svc->linkUser('x') === 0 && $svc->overview(1)['link']['code'] === $code, '연결 코드 — 회원마다 하나 · 틀린 코드는 0');
    Settings::save(['interval_min' => 5]);
    t($svc->hub(1)['interval_min'] === 5 && $svc->overview(1)['config']['interval_min'] === 5, '0.1.3 값 보내는 주기 — 관리자 설정이 통합 · 설정 글에 전해짐');
    Settings::save(['interval_min' => 10]);
    $h = $svc->hub(1);
    t($h['locations'] === ['AMS', '드라이 박스'] && $h['printers'][0]['id'] === 5 && $h['equipment'][0]['name'] === '삼디 공방 — Bambu Lab X1C' && count($h['devices']) === 3 && strlen($h['devices'][0]['token']) === 32 && $h['push_url'] === 'https://3ds.test/api/plugins/custom-ha_link/in/', '허브: 붙일 곳 목록 · 내 기기');
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
    t($svc->publicSnap($pid) !== null && is_array($ps) && str_starts_with($ps['url'], '/api/plugins/custom-ha_link/snap/'.$pid.'.jpg?t=') && $ps['at'] === '2026-10-10 11:16:00' && $IL->printerSnapshot(null, 7) === null && $svc->hub(1)['devices'] !== [], '회원이 공개로 두면 — 그 프린터의 사진 주소 (훅)');
    HaService::$nowOverride = '2026-10-12 11:16:00';
    t($svc->publicSnap($pid) === null, '하루 넘게 오래된 사진은 공개하지 않음');
    HaService::$nowOverride = '2026-10-10 11:16:00';
    $svc->save(1, $pid, ['target' => 'printer', 'printer_id' => 5, 'ent_state' => 'sensor.p1s_print_status', 'snap_public' => false]);
    t($svc->publicSnap($pid) === null, '다시 끄면 바로 비공개');
    $svc->delete(1, $pid);
    t(! is_file(HaService::snapPath($pid)), '기기를 지우면 사진도 지움');
    [, , $x] = $svc->save(1, null, ['target' => 'printer', 'printer_id' => 5, 'ent_state' => 'sensor.p1s_print_status']);
    $prn = DB::table('hal_devices')->where('id', $x['id'])->first();

    echo "■ 고치기 · 지우기\n";
    [$ok] = $svc->rotate(1, (int) $box->id);
    t($ok && ! $svc->ingest($box->token, ['humidity' => 20])[0] && ! $svc->rotate(2, (int) $box->id)[0] && ! $svc->delete(2, (int) $box->id)[0], '주소 새로 만들기 — 옛 주소는 안 받음 · 남은 못 함');
    Settings::save(['keep_days' => 1]);
    HaService::$nowOverride = '2026-10-12 11:00:00';
    $svc->tidy();
    t(DB::table('hal_readings')->count() === 0, '오래된 온습도 기록 지움');
    (new IntegrationListener())->onUserDeleted((object) ['id' => 1]);
    t(DB::table('hal_devices')->count() === 0 && DB::table('hal_runs')->count() === 0, '회원 삭제 → 기기 · 기록 정리');
    Settings::save(['enabled' => false]);
    t(! $svc->ingest(str_repeat('a', 32), [])[0], '꺼 두면 안 받음');

    echo "\n통과 {$pass} · 실패 {$fail}\n";
    exit($fail ? 1 : 0);
}
