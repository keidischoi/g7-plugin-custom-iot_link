#!/usr/bin/env python3
# 3D SUEÑO IoT 연결 — 📨 MQTT 중계 (리눅스 · 맥 · 라즈베리파이 · 파이썬 기본 기능만 — 따로 깔 것 없음)
#  집 안 MQTT 브로커(Mosquitto · EMQX · HA 의 Mosquitto 애드온)에 올라오는 온습도 값(Zigbee2MQTT · Tasmota · Shelly · ESPHome …)을 사이트 IoT 연결로 보냄
#  브로커 주소 · 포트 · 계정 · 토픽은 사이트 화면(IoT 연결 › MQTT)에서 정함 — 중계는 연결 코드로 그 설정을 받아 감 (30초마다 · 바꾸면 다시 붙음)
#  찾은 온습도 토픽은 사이트 화면에 목록으로 · 회원이 「받기」를 누른 것만 기기로 받는 주소 /in/{키} 에 보냄 — 보내는 규칙은 HA 통합 · Matter 중계와 같음
#  돌기: python3 link.py        찾은 토픽 보기: python3 link.py --scan
#  설치(사이트의 한 줄이 대신 함): python3 link.py --setup <사이트> <연결 코드>
import json, os, re, socket, ssl, struct, sys, time, urllib.error, urllib.parse, urllib.request, uuid

VER = '1.17.0'
DIR = os.path.dirname(os.path.abspath(__file__))
CFG = os.path.join(DIR, 'config.json')
LAST = os.path.join(DIR, 'last.txt')
SYNC_SEC = 30          # 사이트와 맞추는 간격 (설정 · 고른 토픽 · 찾은 토픽)
MAX_SEEN = 150         # 찾은 토픽은 이만큼까지
MAX_BODY = 16384       # 이보다 큰 메시지(카메라 사진 같은 것)는 보지 않음
for _s in (sys.stdout, sys.stderr):   # 한글 · 이모지를 못 쓰는 터미널에서도 멈추지 않게
    try:
        _s.reconfigure(errors='replace')
    except (AttributeError, ValueError):
        pass


def log(m):
    try:
        with open(LAST, 'w', encoding='utf-8') as f:
            f.write(time.strftime('%Y-%m-%dT%H:%M:%S ') + str(m) + '\n')
    except OSError:
        pass


def say(m):
    print('\033[1;36m[IoT 연결]\033[0m ' + m, flush=True)


def warn(m):
    print('\033[1;33m[IoT 연결]\033[0m ' + m, flush=True)


# ── 설정 (이 PC 에는 사이트 · 연결 코드 · 중계 이름만 — 브로커 계정은 사이트에서 받아 메모리에만)
def load_cfg():
    c = {}
    try:
        with open(CFG, encoding='utf-8-sig') as f:
            c = json.load(f) or {}
    except (OSError, ValueError):
        pass
    o = {'site': str(c.get('site') or ''), 'code': str(c.get('code') or ''), 'server_id': str(c.get('server_id') or ''), 'server_name': str(c.get('server_name') or '')}
    if not o['server_id']:
        o['server_id'] = 'mqtt' + uuid.uuid4().hex[:24]
    if not o['server_name']:
        o['server_name'] = '%s (%s)' % (socket.gethostname().split('.')[0][:40] or 'PC', 'Mac' if sys.platform == 'darwin' else 'Linux')
    if o['site'] and not (c.get('server_id') and c.get('server_name')):
        try:
            save_cfg(o)   # 중계 ID 는 한 번 정하면 그대로 (사이트가 같은 중계로 알아봄)
        except OSError:
            pass
    return o


def save_cfg(o):
    tmp = CFG + '.tmp'
    with open(tmp, 'w', encoding='utf-8') as f:
        json.dump(o, f, ensure_ascii=False, indent=1)
    os.replace(tmp, CFG)
    try:
        os.chmod(CFG, 0o600)   # 연결 코드가 들어 있음
    except OSError:
        pass


