<?php

namespace Plugins\Custom\IotLink\Services;

use Illuminate\Support\Facades\DB;
use Plugins\Custom\IotLink\Support\Links;
use Plugins\Custom\IotLink\Support\Notify;
use Plugins\Custom\IotLink\Support\Limits;
use Plugins\Custom\IotLink\Support\Rules;
use Plugins\Custom\IotLink\Support\Schema;
use Plugins\Custom\IotLink\Support\Settings;

/**
 * 📡 IoT 연결 — 회원의 Home Assistant 가 보내는 값(온습도 · 상태)을 받아 둠. 사이트가 회원 집으로 접속하지 않음.
 *  - 기기 = 받는 주소 하나 (비밀 키). 필라멘트 · 레진 보관함 / 내 프린터 / 업체 장비 / 그 밖에 붙임
 *  - 온습도: 지금 값 + 한 시간에 한 줄 기록, 기준(습도 · 온도)을 넘으면 알림 (같은 기기는 일정 시간에 한 번)
 *  - 상태: 「가동 중」 구간을 기록 (정비 수첩이 「가동 몇 시간마다」에 씀) · 내 프린터에 붙인 기기는 그 프린터의 자동 연결로 넘김
 *    (프린터 라운지 PrinterService::hook($token, $payload, $via = 'ha') — 상태가 든 값만 넘김: 상태 없이 넘기면 그쪽이 「쉬는 중」으로 보고 출력을 닫음)
 * 실패는 [false, 메시지] (컨트롤러가 422).
 */
class HaService
{
    /** 받는 사진 한 장의 크기 한도 (바이트) */
    public const SNAP_MAX = 400000;

    /** 검사용 — 지금 ('Y-m-d H:i:s', 설정 시간대) */
    public static ?string $nowOverride = null;

    /** 내 프린터 서비스 (검사에서만 바꿈) */
    public static string $printerService = 'Plugins\\Custom\\MyPrinter\\Services\\PrinterService';

    public static function now(): string
    {
        return self::$nowOverride ?? (new \DateTimeImmutable('now', new \DateTimeZone((string) Settings::get('timezone'))))->format('Y-m-d H:i:s');
    }

    private static function ago(int $seconds): string
    {
        return date('Y-m-d H:i:s', strtotime(self::now()) - $seconds);
    }

    /* ───────── 1.5.0 🏢 업체 기기 — 그 업체 대표 · 관리자가 함께 관리 · 직원은 보기 ───────── */

    /** 내가 고치고 지울 수 있는 기기 (내 것 · 내가 대표 · 관리자인 업체 기기) */
    /** 1.9.0 습도가 구간 밖인가 — 'high' · 'low' · '' */
    public static function outH(object $d, ?float $hum): string
    {
        if ($hum === null) {
            return '';
        }
        if ($d->humidity_max !== null && $hum > (int) $d->humidity_max) {
            return 'high';
        }

        return isset($d->humidity_min) && $hum < (int) $d->humidity_min ? 'low' : '';
    }

    /** 1.9.0 온도가 구간 밖인가 — 'high' · 'low' · '' */
    public static function outT(object $d, ?float $temp): string
    {
        if ($temp === null) {
            return '';
        }
        if ($d->temp_max !== null && $temp > (int) $d->temp_max) {
            return 'high';
        }

        return isset($d->temp_min) && $temp < (int) $d->temp_min ? 'low' : '';
    }

    /** 1.9.0 「40~60%」 · 「60% 넘으면」 · 「30% 밑이면」 */
    public static function rangeText(?int $min, ?int $max, string $u): string
    {
        return $min !== null && $max !== null ? $min.'~'.$max.$u : ($max !== null ? $max.$u.' 넘으면' : ($min !== null ? $min.$u.' 밑이면' : ''));
    }

    /**
     * 1.9.0 📦 보관함에서 바로 — 그 기기의 알림 구간만 고침 (아래 · 위, 비우면 그쪽은 안 봄)
     *
     * @param  array<string, mixed>  $in  humidity_min · humidity_max · temp_min · temp_max (보낸 것만)
     * @return array{0: bool, 1: string}
     */
    public function setRange(int $uid, int $id, array $in): array
    {
        $d = $this->manageable($uid)->where('id', $id)->first();
        if ($d === null) {
            return [false, '고칠 수 있는 기기가 아니에요.'];
        }
        $lim = static fn ($v, int $min, int $max) => $v === null || $v === '' || ! is_numeric($v) ? null : max($min, min($max, (int) round((float) $v)));
        $row = [];
        foreach (['humidity_min' => [0, 100], 'humidity_max' => [1, 100], 'temp_min' => [-40, 400], 'temp_max' => [-40, 400]] as $k => [$a, $b]) {
            if (array_key_exists($k, $in)) {
                $row[$k] = $lim($in[$k], $a, $b);
            }
        }
        $hMin = array_key_exists('humidity_min', $row) ? $row['humidity_min'] : ($d->humidity_min ?? null);
        $hMax = array_key_exists('humidity_max', $row) ? $row['humidity_max'] : $d->humidity_max;
        $tMin = array_key_exists('temp_min', $row) ? $row['temp_min'] : ($d->temp_min ?? null);
        $tMax = array_key_exists('temp_max', $row) ? $row['temp_max'] : $d->temp_max;
        if (($hMin !== null && $hMax !== null && $hMin >= $hMax) || ($tMin !== null && $tMax !== null && $tMin >= $tMax)) {
            return [false, '아래 값은 위 값보다 작아야 해요.'];
        }
        if ($row === []) {
            return [false, '바꿀 값이 없어요.'];
        }
        DB::table(Schema::DEVICES)->where('id', $d->id)->update($row + ['alerted_at' => null, 'updated_at' => now()]);   // 구간이 바뀌면 알림을 다시 볼 수 있게

        $h = self::rangeText($hMin !== null ? (int) $hMin : null, $hMax !== null ? (int) $hMax : null, '%');
        $t = self::rangeText($tMin !== null ? (int) $tMin : null, $tMax !== null ? (int) $tMax : null, '°C');

        $txt = implode(' · ', array_filter([$h !== '' ? '습도 '.$h : '', $t !== '' ? '온도 '.$t : '']));

        return [true, $txt !== '' ? '🔔 「'.$d->name.'」 알림 구간 — '.$txt : '🔔 「'.$d->name.'」 알림 구간을 비웠어요 (알림 없음)'];
    }

    public function manageable(int $uid): \Illuminate\Database\Query\Builder
    {
        $cids = array_column($this->companies($uid), 'id');

        return DB::table(Schema::DEVICES)->where(static fn ($w) => $cids ? $w->where('user_id', $uid)->orWhereIn('company_id', $cids) : $w->where('user_id', $uid));
    }

    /** @return list<array{id: int, name: string, role: string}> 속한 업체 (직원 포함) */
    public function memberCompanies(int $uid): array
    {
        return $uid <= 0 || ! Settings::get('company_link') ? [] : Links::memberCompaniesOf($uid);
    }

    /** 업체 센서 기록 보관(일) — 사이트 값보다 짧게만 (업체 값 0 = 사이트 값) */
    public static function companyKeepDays(int $cid): int
    {
        $site = (int) Settings::get('keep_days');
        $own = (int) (Links::companyData($cid)['keep_days'] ?? 0);

        return $own > 0 ? min($site, $own) : $site;
    }

    /* ───────── 한 화면 ───────── */

    /** @return array<string, mixed> */
    /**
     * 1.5.2 🤖 AI 연결용 — 읽기만 (overview 는 마지막 접속 · 연결 코드 · SmartThings 토큰을 써서 AI 연결의 읽기 상자가 막음)
     * 내 기기 + 속한 업체 기기, 값 · 기준 · 소식 없음 · 붙인 곳. 기록 그래프 · SmartThings 센서 값은 뺌.
     *
     * @return array{devices: list<array<string, mixed>>, companies: list<array<string, mixed>>}
     */
    public function aiDevices(int $uid): array
    {
        if ($uid <= 0 || ! $this->hasTable(Schema::DEVICES)) {
            return ['devices' => [], 'companies' => []];
        }
        $mcos = $this->memberCompanies($uid);
        $mcids = array_column($mcos, 'id');
        $companies = $this->companies($uid);
        $rows = DB::table(Schema::DEVICES)->where(static fn ($w) => $mcids ? $w->where('user_id', $uid)->orWhereIn('company_id', $mcids) : $w->where('user_id', $uid))->orderBy('target')->orderBy('name')->orderBy('id')->get();
        $pn = array_column($this->printers($uid), 'name', 'id');
        $equip = $this->equipment(array_values(array_unique(array_merge(array_column($companies, 'id'), $mcids))));

        return ['devices' => $rows->map(fn ($d) => $this->device($d, [], $pn, $equip) + ['perm' => (int) $d->user_id === $uid || in_array((int) $d->company_id, array_column($companies, 'id'), true) ? 'manage' : 'view'])->all(),
            'companies' => array_merge($companies, $mcos)];
    }

