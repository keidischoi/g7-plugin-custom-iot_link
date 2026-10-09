<?php

namespace Plugins\Custom\HaLink\Services;

use Illuminate\Support\Facades\DB;
use Plugins\Custom\HaLink\Support\Notify;
use Plugins\Custom\HaLink\Support\Rules;
use Plugins\Custom\HaLink\Support\Schema;
use Plugins\Custom\HaLink\Support\Settings;

/**
 * 🏠 HA 연결 — 회원의 Home Assistant 가 보내는 값(온습도 · 상태)을 받아 둠. 사이트가 회원 집으로 접속하지 않음.
 *  - 기기 = 받는 주소 하나 (비밀 키). 필라멘트 · 레진 보관함 / 내 프린터 / 업체 장비 / 그 밖에 붙임
 *  - 온습도: 지금 값 + 한 시간에 한 줄 기록, 기준(습도 · 온도)을 넘으면 알림 (같은 기기는 일정 시간에 한 번)
 *  - 상태: 「가동 중」 구간을 기록 (정비 수첩이 「가동 몇 시간마다」에 씀) · 내 프린터에 붙인 기기는 그 프린터의 자동 연결로 넘김
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

    /* ───────── 한 화면 ───────── */

    /** @return array<string, mixed> */
    public function overview(int $uid): array
    {
        Schema::ensure();
        $this->touchSeen($uid);
        $rows = DB::table(Schema::DEVICES)->where('user_id', $uid)->orderBy('target')->orderBy('name')->orderBy('id')->get();
        $ids = $rows->pluck('id')->all();
        $hist = [];
        foreach (DB::table(Schema::READINGS)->whereIn('device_id', $ids ?: [0])->where('at', '>=', self::ago(48 * 3600))->orderBy('at')->get(['device_id', 'at', 'temp', 'humidity']) as $r) {
            $hist[(int) $r->device_id][] = [substr((string) $r->at, 5, 11), $r->temp !== null ? (float) $r->temp : null, $r->humidity !== null ? (float) $r->humidity : null];
        }
        $printers = $this->printers($uid);
        $companies = $this->companies($uid);
        $equip = $this->equipment(array_column($companies, 'id'));
        $pn = array_column($printers, 'name', 'id');

        return [
            'now' => self::now(),
            'devices' => $rows->map(fn ($d) => $this->device($d, $hist[(int) $d->id] ?? [], $pn, $equip))->all(),
            'printers' => $printers, 'companies' => $companies, 'equipment' => array_values($equip), 'locations' => $this->locations($uid),
            'targets' => Rules::TARGETS,
            'link' => ['code' => $this->linkCode($uid), 'site' => rtrim((string) config('app.url'), '/'), 'repo' => (string) Settings::get('hacs_repo')],
            'config' => ['max_devices' => (int) Settings::get('max_devices'), 'interval_min' => (int) Settings::get('interval_min'), 'refresh_sec' => (int) Settings::get('refresh_sec'), 'send_mode' => (string) Settings::get('send_mode'), 'change_hum' => (int) Settings::get('change_hum'), 'idle_min' => (int) Settings::get('idle_min'), 'stale_hours' => (int) Settings::get('stale_hours'), 'base' => rtrim((string) config('app.url'), '/').'/api/plugins/custom-ha_link/in/',
                'printer_link' => $printers !== [] || ((bool) Settings::get('printer_link') && $this->hasTable('mpr_printers')), 'maintenance' => $this->hasTable('mnt_spools')],
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

        return ['id' => (int) $d->id, 'token' => (string) $d->token, 'name' => (string) $d->name, 'target' => (string) $d->target, 'where' => $where, 'location' => (string) ($d->location ?? ''),
            'printer_id' => $d->printer_id ? (int) $d->printer_id : null, 'company_id' => $d->company_id ? (int) $d->company_id : null, 'equipment_id' => $d->equipment_id ? (int) $d->equipment_id : null,
            'entities' => array_merge(array_fill_keys(Rules::ENTITIES, ''), array_intersect_key((array) json_decode((string) ($d->entities ?? ''), true), array_flip(Rules::ENTITIES))),
            'temp' => $temp, 'humidity' => $hum, 'state' => (string) ($d->state ?? ''), 'is_on' => (bool) $d->is_on && ! $stale,
            'humidity_max' => $d->humidity_max !== null ? (int) $d->humidity_max : null, 'temp_max' => $d->temp_max !== null ? (int) $d->temp_max : null, 'notify' => (bool) $d->notify,
            'over' => ! $stale && (($d->humidity_max !== null && $hum !== null && $hum > (int) $d->humidity_max) || ($d->temp_max !== null && $temp !== null && $temp > (int) $d->temp_max)),
            'snap_public' => (bool) ($d->snap_public ?? false), 'snap_at' => ! empty($d->snap_at) && is_file(self::snapPath((int) $d->id)) ? (string) $d->snap_at : null, 'seen' => $seen, 'stale' => $stale, 'never' => $seen === null, 'hours_30d' => $this->hours([(int) $d->id], self::ago(30 * 86400)), 'history' => $hist];
    }

    /* ───────── 기기 넣기 · 고치기 ───────── */

    /**
     * @param  array<string, mixed>  $in  name · target · location · printer_id · company_id · equipment_id · entities{…} · humidity_max · temp_max · notify
     * @return array{0: bool, 1: string, 2?: array<string, mixed>}
     */
    public function save(int $uid, ?int $id, array $in): array
    {
        Schema::ensure();
        $old = $id ? DB::table(Schema::DEVICES)->where('id', $id)->where('user_id', $uid)->first() : null;
        if ($id && ! $old) {
            return [false, '기기를 찾을 수 없어요.'];
        }
        if (! $old && DB::table(Schema::DEVICES)->where('user_id', $uid)->count() >= (int) Settings::get('max_devices')) {
            return [false, '기기는 '.Settings::get('max_devices').'개까지 연결할 수 있어요.'];
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
        $name = Rules::text($in['name'] ?? '', 60) ?: ($old->name ?? $auto);
        if ($name === '') {
            return [false, '이름을 적어 주세요.'];
        }
        $ent = [];
        foreach (Rules::ENTITIES as $k) {
            $ent[$k] = Rules::entity(is_array($in['entities'] ?? null) ? ($in['entities'][$k] ?? '') : ($in['ent_'.$k] ?? ''));
        }
        if ($ent['temp'] === '' && $ent['hum'] === '' && $ent['state'] === '') {
            return [false, 'Home Assistant 의 센서 이름을 하나는 적어 주세요 (예: sensor.drybox_humidity).'];
        }
        $lim = static fn ($v, int $min, int $max) => $v === null || $v === '' || ! is_numeric($v) ? null : max($min, min($max, (int) $v));
        $row += ['name' => $name, 'entities' => json_encode($ent), 'humidity_max' => $lim($in['humidity_max'] ?? null, 1, 100), 'temp_max' => $lim($in['temp_max'] ?? null, -40, 400),
            'notify' => array_key_exists('notify', $in) ? filter_var($in['notify'], FILTER_VALIDATE_BOOLEAN) : (bool) ($old->notify ?? true),
            'snap_public' => array_key_exists('snap_public', $in) ? filter_var($in['snap_public'], FILTER_VALIDATE_BOOLEAN) : (bool) ($old->snap_public ?? false), 'updated_at' => now()];
        if ($old) {
            DB::table(Schema::DEVICES)->where('id', $old->id)->update($row);
            $id = (int) $old->id;
        } else {
            $id = (int) DB::table(Schema::DEVICES)->insertGetId($row + ['user_id' => $uid, 'token' => Rules::token(), 'created_at' => now()]);
        }

        return [true, $old ? '고쳤어요.' : '기기를 만들었어요. 이제 설정 글을 Home Assistant 에 붙여 넣어 주세요.', ['id' => $id]];
    }

    /** @return array{0: bool, 1: string} */
    public function delete(int $uid, int $id): array
    {
        $n = Schema::ensure() ? DB::table(Schema::DEVICES)->where('id', $id)->where('user_id', $uid)->delete() : 0;
        if ($n) {
            @unlink(self::snapPath($id));
            DB::table(Schema::READINGS)->where('device_id', $id)->delete();
            DB::table(Schema::RUNS)->where('device_id', $id)->delete();
        }

        return $n ? [true, '지웠어요.'] : [false, '기기를 찾을 수 없어요.'];
    }

    /** 받는 주소 바꾸기 (주소가 새어 나갔을 때) @return array{0: bool, 1: string} */
    public function rotate(int $uid, int $id): array
    {
        $n = Schema::ensure() ? DB::table(Schema::DEVICES)->where('id', $id)->where('user_id', $uid)->update(['token' => Rules::token(), 'updated_at' => now()]) : 0;

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
    public function hub(int $uid): array
    {
        $o = $this->overview($uid);

        return ['site' => (string) (config('app.name') ?: 'G7'), 'targets' => $o['targets'], 'locations' => $o['locations'], 'printers' => $o['printers'],
            'equipment' => array_map(fn ($e) => ['id' => $e['id'], 'name' => trim((string) (collect($o['companies'])->firstWhere('id', $e['company_id'])['name'] ?? '').' — '.$e['name'], ' —')], $o['equipment']),
            'devices' => array_map(fn ($d) => ['id' => $d['id'], 'name' => $d['name'], 'target' => $d['target'], 'token' => $d['token'], 'entities' => $d['entities'], 'humidity_max' => $d['humidity_max'], 'temp_max' => $d['temp_max'], 'snap_public' => $d['snap_public']], $o['devices']),
            'push_url' => $o['config']['base'], 'interval_min' => (int) Settings::get('interval_min'), 'send_mode' => (string) Settings::get('send_mode'),
            'next_min' => (int) Settings::get(Settings::get('send_mode') === 'change' ? 'idle_min' : 'interval_min'), 'change_hum' => (int) Settings::get('change_hum'), 'change_temp' => 0.5, 'gap_sec' => 60, 'snapshot' => (bool) Settings::get('snapshot'), 'snap_gap_min' => (int) Settings::get('snap_gap_min'), 'snap_max' => self::SNAP_MAX];
    }

    /** 통합이 기기를 만들거나 고침 — 화면에서 하는 것과 같은 규칙 @return array{0: bool, 1: string, 2?: array<string, mixed>} */
    public function hubSave(int $uid, ?int $id, array $in): array
    {
        $r = $this->save($uid, $id, $in);
        if (! $r[0]) {
            return $r;
        }
        $d = DB::table(Schema::DEVICES)->where('id', (int) $r[2]['id'])->first();

        return [true, $r[1], ['id' => (int) $d->id, 'name' => (string) $d->name, 'token' => (string) $d->token, 'push_url' => rtrim((string) config('app.url'), '/').'/api/plugins/custom-ha_link/in/'.$d->token]];
    }

    /* ───────── 받기 (Home Assistant → 사이트) ───────── */

    /**
     * 받는 주소로 들어온 값 반영 — 요청 하나에 조회 1 · 저장 1~3.
     *
     * @param  array<string, mixed>  $payload  temperature · humidity · state(on) · progress · remaining_min · job
     * @return array{0: bool, 1: string, 2?: array{next_min: int, snap: bool, away: bool}}
     */
    public function ingest(string $token, array $payload): array
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
        $overH = $d->humidity_max !== null && $hum !== null && $hum > (int) $d->humidity_max;
        $overT = $d->temp_max !== null && $temp !== null && $temp > (int) $d->temp_max;
        if ($overH || $overT) {
            if ($d->notify && ($d->alerted_at === null || (string) $d->alerted_at < self::ago((int) Settings::get('alert_gap_hours') * 3600))) {
                $set['alerted_at'] = $now;
                $this->alert($d, $overH ? $hum : null, $overT ? $temp : null);
            }
        } elseif ($d->alerted_at !== null && ($d->humidity_max === null || $hum === null || $hum <= (int) $d->humidity_max - 3)) {
            $set['alerted_at'] = null;   // 기준보다 3% 넘게 내려오면 다음 번에 다시 알림
        }
        DB::table(Schema::DEVICES)->where('id', $d->id)->update($set);
        if ($d->target === 'printer' && $d->printer_id && $v['state'] !== null) {
            $this->forwardPrinter((int) $d->printer_id, (int) $d->user_id, $v);
        }
        if (random_int(1, 200) === 1) {
            $this->tidy();
        }

        return [true, 'ok', $this->pace((int) $d->user_id, (bool) ($d->snap_public ?? false))];
    }

    private function alert(object $d, ?float $hum, ?float $temp): void
    {
        $ch = array_keys(array_filter(['database' => (bool) Settings::get('notify_site'), 'mail' => (bool) Settings::get('notify_mail')]));
        $what = array_filter([$hum !== null ? '습도 '.$hum.'% (기준 '.$d->humidity_max.'%)' : null, $temp !== null ? '온도 '.$temp.'°C (기준 '.$d->temp_max.'°C)' : null]);
        $lines = ['🏠 '.$d->name.' — '.implode(' · ', $what)];
        if ($d->target === 'location' && $d->location && $hum !== null && $this->hasTable('mnt_spools')) {
            try {
                $loc = Rules::loc($d->location);
                $names = DB::table('mnt_spools')->where('user_id', $d->user_id)->where('status', '!=', 'empty')->whereNotNull('location')->get(['name', 'material', 'location'])
                    ->filter(fn ($s) => Rules::loc($s->location) === $loc)->map(fn ($s) => $s->name.' ('.$s->material.')')->take(8)->all();
                if ($names) {
                    $lines[] = '🧵 여기 있는 것: '.implode(' · ', $names).' — 건조를 챙겨 주세요.';
                }
            } catch (\Throwable) {
            }
        }
        // 0.1.1 업체검색 재고 — 내가 관리하는 업체의 개봉한 필라멘트 중 같은 보관 위치
        if ($d->target === 'location' && $d->location && $hum !== null && $this->hasTable('cmp_spools')) {
            try {
                $cids = array_column($this->companies((int) $d->user_id), 'id');
                $loc = Rules::loc($d->location);
                $names = $cids === [] ? [] : DB::table('cmp_spools')->whereIn('company_id', $cids)->whereIn('status', ['in_use', 'low'])->whereNotNull('location')->get()
                    ->filter(fn ($s) => empty($s->deleted_at) && Rules::loc($s->location) === $loc)->map(fn ($s) => trim(($s->brand ? $s->brand.' ' : '').$s->material.($s->color ? ' '.$s->color : '')))->take(8)->all();
                if ($names) {
                    $lines[] = '🏢 업체 재고: '.implode(' · ', $names).' — 건조를 챙겨 주세요.';
                }
            } catch (\Throwable) {
            }
        }
        Notify::send((int) $d->user_id, $ch, '[HA 연결] '.$d->name.' '.($hum !== null ? '습도가 높아요 💧' : '온도가 높아요 🌡️'), implode("\n", $lines));
    }

    /** 내 프린터에 붙인 기기 — 그 프린터의 자동 연결(custom-my_printer)로 상태를 넘김. 그 플러그인이 없거나 바뀌었으면 조용히 건너뜀 */
    private function forwardPrinter(int $printerId, int $uid, array $v): void
    {
        if (! Settings::get('printer_link') || ! $this->hasTable('mpr_printers')) {
            return;
        }
        try {
            $cls = self::$printerService;
            $tok = (string) DB::table('mpr_printers')->where('id', $printerId)->where('user_id', $uid)->value('hook_token');
            if ($tok === '' || ! class_exists($cls) || ! method_exists($cls, 'hook')) {
                return;
            }
            (new $cls())->hook($tok, array_filter(['state' => $v['state'], 'progress' => $v['progress'], 'remaining_min' => $v['remaining_min'], 'job' => $v['job']], static fn ($x) => $x !== null));
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
        $ok = Schema::ensure() && DB::table(Schema::DEVICES)->where('id', $id)->where('user_id', $uid)->whereNotNull('snap_at')->exists();
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
     * 그 「내 프린터」에 붙인 기기의 공개 사진 (다른 확장이 씀 — 필터 custom-ha_link.printer_snapshot)
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
                return ['url' => '/api/plugins/custom-ha_link/snap/'.$d->id.'.jpg?t='.strtotime($s['at']), 'at' => $s['at'], 'device_id' => (int) $d->id];
            }
        }

        return null;
    }

    /** 오래된 온습도 기록 지우기 */
    public function tidy(): void
    {
        try {
            DB::table(Schema::READINGS)->where('at', '<', self::ago((int) Settings::get('keep_days') * 86400))->delete();
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
            return DB::table('mpr_printers')->where('user_id', $uid)->orderBy('sort')->orderBy('id')->get()
                ->map(fn ($p) => ['id' => (int) $p->id, 'name' => trim(($p->nickname ? $p->nickname.' · ' : '').$p->brand.' '.$p->model)])->all();
        } catch (\Throwable) {
            return [];
        }
    }

    /** 내가 관리하는 업체 (대표 · 관리자) @return list<array{id: int, name: string}> */
    public function companies(int $uid): array
    {
        if ($uid <= 0 || ! Settings::get('company_link') || ! $this->hasTable('cmp_members') || ! $this->hasTable('cmp_companies')) {
            return [];
        }
        try {
            $ids = DB::table('cmp_members')->where('user_id', $uid)->where('status', 'active')->whereIn('role', ['owner', 'manager'])->pluck('company_id')->all();
            $out = [];
            foreach (DB::table('cmp_companies')->whereIn('id', $ids ?: [0])->orderBy('name')->get() as $c) {
                if (empty($c->deleted_at)) {
                    $out[] = ['id' => (int) $c->id, 'name' => (string) $c->name];
                }
            }

            return $out;
        } catch (\Throwable) {
            return [];
        }
    }

    /** @param list<int> $cids @return array<int, array{id: int, company_id: int, name: string}> */
    public function equipment(array $cids): array
    {
        if ($cids === [] || ! $this->hasTable('cmp_equipment')) {
            return [];
        }
        try {
            $out = [];
            foreach (DB::table('cmp_equipment')->whereIn('company_id', $cids)->orderBy('company_id')->orderBy('sort')->orderBy('id')->get() as $e) {
                if (empty($e->deleted_at)) {
                    $name = trim(($e->brand ?? '').' '.($e->model ?? ''));
                    $out[(int) $e->id] = ['id' => (int) $e->id, 'company_id' => (int) $e->company_id, 'name' => $name !== '' ? $name : strtoupper((string) $e->kind).' 장비'];
                }
            }

            return $out;
        } catch (\Throwable) {
            return [];
        }
    }

    /** 정비 수첩에 적어 둔 필라멘트 보관 위치 (고르기 도움말) @return list<string> */
    public function locations(int $uid): array
    {
        if (! $this->hasTable('mnt_spools')) {
            return [];
        }
        try {
            return DB::table('mnt_spools')->where('user_id', $uid)->whereNotNull('location')->where('location', '!=', '')->distinct()->orderBy('location')->limit(40)->pluck('location')->map(fn ($v) => (string) $v)->all();
        } catch (\Throwable) {
            return [];
        }
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
        }
    }

    /** @return array<string, int> */
    public function stats(): array
    {
        Schema::ensure();

        return ['users' => DB::table(Schema::DEVICES)->distinct()->count('user_id'), 'devices' => DB::table(Schema::DEVICES)->count(),
            'live' => DB::table(Schema::DEVICES)->where('last_seen_at', '>=', self::ago((int) Settings::get('stale_hours') * 3600))->count(), 'readings' => DB::table(Schema::READINGS)->count()];
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