# ── 사이트
def site_req(o, method, path, body=None):
    url = o['site'].rstrip('/') + '/api/plugins/custom-iot_link/' + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': '3ds-mqtt-py/' + VER,
        'X-G7-Via': 'mqtt', 'X-G7-Server': o['server_id'], 'X-G7-Server-Name': urllib.parse.quote(o['server_name'], safe='')})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            status, txt = r.status, r.read().decode('utf-8', 'replace')
    except urllib.error.HTTPError as e:
        status, txt = e.code, e.read().decode('utf-8', 'replace')
    try:
        j = json.loads(txt)
    except ValueError:
        j = None
    return status, j


def sync(o, seen, broker):
    """사이트와 맞춤 — 찾은 토픽을 알리고, 브로커 설정 · 고른 토픽(키 → 받는 키) · 보내는 규칙을 받아 옴"""
    st, j = site_req(o, 'POST', 'hub/%s/mqtt' % o['code'], {'seen': seen, 'broker': broker, 'ver': VER})
    if st == 404:
        raise PermissionError('연결 코드가 맞지 않아요 — 사이트 IoT 연결 › MQTT 에서 한 줄을 새로 복사해 다시 설치해 주세요.')
    if st >= 400 or not isinstance(j, dict) or not isinstance(j.get('config'), dict):
        raise ConnectionError('사이트가 답하지 않아요 (%s)' % st)
    return j


# ── MQTT 3.1.1 (구독만 · QoS 0)
def mstr(s):
    b = s.encode('utf-8')
    return struct.pack('>H', len(b)) + b


def mpkt(t, body):
    n, ln = len(body), b''
    while True:
        d, n = n % 128, n // 128
        ln += bytes([d | (128 if n else 0)])
        if not n:
            break
    return bytes([t]) + ln + body


CONNACK = {1: '브로커가 MQTT 3.1.1 을 받지 않아요', 2: '브로커가 중계 이름을 거절했어요', 3: '브로커가 지금 연결을 받지 않아요',
           4: '사용자 이름 · 비밀번호가 맞지 않아요', 5: '이 계정은 브로커에 붙을 수 없어요 (허락 안 됨)'}


class MQ:
    def __init__(self, c, timeout=10):
        host, port = str(c.get('host') or ''), int(c.get('port') or 1883)
        if not host:
            raise ValueError('브로커 주소가 아직 없어요 — 사이트 IoT 연결 › MQTT › ⚙️ 브로커 설정에서 적어 주세요.')
        try:
            s = socket.create_connection((host, port), timeout=timeout)
        except OSError as e:
            raise ConnectionError('브로커(%s:%d)에 닿지 않아요 — %s' % (host, port, e))
        if c.get('tls'):
            ctx = ssl.create_default_context()
            ctx.check_hostname, ctx.verify_mode = False, ssl.CERT_NONE   # 집 안 브로커는 보통 스스로 만든 인증서
            s = ctx.wrap_socket(s, server_hostname=host)
        self.s, self.buf, self.last_tx = s, b'', time.monotonic()
        user, pw = str(c.get('user') or ''), str(c.get('pass') or '')
        flags, pay = 0x02, mstr('3ds-' + uuid.uuid4().hex[:12])
        if user:
            flags |= 0x80
            pay += mstr(user)
            if pw:
                flags |= 0x40
                pay += mstr(pw)
        self.send(mpkt(0x10, mstr('MQTT') + bytes([4, flags]) + struct.pack('>H', 60) + pay))
        p = self.recv(timeout)
        if not p or p[0] != 2:
            self.close()
            raise ConnectionError('MQTT 브로커가 아닌 것 같아요 (%s:%d)' % (host, port))
        if len(p[2]) > 1 and p[2][1]:
            self.close()
            raise PermissionError(CONNACK.get(p[2][1], '브로커가 거절했어요 (코드 %d)' % p[2][1]))
        topics = [t for t in (c.get('topics') or ['#']) if isinstance(t, str) and t.strip()] or ['#']
        self.send(mpkt(0x82, struct.pack('>H', 1) + b''.join(mstr(t.strip()) + b'\x00' for t in topics)))

    def send(self, b):
        self.s.sendall(b)
        self.last_tx = time.monotonic()

    def _fill(self, n, wait=None):
        while len(self.buf) < n:
            self.s.settimeout(wait if wait is not None else 30)
            ch = self.s.recv(65536)
            if not ch:
                raise ConnectionError('브로커 연결이 끊겼어요')
            self.buf += ch
            wait = None

    def recv(self, wait):
        """(종류, 깃발, 본문) 하나 — wait 초 안에 안 오면 None. 30초 조용하면 PINGREQ"""
        if time.monotonic() - self.last_tx > 30:
            self.send(b'\xc0\x00')
        if not self.buf:
            try:
                self._fill(1, max(0.05, wait))
            except socket.timeout:
                return None
        i, ln, mul = 1, 0, 1
        while True:
            self._fill(i + 1)
            d = self.buf[i]
            ln += (d & 127) * mul
            mul *= 128
            i += 1
            if not d & 128:
                break
            if i > 4:
                raise ConnectionError('브로커가 보낸 것을 읽지 못했어요')
        self._fill(i + ln)
        h, body, self.buf = self.buf[0], self.buf[i:i + ln], self.buf[i + ln:]
        return h >> 4, h & 15, body

    def close(self):
        try:
            self.s.sendall(b'\xe0\x00')
        except OSError:
            pass
        try:
            self.s.close()
        except OSError:
            pass


