<?php

namespace Plugins\Custom\HaLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Plugins\Custom\HaLink\Services\HaService;
use Plugins\Custom\HaLink\Services\SmartThingsService;

/**
 * 0.2.0 SmartThings
 *  - POST smartthings: WebHook SmartApp 이 부르는 곳 (로그인 없음 — HTTP 서명으로 확인. 본문은 서명 확인 전에는 읽기만)
 *  - 회원 (로그인): 연결 코드 만들기 · 이을 기기 바꾸기 · 연결 끊기 (내 것만)
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

    public function relink(Request $r, int $id): JsonResponse
    {
        return $this->result($this->st->relink($this->uid($r), $id, (int) $r->input('device_id', 0)), $r);
    }

    public function disconnect(Request $r, int $id): JsonResponse
    {
        return $this->result($this->st->disconnect($this->uid($r), $id), $r);
    }
}
