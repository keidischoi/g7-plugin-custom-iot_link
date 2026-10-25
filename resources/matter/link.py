#!/usr/bin/env python3
# 3D SUEÑO IoT 연결 — 🧩 Matter 중계 (리눅스 · 맥 · 라즈베리파이 · 파이썬 기본 기능만 — 따로 깔 것 없음)
#  집 안 Matter 서버(python-matter-server · HA Matter Server 애드온)의 온습도 센서 값을 사이트 IoT 연결로 보냄
#  config.json 의 연결 코드로 센서마다 사이트 기기를 저절로 만들고(허브 API), 받는 주소 /in/{키} 로 보냄 — 보내는 규칙은 HA 통합 · 윈도우판(link.ps1)과 같음
#  돌기: python3 link.py        센서 넣기: python3 link.py --pair        넣은 센서 보기: python3 link.py --nodes
#  센서 빼기(1.13.0): python3 link.py --remove [노드 번호] [--site y|n]  — Matter 서버에서 빼고, 원하면 사이트 기기도 지움
#  설치(사이트의 한 줄이 대신 함): python3 link.py --setup <사이트> <연결 코드> [Matter 서버]
import base64, json, os, random, re, socket, ssl, struct, sys, time, urllib.error, urllib.parse, urllib.request, uuid

VER = '1.17.0'
DIR = os.path.dirname(os.path.abspath(__file__))
CFG = os.path.join(DIR, 'config.json')
LAST = os.path.join(DIR, 'last.txt')
TEMP, HUM = '1026/0', '1029/0'   # Temperature · Relative Humidity Measurement › MeasuredValue (0.01 단위)
for _s in (sys.stdout, sys.stderr):   # 한글 · 이모지를 못 쓰는 터미널(POSIX · ASCII 로캘)에서도 멈추지 않게 — 못 쓰는 글자는 ? 로
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


# ── 설정
def load_cfg():
    c = {}
    try:
        with open(CFG, encoding='utf-8-sig') as f:
            c = json.load(f) or {}
    except (OSError, ValueError):
        pass
    o = {'site': str(c.get('site') or ''), 'code': str(c.get('code') or ''), 'matter': str(c.get('matter') or ''),
         'server_id': str(c.get('server_id') or ''), 'server_name': str(c.get('server_name') or ''),
         'devices': {str(k): {'id': int(v.get('id') or 0), 'token': str(v.get('token') or '')} for k, v in (c.get('devices') or {}).items() if isinstance(v, dict)},
         'skip': [str(x) for x in (c.get('skip') or [])]}
    if not o['server_id']:
        o['server_id'] = 'matter' + uuid.uuid4().hex[:24]
    if not o['server_name']:
        o['server_name'] = '%s (%s)' % (socket.gethostname().split('.')[0][:40] or 'PC', 'Mac' if sys.platform == 'darwin' else 'Linux')
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


def matter_url(a):
    a = (a or '').strip() or 'localhost'
    if not re.match(r'^wss?://', a):
        a = 'ws://' + a
    host = a.split('://', 1)[1]
    if '/' not in host:
        a += ('' if ':' in host.rsplit(']', 1)[-1] else ':5580') + '/ws'
    return a


# ── 사이트
def site_req(o, method, path, body=None):
    url = o['site'].rstrip('/') + '/api/plugins/custom-iot_link/' + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method, headers={
        'Content-Type': 'application/json', 'Accept': 'application/json', 'User-Agent': '3ds-matter-py/' + VER,
        'X-G7-Via': 'matter', 'X-G7-Server': o['server_id'], 'X-G7-Server-Name': urllib.parse.quote(o['server_name'], safe='')})
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