    public function overview(int $uid): array
    {
        Schema::ensure();
        $this->touchSeen($uid);
        $mcos = $this->memberCompanies($uid);   // 1.5.0 🏢 속한 업체의 기기도 (직원은 보기만)
        $mcids = array_column($mcos, 'id');
        $rows = DB::table(Schema::DEVICES)->where(static fn ($w) => $mcids ? $w->where('user_id', $uid)->orWhereIn('company_id', $mcids) : $w->where('user_id', $uid))->orderBy('target')->orderBy('name')->orderBy('id')->get();
        $ids = $rows->pluck('id')->all();
        $hist = [];
        foreach (DB::table(Schema::READINGS)->whereIn('device_id', $ids ?: [0])->where('at', '>=', self::ago(48 * 3600))->orderBy('at')->get(['device_id', 'at', 'temp', 'humidity']) as $r) {
            $hist[(int) $r->device_id][] = [substr((string) $r->at, 5, 11), $r->temp !== null ? (float) $r->temp : null, $r->humidity !== null ? (float) $r->humidity : null];
        }
        $printers = $this->printers($uid);
        $companies = $this->companies($uid);
        $equip = $this->equipment(array_values(array_unique(array_merge(array_column($companies, 'id'), $mcids))));
        $pn = array_column($printers, 'name', 'id');
        // 0.2.0 SmartThings — 설치 · 센서 값 (기기 카드에도 그 기기에 이은 센서를 붙임)
        $st = (new SmartThingsService($this))->forUser($uid);
        $byDev = [];
        foreach ($st['installs'] as $n => $in) {
            foreach ($in['sensors'] as $sn) {
                if ($sn['site']) {
                    $byDev[$sn['site']][] = $sn;   // 1.1.0 로그인 연결은 SmartThings 기기마다 그 사이트 기기에
                }
            }
            if ($in['mode'] === 'oauth') {
                $st['installs'][$n]['sensors'] = [];   // 로그인 연결의 값은 기기 카드에만 보임 — 같은 것을 두 번 내려보내지 않음
            }
        }

        return [
            'now' => self::now(),
            'devices' => $rows->map(fn ($d) => $this->device($d, $hist[(int) $d->id] ?? [], $pn, $equip) + ['perm' => (int) $d->user_id === $uid || in_array((int) $d->company_id, array_column($companies, 'id'), true) ? 'manage' : 'view', 'mine' => (int) $d->user_id === $uid] + ['sensors' => $byDev[(int) $d->id] ?? [], 'group' => self::group((string) ($d->grp ?? ''), (string) $d->target, $d->company_id ? (int) $d->company_id : null, $mcids ?: array_column($companies, 'id')), 'group_auto' => self::group('', (string) $d->target, $d->company_id ? (int) $d->company_id : null, $mcids ?: array_column($companies, 'id'))])->all(),
            'smartthings' => $st,
            'printers' => $printers, 'companies' => $companies, 'member_companies' => $mcos, 'equipment' => array_values($equip), 'locations' => $this->locations($uid),
            'boxes' => Links::boxes($uid),   // 1.6.0 📦 보관함 보드 (재고 관리의 보관함 · 색 · 롤 수)
            'targets' => Rules::TARGETS,
            'link' => ['code' => $this->linkCode($uid), 'site' => rtrim((string) config('app.url'), '/'), 'repo' => (string) Settings::get('hacs_repo')],
            'slots' => (new SlotService())->info($uid, $companies, Limits::exempt($uid)),   // 1.4.8 💳 · 1.4.9 관리자는 살 필요 없음 · 1.8.4 그래도 산 칸은 목록 · 취소
            'limits' => ['admin' => Limits::exempt($uid), 'member' => Limits::member($uid), 'companies' => array_map(fn ($c) => ['id' => $c['id'], 'max' => Limits::company($c['id']), 'used' => Limits::companyUsed($c['id'])], $companies)],   // 1.4.7
            'config' => ['max_devices' => Limits::member($uid), 'interval_min' => (int) Settings::get('interval_min'), 'refresh_sec' => (int) Settings::get('refresh_sec'), 'send_mode' => (string) Settings::get('send_mode'), 'change_hum' => (int) Settings::get('change_hum'), 'idle_min' => (int) Settings::get('idle_min'), 'stale_hours' => (int) Settings::get('stale_hours'), 'base' => rtrim((string) config('app.url'), '/').'/api/plugins/custom-iot_link/in/',
                'printer_link' => $printers !== [] || ((bool) Settings::get('printer_link') && $this->hasTable('mpr_printers')), 'inventory' => Links::inventoryOn()],
        ];
    }

    /**
     * @param  list<array{0: string, 1: ?float, 2: ?float}>  $hist
     * @param  array<int, string>  $pn
     * @param  array<int, array<string, mixed>>  $equip
     * @return array<string, mixed>
     */
    private function device(object $d, array $hist, array $pn, array $equip): array
    {
        $seen = $d->last_seen_at ? (string) $d->last_seen_at : null;
        $stale = $seen === null || $seen < self::ago((int) Settings::get('stale_hours') * 3600);
        $hum = $d->humidity !== null ? (float) $d->humidity : null;
        $temp = $d->temp !== null ? (float) $d->temp : null;
        $where = match ((string) $d->target) {
            'location' => (string) ($d->location ?? ''),
            'printer' => (string) ($pn[(int) $d->printer_id] ?? ''),
            'equipment' => (string) ($equip[(int) $d->equipment_id]['name'] ?? ''),
            default => '',
        };

        return ['id' => (int) $d->id, 'token' => (string) $d->token, 'name' => (string) $d->name, 'target' => (string) $d->target, 'grp' => (string) ($d->grp ?? ''), 'where' => $where, 'source' => (string) ($d->source ?? 'ha'), 'ha_server' => (string) ($d->ha_server ?? ''), 'ha_server_name' => (string) ($d->ha_server_name ?? ''), 'location' => (string) ($d->location ?? ''),
            'printer_id' => $d->printer_id ? (int) $d->printer_id : null, 'company_id' => $d->company_id ? (int) $d->company_id : null, 'equipment_id' => $d->equipment_id ? (int) $d->equipment_id : null,
            'entities' => array_merge(array_fill_keys(Rules::ENTITIES, ''), array_intersect_key((array) json_decode((string) ($d->entities ?? ''), true), array_flip(Rules::ENTITIES))),
            'temp' => $temp, 'humidity' => $hum, 'state' => (string) ($d->state ?? ''), 'is_on' => (bool) $d->is_on && ! $stale,
            'humidity_max' => $d->humidity_max !== null ? (int) $d->humidity_max : null, 'temp_max' => $d->temp_max !== null ? (int) $d->temp_max : null, 'notify' => (bool) $d->notify,
            'humidity_min' => isset($d->humidity_min) ? (int) $d->humidity_min : null, 'temp_min' => isset($d->temp_min) ? (int) $d->temp_min : null,   // 1.9.0
            'over' => ! $stale && (self::outH($d, $hum) !== '' || self::outT($d, $temp) !== ''),   // 1.9.0 위로 넘거나 아래로 내려가면
            'low' => ! $stale && (self::outH($d, $hum) === 'low' || self::outT($d, $temp) === 'low'),
            'caps' => self::caps($d),   // 1.6.0 📦 보관함 보드 — 온도 · 습도 칸 (각 하나씩)
            'snap_public' => (bool) ($d->snap_public ?? false), 'snap_at' => ! empty($d->snap_at) && is_file(self::snapPath((int) $d->id)) ? (string) $d->snap_at : null, 'seen' => $seen, 'stale' => $stale, 'never' => $seen === null, 'hours_30d' => $this->hours([(int) $d->id], self::ago(30 * 86400)), 'history' => $hist];
    }

    /**
     * 1.4.6 📁 분류 — 회원이 고른 것(grp)이 맞으면 그것, 아니면 붙인 곳 따라:
     *  내 프린터 → equip(🛠 장비) · 업체 장비 → c{업체}(🏢 그 업체) · 보관 위치 → mine(📦 개인 재고) · 없음 → none(❓ 미분류)
     *
     * @param  list<int>  $cids  내가 대표 · 관리자인 업체
     */
    public static function group(string $grp, string $target, ?int $cid, array $cids): string
    {
        if (in_array($grp, ['equip', 'mine', 'none'], true)) {
            return $grp;
        }
        if (preg_match('/^c(\d+)$/', $grp, $m) && in_array((int) $m[1], $cids, true)) {
            return $grp;
        }

        return match ($target) {
            'printer' => $cid && in_array($cid, $cids, true) ? 'c'.$cid : 'equip',   // 1.5.0 업체 프린터 → 그 업체
            'equipment' => $cid && in_array($cid, $cids, true) ? 'c'.$cid : 'equip',
            'location' => 'mine',
            default => 'none',
        };
    }

    /** 1.4.6 고를 수 있는 분류인지 ('' = 자동) */
    private function grpOk(int $uid, string $g): bool
    {
        return $g === '' || in_array($g, ['equip', 'mine', 'none'], true) || (preg_match('/^c(\d+)$/', $g, $m) && in_array((int) $m[1], array_column($this->companies($uid), 'id'), true));
    }

