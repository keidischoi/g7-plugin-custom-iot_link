<?php

namespace Plugins\Custom\IotLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Plugins\Custom\IotLink\Services\HaService;
use Plugins\Custom\IotLink\Services\SlotService;
use Plugins\Custom\IotLink\Support\MatterInstaller;
use Plugins\Custom\IotLink\Support\Settings;

/** 회원 화면 API (로그인, 내 기기만) + 받는 주소 (로그인 없음 — 주소의 비밀 키로) */
class HaController extends Controller
{
    public function __construct(private HaService $svc) {}

    private function off(): ?JsonResponse
    {
        return Settings::get('enabled') ? null : response()->json(['success' => false, 'message' => 'IoT 연결이 꺼져 있어요.'], 404);
    }

    private function uid(Request $r): int
    {
        return (int) ($r->user()?->id ?? 0);
    }

    /** @param array{0: bool, 1: string, 2?: mixed} $r */
    private function result(array $r, Request $req): JsonResponse
    {
        return response()->json(['success' => $r[0], 'message' => $r[1], 'data' => $r[0] ? (is_array($r[2] ?? null) ? $r[2] : []) + ['overview' => $this->svc->overview($this->uid($req))] : (is_array($r[2] ?? null) ? $r[2] : null)], $r[0] ? 200 : 422);   // 1.8.3 실패에도 까닭(reason) — 모자라면 화면이 충전 안내
    }

    public function index(Request $r): JsonResponse
    {
        return $this->off() ?? response()->json(['success' => true, 'data' => $this->svc->overview($this->uid($r))]);
    }