# ── Matter 서버 WebSocket (RFC 6455 — 보내는 틀은 가림 · 받는 틀은 이어 붙임 · ping 에는 pong)
class WS:
    def __init__(self, url, timeout=10):
        u = urllib.parse.urlsplit(url)
        port = u.port or (443 if u.scheme == 'wss' else 80)
        s = socket.create_connection((u.hostname, port), timeout=timeout)
        if u.scheme == 'wss':
            s = ssl.create_default_context().wrap_socket(s, server_hostname=u.hostname)
        key = base64.b64encode(os.urandom(16)).decode()
        host = u.hostname if ':' not in (u.hostname or '') else '[%s]' % u.hostname
        s.sendall(('GET %s HTTP/1.1\r\nHost: %s:%d\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: %s\r\nSec-WebSocket-Version: 13\r\n\r\n'
                   % (u.path or '/', host, port, key)).encode())
        head = b''
        while b'\r\n\r\n' not in head:
            ch = s.recv(1024)
            if not ch:
                raise ConnectionError('Matter 서버가 연결을 받지 않았어요')
            head += ch
        line = head.split(b'\r\n', 1)[0]
        if b' 101 ' not in line + b' ':
            raise ConnectionError('Matter 서버가 아닌 것 같아요 (%s)' % line.decode('latin-1', 'replace'))
        self.s, self.buf, self.parts, self.last_ping = s, head.split(b'\r\n\r\n', 1)[1], b'', time.monotonic()

    def _read(self, n):
        while len(self.buf) < n:
            ch = self.s.recv(65536)
            if not ch:
                raise ConnectionError('Matter 서버 연결이 끊겼어요')
            self.buf += ch
        out, self.buf = self.buf[:n], self.buf[n:]
        return out

    def _frame(self, op, data):
        hdr = bytes([0x80 | op])
        n = len(data)
        hdr += bytes([0x80 | n]) if n < 126 else (bytes([0x80 | 126]) + struct.pack('>H', n) if n < 65536 else bytes([0x80 | 127]) + struct.pack('>Q', n))
        mask = os.urandom(4)
        self.s.sendall(hdr + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def send(self, obj):
        self._frame(1, json.dumps(obj).encode())

    def recv(self, wait):
        """메시지 하나 (wait 초 안에 안 오면 None) — 끊기면 ConnectionError"""
        if time.monotonic() - self.last_ping > 30:   # 오래 조용하면 ping (공유기 · 서버가 끊지 않게)
            self._frame(9, b'3ds')
            self.last_ping = time.monotonic()
        until = time.monotonic() + wait
        while True:
            if not self.buf:
                self.s.settimeout(max(0.05, until - time.monotonic()))
                try:
                    ch = self.s.recv(65536)
                except socket.timeout:
                    return None
                if not ch:
                    raise ConnectionError('Matter 서버 연결이 끊겼어요')
                self.buf += ch
            self.s.settimeout(30)
            b0, b1 = self._read(2)
            n = b1 & 0x7F
            if n == 126:
                n = struct.unpack('>H', self._read(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._read(8))[0]
            mask = self._read(4) if b1 & 0x80 else None
            data = self._read(n)
            if mask:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            op = b0 & 0x0F
            if op == 8:
                raise ConnectionError('Matter 서버가 연결을 닫았어요')
            if op == 9:
                self._frame(10, data)
                continue
            if op in (0, 1, 2):
                self.parts += data
                if b0 & 0x80:
                    txt, self.parts = self.parts, b''
                    try:
                        return json.loads(txt.decode('utf-8'))
                    except ValueError:
                        pass
            if time.monotonic() >= until and not self.buf:
                return None

    def close(self):
        try:
            self._frame(8, struct.pack('>H', 1000))
        except OSError:
            pass
        try:
            self.s.close()
        except OSError:
            pass


class Matter:
    def __init__(self, url):
        self.ws = WS(url)
        self.n = 0
        self.info = self.ws.recv(15) or {}
        if 'schema_version' not in self.info:
            self.ws.close()
            raise ConnectionError('Matter 서버가 아닌 것 같아요 (%s)' % url)

    def cmd(self, command, args=None, timeout=30, on_event=None):
        self.n += 1
        mid = 'py%d' % self.n
        msg = {'message_id': mid, 'command': command}
        if args is not None:
            msg['args'] = args
        self.ws.send(msg)
        until = time.monotonic() + timeout
        while time.monotonic() < until:
            x = self.ws.recv(max(0.2, until - time.monotonic()))
            if not isinstance(x, dict):
                continue
            if x.get('message_id') == mid:
                if 'error_code' in x:
                    raise RuntimeError('Matter 서버: %s %s' % (x.get('error_code'), x.get('details') or ''))
                return x.get('result')
            if on_event and 'event' in x:
                on_event(x)
        raise TimeoutError('Matter 서버가 %d초 안에 답하지 않았어요 (%s)' % (timeout, command))

    def close(self):
        self.ws.close()


# ── 노드 값
def read_values(attrs, ep=None):
    out = {}
    for name, suf in (('temperature', TEMP), ('humidity', HUM)):
        keys = sorted((k for k in attrs if k.endswith('/' + suf) and k.count('/') == 2), key=lambda k: int(k.split('/')[0]))
        if ep is not None:
            keys = [k for k in keys if k.split('/')[0] == str(ep)]
        for k in keys:
            v = attrs[k]
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                out[name] = round(v / 100, 1)
                break
    return out


def node_label(attrs):
    l = str(attrs.get('0/40/5') or '').strip()
    return l or ('%s %s' % (attrs.get('0/40/1') or '', attrs.get('0/40/3') or '')).strip()


def clean_code(c):
    c = (c or '').strip()
    if c.upper().startswith('MT:'):
        return c
    d = re.sub(r'[\s-]', '', c)
    return d if re.fullmatch(r'\d{11}|\d{21}', d) else None


# ── 사이트로 보내기 (변하면 보내기 + 최소 간격 + 정해진 주기, 사이트의 답을 따름)
class Pusher:
    def __init__(self, nid, dev, first):
        self.nid, self.dev = nid, dev
        self.values, self.avail, self.sent = {}, True, {}
        self.last, self.next, self.pending = 0.0, time.monotonic() + first, None
        self.mode, self.delta, self.gap, self.interval = 'change', {'humidity': 1.0, 'temperature': 0.5}, 60, 10

    def update(self, vals, avail):
        self.values, self.avail = vals, avail
        if self.mode != 'change' or self.pending is not None:
            return
        if any(k in vals and (k not in self.sent or abs(vals[k] - self.sent[k]) >= d) for k, d in self.delta.items()):
            self.pending = time.monotonic() + max(2.0, self.gap - (time.monotonic() - self.last))

    def due(self):
        now = time.monotonic()
        return (self.pending is not None and now >= self.pending) or now >= self.next

    def apply(self, a):
        if not isinstance(a, dict):
            return
        if a.get('mode') in ('change', 'interval'):
            self.mode = a['mode']
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

    def ready(self):
        return bool(self.values) and self.avail

    def soon(self):
        """1.17.0 곧 보낼 차례 (주기의 절반 안 · 2분 안) — 다른 센서를 보낼 때 같이 실어 한 번에"""
        return self.ready() and self.next - time.monotonic() <= min(self.interval * 30, 120)

    def take(self):
        self.pending = None
        self.last = time.monotonic()
        self.next = self.last + self.interval * 60
        self.sent.update(self.values)
        return dict(self.values)

    def push(self, o):
        """'ok' · 'unknown'(사이트에서 지운 기기) · 'fail'"""
        if not self.ready():
            self.pending = None
            return 'fail'
        body = self.take()
        try:
            st, j = site_req(o, 'POST', 'in/' + self.dev['token'], body)
        except (OSError, ValueError) as e:
            log('노드 %s: 보내지 못했어요 — %s' % (self.nid, e))
            return 'fail'
        return self.took(st, j)

    def took(self, st, j):
        if st == 404 and isinstance(j, dict) and j.get('message') == 'unknown':
            return 'unknown'
        if st >= 400:
            log('노드 %s: 사이트가 값을 받지 않았어요 (%s %s)' % (self.nid, st, (j or {}).get('message', '') if isinstance(j, dict) else ''))
            return 'fail'
        self.apply(j)
        log('노드 %s: 보냄 온도 %s · 습도 %s' % (self.nid, self.values.get('temperature', '-'), self.values.get('humidity', '-')))
        return 'ok'


BATCH = {'off': False}


def push_all(o, pushers):
    """1.17.0 📶 때가 된 센서(+ 곧 차례인 것)를 한 번에 — POST hub/{code}/in · 사이트가 모르면(옛 사이트 404) 예전처럼 하나씩
    돌려줌 {노드: 'ok' | 'unknown' | 'fail'}"""
    due = [p for p in pushers.values() if p.due()]
    if not due:
        return {}
    if BATCH['off'] or len(pushers) == 1 or not o.get('code'):
        return {p.nid: p.push(o) for p in due}
    out = {p.nid: p.push(o) for p in due if not p.ready()}   # 값이 없거나 노드가 꺼짐 — 'fail' (보낼 것 없음)
    go = [p for p in due if p.ready()] + [p for p in pushers.values() if p not in due and p.soon()]
    go = go[:200]
    if not go:
        return out
    bodies = [(p, p.take()) for p in go]
    try:
        st, j = site_req(o, 'POST', 'hub/%s/in' % o['code'], {'items': [{'t': p.dev['token'], 'v': b} for p, b in bodies]})
    except (OSError, ValueError) as e:
        log('센서 %d개를 보내지 못했어요 — %s' % (len(go), e))
        return dict(out, **{p.nid: 'fail' for p in go})
    if st in (404, 405) and not (isinstance(j, dict) and j.get('ok') is False):
        BATCH['off'] = True   # 묶음을 모르는 옛 사이트 — 이제부터 하나씩
        return dict(out, **{p.nid: p.push(o) for p in go})
    items = j.get('items') if isinstance(j, dict) else None
    if st >= 400 or not isinstance(items, dict):
        log('사이트가 값을 받지 않았어요 (%s)' % st)
        return dict(out, **{p.nid: 'fail' for p in go})
    for p in go:
        a = items.get(p.dev['token'])
        out[p.nid] = p.took(200, a) if isinstance(a, dict) and a.get('ok') else p.took(404, a if isinstance(a, dict) else {'message': 'fail'})
    log('센서 %d개를 한 번에 보냄' % sum(1 for p in go if out[p.nid] == 'ok'))
    return out


def ensure_device(o, nid, attrs):
    if nid in o['devices']:
        return o['devices'][nid]
    if nid in o['skip'] or not o['code']:
        return None
    name = (node_label(attrs) or 'Matter 센서 %s' % nid)[:60]
    st, j = site_req(o, 'POST', 'hub/%s/devices' % o['code'], {'name': name, 'target': 'other'})
    d = (j or {}).get('device') if isinstance(j, dict) else None
    if st >= 400 or not d:
        log('노드 %s (%s): 사이트 기기를 만들지 못했어요 — %s' % (nid, name, (j or {}).get('message', st) if isinstance(j, dict) else st))
        return None
    o['devices'][nid] = {'id': int(d.get('id') or 0), 'token': str(d.get('token') or '')}
    save_cfg(o)
    log('노드 %s (%s): 사이트 기기를 만들었어요 (📡 대기 칸)' % (nid, name))
    return o['devices'][nid]


def run_once(o):
    m = Matter(matter_url(o['matter']))
    nodes, pushers = {}, {}

    def feed(nid):
        n = nodes.get(nid)
        if not n:
            return
        vals = read_values(n['attrs'])
        if not vals:
            return
        if nid not in pushers:
            try:
                dev = ensure_device(o, nid, n['attrs'])
            except (OSError, ValueError) as e:
                log('노드 %s: 사이트에 닿지 않아요 — %s' % (nid, e))
                return
            if not dev:
                return
            pushers[nid] = Pusher(nid, dev, 5 + 3 * len(pushers))
        pushers[nid].update(vals, n['avail'])

    def set_node(nd):
        nid = str(nd.get('node_id'))
        nodes[nid] = {'attrs': dict(nd.get('attributes') or {}), 'avail': bool(nd.get('available', True))}
        feed(nid)

    def on_event(x):
        ev, data = x.get('event'), x.get('data')
        if ev in ('node_added', 'node_updated') and isinstance(data, dict):
            set_node(data)
        elif ev == 'node_removed':
            nodes.pop(str(data), None)
            pushers.pop(str(data), None)
        elif ev == 'attribute_updated' and isinstance(data, list) and len(data) == 3:
            nid = str(data[0])
            if nid in nodes:
                nodes[nid]['attrs'][str(data[1])] = data[2]
                if str(data[1]).endswith(('/' + TEMP, '/' + HUM)):
                    feed(nid)

    try:
        for nd in m.cmd('start_listening', None, 60, on_event) or []:
            set_node(nd)
        log('Matter 서버에 붙음 (SDK %s) · 노드 %d · 보내는 센서 %d' % (m.info.get('sdk_version', '?'), len(nodes), len(pushers)))
        while True:
            x = m.ws.recv(1)
            if isinstance(x, dict) and 'event' in x:
                on_event(x)
            for nid, res in push_all(o, pushers).items():   # 1.17.0 📶 한 바퀴에 때가 된 것을 모아 한 번에
                if res == 'unknown':   # 사이트에서 지운 기기 — 다시 만들지 않음 (다시 보내려면 config.json 의 skip 에서 빼기)
                    log('노드 %s: 사이트에서 지운 기기예요 — 이제 안 보내요' % nid)
                    o['devices'].pop(nid, None)
                    o['skip'].append(nid)
                    save_cfg(o)
                    pushers.pop(nid, None)
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
def show_nodes(o):
    m = Matter(matter_url(o['matter']))
    try:
        lst = m.cmd('get_nodes') or []
        say('Matter 서버: %s (SDK %s) · 노드 %d' % (matter_url(o['matter']), m.info.get('sdk_version', '?'), len(lst)))
        for nd in sorted(lst, key=lambda x: x.get('node_id', 0)):
            a = nd.get('attributes') or {}
            v, nid = read_values(a), str(nd.get('node_id'))
            st = ('→ 사이트 기기 #%s' % o['devices'][nid]['id']) if nid in o['devices'] else '(안 보냄)' if nid in o['skip'] else '(켜면 사이트 기기를 만듦)' if v else '(온습도 없음)'
            print('   노드 %-3s %s 온도 %-7s 습도 %-6s %s %s' % (nid, '🟢' if nd.get('available') else '⚪', ('%s°C' % v['temperature']) if 'temperature' in v else '-',
                                                          ('%s%%' % v['humidity']) if 'humidity' in v else '-', node_label(a), st))
        return len(lst)
    finally:
        m.close()


def ask(prompt):
    try:
        with open('/dev/tty') as tty:   # curl … | bash 에서도 키보드로 받게
            sys.stdout.write(prompt)
            sys.stdout.flush()
            return tty.readline().strip()
    except OSError:
        try:
            return input(prompt).strip()
        except EOFError:
            return ''


def do_pair(o, code=''):
    if not code:
        say('애플 홈(센서 › ⚙️ › 페어링 모드 켜기) · 구글 홈(연결된 Matter 앱 및 서비스) · SmartThings(다른 서비스와 공유)에서 받은 코드를 넣어 주세요.')
        code = ask('공유 코드 (Enter = 그만): ')
        if not code:
            return False
    c = clean_code(code)
    if not c:
        warn('코드 모양이 아니에요 (11 · 21자리 숫자 또는 MT: 로 시작).')
        return False
    say('센서를 넣는 중… (1~2분)')
    m = Matter(matter_url(o['matter']))
    try:
        nd = m.cmd('commission_with_code', {'code': c, 'network_only': True}, 300) or {}
        a = nd.get('attributes') or {}
        v = read_values(a)
        say('✅ 넣었어요: 노드 %s · %s · 온도 %s · 습도 %s' % (nd.get('node_id'), node_label(a), v.get('temperature', '-'), v.get('humidity', '-')))
        if not v:
            warn('⚠️ 이 기기에서 온도 · 습도를 찾지 못했어요 (온습도 센서가 맞는지).')
        return True
    except (RuntimeError, TimeoutError, OSError, ConnectionError) as e:
        warn('넣지 못했어요: %s — 코드가 만료되지 않았는지 · Thread 센서면 경계 라우터를 확인해 주세요.' % e)
        return False
    finally:
        m.close()


def setup(site, code, matter):
    """설치 한 줄이 부름 — Matter 서버에 붙는지 보고 · 센서 넣기 (코드는 회원이 직접)"""
    o = load_cfg()
    o['site'], o['code'] = site.rstrip('/'), code
    if matter:
        o['matter'] = matter
    say('🧩 Matter 중계를 설치해요 — 집 안 Matter 서버의 온습도 센서를 사이트 IoT 연결로 보내요.')
    while True:
        if not o['matter']:
            o['matter'] = ask('Matter 서버 주소 (예: 192.168.0.10 — HA 의 Matter Server 애드온이면 HA 의 IP): ')
            if not o['matter']:
                warn('그만둘게요 — 같은 줄을 다시 실행하면 처음부터예요.')
                return 1
        try:
            show_nodes(o)
            break
        except (OSError, ConnectionError, RuntimeError, TimeoutError) as e:
            warn('⚠️ %s' % e)
            warn('   주소 · 포트(5580)가 맞는지, 그 기기가 켜져 있는지 봐 주세요. HA 의 Matter Server 애드온이면 애드온 › 구성 › 네트워크에서 5580 을 열어야 해요.')
            o['matter'] = ask('다시 적기 (Enter = 그만): ')
            if not o['matter']:
                return 1
    save_cfg(o)
    say('센서를 더 넣으려면 애플 홈 · 구글 홈 · SmartThings 에서 공유 코드를 받아 적어 주세요.')
    while True:
        c = ask('공유 코드 (Enter = 넘어가기): ')
        if not c:
            break
        do_pair(o, c)
    return 0


def do_remove(o, nid='', site=''):
    """1.13.0 센서 빼기 — Matter 서버에서 노드를 빼고 (애플 홈 · 구글 홈에는 그대로), 사이트 기기는 물어보고 지움 (site = y · n 이면 묻지 않음)"""
    if not nid:
        if show_nodes(o) == 0:
            return False
        nid = ask('뺄 노드 번호 (Enter = 그만): ')
        if not nid:
            return False
    if not str(nid).isdigit():
        warn('노드 번호는 숫자예요 (--nodes 로 보기).')
        return False
    m = Matter(matter_url(o['matter']))
    try:
        m.cmd('remove_node', {'node_id': int(nid)}, 60)
    except (RuntimeError, TimeoutError, OSError, ConnectionError) as e:
        warn('빼지 못했어요: %s' % e)
        return False
    finally:
        m.close()
    say('✅ 노드 %s 을(를) Matter 서버에서 뺐어요 (애플 홈 · 구글 홈에는 그대로).' % nid)
    nid = str(nid)
    dev = o['devices'].get(nid)
    if dev and o['code']:
        if not site:
            site = ask('사이트 기기 #%s 도 지울까요? 기록도 같이 지워져요 (y = 지우기 · Enter = 남기기): ' % dev['id'])
        if site.strip().lower() in ('y', 'yes', 'ㅛ', '예', '네'):
            try:
                st, j = site_req(o, 'DELETE', 'hub/%s/devices/%d' % (o['code'], dev['id']))
                if st < 400:
                    say('사이트 기기 #%s 를 지웠어요.' % dev['id'])
                else:
                    warn('사이트 기기를 못 지웠어요 (%s) — 사이트 IoT 연결에서 지워 주세요.' % ((j or {}).get('message', st) if isinstance(j, dict) else st))
            except (OSError, ValueError):
                warn('사이트에 닿지 않아요 — 사이트 IoT 연결에서 지워 주세요.')
        else:
            say('사이트 기기 #%s 와 기록은 남겨 둬요 (「끊김」으로 보여요).' % dev['id'])
    o['devices'].pop(nid, None)
    o['skip'] = [x for x in o['skip'] if x != nid]
    save_cfg(o)
    return True


def main(argv):
    if len(argv) > 1 and argv[1] == '--setup':
        return setup(argv[2] if len(argv) > 2 else '', argv[3] if len(argv) > 3 else '', argv[4] if len(argv) > 4 else '')
    if len(argv) > 1 and argv[1] == '--remove':
        rest = argv[2:]
        site = ''
        if '--site' in rest:
            i = rest.index('--site')
            site = rest[i + 1] if i + 1 < len(rest) else ''
            rest = rest[:i] + rest[i + 2:]
        try:
            do_remove(load_cfg(), rest[0] if rest else '', site)
        except (OSError, ConnectionError, RuntimeError, TimeoutError) as e:
            warn('⚠️ %s' % e)
        return 0
    if len(argv) > 1 and argv[1] in ('--pair', '--nodes'):
        o = load_cfg()
        try:
            do_pair(o) if argv[1] == '--pair' else show_nodes(o)
        except (OSError, ConnectionError, RuntimeError, TimeoutError) as e:
            warn('⚠️ %s' % e)
        return 0
    try:
        run()
    except KeyboardInterrupt:
        pass
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv))