    /** 1.4.6 여러 기기 분류 한 번에 @param list<mixed> $ids @return array{0: bool, 1: string} */
    public function groupMany(int $uid, array $ids, string $grp): array
    {
        $ids = array_slice(array_values(array_unique(array_filter(array_map(static fn ($x) => is_numeric($x) ? (int) $x : 0, $ids), static fn ($x) => $x > 0))), 0, 200);
        if ($uid <= 0 || $ids === [] || ! Schema::ensure()) {
            return [false, '옮길 기기를 골라 주세요.'];
        }
        if (! $this->grpOk($uid, $grp)) {
            return [false, '분류를 다시 골라 주세요.'];
        }
        if (str_starts_with($grp, 'c')) {   // 1.4.7 업체 한도
            $own = $this->manageable($uid)->whereIn('id', $ids)->pluck('id')->map(fn ($x) => (int) $x)->all();
            $cos = $this->companies($uid);
            if ($own !== [] && ($full = Limits::companyFull((int) substr($grp, 1), count($own), $own, (string) (collect($cos)->firstWhere('id', (int) substr($grp, 1))['name'] ?? ''), $uid))) {
                return [false, $full];
            }
        }
        $n = $this->manageable($uid)->whereIn('id', $ids)->update(['grp' => $grp === '' ? null : $grp, 'updated_at' => now()]);

        return $n ? [true, '기기 '.$n.'개를 옮겼어요.'] : [false, '옮길 기기를 찾을 수 없어요.'];
    }

    /* ───────── 기기 넣기 · 고치기 ───────── */

    /**
     * @param  array<string, mixed>  $in  name · target · location · printer_id · company_id · equipment_id · entities{…} · humidity_max · temp_max · notify
     * @return array{0: bool, 1: string, 2?: array<string, mixed>}
     */
    public function save(int $uid, ?int $id, array $in): array
    {
        Schema::ensure();
        $old = $id ? $this->manageable($uid)->where('id', $id)->first() : null;   // 1.5.0 업체 기기는 그 업체 대표 · 관리자도
        if ($id && ! $old) {
            return [false, '기기를 찾을 수 없어요.'];
        }
        if (! $old && DB::table(Schema::DEVICES)->where('user_id', $uid)->count() >= Limits::member($uid)) {   // 1.4.7 회원마다 한도
            return [false, '기기는 '.Limits::member($uid).'개까지 연결할 수 있어요.'];
        }
        $target = isset(Rules::TARGETS[$in['target'] ?? '']) ? (string) $in['target'] : ($old->target ?? 'location');
        $row = ['target' => $target, 'location' => null, 'printer_id' => null, 'company_id' => null, 'equipment_id' => null];
        $auto = '';
        if ($target === 'location') {
            $row['location'] = Rules::text($in['location'] ?? '', 40) ?: null;
            if ($row['location'] === null) {
                return [false, '보관 위치를 적어 주세요 (예: 드라이박스 · AMS).'];
            }
            $auto = $row['location'];
        } elseif ($target === 'printer') {
            $p = collect($this->printers($uid))->firstWhere('id', (int) ($in['printer_id'] ?? 0));
            if ($p === null) {
                return [false, '내 프린터에서 골라 주세요.'];
            }
            $row['printer_id'] = $p['id'];
            $row['company_id'] = $p['company_id'] ?? null;   // 1.5.0 🏢 업체 프린터에 붙이면 업체 기기
            $row['equipment_id'] = $p['equipment_id'] ?? null;   // 1.7.9 이어진 업체 장비 — 정비 수첩 가동 시간이 그대로 이어짐
            $auto = $p['name'];
        } elseif ($target === 'equipment') {
            $cids = array_column($this->companies($uid), 'id');
            $e = $this->equipment($cids)[(int) ($in['equipment_id'] ?? 0)] ?? null;
            if ($e === null) {
                return [false, '내가 관리하는 업체의 장비에서 골라 주세요.'];
            }
            $row['equipment_id'] = $e['id'];
            $row['company_id'] = $e['company_id'];
            $auto = $e['name'];
        }
        if (array_key_exists('grp', $in)) {   // 1.4.6 📁 분류
            $g = trim((string) $in['grp']);
            if (! $this->grpOk($uid, $g)) {
                return [false, '분류를 다시 골라 주세요.'];
            }
            $row['grp'] = $g === '' ? null : $g;
        }
        // 1.4.7 업체 한도 — 새로 그 업체에 들어가면 (새 기기 · 분류 · 붙인 곳을 바꿔서)
        $cos = $this->companies($uid);
        $cids = array_column($cos, 'id');
        $ng = self::group((string) (array_key_exists('grp', $row) ? ($row['grp'] ?? '') : ($old->grp ?? '')), $target, $row['company_id'], $cids);
        $og = $old ? self::group((string) ($old->grp ?? ''), (string) $old->target, $old->company_id ? (int) $old->company_id : null, $cids) : '';
        if ($ng !== $og && str_starts_with($ng, 'c') && ($full = Limits::companyFull((int) substr($ng, 1), 1, $old ? [(int) $old->id] : [], (string) (collect($cos)->firstWhere('id', (int) substr($ng, 1))['name'] ?? ''), $uid))) {
            return [false, $full];
        }
        $name = Rules::text($in['name'] ?? '', 60) ?: ($old->name ?? $auto);
        if ($name === '') {
            return [false, '이름을 적어 주세요.'];
        }
        $ent = [];
        foreach (Rules::ENTITIES as $k) {
            $ent[$k] = Rules::entity(is_array($in['entities'] ?? null) ? ($in['entities'][$k] ?? '') : ($in['ent_'.$k] ?? ''));
        }
        $src = $old ? (string) ($old->source ?? 'ha') : (($in['source'] ?? '') === 'matter' ? 'matter' : 'ha');   // 1.10.0 🧩 Matter(3ds 연결) — 새로 만들 때만 고름
        if ($ent['temp'] === '' && $ent['hum'] === '' && $ent['state'] === '' && ! in_array($src, ['smartthings', 'matter'], true)) {   // 0.2.0 SmartThings · 1.10.0 Matter 기기는 센서 이름이 없음
            return [false, 'Home Assistant 의 센서 이름을 하나는 적어 주세요 (예: sensor.drybox_humidity).'];
        }
        $lim = static fn ($v, int $min, int $max) => $v === null || $v === '' || ! is_numeric($v) ? null : max($min, min($max, (int) $v));
        // 1.9.0 아래 기준 — 보낸 것만 고침 (HA 통합 · 예전 화면은 안 보내니 그대로)
        if (array_key_exists('humidity_min', $in)) {
            $row['humidity_min'] = $lim($in['humidity_min'], 0, 100);
        }
        if (array_key_exists('temp_min', $in)) {
            $row['temp_min'] = $lim($in['temp_min'], -40, 400);
        }
        $row += ['name' => $name, 'entities' => json_encode($ent), 'humidity_max' => $lim($in['humidity_max'] ?? null, 1, 100), 'temp_max' => $lim($in['temp_max'] ?? null, -40, 400),
            'notify' => array_key_exists('notify', $in) ? filter_var($in['notify'], FILTER_VALIDATE_BOOLEAN) : (bool) ($old->notify ?? true),
            'snap_public' => array_key_exists('snap_public', $in) ? filter_var($in['snap_public'], FILTER_VALIDATE_BOOLEAN) : (bool) ($old->snap_public ?? false), 'updated_at' => now()];
        if ($old) {
            DB::table(Schema::DEVICES)->where('id', $old->id)->update($row);
            $id = (int) $old->id;
            // 1.4.11 보관 위치를 바꿨으면 재고 관리에 알림 — 옛 보관함이 비면 보관함 이름이 따라감 (옛 이름 보관함이 남고 새 것이 하나 더 생기던 것)
            if ((string) $old->target === 'location' && $target === 'location' && (string) $old->location !== '' && $row['location'] !== null
                && mb_strtolower((string) preg_replace('/\s+/u', '', (string) $old->location)) !== mb_strtolower((string) preg_replace('/\s+/u', '', (string) $row['location']))) {
                Links::sensorMoved($uid, (string) $old->location, (string) $row['location']);
            }
        } else {
            $id = (int) DB::table(Schema::DEVICES)->insertGetId($row + ['user_id' => $uid, 'source' => $src, 'token' => Rules::token(), 'created_at' => now()]);
        }

        return [true, $old ? '고쳤어요.' : ($src === 'matter' ? '기기를 만들었어요. 이제 받는 키를 3ds Matter 연결 설정에 넣어 주세요.' : '기기를 만들었어요. 이제 설정 글을 Home Assistant 에 붙여 넣어 주세요.'), ['id' => $id]];
    }

    /**
     * 1.6.0 이 기기가 재는 것 — 센서 이름(HA) 또는 받은 값(SmartThings 등)으로
     *
     * @return array{state: bool, temp: bool, hum: bool}
     */
    public static function caps(object $d): array
    {
        $e = (array) json_decode((string) ($d->entities ?? ''), true);

        return ['state' => trim((string) ($e['state'] ?? '')) !== '' || trim((string) ($d->state ?? '')) !== '',
            'temp' => trim((string) ($e['temp'] ?? '')) !== '' || $d->temp !== null, 'hum' => trim((string) ($e['hum'] ?? '')) !== '' || $d->humidity !== null];
    }

