<?php

namespace Plugins\Custom\IotLink\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema as DbSchema;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * 1.19.0 🔁 사이트 → HA (사용자 2026-11-11 「반대로 HA 로 넣을 수 없나」 · 주문 · 의뢰 알림 · 필라멘트 재고 · 보관함 상태)
 *
 * GET hub/{code}/status — 3DSSync 통합(0.5.0+)이 몇 분마다 읽어 HA 센서로 만듦. 연결 코드 주인 한 사람 것만 · 개인정보(주소 · 이름 · 전화) 없음.
 * 각 칸은 그 확장이 없거나 표가 없으면 빠짐 (null) — 한 칸이 실패해도 나머지는 그대로.
 */
class HaStatus
{
    /** 끝난 주문 상태 (그 밖 = 진행 중) */
    private const ORDER_DONE = ['cancelled', 'canceled', 'refunded', 'completed', 'delivered', 'confirmed', 'purchase_confirmed', 'returned', 'exchanged', 'failed', 'pending', 'pending_payment', 'payment_pending', 'expired', 'deleted'];

    /** @return array<string, mixed> */
    public function status(int $uid): array
    {
        return Cache::remember('iotl:hastatus2:'.$uid, 60, fn () => [
            'at' => now()->toIso8601String(),
            'notices' => $this->safe(fn () => $this->notices($uid)),
            'orders' => $this->safe(fn () => $this->orders($uid)),
            'jobs' => $this->safe(fn () => $this->jobs($uid)),
            'filament' => $this->safe(fn () => $this->filament($uid)),
            'boxes' => $this->safe(fn () => $this->boxes($uid)),
            'spools' => $this->safe(fn () => $this->spoolList($uid)),     // 1.19.1 🎨 HA 카드 그림 (롤 색 · 남은 양)
            'printers' => $this->safe(fn () => $this->printers($uid)),
            'devices' => $this->safe(fn () => $this->devices($uid)),      // 1.19.9 📡 연결된 센서 목록 (HA 에서 보기 · 통신 중 / 끊김)    // 1.19.1 🖨️ HA 카드 그림 (상태 · 진행률 · 온도)
        ]);
    }

    private function safe(callable $f): mixed
    {
        try {
            return $f();
        } catch (\Throwable) {
            return null;
        }
    }

    /** 🔔 안 읽은 알림 · 가장 최근 알림 제목 */
    private function notices(int $uid): ?array
    {
        if (! DbSchema::hasTable('notifications')) {
            return null;
        }
        $q = fn () => DB::table('notifications')->where('notifiable_id', $uid)->where('notifiable_type', 'like', '%User%');
        $last = $q()->orderByDesc('created_at')->first(['data', 'created_at']);
        $title = '';
        if ($last) {
            $d = json_decode((string) $last->data, true);
            foreach (['title', 'subject', 'message', 'body', 'text'] as $k) {
                $v = is_array($d) ? ($d[$k] ?? null) : null;
                if (is_array($v)) {
                    $v = $v['ko'] ?? reset($v);
                }
                if (is_string($v) && trim($v) !== '') {
                    $title = mb_substr(trim(strip_tags($v)), 0, 120);
                    break;
                }
            }
        }

        return ['unread' => $q()->whereNull('read_at')->count(), 'last' => $title, 'last_at' => $last ? (string) $last->created_at : null];
    }

    /** 🛒 진행 중인 내 쇼핑 주문 (60일 안) */
    private function orders(int $uid): ?array
    {
        if (! DbSchema::hasTable('ecommerce_orders')) {
            return null;
        }
        $q = DB::table('ecommerce_orders')->where('user_id', $uid)->where('created_at', '>=', now()->subDays(60));
        if (DbSchema::hasColumn('ecommerce_orders', 'deleted_at')) {
            $q->whereNull('deleted_at');
        }

        return ['active' => (clone $q)->whereNotIn('order_status', self::ORDER_DONE)->count(), 'recent' => (clone $q)->count()];
    }

