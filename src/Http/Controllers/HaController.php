<?php

namespace Plugins\Custom\IotLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Plugins\Custom\IotLink\Services\HaService;
use Plugins\Custom\IotLink\Services\SlotService;
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
        return response()->json(['success' => $r[0], 'message' => $r[1], 'data' => $r[0] ? (is_array($r[2] ?? null) ? $r[2] : []) + ['overview' => $this->svc->overview($this->uid($req))] : null], $r[0] ? 200 : 422);
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
        $res = $this->svc->hubSave($uid, $id, is_array($body) ? $body : []);
        if ($res[0]) {
            $this->svc->tagServer((int) $res[2]['id'], null, $this->server($r));   // 1.8.0
        }

        return $this->hubJson($res[0], $res[1], $res[0] ? ['device' => $res[2]] : []);
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
        $res = $this->svc->ingest($token, is_array($body) ? array_slice($body, 0, 12, true) : []);
        if ($res[0]) {
            $this->svc->tagServer(null, $token, $this->server($request));   // 1.8.0 예전에 만든 기기도 값을 보내면 서버가 적힘
        }

        // 0.1.5 next_min · snap — 통합이 이 값을 보고 다음 주기를 맞춤 (회원이 사이트를 안 보는 동안에는 느리게)
        return response()->json(['ok' => $res[0], 'message' => $res[1]] + ($res[2] ?? []), $res[0] ? 200 : 404);
    }
}
