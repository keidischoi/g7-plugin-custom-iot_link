<?php

namespace Plugins\Custom\IotLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Plugins\Custom\IotLink\Services\HaService;
use Plugins\Custom\IotLink\Services\SmartThingsService;

/**
 * 0.2.0 SmartThings
 *  - POST smartthings: WebHook SmartApp 이 부르는 곳 (로그인 없음 — HTTP 서명으로 확인. 본문은 서명 확인 전에는 읽기만)
 *  - 회원 (로그인): 연결 코드 만들기 · 이을 기기 바꾸기 · 연결 끊기 (내 것만)
 * 1.1.0 로그인 연결 (API Access App · OAuth)
 *  - 회원 (로그인): 로그인 주소 받기(start) · 돌아와서 잇기(finish — state 가 그 회원 것일 때만) · 센서 목록 · 고른 것 저장
 */
class SmartThingsController extends Controller
{
    public function __construct(private SmartThingsService $st, private HaService $ha) {}

    public function webhook(Request $r): JsonResponse
    {
        $headers = [];
        foreach (['authorization', 'digest', 'date'] as $h) {
            if ($r->headers->has($h)) {
                $headers[$h] = (string) $r->headers->get($h);
            }
        }
        $uri = (string) $r->getRequestUri();
        $path = explode('?', $uri, 2)[0];
        [$status, $json] = $this->st->handle($r->getMethod(), array_values(array_unique([$path, $uri, $r->getBaseUrl().$r->getPathInfo()])), $headers, (string) $r->getContent());

        return new JsonResponse($json, $status, ['Cache-Control' => 'no-store']);
    }

    private function uid(Request $r): int
    {
        return (int) ($r->user()?->id ?? 0);
    }

    /** @param array{0: bool, 1: string} $res */
    private function result(array $res, Request $r): JsonResponse
    {
        return new JsonResponse(['success' => $res[0], 'message' => $res[1], 'data' => $res[0] ? ['overview' => $this->ha->overview($this->uid($r))] : null], $res[0] ? 200 : 422);
    }

    public function code(Request $r): JsonResponse
    {
        $dev = (int) $r->input('device_id', 0);

        return $this->result($this->st->createCode($this->uid($r), $dev > 0 ? $dev : null), $r);
    }

    /** @param array{0: bool, 1: string, 2?: array<string, mixed>} $res — 답에 화면 값(overview)도 같이 */
    private function withData(array $res, Request $r, bool $overview = true): JsonResponse
    {
        $data = $res[0] ? (is_array($res[2] ?? null) ? $res[2] : []) + ($overview ? ['overview' => $this->ha->overview($this->uid($r))] : []) : null;

        return new JsonResponse(['success' => $res[0], 'message' => $res[1], 'data' => $data], $res[0] ? 200 : 422, ['Cache-Control' => 'no-store']);
    }

    public function oauthStart(Request $r): JsonResponse
    {
        return $this->withData($this->st->oauthStart($this->uid($r)), $r, false);
    }

    public function oauthFinish(Request $r): JsonResponse
    {
        $code = $r->input('code');
        $state = $r->input('state');

        return $this->withData($this->st->oauthFinish($this->uid($r), is_string($code) ? $code : '', is_string($state) ? $state : ''), $r);
    }

    public function devices(Request $r, int $id): JsonResponse
    {
        return $this->withData($this->st->oauthDevices($this->uid($r), $id), $r, false);
    }

    public function pick(Request $r, int $id): JsonResponse
    {
        $picks = $r->input('devices');

        return $this->withData($this->st->oauthPick($this->uid($r), $id, is_array($picks) ? array_values($picks) : [], $r->input('power_on_w')), $r);
    }

    public function relink(Request $r, int $id): JsonResponse
    {
        return $this->result($this->st->relink($this->uid($r), $id, (int) $r->input('device_id', 0)), $r);
    }

    /** 1.4.2 「🔄 다시 잇기」 — 끊긴 SmartThings 기기를 지금 바로 다시 이음 */
    public function revive(Request $r): JsonResponse
    {
        $res = $this->st->reviveNow($this->uid($r));

        return new JsonResponse(['success' => $res[0], 'message' => $res[1], 'data' => ['overview' => $this->ha->overview($this->uid($r))]], $res[0] ? 200 : 422, ['Cache-Control' => 'no-store']);
    }

    public function disconnect(Request $r, int $id): JsonResponse
    {
        return $this->result($this->st->disconnect($this->uid($r), $id), $r);
    }
}
