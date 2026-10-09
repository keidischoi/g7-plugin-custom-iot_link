/*! custom-ha_link 0.1.3 — 🏠 HA 연결 (Home Assistant 온습도 · 기기 상태 받기) 화면 · 관리자 */
(function () {
  'use strict';
  if (window.__halApp) { window.__halApp.tick(); return; }
  var API = '/api/plugins/custom-ha_link', BASE = '/ha-link', V = '0.1.3';
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
  function card(d) {
    var hasEnv = d.entities.temp || d.entities.hum, hasState = !!d.entities.state;
    var st = d.never ? '<span class="hal-dot wait"></span>값을 기다리는 중' : d.stale ? '<span class="hal-dot off"></span>끊김 · ' + agoText(d.seen) : '<span class="hal-dot on"></span>' + agoText(d.seen);
    return '<article class="hal-card' + (d.over ? ' over' : '') + (d.stale && !d.never ? ' stale' : '') + '">' +
      '<header><span class="hal-ico">' + ICON[d.target] + '</span><div><b>' + esc(d.name) + '</b><small>' + esc(S.d.targets[d.target]) + (d.where && d.where !== d.name ? ' · ' + esc(d.where) : '') + '</small></div><button class="hal-icobtn" data-edit="' + d.id + '" title="고치기" aria-label="고치기">✏️</button></header>' +
      '<div class="hal-vals">' +
        (d.entities.hum ? '<div class="' + (d.humidity_max != null && d.humidity != null && d.humidity > d.humidity_max ? 'hot' : '') + '"><i>💧</i><b>' + (d.humidity == null ? '–' : d.humidity) + '</b><u>%</u>' + (d.humidity_max != null ? '<small>기준 ' + d.humidity_max + '%</small>' : '') + '</div>' : '') +
        (d.entities.temp ? '<div class="' + (d.temp_max != null && d.temp != null && d.temp > d.temp_max ? 'hot' : '') + '"><i>🌡️</i><b>' + (d.temp == null ? '–' : d.temp) + '</b><u>°C</u>' + (d.temp_max != null ? '<small>기준 ' + d.temp_max + '°C</small>' : '') + '</div>' : '') +
        (hasState ? '<div class="st' + (d.is_on ? ' run' : '') + '"><i>' + (d.is_on ? '⚙️' : '⏸') + '</i><b>' + (d.is_on ? '가동 중' : '쉬는 중') + '</b><small>' + (d.state ? esc(d.state) + ' · ' : '') + '30일 ' + d.hours_30d + '시간</small></div>' : '') +
      '</div>' + (d.snap_at ? '<button type="button" class="hal-snap" data-snap="' + d.id + '" data-at="' + esc(d.snap_at) + '" title="크게 보기"><span>📷 ' + esc(agoText(d.snap_at)) + ' · ' + (d.snap_public ? '🌐 공개' : '🔒 나만') + '</span></button>' : '') + (hasEnv ? spark(d) : '') +
      (d.over ? '<p class="hal-warn">⚠️ 기준을 넘었어요' + (d.target === 'location' ? ' — 여기 둔 필라멘트 건조를 챙겨 주세요' : '') + '</p>' : '') +
      '<footer><span class="hal-st">' + st + '</span><button class="hal-btn sm" data-yaml="' + d.id + '">📋 설정 글</button></footer></article>';
  }
  function draw() {
    var d = S.d, live = d.devices.filter(function (x) { return !x.stale; }).length, over = d.devices.filter(function (x) { return x.over; }).length;
    wrap('<section class="hal-hero"><div><h1>🏠 HA 연결</h1><p>Home Assistant 의 온습도 센서 · 프린터 · 장비 상태를 받아 정비 수첩과 내 프린터에 이어요.</p></div>' +
      '<div class="hal-stats"><span>기기 <b>' + d.devices.length + '</b></span><span>🟢 연결됨 <b>' + live + '</b></span>' + (over ? '<span class="hot">⚠️ 기준 넘음 <b>' + over + '</b></span>' : '') + '<button class="hal-btn light" data-new>➕ 기기 연결</button></div></section>' +
      (d.devices.length ? '<div class="hal-grid">' + d.devices.map(card).join('') + '</div>' +
        '<p class="hal-note">🔒 받는 주소는 비밀번호와 같아요 — 남에게 보이지 마세요. 사이트가 내 집으로 접속하지 않고, 내 Home Assistant 가 보내는 값만 받아요.' + (d.config.maintenance ? ' · <a href="/maintenance?tab=drawer" data-go>🧵 필라멘트 서랍 보기</a>' : '') + '</p>'
        : '<section class="hal-start"><h2>세 걸음이면 돼요</h2><ol><li><b>① HACS 에서 「3ds 연결」 설치</b><span>단추 한 번으로 저장소가 들어가요</span></li><li><b>② 사이트 주소 · 연결 코드 붙여 넣기</b><span>복사 단추 두 번</span></li><li><b>③ HA 화면에서 센서 고르기</b><span>설정 글(YAML)을 쓸 필요 없어요</span></li></ol><button class="hal-btn pri big" data-new>➕ 첫 기기 연결하기</button></section>'));
    qa('[data-snap]').forEach(function (b) { snapLoad(b); b.onclick = function () { var u = SNAP[b.getAttribute('data-snap')]; if (u && u.url) modal('📷 ' + esc(find(b.getAttribute('data-snap')).name), '<img class="hal-snapbig" src="' + u.url + '" alt="">'); }; });
    qa('[data-new]').forEach(function (b) { b.onclick = function () { connectBox(); }; });
    qa('[data-edit]').forEach(function (b) { b.onclick = function () { form(find(b.getAttribute('data-edit'))); }; });
    qa('[data-yaml]').forEach(function (b) { b.onclick = function () { yamlBox(find(b.getAttribute('data-yaml'))); }; });
  }

  function copy(txt, btn) {
    var label = btn.textContent, done = function () { btn.textContent = '✔ 복사했어요'; setTimeout(function () { btn.textContent = label; }, 1600); };
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사하지 못했어요 — 글을 직접 골라 복사해 주세요.', true); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  }
  /** ➕ 기기 연결 — HACS 통합으로 (쉬움: HA 화면에서 센서를 고르면 끝) · 아니면 설정 글을 직접 붙여 넣기 */
  function connectBox() {
    var L = S.d.link, rp = String(L.repo).split('/'), my = 'https://my.home-assistant.io/redirect/';
    var row = function (label, val, key) { return '<div class="hal-copy"><span>' + label + '</span><code>' + esc(val) + '</code><button type="button" class="hal-btn sm pri" data-cp="' + key + '">📋 복사</button></div>'; };
    var ov = modal('➕ 기기 연결', '<section class="hal-sec"><h4><em>1</em> HACS 에서 「3ds 연결」 설치 <small>처음 한 번만</small></h4>' +
        '<div class="hal-row"><a class="hal-btn pri" target="_blank" rel="noopener" href="' + my + 'hacs_repository/?owner=' + encodeURIComponent(rp[0]) + '&repository=' + encodeURIComponent(rp[1] || '') + '&category=integration">🧩 내 Home Assistant 의 HACS 에서 열기</a></div>' +
        '<p class="hal-hint">열린 화면에서 <b>다운로드</b>를 누르고 Home Assistant 를 다시 시작해 주세요. 단추가 안 되면 HACS › 사용자 지정 저장소에 <code>https://github.com/' + esc(L.repo) + '</code> (종류: 통합)을 넣으면 돼요.</p></section>' +
      '<section class="hal-sec"><h4><em>2</em> 통합을 추가하고 아래 두 가지를 붙여 넣기</h4>' +
        '<div class="hal-row"><a class="hal-btn" target="_blank" rel="noopener" href="' + my + 'config_flow_start/?domain=g7_link">⚙️ 「3ds 연결」 통합 추가 열기</a></div>' + row('사이트 주소', L.site, 'site') + row('연결 코드', L.code, 'code') +
        '<p class="hal-hint">🔒 연결 코드는 비밀번호와 같아요. 새어 나갔으면 아래 「코드 새로 만들기」.</p></section>' +
      '<section class="hal-sec"><h4><em>3</em> Home Assistant 화면에서 붙일 곳 · 센서 고르기</h4><p class="hal-hint">필라멘트 보관함 · 내 프린터 · 업체 장비 · 그 밖 중에 고르고, 온도 · 습도 · 상태 센서를 목록에서 고르면 끝이에요. 기기를 더 붙일 때는 통합을 한 번 더 추가하면 돼요 (코드는 그대로). 조금 뒤 이 화면에 🟢 로 나타나요.</p></section>',
      { left: '<button type="button" class="hal-btn" data-rl>🔑 코드 새로 만들기</button><button type="button" class="hal-btn" data-manual>📝 HACS 없이 설정 글로</button>' });
    ov.addEventListener('click', function (ev) {
      var c = ev.target.closest('[data-cp]'); if (c) { copy(c.getAttribute('data-cp') === 'site' ? L.site : L.code, c); return; }
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
    var D = S.d, isNew = !d;
    d = d || { target: 'location', name: '', location: '', entities: {}, humidity_max: 40, temp_max: null, notify: true, snap_public: false };
    var e = d.entities, ent = function (k, label, ph) { return '<label>' + label + '<input name="ent_' + k + '" value="' + esc(e[k] || '') + '" placeholder="' + ph + '" autocapitalize="off" autocomplete="off" spellcheck="false"></label>'; };
    var tg = Object.keys(D.targets).filter(function (k) { return k === 'location' || k === 'other' || (k === 'printer' && D.printers.length) || (k === 'equipment' && D.equipment.length); });
    var html =
      '<section class="hal-sec"><h4><em>1</em> 무엇에 붙일까요?</h4><div class="hal-pick">' + tg.map(function (k) { return '<label><input type="radio" name="target" value="' + k + '"' + (d.target === k ? ' checked' : '') + '><span><i>' + ICON[k] + '</i>' + esc(D.targets[k]) + '</span></label>'; }).join('') + '</div>' +
        '<div data-for="location"><label>보관 위치 <small>필라멘트에 적은 「보관 위치」와 같게</small><input name="location" list="hal-locs" maxlength="40" value="' + esc(d.location || '') + '" placeholder="예: 드라이박스 · AMS · 서랍 2칸"><datalist id="hal-locs">' + D.locations.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></label></div>' +
        '<div data-for="printer"><label>내 프린터<select name="printer_id">' + D.printers.map(function (p) { return '<option value="' + p.id + '"' + (d.printer_id === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label></div>' +
        '<div data-for="equipment"><label>업체 장비<select name="equipment_id">' + D.equipment.map(function (x) { var c = D.companies.filter(function (y) { return y.id === x.company_id; })[0]; return '<option value="' + x.id + '"' + (d.equipment_id === x.id ? ' selected' : '') + '>' + esc((c ? c.name + ' — ' : '') + x.name) + '</option>'; }).join('') + '</select></label></div>' +
        '<label>이름 <small>비우면 위에서 고른 것</small><input name="name" maxlength="60" value="' + esc(d.name || '') + '" placeholder="예: 거실 드라이박스"></label></section>' +
      '<section class="hal-sec"><h4><em>2</em> Home Assistant 센서 이름</h4><p class="hal-hint">HA 의 <b>개발자 도구 › 상태</b>에서 보이는 이름이에요. 있는 것만 적으면 돼요.</p>' +
        '<div data-for="printer equipment other" class="hal-preset">빠르게 채우기: ' + Object.keys(PRESET).map(function (k) { return '<button type="button" class="hal-chip" data-preset="' + k + '">' + PRESET[k][0] + '</button>'; }).join('') + '</div>' +
        '<div class="hal-two">' + ent('hum', '💧 습도', 'sensor.drybox_humidity') + ent('temp', '🌡️ 온도', 'sensor.drybox_temperature') + '</div>' +
        '<div data-for="printer equipment other">' + ent('state', '⚙️ 상태 <small>프린터 상태 · 전원 스위치 · 플러그 — 가동 시간을 세요</small>', 'sensor.p1s_print_status 또는 switch.dryer') + '</div>' +
        '<div data-for="printer" class="hal-two">' + ent('progress', '진행률 (%)', 'sensor.p1s_print_progress') + ent('remaining', '남은 시간 (분)', 'sensor.p1s_remaining_time') + ent('job', '작업 이름', 'sensor.p1s_task_name') + '</div></section>' +
      '<section class="hal-sec"><h4><em>3</em> 알림 기준 <small>비우면 알리지 않아요</small></h4>' +
        '<div class="hal-two"><label>습도가 이보다 높으면 (%)<div class="hal-chips">' + [20, 30, 40, 50].map(function (v) { return '<button type="button" class="hal-chip" data-hm="' + v + '">' + v + '%</button>'; }).join('') + '</div><input name="humidity_max" type="number" min="1" max="100" inputmode="numeric" value="' + esc(d.humidity_max == null ? '' : d.humidity_max) + '" placeholder="안 알림"></label>' +
        '<label>온도가 이보다 높으면 (°C)<div class="hal-chips"></div><input name="temp_max" type="number" inputmode="numeric" value="' + esc(d.temp_max == null ? '' : d.temp_max) + '" placeholder="안 알림"></label></div>' +
        '<label class="hal-chk"><input type="checkbox" name="notify"' + (d.notify ? ' checked' : '') + '> 기준을 넘으면 알림 받기</label><p class="hal-hint">필라멘트는 보통 습도 20~40% 아래로 둬요 (나일론 · PVA 는 더 낮게).</p></section>' +
      '<section class="hal-sec"><h4><em>4</em> 카메라 사진 <small>HACS 통합에서 카메라를 골랐을 때</small></h4><label class="hal-chk"><input type="checkbox" name="snap_public"' + (d.snap_public ? ' checked' : '') + '> 🌐 사진을 다른 회원에게 공개</label><p class="hal-hint">끄면 나만 봐요 (기본). 켜면 사이트의 다른 화면(예: 내 프린터)에서 이 사진을 보일 수 있어요. 언제든 끌 수 있어요.</p></section>';
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
  var FIELDS = [['enabled', 'HA 연결 쓰기', 'bool'], ['menu_enabled', '헤더 메인 메뉴에 「HA 연결」 넣기 (홈 디자인 「메인 메뉴 보이기」와 같은 값)', 'bool'], ['menu_label', '헤더 메뉴 이름 (12글자까지)', 'text'],
    ['max_devices', '회원 한 명이 연결할 수 있는 기기', 'num'], ['interval_min', '값 보내는 주기 (분, 1~60) — 회원은 이보다 길게만 고를 수 있음', 'num'], ['keep_days', '온습도 기록을 며칠 둘지 (한 시간에 한 줄)', 'num'], ['stale_hours', '몇 시간 소식이 없으면 「끊김」', 'num'], ['alert_gap_hours', '같은 기기의 경고를 다시 보내기까지 (시간)', 'num'],
    ['notify_site', '기준을 넘으면 사이트 알림', 'bool'], ['notify_mail', '기준을 넘으면 메일도', 'bool'], ['snapshot', '카메라 사진 받기 (기기마다 최신 한 장 · 주인만 봄)', 'bool'], ['snap_gap_min', '사진을 받는 가장 짧은 간격 (분)', 'num'], ['printer_link', '내 프린터로 출력 상태 넘기기', 'bool'], ['company_link', '업체 보유 장비에 연결', 'bool'], ['hacs_repo', 'HACS 통합 저장소 (GitHub 주인/이름)', 'text'], ['timezone', '시간대 (예: Asia/Seoul)', 'text']];
  function renderAdmin() {
    api('GET', '/admin/settings').then(function (r) {
      var s = r.data.settings, st = r.data.stats;
      wrap('<section class="hal-hero"><div><h1>🏠 HA 연결 — 관리자</h1><p>회원 화면: <a href="' + BASE + '" target="_blank">' + BASE + '</a> · 회원 기기의 값 · 받는 주소는 관리자에게도 보이지 않아요</p></div><div class="hal-stats"><span>쓰는 회원 <b>' + n(st.users) + '</b></span><span>기기 <b>' + n(st.devices) + '</b></span><span>🟢 연결됨 <b>' + n(st.live) + '</b></span><span>기록 <b>' + n(st.readings) + '</b>줄</span></div></section>' +
        '<div class="hal-form">' + FIELDS.map(function (f) {
          return f[2] === 'bool' ? '<label class="hal-chk"><input type="checkbox" data-k="' + f[0] + '"' + (s[f[0]] ? ' checked' : '') + '> ' + esc(f[1]) + '</label>' : '<label>' + esc(f[1]) + '<input type="' + (f[2] === 'num' ? 'number' : 'text') + '" data-k="' + f[0] + '" value="' + esc(s[f[0]]) + '"></label>';
        }).join('') + '<p class="hal-hint full">서버 부담: 기기 하나가 위 「값 보내는 주기」마다 한 번(상태가 바뀔 때 한 번 더) 작은 값을 보내요 — 주기를 줄이면 요청이 그만큼 늘어요 (기기 100대 · 10분이면 한 시간에 600번, 1분이면 6,000번). 바꾼 주기는 회원의 Home Assistant 가 다시 시작하거나 통합을 다시 읽을 때 적용돼요 — 요청 하나에 조회 1 · 저장 1~3. 기록은 기기마다 한 시간에 한 줄만 남기고 위 날짜가 지나면 지워요. 받는 주소는 1분에 30번까지만 받아요.</p>' +
        '<div class="hal-acts full"><button class="hal-btn pri" id="hal-asave">저장</button></div></div>');
      q('#hal-asave').onclick = function () {
        var out = {}; qa('[data-k]').forEach(function (i) { out[i.getAttribute('data-k')] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; });
        api('PUT', '/admin/settings', { settings: out }).then(function (x) { toast(x.message || '저장했어요.'); }).catch(fail);
      };
    }).catch(function (e) { wrap('<div class="hal-empty">' + esc(e.message) + '</div>'); });
  }

  // ── 시작 ──
  function route() {
    if (S.root.hasAttribute('data-hal-admin')) return renderAdmin();
    wrap('<div class="hal-empty">불러오는 중…</div>');
    api('GET', '/me').then(function (r) { S.d = r.data; draw(); }).catch(function (e) {
      wrap(e.status === 401 ? '<section class="hal-hero"><div><h1>🏠 HA 연결</h1><p>Home Assistant 의 온습도 센서 · 프린터 · 장비 상태를 받아 정비 수첩과 내 프린터에 이어요.</p></div></section><div class="hal-empty">로그인하면 내 기기를 연결할 수 있어요. <a href="/login" data-go>로그인</a></div>' : '<div class="hal-empty">' + esc(e.message) + '</div>');
    });
  }
  function tick() {
    var root = document.querySelector('[data-hal-app],[data-hal-admin]');
    if (!root) { S.root = null; return; }
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
  // 화면을 켜 둔 동안 5분마다 값만 다시 받아 옴 (떠 있는 창이 없을 때 · 화면이 보일 때만)
  setInterval(function () { if (S.root && S.d && !S.root.hasAttribute('data-hal-admin') && !document.hidden && !document.querySelector('.hal-modal') && document.contains(S.root)) api('GET', '/me').then(function (r) { S.d = r.data; draw(); }).catch(function () {}); }, 300000);
})();