    /** 🛠 제작 의뢰 — 내 의뢰에 온 입찰 · 내가 넣은 입찰 · 지금 열린 의뢰 */
    private function jobs(int $uid): ?array
    {
        if (! DbSchema::hasTable('maker_jobs') || ! DbSchema::hasTable('maker_bids')) {
            return null;
        }
        $open = ['open', 'quote_request'];
        $mine = DB::table('maker_jobs')->where('user_id', $uid)->whereIn('status', $open)->pluck('id')->all();
        $bids = fn () => DB::table('maker_bids')->whereIn('job_id', $mine ?: [0])->where('status', 'pending');

        return [
            'my_open' => count($mine),
            'bids_waiting' => $bids()->count(),
            'bids_new_24h' => $bids()->where('created_at', '>=', now()->subDay())->count(),
            'my_bids_pending' => DB::table('maker_bids')->where('user_id', $uid)->where('status', 'pending')->count(),
            'site_open' => DB::table('maker_jobs')->where('status', 'open')->where('user_id', '!=', $uid)->count(),
        ];
    }

    /** 내가 속한 업체 (재고 관리가 알려 줌) @return list<int> */
    private function companies(int $uid): array
    {
        $c = '\\Modules\\Custom\\Inventory\\Support\\Co';
        if (! class_exists($c)) {
            return [];
        }
        try {
            return array_values(array_filter(array_map(static fn ($x) => (int) (is_array($x) ? ($x['id'] ?? 0) : ($x->id ?? 0)), $c::ofUser($uid, ['owner', 'manager', 'staff']))));
        } catch (\Throwable) {
            return [];
        }
    }

    private function spools(int $uid)
    {
        $cids = $this->companies($uid);

        return DB::table('inv_spools')->whereNull('deleted_at')
            ->where(fn ($w) => $w->where(fn ($a) => $a->where('company_id', 0)->where('created_by', $uid))->orWhereIn('company_id', $cids ?: [0]));
    }

    /** 남은 g (적어 둔 g · 없으면 한 롤 무게 × %) */
    private static function grams(object $s): ?int
    {
        if (($s->weight_left ?? null) !== null) {
            return (int) $s->weight_left;
        }

        return ($s->weight_g ?? null) ? (int) round($s->weight_g * (int) $s->remain_pct / 100) : null;
    }

    private static function isLow(object $s): bool
    {
        return $s->status === 'low' || ($s->status !== 'empty' && (int) $s->remain_pct <= 20);
    }

    /** 🧵 필라멘트 재고 — 롤 수 · 조금 남은 롤 · 다 쓴 롤 · 조금 남은 것 이름 (5개) */
    private function filament(int $uid): ?array
    {
        if (! DbSchema::hasTable('inv_spools')) {
            return null;
        }
        $rows = $this->spools($uid)->limit(2000)->get(['id', 'kind', 'material', 'color', 'brand', 'remain_pct', 'status', 'weight_g', 'weight_left']);
        $low = $rows->filter(fn ($s) => self::isLow($s));

        return [
            'total' => $rows->where('status', '!=', 'empty')->count(),
            'low' => $low->count(),
            'empty' => $rows->where('status', 'empty')->count(),
            'grams' => (int) $rows->where('status', '!=', 'empty')->sum(fn ($s) => self::grams($s) ?? 0),   // 1.19.1 남은 무게 합 (g)
            'resin' => $rows->where('kind', 'resin')->where('status', '!=', 'empty')->count(),
            'low_list' => $low->sortBy('remain_pct')->take(5)->map(fn ($s) => trim($s->material.' '.($s->color ?? '')).' '.(int) $s->remain_pct.'%')->values()->all(),
        ];
    }