def publish(p):
    """PUBLISH 본문 → (토픽, 값 바이트) · QoS 1 이면 받았다고 답할 번호"""
    t, flags, body = p
    tl = struct.unpack('>H', body[:2])[0]
    topic = body[2:2 + tl].decode('utf-8', 'replace')
    i, pid = 2 + tl, None
    if (flags >> 1) & 3:
        pid, i = body[i:i + 2], i + 2
    return topic, body[i:], pid


# ── 토픽 값 → 온도 · 습도 (Zigbee2MQTT · Tasmota · Shelly · ESPHome · HA statestream · 숫자 하나)
TK = ('temperature', 'temp', 'tempc', 'temp_c', 'temperature_c', 'tc', 'chamber_temper', 'air_temperature', 'current_temperature')
HK = ('humidity', 'hum', 'rh', 'relative_humidity', 'humidity_percent', 'current_humidity')
STOP = {'zigbee2mqtt', 'tele', 'stat', 'sensor', 'sensors', 'state', 'status', 'shellies', 'homeassistant', 'events', 'rpc', 'report',
        'device', 'devices', 'temperature', 'humidity', 'temp', 'hum', 'json', 'data', 'value', 'esphome', 'tasmota'}


def num(v):
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str) and re.fullmatch(r'\s*-?\d+(\.\d+)?\s*', v):
        return float(v)
    return None


def ok_val(k, v):
    return v is not None and (-40 <= v <= 150 if k == 'temperature' else 0 <= v <= 100)


def find_vals(d, depth=0):
    out = {}
    for k, v in d.items():
        kk = re.sub(r':\d+$', '', str(k)).lower()
        f = 'temperature' if kk in TK else 'humidity' if kk in HK else None
        if f and f not in out and ok_val(f, num(v)):
            out[f] = round(num(v), 1)
    if depth < 3 and len(out) < 2:
        for v in d.values():
            if isinstance(v, dict):
                for f, x in find_vals(v, depth + 1).items():
                    out.setdefault(f, x)
    return out


def skip_topic(t):
    return t.startswith('$') or t.endswith(('/config', '/set', '/get', '/availability', '/LWT', '/lwt')) or t.startswith('zigbee2mqtt/bridge') or '/bridge/' in t