    /**
     * 1.6.0 📦 보관함 보드 — 기기를 붙이기 · 떼기
     *  target: location(보관함 이름) · printer(내 프린터 번호) · equipment(업체 장비 번호) · ''(대기 칸)
     *  한 곳에 ⚙️ 상태 · 🌡️ 온도 · 💧 습도 각 하나 — 같은 것을 재는 기기가 있으면:
     *   - 상태 센서(장비 · 프린터)가 챔버 온습도까지 재면 그것이 우선 → 일반 온습도 센서는 붙지 않음 / 나중에 그런 상태 센서가 오면 일반 센서를 대기 칸으로
     *   - 그 밖에는 바꿔 끼움 (있던 기기를 대기 칸으로)
     *  보관 위치가 바뀌어도 재고 관리 보관함 이름은 따라가지 않음 (보드는 「옮기기」 — 이름 바꾸기는 재고 관리에서)
     *
     * @return array{0: bool, 1: string, 2?: array<string, mixed>}
     */
    public function place(int $uid, int $id, string $target, string $location = '', int $ref = 0): array
    {
        Schema::ensure();
        $d = $this->manageable($uid)->where('id', $id)->first();
        if (! $d) {
            return [false, '기기를 찾을 수 없어요.'];
        }
        $free = ['target' => 'other', 'location' => null, 'printer_id' => null, 'equipment_id' => null, 'updated_at' => now()];
        if ($target === '') {
            DB::table(Schema::DEVICES)->where('id', $id)->update($free);

            return [true, '📡 「'.$d->name.'」을(를) 대기 칸으로 뺐어요.', ['bounced' => []]];
        }
        $caps = self::caps($d);
        $row = ['target' => $target, 'location' => null, 'printer_id' => null, 'equipment_id' => null, 'updated_at' => now()];
        $key = static fn ($v) => mb_strtolower((string) preg_replace('/\s+/u', '', (string) $v));
        if ($target === 'location') {
            $loc = Rules::text($location, 40);
            if ($loc === '') {
                return [false, '보관함을 골라 주세요.'];
            }
            if (! $caps['temp'] && ! $caps['hum']) {
                return [false, '보관함에는 온도 · 습도를 재는 센서만 붙일 수 있어요.'];
            }
            // 1.7.6 ref = 업체 번호면 🏢 업체 보관함 (내가 대표 · 관리자인 업체만) — 같은 보관함은 그 업체 기기끼리
            $cid = $ref > 0 && in_array($ref, array_map('intval', array_column($this->companies($uid), 'id')), true) ? $ref : null;
            if ($ref > 0 && $cid === null) {
                return [false, '내가 관리하는 업체의 보관함에서 골라 주세요.'];
            }
            $row['location'] = $loc;
            $row['company_id'] = $cid;
            $same = ($cid ? DB::table(Schema::DEVICES)->where('company_id', $cid) : DB::table(Schema::DEVICES)->where('user_id', $d->user_id)->where(static fn ($w) => $w->whereNull('company_id')->orWhere('company_id', 0)))
                ->where('target', 'location')->where('id', '!=', $id)->get()->filter(static fn ($o) => $key($o->location) === $key($loc));
            $where = '📦 「'.$loc.'」';
        } elseif ($target === 'printer') {
            $pr = collect($this->printers($uid))->firstWhere('id', $ref);
            if ($pr === null) {
                return [false, '내 프린터에서 골라 주세요.'];
            }
            $row['printer_id'] = $pr['id'];
            $row['company_id'] = $pr['company_id'] ?? null;
            $row['equipment_id'] = $pr['equipment_id'] ?? null;   // 1.7.9 이어진 업체 장비 — 같은 기계라 칸도 같이 셈
            $eq = $row['equipment_id'];
            $same = DB::table(Schema::DEVICES)->where('id', '!=', $id)->where(static fn ($w) => $w->where(static fn ($a) => $a->where('target', 'printer')->where('printer_id', $pr['id']))
                ->when($eq, static fn ($q) => $q->orWhere(static fn ($a) => $a->where('target', 'equipment')->where('equipment_id', $eq))))->get();
            $where = '🖨️ 「'.$pr['name'].'」';
        } elseif ($target === 'equipment') {
            $e = $this->equipment(array_column($this->companies($uid), 'id'))[$ref] ?? null;
            if ($e === null) {
                return [false, '내가 관리하는 업체의 장비에서 골라 주세요.'];
            }
            $row['equipment_id'] = $e['id'];
            $row['company_id'] = $e['company_id'];
            $same = DB::table(Schema::DEVICES)->where('target', 'equipment')->where('equipment_id', $e['id'])->where('id', '!=', $id)->get();
            $where = '🏭 「'.$e['name'].'」';
        } else {
            return [false, '붙일 곳을 다시 골라 주세요.'];
        }
        // 장비(프린터 · 레이저 · CNC · 건조기 …)의 상태 센서가 이미 재는 챔버 온도 · 습도는 장비 값이 우선 — 빠진 항목만 일반 센서로 (베드 · 노즐 온도는 장비 값뿐)
        $left = $caps;
        foreach ($same as $o) {
            $oc = self::caps($o);
            if ($oc['state'] && ! $caps['state']) {
                $left['temp'] = $left['temp'] && ! $oc['temp'];
                $left['hum'] = $left['hum'] && ! $oc['hum'];
            }
        }
        if (! $left['state'] && ! $left['temp'] && ! $left['hum']) {
            return [false, $where.'에는 상태 센서가 챔버 온도 · 습도까지 재고 있어요 — 일반 센서는 붙이지 않아도 돼요.'];
        }
        $bounce = [];
        foreach ($same as $o) {
            $oc = self::caps($o);
            if ($oc['state'] && ! $caps['state']) {
                continue;   // 상태 센서는 그대로 (빈 항목만 채움)
            }
            if (($caps['state'] && $oc['state']) || ($left['temp'] && $oc['temp']) || ($left['hum'] && $oc['hum'])) {
                $bounce[] = $o;   // 같은 항목을 재는 일반 센서 · 새 상태 센서가 오면 예전 상태 센서
            }
        }
        foreach ($bounce as $o) {
            DB::table(Schema::DEVICES)->where('id', $o->id)->update($free);
        }
        DB::table(Schema::DEVICES)->where('id', $id)->update($row);
        $names = array_map(static fn ($o) => (string) $o->name, $bounce);

        return [true, $where.'에 「'.$d->name.'」을(를) 붙였어요.'.($names ? ' (자리가 겹친 '.implode(' · ', $names).' 은(는) 대기 칸으로)' : ''), ['bounced' => $names]];
    }

    /** @return array{0: bool, 1: string} */
    public function delete(int $uid, int $id): array
    {
        return $this->deleteMany($uid, [$id])[0] ? [true, '지웠어요.'] : [false, '기기를 찾을 수 없어요.'];
    }

    /**
     * 1.4.5 여러 기기 한 번에 지우기 (내 것만 · 한 번에 200개까지) — 기록 · 사진도. SmartThings 설정은 위치마다 한 번만 고침
     *
     * @param  list<mixed>  $ids
     * @return array{0: bool, 1: string}
     */
    public function deleteMany(int $uid, array $ids): array
    {
        $ids = array_slice(array_values(array_unique(array_filter(array_map(static fn ($x) => is_numeric($x) ? (int) $x : 0, $ids), static fn ($x) => $x > 0))), 0, 200);
        $own = $uid > 0 && $ids !== [] && Schema::ensure() ? $this->manageable($uid)->whereIn('id', $ids)->pluck('id')->map(fn ($x) => (int) $x)->all() : [];
        if ($own === []) {
            return [false, '지울 기기를 찾을 수 없어요.'];
        }
        DB::table(Schema::DEVICES)->whereIn('id', $own)->delete();
        DB::table(Schema::READINGS)->whereIn('device_id', $own)->delete();
        DB::table(Schema::RUNS)->whereIn('device_id', $own)->delete();
        foreach ($own as $id) {
            @unlink(self::snapPath($id));
        }
        (new SmartThingsService($this))->devicesDeleted($uid, $own);   // 0.2.0 SmartThings 연결은 남김 · 1.1.0 로그인 연결은 그 센서를 고른 것에서 뺌

        return [true, '기기 '.count($own).'개를 지웠어요.'];
    }

    /** 받는 주소 바꾸기 (주소가 새어 나갔을 때) @return array{0: bool, 1: string} */
    public function rotate(int $uid, int $id): array
    {
        $n = Schema::ensure() ? $this->manageable($uid)->where('id', $id)->update(['token' => Rules::token(), 'updated_at' => now()]) : 0;

        return $n ? [true, '주소를 바꿨어요 — Home Assistant 설정의 주소도 새 것으로 바꿔 주세요.'] : [false, '기기를 찾을 수 없어요.'];
    }

    /* ───────── 연결 코드 · 허브 (HACS 통합 ↔ 사이트) ───────── */

    /** 회원의 연결 코드 (없으면 만듦) */
    public function linkCode(int $uid): string
    {
        if ($uid <= 0 || ! Schema::ensure()) {
            return '';
        }
        $c = (string) DB::table(Schema::LINKS)->where('user_id', $uid)->value('code');
        if ($c === '') {
            $c = Rules::token();
            DB::table(Schema::LINKS)->insert(['user_id' => $uid, 'code' => $c, 'created_at' => now(), 'updated_at' => now()]);
        }

        return $c;
    }

    /** 0.1.5 이 회원이 지금 사이트 화면을 보고 있음 — 1분에 한 번만 적음 */
    public function touchSeen(int $uid): void
    {
        if ($uid <= 0 || ! Schema::ensure()) {
            return;
        }
        try {
            $this->linkCode($uid);
            DB::table(Schema::LINKS)->where('user_id', $uid)->where('updated_at', '<', now()->subSeconds(60))->update(['updated_at' => now()]);
        } catch (\Throwable) {
        }
    }