    public function save(Request $r, ?int $id = null): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->save($this->uid($r), $id, $r->all()), $r);
    }

    /** 1.6.0 📦 보관함 보드 — 붙이기 · 떼기 */
    /** 1.9.0 🔔 보관함에서 바로 알림 구간 */
    public function range(Request $r, int $id): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->setRange($this->uid($r), $id, array_intersect_key($r->all(), array_flip(['humidity_min', 'humidity_max', 'temp_min', 'temp_max']))), $r);
    }

    public function place(Request $r, int $id): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->place($this->uid($r), $id, (string) $r->input('target', $r->filled('location') ? 'location' : ''), (string) $r->input('location', ''), (int) $r->input('ref', 0)), $r);
    }

    public function delete(Request $r, int $id): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->delete($this->uid($r), $id), $r);
    }

    /** 1.4.5 여러 기기 한 번에 지우기 — {ids: [번호…]} */
    public function deleteMany(Request $r): JsonResponse
    {
        $ids = $r->input('ids');

        return $this->off() ?? $this->result($this->svc->deleteMany($this->uid($r), is_array($ids) ? array_values($ids) : []), $r);
    }

    /** 1.4.8 💳 센서 칸 사기 — {currency: coin|mileage, n: 1|10, for: me|c{업체}} */
    public function slotBuy(Request $r): JsonResponse
    {
        $uid = $this->uid($r);

        return $this->off() ?? $this->result((new SlotService())->buy($uid, (string) $r->input('currency', ''), (int) $r->input('n', 1), (string) $r->input('for', 'me'), $this->svc->companies($uid)), $r);
    }

    /** 1.8.3 💳 칸 취소 (환불) */
    public function slotCancel(Request $r, int $id): JsonResponse
    {
        return $this->off() ?? $this->result((new SlotService())->cancel($this->uid($r), $id, (int) $r->input('n', 0)), $r);   // 1.8.4 판매를 꺼도 산 사람은 취소 (규칙대로)
    }

    /** 1.4.8 💳 자동 연장 켜고 끄기 */
    public function slotAuto(Request $r, int $id): JsonResponse
    {
        return $this->off() ?? $this->result((new SlotService())->setAuto($this->uid($r), $id, $r->boolean('auto_renew')), $r);
    }

    /** 1.4.6 📁 여러 기기 분류 옮기기 */
    public function groupMany(Request $r): JsonResponse
    {
        $ids = $r->input('ids');

        return $this->off() ?? $this->result($this->svc->groupMany($this->uid($r), is_array($ids) ? array_values($ids) : [], (string) $r->input('grp', '')), $r);
    }

    public function rotate(Request $r, int $id): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->rotate($this->uid($r), $id), $r);
    }

    public function rotateLink(Request $r): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->rotateLink($this->uid($r)), $r);
    }

    /* ── 허브: HACS 통합이 부름 (로그인 없음 — 주소의 연결 코드로) ── */

    private function hubJson(bool $ok, string $msg, array $data = [], int $bad = 422): JsonResponse
    {
        return response()->json(['ok' => $ok, 'message' => $msg] + $data, $ok ? 200 : $bad);
    }

    /** 1.8.0 🏠 어느 HA 서버에서 왔는지 — 통합 0.4.0+ 가 머리글로 (예전 통합은 없음 → null) @return array{id: string, name: string}|null */
    private function server(Request $r): ?array
    {
        $id = (string) $r->header('X-G7-Server', '');
        if (! preg_match('/^[A-Za-z0-9_-]{6,64}$/', $id)) {
            return null;
        }
        $name = trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', rawurldecode((string) $r->header('X-G7-Server-Name', ''))));

        return ['id' => $id, 'name' => mb_substr($name !== '' ? $name : 'Home Assistant', 0, 60)];
    }

    /** 1.10.0 🧩 보낸 프로그램 — 3ds Matter 연결은 X-G7-Via: matter (서버 ID 도 matter… 로 시작) · 1.15.0 📨 MQTT 중계는 mqtt · 아니면 HA */
    private function via(Request $r): string
    {
        $v = strtolower((string) $r->header('X-G7-Via', ''));
        $s = (string) $r->header('X-G7-Server', '');

        return $v === 'mqtt' || str_starts_with($s, 'mqtt') ? 'mqtt' : ($v === 'matter' || str_starts_with($s, 'matter') ? 'matter' : 'ha');
    }

    public function hub(Request $r, string $code): JsonResponse
    {
        $uid = $this->svc->linkUser($code);

        if ($uid && ($dev = (int) $r->query('device', 0)) > 0) {
            $this->svc->tagServer($dev, null, $this->server($r), $uid);   // 1.8.2 통합 0.4.1+ 가 켤 때 이 기기 번호도 — 값을 아직 안 보낸 기기도 서버가 적힘
        }

        return $uid ? $this->hubJson(true, 'ok', $this->svc->hub($uid, $this->server($r))) : $this->hubJson(false, '연결 코드가 맞지 않아요.', [], 404);
    }

    public function hubSave(Request $r, string $code, ?int $id = null): JsonResponse
    {
        $uid = $this->svc->linkUser($code);
        if (! $uid) {
            return $this->hubJson(false, '연결 코드가 맞지 않아요.', [], 404);
        }
        $body = $r->json()->all();
        $body = (is_array($body) ? $body : []);
        $body['source'] = $this->via($r);   // 1.10.0 🧩 3ds Matter 연결이 만든 기기는 Matter 기기 (센서 이름 없이)
        $res = $this->svc->hubSave($uid, $id, $body);
        if ($res[0]) {
            $this->svc->tagServer((int) $res[2]['id'], null, $this->server($r));   // 1.8.0
        }

        return $this->hubJson($res[0], $res[1], $res[0] ? ['device' => $res[2]] : []);
    }

    /** 1.11.0 🧩 GET mt/{code}.ps1?matter=<Matter 서버 주소> — 윈도우 한 줄 설치 본문 (PowerShell). 코드가 틀리면 Write-Host 한 줄만 */
    public function matterPs1(Request $r, string $code): \Illuminate\Http\Response
    {
        $h = ['Content-Type' => 'text/plain; charset=utf-8', 'Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff'];
        if (! $this->svc->linkUser($code)) {
            return response("Write-Host '[IoT 연결] 연결 코드가 맞지 않아요 — 사이트 IoT 연결 › 🧩 Matter 에서 한 줄을 새로 복사해 주세요.' -ForegroundColor Yellow\n", 404, $h);
        }

        return response(MatterInstaller::ps1((string) config('app.url'), $code, (string) $r->query('matter', '')), 200, $h);
    }

    /** 1.12.0 🐧🍎🍓 GET mt/{code}.sh?matter=<Matter 서버 주소> — 리눅스 · 맥 · 라즈베리파이 한 줄 설치 본문 (bash). 코드가 틀리면 안내 한 줄만 */
    public function matterSh(Request $r, string $code): \Illuminate\Http\Response
    {
        $h = ['Content-Type' => 'text/plain; charset=utf-8', 'Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff'];
        if (! $this->svc->linkUser($code)) {
            return response("echo '[IoT 연결] 연결 코드가 맞지 않아요 — 사이트 IoT 연결 › Matter 에서 한 줄을 새로 복사해 주세요.'; exit 1\n", 404, $h);
        }

        return response(MatterInstaller::sh((string) config('app.url'), $code, (string) $r->query('matter', '')), 200, $h);
    }

    public function hubDelete(string $code, int $id): JsonResponse
    {
        $uid = $this->svc->linkUser($code);
        if (! $uid) {
            return $this->hubJson(false, '연결 코드가 맞지 않아요.', [], 404);
        }
        $res = $this->svc->delete($uid, $id);

        return $this->hubJson($res[0], $res[1]);
    }

    /** POST in/{token}/snap — 카메라 사진 한 장 (본문 = JPEG 그대로) */
    public function snap(Request $request, string $token): JsonResponse
    {
        if ((int) $request->header('Content-Length', '0') > HaService::SNAP_MAX) {
            return response()->json(['ok' => false, 'message' => 'too large'], 413);
        }
        [$ok, $msg] = $this->svc->snapshot($token, (string) $request->getContent());

        return response()->json(['ok' => $ok, 'message' => $msg], $ok ? 200 : 422);
    }

    /** GET devices/{id}/snap — 내 기기의 사진 (주인만) */
    public function snapShow(Request $r, int $id): \Symfony\Component\HttpFoundation\Response
    {
        $p = Settings::get('enabled') ? $this->svc->snapFile($this->uid($r), $id) : null;

        return $p === null ? response()->json(['success' => false, 'message' => '사진이 없어요.'], 404)
            : response((string) file_get_contents($p), 200, ['Content-Type' => 'image/jpeg', 'Cache-Control' => 'private, no-store', 'X-Content-Type-Options' => 'nosniff']);
    }

    /** GET snap/{id}.jpg — 회원이 공개로 둔 사진 (로그인 없이). 1분 캐시 */
    public function snapPublic(int $id): \Symfony\Component\HttpFoundation\Response
    {
        $s = $this->svc->publicSnap($id);

        return $s === null ? response('', 404, ['Cache-Control' => 'no-store'])
            : response((string) file_get_contents($s['path']), 200, ['Content-Type' => 'image/jpeg', 'Cache-Control' => 'public, max-age=60', 'X-Content-Type-Options' => 'nosniff']);
    }

    /** POST in/{token} — Home Assistant 가 값을 보내는 곳. 가볍게: 본문은 작은 JSON 만, 답도 한 줄 */
    public function ingest(Request $request, string $token): JsonResponse
    {
        $body = $request->json()->all();
        if (! is_array($body) || $body === []) {
            $body = $request->except(['token']);
        }
        \Plugins\Custom\IotLink\Support\Load::hit('in');   // 1.17.0 서버 상태 페이지
        $res = $this->svc->ingest($token, is_array($body) ? array_slice($body, 0, 12, true) : [], $this->via($request));
        if ($res[0]) {
            $this->svc->tagServer(null, $token, $this->server($request));   // 1.8.0 예전에 만든 기기도 값을 보내면 서버가 적힘
        }

        // 0.1.5 next_min · snap — 통합이 이 값을 보고 다음 주기를 맞춤 (회원이 사이트를 안 보는 동안에는 느리게)
        return response()->json(['ok' => $res[0], 'message' => $res[1]] + ($res[2] ?? []), $res[0] ? 200 : 404);
    }

    /**
     * 1.17.0 📶 POST hub/{code}/in {items: [{t: 받는 키, v: {temperature, humidity, …}}]} — 중계(MQTT · BT · Matter)가 때가 된 센서를 한 번에 (200개까지)
     *  받는 키는 그 연결 코드 회원의 기기만 · 키마다 in/{키} 와 같은 처리 → 답 {ok, items: {키: {ok, message, next_min, gap_sec, …}}}
     */
    public function ingestBatch(Request $request, string $code): JsonResponse
    {
        $uid = $this->svc->linkUser($code);
        if (! $uid) {
            return new JsonResponse(['ok' => false, 'message' => '연결 코드가 맞지 않아요.'], 404);
        }
        $items = $request->json('items');
        if (! is_array($items) || $items === [] || count($items) > 200) {
            return new JsonResponse(['ok' => false, 'message' => '묶음이 비었거나 너무 커요 (200개까지).'], 422);
        }
        $toks = array_values(array_unique(array_filter(array_map(static fn ($it) => is_array($it) ? (string) ($it['t'] ?? '') : '', $items), static fn ($t) => (bool) preg_match('/^[a-f0-9]{32}$/', $t))));
        $own = $this->svc->ownTokens($uid, $toks);
        $via = $this->via($request);
        $out = $okT = [];
        foreach ($items as $it) {
            $t = is_array($it) ? (string) ($it['t'] ?? '') : '';
            if (! preg_match('/^[a-f0-9]{32}$/', $t) || isset($out[$t])) {
                continue;
            }
            if (! isset($own[$t])) {
                $out[$t] = ['ok' => false, 'message' => 'unknown'];   // 지운 기기 · 남의 기기 — 중계가 목록에서 뺌
                continue;
            }
            $v = is_array($it['v'] ?? null) ? array_slice($it['v'], 0, 12, true) : [];
            try {
                $res = $this->svc->ingest($t, $v, $via);
            } catch (\Throwable) {
                $res = [false, 'error'];
            }
            $out[$t] = ['ok' => $res[0], 'message' => $res[1]] + ($res[2] ?? []);
            if ($res[0]) {
                $okT[] = $t;
            }
        }
        $this->svc->tagServers($okT, $this->server($request), $uid);
        \Plugins\Custom\IotLink\Support\Load::hit('batch');
        \Plugins\Custom\IotLink\Support\Load::hit('in', count($out));

        return new JsonResponse(['ok' => true, 'items' => (object) $out], 200, ['Cache-Control' => 'no-store']);
    }
}
