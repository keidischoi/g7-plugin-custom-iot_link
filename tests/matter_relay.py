"""🧩 Matter 중계 시험 — 윈도우(resources/matter/link.ps1) · 리눅스/맥(resources/matter/link.py, 파이썬 기본 기능만)을
같은 가짜 Matter 서버(WebSocket) + 가짜 사이트(허브 · 받는 주소)로.
  python tests/matter_relay.py [ps|py]     (aiohttp · ps 는 Windows powershell.exe)
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent
CODE = "c" * 32
fails = 0


def check(name: str, ok: bool) -> None:
    global fails
    print(("ok  " if ok else "FAIL") + "  " + name, flush=True)
    fails += 0 if ok else 1


NODES = [
    {"node_id": 4, "available": True, "attributes": {"0/40/1": "Eve", "0/40/3": "Weather", "0/40/5": "거실 온습도", "1/1026/0": 2345, "2/1029/0": 4512}},
    {"node_id": 5, "available": True, "attributes": {"0/40/3": "Smart Plug", "1/6/0": True}},   # 온습도 없음 → 기기 안 만듦
]


async def main(kind: str) -> None:
    print("■ " + ("🪟 PowerShell link.ps1" if kind == "ps" else "🐧 python link.py (기본 기능만)"), flush=True)
    hub: list[dict] = []
    got: list[tuple[str, dict, dict]] = []
    cmds: list[dict] = []
    socks: list[web.WebSocketResponse] = []
    tokens = {"4": "a" * 32}

    async def ws(request: web.Request) -> web.WebSocketResponse:
        w = web.WebSocketResponse()
        await w.prepare(request)
        socks.append(w)
        await w.send_json({"fabric_id": 1, "sdk_version": "fake", "schema_version": 11})
        async for msg in w:
            d = json.loads(msg.data)
            cmds.append(d)
            if d["command"] in ("start_listening", "get_nodes"):
                await w.send_json({"message_id": d["message_id"], "result": NODES})
            elif d["command"] == "commission_with_code":
                ok = d["args"]["code"] == "34970112332" and d["args"]["network_only"] is True
                await w.send_json({"message_id": d["message_id"], "result": NODES[0]} if ok else {"message_id": d["message_id"], "error_code": 1, "details": "bad"})
        return w

    async def hub_post(request: web.Request) -> web.Response:
        body = await request.json()
        hub.append({"code": request.match_info["code"], "body": body, "via": request.headers.get("X-G7-Via"), "srv": request.headers.get("X-G7-Server", "")})
        return web.json_response({"ok": True, "message": "ok", "device": {"id": 77, "name": body["name"], "token": tokens["4"]}})

    async def ingest(request: web.Request) -> web.Response:
        t = request.match_info["t"]
        got.append((t, await request.json(), dict(request.headers)))
        if t != tokens["4"]:
            return web.json_response({"ok": False, "message": "unknown"}, status=404)
        return web.json_response({"ok": True, "message": "ok", "mode": "change", "change_hum": 2, "change_temp": 0.5, "gap_sec": 10, "next_min": 15})

    app = web.Application()
    app.router.add_get("/ws", ws)
    app.router.add_post("/api/plugins/custom-iot_link/hub/{code}/devices", hub_post)
    app.router.add_post("/api/plugins/custom-iot_link/in/{t}", ingest)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]

    d = Path(tempfile.mkdtemp())
    fn = "link.ps1" if kind == "ps" else "link.py"
    src = (ROOT / "resources/matter" / fn).read_text(encoding="utf-8")
    (d / fn).write_text(src, encoding="utf-8-sig" if kind == "ps" else "utf-8")   # PowerShell 5.1 은 BOM 이 있어야 한글을 읽음
    (d / "config.json").write_text(json.dumps({"site": f"http://127.0.0.1:{port}", "code": CODE, "matter": f"127.0.0.1:{port}", "server_name": "시험 PC"}), encoding="utf-8")
    ps = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(d / fn)] if kind == "ps" else [sys.executable, "-I", str(d / fn)]
    opt = (lambda a: ["-" + a.capitalize()]) if kind == "ps" else (lambda a: ["--" + a])
    env = dict(os.environ, PYTHONIOENCODING="utf-8")

    # -Nodes
    r = await asyncio.to_thread(subprocess.run, ps + opt("nodes"), capture_output=True, timeout=60, env=env)
    out = r.stdout.decode("utf-8", "replace") + r.stdout.decode("cp949", "replace")
    if kind == "py" and "노드 2" not in out:
        print(out[-600:], r.stderr.decode("utf-8", "replace")[-600:])
    check("-Nodes 노드 2개 · 온습도", "노드 2" in out and "23.4" in out and "45.1" in out)

    # -Pair (코드는 표준 입력으로 — 실제로는 회원이 직접 입력)
    r = await asyncio.to_thread(subprocess.run, ps + opt("pair"), env=env, input=b"3497-011-2332\r\n", capture_output=True, timeout=120)
    check("-Pair → commission_with_code network_only", any(c["command"] == "commission_with_code" and c["args"]["code"] == "34970112332" for c in cmds))

    # 돌기
    proc = subprocess.Popen(ps, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
    try:
        for _ in range(40):
            await asyncio.sleep(0.5)
            if got:
                break
        check("온습도 센서만 사이트 기기를 저절로 만듦 (X-G7-Via: matter · 연결 코드)", len(hub) == 1 and hub[0]["code"] == CODE and hub[0]["via"] == "matter" and hub[0]["body"]["name"] == "거실 온습도" and hub[0]["srv"].startswith("matter"))
        await asyncio.sleep(8)
        check("처음 값 보냄 (몇 초 뒤)", len(got) >= 1 and got[0][1] == {"temperature": 23.4, "humidity": 45.1})
        if got:
            check("머리글 X-G7-Via · 서버 이름", got[0][2].get("X-G7-Via") == "matter" and got[0][2].get("X-G7-Server-Name") == "%EC%8B%9C%ED%97%98%20PC")
        cfg = json.loads((d / "config.json").read_text(encoding="utf-8-sig"))
        check("config.json 에 노드 ↔ 사이트 기기 저장 (다시 켜도 다시 안 만듦)", cfg.get("devices", {}).get("4", {}).get("token") == tokens["4"] and cfg["server_id"].startswith("matter"))
        n0 = len(got)
        w = socks[-1]
        await w.send_json({"event": "attribute_updated", "data": [4, "2/1029/0", 4612]})   # +1% < 2 (사이트가 정한 변화폭)
        await asyncio.sleep(3)
        check("작은 변화는 안 보냄", len(got) == n0)
        await w.send_json({"event": "attribute_updated", "data": [4, "1/1026/0", 2600]})   # +2.5°
        for _ in range(30):
            await asyncio.sleep(0.5)
            if len(got) > n0:
                break
        check("큰 변화 → 최소 간격(10초) 안에 보냄", len(got) == n0 + 1 and got[-1][1] == {"temperature": 26.0, "humidity": 46.1})
        # 사이트에서 기기를 지움 → 다음 보내기에서 404 unknown → 안 보냄 (다시 만들지 않음)
        tokens["4"] = "f" * 32
        await w.send_json({"event": "attribute_updated", "data": [4, "1/1026/0", 3000]})
        for _ in range(30):
            await asyncio.sleep(0.5)
            cfg = json.loads((d / "config.json").read_text(encoding="utf-8-sig"))
            if "4" in (cfg.get("skip") or []):
                break
        check("사이트에서 지운 기기 → skip 에 넣고 다시 안 만듦", "4" in (cfg.get("skip") or []) and "4" not in (cfg.get("devices") or {}) and len(hub) == 1)
        # Matter 서버가 끊으면 다시 붙음
        nws = len(socks)
        await w.close()
        for _ in range(30):
            await asyncio.sleep(0.5)
            if len(socks) > nws:
                break
        check("Matter 서버가 끊으면 다시 붙음", len(socks) > nws)
    finally:
        proc.kill()
    last = (d / "last.txt").read_text(encoding="utf-8-sig") if (d / "last.txt").exists() else ""
    print("   last.txt:", last.strip())
    await runner.cleanup()
    shutil.rmtree(d, ignore_errors=True)


for k in (sys.argv[1:] or ["ps", "py"]):
    asyncio.run(main(k))
print("\n" + ("모두 통과" if fails == 0 else f"{fails}개 실패"))
sys.exit(1 if fails else 0)