def parse(topic, raw):
    """[(키, {온도 · 습도})] — 값이 없으면 빈 목록"""
    if skip_topic(topic) or len(raw) > MAX_BODY:
        return []
    s = raw.decode('utf-8', 'replace').strip()
    j = None
    if s[:1] in ('{', '['):
        try:
            j = json.loads(s)
        except ValueError:
            return []
    if isinstance(j, dict):
        v = find_vals(j)
        return [(topic, v)] if v else []
    x = num(s)
    if x is None:
        return []
    parts = topic.split('/')
    last = re.sub(r':\d+$', '', parts[-1]).lower()
    if last in TK + HK and len(parts) > 1:
        f = 'temperature' if last in TK else 'humidity'
        return [('/'.join(parts[:-1]), {f: round(x, 1)})] if ok_val(f, x) else []
    if last == 'state' and len(parts) > 1:   # HA statestream: homeassistant/sensor/<이름>/state
        prev = parts[-2].lower()
        f = 'temperature' if 'temp' in prev else 'humidity' if 'humid' in prev else None
        return [(topic, {f: round(x, 1)})] if f and ok_val(f, x) else []
    return []


def name_of(key):
    p = [x for x in key.split('/') if x and x.lower() not in STOP]
    return (' '.join(p[-2:]) or key)[:60]


# ── 사이트로 보내기 (변하면 보내기 + 최소 간격 + 정해진 주기, 사이트의 답을 따름 — Matter 중계와 같음)
class Pusher:
    def __init__(self, key, token, first):
        self.key, self.token = key, token
        self.values, self.sent = {}, {}
        self.last, self.next, self.pending = 0.0, time.monotonic() + first, None
        self.mode, self.delta, self.gap, self.interval = 'change', {'humidity': 1.0, 'temperature': 0.5}, 60, 10

    def update(self, vals):
        self.values.update(vals)
        if self.mode != 'change' or self.pending is not None:
            return
        if any(k in vals and (k not in self.sent or abs(vals[k] - self.sent[k]) >= d) for k, d in self.delta.items()):
            self.pending = time.monotonic() + max(2.0, self.gap - (time.monotonic() - self.last))

    def due(self):
        now = time.monotonic()
        return bool(self.values) and ((self.pending is not None and now >= self.pending) or now >= self.next)

    def apply(self, a):
        if not isinstance(a, dict):
            return
        if a.get('send_mode') in ('change', 'interval'):
            self.mode = a['send_mode']
        for k, src in (('humidity', 'change_hum'), ('temperature', 'change_temp')):
            try:
                v = float(a.get(src))
                if v > 0:
                    self.delta[k] = v
            except (TypeError, ValueError):
                pass
        try:
            self.gap = max(10, int(a.get('gap_sec', self.gap)))
        except (TypeError, ValueError):
            pass
        try:
            nm = int(a.get('next_min') or 0)
        except (TypeError, ValueError):
            nm = 0
        if nm >= 1 and nm != self.interval:
            self.interval = nm
            self.next = min(self.next, time.monotonic() + nm * 60)

    def soon(self):
        """1.17.0 곧 보낼 차례 (주기의 절반 안 · 2분 안) — 다른 센서를 보낼 때 같이 실어 한 번에"""
        return bool(self.values) and self.next - time.monotonic() <= min(self.interval * 30, 120)

    def take(self):
        self.pending = None
        self.last = time.monotonic()
        self.next = self.last + self.interval * 60
        self.sent.update(self.values)
        return dict(self.values)

    def took(self, st, j):
        """'ok' · 'unknown'(사이트에서 지운 기기) · 'fail'"""
        if st == 404 and isinstance(j, dict) and j.get('message') == 'unknown':
            return 'unknown'
        if st >= 400:
            log('%s: 사이트가 값을 받지 않았어요 (%s)' % (self.key, st))
            return 'fail'
        self.apply(j)
        log('%s: 보냄 온도 %s · 습도 %s' % (self.key, self.values.get('temperature', '-'), self.values.get('humidity', '-')))
        return 'ok'

    def push(self, o):
        body = self.take()
        try:
            st, j = site_req(o, 'POST', 'in/' + self.token, body)
        except (OSError, ValueError) as e:
            log('%s: 보내지 못했어요 — %s' % (self.key, e))
            return 'fail'
        return self.took(st, j)


BATCH = {'off': False}