    /**
     * 0.1.5 통합에게 알려 줄 것 — 다음에 몇 분 뒤에 보낼지 · 사진을 보낼지.
     *  회원이 사이트 화면을 「자리 비움」 시간 넘게 안 봤으면 느린 주기로. 공개로 둔 사진은 자리 비움이어도 받음 (다른 사람이 보므로).
     *
     * @return array<string, mixed> next_min · snap · away · mode · change_hum · change_temp · gap_sec
     */
    public function pace(int $uid, bool $snapPublic = false): array
    {
        $after = (int) Settings::get('away_after_min');
        $away = false;
        if ($after > 0) {
            try {
                $seen = DB::table(Schema::LINKS)->where('user_id', $uid)->value('updated_at');
                $away = $seen === null || strtotime((string) $seen) < time() - $after * 60;
            } catch (\Throwable) {
            }
        }

        $change = Settings::get('send_mode') === 'change';

        // 0.1.6 next_min = 정해진 때마다 한 번 보내는 주기 (「변하면」 방식에서는 변화가 없을 때의 신호 주기). gap_sec = 변해서 보낼 때의 최소 간격 (자리 비움이면 길게)
        return ['next_min' => (int) Settings::get($away ? 'away_interval_min' : ($change ? 'idle_min' : 'interval_min')), 'snap' => (bool) Settings::get('snapshot') && (! $away || $snapPublic), 'away' => $away,
            'mode' => $change ? 'change' : 'interval', 'change_hum' => (int) Settings::get('change_hum'), 'change_temp' => 0.5, 'gap_sec' => $away ? 600 : 60];
    }

    /** 연결 코드 새로 만들기 — 예전 코드로는 통합이 기기를 만들거나 고치지 못함 (이미 만든 기기의 값 보내기는 그대로 됨) @return array{0: bool, 1: string} */
    public function rotateLink(int $uid): array
    {
        $this->linkCode($uid);
        DB::table(Schema::LINKS)->where('user_id', $uid)->update(['code' => Rules::token(), 'updated_at' => now()]);

        return [true, '연결 코드를 새로 만들었어요.'];
    }

    /** 연결 코드 → 회원 (없으면 0) */
    public function linkUser(string $code): int
    {
        if (! Settings::get('enabled') || ! Schema::ensure() || ! preg_match('/^[a-f0-9]{32}$/', $code)) {
            return 0;
        }
        $uid = (int) DB::table(Schema::LINKS)->where('code', $code)->value('user_id');
        if ($uid > 0 && random_int(1, 5) === 1) {
            DB::table(Schema::LINKS)->where('user_id', $uid)->update(['used_at' => self::now()]);
        }

        return $uid;
    }

    /**
     * 통합이 받아 가는 것 — 붙일 수 있는 곳 · 이미 만든 기기 (값 · 받는 주소 포함: 통합이 그 주소로 보냄)
     *
     * @return array<string, mixed>
     */
    /**
     * @param  array{id: string, name: string}|null  $srv  1.8.0 요청한 HA 서버 — 있으면 그 서버 기기 · 아직 서버가 안 적힌 기기만 (다른 서버 기기를 잘못 가져가지 않게)
     */
    public function hub(int $uid, ?array $srv = null): array
    {
        $o = $this->overview($uid);
        if ($srv) {
            $o['devices'] = array_values(array_filter($o['devices'], fn ($d) => $d['ha_server'] === '' || $d['ha_server'] === $srv['id']));
        }

        return ['site' => (string) (config('app.name') ?: 'G7'), 'targets' => $o['targets'], 'locations' => $o['locations'], 'printers' => $o['printers'],
            'equipment' => array_map(fn ($e) => ['id' => $e['id'], 'name' => trim((string) (collect($o['companies'])->firstWhere('id', $e['company_id'])['name'] ?? '').' — '.$e['name'], ' —')], $o['equipment']),
            'devices' => array_map(fn ($d) => ['id' => $d['id'], 'name' => $d['name'], 'target' => $d['target'], 'token' => $d['token'], 'printer_id' => $d['printer_id'], 'equipment_id' => $d['equipment_id'], 'location' => $d['location'], 'entities' => $d['entities'], 'humidity_max' => $d['humidity_max'], 'temp_max' => $d['temp_max'], 'snap_public' => $d['snap_public']], array_values(array_filter($o['devices'], fn ($d) => $d['source'] === ($srv && str_starts_with($srv['id'], 'matter') ? 'matter' : 'ha')))),   // 0.2.0 SmartThings 기기는 HA 통합에 안 보임 · 1.10.0 Matter 기기는 3ds Matter 연결에만
            'push_url' => $o['config']['base'], 'interval_min' => (int) Settings::get('interval_min'), 'send_mode' => (string) Settings::get('send_mode'),
            'next_min' => (int) Settings::get(Settings::get('send_mode') === 'change' ? 'idle_min' : 'interval_min'), 'change_hum' => (int) Settings::get('change_hum'), 'change_temp' => 0.5, 'gap_sec' => 60, 'snapshot' => (bool) Settings::get('snapshot'), 'snap_gap_min' => (int) Settings::get('snap_gap_min'), 'snap_max' => self::SNAP_MAX];
    }

    /** 통합이 기기를 만들거나 고침 — 화면에서 하는 것과 같은 규칙 @return array{0: bool, 1: string, 2?: array<string, mixed>} */
    /**
     * 1.7.15 새 기기 이름이 내 보관함 · 프린터 · 업체 장비 이름과 거의 같으면 거기에 저절로 — 아니면 📡 대기 칸 (📦 보드에서 직접)
     *  거의 같음 = 빈칸 · 기호 · 대소문자 빼고 같거나, 한쪽이 다른 쪽을 품고 짧은 쪽이 긴 쪽의 70% 이상(3글자 이상). 딱 하나만 맞을 때만.
     *  프린터 라운지 프린터와 이어진 업체 장비는 그 프린터로 (하나로 셈)
     *
     * @return array{target?: string, location?: string, printer_id?: int, equipment_id?: int}
     */
    public function autoAttach(int $uid, string $name): array
    {
        $norm = static fn (string $v) => mb_strtolower((string) preg_replace('/[^\p{L}\p{N}]+/u', '', $v));
        $n = $norm($name);
        if (mb_strlen($n) < 3) {
            return [];
        }
        $near = static function (string $c) use ($n, $norm): bool {
            $c = $norm($c);
            if ($c === '' || mb_strlen($c) < 3) {
                return false;
            }
            if ($c === $n) {
                return true;
            }
            [$s, $l] = mb_strlen($c) < mb_strlen($n) ? [$c, $n] : [$n, $c];

            return str_contains($l, $s) && mb_strlen($s) / mb_strlen($l) >= 0.7;
        };
        $hits = [];
        $linked = [];
        foreach ($this->locations($uid) as $l) {   // 📦 보관함 (재고 관리 보관함 · 롤에 적힌 위치 · 다른 센서의 위치)
            if ($near((string) $l)) {
                $hits['l'.$norm((string) $l)] = ['target' => 'location', 'location' => (string) $l];
            }
        }
        foreach ($this->printers($uid) as $p) {
            if (! empty($p['equipment_id'])) {
                $linked[(int) $p['equipment_id']] = (int) $p['id'];
            }
            foreach ([$p['nickname'] ?? '', $p['model'] ?? '', trim(($p['brand'] ?? '').' '.($p['model'] ?? '')), trim(($p['nickname'] ?? '').' '.($p['brand'] ?? '').' '.($p['model'] ?? ''))] as $c) {
                if ($near((string) $c)) {
                    $hits['p'.$p['id']] = ['target' => 'printer', 'printer_id' => (int) $p['id']];
                }
            }
        }
        foreach ($this->equipment(array_column($this->companies($uid), 'id')) as $e) {
            $parts = array_merge([(string) $e['name']], array_slice(preg_split('/\s+[—-]\s+/u', (string) $e['name']) ?: [], 1));   // 「업체 — 제조사 모델」이면 뒤쪽만으로도
            foreach ($parts as $c) {
                if ($near($c)) {
                    $pid = $linked[(int) $e['id']] ?? 0;
                    $hits[$pid ? 'p'.$pid : 'e'.$e['id']] = $pid ? ['target' => 'printer', 'printer_id' => $pid] : ['target' => 'equipment', 'equipment_id' => (int) $e['id']];
                }
            }
        }

        return count($hits) === 1 ? array_values($hits)[0] : [];
    }

    /** 1.8.0 🏠 그 기기를 보낸 HA 서버를 적어 둠 — 바뀌었을 때만 (값을 받을 때마다 부르므로 같으면 쓰지 않음) @param array{id: string, name: string}|null $srv */
    public function tagServer(?int $id, ?string $token, ?array $srv, ?int $uid = null): void
    {
        if (! $srv || ($id === null && $token === null) || ! Schema::ensure()) {
            return;
        }
        try {
            DB::table(Schema::DEVICES)->when($id !== null, fn ($q) => $q->where('id', $id), fn ($q) => $q->where('token', $token))->when($uid !== null, fn ($q) => $q->where('user_id', $uid))   // 1.8.2 통합이 켤 때 알려 준 기기는 그 회원 것만
                ->where(fn ($q) => $q->whereNull('ha_server')->orWhere('ha_server', '!=', $srv['id'])->orWhereNull('ha_server_name')->orWhere('ha_server_name', '!=', $srv['name']))
                ->update(['ha_server' => $srv['id'], 'ha_server_name' => $srv['name']]);
        } catch (\Throwable) {
        }
    }

