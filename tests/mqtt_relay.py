"""📨 MQTT 중계 시험 — 윈도우(resources/mqtt/link.ps1) · 리눅스/맥(resources/mqtt/link.py, 파이썬 기본 기능만)을
같은 가짜 MQTT 브로커(3.1.1 · 계정 확인) + 가짜 사이트(hub/{code}/mqtt · 받는 주소)로.
  py -3.12 tests/mqtt_relay.py [ps|py]     (aiohttp · ps 는 Windows powershell.exe)
"""
from __future__ import annotations

import asyncio
import json
import os
import shutil
import struct
import subprocess
import sys
import tempfile
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent.parent
CODE = "c" * 32
TOK = "a" * 32
fails = 0


def check(name: str, ok: bool) -> None:
    global fails
    print(("ok  " if ok else "FAIL") + "  " + name, flush=True)
    fails += 0 if ok else 1


def mstr(s: str) -> bytes:
    b = s.encode()
    return struct.pack(">H", len(b)) + b


def pkt(t: int, body: bytes) -> bytes:
    n, ln = len(body), b""
    while True:
        d, n = n % 128, n // 128
        ln += bytes([d | (128 if n else 0)])
        if not n:
            break
    return bytes([t]) + ln + body


def pub(topic: str, payload, qos: int = 0) -> bytes:
    raw = payload if isinstance(payload, bytes) else (json.dumps(payload, ensure_ascii=False) if isinstance(payload, dict) else str(payload)).encode()
    return pkt(0x30 | (qos << 1), mstr(topic) + (b"\x00\x07" if qos else b"") + raw)


# 브로커가 구독 뒤 바로 보내는 것 (센서들이 올리는 값처럼)
FIRST = [
    ("zigbee2mqtt/거실 온습도", {"temperature": 23.4, "humidity": 45.1, "battery": 90, "linkquality": 120}),
    ("tele/sonoff/SENSOR", {"Time": "2026-10-25T10:00:00", "AM2301": {"Temperature": 21.2, "Humidity": 50.3}, "TempUnit": "C"}),
    ("shellies/ht1/sensor/temperature", "19.5"),
    ("shellies/ht1/sensor/humidity", "61"),
    ("homeassistant/sensor/drybox_humidity/state", "18"),
    ("zigbee2mqtt/bridge/state", {"state": "online", "temperature": 40}),   # 빼야 함 (브리지)
    ("homeassistant/sensor/x/config", {"name": "x", "temperature": 1}),     # 빼야 함 (HA 찾기용 설정)
    ("zigbee2mqtt/플러그", {"state": "ON", "power": 5}),                     # 온습도 없음
    ("frigate/camera/snapshot", b"\xff\xd8" + b"\x00" * 20000),              # 큰 그림 — 안 봄
]


