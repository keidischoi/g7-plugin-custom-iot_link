/*! custom-iot_link 1.0.0 — 📡 IoT 연결 (Home Assistant · SmartThings 온습도 · 기기 상태 받기) 화면 · 관리자 */
(function () {
  'use strict';
  if (window.__halApp) { window.__halApp.tick(); return; }
  var API = '/api/plugins/custom-iot_link', BASE = '/iot-link', V = '1.0.0';
  var S = { root: null, key: '', d: null };

  // ── 공통 ──
  function token() {
    var t = '';
    try { if (window.G7Core && G7Core.api && typeof G7Core.api.getToken === 'function') t = G7Core.api.getToken() || ''; } catch (e) {}
    if (!t) { try { t = localStorage.getItem('auth_token') || ''; } catch (e2) {} }
    return (!t || t === 'undefined' || t === 'null') ? '' : t;
  }
  function api(method, path, body) {
    var h = { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' }, t = token(); if (t) h.Authorization = 'Bearer ' + t;
    var m = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/); if (m) h['X-XSRF-TOKEN'] = decodeURIComponent(m[1]);
    if (body) h['Content-Type'] = 'application/json';
    return fetch(API + path, { method: method, credentials: 'same-origin', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.success === false) { var e = new Error(d.message || (r.status === 401 ? '로그인이 필요해요.' : '요청에 실패했어요.')); e.status = r.status; throw e; } return d; });
    });
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { return Number(v || 0).toLocaleString(); }
  function toast(msg, bad) {
    try { if (window.G7Core && G7Core.toast) { G7Core.toast[bad ? 'error' : 'success'](msg); return; } } catch (e) {}
    var t = document.createElement('div'); t.className = 'hal-toast' + (bad ? ' bad' : ''); t.textContent = msg; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 2600);
  }
  function go(url) { try { if (window.G7Core && typeof G7Core.dispatch === 'function') { G7Core.dispatch({ handler: 'navigate', params: { path: url } }); return; } } catch (e) {} location.href = url; }
  function q(sel) { return S.root.querySelector(sel); }
  function qa(sel) { return Array.prototype.slice.call(S.root.querySelectorAll(sel)); }
  function wrap(html) { S.root.innerHTML = '<div class="hal">' + html + '</div>'; }
  function fail(e) { toast(e.message, true); }
  function find(id) { return S.d.devices.filter(function (x) { return x.id === +id; })[0]; }
  /** 마지막 소식이 얼마나 전인지 */
  function agoText(seen) {
    if (!seen) return '아직 받은 값이 없어요';
    var m = Math.max(0, Math.round((new Date(S.d.now.replace(' ', 'T')) - new Date(seen.replace(' ', 'T'))) / 60000));
    return m < 2 ? '방금' : m < 60 ? m + '분 전' : m < 1440 ? Math.round(m / 60) + '시간 전' : Math.round(m / 1440) + '일 전';
  }
  var ICON = { location: '🧵', printer: '🖨️', equipment: '🏢', other: '📦' };

  /* 📷 카메라 사진 — 주인만 보는 주소라 로그인 정보와 함께 받아 와서 보임. 같은 사진은 다시 받지 않음 */
  var SNAP = {};
  function snapLoad(b) {
    var id = b.getAttribute('data-snap'), at = b.getAttribute('data-at'), c = SNAP[id], show = function (u) { b.style.backgroundImage = 'url(' + u + ')'; };
    if (c && c.url) show(c.url);   // 새 사진을 받는 동안에는 예전 것
    if (c && c.at === at) return;
    var h = {}, t = token(); if (t) h.Authorization = 'Bearer ' + t;
    SNAP[id] = { at: at, url: c && c.url };
    fetch(API + '/devices/' + id + '/snap', { credentials: 'same-origin', headers: h }).then(function (r) { return r.ok ? r.blob() : null; }).then(function (bl) {
      if (!bl) return; var old = SNAP[id].url, u = URL.createObjectURL(bl); SNAP[id].url = u; var el = S.root && S.root.querySelector('[data-snap="' + id + '"]'); if (el) el.style.backgroundImage = 'url(' + u + ')'; if (old) setTimeout(function () { URL.revokeObjectURL(old); }, 2000);
    }).catch(function () {});
  }

  // ── 그리기 ──
  /** 이틀 그래프 — 습도(채움) · 온도(선) · 습도 기준(점선). 값이 2개 넘게 있어야 그림 */
  function spark(d) {
    var h = d.history, W = 240, H = 46, hs = h.filter(function (p) { return p[2] != null; }), ts = h.filter(function (p) { return p[1] != null; });
    if (hs.length < 2 && ts.length < 2) return '';
    var x = function (i) { return (i / Math.max(1, h.length - 1) * W).toFixed(1); };
    var line = function (idx, lo, hi) { var out = []; h.forEach(function (p, i) { if (p[idx] != null) out.push((out.length ? 'L' : 'M') + x(i) + ' ' + (H - 3 - (Math.max(lo, Math.min(hi, p[idx])) - lo) / Math.max(1, hi - lo) * (H - 6)).toFixed(1)); }); return out.join(' '); };
    var tv = ts.map(function (p) { return p[1]; }), tlo = Math.min.apply(null, tv) - 2, thi = Math.max.apply(null, tv) + 2, hp = hs.length > 1 ? line(2, 0, 100) : '';
    var my = d.humidity_max != null ? (H - 3 - d.humidity_max / 100 * (H - 6)).toFixed(1) : null;
    return '<svg class="hal-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' +
      (hp ? '<path class="f" d="' + hp + ' L' + W + ' ' + H + ' L0 ' + H + ' Z"/><path class="h" d="' + hp + '"/>' : '') + (ts.length > 1 ? '<path class="t" d="' + line(1, tlo, thi) + '"/>' : '') +
      (my != null && hp ? '<line class="m" x1="0" x2="' + W + '" y1="' + my + '" y2="' + my + '"/>' : '') + '</svg>';
  }
  /* 0.2.0 SmartThings — 기기에 이은 센서 값 (온습도 · 상태 밖의 것도) */
  function sensList(list, max) {
    if (!list || !list.length) return '';
    var more = list.length > max ? '<li class="more">… 그 밖에 ' + (list.length - max) + '개</li>' : '';
    return '<ul class="hal-sens">' + list.slice(0, max).map(function (x) { return '<li><span><b>' + esc(x.what) + '</b><small>' + esc(x.label) + '</small></span><em>' + esc(x.value) + '</em><time>' + esc(x.at ? agoText(x.at) : '–') + '</time></li>'; }).join('') + more + '</ul>';
  }
  function card(d) {
    var st = d.source === 'smartthings', hasHum = d.entities.hum || (st && d.humidity != null), hasTemp = d.entities.temp || (st && d.temp != null);
    var hasEnv = hasTemp || hasHum, hasState = !!d.entities.state || (st && !!d.state);
    var stt = d.never ? '<span class="hal-dot wait"></span>값을 기다리는 중' : d.stale ? '<span class="hal-dot off"></span>끊김 · ' + agoText(d.seen) : '<span class="hal-dot on"></span>' + agoText(d.seen);
    return '<article class="hal-card' + (d.over ? ' over' : '') + (d.stale && !d.never ? ' stale' : '') + '">' +
      '<header><span class="hal-ico">' + ICON[d.target] + '</span><div><b>' + esc(d.name) + '</b><small>' + (st || (d.sensors && d.sensors.length) ? '<span class="hal-badge">📡 SmartThings</span> ' : '') + esc(S.d.targets[d.target]) + (d.where && d.where !== d.name ? ' · ' + esc(d.where) : '') + '</small></div><button class="hal-icobtn" data-edit="' + d.id + '" title="고치기" aria-label="고치기">✏️</button></header>' +
      '<div class="hal-vals">' +
        (hasHum ? '<div class="' + (d.humidity_max != null && d.humidity != null && d.humidity > d.humidity_max ? 'hot' : '') + '"><i>💧</i><b>' + (d.humidity == null ? '–' : d.humidity) + '</b><u>%</u>' + (d.humidity_max != null ? '<small>기준 ' + d.humidity_max + '%</small>' : '') + '</div>' : '') +
        (hasTemp ? '<div class="' + (d.temp_max != null && d.temp != null && d.temp > d.temp_max ? 'hot' : '') + '"><i>🌡️</i><b>' + (d.temp == null ? '–' : d.temp) + '</b><u>°C</u>' + (d.temp_max != null ? '<small>기준 ' + d.temp_max + '°C</small>' : '') + '</div>' : '') +
        (hasState ? '<div class="st' + (d.is_on ? ' run' : '') + '"><i>' + (d.is_on ? '⚙️' : '⏸') + '</i><b>' + (d.is_on ? '가동 중' : '쉬는 중') + '</b><small>' + (d.state ? esc(d.state) + ' · ' : '') + '30일 ' + d.hours_30d + '시간</small></div>' : '') +
      '</div>' + (d.snap_at ? '<button type="button" class="hal-snap" data-snap="' + d.id + '" data-at="' + esc(d.snap_at) + '" title="크게 보기"><span>📷 ' + esc(agoText(d.snap_at)) + ' · ' + (d.snap_public ? '🌐 공개' : '🔒 나만') + '</span></button>' : '') + (hasEnv ? spark(d) : '') + sensList(d.sensors, 6) +
      (d.over ? '<p class="hal-warn">⚠️ 기준을 넘었어요' + (d.target === 'location' ? ' — 여기 둔 필라멘트 건조를 챙겨 주세요' : '') + '</p>' : '') +
      '<footer><span class="hal-st">' + stt + '</span>' + (st ? '<small class="hal-hint">SmartThings 앱에서 센서를 바꿔요</small>' : '<button class="hal-btn sm" data-yaml="' + d.id + '">📋 설정 글</button>') + '</footer></article>';
  }
  function draw() {
    var d = S.d, live = d.devices.filter(function (x) { return !x.stale; }).length, over = d.devices.filter(function (x) { return x.over; }).length;
    wrap('<section class="hal-hero"><div><h1>📡 IoT 연결</h1><p>Home Assistant · SmartThings 의 온습도 센서 · 프린터 · 장비 상태를 받아 정비 수첩과 내 프린터에 이어요.</p></div>' +
      '<div class="hal-stats"><span>기기 <b>' + d.devices.length + '</b></span><span>🟢 연결됨 <b>' + live + '</b></span>' + (over ? '<span class="hot">⚠️ 기준 넘음 <b>' + over + '</b></span>' : '') + '<button class="hal-btn ghost" data-guide title="연결 방법 보기" aria-label="연결 방법 보기">❓ 연결 방법</button><button class="hal-btn light" data-new>➕ 기기 연결</button></div></section>' +
      stCard() +
      (d.devices.length ? '<div class="hal-grid">' + d.devices.map(card).join('') + '</div>' +
        '<p class="hal-note">' + (liveSec() ? '🔄 이 화면은 ' + (liveSec() >= 60 && liveSec() % 60 === 0 ? liveSec() / 60 + '분' : liveSec() + '초') + '마다 스스로 새 값을 받아 와요' : '🔄 새 값을 보려면 화면을 새로 고쳐 주세요') + ' (Home Assistant 는 ' + (d.config.send_mode === 'change' ? '값이 변하면' : (d.config.interval_min || 10) + '분마다') + ' · 상태가 바뀌면 바로 보내요).</p><p class="hal-note">🔒 받는 주소는 비밀번호와 같아요 — 남에게 보이지 마세요. 사이트가 내 집으로 접속하지 않고, 내 Home Assistant 가 보내는 값만 받아요.' + (d.config.maintenance ? ' · <a href="/maintenance?tab=drawer" data-go>🧵 필라멘트 서랍 보기</a>' : '') + '</p>'
        : '<section class="hal-start"><h2>세 걸음이면 돼요</h2><ol><li><b>① HACS 에서 「3ds」 설치</b><span>단추 한 번으로 저장소가 들어가요</span></li><li><b>② 사이트 주소 · 연결 코드 붙여 넣기</b><span>복사 단추 두 번</span></li><li><b>③ 「⚡ 알아서 찾아 연결」 → 확인</b><span>내 프린터 · 필라멘트 보관 위치와 이름이 맞는 것을 찾아 줘요</span></li></ol><div class="hal-row center"><button class="hal-btn pri big" data-new>➕ 첫 기기 연결하기</button><button class="hal-btn big" data-guide>❓ 그림으로 보는 연결 방법</button></div></section>'));
    qa('[data-guide]').forEach(function (b) { b.onclick = function () { guideBox(); }; });
    stBind();
    qa('[data-snap]').forEach(function (b) { snapLoad(b); b.onclick = function () { var u = SNAP[b.getAttribute('data-snap')]; if (u && u.url) modal('📷 ' + esc(find(b.getAttribute('data-snap')).name), '<img class="hal-snapbig" src="' + u.url + '" alt="">'); }; });
    qa('[data-new]').forEach(function (b) { b.onclick = function () { connectBox(); }; });
    qa('[data-edit]').forEach(function (b) { b.onclick = function () { form(find(b.getAttribute('data-edit'))); }; });
    qa('[data-yaml]').forEach(function (b) { b.onclick = function () { yamlBox(find(b.getAttribute('data-yaml'))); }; });
  }

  /* ── 0.2.0 📡 SmartThings 카드 — 연결 상태 · 이은 센서 · 연결 코드 · 끊기 ── */
  var ST_STATUS = { active: ['on', '연결됨'], syncing: ['wait', '센서 맞추는 중'], unlinked: ['off', '회원과 안 이어짐'], error: ['bad', '확인이 필요해요'] };
  function minsLeft(at) { return Math.max(0, Math.ceil((new Date(at.replace(' ', 'T')) - new Date(S.d.now.replace(' ', 'T'))) / 60000)); }
  function stCard() {
    var T = S.d.smartthings; if (!T) return '';
    var ins = T.installs || [], live = ins.filter(function (x) { return x.status === 'active'; }).length, bad = ins.filter(function (x) { return x.status === 'error' || x.last_error; }).length;
    var pill = ins.length ? (bad ? '<span class="hal-pill bad">⚠️ 확인 필요</span>' : live ? '<span class="hal-pill on">🟢 연결됨 ' + live + '</span>' : '<span class="hal-pill wait">⏳ 맞추는 중</span>') : '<span class="hal-pill">⚪ 연결 안 됨</span>';
    var head = '<header class="hal-stc-h"><span class="hal-stc-logo" aria-hidden="true">📡</span><div><h2>SmartThings</h2><p>삼성 SmartThings 의 온습도 · 문 · 움직임 · 플러그 센서를 고르면 값이 바뀔 때마다 바로 들어와요.</p></div>' + pill + '</header>';
    if (!T.ready && !ins.length) return '<section class="hal-stc off">' + head + '<p class="hal-hint">관리자가 아직 SmartThings 연결을 켜지 않았어요.</p></section>';
    var opts = '<option value="">➕ 새 기기 만들기 (「SmartThings」)</option>' + S.d.devices.map(function (x) { return '<option value="' + x.id + '">' + ICON[x.target] + ' ' + esc(x.name) + '</option>'; }).join('');
    var code = T.code ? '<div class="hal-stc-code"><div><small>연결 코드 · ' + minsLeft(T.code.expires_at) + '분 남음 · 한 번만</small><b data-st-code-v>' + esc(T.code.code) + '</b><small>붙일 기기: ' + esc(T.code.device_id ? ((find(T.code.device_id) || {}).name || '–') : '새 기기 「SmartThings」') + '</small></div><div class="hal-row"><button type="button" class="hal-btn pri" data-st-copy>📋 복사</button><button type="button" class="hal-btn" data-st-new>🔄 새로</button></div></div>'
      : '<div class="hal-stc-code empty"><label>값을 넘길 기기<select data-st-dev-new>' + opts + '</select></label><button type="button" class="hal-btn pri" data-st-new' + (T.ready ? '' : ' disabled') + '>🔑 연결 코드 만들기</button></div>';
    var list = ins.map(function (x) {
      var s = ST_STATUS[x.status] || ['', x.status];
      var sel = '<select data-st-relink="' + x.id + '" aria-label="값을 넘길 기기">' + (x.device_id ? '' : '<option value="">— 기기 고르기 —</option>') + S.d.devices.map(function (d) { return '<option value="' + d.id + '"' + (d.id === x.device_id ? ' selected' : '') + '>' + ICON[d.target] + ' ' + esc(d.name) + '</option>'; }).join('') + '</select>';
      return '<article class="hal-stc-i"><div class="hal-stc-ih"><div><b>📍 ' + esc(x.location || 'SmartThings 위치') + '</b><small><span class="hal-dot ' + s[0] + '"></span>' + s[1] + ' · 마지막 값 ' + esc(x.last_event_at ? agoText(x.last_event_at) : '아직 없음') + '</small></div><div class="hal-stc-to">→ ' + sel + '</div><button type="button" class="hal-btn sm danger" data-st-del="' + x.id + '">연결 끊기</button></div>' +
        (x.last_error ? '<p class="hal-warn">' + esc(x.last_error) + '</p>' : '') + (x.sensors.length ? sensList(x.sensors, 40) : '<p class="hal-hint">센서 값을 기다리는 중이에요. SmartThings 앱에서 센서를 골랐는지 확인해 주세요.</p>') + '</article>';
    }).join('');
    var how = '<details class="hal-stc-how"' + (ins.length ? '' : ' open') + '><summary>❓ SmartThings 앱에서 연결하는 방법</summary><ol>' +
      '<li><b>위에서 「🔑 연결 코드 만들기」</b> — 값을 넘길 기기(필라멘트 보관함 등)를 먼저 고르면 그 기기로 들어가요.</li>' +
      '<li>SmartThings 앱 → <b>자동화</b> 탭 → <b>＋</b> → <b>루틴 추가</b> → 아래 <b>발견</b>에서 이 사이트의 앱을 눌러요.</li>' +
      '<li><b>연결 코드</b> 칸에 8글자를 적고 <b>다음</b> (대소문자 · 줄표는 상관없어요).</li>' +
      '<li>온도 · 습도 · 전원 플러그 · 문 · 움직임 센서 등을 골라 <b>완료</b> → <b>허용</b>.</li>' +
      '<li>잠시 뒤 이 카드에 🟢 와 센서 값이 나와요. 센서를 바꾸려면 SmartThings 앱에서 그 앱을 열어 고치면 돼요 (코드는 다시 안 적어도 돼요).</li></ol>' +
      '<p class="hal-hint">🔒 사이트는 고른 센서의 값만 읽어요 (기기를 켜고 끄지 않아요). 연결 코드는 30분 안에 한 번만 쓸 수 있어요.</p></details>';
    return '<section class="hal-stc">' + head + code + (list ? '<div class="hal-stc-list">' + list + '</div>' : '') + how + '</section>';
  }
  function stBind() {
    var root = q('.hal-stc'); if (!root) return;
    root.onclick = function (ev) {
      var t = ev.target;
      if (t.closest('[data-st-copy]')) { copy(String(S.d.smartthings.code.code), t.closest('[data-st-copy]')); return; }
      if (t.closest('[data-st-new]')) { var sel = root.querySelector('[data-st-dev-new]'), dev = sel ? sel.value : (S.d.smartthings.code && S.d.smartthings.code.device_id) || ''; api('POST', '/smartthings/code', { device_id: dev ? +dev : null }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail); return; }
      var del = t.closest('[data-st-del]'); if (del && confirm('SmartThings 연결을 끊을까요? 사이트 기기와 기록은 남아요. (SmartThings 앱의 그 앱도 지워져요)')) api('DELETE', '/smartthings/installs/' + del.getAttribute('data-st-del')).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail);
    };
    root.onchange = function (ev) {
      var s = ev.target.closest('[data-st-relink]'); if (!s || !s.value) return;
      api('PUT', '/smartthings/installs/' + s.getAttribute('data-st-relink'), { device_id: +s.value }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail);
    };
  }

  function copy(txt, btn) {
    var label = btn.textContent, done = function () { btn.textContent = '✔ 복사했어요'; setTimeout(function () { btn.textContent = label; }, 1600); };
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사하지 못했어요 — 글을 직접 골라 복사해 주세요.', true); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  }
  /* 0.1.8 ❓ 연결 방법 — 한 걸음씩, 화면 그림에 누를 곳을 빨갛게.
   *   그림은 사진이 아니라 화면을 본떠 그린 것 (가볍고 · 다크 테마에도 맞고 · 화면이 조금 바뀌어도 뜻이 통하게). 실제 Home Assistant 화면은 버전에 따라 조금 다를 수 있음 */
  function shot(bar, html, kind) { return '<div class="hal-shot' + (kind ? ' ' + kind : '') + '" aria-hidden="true"><div class="hal-shot-bar"><i></i><i></i><i></i><span>' + bar + '</span></div><div class="hal-shot-b">' + html + '</div></div>'; }
  function hl(html, n) { return '<span class="hal-hl">' + html + (n ? '<b class="hal-hl-n">' + n + '</b>' : '') + '</span>'; }
  function guideBox() {
    var L = S.d.link, code = String(L.code || '').slice(0, 6) + '…', btn = function (t, cls) { return '<span class="hal-fake-btn ' + (cls || '') + '">' + t + '</span>'; }, row = function (a, b) { return '<div class="hal-fake-row"><span>' + a + '</span>' + b + '</div>'; };
    var fld = function (label, val) { return '<div class="hal-fake-fld"><small>' + label + '</small><span>' + val + '</span></div>'; }, chk = function (on, t) { return '<div class="hal-fake-chk"><i class="' + (on ? 'on' : '') + '">' + (on ? '✓' : '') + '</i>' + t + '</div>'; };
    var steps = [
      ['HACS 에 저장소 넣기 <small>처음 한 번만</small>', 'HACS 오른쪽 위 <b>⋮</b> → <b>사용자 지정 저장소</b> → 주소를 붙여 넣고 종류는 <b>통합</b> → <b>추가</b>. 연결 창의 <b>🧩 내 Home Assistant 의 HACS 에서 열기</b>를 누르면 이 걸음은 건너뛰어요.',
        shot('Home Assistant · HACS', '<div class="hal-fake-row"><b class="hal-fake-t">HACS</b>' + hl('<span class="hal-fake-ico">⋮</span>', 1) + '</div>' + hl('<div class="hal-fake-opt">사용자 지정 저장소</div>', 2) + hl(fld('저장소', 'https://github.com/' + esc(L.repo)) + fld('종류', '통합'), 3) + '<div class="hal-fake-end">' + hl(btn('추가', 'pri'), 4) + '</div>', 'ha')],
      ['내려받고 다시 시작', '<b>3ds</b> 를 열어 <b>다운로드</b>를 누르고, Home Assistant 를 <b>다시 시작</b>해 주세요 (설정 › 시스템 › 다시 시작). 다시 시작해야 통합 목록에 나와요.',
        shot('Home Assistant · HACS · 3ds', '<div class="hal-fake-repo"><span class="hal-fake-logo">3DS</span><div><b>3ds</b><small>' + esc(L.repo) + ' · 통합</small></div></div><p class="hal-fake-p">온습도 센서 · 프린터 상태 · 카메라 사진을 사이트로 보냅니다.</p><div class="hal-fake-end">' + hl(btn('⬇ 다운로드', 'pri'), 1) + '</div><div class="hal-fake-note">설정 › 시스템 › ' + hl('<u>다시 시작</u>', 2) + '</div>', 'ha')],
      ['통합 추가에서 「3ds」 찾기', '설정 › 기기 및 서비스 → 오른쪽 아래 <b>통합 추가</b> → <b>3ds</b> 를 찾아 누르세요. 연결 창의 <b>⚙️ 「3ds」 통합 추가 열기</b>를 눌러도 돼요.',
        shot('Home Assistant · 기기 및 서비스', '<b class="hal-fake-t">통합</b>' + hl('<div class="hal-fake-fld"><span>🔍 3ds</span></div>', 2) + hl('<div class="hal-fake-repo"><span class="hal-fake-logo">3DS</span><div><b>3ds</b><small>온습도 · 프린터 · 장비 상태를 사이트로</small></div></div>', 3) + '<div class="hal-fake-end">' + hl(btn('＋ 통합 추가', 'pri'), 1) + '</div>', 'ha')],
      ['사이트 주소 · 연결 코드 붙여 넣기', '이 화면의 <b>➕ 기기 연결</b>을 누르면 두 가지가 나와요. <b>📋 복사</b>해서 Home Assistant 에 붙여 넣고 <b>확인</b>. 연결 코드는 비밀번호와 같아요.',
        shot('사이트 → Home Assistant', row('사이트 주소', '<code>' + esc(L.site) + '</code>' + hl(btn('📋 복사', 'pri sm'), 1)) + row('연결 코드', '<code>' + esc(code) + '</code>' + hl(btn('📋 복사', 'pri sm'), 2)) + '<hr>' + hl(fld('사이트 주소', esc(L.site)) + fld('연결 코드', '●●●●●●●●●●●●'), 3) + '<div class="hal-fake-end">' + hl(btn('확인', 'pri'), 4) + '</div>', 'ha')],
      ['「⚡ 알아서 찾아 연결」 → 확인', '맨 위 <b>⚡ 알아서 찾아 연결</b>을 고르면, 사이트의 내 프린터 · 필라멘트 보관 위치와 <b>이름이 맞는 것</b>이 체크되어 나와요. 맞는지 보고 <b>확인</b>. 같은 기기의 온도 센서는 알아서 같이 붙어요.',
        shot('Home Assistant · 3ds', '<b class="hal-fake-t">무엇에 붙일까요?</b>' + hl('<div class="hal-fake-opt on">◉ ⚡ 알아서 찾아 연결 (추천)</div>', 1) + '<div class="hal-fake-opt">○ 내 프린터 — 하나씩</div><hr><b class="hal-fake-t">연결할 것</b>' + hl(chk(1, '🖨️ 거실 · Bambu Lab P1S ← P1S') + chk(1, '🧵 드라이박스 ← 드라이박스 습도') + chk(0, '🧵 거실 습도 (새 보관함)'), 2) + '<div class="hal-fake-end">' + hl(btn('확인', 'pri'), 3) + '</div>', 'ha')],
      ['못 찾은 프린터 · 장비 붙이기 <small>필요할 때만</small>', '이름이 달라 못 찾았으면 통합을 한 번 더 추가해 <b>내 프린터 — 하나씩</b> · <b>업체 장비 — 하나씩</b>을 고르세요. Home Assistant 의 <b>기기를 고르면</b> 상태 · 진행률 · 카메라 센서를 찾아 채워 줘요.',
        shot('Home Assistant · 3ds — 하나씩', hl(fld('기기 (안 골라도 됨)', 'Bambu Lab P1S'), 1) + '<hr><b class="hal-fake-t">센서 고르기 <small>찾은 것이 채워져 있어요</small></b>' + hl(fld('상태', 'sensor.p1s_print_status') + fld('진행률 (%)', 'sensor.p1s_print_progress') + fld('카메라', 'camera.p1s_camera'), 2) + '<div class="hal-fake-end">' + hl(btn('확인', 'pri'), 3) + '</div>', 'ha')],
      ['사이트에서 마무리', '1~2분 안에 이 화면에 🟢 로 나타나요. 카드의 <b>✏️</b>에서 <b>알림 기준</b> · 이름 · 붙일 곳 · <b>사진 공개</b>를 정하고, 정비 수첩에서 필라멘트의 <b>보관 위치</b>를 목록에서 고르면 습도가 필라멘트에 같이 보여요.',
        shot('사이트 · IoT 연결 · 정비 수첩', '<div class="hal-fake-card"><div class="hal-fake-row"><span>🧵 <b>드라이박스</b></span>' + hl('<span class="hal-fake-ico">✏️</span>', 2) + '</div><div class="hal-fake-vals"><span>💧 <b>32.5</b>%</span><span>🌡️ <b>23.4</b>°C</span></div>' + hl('<div class="hal-fake-st"><i></i>방금</div>', 1) + '</div>' + hl('<div class="hal-fake-fld"><small>보관 위치 <em>🏠 온습도 센서가 있는 곳</em></small><span>드라이박스 ▾</span></div>', 3) + '<div class="hal-fake-tags"><span>💧 건조 12일 뒤</span><span class="ha">🏠 💧32.5% 🌡️23.4°C</span></div>')]
    ];
    var more = '<section class="hal-sec hal-tips"><h4>💡 더 알아 두면 좋아요</h4><ul>' +
      '<li><b>프린터 · 업체 장비</b>는 통합을 한 번 더 추가해 「내 프린터 — 하나씩」 · 「업체 장비 — 하나씩」을 고르세요. Home Assistant 의 기기를 고르면 상태 · 진행률 · 카메라 센서를 찾아 채워 줘요.</li>' +
      '<li><b>센서를 더 붙이거나 빼려면</b> Home Assistant 의 그 통합에서 <b>구성</b>을 누르세요.</li>' +
      '<li><b>이미 붙인 센서를 다른 곳으로</b> 옮기려면 이 화면의 카드 ✏️ → 「무엇에 붙일까요?」를 바꾸면 돼요.</li>' +
      '<li><b>🟢 로 안 바뀌면</b> Home Assistant 를 다시 시작했는지, 사이트 주소가 <code>https://</code> 로 시작하는지 확인하세요. 그래도 안 되면 설정 › 시스템 › 로그에서 <code>g7_link</code> 를 찾아보세요.</li>' +
      '<li>HACS 를 안 쓰면 연결 창의 <b>📝 HACS 없이 설정 글로</b>를 누르세요.</li></ul>' +
      '<p class="hal-hint">그림은 화면을 본떠 그린 거예요. Home Assistant 화면은 버전에 따라 조금 다를 수 있어요.</p></section>';
    var ov = modal('❓ 연결 방법', '<p class="hal-guide-top">처음이라면 <b>5분</b>이면 돼요. Home Assistant 에서 할 일(①~⑥)과 사이트에서 할 일(⑦)을 순서대로 보여 드려요. 빨간 테두리 <span class="hal-hl sm">이렇게</span> 표시한 곳을 순서대로 누르면 돼요.</p><ol class="hal-guide">' + steps.map(function (s, i) {
      return '<li><div class="hal-guide-t"><em>' + (i + 1) + '</em><div><b>' + s[0] + '</b><p>' + s[1] + '</p></div></div>' + s[2] + '</li>';
    }).join('') + '</ol>' + more, { left: '<button type="button" class="hal-btn pri" data-start>➕ 지금 연결하기</button>' });
    ov.classList.add('wide');
    ov.addEventListener('click', function (ev) { if (ev.target.closest('[data-start]')) { ov.__close(); connectBox(); } });
  }

  /** ➕ 기기 연결 — HACS 통합으로 (쉬움: HA 화면에서 센서를 고르면 끝) · 아니면 설정 글을 직접 붙여 넣기 */
  function connectBox() {
    var L = S.d.link, rp = String(L.repo).split('/'), my = 'https://my.home-assistant.io/redirect/';
    var row = function (label, val, key) { return '<div class="hal-copy"><span>' + label + '</span><code>' + esc(val) + '</code><button type="button" class="hal-btn sm pri" data-cp="' + key + '">📋 복사</button></div>'; };
    var ov = modal('➕ 기기 연결', '<section class="hal-sec"><h4><em>1</em> HACS 에서 「3ds」 설치 <small>처음 한 번만</small></h4>' +
        '<div class="hal-row"><a class="hal-btn pri" target="_blank" rel="noopener" href="' + my + 'hacs_repository/?owner=' + encodeURIComponent(rp[0]) + '&repository=' + encodeURIComponent(rp[1] || '') + '&category=integration">🧩 내 Home Assistant 의 HACS 에서 열기</a></div>' +
        '<p class="hal-hint">열린 화면에서 <b>다운로드</b>를 누르고 Home Assistant 를 다시 시작해 주세요. 단추가 안 되면 HACS › 사용자 지정 저장소에 <code>https://github.com/' + esc(L.repo) + '</code> (종류: 통합)을 넣으면 돼요.</p></section>' +
      '<section class="hal-sec"><h4><em>2</em> 통합을 추가하고 아래 두 가지를 붙여 넣기</h4>' +
        '<div class="hal-row"><a class="hal-btn" target="_blank" rel="noopener" href="' + my + 'config_flow_start/?domain=g7_link">⚙️ 「3ds」 통합 추가 열기</a></div>' + row('사이트 주소', L.site, 'site') + row('연결 코드', L.code, 'code') +
        '<p class="hal-hint">🔒 연결 코드는 비밀번호와 같아요. 새어 나갔으면 아래 「코드 새로 만들기」.</p></section>' +
      '<section class="hal-sec"><h4><em>3</em> 「⚡ 알아서 찾아 연결」 → 확인</h4><p class="hal-hint">사이트의 <b>내 프린터</b> · 필라멘트 <b>보관 위치</b>와 이름이 맞는 Home Assistant 기기 · 습도 센서를 찾아 체크해 둬요. 맞으면 <b>확인</b>만 누르면 끝 — 프린터는 상태 · 진행률 · 카메라, 보관함은 습도 · 온도가 한 번에 붙어요. 이름이 달라 못 찾은 것은 같은 목록에서 직접 체크하거나 「하나씩」으로 붙이면 돼요. 조금 뒤 이 화면에 🟢 로 나타나요.</p></section>',
      { left: '<button type="button" class="hal-btn" data-guide2>❓ 그림으로 보기</button><button type="button" class="hal-btn" data-rl>🔑 코드 새로 만들기</button><button type="button" class="hal-btn" data-manual>📝 HACS 없이 설정 글로</button>' });
    ov.addEventListener('click', function (ev) {
      var c = ev.target.closest('[data-cp]'); if (c) { copy(c.getAttribute('data-cp') === 'site' ? L.site : L.code, c); return; }
      if (ev.target.closest('[data-guide2]')) { ov.__close(); guideBox(); return; }
      if (ev.target.closest('[data-manual]')) { ov.__close(); form(null); return; }
      if (ev.target.closest('[data-rl]') && confirm('연결 코드를 새로 만들까요? Home Assistant 의 통합에서 기기를 더 붙이거나 고치려면 새 코드를 넣어야 해요. (이미 붙인 기기는 계속 값이 들어와요)')) api('POST', '/link/rotate', {}).then(function (r) { toast(r.message); S.d = r.data.overview; ov.__close(); connectBox(); }).catch(fail);
    });
  }

  // ── 떠 있는 창 ──
  function modal(title, html, o) {
    o = o || {};
    var ov = document.createElement('div'); ov.className = 'hal-modal';
    ov.innerHTML = '<div class="hal hal-modal-w"><div class="hal-modal-b" role="dialog" aria-modal="true"><header class="hal-modal-h"><h3>' + title + '</h3><button type="button" class="hal-icobtn" data-x aria-label="닫기">✕</button></header>' +
      '<div class="hal-modal-c">' + html + '</div><footer class="hal-modal-f"><div>' + (o.left || '') + '</div><div><button type="button" class="hal-btn" data-x>닫기</button>' + (o.onSave ? '<button type="button" class="hal-btn pri" data-ok>' + (o.ok || '저장') + '</button>' : '') + '</div></footer></div></div>';
    var root = document.documentElement, down = null;
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    var close = function () { ov.remove(); root.classList.remove('hal-modal-open'); document.removeEventListener('keydown', onKey); };
    ov.__close = close;
    document.body.appendChild(ov); root.classList.add('hal-modal-open'); document.addEventListener('keydown', onKey);
    ov.addEventListener('mousedown', function (e) { down = e.target; });
    ov.addEventListener('click', function (e) { if ((e.target === ov && down === ov) || e.target.closest('[data-x]')) close(); });
    var ok = ov.querySelector('[data-ok]');
    if (ok) ok.onclick = function () { ok.disabled = true; o.onSave(ov).then(function () { close(); }).catch(function (e) { ok.disabled = false; fail(e); }); };
    return ov;
  }
  /** 프린터 통합마다 흔히 쓰는 센서 이름 (앞 이름만 바꿔 채움 — 통합 버전에 따라 다를 수 있음) */
  var PRESET = {
    bambu: ['Bambu Lab', { state: 'sensor.{p}_print_status', progress: 'sensor.{p}_print_progress', remaining: 'sensor.{p}_remaining_time', job: 'sensor.{p}_task_name', temp: 'sensor.{p}_chamber_temperature' }],
    klipper: ['Klipper (Moonraker)', { state: 'sensor.{p}_current_print_state', progress: 'sensor.{p}_progress', job: 'sensor.{p}_filename' }],
    octo: ['OctoPrint', { state: 'sensor.{p}_current_state', progress: 'sensor.{p}_job_percentage' }]
  };
  function form(d) {
    var D = S.d, isNew = !d, isSt = !!(d && d.source === 'smartthings');
    d = d || { target: 'location', name: '', location: '', entities: {}, humidity_max: 40, temp_max: null, notify: true, snap_public: false };
    var e = d.entities, ent = function (k, label, ph) { return '<label>' + label + '<input name="ent_' + k + '" value="' + esc(e[k] || '') + '" placeholder="' + ph + '" autocapitalize="off" autocomplete="off" spellcheck="false"></label>'; };
    var tg = Object.keys(D.targets).filter(function (k) { return k === 'location' || k === 'other' || (k === 'printer' && D.printers.length) || (k === 'equipment' && D.equipment.length); });
    var html =
      '<section class="hal-sec"><h4><em>1</em> 무엇에 붙일까요?</h4><div class="hal-pick">' + tg.map(function (k) { return '<label><input type="radio" name="target" value="' + k + '"' + (d.target === k ? ' checked' : '') + '><span><i>' + ICON[k] + '</i>' + esc(D.targets[k]) + '</span></label>'; }).join('') + '</div>' +
        '<div data-for="location"><label>보관 위치 <small>필라멘트에 적은 「보관 위치」와 같게</small><input name="location" list="hal-locs" maxlength="40" value="' + esc(d.location || '') + '" placeholder="예: 드라이박스 · AMS · 서랍 2칸"><datalist id="hal-locs">' + D.locations.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></label></div>' +
        '<div data-for="printer"><label>내 프린터<select name="printer_id">' + D.printers.map(function (p) { return '<option value="' + p.id + '"' + (d.printer_id === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label></div>' +
        '<div data-for="equipment"><label>업체 장비<select name="equipment_id">' + D.equipment.map(function (x) { var c = D.companies.filter(function (y) { return y.id === x.company_id; })[0]; return '<option value="' + x.id + '"' + (d.equipment_id === x.id ? ' selected' : '') + '>' + esc((c ? c.name + ' — ' : '') + x.name) + '</option>'; }).join('') + '</select></label></div>' +
        '<label>이름 <small>비우면 위에서 고른 것</small><input name="name" maxlength="60" value="' + esc(d.name || '') + '" placeholder="예: 거실 드라이박스"></label></section>' +
      (isSt ? '<section class="hal-sec"><h4><em>2</em> 📡 SmartThings 센서</h4><p class="hal-hint">이 기기의 값은 SmartThings 에서 들어와요. 센서를 바꾸려면 SmartThings 앱에서 그 앱을 열어 고쳐 주세요.</p></section>' : '') +
      (isSt ? '' : '<section class="hal-sec"><h4><em>2</em> Home Assistant 센서 이름</h4><p class="hal-hint">HA 의 <b>개발자 도구 › 상태</b>에서 보이는 이름이에요. 있는 것만 적으면 돼요.</p>' +
        '<div data-for="printer equipment other" class="hal-preset">빠르게 채우기: ' + Object.keys(PRESET).map(function (k) { return '<button type="button" class="hal-chip" data-preset="' + k + '">' + PRESET[k][0] + '</button>'; }).join('') + '</div>' +
        '<div class="hal-two">' + ent('hum', '💧 습도', 'sensor.drybox_humidity') + ent('temp', '🌡️ 온도', 'sensor.drybox_temperature') + '</div>' +
        '<div data-for="printer equipment other">' + ent('state', '⚙️ 상태 <small>프린터 상태 · 전원 스위치 · 플러그 — 가동 시간을 세요</small>', 'sensor.p1s_print_status 또는 switch.dryer') + '</div>' +
        '<div data-for="printer" class="hal-two">' + ent('progress', '진행률 (%)', 'sensor.p1s_print_progress') + ent('remaining', '남은 시간 (분)', 'sensor.p1s_remaining_time') + ent('job', '작업 이름', 'sensor.p1s_task_name') + '</div></section>') +
      '<section class="hal-sec"><h4><em>3</em> 알림 기준 <small>비우면 알리지 않아요</small></h4>' +
        '<div class="hal-two"><label>습도가 이보다 높으면 (%)<div class="hal-chips">' + [20, 30, 40, 50].map(function (v) { return '<button type="button" class="hal-chip" data-hm="' + v + '">' + v + '%</button>'; }).join('') + '</div><input name="humidity_max" type="number" min="1" max="100" inputmode="numeric" value="' + esc(d.humidity_max == null ? '' : d.humidity_max) + '" placeholder="안 알림"></label>' +
        '<label>온도가 이보다 높으면 (°C)<div class="hal-chips"></div><input name="temp_max" type="number" inputmode="numeric" value="' + esc(d.temp_max == null ? '' : d.temp_max) + '" placeholder="안 알림"></label></div>' +
        '<label class="hal-chk"><input type="checkbox" name="notify"' + (d.notify ? ' checked' : '') + '> 기준을 넘으면 알림 받기</label><p class="hal-hint">필라멘트는 보통 습도 20~40% 아래로 둬요 (나일론 · PVA 는 더 낮게).</p></section>' +
      (isSt ? '' : '<section class="hal-sec"><h4><em>4</em> 카메라 사진 <small>HACS 통합에서 카메라를 골랐을 때</small></h4><label class="hal-chk"><input type="checkbox" name="snap_public"' + (d.snap_public ? ' checked' : '') + '> 🌐 사진을 다른 회원에게 공개</label><p class="hal-hint">끄면 나만 봐요 (기본). 켜면 사이트의 다른 화면(예: 내 프린터)에서 이 사진을 보일 수 있어요. 언제든 끌 수 있어요.</p></section>');
    var ov = modal(isNew ? '➕ 기기 연결' : '✏️ 기기 고치기', html, {
      ok: isNew ? '만들고 설정 글 보기' : '저장',
      left: isNew ? '' : '<button type="button" class="hal-btn danger" data-del>🗑 지우기</button>',
      onSave: function (o) {
        var v = {}; Array.prototype.forEach.call(o.querySelectorAll('[name]'), function (i) { if (i.type === 'radio' && !i.checked) return; v[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
        return api(isNew ? 'POST' : 'PUT', '/devices' + (isNew ? '' : '/' + d.id), v).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); if (isNew) setTimeout(function () { yamlBox(find(r.data.id)); }, 60); });
      }
    });
    var $ = function (sel) { return ov.querySelector(sel); }, f = function (k) { return $('[name="' + k + '"]'); };
    var sync = function () {
      var t = ($('[name=target]:checked') || {}).value || 'location';
      Array.prototype.forEach.call(ov.querySelectorAll('[data-for]'), function (el) { el.hidden = el.getAttribute('data-for').split(' ').indexOf(t) < 0; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-hm]'), function (b) { b.classList.toggle('on', b.getAttribute('data-hm') === f('humidity_max').value); });
    };
    ov.addEventListener('change', sync); ov.addEventListener('input', sync); sync();
    ov.addEventListener('click', function (ev) {
      var hm = ev.target.closest('[data-hm]'); if (hm) { f('humidity_max').value = hm.getAttribute('data-hm'); sync(); return; }
      var ps = ev.target.closest('[data-preset]'); if (!ps) return;
      var p = prompt('Home Assistant 에서 이 기기 이름의 앞부분을 적어 주세요.\n예: sensor.p1s_print_status 이면 p1s', ''); if (!p) return;
      p = p.trim().toLowerCase().replace(/^sensor\./, '').replace(/[^a-z0-9_]/g, '_'); var set = PRESET[ps.getAttribute('data-preset')][1];
      Object.keys(set).forEach(function (k) { var el = f('ent_' + k); if (el && !el.closest('[hidden]')) el.value = set[k].replace('{p}', p); });
      toast('채웠어요 — HA 에 그 이름이 있는지 한번 확인해 주세요.');
    });
    var del = $('[data-del]'); if (del) del.onclick = function () { if (confirm('「' + d.name + '」 연결을 지울까요? 기록도 같이 지워져요.')) api('DELETE', '/devices/' + d.id).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); }).catch(fail); };
  }

  /** Home Assistant 에 붙여 넣을 설정 글 — rest_command(보내는 방법) + automation(10분마다 · 상태가 바뀔 때) */
  function yamlText(d) {
    var iv = Math.max(1, +S.d.config.interval_min || 10);   // 0.1.3 사이트가 정한 주기
    var e = d.entities, id = 'g7_ha_' + d.id, st = function (x) { return "{{ states(''" + x + "'') | tojson }}"; }, parts = [];
    if (e.temp) parts.push('"temperature": ' + st(e.temp)); if (e.hum) parts.push('"humidity": ' + st(e.hum)); if (e.state) parts.push('"state": ' + st(e.state));
    if (d.target === 'printer') { if (e.progress) parts.push('"progress": ' + st(e.progress)); if (e.remaining) parts.push('"remaining_min": ' + st(e.remaining)); if (e.job) parts.push('"job": ' + st(e.job)); }
    var conf = 'rest_command:\n  ' + id + ':\n    url: "' + S.d.config.base + d.token + '"\n    method: POST\n    content_type: "application/json"\n    payload: \'{' + parts.join(', ') + '}\'\n';
    var auto = '- alias: "3ds 보내기 — ' + String(d.name).replace(/["\\]/g, '') + '"\n  trigger:\n    - platform: time_pattern\n      ' + (iv >= 60 ? 'hours: "/1"' : 'minutes: "/' + iv + '"') + '\n' + (e.state ? '    - platform: state\n      entity_id: ' + e.state + '\n' : '') + '  action:\n    - service: rest_command.' + id + '\n  mode: single\n';
    return [conf, auto];
  }
  function yamlBox(d) {
    if (!d) return;
    var y = yamlText(d), box = function (i, title, sub) { return '<section class="hal-sec"><h4><em>' + (i + 1) + '</em> ' + title + ' <small>' + sub + '</small></h4><div class="hal-code"><pre>' + esc(y[i]) + '</pre><button type="button" class="hal-btn sm pri" data-copy="' + i + '">📋 복사</button></div></section>'; };
    var ov = modal('📋 ' + esc(d.name) + ' — Home Assistant 에 붙여 넣기',
      box(0, '<code>configuration.yaml</code> 에 붙여 넣기', '이미 <code>rest_command:</code> 가 있으면 둘째 줄부터 그 아래에') +
      box(1, '<code>automations.yaml</code> 에 붙여 넣기', (S.d.config.interval_min || 10) + '분마다' + (d.entities.state ? ' · 상태가 바뀔 때' : '') + ' 보내요') +
      '<section class="hal-sec"><h4><em>3</em> Home Assistant 다시 시작</h4><p class="hal-hint">설정 › 시스템 › 다시 시작. 조금 뒤 이 화면의 기기가 🟢 로 바뀌면 끝이에요.' + (d.target === 'printer' ? ' 프린터 상태는 「내 프린터」에도 같이 들어가요 (내 프린터의 자동 연결이 켜져 있을 때).' : '') + '</p></section>',
      { left: '<button type="button" class="hal-btn" data-rotate>🔑 주소 새로 만들기</button>' });
    ov.addEventListener('click', function (ev) {
      var c = ev.target.closest('[data-copy]');
      if (c) { copy(y[+c.getAttribute('data-copy')], c); return; }
      if (ev.target.closest('[data-rotate]') && confirm('받는 주소를 새로 만들까요? 지금 Home Assistant 에 넣어 둔 주소는 더 이상 안 돼요.')) {
        api('POST', '/devices/' + d.id + '/rotate', {}).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); yamlBox(find(d.id)); }).catch(fail);
      }
    });
  }

  // ── 관리자 ──
  var FIELDS = [['enabled', 'IoT 연결 쓰기', 'bool'], ['menu_enabled', '헤더 메인 메뉴에 「IoT 연결」 넣기 (홈 디자인 「메인 메뉴 보이기」와 같은 값)', 'bool'], ['menu_label', '헤더 메뉴 이름 (12글자까지)', 'text'],
    ['max_devices', '회원 한 명이 연결할 수 있는 기기', 'num'], ['send_mode', '전송 방식 (통합 「3ds」)', 'sel', [['change', '값이 변하면 보내기 (권장)'], ['interval', '주기적으로 보내기']]],
    ['change_hum', '「변하면」: 습도가 이만큼(%) 변하면 보냄 (1~10 · 온도는 0.5°C)', 'num'], ['idle_min', '「변하면」: 변화가 없어도 이만큼(분)마다 한 번 (5~180)', 'num'],
    ['interval_min', '「주기적으로」 · 설정 글(YAML): 값 보내는 주기 (분, 1~60)', 'num'], ['refresh_sec', '화면이 새 값을 다시 받는 간격 (초, 5~3600 · 0 = 끔)', 'num'],
    ['away_after_min', '회원이 화면을 이만큼(분) 안 보면 「자리 비움」 (5~1440 · 0 = 끔: 늘 같은 주기)', 'num'], ['away_interval_min', '자리 비움일 때 값 보내는 주기 (분) — 통합 「3ds」이 스스로 늦춤', 'num'], ['keep_days', '온습도 기록을 며칠 둘지 (한 시간에 한 줄)', 'num'], ['stale_hours', '몇 시간 소식이 없으면 「끊김」', 'num'], ['alert_gap_hours', '같은 기기의 경고를 다시 보내기까지 (시간)', 'num'],
    ['notify_site', '기준을 넘으면 사이트 알림', 'bool'], ['notify_mail', '기준을 넘으면 메일도', 'bool'], ['snapshot', '카메라 사진 받기 (기기마다 최신 한 장 · 주인만 봄)', 'bool'], ['snap_gap_min', '사진을 받는 가장 짧은 간격 (분)', 'num'], ['printer_link', '내 프린터로 출력 상태 넘기기', 'bool'], ['company_link', '업체 보유 장비에 연결', 'bool'], ['hacs_repo', 'HACS 통합 저장소 (GitHub 주인/이름)', 'text'], ['timezone', '시간대 (예: Asia/Seoul)', 'text']];
  /* 0.2.0 📡 SmartThings — 관리자 설정 · Developer Workspace 등록 안내 (한 걸음씩) */
  var ST_FIELDS = [['st_enabled', 'SmartThings 연결 쓰기 (먼저 켜고 저장해야 Workspace 의 주소 확인이 돼요)', 'bool'], ['st_app_id', 'App ID (비우면 맞춰 보지 않음)', 'text'], ['st_client_id', 'Client ID', 'text'],
    ['st_client_secret', 'Client Secret', 'secret'], ['st_code_min', '회원 연결 코드를 쓸 수 있는 시간 (분, 5~1440)', 'num'], ['st_max_events_min', '설치 하나가 1분에 보낼 수 있는 값 (넘으면 버림, 10~2000)', 'num'],
    ['st_ping_unsigned', '(예전 방식) 서명 없는 PING 에도 답하기 — 보통은 끔', 'bool'], ['st_public_key', '(고급) 서명 공개 키 PEM — 비우면 key.smartthings.com 에서 받아요', 'area']];
  function stAdmin(s, info) {
    var I = info || {}, cp = function (v, k) { return '<div class="hal-copy"><code>' + esc(v) + '</code><button type="button" class="hal-btn sm pri" data-acp="' + k + '">📋 복사</button></div>'; };
    var ok = I.confirmed_at ? '<span class="hal-pill on">✅ 주소 확인됨 · ' + esc(I.confirmed_at) + '</span>' : (s.st_enabled ? '<span class="hal-pill wait">⏳ 아직 주소 확인 전 — ⑥을 눌러 주세요</span>' : '<span class="hal-pill">⚪ 꺼져 있음</span>');
    var steps = [
      ['아래에서 「SmartThings 연결 쓰기」를 켜고 저장', '꺼져 있으면 사이트가 SmartThings 의 확인 요청에 답하지 않아요 (404).'],
      ['Developer Workspace 에 로그인', '<a href="https://developer.smartthings.com/workspace" target="_blank" rel="noopener">developer.smartthings.com/workspace</a> — 삼성 계정 (SmartThings 앱과 같은 계정)으로.'],
      ['New Project → 「Automation for the SmartThings App」 → Continue', '프로젝트 이름(예: <b>' + esc(location.hostname) + ' 연결</b>)을 적고 <b>Create Project</b>.'],
      ['Register App → 「WebHook Endpoint」 → Target URL 붙여 넣기', '아래 주소를 그대로 붙여 넣어요. <b>https</b> 이고 밖에서 열려야 해요.' + cp(I.target_url || '', 'url') + (I.legacy_target_url ? '<span class="hal-hint">이미 예전 주소(<code>' + esc(I.legacy_target_url) + '</code>)로 등록했다면 그대로 둬도 돼요 — 예전 주소도 계속 받아요.</span>' : '')],
      ['앱 이름 · 설명을 적고 권한(Scopes) 두 개 체크 → Save', '회원 SmartThings 앱의 「발견」에 이 이름이 보여요. 권한은 <b>읽기만</b>:' + cp((I.scopes || []).join(' '), 'scopes') + '<span class="hal-hint">r:devices:* (기기 · 값 읽기) · r:locations:* (위치 이름 · 온도 단위 °C/°F)</span>'],
      ['나온 Client ID · Client Secret 을 아래 칸에 붙여 넣고 저장', '<b>Client Secret 은 이때 한 번만 보여요</b> — 바로 복사해 두세요. App ID 는 프로젝트 화면(Overview)의 App ID 를 적어요 (비워도 돼요).'],
      ['「Verify App Registration」(주소 확인) 누르기', 'SmartThings 가 사이트로 CONFIRMATION 을 보내면 사이트가 알아서 확인해요 — 이 화면을 새로 고치면 ✅ 로 바뀌어요.'],
      ['「Deploy to Test」 누르기', '이제 그 삼성 계정의 SmartThings 앱 → <b>설정 › SmartThings 정보</b>를 5초 길게 눌러 <b>개발자 모드</b>를 켜면 자동화 › ＋ › 루틴 추가 › <b>발견</b>에 앱이 보여요.'],
      ['다른 회원도 쓰게 하려면 — 배포(Publish)', 'Deploy to Test 상태에서는 <b>그 개발자 계정만</b> 설치할 수 있어요. 회원 누구나 쓰게 하려면 Workspace 에서 배포 신청(삼성 검토)이 필요해요.']
    ];
    return '<section class="hal-form hal-st-admin"><div class="full hal-st-ah"><h2>📡 SmartThings 연결 <small>WebHook SmartApp</small></h2>' + ok + '<span class="hal-hint">설치 ' + n(I.installs) + ' · 회원과 이은 것 ' + n(I.linked) + '</span></div>' +
      '<ol class="full hal-st-steps">' + steps.map(function (x, i) { return '<li><em>' + (i + 1) + '</em><div><b>' + x[0] + '</b><p>' + x[1] + '</p></div></li>'; }).join('') + '</ol>' +
      ST_FIELDS.map(function (f) {
        if (f[2] === 'bool') return '<label class="hal-chk"><input type="checkbox" data-k="' + f[0] + '"' + (s[f[0]] ? ' checked' : '') + '> ' + esc(f[1]) + '</label>';
        if (f[2] === 'secret') return '<label>' + esc(f[1]) + ' <small>' + (s.st_client_secret_set ? '🔒 저장됨 (암호화) — 바꿀 때만 적어요' : '아직 없음') + '</small><input type="password" autocomplete="new-password" data-k="' + f[0] + '" value="" placeholder="' + (s.st_client_secret_set ? '●●●●●●●● 그대로 두기' : 'Workspace 에서 받은 Client Secret') + '"></label>';
        if (f[2] === 'area') return '<label class="full">' + esc(f[1]) + '<textarea data-k="' + f[0] + '" rows="3" spellcheck="false" placeholder="-----BEGIN PUBLIC KEY-----">' + esc(s[f[0]] || '') + '</textarea></label>';
        return '<label>' + esc(f[1]) + '<input type="' + (f[2] === 'num' ? 'number' : 'text') + '" data-k="' + f[0] + '" value="' + esc(s[f[0]]) + '" autocomplete="off" spellcheck="false"></label>';
      }).join('') +
      '<p class="hal-hint full">🔒 모든 요청의 HTTP 서명(rsa-sha256 · Digest · Date)을 확인하고 맞지 않으면 거부해요. 회원 토큰은 암호화해 두고 24시간마다 refresh_token 으로 새로 받아요. 회원은 자기 화면 /iot-link 의 SmartThings 카드에서 일회용 연결 코드를 만들어 SmartThings 앱의 설정 화면에 적으면 이어져요.</p></section>';
  }
  function renderAdmin() {
    api('GET', '/admin/settings').then(function (r) {
      var s = r.data.settings, st = r.data.stats;
      wrap('<section class="hal-hero"><div><h1>📡 IoT 연결 — 관리자</h1><p>회원 화면: <a href="' + BASE + '" target="_blank">' + BASE + '</a> · 회원 기기의 값 · 받는 주소는 관리자에게도 보이지 않아요</p></div><div class="hal-stats"><span>쓰는 회원 <b>' + n(st.users) + '</b></span><span>기기 <b>' + n(st.devices) + '</b></span><span>🟢 연결됨 <b>' + n(st.live) + '</b></span><span>기록 <b>' + n(st.readings) + '</b>줄</span><span>📡 SmartThings <b>' + n(st.st_installs) + '</b></span></div></section>' +
        '<div class="hal-form">' + FIELDS.map(function (f) {
          if (f[2] === 'sel') return '<label>' + esc(f[1]) + '<select data-k="' + f[0] + '">' + f[3].map(function (o) { return '<option value="' + o[0] + '"' + (s[f[0]] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
          return f[2] === 'bool' ? '<label class="hal-chk"><input type="checkbox" data-k="' + f[0] + '"' + (s[f[0]] ? ' checked' : '') + '> ' + esc(f[1]) + '</label>' : '<label>' + esc(f[1]) + '<input type="' + (f[2] === 'num' ? 'number' : 'text') + '" data-k="' + f[0] + '" value="' + esc(s[f[0]]) + '"></label>';
        }).join('') + '<p class="hal-hint full">전송 방식은 여기서 정하고 회원의 통합이 따라요 (회원은 주기를 더 길게만 바꿀 수 있어요). 「값이 변하면」: 습도 · 온도가 정한 만큼 변했을 때만 보내고(잇따라 변해도 1분에 한 번까지), 변화가 없으면 가끔 한 번만 — 값이 안정된 보관함은 요청이 줄고, 뚜껑을 열어 습도가 오르면 더 빨리 알아요. 「주기적으로」: 정한 주기마다 보내요 (기기 100대 · 10분이면 한 시간에 600번). 회원이 사이트의 IoT 연결 · 정비 수첩 화면을 한동안 안 보면(자리 비움) 통합이 느린 주기로 바꿔 보내요 — 그동안에도 출력 시작 · 끝 같은 상태 변화는 바로 오고, 습도 경고는 느린 주기만큼 늦어질 수 있어요. 다시 화면을 열면 다음 번 값이 올 때부터 평소 주기로 돌아와요 (설정 글(YAML)로 붙인 기기는 늘 같은 주기) — 요청 하나에 조회 1 · 저장 1~3. 기록은 기기마다 한 시간에 한 줄만 남기고 위 날짜가 지나면 지워요. 받는 주소는 1분에 30번까지만 받아요.</p>' +
        '</div>' + stAdmin(s, r.data.smartthings) + '<div class="hal-acts hal-acts-end"><button class="hal-btn pri" id="hal-asave">저장</button></div>');
      S.root.onclick = function (ev) { var c = ev.target.closest('[data-acp]'); if (!c) return; var I = r.data.smartthings || {}; copy(c.getAttribute('data-acp') === 'url' ? I.target_url : (I.scopes || []).join(' '), c); };
      q('#hal-asave').onclick = function () {
        var out = {}; qa('[data-k]').forEach(function (i) { out[i.getAttribute('data-k')] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; });
        api('PUT', '/admin/settings', { settings: out }).then(function (x) { toast(x.message || '저장했어요.'); renderAdmin(); }).catch(fail);
      };
    }).catch(function (e) { wrap('<div class="hal-empty">' + esc(e.message) + '</div>'); });
  }

  // ── 시작 ──
  function route() {
    if (S.root.hasAttribute('data-hal-admin')) return renderAdmin();
    wrap('<div class="hal-empty">불러오는 중…</div>');
    api('GET', '/me').then(function (r) { S.d = r.data; draw(); }).catch(function (e) {
      wrap(e.status === 401 ? '<section class="hal-hero"><div><h1>📡 IoT 연결</h1><p>Home Assistant · SmartThings 의 온습도 센서 · 프린터 · 장비 상태를 받아 정비 수첩과 내 프린터에 이어요.</p></div></section><div class="hal-empty">로그인하면 내 기기를 연결할 수 있어요. <a href="/login" data-go>로그인</a></div>' : '<div class="hal-empty">' + esc(e.message) + '</div>');
    });
  }
  /* 1.0.0 예전 주소(/ha-link · /admin/ha-link — HA 연결 때)로 왔으면 주소 줄만 새 주소로 바꿔 보임 (같은 화면 · 다시 불러오지 않음) */
  function newPath() {
    try { var p = location.pathname, q = p.replace(/(^|\/)ha-link(?=\/|$)/, '$1iot-link'); if (q !== p && history.replaceState) history.replaceState(history.state, '', q + location.search + location.hash); } catch (e) {}
  }
  function tick() {
    var root = document.querySelector('[data-hal-app],[data-hal-admin]');
    if (!root) { S.root = null; return; }
    newPath();
    var key = location.pathname + location.search;
    if (root === S.root && key === S.key) return;
    S.root = root; S.key = key;
    if (!root.__halBound) { root.__halBound = true; root.addEventListener('click', function (e) { var g = e.target.closest('[data-go]'); if (g && g.getAttribute('href')) { e.preventDefault(); go(g.getAttribute('href')); } }); }
    route();
  }
  window.__halApp = { tick: tick, v: V };
  tick();
  addEventListener('popstate', function () { setTimeout(tick, 40); });
  var wait = 0;
  try { new MutationObserver(function () { if (wait) return; wait = setTimeout(function () { wait = 0; var r = document.querySelector('[data-hal-app],[data-hal-admin]'); if (r !== S.root || location.pathname + location.search !== S.key) tick(); }, 120); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  /* 0.1.4 화면을 켜 둔 동안 1분마다 값만 다시 받아 옴 — 새로고침 없이 바뀜.
   *   화면이 보일 때만 · 떠 있는 창이 없을 때만 · 바뀐 것이 있을 때만 다시 그림 (깜빡임 · 스크롤 튐 없음). 다른 탭에 갔다 돌아오면 바로 한 번 */
  var liveBusy = false, liveAt = 0;
  /** 0.1.5 다시 받는 간격 (초) — 관리자 설정 (0 = 끔) */
  function liveSec() { var c = S.d && S.d.config, v = c && c.refresh_sec != null ? +c.refresh_sec : 60; return v > 0 ? Math.max(5, v) : 0; }
  function sig(d) { return JSON.stringify([d.devices.map(function (x) { return [x.id, x.temp, x.humidity, x.state, x.is_on, x.seen, x.stale, x.over, x.snap_at, x.hours_30d, x.name, x.where, x.humidity_max, x.temp_max, x.snap_public, x.sensors]; }), d.smartthings]); }
  function live() {
    if (liveBusy || !S.root || !S.d || S.root.hasAttribute('data-hal-admin') || document.hidden || document.querySelector('.hal-modal') || !document.contains(S.root)) return;
    liveBusy = true; liveAt = Date.now();
    api('GET', '/me').then(function (r) { var old = sig(S.d); S.d = r.data; if (sig(r.data) !== old && !document.querySelector('.hal-modal')) { var y = window.scrollY; draw(); window.scrollTo(0, y); } else { qa('.hal-st').forEach(function (el, i) { var d = S.d.devices[i]; if (d && !d.never && !d.stale) el.innerHTML = '<span class="hal-dot on"></span>' + agoText(d.seen); }); } })
      .catch(function () {}).then(function () { liveBusy = false; });
  }
  setInterval(function () { var s = liveSec(); if (s && Date.now() - liveAt >= s * 1000 - 500) live(); }, 5000);   // 5초마다 「때가 됐나」만 봄 — 요청은 정한 간격에 한 번
  document.addEventListener('visibilitychange', function () { if (!document.hidden && liveSec() && Date.now() - liveAt > 4000) live(); });
})();