    public function hubSave(int $uid, ?int $id, array $in): array
    {
        // 1.7.15 HA 통합이 보관함(보관 위치)으로 붙이라고 해도 그대로 믿지 않음 — 새 기기는 이름이 보관함 · 프린터 · 장비와 거의 같을 때만 거기에, 아니면 📡 대기 칸 / 고칠 때는 사이트에서 붙인 곳 그대로
        if (($in['target'] ?? '') === 'location') {
            $old = $id ? $this->manageable($uid)->where('id', $id)->first() : null;
            if (! $old && trim((string) ($in['name'] ?? '')) === '' && trim((string) ($in['location'] ?? '')) !== '') {
                $in['name'] = (string) $in['location'];   // 이름은 HA 가 고른 보관 위치 이름으로 (붙이지만 않음)
            }
            $in = ['target' => $old ? (string) $old->target : 'other', 'location' => $old->location ?? null, 'printer_id' => $old->printer_id ?? null, 'equipment_id' => $old->equipment_id ?? null] + $in;
            if (! $old) {
                $in = $this->autoAttach($uid, (string) ($in['name'] ?? '')) + $in;   // 이름이 거의 같은 곳이 딱 하나면 거기에
            }
        }
        $r = $this->save($uid, $id, $in);
        if (! $r[0]) {
            return $r;
        }
        $d = DB::table(Schema::DEVICES)->where('id', (int) $r[2]['id'])->first();

        return [true, $r[1], ['id' => (int) $d->id, 'name' => (string) $d->name, 'token' => (string) $d->token, 'push_url' => rtrim((string) config('app.url'), '/').'/api/plugins/custom-iot_link/in/'.$d->token]];
    }

    /* ───────── 받기 (Home Assistant → 사이트) ───────── */

    /**
     * 받는 주소로 들어온 값 반영 — 요청 하나에 조회 1 · 저장 1~3.
     *
     * @param  array<string, mixed>  $payload  temperature · humidity · state(on) · progress · remaining_min · job
     * @param  string  $via  1.2.0 값을 보낸 곳 — 'ha'(받는 주소) · 'matter'(1.10.0 3ds Matter 연결이 보낸 받는 주소) · 'smartthings'(SmartThings 이벤트). 기기 카드 하나에 둘이 같이 붙을 수 있어 카드의 source 가 아니라 이번 값으로 가림
     * @return array{0: bool, 1: string, 2?: array{next_min: int, snap: bool, away: bool}}
     */
    public function ingest(string $token, array $payload, string $via = 'ha'): array
    {
        if (! Settings::get('enabled') || ! Schema::ensure() || ! preg_match('/^[a-f0-9]{32}$/', $token)) {
            return [false, 'off'];
        }
        $d = DB::table(Schema::DEVICES)->where('token', $token)->first();
        if ($d === null) {
            return [false, 'unknown'];
        }
        $v = Rules::payload($payload);
        $now = self::now();
        $set = ['last_seen_at' => $now];
        if ($via === 'matter' && ($d->source ?? 'ha') === 'ha') {
            $set['source'] = 'matter';   // 1.10.0 🧩 HA 기기로 만들었어도 3ds Matter 연결이 보내면 Matter 기기로 (받는 곳 표시)
        }
        if ($v['temp'] !== null) {
            $set['temp'] = $v['temp'];
        }
        if ($v['humidity'] !== null) {
            $set['humidity'] = $v['humidity'];
        }
        // 온습도 기록 — 한 시간에 한 줄 (그 시간의 마지막 값)
        if ($v['temp'] !== null || $v['humidity'] !== null) {
            $hour = substr($now, 0, 13).':00:00';
            $vals = array_filter(['temp' => $v['temp'], 'humidity' => $v['humidity']], static fn ($x) => $x !== null);
            DB::table(Schema::READINGS)->updateOrInsert(['device_id' => $d->id, 'at' => $hour], $vals);
        }
        // 가동 — 켜짐/꺼짐이 바뀔 때만 기록. 오래 소식이 없다가 온 것은 예전 구간을 마지막 소식 때로 닫음
        if ($v['state'] !== null) {
            $on = Rules::isOn($v['state']);
            $set['state'] = $v['state'];
            $set['is_on'] = $on;
            $gap = $d->last_seen_at !== null && (string) $d->last_seen_at < self::ago((int) Settings::get('stale_hours') * 3600);
            if ($d->is_on && (! $on || $gap)) {
                DB::table(Schema::RUNS)->where('device_id', $d->id)->whereNull('ended_at')->update(['ended_at' => $gap ? (string) $d->last_seen_at : $now]);
            }
            if ($on && (! $d->is_on || $gap)) {
                DB::table(Schema::RUNS)->insert(['device_id' => $d->id, 'started_at' => $now]);
            }
        }
        // 기준을 넘으면 알림 — 한 번 보내면 내려올 때까지(또는 일정 시간) 다시 안 보냄
        $hum = $v['humidity'] ?? ($d->humidity !== null ? (float) $d->humidity : null);
        $temp = $v['temp'] ?? ($d->temp !== null ? (float) $d->temp : null);
        $overH = self::outH($d, $hum) !== '';   // 1.9.0 위로 넘거나 아래로 내려가면
        $overT = self::outT($d, $temp) !== '';
        if ($overH || $overT) {
            if ($d->notify && ($d->alerted_at === null || (string) $d->alerted_at < self::ago((int) Settings::get('alert_gap_hours') * 3600))) {
                $set['alerted_at'] = $now;
                $this->alert($d, $overH ? $hum : null, $overT ? $temp : null);
            }
        } elseif ($d->alerted_at !== null && ($hum === null || (($d->humidity_max === null || $hum <= (int) $d->humidity_max - 3) && (! isset($d->humidity_min) || $hum >= (int) $d->humidity_min + 3)))) {
            $set['alerted_at'] = null;   // 구간 안으로 3% 넘게 들어오면 다음 번에 다시 알림 (1.9.0 아래쪽도)
        }
        DB::table(Schema::DEVICES)->where('id', $d->id)->update($set);
        if ($d->target === 'printer' && $d->printer_id && $v['state'] !== null) {
            $this->forwardPrinter((int) $d->printer_id, (int) $d->user_id, $v, $via, (bool) $d->is_on !== Rules::isOn($v['state']));
        }
        if (random_int(1, 200) === 1) {
            $this->tidy();
        }

        return [true, 'ok', $this->pace((int) $d->user_id, (bool) ($d->snap_public ?? false))];
    }

    private function alert(object $d, ?float $hum, ?float $temp): void
    {
        $ch = array_keys(array_filter(['database' => (bool) Settings::get('notify_site'), 'mail' => (bool) Settings::get('notify_mail')]));
        $hMin = isset($d->humidity_min) ? (int) $d->humidity_min : null;
        $tMin = isset($d->temp_min) ? (int) $d->temp_min : null;
        $what = array_filter([$hum !== null ? '습도 '.$hum.'%'.($hMin === null ? ' (기준 '.$d->humidity_max.'%)' : ' '.(self::outH($d, $hum) === 'low' ? '너무 낮음' : '너무 높음').' (구간 '.self::rangeText($hMin, $d->humidity_max !== null ? (int) $d->humidity_max : null, '%').')') : null,
            $temp !== null ? '온도 '.$temp.'°C'.($tMin === null ? ' (기준 '.$d->temp_max.'°C)' : ' '.(self::outT($d, $temp) === 'low' ? '너무 낮음' : '너무 높음').' (구간 '.self::rangeText($tMin, $d->temp_max !== null ? (int) $d->temp_max : null, '°C').')') : null]);   // 1.9.0 아래 기준이 있으면 구간으로
        $lines = ['🏠 '.$d->name.' — '.implode(' · ', $what)];
        // 1.4.0 그 보관 위치에 있는 필라멘트 · 레진 — 재고 관리에 물어봄 (내 것 + 내가 대표 · 관리자인 업체의 개봉한 것)
        if ($d->target === 'location' && $d->location && $hum !== null) {
            $at = Links::spoolsAt((int) $d->user_id, (string) $d->location);
            if ($at['mine']) {
                $lines[] = '🧵 여기 있는 것: '.implode(' · ', $at['mine']).' — 건조를 챙겨 주세요.';
            }
            if ($at['company']) {
                $lines[] = '🏢 업체 재고: '.implode(' · ', $at['company']).' — 건조를 챙겨 주세요.';
            }
        }
        Notify::send((int) $d->user_id, $ch, '[IoT 연결] '.$d->name.' '.($hum !== null ? (self::outH($d, $hum) === 'low' ? '습도가 낮아요 💧' : '습도가 높아요 💧') : (self::outT($d, $temp) === 'low' ? '온도가 낮아요 🌡️' : '온도가 높아요 🌡️')), implode("\n", $lines));
    }