    /** 1.19.1 🎨 롤 하나하나 (HA 카드 그림) — 재료 · 색 · 색 코드 · 남은 % · 보관함 · 60개까지 */
    private function spoolList(int $uid): ?array
    {
        if (! DbSchema::hasTable('inv_spools')) {
            return null;
        }
        $hasBoxId = DbSchema::hasColumn('inv_spools', 'box_id');
        $rows = $this->spools($uid)->where('status', '!=', 'empty')->orderBy('remain_pct')->limit(60)
            ->get(array_merge(['kind', 'material', 'color', 'color_hex', 'brand', 'remain_pct', 'status', 'location', 'weight_g', 'weight_left'], $hasBoxId ? ['box_id'] : []));
        $names = [];
        if ($hasBoxId && DbSchema::hasTable('inv_boxes')) {
            $ids = $rows->pluck('box_id')->filter()->unique()->all();
            $names = $ids ? DB::table('inv_boxes')->whereIn('id', $ids)->pluck('name', 'id')->all() : [];
        }

        return $rows->map(function ($s) use ($names) {
            preg_match('/#[0-9a-fA-F]{6}/', (string) ($s->color_hex ?? ''), $m);

            return [
                'kind' => (string) $s->kind, 'material' => (string) $s->material, 'color' => (string) ($s->color ?? ''),
                'hex' => $m[0] ?? null, 'brand' => (string) ($s->brand ?? ''), 'pct' => (int) $s->remain_pct,
                'grams' => self::grams($s), 'low' => self::isLow($s), 'box' => (string) ($names[(int) ($s->box_id ?? 0)] ?? ($s->location ?? '')),
            ];
        })->values()->all();
    }

    /** 1.19.1 🖨️ 내 프린터 (내 프린터 플러그인) — 이름 · 상태 · 작업 · 진행률 · 남은 분 · 노즐/베드 온도 · 그림 */
    private function printers(int $uid): ?array
    {
        $t = 'mpr_printers';
        if (! DbSchema::hasTable($t)) {
            return null;
        }
        $cols = array_values(array_filter(['id', 'brand', 'model', 'nickname', 'image_url', 'state', 'job_name', 'job_started_at', 'job_eta_at', 'job_progress', 'last_seen_at', 'temps'], fn ($c) => DbSchema::hasColumn($t, $c)));
        $q = DB::table($t)->where('user_id', $uid)->orderBy('sort')->orderBy('id')->limit(12);

        return $q->get($cols)->map(function ($p) {
            $p = (object) array_merge(array_fill_keys(['brand', 'model', 'nickname', 'image_url', 'state', 'job_name', 'job_started_at', 'job_eta_at', 'job_progress', 'last_seen_at', 'temps'], null), (array) $p);   // 예전 판엔 없는 칸
            $temps = json_decode((string) ($p->temps ?? ''), true) ?: [];
            $start = $p->job_started_at ? strtotime((string) $p->job_started_at) : null;
            $eta = $p->job_eta_at ? strtotime((string) $p->job_eta_at) : null;
            $busy = in_array($p->state, ['printing', 'paused'], true);
            $prog = $p->job_progress !== null ? (float) $p->job_progress
                : ($busy && $start && $eta && $eta > $start ? max(0, min(99, round((time() - $start) * 100 / ($eta - $start), 1))) : null);
            $img = (string) ($p->image_url ?? '');
            if ($img !== '' && ! preg_match('#^https?://#', $img)) {
                $img = url($img);
            }

            return [
                'name' => (string) ($p->nickname ?: trim($p->brand.' '.$p->model)), 'model' => trim($p->brand.' '.$p->model),
                'state' => (string) $p->state, 'job' => $busy ? (string) ($p->job_name ?? '') : '',
                'progress' => $busy ? $prog : null, 'left_min' => $busy && $eta ? max(0, (int) round(($eta - time()) / 60)) : null,
                'nozzle' => isset($temps['nozzle']) ? (float) $temps['nozzle'] : null, 'bed' => isset($temps['bed']) ? (float) $temps['bed'] : null,
                'image' => $img ?: null, 'seen_at' => $p->last_seen_at ?? null,
            ];
        })->values()->all();
    }