async def main(kind: str) -> None:
    print("■ " + ("🪟 PowerShell link.ps1" if kind == "ps" else "🐧 python link.py (기본 기능만)"), flush=True)
    conns: list[dict] = []
    syncs: list[dict] = []
    got: list[tuple[str, dict, dict]] = []
    st = {"pass": "pw1", "rev": "r1", "map": {}, "tok": TOK, "host": "127.0.0.1"}

    async def broker(reader: asyncio.StreamReader, writer: asyncio.StreamWriter) -> None:
        c = {"w": writer, "subs": [], "user": None, "pass": None, "ok": False, "pings": 0}
        conns.append(c)
        try:
            while True:
                h = (await reader.readexactly(1))[0]
                ln, mul = 0, 1
                while True:
                    d = (await reader.readexactly(1))[0]
                    ln += (d & 127) * mul
                    mul *= 128
                    if not d & 128:
                        break
                body = await reader.readexactly(ln) if ln else b""
                t = h >> 4
                if t == 1:   # CONNECT
                    i = 2 + struct.unpack(">H", body[:2])[0]
                    level, flags = body[i], body[i + 1]
                    i += 4
                    ci = struct.unpack(">H", body[i:i + 2])[0]
                    i += 2 + ci
                    if flags & 0x80:
                        n = struct.unpack(">H", body[i:i + 2])[0]
                        c["user"] = body[i + 2:i + 2 + n].decode()
                        i += 2 + n
                    if flags & 0x40:
                        n = struct.unpack(">H", body[i:i + 2])[0]
                        c["pass"] = body[i + 2:i + 2 + n].decode()
                    rc = 0 if level == 4 and c["user"] == "zig" and c["pass"] == "pw1" else 4
                    writer.write(pkt(0x20, bytes([0, rc])))
                    await writer.drain()
                    if rc:
                        writer.close()
                        return
                    c["ok"] = True
                elif t == 8:   # SUBSCRIBE
                    pid, i, subs = body[:2], 2, []
                    while i < len(body):
                        n = struct.unpack(">H", body[i:i + 2])[0]
                        subs.append(body[i + 2:i + 2 + n].decode())
                        i += 3 + n
                    c["subs"] = subs
                    writer.write(pkt(0x90, pid + b"\x00" * len(subs)))
                    for tp, pl in FIRST:
                        writer.write(pub(tp, pl, 1 if tp.startswith("tele/") else 0))   # QoS 1 하나 — PUBACK 을 보내는지
                    await writer.drain()
                elif t == 12:   # PINGREQ
                    c["pings"] += 1
                    writer.write(b"\xd0\x00")
                    await writer.drain()
                elif t == 4:   # PUBACK
                    c["puback"] = True
                elif t == 14:
                    return
        except (asyncio.IncompleteReadError, ConnectionError):
            return

    async def send_all(tp: str, pl) -> None:
        for c in conns:
            if c["ok"] and not c["w"].is_closing():
                try:
                    c["w"].write(pub(tp, pl))
                    await c["w"].drain()
                except ConnectionError:
                    c["ok"] = False

    srv = await asyncio.start_server(broker, "127.0.0.1", 0)
    bport = srv.sockets[0].getsockname()[1]

    async def hub_mqtt(request: web.Request) -> web.Response:
        if request.match_info["code"] != CODE:
            return web.json_response({"ok": False, "message": "연결 코드가 맞지 않아요."}, status=404)
        b = await request.json()
        syncs.append({"body": b, "via": request.headers.get("X-G7-Via"), "srv": request.headers.get("X-G7-Server", "")})
        return web.json_response({"ok": True, "config": {"host": st["host"], "port": bport, "user": "zig", "pass": st["pass"], "tls": False, "topics": ["#"]}, "rev": st["rev"],
                                  "map": st["map"], "pace": {"send_mode": "change", "change_hum": 2, "change_temp": 0.5, "gap_sec": 10, "next_min": 15}})

    async def ingest(request: web.Request) -> web.Response:
        t = request.match_info["t"]
        got.append((t, await request.json(), dict(request.headers)))
        if t != st["tok"]:
            return web.json_response({"ok": False, "message": "unknown"}, status=404)
        return web.json_response({"ok": True, "message": "ok", "mode": "change", "change_hum": 2, "change_temp": 0.5, "gap_sec": 10, "next_min": 15})

    app = web.Application()
    app.router.add_post("/api/plugins/custom-iot_link/hub/{code}/mqtt", hub_mqtt)
    app.router.add_post("/api/plugins/custom-iot_link/in/{t}", ingest)
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, "127.0.0.1", 0)
    await site.start()
    port = site._server.sockets[0].getsockname()[1]

    d = Path(tempfile.mkdtemp())
    fn = "link.ps1" if kind == "ps" else "link.py"
    src = (ROOT / "resources/mqtt" / fn).read_text(encoding="utf-8")
    (d / fn).write_text(src, encoding="utf-8-sig" if kind == "ps" else "utf-8")
    (d / "config.json").write_text(json.dumps({"site": f"http://127.0.0.1:{port}", "code": CODE, "server_name": "시험 PC"}), encoding="utf-8")
    ps = ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(d / fn), "-NoBle"] if kind == "ps" else [sys.executable, "-I", str(d / fn)]
    env = dict(os.environ, PYTHONIOENCODING="utf-8")

    # 찾기 (-Scan) — 사이트 설정으로 붙고, 찾은 토픽을 사이트에 알림
    r = await asyncio.to_thread(subprocess.run, ps + (["-Scan"] if kind == "ps" else ["--scan"]), capture_output=True, timeout=90, env=env)
    out = r.stdout.decode("utf-8", "replace") + r.stdout.decode("cp949", "replace")
    check("브로커에 계정 · 비밀번호로 붙음 (사이트에서 받은 것)", any(c["user"] == "zig" and c["pass"] == "pw1" and c["ok"] for c in conns))
    check("구독 토픽 = 사이트 설정 (#)", conns and conns[0]["subs"] == ["#"])
    check("QoS 1 메시지에 PUBACK", any(c.get("puback") for c in conns))
    rows = {x["key"]: x for s in syncs for x in s["body"].get("seen") or []}
    want = {"zigbee2mqtt/거실 온습도": ("거실 온습도", 23.4, 45.1), "tele/sonoff/SENSOR": ("sonoff", 21.2, 50.3), "shellies/ht1/sensor": ("ht1", 19.5, 61.0), "homeassistant/sensor/drybox_humidity/state": ("drybox_humidity", None, 18.0)}
    okrows = set(rows) == set(want) and all(rows[k]["name"] == w[0] and rows[k].get("temperature") == w[1] and rows[k].get("humidity") == w[2] for k, w in want.items())
    if not okrows:
        print("   seen:", json.dumps(rows, ensure_ascii=False)[:900], "\n", out[-500:], r.stderr.decode("utf-8", "replace")[-500:])
    check("찾은 토픽 4개 (Zigbee2MQTT · Tasmota · Shelly 숫자 둘 → 하나 · HA statestream) — 브리지 · 설정 · 온습도 없음 · 큰 그림은 뺌", okrows)
    check("사이트로 알림 머리글 X-G7-Via: mqtt · 중계 ID mqtt…", syncs and all(s["via"] == "mqtt" and s["srv"].startswith("mqtt") for s in syncs))
    check("화면 글: 찾은 토픽 4개", "4" in out and "sonoff" in out)

    # 돌기 — 고른 토픽만 보냄
    st["map"] = {"zigbee2mqtt/거실 온습도": TOK}
    n_conn = len(conns)
    proc = subprocess.Popen(ps, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
    try:
        for _ in range(40):
            await asyncio.sleep(0.5)
            if got:
                break
        check("고른 토픽 값 보냄 (몇 초 뒤) · 고르지 않은 것은 안 보냄", len(got) == 1 and got[0][0] == TOK and got[0][1] == {"temperature": 23.4, "humidity": 45.1})
        if got:
            check("머리글 X-G7-Via: mqtt · 중계 이름", got[0][2].get("X-G7-Via") == "mqtt" and got[0][2].get("X-G7-Server-Name") == "%EC%8B%9C%ED%97%98%20PC")
        cfg = json.loads((d / "config.json").read_text(encoding="utf-8-sig"))
        check("config.json 에 비밀번호 · 브로커를 적지 않음", "pw1" not in json.dumps(cfg) and "host" not in cfg and cfg["server_id"].startswith("mqtt"))
        n0 = len(got)
        await asyncio.sleep(1)
        await send_all("zigbee2mqtt/거실 온습도", {"temperature": 23.5, "humidity": 46.0})   # 작은 변화
        await asyncio.sleep(3)
        check("작은 변화는 안 보냄", len(got) == n0)
        await send_all("zigbee2mqtt/거실 온습도", {"temperature": 26.0, "humidity": 46.0})   # +2.5°
        for _ in range(30):
            await asyncio.sleep(0.5)
            if len(got) > n0:
                break
        check("큰 변화 → 최소 간격(10초) 안에 보냄", len(got) == n0 + 1 and got[-1][1] == {"temperature": 26.0, "humidity": 46.0})
        # 사이트에서 다른 토픽도 고름 → 다음 맞춤(30초) 때 붙은 채로 보내기 시작
        st["map"] = {"zigbee2mqtt/거실 온습도": TOK, "tele/sonoff/SENSOR": "b" * 32}
        for _ in range(80):
            await asyncio.sleep(0.5)
            if any(g[0] == "b" * 32 for g in got):
                break
        check("새로 고른 토픽 → 다시 붙지 않고 보내기 시작", any(g[0] == "b" * 32 and g[1] == {"temperature": 21.2, "humidity": 50.3} for g in got) and len(conns) == n_conn + 1)
        # 사이트에서 브로커 설정을 바꿈 (rev) → 다시 붙음 · 비밀번호가 틀리면 그 까닭을 사이트에 알림
        st["rev"], st["pass"] = "r2", "wrong"
        for _ in range(90):
            await asyncio.sleep(0.5)
            if any("비밀번호" in str(s["body"].get("broker")) for s in syncs):
                break
        check("설정이 바뀌면 다시 붙음 · 계정이 틀리면 까닭을 사이트에 (사용자 이름 · 비밀번호)", len(conns) > n_conn + 1 and any("비밀번호" in str(s["body"].get("broker")) for s in syncs))
        st["pass"] = "pw1"
        nc = len(conns)
        for _ in range(140):
            await asyncio.sleep(0.5)
            if any(c["ok"] for c in conns[nc:]):
                break
        check("고치면 다시 붙음 (다시 시도)", any(c["ok"] for c in conns[nc:]))
        # 브로커가 끊으면 다시 붙음
        nc = len(conns)
        for c in conns:
            c["w"].close()
        for _ in range(140):
            await asyncio.sleep(0.5)
            if any(c["ok"] for c in conns[nc:]):
                break
        check("브로커가 끊으면 다시 붙음", any(c["ok"] for c in conns[nc:]))
    finally:
        proc.kill()
    if kind == "ps":   # 1.16.0 📶 블루투스 — 신호 읽기(기종마다) · 브로커 없이도 돎
        r = await asyncio.to_thread(subprocess.run, ["powershell.exe", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ROOT / "tests/ble_decode.ps1"), "-Link", str(d / fn)], capture_output=True, timeout=120)
        out = r.stdout.decode("cp949", "replace")
        if "init: on" not in out:
            print("   (이 PC 에 블루투스가 없어 블루투스 시험은 건너뜀)", out[-300:])
        else:
            want = ["BTHome v2 => BTHome|25.1|50.6", "pvvx => pvvx|23.4|45.1", "ATC1441 => ATC|23.5|45", "Govee H5075 => Govee|23.4|45.1", "SwitchBot => SwitchBot|23.5|45", "Inkbird => Inkbird|23.4|45.1", "Xiaomi 100D => Xiaomi|23.5|45.1"]
            check("📶 블루투스 신호 읽기 — BTHome · pvvx · ATC · Govee · SwitchBot · Inkbird · 샤오미", all(w in out for w in want))
            lines = {l.split(" => ")[0].strip(): l.split(" => ")[1].strip() for l in out.splitlines() if " => " in l}
            check("📶 암호 걸린 것 · 온습도계 아닌 것은 안 읽음", lines.get("BTHome 암호", "x") == "" and lines.get("냉장고", "x") == "" and lines.get("Xiaomi 암호", "x") == "")
            check("📶 키 ble/MAC · 이름 (기기 이름 · 없으면 종류 + MAC 끝)", "take ble/A4:C1:38:1A:2B:3C pvvx 2B3C t=23.5 h=45.1" in out and "take ble/A4:C1:38:AA:BB:CC ATC_AABBCC t=21" in out)
            st["host"] = ""
            n = len(syncs)
            proc = subprocess.Popen(ps[:-1], stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=env)
            try:
                for _ in range(40):
                    await asyncio.sleep(0.5)
                    if len(syncs) > n + 1:
                        break
                check("📶 브로커 주소가 없어도 블루투스로 돎 (broker none · ble on 을 사이트에)", any(s["body"].get("ble") == "on" and s["body"].get("broker") == "none" for s in syncs[n:]))
            finally:
                proc.kill()
    last = (d / "last.txt").read_text(encoding="utf-8-sig") if (d / "last.txt").exists() else ""
    print("   last.txt:", last.strip())
    srv.close()
    await runner.cleanup()
    shutil.rmtree(d, ignore_errors=True)


for k in (sys.argv[1:] or ["ps", "py"]):
    asyncio.run(main(k))
print("\n" + ("모두 통과" if fails == 0 else f"{fails}개 실패"))
sys.exit(1 if fails else 0)