    /** 내 프린터에 붙인 기기 — 그 프린터의 자동 연결(custom-my_printer)로 상태를 넘김. 그 플러그인이 없거나 바뀌었으면 조용히 건너뜀 */
    private function forwardPrinter(int $printerId, int $uid, array $v, string $source = 'ha', bool $changed = true): void
    {
        if (! Settings::get('printer_link') || ! $this->hasTable('mpr_printers')) {
            return;
        }
        try {
            $cls = self::$printerService;
            $cids = array_column($this->companies($uid), 'id');   // 1.5.0 🏢 업체 프린터
            $tok = (string) DB::table('mpr_printers')->where('id', $printerId)->where(fn ($w) => $cids && $this->hasCol('mpr_printers', 'company_id') ? $w->where('user_id', $uid)->orWhereIn('company_id', $cids) : $w->where('user_id', $uid))->value('hook_token');
            if ($tok === '' || ! class_exists($cls) || ! method_exists($cls, 'hook')) {
                return;
            }
            // 0.1.9 상태는 그쪽이 아는 말로 (모르는 글이면 출력이 「그만둠」으로 닫힘) · 내부 온도 · 습도도 같이 (프린터 라운지 0.1.24+ 가 보임 — chamber · humidity)
            $state = Rules::printerState($v['state']);
            $st = $source === 'smartthings';
            // 1.2.0 프린터 라운지 0.1.28+ 가 아는 것 — via_st: SmartThings 로 받았다고 표시 · env: 주변 온습도는 필터(printer_env)로 물어 감
            $caps = defined($cls.'::IOT_CAPS') && is_array(constant($cls.'::IOT_CAPS')) ? constant($cls.'::IOT_CAPS') : [];
            $x = is_array($v['x'] ?? null) ? $v['x'] : [];
            // 1.3.0 SmartThings 는 값 하나가 바뀔 때마다 오므로(온도 · 스위치 …) 「쉬는 중」을 거듭 넘기지 않음 — 켜짐 → 꺼짐으로 바뀐 그때만.
            //  (한 줄 연결 · 손으로 시작한 출력이 SmartThings 의 「쉬는 중」 한 번에 닫히지 않게 · 처음 연결할 때도)
            if ($st && ! $changed && ! in_array($state, ['printing', 'paused'], true)) {
                return;
            }
            if ($st && $state === 'idle') {
                // 1.2.0 SmartThings 플러그는 진행률을 몰라, 꺼지면(전력이 내려가면) 출력 기록이 늘 「그만둠」으로 닫혔을 것 → 「완료」로
                // 1.3.0 프린터 기기는 진행률을 앎 — 거의 끝(98%+)이면 「완료」, 아니면 그대로 넘겨 프린터 라운지가 마지막 진행률로 가림(완료 · 그만둠)
                $state = ! empty($x['printer']) && (float) ($v['progress'] ?? 0) < 98 ? 'idle' : 'done';
            }
            $env = $st && in_array('env', $caps, true);   // SmartThings 온습도계는 프린터 안(챔버)이 아니라 주변 값 — 라운지가 「주변」으로 따로 보임
            $hum = $x['ams_humidity'] ?? ($env ? null : $v['humidity']);
            (new $cls())->hook($tok, array_filter(['state' => $state, 'progress' => $v['progress'], 'remaining_min' => $v['remaining_min'], 'job' => $v['job'],
                'nozzle' => $x['nozzle'] ?? null, 'bed' => $x['bed'] ?? null, 'chamber' => $x['chamber'] ?? ($env ? null : $v['temp']), 'humidity' => $hum,
                'hum_src' => isset($x['ams_humidity']) ? 'ams' : null, 'light' => $x['light'] ?? null, 'fan' => $x['fan'] ?? null,
                'source' => ! empty($x['printer']) ? 'printer' : null], static fn ($y) => $y !== null), $st && in_array('via_st', $caps, true) ? 'st' : 'ha');
        } catch (\Throwable) {
        }
    }

    /* ───────── 카메라 사진 (최신 한 장) ───────── */

    public static function snapPath(int $id): string
    {
        try {
            $base = function_exists('storage_path') ? storage_path('app') : sys_get_temp_dir();
        } catch (\Throwable) {
            $base = sys_get_temp_dir();
        }

        return $base.DIRECTORY_SEPARATOR.'ha_link'.DIRECTORY_SEPARATOR.$id.'.jpg';
    }

    /**
     * 사진 받기 — JPEG 만, 크기 한도 안, 정한 간격보다 자주 오면 받지 않음. 기기마다 한 장을 덮어씀 (쌓이지 않음).
     *
     * @return array{0: bool, 1: string}
     */
    public function snapshot(string $token, string $bytes): array
    {
        if (! Settings::get('enabled') || ! Settings::get('snapshot') || ! Schema::ensure() || ! preg_match('/^[a-f0-9]{32}$/', $token)) {
            return [false, 'off'];
        }
        $d = DB::table(Schema::DEVICES)->where('token', $token)->first();
        if ($d === null) {
            return [false, 'unknown'];
        }
        if (! empty($d->snap_at) && (string) $d->snap_at > self::ago((int) Settings::get('snap_gap_min') * 60 - 20)) {
            return [true, 'skip'];   // 너무 자주 — 버림 (보내는 쪽은 성공으로 봄)
        }
        $len = strlen($bytes);
        if ($len < 100 || $len > self::SNAP_MAX || substr($bytes, 0, 3) !== "\xFF\xD8\xFF") {
            return [false, 'jpeg only'];
        }
        $info = @getimagesizefromstring($bytes);
        if (! is_array($info) || ($info[2] ?? 0) !== IMAGETYPE_JPEG || $info[0] < 1 || $info[1] < 1 || $info[0] > 2000 || $info[1] > 2000) {
            return [false, 'bad image'];
        }
        $path = self::snapPath((int) $d->id);
        if (! is_dir(dirname($path)) && ! @mkdir(dirname($path), 0775, true) && ! is_dir(dirname($path))) {
            return [false, 'storage'];
        }
        if (@file_put_contents($path, $bytes, LOCK_EX) === false) {
            return [false, 'storage'];
        }
        DB::table(Schema::DEVICES)->where('id', $d->id)->update(['snap_at' => self::now(), 'last_seen_at' => self::now()]);

        return [true, 'ok'];
    }

    /** 내 기기의 사진 파일 (없으면 null) */
    public function snapFile(int $uid, int $id): ?string
    {
        $mc = array_column($this->memberCompanies($uid), 'id');   // 1.5.0 업체 기기 사진은 업체 사람에게
        $ok = Schema::ensure() && DB::table(Schema::DEVICES)->where('id', $id)->where(static fn ($w) => $mc ? $w->where('user_id', $uid)->orWhereIn('company_id', $mc) : $w->where('user_id', $uid))->whereNotNull('snap_at')->exists();
        $p = self::snapPath($id);

        return $ok && is_file($p) ? $p : null;
    }

    /**
     * 공개로 둔 사진 파일 — 회원이 「공개」로 정한 기기만. 오래된(끊긴) 사진은 내보내지 않음.
     *
     * @return array{path: string, at: string}|null
     */
    public function publicSnap(int $deviceId): ?array
    {
        if (! Settings::get('enabled') || ! Settings::get('snapshot') || ! Schema::ensure()) {
            return null;
        }
        $d = DB::table(Schema::DEVICES)->where('id', $deviceId)->where('snap_public', true)->whereNotNull('snap_at')->first();
        $p = self::snapPath($deviceId);

        return $d !== null && (string) $d->snap_at >= self::ago(86400) && is_file($p) ? ['path' => $p, 'at' => (string) $d->snap_at] : null;
    }

    /**
     * 그 「내 프린터」에 붙인 기기의 공개 사진 (다른 확장이 씀 — 필터 custom-iot_link.printer_snapshot)
     *
     * @return array{url: string, at: string, device_id: int}|null
     */
    public function printerSnapshot(int $printerId): ?array
    {
        if ($printerId <= 0 || ! Schema::ensure()) {
            return null;
        }
        foreach (DB::table(Schema::DEVICES)->where('target', 'printer')->where('printer_id', $printerId)->where('snap_public', true)->whereNotNull('snap_at')->orderByDesc('snap_at')->limit(3)->get(['id']) as $d) {
            if (($s = $this->publicSnap((int) $d->id)) !== null) {
                return ['url' => '/api/plugins/custom-iot_link/snap/'.$d->id.'.jpg?t='.strtotime($s['at']), 'at' => $s['at'], 'device_id' => (int) $d->id];
            }
        }

        return null;
    }

    /**
     * 1.2.0 그 「내 프린터」에 붙인 기기의 온습도 (다른 확장이 씀 — 필터 custom-iot_link.printer_env). 끊긴(소식 없는) 기기의 값은 주지 않음.
     *  프린터 라운지가 카드에 「주변 온도 · 습도」로 보임 — 상태(출력 중)를 보내지 않는 온습도계만 붙여도 보이게.
     *
     * @return array{temp: ?float, humidity: ?float, at: string, source: string, name: string}|null
     */
    public function printerEnv(int $printerId): ?array
    {
        if ($printerId <= 0 || ! Settings::get('enabled') || ! Settings::get('printer_link') || ! Schema::ensure()) {
            return null;
        }
        $out = null;
        $first = 0;
        $devs = DB::table(Schema::DEVICES)->where('target', 'printer')->where('printer_id', $printerId)->where('last_seen_at', '>=', self::ago((int) Settings::get('stale_hours') * 3600))
            ->orderByDesc('last_seen_at')->limit(4)->get()->sortByDesc(static fn ($d) => self::caps($d)['state'] ? 1 : 0)->values();   // 1.6.0 상태 센서(장비가 보낸 챔버 값) 먼저 — 빠진 것만 일반 센서로
        foreach ($devs as $d) {
            if ($d->temp === null && $d->humidity === null) {
                continue;
            }
            $out ??= ['temp' => null, 'humidity' => null, 'at' => (string) $d->last_seen_at, 'source' => (string) ($d->source ?? 'ha'), 'name' => (string) $d->name];
            $first = $first ?: (int) $d->id;
            $out['temp'] ??= $d->temp !== null ? (float) $d->temp : null;
            $out['humidity'] ??= $d->humidity !== null ? (float) $d->humidity : null;
        }
        // 1.4.13 📈 최근 24시간 (1시간마다) — 프린터 라운지 카드에 마우스를 올리면 그래프
        if ($out !== null && $first > 0) {
            $out['hist'] = DB::table(Schema::READINGS)->where('device_id', $first)->where('at', '>=', self::ago(24 * 3600))->orderBy('at')->limit(48)->get(['at', 'temp', 'humidity'])
                ->map(fn ($r) => [substr((string) $r->at, 5, 8), $r->temp !== null ? (float) $r->temp : null, $r->humidity !== null ? (float) $r->humidity : null])->values()->all();
        }

        return $out;
    }

