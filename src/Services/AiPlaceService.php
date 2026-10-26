<?php

namespace Plugins\Custom\IotLink\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Plugins\Custom\IotLink\Support\Rules;
use Plugins\Custom\IotLink\Support\Schema;

/**
 * 1.17.6 📥 AI 연결의 「센서 붙일 곳」 제안 — AI 는 ⏳ 대기 줄만 만듦 (바로 붙이기 없음)
 *
 *  회원이 IoT 연결 화면 맨 위 🤖 상자에서 ✔ 붙이기 · ✕ 버리기. 붙이기는 화면 📍 와 같은 길(HaService::place)이라
 *  권한 · 💳 업체 센서 칸 한도 · 같은 칸 바꿔 끼움을 그때 다시 봄. 줄은 캐시 (잃어도 다시 제안하면 됨) iotl:prop:{회원}
 */
final class AiPlaceService
{
    public const MAX = 30;            // 쌓일 수 있는 대기 줄

    public const DAYS = 14;

    public function __construct(private HaService $svc) {}

    /** AI 가 고를 수 있는 붙일 곳 — 화면 📍 와 같은 목록 (내가 대표 · 관리자인 업체 것만) @return list<array<string, mixed>> */
    public function places(int $uid): array
    {
        $cos = array_column($this->svc->companies($uid), 'name', 'id');
        $out = [];
        $seen = [];
        $box = static function (string $name, int $cid) use (&$out, &$seen, $cos): void {
            $k = $cid.'|'.mb_strtolower((string) preg_replace('/\s+/u', '', $name));
            if (trim($name) === '' || isset($seen[$k]) || ($cid > 0 && ! isset($cos[$cid]))) {
                return;
            }
            $seen[$k] = true;
            $out[] = ['target' => 'location', 'location' => trim($name), 'ref' => $cid, 'owner' => $cid ? '🏢 '.$cos[$cid] : '👤 개인'];
        };
        $boxes = \Plugins\Custom\IotLink\Support\Links::boxes($uid);
        foreach ($boxes as $b) {
            $box((string) ($b['name'] ?? ''), (int) ($b['company_id'] ?? 0));
        }
        if (! $boxes) {
            foreach ($this->svc->locations($uid) as $l) {
                $box((string) $l, 0);
            }
        }
        foreach ($this->svc->manageable($uid)->where('target', 'location')->whereNotNull('location')->get(['location', 'company_id']) as $d) {
            $box((string) $d->location, (int) ($d->company_id ?? 0));
        }
        $linked = [];
        foreach ($this->svc->printers($uid) as $p) {
            if (! empty($p['equipment_id'])) {
                $linked[(int) $p['equipment_id']] = true;
            }
            $out[] = ['target' => 'printer', 'ref' => (int) $p['id'], 'name' => (string) $p['name'], 'owner' => ! empty($p['company_id']) ? '🏢 '.($cos[(int) $p['company_id']] ?? '업체') : '👤 개인'];
        }
        foreach ($this->svc->equipment(array_keys($cos)) as $e) {
            if (! isset($linked[(int) $e['id']])) {
                $out[] = ['target' => 'equipment', 'ref' => (int) $e['id'], 'name' => (string) $e['name'], 'owner' => '🏢 '.($cos[(int) $e['company_id']] ?? '업체')];
            }
        }

        return array_slice($out, 0, 200);
    }

    /** @return list<array<string, mixed>> */
    public function list(int $uid): array
    {
        try {
            $l = Cache::get('iotl:prop:'.$uid);
        } catch (\Throwable) {
            return [];
        }

        return is_array($l) ? array_values(array_filter($l, 'is_array')) : [];
    }

    private function put(int $uid, array $l): void
    {
        $l === [] ? Cache::forget('iotl:prop:'.$uid) : Cache::put('iotl:prop:'.$uid, array_values($l), now()->addDays(self::DAYS));
    }

