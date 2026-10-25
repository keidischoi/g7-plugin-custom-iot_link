<?php

namespace Plugins\Custom\IotLink\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Plugins\Custom\IotLink\Services\HaService;
use Plugins\Custom\IotLink\Services\MqttService;
use Plugins\Custom\IotLink\Support\MqttInstaller;
use Plugins\Custom\IotLink\Support\Settings;

/** 1.15.0 📨 MQTT 중계 — 회원 화면(로그인: 브로커 설정 · 토픽 고르기) + 중계(연결 코드: 설정 받기 · 한 줄 설치) */
class MqttController extends Controller
{
    public function __construct(private HaService $ha, private MqttService $svc) {}

    private function off(): ?JsonResponse
    {
        return Settings::get('enabled') ? null : response()->json(['success' => false, 'message' => 'IoT 연결이 꺼져 있어요.'], 404);
    }

    /** @param array{0: bool, 1: string, 2?: mixed} $r */
    private function result(array $r, Request $req): JsonResponse
    {
        return response()->json(['success' => $r[0], 'message' => $r[1], 'data' => $r[0] ? (is_array($r[2] ?? null) ? $r[2] : []) + ['overview' => $this->ha->overview((int) ($req->user()?->id ?? 0))] : null], $r[0] ? 200 : 422);
    }

    /** PUT mqtt — {host, port, user, pass, clear_pass, tls, topics} */
    public function save(Request $r): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->save((int) ($r->user()?->id ?? 0), $r->only(['host', 'port', 'user', 'pass', 'clear_pass', 'tls', 'topics'])), $r);
    }

    /** POST mqtt/pick — {key, on, name} */
    public function pick(Request $r): JsonResponse
    {
        return $this->off() ?? $this->result($this->svc->pick((int) ($r->user()?->id ?? 0), (string) $r->input('key', ''), $r->boolean('on'), (string) $r->input('name', '')), $r);
    }

    /** 중계 이름 — X-G7-Server(mqtt…) · X-G7-Server-Name @return array{id: string, name: string}|null */
    private function server(Request $r): ?array
    {
        $id = (string) $r->header('X-G7-Server', '');
        if (! preg_match('/^[A-Za-z0-9_-]{6,64}$/', $id)) {
            return null;
        }
        $name = trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', ' ', rawurldecode((string) $r->header('X-G7-Server-Name', ''))));

        return ['id' => $id, 'name' => mb_substr($name !== '' ? $name : 'MQTT 중계', 0, 60)];
    }

    /** POST hub/{code}/mqtt — {seen: [{key, name, temperature, humidity}], broker: ok|start|까닭, ver} */
    public function relay(Request $r, string $code): JsonResponse
    {
        $uid = $this->ha->linkUser($code);
        if (! $uid) {
            return response()->json(['ok' => false, 'message' => '연결 코드가 맞지 않아요.'], 404);
        }
        $seen = $r->json('seen');

        return response()->json(['ok' => true] + $this->svc->relay($uid, is_array($seen) ? array_values($seen) : [], (string) $r->json('broker', ''), $this->server($r), (string) $r->json('ver', '')), 200, ['Cache-Control' => 'no-store']);
    }

    private const TXT = ['Content-Type' => 'text/plain; charset=utf-8', 'Cache-Control' => 'no-store', 'X-Content-Type-Options' => 'nosniff'];

    /** GET mq/{code}.ps1 — 윈도우 한 줄 설치 본문 (PowerShell). 코드가 틀리면 안내 한 줄만 */
    public function ps1(string $code): \Illuminate\Http\Response
    {
        if (! $this->ha->linkUser($code)) {
            return response("Write-Host '[IoT 연결] 연결 코드가 맞지 않아요 — 사이트 IoT 연결 › MQTT 에서 한 줄을 새로 복사해 주세요.' -ForegroundColor Yellow\n", 404, self::TXT);
        }

        return response(MqttInstaller::ps1((string) config('app.url'), $code), 200, self::TXT);
    }

    /** GET mq/{code}.sh — 리눅스 · 맥 · 라즈베리파이 한 줄 설치 본문 (bash) */
    public function sh(string $code): \Illuminate\Http\Response
    {
        if (! $this->ha->linkUser($code)) {
            return response("echo '[IoT 연결] 연결 코드가 맞지 않아요 — 사이트 IoT 연결 › MQTT 에서 한 줄을 새로 복사해 주세요.'; exit 1\n", 404, self::TXT);
        }

        return response(MqttInstaller::sh((string) config('app.url'), $code), 200, self::TXT);
    }
}