    /** 1.19.9 📡 IoT 연결 센서 — 이름 · 연결 길 · 붙인 곳 · 온습도 · 상태 · 통신 중(live) / 끊김(stale) / 안 옴(never) · 마지막 소식 · 40개까지 */
    private function devices(int $uid): ?array
    {
        $o = (new HaService())->aiDevices($uid);
        $out = [];
        foreach (array_slice($o['devices'] ?? [], 0, 40) as $d) {
            $out[] = [
                'id' => (int) ($d['id'] ?? 0),   // 1.19.10 HA 가 센서마다 엔티티로 (기기 화면 센서 목록)
                'name' => (string) ($d['name'] ?? ''), 'source' => (string) ($d['source'] ?? ''), 'server' => (string) ($d['ha_server_name'] ?? ''),
                'target' => (string) ($d['target'] ?? ''), 'where' => (string) ($d['where'] ?? ''),
                'temp' => $d['temp'] ?? null, 'humidity' => $d['humidity'] ?? null, 'state' => (string) ($d['state'] ?? ''), 'is_on' => (bool) ($d['is_on'] ?? false),
                'over' => (bool) ($d['over'] ?? false), 'live' => empty($d['stale']) && empty($d['never']), 'never' => (bool) ($d['never'] ?? false),
                'company' => ! empty($d['company_id']), 'seen' => $d['seen'] ?? null,
            ];
        }

        return $out;
    }

    /** 📦 보관함마다 — 롤 수 · 조금 남은 롤 · 연결된 센서 습도 · 온도 · 습도 넘음 */
    private function boxes(int $uid): ?array
    {
        if (! DbSchema::hasTable('inv_boxes') || ! DbSchema::hasTable('inv_spools')) {
            return null;
        }
        $cids = $this->companies($uid);
        $boxes = DB::table('inv_boxes')->where(fn ($w) => $w->where(fn ($a) => $a->where('company_id', 0)->where('user_id', $uid))->orWhereIn('company_id', $cids ?: [0]))
            ->orderBy('id')->limit(50)->get(['id', 'loc_key', 'name']);
        if ($boxes->isEmpty()) {
            return [];
        }
        $hasBoxId = DbSchema::hasColumn('inv_spools', 'box_id');
        $spools = $this->spools($uid)->where('status', '!=', 'empty')->get(array_merge(['location', 'remain_pct', 'status'], $hasBoxId ? ['box_id'] : []));
        $key = static fn ($v) => mb_substr(mb_strtolower((string) preg_replace('/\s+/u', '', (string) $v)), 0, 60);
        $sensors = DbSchema::hasTable(Schema::DEVICES)
            ? DB::table(Schema::DEVICES)->where('user_id', $uid)->where('target', 'location')->whereNotNull('location')->get(['location', 'temp', 'humidity', 'humidity_max', 'last_seen_at'])
            : collect();
        $out = [];
        foreach ($boxes as $b) {
            $in = $spools->filter(fn ($s) => ($hasBoxId && (int) ($s->box_id ?? 0) === (int) $b->id) || ($key($s->location ?? '') !== '' && $key($s->location) === $b->loc_key));
            $sen = $sensors->first(fn ($d) => $key($d->location) === $b->loc_key);
            $hum = $sen && $sen->humidity !== null ? (float) $sen->humidity : null;
            $max = $sen && $sen->humidity_max ? (int) $sen->humidity_max : null;
            $out[] = [
                'key' => $b->loc_key, 'name' => (string) $b->name,
                'spools' => $in->count(), 'low' => $in->filter(fn ($s) => self::isLow($s))->count(),
                'humidity' => $hum, 'temp' => $sen && $sen->temp !== null ? (float) $sen->temp : null,
                'humidity_max' => $max, 'over' => $hum !== null && $max !== null && $hum > $max,
                'seen_at' => $sen ? $sen->last_seen_at : null,
            ];
        }

        return $out;
    }
}