    /**
     * 📥 제안 — items:[{device_id, target(location · printer · equipment · none), location, ref, why}]
     *
     * @return array<string, mixed>
     */
    public function propose(int $uid, array $a): array
    {
        Schema::ensure();
        $items = array_values(array_filter(is_array($a['items'] ?? null) ? $a['items'] : [], 'is_array'));
        if (! $items || count($items) > 20) {
            return ['error' => '제안은 한 번에 1~20줄이에요.'];
        }
        $places = $this->places($uid);
        $devs = $this->svc->manageable($uid)->whereIn('id', array_map(static fn ($x) => (int) ($x['device_id'] ?? 0), $items) ?: [0])->get()->keyBy('id');
        $key = static fn ($v) => mb_strtolower((string) preg_replace('/\s+/u', '', (string) $v));
        $l = array_values(array_filter($this->list($uid), static fn ($p) => ! in_array((int) $p['device_id'], array_map(static fn ($x) => (int) ($x['device_id'] ?? 0), $items), true)));   // 같은 기기는 새 제안으로
        $ok = [];
        $skip = [];
        foreach ($items as $x) {
            $id = (int) ($x['device_id'] ?? 0);
            $d = $devs[$id] ?? null;
            $t = (string) ($x['target'] ?? '');
            $ref = (int) ($x['ref'] ?? 0);
            $loc = Rules::text((string) ($x['location'] ?? ''), 40);
            $p = $t === 'none' ? ['target' => 'none'] : collect($places)->first(static fn ($p) => $p['target'] === $t && ($t === 'location' ? $key($p['location']) === $key($loc) && (int) $p['ref'] === $ref : (int) $p['ref'] === $ref));
            $why = match (true) {
                ! $d => '내가 고칠 수 있는 기기가 아니에요 (기기 번호를 iot_devices 에서 다시 보세요)',
                $p === null => '그런 붙일 곳이 없어요 (iot_devices 의 places 에서 골라 주세요)',
                default => '',
            };
            if ($why !== '') {
                $skip[] = ['device_id' => $id, 'why' => $why];
                continue;
            }
            $ok[] = ['pid' => bin2hex(random_bytes(5)), 'device_id' => $id, 'device' => (string) $d->name, 'target' => $t === 'none' ? '' : $t,
                'location' => $t === 'location' ? (string) $p['location'] : '', 'ref' => $t === 'location' ? (int) $p['ref'] : ($t === 'none' ? 0 : $ref),
                'where' => match ($t) { 'none' => '⏸ 대기 칸', 'location' => '🧵 '.$p['location'].' ('.$p['owner'].')', 'printer' => '🖨️ '.$p['name'], default => '🏭 '.$p['name'] },
                'why' => Rules::text((string) ($x['why'] ?? ''), 120), 'from' => Rules::text((string) ($a['_from'] ?? '🤖 AI'), 40), 'at' => now()->format('Y-m-d H:i:s')];
        }
        if ($ok) {
            $this->put($uid, array_slice(array_merge($l, $ok), -self::MAX));
        }

        return ['proposed' => count($ok), 'skipped' => $skip, 'next' => $ok ? '아직 붙지 않았어요 — 회원이 사이트 IoT 연결 화면 맨 위 🤖 상자에서 ✔ 붙여야 붙어요 (그때 💳 센서 칸 한도 · 권한을 다시 봐요).' : '보낸 제안이 없어요.'];
    }

    /** ✔ 붙이기 — 화면 📍 와 같은 길 @return array{0: bool, 1: string} */
    public function apply(int $uid, string $pid): array
    {
        $l = $this->list($uid);
        $p = collect($l)->firstWhere('pid', $pid);
        if (! $p) {
            return [false, '제안을 찾을 수 없어요 (이미 처리했을 수 있어요).'];
        }
        $r = $this->svc->place($uid, (int) $p['device_id'], (string) $p['target'], (string) $p['location'], (int) $p['ref']);
        if ($r[0] || ! DB::table(Schema::DEVICES)->where('id', (int) $p['device_id'])->exists()) {
            $this->put($uid, array_filter($l, static fn ($x) => $x['pid'] !== $pid));
        }

        return [$r[0], $r[1]];
    }

    /** ✕ 버리기 (pid 가 '' 면 모두) */
    public function drop(int $uid, string $pid): array
    {
        $this->put($uid, $pid === '' ? [] : array_filter($this->list($uid), static fn ($x) => $x['pid'] !== $pid));

        return [true, $pid === '' ? '🤖 제안을 모두 버렸어요.' : '🤖 제안을 버렸어요.'];
    }
}