def push_all(o, pushers):
    """1.17.0 📶 때가 된 센서(+ 곧 차례인 것)를 한 번에 — POST hub/{code}/in · 사이트가 모르면(옛 사이트 404) 예전처럼 하나씩
    돌려줌 {키: 'ok' | 'unknown' | 'fail'}"""
    due = [p for p in pushers.values() if p.due()]
    if not due:
        return {}
    if BATCH['off'] or len(pushers) == 1:
        return {p.key: p.push(o) for p in due}
    go = due + [p for p in pushers.values() if p not in due and p.soon()]
    go = go[:200]
    bodies = [(p, p.take()) for p in go]
    try:
        st, j = site_req(o, 'POST', 'hub/%s/in' % o['code'], {'items': [{'t': p.token, 'v': b} for p, b in bodies]})
    except (OSError, ValueError) as e:
        log('센서 %d개를 보내지 못했어요 — %s' % (len(go), e))
        return {p.key: 'fail' for p in go}
    if st in (404, 405) and not (isinstance(j, dict) and j.get('ok') is False):
        BATCH['off'] = True   # 묶음을 모르는 옛 사이트 — 이제부터 하나씩
        return {p.key: p.push(o) for p in go}
    items = j.get('items') if isinstance(j, dict) else None
    if st >= 400 or not isinstance(items, dict):
        log('사이트가 값을 받지 않았어요 (%s)' % st)
        return {p.key: 'fail' for p in go}
    out = {p.key: (p.took(200, items[p.token]) if items.get(p.token, {}).get('ok') else p.took(404, items.get(p.token) or {'message': 'fail'})) for p in go}
    log('센서 %d개를 한 번에 보냄' % sum(1 for v in out.values() if v == 'ok'))
    return out


def run_once(o):
    j = sync(o, [], 'start')
    cfg, rev = j['config'], j.get('rev')
    try:
        m = MQ(cfg)
    except (OSError, ValueError, PermissionError, ConnectionError) as e:
        try:
            sync(o, [], str(e)[:200])   # 사이트 화면에 까닭을 보임
        except (OSError, ValueError, PermissionError, ConnectionError):
            pass
        raise
    seen, fresh, pushers = {}, set(), {}

    def remap(j):
        mp = j.get('map') if isinstance(j.get('map'), dict) else {}
        for k in list(pushers):
            if mp.get(k) != pushers[k].token:
                pushers.pop(k)
        for k, tok in mp.items():
            if k not in pushers and isinstance(tok, str) and re.fullmatch(r'[a-f0-9]{32}', tok):
                pushers[k] = Pusher(k, tok, 3 + 2 * len(pushers))
                if k in seen:
                    pushers[k].update({f: seen[k][f] for f in ('temperature', 'humidity') if f in seen[k]})
        for p in pushers.values():
            p.apply(j.get('pace'))

    remap(j)
    nxt = time.monotonic() + 5
    log('브로커 %s:%s 에 붙음 · 받는 토픽 %d' % (cfg.get('host'), cfg.get('port'), len(pushers)))
    try:
        while True:
            p = m.recv(1)
            if p and p[0] == 3:
                topic, raw, pid = publish(p)
                if pid:
                    m.send(b'\x40\x02' + pid)
                for key, vals in parse(topic, raw):
                    if key not in seen and len(seen) >= MAX_SEEN:
                        continue
                    seen.setdefault(key, {}).update(vals)
                    fresh.add(key)
                    if key in pushers:
                        pushers[key].update(vals)
            elif p and p[0] == 9 and all(b == 0x80 for b in p[2][2:]):
                raise PermissionError('브로커가 토픽 구독을 거절했어요 — 이 계정의 읽기 권한(ACL)을 확인해 주세요.')
            if time.monotonic() >= nxt:
                nxt = time.monotonic() + SYNC_SEC
                j = sync(o, [{'key': k, 'name': name_of(k), **{f: seen[k][f] for f in ('temperature', 'humidity') if f in seen[k]}} for k in sorted(fresh)], 'ok')
                fresh.clear()
                if j.get('rev') != rev:
                    log('사이트에서 브로커 설정이 바뀌었어요 — 다시 붙어요')
                    return
                remap(j)
            for k, res in push_all(o, pushers).items():   # 1.17.0 📶 한 바퀴에 때가 된 것을 모아 한 번에
                if res == 'unknown':
                    pushers.pop(k, None)
    finally:
        m.close()