    /** 1.2.0 쓸 수 있는 「보내는 곳」 (다른 확장이 씀 — 필터 custom-iot_link.sources): 프린터 라운지가 자동 연결에 SmartThings 를 보일지 정함 @return array{ha: bool, smartthings: bool} */
    public function sources(): array
    {
        return ['ha' => (bool) Settings::get('enabled'), 'smartthings' => SmartThingsService::oauthReady()];
    }

    /** 오래된 온습도 기록 지우기 */
    public function tidy(): void
    {
        try {
            DB::table(Schema::READINGS)->where('at', '<', self::ago((int) Settings::get('keep_days') * 86400))->delete();
            foreach (DB::table(Schema::DEVICES)->whereNotNull('company_id')->select('company_id')->distinct()->pluck('company_id') as $cid) {   // 1.5.0 🗑 업체가 더 짧게 정했으면
                $d = self::companyKeepDays((int) $cid);
                if ($d < (int) Settings::get('keep_days')) {
                    $ids = DB::table(Schema::DEVICES)->where('company_id', $cid)->pluck('id')->all();
                    DB::table(Schema::READINGS)->whereIn('device_id', $ids ?: [0])->where('at', '<', self::ago($d * 86400))->delete();
                }
            }
            DB::table(Schema::RUNS)->whereNotNull('ended_at')->where('ended_at', '<', self::ago(400 * 86400))->delete();
        } catch (\Throwable) {
        }
    }

    /**
     * 그 기기들이 가동한 시간 (시간) — $since 뒤. 아직 켜져 있는 구간은 마지막 소식 때까지.
     *
     * @param  list<int>  $deviceIds
     */
    public function hours(array $deviceIds, string $since): float
    {
        if ($deviceIds === [] || ! Schema::ensure()) {
            return 0.0;
        }
        $seen = DB::table(Schema::DEVICES)->whereIn('id', $deviceIds)->pluck('last_seen_at', 'id');
        $sec = 0;
        $from = strtotime($since);
        foreach (DB::table(Schema::RUNS)->whereIn('device_id', $deviceIds)->where(fn ($w) => $w->whereNull('ended_at')->orWhere('ended_at', '>', $since))->get() as $r) {
            $a = max($from, strtotime((string) $r->started_at));
            $b = strtotime((string) ($r->ended_at ?? $seen[$r->device_id] ?? $r->started_at));
            $sec += max(0, $b - $a);
        }

        return round($sec / 3600, 1);
    }

    /* ───────── 다른 확장 (읽기만) ───────── */

    /** 내 프린터 @return list<array{id: int, name: string}> */
    public function printers(int $uid): array
    {
        if (! Settings::get('printer_link') || ! $this->hasTable('mpr_printers')) {
            return [];
        }
        try {
            $cos = $this->hasCol('mpr_printers', 'company_id') ? array_column($this->companies($uid), 'name', 'id') : [];   // 1.5.0 🏢 내가 대표 · 관리자인 업체의 프린터도
            $q = DB::table('mpr_printers')->where(fn ($w) => $cos ? $w->where(fn ($a) => $a->where('user_id', $uid)->whereNull('company_id'))->orWhereIn('company_id', array_keys($cos)) : $w->where('user_id', $uid));
            $stale = self::ago((int) Settings::get('stale_hours') * 3600);

            return $q->orderBy('sort')->orderBy('id')->get()
                ->map(fn ($p) => ['id' => (int) $p->id, 'name' => (isset($p->company_id) && $p->company_id ? '🏢 '.($cos[(int) $p->company_id] ?? '업체').' · ' : '').trim(($p->nickname ? $p->nickname.' · ' : '').$p->brand.' '.$p->model),
                    'brand' => (string) $p->brand, 'model' => (string) $p->model, 'nickname' => (string) ($p->nickname ?? ''), 'company_id' => isset($p->company_id) && $p->company_id ? (int) $p->company_id : null,
                    // 1.7.1 🗺️ 연결 지도 — 프린터 라운지가 직접 받는 연결 (PC 연결 프로그램 · HA · SmartThings) · 출력 상태 · 마지막으로 받은 때 (읽기만)
                    'image' => (string) ($p->image_url ?? ''), 'equipment_id' => isset($p->equipment_id) && $p->equipment_id ? (int) $p->equipment_id : null,   // 1.7.9 이어진 업체 장비 (하나로 보임)
                     'state' => (string) ($p->state ?? ''), 'via' => (string) ($p->last_via ?? ''), 'seen' => isset($p->last_seen_at) && $p->last_seen_at ? (string) $p->last_seen_at : null,
                    'live' => isset($p->last_seen_at) && $p->last_seen_at && (string) $p->last_seen_at >= $stale])->all();   // 0.1.10 통합이 HA 기기와 이름을 맞춤
        } catch (\Throwable) {
            return [];
        }
    }

    /** 내가 관리하는 업체 (대표 · 관리자 — 업체검색에 물어봄) @return list<array{id: int, name: string}> */
    public function companies(int $uid): array
    {
        return $uid <= 0 || ! Settings::get('company_link') ? [] : Links::companiesOf($uid);
    }

    /** 업체 보유 장비 (재고 관리에 물어봄 — 기기의 equipment_id 는 재고 관리 장비 번호) @param list<int> $cids @return array<int, array{id: int, company_id: int, name: string}> */
    public function equipment(array $cids): array
    {
        return $cids === [] || ! Settings::get('company_link') ? [] : Links::equipment($cids);
    }

    /** 보관 위치 고르기 — 재고 관리의 보관함(만든 순서 · 롤에 적힌 위치) + 내 다른 센서의 위치 (빈칸 · 대소문자가 같으면 하나) @return list<string> */
    public function locations(int $uid): array
    {
        $out = [];
        $seen = [];
        $add = static function (string $l) use (&$out, &$seen): void {
            $k = mb_strtolower((string) preg_replace('/\s+/u', '', $l));
            if ($k !== '' && ! isset($seen[$k])) {
                $seen[$k] = true;
                $out[] = trim($l);
            }
        };
        foreach (Links::spoolLocations($uid) as $l) {
            $add((string) $l);
        }
        try {
            foreach (DB::table(Schema::DEVICES)->where('user_id', $uid)->where('target', 'location')->whereNotNull('location')->orderBy('id')->pluck('location') as $l) {
                $add((string) $l);   // 1.4.12 재고 관리가 없어도 내 센서 위치끼리는 고를 수 있게
            }
        } catch (\Throwable) {
        }

        return array_slice($out, 0, 120);
    }

    public function removeUser(int $uid): void
    {
        if ($uid > 0 && Schema::ensure()) {
            $ids = DB::table(Schema::DEVICES)->where('user_id', $uid)->pluck('id')->all();
            foreach ($ids as $i) {
                @unlink(self::snapPath((int) $i));
            }
            DB::table(Schema::READINGS)->whereIn('device_id', $ids ?: [0])->delete();
            DB::table(Schema::RUNS)->whereIn('device_id', $ids ?: [0])->delete();
            DB::table(Schema::DEVICES)->where('user_id', $uid)->delete();
            DB::table(Schema::LINKS)->where('user_id', $uid)->delete();
            (new SmartThingsService($this))->removeUser($uid);
        }
    }

    /** @return array<string, int> */
    public function stats(): array
    {
        Schema::ensure();

        return ['users' => DB::table(Schema::DEVICES)->distinct()->count('user_id'), 'devices' => DB::table(Schema::DEVICES)->count(),
            'live' => DB::table(Schema::DEVICES)->where('last_seen_at', '>=', self::ago((int) Settings::get('stale_hours') * 3600))->count(), 'readings' => DB::table(Schema::READINGS)->count(),
            'st_installs' => DB::table(Schema::ST_INSTALLS)->count()];
    }

    /** 1.5.0 칸이 있나 (프린터 라운지 0.1.70+ 의 업체 프린터 칸 등) */
    private function hasCol(string $t, string $c): bool
    {
        static $memo = [];
        try {
            if (! empty($memo[$t.'.'.$c])) {
                return true;   // 있으면 기억 (없으면 다음에 다시 물음 — 그 플러그인을 나중에 업데이트해도 바로)
            }

            return $memo[$t.'.'.$c] = $this->hasTable($t) && \Illuminate\Support\Facades\Schema::hasColumn($t, $c);
        } catch (\Throwable) {
            return false;
        }
    }

    private function hasTable(string $t): bool
    {
        static $memo = [];
        try {
            return $memo[$t] ??= \Illuminate\Support\Facades\Schema::hasTable($t);
        } catch (\Throwable) {
            return false;
        }
    }
}