def run():
    wait = 5
    while True:
        o = load_cfg()
        try:
            run_once(o)
            wait = 5
        except Exception as e:   # noqa: BLE001 — 무엇이 잘못돼도 서비스는 멈추지 않고 다시
            log('⚠️ %s — %d초 뒤 다시' % (e, wait))
        time.sleep(wait)
        wait = min(wait * 2, 120)


# ── 명령
def scan(o, secs=15):
    """설치 때 · --scan: 사이트 설정으로 브로커에 붙어 secs 초 동안 온습도 토픽을 모아 보여 줌 (사이트에도 알림)"""
    j = sync(o, [], 'start')
    cfg = j['config']
    say('브로커 %s:%s%s 에 붙는 중…' % (cfg.get('host') or '?', cfg.get('port') or 1883, ' (TLS)' if cfg.get('tls') else ''))
    try:
        m = MQ(cfg)
    except (OSError, ValueError, PermissionError, ConnectionError) as e:
        try:
            sync(o, [], str(e)[:200])
        except (OSError, ValueError, PermissionError, ConnectionError):
            pass
        raise
    seen = {}
    try:
        until = time.monotonic() + secs
        while time.monotonic() < until:
            p = m.recv(max(0.1, until - time.monotonic()))
            if p and p[0] == 3:
                topic, raw, pid = publish(p)
                if pid:
                    m.send(b'\x40\x02' + pid)
                for key, vals in parse(topic, raw):
                    if key in seen or len(seen) < MAX_SEEN:
                        seen.setdefault(key, {}).update(vals)
    finally:
        m.close()
    mp = j.get('map') or {}
    say('🟢 브로커에 붙었어요 · %d초 동안 찾은 온습도 토픽 %d개' % (secs, len(seen)))
    for k in sorted(seen):
        v = seen[k]
        print('   %s 온도 %-7s 습도 %-6s %s  (%s)' % ('✅' if k in mp else '·', ('%s°C' % v['temperature']) if 'temperature' in v else '-', ('%s%%' % v['humidity']) if 'humidity' in v else '-', name_of(k), k))
    sync(o, [{'key': k, 'name': name_of(k), **v} for k, v in sorted(seen.items())], 'ok')
    return len(seen)


def setup(site, code):
    o = load_cfg()
    o['site'], o['code'] = site.rstrip('/'), code
    save_cfg(o)
    say('📨 MQTT 중계를 설치해요 — 집 안 MQTT 브로커의 온습도 값을 사이트 IoT 연결로 보내요.')
    try:
        n = scan(o)
        if not n:
            warn('아직 온습도 토픽이 안 보여요 — 센서가 값을 올리는 데 몇 분 걸릴 수 있어요 (중계는 계속 찾아요). 토픽 칸은 사이트 › MQTT › ⚙️ 브로커 설정에서.')
    except PermissionError as e:
        warn('⚠️ %s' % e)
        if 'code' in str(e).lower() or '연결 코드' in str(e):
            return 1
        warn('   사이트 IoT 연결 › MQTT › ⚙️ 브로커 설정을 고치면 중계가 30초 안에 다시 붙어요.')
    except (OSError, ValueError, ConnectionError) as e:
        warn('⚠️ %s' % e)
        warn('   사이트 IoT 연결 › MQTT › ⚙️ 브로커 설정(주소 · 포트 · 계정)을 고치면 중계가 30초 안에 다시 붙어요.')
    say('사이트 IoT 연결 › MQTT 의 「찾은 센서」에서 받을 것을 골라 주세요 — 고른 것만 기기로 들어가요.')
    return 0


def main(argv):
    if len(argv) > 1 and argv[1] == '--setup':
        return setup(argv[2] if len(argv) > 2 else '', argv[3] if len(argv) > 3 else '')
    if len(argv) > 1 and argv[1] == '--scan':
        try:
            scan(load_cfg(), 20)
        except (OSError, ValueError, PermissionError, ConnectionError) as e:
            warn('⚠️ %s' % e)
        return 0
    try:
        run()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
