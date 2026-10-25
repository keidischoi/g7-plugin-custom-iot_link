/*! custom-iot_link 1.15.0 — 📡 IoT 연결 (Home Assistant · SmartThings · Matter 온습도 · 기기 상태 받기) 화면 · 관리자 */
(function () {
  'use strict';
  if (window.__halApp) { window.__halApp.tick(); return; }
  var API = '/api/plugins/custom-iot_link', BASE = '/iot-link', V = '1.15.0';
  var S = { root: null, key: '', d: null, ret: null, deep: false, pickPrinter: 0 };

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
    return fetch((path.indexOf('/api/') === 0 ? '' : API) + path, { method: method, credentials: 'same-origin', headers: h, body: body ? JSON.stringify(body) : undefined }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) { if (!r.ok || d.success === false) { var e = new Error(d.message || (r.status === 401 ? '로그인이 필요해요.' : '요청에 실패했어요.')); e.status = r.status; e.data = d.data || null; throw e; } if (method !== 'GET') { try { if (BC) BC.postMessage({ t: 'iot', at: Date.now() }); } catch (er) {} } return d; });
    });
  }
  /* 1.7.20 🔄 같은 브라우저의 다른 탭(재고 관리 서랍 · 업체 재고)과 바로 맞춤 — 바꾸면 알리고, 알림을 받으면 새 값을 받음 */
  var BC = null; try { BC = new BroadcastChannel('g7-boxes'); } catch (e) {}
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
  /* 1.2.0 붙인 곳 — 이름 옆 작은 글(잘려서 안 보였음) 대신 카드 한 줄을 다 쓰는 색 띠로. 🖨️ 내 프린터면 누르면 프린터 라운지로, 그 밖에는 누르면 「고치기」 */
  var TO = { location: ['🧵', '보관함에 붙임'], printer: ['🖨️', '내 프린터에 붙임'], equipment: ['🏢', '업체 장비에 붙임'], other: ['📦', '아직 붙인 곳 없음'] };
  function toRow(d) {
    var t = TO[d.target] || TO.other, none = d.target === 'other', name = none ? S.d.targets.other : (d.where || S.d.targets[d.target] || '');
    var lost = !none && !d.where;   // 붙였던 프린터 · 장비가 지워짐
    var inner = '<i aria-hidden="true">' + t[0] + '</i><span><small>' + esc(lost ? '붙인 곳이 없어졌어요' : t[1]) + '</small><b>' + esc(name) + '</b></span>';
    if (d.target === 'printer' && !lost) return '<a class="hal-to to-printer" href="/my-printer" data-go title="프린터 라운지에서 보기">' + inner + '<em>프린터 라운지 →</em></a>';
    return '<button type="button" class="hal-to to-' + (lost ? 'other' : esc(d.target)) + '" data-edit="' + d.id + '" title="붙일 곳 바꾸기">' + inner + '<em>' + (none || lost ? '붙일 곳 정하기 →' : '바꾸기') + '</em></button>';
  }
  function card(d) {
    var st = d.source === 'smartthings', mt = d.source === 'matter', mq = d.source === 'mqtt', ne = st || mt || mq, hasHum = d.entities.hum || (ne && d.humidity != null), hasTemp = d.entities.temp || (ne && d.temp != null);   // 1.10.0 🧩 Matter 도 센서 이름 없이 값으로
    var hasEnv = hasTemp || hasHum, hasState = !!d.entities.state || (ne && !!d.state);
    // 1.1.0 위에 크게 보이는 온도 · 습도와 같은 줄은 센서 목록에서 뺌 (두 센서가 한 카드에 붙었으면 견줘 볼 수 있게 둠)
    var all = d.sensors || [], one = function (cap) { return all.filter(function (x) { return x.capability === cap; }).length === 1; };
    var sens = all.filter(function (x) { return !((x.capability === 'temperatureMeasurement' && hasTemp && one(x.capability)) || (x.capability === 'relativeHumidityMeasurement' && hasHum && one(x.capability))); });
    var stt = d.never ? '<span class="hal-dot wait"></span>값을 기다리는 중' : d.stale ? '<span class="hal-dot off" title="' + (mq ? '3ds MQTT 중계가 값을 안 보내요 — 그 PC 와 MQTT 브로커가 켜져 있는지 · 센서가 값을 올리는지 봐 주세요 (다시 보내면 저절로 풀려요)' : mt ? '3ds Matter 연결이 값을 안 보내요 — 그 PC · 라즈베리파이와 Matter 서버가 켜져 있는지 봐 주세요 (다시 보내면 저절로 풀려요)' : st || (d.sensors && d.sensors.length) ? 'SmartThings 가 값을 안 보냈어요 — 사이트가 15분마다 저절로 지금 값을 물어 다시 이어요 (바로 하려면 「🔄 다시 잇기」 · 기기가 꺼져 있으면 켜진 뒤 저절로)' : 'Home Assistant 가 값을 안 보내요 — HA 가 켜져 있고 인터넷에 이어져 있는지 봐 주세요 (다시 보내면 저절로 풀려요)') + '"></span>끊김 · ' + agoText(d.seen) : '<span class="hal-dot on"></span>' + agoText(d.seen);
    var rv = recvOf(d);   // 1.8.1 🎨
    return '<article class="hal-card' + (rv ? ' srv' : '') + (d.over ? ' over' : '') + (d.stale && !d.never ? ' stale' : '') + (S.sel && S.sel[d.id] ? ' picked' : '') + '"' + (rv ? ' style="--srv:' + rv.col + '"' : '') + '>' + recvTag(d) +
      '<header>' + (S.sel ? '<label class="hal-pick" title="고르기"><input type="checkbox" data-sel="' + d.id + '"' + (S.sel[d.id] ? ' checked' : '') + ' aria-label="' + esc(d.name) + ' 고르기"></label>' : '') + '<span class="hal-ico">' + ICON[d.target] + '</span><div><b>' + esc(d.name) + '</b><small>' + (mq ? '<span class="hal-badge mq">' + mqLogo() + ' MQTT</span>' : mt ? '<span class="hal-badge mt">' + mtLogo() + ' Matter</span>' : st || (d.sensors && d.sensors.length) ? '<span class="hal-badge">' + stLogo() + ' SmartThings</span>' : '<span class="hal-badge ha">' + haLogo() + ' Home Assistant</span>') + '</small></div><button class="hal-icobtn" data-edit="' + d.id + '" title="고치기" aria-label="고치기">✏️</button></header>' + toRow(d) +
      '<div class="hal-vals">' +
        (hasHum ? '<div class="' + (d.humidity_max != null && d.humidity != null && d.humidity > d.humidity_max ? 'hot' : '') + '"><i>💧</i><b>' + (d.humidity == null ? '–' : d.humidity) + '</b><u>%</u>' + (d.humidity_max != null ? '<small>기준 ' + d.humidity_max + '%</small>' : '') + '</div>' : '') +
        (hasTemp ? '<div class="' + (d.temp_max != null && d.temp != null && d.temp > d.temp_max ? 'hot' : '') + '"><i>🌡️</i><b>' + (d.temp == null ? '–' : d.temp) + '</b><u>°C</u>' + (d.temp_max != null ? '<small>기준 ' + d.temp_max + '°C</small>' : '') + '</div>' : '') +
        (hasState ? '<div class="st' + (d.is_on ? ' run' : '') + '"><i>' + (d.is_on ? '⚙️' : '⏸') + '</i><b>' + (d.is_on ? '가동 중' : '쉬는 중') + '</b><small>' + (d.state ? esc(d.state) + ' · ' : '') + '30일 ' + d.hours_30d + '시간</small></div>' : '') +
      '</div>' + (d.snap_at ? '<button type="button" class="hal-snap" data-snap="' + d.id + '" data-at="' + esc(d.snap_at) + '" title="크게 보기"><span>📷 ' + esc(agoText(d.snap_at)) + ' · ' + (d.snap_public ? '🌐 공개' : '🔒 나만') + '</span></button>' : '') + (hasEnv ? spark(d) : '') + sensList(sens, 6) +
      (d.over ? '<p class="hal-warn">⚠️ 기준을 넘었어요' + (d.target === 'location' ? ' — 여기 둔 필라멘트 건조를 챙겨 주세요' : '') + '</p>' : '') +
      '<footer><span class="hal-st">' + stt + '</span>' + ((st || (d.sensors && d.sensors.length)) && d.stale ? '<button type="button" class="hal-btn sm pri" data-revive>🔄 다시 잇기</button>' : st ? '<small class="hal-hint">값이 바뀌면 바로 들어와요</small>' : '<button class="hal-btn sm" data-yaml="' + d.id + '">📋 설정 글</button>') + '</footer></article>';
  }
  /* 1.4.5 ☑️ 여러 개 지우기 — 체크 박스로 고르고 한 번에. 고른 것(S.sel)은 화면을 새로 그려도 남음 */
  /* 1.4.6 📁 분류 — 🛠 장비 · 📦 개인 재고 · 🏢 업체마다 · ❓ 미분류 (회원이 고른 것 · 없으면 붙인 곳 따라) */
  function groups() {
    var d = S.d, out = [['equip', '🛠', '장비', '내 프린터 · 내 장비'], ['mine', '📦', '개인 재고', '내 필라멘트 · 레진 보관함']];
    var seenC = {};   // 1.5.0 속한 업체 모두 (직원은 보기만)
    (d.companies || []).concat(d.member_companies || []).forEach(function (c) { if (seenC[c.id]) return; seenC[c.id] = 1; out.push(['c' + c.id, '🏢', c.name, '업체 장비 · 업체 프린터 · 업체 재고']); });
    out.push(['none', '❓', '미분류', '아직 분류하지 않은 센서']);
    return out;
  }
  function grpName(k) { var g = groups().filter(function (x) { return x[0] === k; })[0]; return g ? g[1] + ' ' + g[2] : ''; }
  function grpOpts(cur, auto) { return (auto ? '<option value="">🔄 자동 (붙인 곳 따라' + (auto === 'new' ? '' : ' — ' + esc(grpName(auto))) + ')</option>' : '') + groups().map(function (g) { return '<option value="' + g[0] + '"' + (cur === g[0] ? ' selected' : '') + '>' + g[1] + ' ' + esc(g[2]) + '</option>'; }).join(''); }
  /* 1.4.6 보기 — 고른 분류(전체 · 분류 하나) · 모양(▦ 카드 · ☰ 한 줄 · ▬ 배너) 기억 */
  function pref(k, def) { try { return localStorage.getItem('hal:' + k) || def; } catch (e) { return def; } }
  function setPref(k, v) { try { localStorage.setItem('hal:' + k, v); } catch (e) {} }
  var VIEWS = [['card', '▦', '카드'], ['row', '☰', '한 줄'], ['banner', '▬', '배너'], ['board', '📦', '보드']];   // 1.6.0 📦 보관함 보드
  /* 1.4.8 💳 센서 칸 사기 — 1개 · 10개 묶음 · 코인 · 마일리지 · 나 또는 내 업체 */
  /* 1.8.3 💳 개수를 정해 살 때 값 — 서버(Points::total)와 같은 셈: 10개마다 묶음 값(있으면) + 나머지는 1개 값 */
  function slotTotal(c, q) { var one = +c.unit || 0, ten = +c.pack || 0, packs = ten > 0 ? Math.floor(q / 10) : 0, rest = q - packs * 10; return rest > 0 && one <= 0 ? 0 : packs * ten + rest * one; }
  function slotFmt(c, v) { var p = (c.prices || [])[0]; var unit = p && /[^\d,\s]+$/.test(p.text) ? p.text.match(/[^\d,\s]+$/)[0] : (c.key === 'coin' ? 'C' : 'P'); return n(v) + unit; }
  function slotBtnText(c, q) { var t = slotTotal(c, q); return t > 0 ? '센서 ' + q + '개 사기 · ' + slotFmt(c, t) : '이 개수는 살 수 없어요'; }
  /* 1.8.6 📊 칸 그림 — 기본 칸 · 💳 구매한 칸 · 채움 = 쓰는 칸 · 빈 칸 = 남은 칸 · 넘은 만큼은 빨강 · 끝에 ＋ 칸 추가(판매 중) */
  function slotGauge(u, selling) {
    var used = +u.used || 0, b = +u.bought || 0;
    if (u.unlimited) {   // 1.9.1 무제한도 쓰는 칸은 그림으로 (끝에 ∞)
      var uc = ''; for (var k = 0; k < Math.min(used, 60); k++) uc += '<i class="c on" title="쓰는 칸"></i>';
      return '<div class="hal-gauge"><div class="hal-gauge-h"><b>' + esc(u.label) + '</b><small>무제한 (관리자) · 사용 <b>' + used + '</b>칸' + (b ? ' · 💳 구매 ' + b + '칸' : '') + '</small></div><div class="hal-gauge-c">' + uc + (used > 60 ? '<small>+' + (used - 60) + '</small>' : '') + '<span class="c inf" title="관리자는 한도가 없어요">∞</span></div></div>';
    }
    var base = +u.base || 0, tot = base + b, left = Math.max(0, tot - used), over = Math.max(0, used - tot), MAX = 60, cells = '';
    if (tot + over <= MAX) {
      for (var i = 0; i < tot; i++) cells += '<i class="c' + (i >= base ? ' buy' : '') + (i < used ? ' on' : '') + '" title="' + (i >= base ? '💳 구매한 칸' : '기본 칸') + ' · ' + (i < used ? '쓰는 중' : '남음') + '"></i>';
      for (var j = 0; j < over; j++) cells += '<i class="c over on" title="한도를 넘어 붙어 있는 기기"></i>';
    } else cells = '<span class="hal-gauge-bar"><i style="width:' + Math.min(100, Math.round(used * 100 / Math.max(1, tot))) + '%"></i></span>';
    if (selling) cells += '<button type="button" class="c add" data-slot-add title="칸 더 사기">＋</button>';
    return '<div class="hal-gauge"><div class="hal-gauge-h"><b>' + esc(u.label) + '</b><small>전체 <b>' + tot + '</b>칸 (기본 ' + base + (b ? ' + 💳 구매 ' + b : '') + ') · 사용 <b>' + used + '</b> · 남은 <b>' + left + '</b>' + (over ? ' · <span class="hal-over">⚠️ ' + over + '칸 넘음</span>' : '') + '</small></div><div class="hal-gauge-c">' + cells + '</div></div>';
  }
  /* 1.9.1 칸 줄을 줄 끝까지 — 가진 칸 · ＋ 뒤로 흐린 칸(아직 없는 칸)을 채워 한 줄이 꽉 차게 (너비가 바뀌면 다시) */
  function slotFill(ov) {
    var fill = function () {
      Array.prototype.forEach.call(ov.querySelectorAll('.hal-gauge-c'), function (c) {
        Array.prototype.forEach.call(c.querySelectorAll('.c.ghost'), function (g) { g.remove(); });
        var items = c.querySelectorAll('.c'); if (!items.length || c.querySelector('.c.inf')) return;   // 1.9.4 무제한(∞) 줄은 채우지 않음
        var w = c.clientWidth, cell = 22, per = Math.max(1, Math.floor((w + 4) / cell)), n = 0;
        Array.prototype.forEach.call(items, function (i) { n += Math.max(1, Math.ceil((i.offsetWidth + 4) / cell - 0.05)); });
        var need = (per - (n % per)) % per; if (n < per) need = per - n;
        var buy = !!c.querySelector('.c.add');   // 1.9.2 판매 중이면 가진 칸 뒤 모두 ＋ (누르면 사기 칸으로)
        for (var k = 0; k < need; k++) { var g = document.createElement(buy ? 'button' : 'i'); g.className = 'c ghost' + (buy ? ' add' : ''); if (buy) { g.type = 'button'; g.textContent = '＋'; g.setAttribute('data-slot-add', ''); g.title = '칸 더 사기'; } else g.title = '아직 없는 칸'; c.appendChild(g); }
        var add = c.querySelector('.c.add'); if (add) c.appendChild(add);   // 줄 맨 끝 칸 = ＋ 추가 구매
      });
    };
    setTimeout(fill, 0);
    var t = 0; var onR = function () { clearTimeout(t); t = setTimeout(fill, 120); }; window.addEventListener('resize', onR);
    var mo = new MutationObserver(function () { if (!document.contains(ov)) { window.removeEventListener('resize', onR); mo.disconnect(); } }); mo.observe(document.body, { childList: true });
  }
  function slotBox() {
    var T = S.d.slots || {};
    if (!T.enabled) return;
    var tg = T.targets || [], cur = T.currencies || [];
    var mode = T.mode === 'monthly' ? '달마다 결제 (자동 연장 · 끄면 기한까지)' : '한 번 사면 계속';
    var html = ((T.usage || []).length ? '<div class="hal-gauges">' + T.usage.map(function (u) { return slotGauge(u, T.selling !== false); }).join('') + '<p class="hal-gauge-k"><i class="c"></i>남은 칸 <i class="c on"></i>쓰는 칸 <i class="c buy"></i>💳 구매한 칸' + (T.selling === false && !T.exempt ? ' · 지금은 팔지 않아요' : '') + '</p></div>' : '') + (T.selling === false ? '<p class="hal-hint">' + (T.exempt ? '관리자는 기기 수 한도에서 빠져서 칸을 살 필요가 없어요. 아래는 지금까지 구매한 칸이에요.' : '지금은 센서 칸을 팔지 않아요. 아래는 지금까지 구매한 칸이에요.') + '</p>' :   // 1.8.4
      '<p class="hal-hint">기기 수 한도를 넘어 센서를 더 붙이려면 칸을 사요 — <b>' + mode + '</b>. 칸이 끝나도 붙인 기기는 지우지 않아요 (새로 붙이는 것만 막혀요).</p>' +
      (tg.length > 1 ? '<label>어디에 쓸까요<select data-slot-for>' + tg.map(function (t) { return '<option value="' + esc(t.key) + '">' + esc(t.label) + '</option>'; }).join('') + '</select></label>' : '') +
      (cur.length ? cur.map(function (c) {
        return '<div class="hal-slotc"><div class="hal-slotc-h"><b>' + esc(c.label) + '</b><small>' + (c.balance != null ? '내 잔액 ' + n(c.balance) : '') + (c.charge_url ? ' · <a href="' + esc(c.charge_url) + '" data-go>충전하기 →</a>' : '') + '</small></div>' +
          '<div class="hal-slotc-b"><small class="hal-slot-price">' + c.prices.map(function (pr) { return pr.n + '개 ' + esc(pr.text) + (pr.n > 1 ? ' (1개당 ' + n(Math.round(pr.price / pr.n)) + ')' : ''); }).join(' · ') + '</small>' +   // 1.8.3 개수를 정해 사기
          '<span class="hal-slot-qty"><button type="button" class="hal-btn sm" data-qty-step="-1" data-cur="' + c.key + '" aria-label="하나 빼기">−</button><input type="number" min="1" max="' + (T.max_qty || 100) + '" value="1" data-slot-qty="' + c.key + '" aria-label="살 개수"><button type="button" class="hal-btn sm" data-qty-step="1" data-cur="' + c.key + '" aria-label="하나 더하기">＋</button></span>' +
          '<button type="button" class="hal-btn pri" data-slot-buy="' + c.key + '">' + slotBtnText(c, 1) + '</button></div></div>';
      }).join('') : '<p class="hal-warn">지금 쓸 수 있는 결제 수단이 없어요 (코인 · 마일리지 확장이 꺼져 있거나 값이 정해지지 않았어요).</p>')) +
      ((T.slots || []).length ? '<h4 class="hal-slot-t">구매한 칸</h4><ul class="hal-slotl">' + T.slots.map(function (x) {
        var st = x.status === 'active' ? (x.expires_at ? '🟢 ' + x.expires_at.slice(0, 10) + '까지' : '🟢 계속') : x.status === 'cancelled' ? '↩️ 취소함' : '⚪ 끝남', cx = x.cancel || {};
        return '<li' + (x.status === 'cancelled' ? ' class="off"' : '') + '><b>' + esc(x.for) + ' · 센서' + (x.size ? ' ' + x.size + '개' : '') + '</b><span>' + (x.status === 'cancelled' && /^0[^0-9]*$/.test(x.amount_text || '') ? '' : esc(x.amount_text) + ' · ') + st + '</span>' +   // 1.9.0 취소한 칸은 흐리게 (예전에 0개 · 0원으로 남은 것은 숫자 빼고)
          (x.mine && x.status === 'active' ? (cx.n > 0 ? '<button type="button" class="hal-btn sm" data-slot-cancel="' + x.id + '" data-max="' + cx.n + '" data-size="' + x.size + '" title="안 쓴 칸 ' + cx.n + '개까지 취소 · 낸 값의 몫을 돌려받아요 (산 뒤 ' + (T.cancel_days || 0) + '일 안)">↩️ 취소</button>' : (cx.why ? '<small class="hal-mute">취소 못 함 — ' + esc(cx.why) + '</small>' : '')) : '') + (x.mode === 'monthly' && x.status === 'active' && x.mine ? '<label class="hal-chk"><input type="checkbox" data-slot-auto="' + x.id + '"' + (x.auto_renew ? ' checked' : '') + '> 자동 연장</label>' : '') + '</li>';
      }).join('') + '</ul>' : '');
    var ov = modal(T.selling === false ? '💳 구매한 센서 칸' : '💳 센서 칸 늘리기', html);
    slotFill(ov);
    var curOf = function (k) { return cur.filter(function (c) { return c.key === k; })[0] || {}; };
    var qtyOf = function (k) { var i = ov.querySelector('[data-slot-qty="' + k + '"]'); var v = Math.round(+(i && i.value) || 1); return Math.max(1, Math.min(T.max_qty || 100, v)); };
    var redrawBtn = function (k) { var bb = ov.querySelector('[data-slot-buy="' + k + '"]'); if (bb) { bb.textContent = slotBtnText(curOf(k), qtyOf(k)); bb.disabled = slotTotal(curOf(k), qtyOf(k)) <= 0; } };
    ov.addEventListener('input', function (ev) { var i = ev.target.closest('[data-slot-qty]'); if (i) redrawBtn(i.getAttribute('data-slot-qty')); });
    ov.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-slot-add]')) { var qi = ov.querySelector('[data-slot-qty]'); if (qi) { qi.scrollIntoView({ block: 'center', behavior: 'smooth' }); qi.focus(); qi.select(); } return; }   // 1.8.6 ＋ 칸 추가
      var stp = ev.target.closest('[data-qty-step]');
      if (stp) { var k = stp.getAttribute('data-cur'), i = ov.querySelector('[data-slot-qty="' + k + '"]'); i.value = Math.max(1, Math.min(T.max_qty || 100, qtyOf(k) + +stp.getAttribute('data-qty-step'))); redrawBtn(k); return; }
      var cb = ev.target.closest('[data-slot-cancel]');
      if (cb) {   // 1.8.3 ↩️ 취소 — 여러 개면 몇 개를 취소할지
        var max = +cb.getAttribute('data-max'), size = +cb.getAttribute('data-size'), q = max;
        if (size > 1) { var a = prompt('몇 개를 취소할까요? (안 쓴 칸 ' + max + '개까지)', String(max)); if (a == null) return; q = Math.round(+a); if (!(q >= 1 && q <= max)) { toast('1 ~ ' + max + ' 사이로 적어 주세요.', true); return; } }
        else if (!confirm('센서 칸 1개를 취소할까요? 낸 값을 돌려받아요.')) return;
        cb.disabled = true;
        api('POST', '/slots/' + cb.getAttribute('data-slot-cancel') + '/cancel', { n: q }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); }).catch(function (e) { cb.disabled = false; fail(e); });
        return;
      }
      var b = ev.target.closest('[data-slot-buy]'); if (!b) return;
      var f = ov.querySelector('[data-slot-for]'), forv = f ? f.value : 'me', k2 = b.getAttribute('data-slot-buy'), c2 = curOf(k2), q2 = qtyOf(k2);
      if (!confirm((f ? f.options[f.selectedIndex].text + ' — ' : '') + slotBtnText(c2, q2).replace('사기 · ', '· ') + ' 을(를) 살까요?')) return;
      b.disabled = true;
      api('POST', '/slots/buy', { currency: k2, n: q2, for: forv }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); ov.__close(); })
        .catch(function (e) {
          b.disabled = false;
          if (e.data && e.data.reason === 'insufficient' && c2.charge_url) {   // 1.8.3 모자라면 충전하러 갈지
            var need = slotTotal(c2, q2), have = c2.balance;
            if (confirm(e.message + (have != null ? '\n(필요 ' + slotFmt(c2, need) + ' · 내 잔액 ' + slotFmt(c2, have) + ')' : '') + '\n\n충전하러 갈까요?')) { ov.__close(); go(c2.charge_url); }
            return;
          }
          fail(e);
        });
    });
    ov.addEventListener('change', function (ev) {
      var a = ev.target.closest('[data-slot-auto]'); if (!a) return;
      api('PUT', '/slots/' + a.getAttribute('data-slot-auto'), { auto_renew: a.checked }).then(function (r) { toast(r.message); S.d = r.data.overview; }).catch(function (e) { a.checked = !a.checked; fail(e); });
    });
  }
  /* 1.4.7 무한 스크롤 — 처음 PAGE 개 · 끝에 닿으면 PAGE 개씩 더 (분류 · 출처 · 모양을 바꾸면 처음부터) */
  var PAGE = 24;
  function moreBind() {
    if (S.io) { try { S.io.disconnect(); } catch (e) {} S.io = null; }
    var m = q('[data-more]'); if (!m) return;
    if (typeof IntersectionObserver === 'undefined') { m.outerHTML = '<button type="button" class="hal-btn hal-more-btn" data-more-btn>더 보기</button>'; var b = q('[data-more-btn]'); if (b) b.onclick = function () { S.lim = (S.lim || PAGE) + PAGE; redraw(); }; return; }
    S.io = new IntersectionObserver(function (es) { if (es[0] && es[0].isIntersecting) { S.io.disconnect(); S.lim = (S.lim || PAGE) + PAGE; redraw(); } }, { rootMargin: '600px' });
    S.io.observe(m);
  }
  /* 1.4.7 출처 — 🏠 Home Assistant · SmartThings · 1.10.0 🧩 Matter(3ds 연결) (카드의 배지와 같은 기준) */
  function srcOf(x) { return x.source === 'smartthings' || (x.sensors && x.sensors.length) ? 'st' : x.source === 'matter' ? 'mt' : x.source === 'mqtt' ? 'mq' : 'ha'; }   // 1.15.0 📨 MQTT
  function srcPick() { var v = pref('src', 'all'); return v === 'ha' || v === 'st' || v === 'mt' || v === 'mq' ? v : 'all'; }
  var MT_REPO = 'https://github.com/keidischoi/matter-3ds-link';   // 1.10.0 🧩 3ds Matter 연결 (라즈베리파이 · 리눅스 · 윈도우 python)
  /* 1.11.0 🪟 윈도우 한 줄 — PowerShell 만 (MprLink 와 같은 방식) · Matter 서버 주소는 이 브라우저에 기억 · 센서마다 사이트 기기는 연결 코드로 저절로 */
  function mtAddr() { return String(pref('mtaddr', '')).trim(); }
  function mtOs() { var v = pref('mtos', ''); if (v === 'win' || v === 'sh') return v; return /Win/i.test(navigator.platform || navigator.userAgent) ? 'win' : 'sh'; }   // 1.12.0 이 PC 에 맞게 먼저
  function mtLine(addr, os) {
    var L = S.d.link || {}, a = String(addr == null ? mtAddr() : addr).trim().replace(/[^A-Za-z0-9.:\[\]\/-]/g, ''), sh = (os || mtOs()) === 'sh';
    var u = (L.site || location.origin) + API + '/mt/' + (L.code || '') + (sh ? '.sh' : '.ps1') + (a ? '?matter=' + encodeURIComponent(a) : '');
    return sh ? 'curl -fsSL "' + u + '" | bash' : 'irm "' + u + '" | iex';
  }
  function mtWin(os) {
    os = os || mtOs();
    var sh = os === 'sh';
    return '<section class="hal-sec hal-mtwin" data-mtos="' + os + '"><h4>' + mtLogo() + ' 중계 설치 <small>한 줄 · 따로 깔 것 없음</small></h4>' +
      '<div class="hal-seg hal-mtos" role="tablist"><button type="button" role="tab" data-mt-os="win" class="' + (sh ? '' : 'on') + '" aria-selected="' + !sh + '">🪟 윈도우</button><button type="button" role="tab" data-mt-os="sh" class="' + (sh ? 'on' : '') + '" aria-selected="' + sh + '">🐧 리눅스 · 🍎 맥 · 🍓 라즈베리파이</button></div>' +
      '<label>Matter 서버 주소 <small>HA 의 Matter Server 애드온이면 HA 의 IP · 비우면 설치 때 물어봐요</small><input data-mt-addr value="' + esc(mtAddr()) + '" placeholder="예: 192.168.0.10" autocapitalize="off" autocomplete="off" spellcheck="false"></label>' +
      '<div class="hal-copy"><span>' + (sh ? '터미널' : 'PowerShell') + '</span><code data-mt-line>' + esc(mtLine(null, os)) + '</code><button type="button" class="hal-btn sm pri" data-mt-cp>📋 복사</button></div>' +
      '<ol class="hal-stc-steps"><li><em>1</em>' + (sh ? '<b>터미널</b> 열기 (라즈베리파이는 SSH 도 돼요)' : '시작 › <b>PowerShell</b> 열기') + '</li><li><em>2</em>붙여 넣고 Enter</li><li><em>3</em>공유 코드 적기 (건너뛰어도 돼요)</li></ol>' +
      '<p class="hal-hint">늘 켜 두는 기기에 · 켤 때마다 저절로 시작해요' + (sh ? ' (python3 기본 기능만 · systemd · crontab · 맥은 launchd)' : '') + '. 🔒 한 줄에 내 연결 코드가 들어 있어요 (남에게 보이지 마세요).</p></section>';
  }
  function mtWinBind(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-mt-addr]'), function (inp) {
      inp.oninput = function () { setPref('mtaddr', inp.value.trim()); var box = inp.closest('.hal-mtwin'), c = box && box.querySelector('[data-mt-line]'); if (c) c.textContent = mtLine(inp.value, box.getAttribute('data-mtos')); };
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-mt-cp]'), function (b) { b.onclick = function () { var box = b.closest('.hal-mtwin'), inp = box && box.querySelector('[data-mt-addr]'); copy(mtLine(inp ? inp.value : null, box && box.getAttribute('data-mtos')), b); }; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-mt-os]'), function (b) { b.onclick = function () { var os = b.getAttribute('data-mt-os'), box = b.closest('.hal-mtwin'); setPref('mtos', os); if (!box) return; var t = document.createElement('div'); t.innerHTML = mtWin(os); var nb = t.firstChild; box.parentNode.replaceChild(nb, box); mtWinBind(nb.parentNode); }; });   // 1.12.0 운영체제 고르기 (이 브라우저에 기억)
  }
  /* 1.12.0 Matter 로고 (공식 심볼 — 세 갈래). 그림 파일 없이 SVG 한 줄 · 색은 글자색을 따름(어두운 테마에서도 보이게). 상표는 Connectivity Standards Alliance 의 것 — 연결 대상 표시로만 씀
   *   심볼 모양 출처: Wikimedia Commons 「Logo of Matter connectivity standard.svg」 (퍼블릭 도메인 · 상표) — 글자 부분을 빼고 심볼만 */
  var MT_PATH = 'M65.715 32.905c-7.996 2.19-15.164 7.406-19.636 15.152s-5.407 16.568-3.306 24.587l7.835-4.526a23.9 23.9 0 0 1 1.105-11.836l18.309 10.569 4.303-2.487v-4.967L56.016 48.829a23.92 23.92 0 0 1 9.699-6.879zM8.607 32.905v9.045a23.91 23.91 0 0 1 9.699 6.879L0 59.398v4.967l4.303 2.487 18.306-10.569c1.39 3.868 1.726 7.938 1.108 11.836l7.832 4.526c2.101-8.02 1.167-16.841-3.306-24.587A32.52 32.52 0 0 0 8.607 32.905zM37.161 0l-4.303 2.484v21.138c-4.046-.731-7.736-2.476-10.804-4.961l-7.838 4.522c5.895 5.83 14 9.429 22.946 9.429s17.051-3.599 22.946-9.429l-7.835-4.522a23.92 23.92 0 0 1-10.807 4.961V2.484z';
  function mtLogo(cls) { return '<svg class="hal-stl hal-mtl' + (cls ? ' ' + cls : '') + '" viewBox="0 0 74.322 72.644" aria-hidden="true" focusable="false"><path fill="currentColor" d="' + MT_PATH + '"/></svg>'; }
  /* 1.5.0 🏢 내 기기 · 업체 기기 따로 — 업체 장비 · 업체 프린터에 붙인 기기는 업체 대표 · 관리자가 함께 고치고, 직원은 보기만 */
  function hasCo() { return !!((S.d.member_companies || []).length || (S.d.companies || []).length || S.d.devices.some(function (x) { return x.company_id; })); }
  function scope() { if (pref('scope', '') === 'map') return 'map'; if (!hasCo()) return 'all'; var v = pref('scope', ''); if (!v) { v = new URLSearchParams(location.search).get('scope') === 'company' ? 'company' : 'mine'; } return v === 'company' ? 'company' : v === 'all' ? 'all' : 'mine'; }   // 1.7.6 📡 전체
  /* 1.8.0 🏢 업체가 여럿이면 그 업체만 · 🏠 HA 서버가 여럿이면 그 서버만 (이 브라우저에 기억) */
  function coList() {
    var m = {}, out = [];
    (S.d.companies || []).concat(S.d.member_companies || []).forEach(function (c) { if (c && c.id && !m[c.id]) { m[c.id] = 1; out.push({ id: +c.id, name: c.name || '업체' }); } });
    S.d.devices.forEach(function (x) { if (x.company_id && !m[x.company_id]) { m[x.company_id] = 1; out.push({ id: +x.company_id, name: '업체 ' + x.company_id }); } });
    return out;
  }
  function coPick() { var v = +pref('co', 0) || 0; return v && coList().some(function (c) { return c.id === v; }) ? v : 0; }
  function haServers() {
    var m = {}, out = [];
    S.d.devices.forEach(function (x) { if (srcOf(x) !== 'ha') return; var k = x.ha_server || ''; if (!m[k]) { m[k] = { id: k, name: x.ha_server_name || (k ? 'Home Assistant' : '서버 이름 없음 (예전 통합)'), n: 0 }; out.push(m[k]); } m[k].n++; });
    out.sort(function (a, b) { return (a.id === '') - (b.id === '') || b.n - a.n || a.name.localeCompare(b.name, 'ko'); });
    var seen = {}; out.forEach(function (x) { seen[x.name] = (seen[x.name] || 0) + 1; });   // 이름이 겹치면 「이름 #번호」
    out.forEach(function (x, i) { x.label = x.id && seen[x.name] > 1 ? x.name + ' #' + (i + 1) : x.name; });
    return out;
  }
  /* 1.8.1 🎨 받는 곳(HA 서버마다 · SmartThings)마다 색 · 짧은 표식 — 칩 · 카드 · 탭 · 대기 칸이 같은 색 (받는 곳이 둘 이상일 때만) */
  var SRV_COL = ['#f97316', '#a855f7', '#22c55e', '#e11d48', '#eab308', '#14b8a6', '#6366f1', '#db2777', '#84cc16', '#0891b2'];
  function recvs() {
    var out = haServers().map(function (v, i) { var nm = String(v.name || '').replace(/\s*(home\s*assistant|ha)\s*$/i, '').trim(); return { key: 'ha:' + v.id, col: SRV_COL[i % SRV_COL.length], short: v.id ? (nm ? nm.slice(0, 5) + (v.label !== v.name ? v.label.slice(v.name.length) : '') : 'HA' + (i + 1)) : '이름 없음', label: v.label }; });
    if (S.d.devices.some(function (x) { return srcOf(x) === 'st'; })) out.unshift({ key: 'st', col: '#1d4ed8', short: 'ST', label: 'SmartThings' });
    if (S.d.devices.some(function (x) { return srcOf(x) === 'mt'; })) out.push({ key: 'mt', col: '#0f766e', short: 'Matter', label: 'Matter (3ds 연결)' });   // 1.10.0 🧩
    if (S.d.devices.some(function (x) { return srcOf(x) === 'mq'; })) out.push({ key: 'mq', col: '#7c3aed', short: 'MQTT', label: 'MQTT (3ds 중계)' });   // 1.15.0 📨
    return out;
  }
  function recvKey(x) { var s = srcOf(x); return s === 'ha' ? 'ha:' + (x.ha_server || '') : s; }
  function recvOf(x) { var k = recvKey(x); var r = recvs(); return r.length > 1 ? r.filter(function (v) { return v.key === k; })[0] || null : null; }
  function recvTag(x) { var r = recvOf(x); return r ? '<em class="hal-srvtag" style="--srv:' + r.col + '" title="' + esc(r.label) + ' 에서 옴">' + esc(r.short) + '</em>' : ''; }
  function recvDot(key) { var r = recvs(); if (r.length < 2) return ''; var v = r.filter(function (y) { return y.key === key; })[0]; return v ? '<i class="hal-srvdot" style="--srv:' + v.col + '" aria-hidden="true"></i>' : ''; }
  function srvLabel(x) { var k = x.ha_server || ''; var s = haServers().filter(function (v) { return v.id === k; })[0]; return s ? s.label : 'Home Assistant'; }
  function srvPick() { var v = pref('hasrv', 'all'); return v === 'all' || !haServers().some(function (s) { return s.id === v; }) ? 'all' : v; }
  function inScope(x) { var sc = scope(), cp = coPick(); return (sc === 'all' || sc === 'map' || (sc === 'company' ? !!x.company_id : !x.company_id)) && (!cp || sc === 'mine' || !x.company_id || +x.company_id === cp); }
  function scopeBar() {
    var sc = scope(), nm = S.d.devices.filter(function (x) { return !x.company_id; }).length, nc = S.d.devices.length - nm;
    var mapTab = '<button type="button" role="tab" data-scope="map" class="' + (sc === 'map' ? 'on' : '') + '" title="받는 곳 → 기기 → 붙인 곳 → 이어지는 확장">🗺️ 연결 지도</button>';   // 1.7.0
    if (!hasCo()) return '<div class="hal-scope" role="tablist" aria-label="보기"><button type="button" role="tab" data-scope="all" class="' + (sc !== 'map' ? 'on' : '') + '">📡 기기 <small>' + S.d.devices.length + '</small></button>' + mapTab + '</div>';
    return '<div class="hal-scope" role="tablist" aria-label="기기 범위"><button type="button" role="tab" data-scope="all" class="' + (sc === 'all' ? 'on' : '') + '">📡 전체 <small>' + S.d.devices.length + '</small></button><button type="button" role="tab" data-scope="mine" class="' + (sc === 'mine' ? 'on' : '') + '">👤 내 기기 <small>' + nm + '</small></button>' +
      '<button type="button" role="tab" data-scope="company" class="' + (sc === 'company' ? 'on' : '') + '">🏢 업체 기기 <small>' + nc + '</small></button>' + mapTab + '</div>' +
      (sc !== 'mine' && sc !== 'map' && coList().length > 1 ? '<div class="hal-gf hal-cos" role="tablist" aria-label="업체">' + [{ id: 0, name: '모든 업체' }].concat(coList()).map(function (c) { var on = coPick() === c.id, n = c.id ? S.d.devices.filter(function (x) { return +x.company_id === c.id; }).length : nc; return '<button type="button" role="tab" data-co="' + c.id + '" class="' + (on ? 'on' : '') + '" aria-selected="' + on + '"><i aria-hidden="true">🏢</i>' + esc(c.name) + '<em>' + n + '</em></button>'; }).join('') + '</div>' : '') +   // 1.8.0
      (sc === 'company' ? '<p class="hal-hint">🏢 업체 장비 · 업체 프린터에 붙인 기기 — 그 업체 대표 · 관리자가 함께 고치고, 직원은 보기만 해요. 기록 보관은 🏢 내 업체 › 📡 IoT 연결 칸에서 더 짧게 정할 수 있어요.</p>' : '');
  }
  function shown() { var sp = srcPick(), sv = srvPick(); return S.d.devices.filter(function (x) { return inScope(x) && (sp === 'all' || srcOf(x) === sp) && (sv === 'all' || (srcOf(x) === 'ha' && (x.ha_server || '') === sv)); }); }
  function tools() {
    var d = S.d, gf = pref('gf', 'all'), vw = pref('view', 'card'), cnt = {}, sp = srcPick(), sc = { ha: 0, st: 0, mt: 0, mq: 0 };
    d.devices.forEach(function (x) { sc[srcOf(x)]++; });
    var srcRow = (!!sc.ha + !!sc.st + !!sc.mt + !!sc.mq) > 1 || sp !== 'all' ? '<div class="hal-gf hal-src" role="tablist" aria-label="출처">' + [['all', '📡', '모든 출처', d.devices.length], ['ha', haLogo(), 'Home Assistant', sc.ha], ['st', stLogo(), 'SmartThings', sc.st], ['mt', mtLogo(), 'Matter', sc.mt], ['mq', mqLogo(), 'MQTT', sc.mq]].filter(function (c) { return (c[0] !== 'mt' && c[0] !== 'mq') || c[3] || sp === c[0]; }).map(function (c) { return '<button type="button" role="tab" data-src="' + c[0] + '" class="' + (sp === c[0] ? 'on' : '') + '" aria-selected="' + (sp === c[0]) + '"><i aria-hidden="true">' + c[1] + '</i>' + c[2] + '<em>' + c[3] + '</em></button>'; }).join('') + '</div>' : '';
    shown().forEach(function (x) { cnt[x.group || 'none'] = (cnt[x.group || 'none'] || 0) + 1; });
    var chips = [['all', '📡', '전체', shown().length]].concat(groups().filter(function (g) { return cnt[g[0]]; }).map(function (g) { return [g[0], g[1], g[2], cnt[g[0]]]; }));
    var svs = haServers(), sv = srvPick();   // 1.8.0 🏠 HA 서버가 둘 이상이면 서버마다
    if (svs.length > 1) srcRow += '<div class="hal-gf hal-srv" role="tablist" aria-label="HA 서버">' + [{ id: 'all', name: '모든 HA 서버', n: sc.ha }].concat(svs).map(function (s) { var on = sv === s.id; return '<button type="button" role="tab" data-hasrv="' + esc(s.id) + '" class="' + (on ? 'on' : '') + '" aria-selected="' + on + '"><i aria-hidden="true">' + (s.id === 'all' ? haLogo() : '🏠') + '</i>' + (s.id === 'all' ? '' : recvDot('ha:' + s.id)) + esc(s.label || s.name) + '<em>' + s.n + '</em></button>'; }).join('') + '</div>';
    if (vw === 'board') { srcRow = ''; chips = []; }   // 1.6.0 보드는 붙일 곳 모두를 한 판에
    return '<div class="hal-tools">' + srcRow + '<div class="hal-gf" role="tablist" aria-label="분류">' + chips.map(function (c) { return '<button type="button" role="tab" data-gf="' + c[0] + '" class="' + (gf === c[0] ? 'on' : '') + '" aria-selected="' + (gf === c[0]) + '"><i aria-hidden="true">' + c[1] + '</i>' + esc(c[2]) + '<em>' + c[3] + '</em></button>'; }).join('') + '</div>' +
      '<div class="hal-views" role="group" aria-label="보기 모양">' + VIEWS.map(function (v) { return '<button type="button" data-view="' + v[0] + '" class="' + (vw === v[0] ? 'on' : '') + '" aria-pressed="' + (vw === v[0]) + '" title="' + v[2] + '로 보기"><i aria-hidden="true">' + v[1] + '</i>' + v[2] + '</button>'; }).join('') + '</div></div>';
  }
  function grpFold(k) { try { return localStorage.getItem('hal:grp:' + k) === '0'; } catch (e) { return false; } }
  /* 1.4.7 업체 한도 — 「/ 50 (업체 전체 12)」 */
  function coLimit(k) {
    if (k.charAt(0) !== 'c' || !S.d.limits) return '';
    var c = (S.d.limits.companies || []).filter(function (x) { return 'c' + x.id === k; })[0];
    return c && c.max > 0 ? '<small class="hal-lim' + (c.used >= c.max ? ' full' : '') + '" title="업체 하나에 둘 수 있는 기기 (회원 모두 합쳐 ' + c.used + '개)">업체 ' + c.used + ' / ' + c.max + '</small>' : '';
  }
  function grouped() {
    var d = S.d, gf = pref('gf', 'all'), vw = pref('view', 'card'), devs = shown(), left = S.lim || PAGE;   // 1.4.7 출처로 거름 · 스크롤하면 더 (PAGE 개씩)
    if (gf !== 'all' && !devs.some(function (x) { return (x.group || 'none') === gf; })) gf = 'all';   // 고른 분류가 비면 전체
    var cut = false, html = groups().filter(function (g) { return gf === 'all' || g[0] === gf; }).map(function (g) {
      var list = devs.filter(function (x) { return (x.group || 'none') === g[0]; });
      if (!list.length || left <= 0) { if (list.length) cut = true; return ''; }
      var open = gf !== 'all' || !grpFold(g[0]), part = open ? list.slice(0, left) : [];   // 접힌 묶음은 카드를 그리지 않음
      if (open) { left -= part.length; if (part.length < list.length) cut = true; }
      var live = list.filter(function (x) { return !x.stale; }).length, over = list.filter(function (x) { return x.over; }).length;
      return '<details class="hal-grp g-' + (g[0].charAt(0) === 'c' ? 'co' : g[0]) + '" data-grp="' + g[0] + '"' + (gf !== 'all' || !grpFold(g[0]) ? ' open' : '') + '><summary><i aria-hidden="true">' + g[1] + '</i><b>' + esc(g[2]) + '</b><small>' + esc(g[3]) + '</small>' +
        '<span class="hal-grp-n">' + list.length + coLimit(g[0]) + '<em>🟢 ' + live + '</em>' + (over ? '<em class="hot">⚠️ ' + over + '</em>' : '') + '</span></summary><div class="hal-grid hal-v-' + vw + '">' + part.map(card).join('') + '</div></details>';
    }).join('');
    return html + (cut ? '<div class="hal-more" data-more aria-label="더 불러오는 중"><span></span><span></span><span></span></div>' : '');
  }
  function selBar() {
    var d = S.d, n = Object.keys(S.sel).length, stale = d.devices.filter(function (x) { return x.stale; }).length;
    return '<div class="hal-selbar"><label><input type="checkbox" data-sel-all' + (n && n === d.devices.length ? ' checked' : '') + '> 모두</label>' +
      (stale ? '<button type="button" class="hal-btn sm" data-sel-stale>끊긴 것만 (' + stale + ')</button>' : '') +
      '<span>' + n + '개 골랐어요</span><select class="hal-sel-grp" data-sel-grp' + (n ? '' : ' disabled') + ' aria-label="고른 기기 분류 옮기기"><option value="-">📁 분류 옮기기…</option>' + grpOpts('', '') + '<option value="">🔄 자동 (붙인 곳 따라)</option></select><button type="button" class="hal-btn sm danger" data-sel-del' + (n ? '' : ' disabled') + '>🗑 ' + n + '개 지우기</button><button type="button" class="hal-btn sm" data-sel-off>취소</button></div>';
  }
  /* 1.6.0 📦 보관함 보드 — 센서 칩을 보관함 · 내 프린터 · 업체 장비에 끌어다 붙이기 (휴대폰은 칩을 누르고 → 놓을 곳을 누름)
     보관함은 🌡️ 하나 · 💧 하나 / 장비는 ⚙️ 상태 센서가 재는 챔버 온습도가 먼저 — 빠진 것만 일반 센서로 (겹치면 바꿔 끼우고 예전 것은 대기 칸) */
  var INV = '/api/modules/custom-inventory/me/drawer/boxes';
  function bkey(s) { return String(s || '').replace(/\s+/g, '').toLowerCase(); }
  var BOX_COL = ['#d97706', '#0d9488', '#65a30d', '#e11d48', '#0284c7', '#c026d3', '#ea580c', '#059669', '#4338ca', '#a16207'];   // 재고 관리 보관함 색판과 같음
  function boxCol(b) { if (/^#[0-9a-f]{3,8}$/i.test(b.color || '')) return b.color; var k = b.key || bkey(b.name), h = 0; for (var i = 0; i < k.length; i++) h = (h * 31 + k.charCodeAt(i)) | 0; return BOX_COL[Math.abs(h) % BOX_COL.length]; }
  /** 재고 관리 보관함 모양 그대로 — 색 뚜껑 · 투명한 통 안의 롤(필라멘트 색 · 남은 만큼) · 옆면 온습도계 · 앞면 이름표 */
  /* 1.9.0 🔔 알림 구간 — 「40~60%」 · 「60% 넘으면」 · 「30% 밑이면」 */
  function rangeText(min, max, u) { return min != null && max != null ? min + '~' + max + u : max != null ? max + u + ' 넘으면' : min != null ? min + u + ' 밑이면' : '안 알림'; }
  function rangeWarn(hu, st) {
    var w = [];
    if (hu && hu.over && hu.humidity != null) w.push('습도 ' + hu.humidity + '% ' + (hu.humidity_min != null && hu.humidity < hu.humidity_min ? '낮음' : '높음'));
    if (st && st.over && st.temp != null) w.push('온도 ' + st.temp + '° ' + (st.temp_min != null && st.temp < st.temp_min ? '낮음' : '높음'));
    return w.join(' · ') || '구간 밖';
  }
  /** 1.9.0 🔔 보관함에서 바로 — 습도 센서 · 온도 센서의 알림 구간 (아래 · 위, 비우면 그쪽은 안 봄) */
  function rangeBox(hu, st) {
    var row = function (x, k, u, lbl, presets) {
      if (!x) return '<p class="hal-hint">' + lbl + ' 센서가 없어요.</p>';
      var mn = x[k + '_min'], mx = x[k + '_max'], ro = x.perm === 'view';
      return '<fieldset class="hal-rng-f"' + (ro ? ' disabled' : '') + '><legend>' + lbl + ' — ' + esc(x.name) + (ro ? ' <small>(보기만)</small>' : '') + '</legend>' +
        '<div class="hal-rng-in"><input type="number" data-r="' + k + '_min" value="' + (mn == null ? '' : mn) + '" placeholder="아래 없음"> <span>~</span> <input type="number" data-r="' + k + '_max" value="' + (mx == null ? '' : mx) + '" placeholder="위 없음"> <b>' + u + '</b></div>' +
        (presets ? '<div class="hal-chips">' + presets.map(function (p) { return '<button type="button" class="hal-chip" data-pre="' + k + '" data-a="' + (p[0] == null ? '' : p[0]) + '" data-b="' + (p[1] == null ? '' : p[1]) + '">' + p[2] + '</button>'; }).join('') + '</div>' : '') + '</fieldset>';
    };
    var html = '<p class="hal-hint">이 구간을 벗어나면(위로 넘거나 아래로 내려가면) 알려요. 칸을 비우면 그쪽은 보지 않아요.</p>' +
      row(hu, 'humidity', '%', '💧 습도', [[null, 20, '건조함 ~20%'], [null, 40, '~40%'], [30, 50, '30~50%'], [40, 60, '40~60%'], [null, null, '알림 끔']]) +
      row(st, 'temp', '°C', '🌡️ 온도', [[null, 30, '~30°C'], [10, 35, '10~35°C'], [null, null, '알림 끔']]);
    var ov = modal('🔔 알림 구간', html, { ok: '저장', onSave: function (o) {
      var val = function (k) { var i = o.querySelector('[data-r="' + k + '"]'); return i ? (i.value.trim() === '' ? null : +i.value) : undefined; };
      var bad = function (a, b) { return a != null && b != null && a >= b; };
      if (bad(val('humidity_min'), val('humidity_max')) || bad(val('temp_min'), val('temp_max'))) { toast('아래 값은 위 값보다 작아야 해요.', true); return Promise.reject(new Error('')); }
      var jobs = [], same = hu && st && hu.id === st.id;
      if (hu && hu.perm !== 'view') jobs.push([hu.id, same ? { humidity_min: val('humidity_min'), humidity_max: val('humidity_max'), temp_min: val('temp_min'), temp_max: val('temp_max') } : { humidity_min: val('humidity_min'), humidity_max: val('humidity_max') }]);
      if (st && st.perm !== 'view' && !same) jobs.push([st.id, { temp_min: val('temp_min'), temp_max: val('temp_max') }]);
      var last = null;
      return jobs.reduce(function (p, j) { return p.then(function () { return api('POST', '/devices/' + j[0] + '/range', j[1]).then(function (r) { last = r; toast(r.message); }); }); }, Promise.resolve())
        .then(function () { if (last && last.data) { S.d = last.data.overview; draw(); } });
    } });
    ov.addEventListener('click', function (ev) { var p = ev.target.closest('[data-pre]'); if (!p) return; var k = p.getAttribute('data-pre'); ov.querySelector('[data-r="' + k + '_min"]').value = p.getAttribute('data-a'); ov.querySelector('[data-r="' + k + '_max"]').value = p.getAttribute('data-b'); });
  }
  function binZone(b, devs, acts) {
    var rl = b.reels || [], n = Math.min(b.rolls || rl.length, 10), cols = n <= 4 ? Math.max(1, n) : Math.ceil(n / 2), rows = n <= 4 ? 1 : 2, more = (b.rolls || 0) - rl.length;
    var st = devs.filter(function (x) { return capsOf(x).temp; })[0], hu = devs.filter(function (x) { return capsOf(x).hum; })[0], hot = (hu && hu.over) || (st && st.over);   // 1.9.0 구간 밖 (위 · 아래)
    var reels = rl.map(function (x, i) { var w = +x.w || 1000, sz = w <= 250 ? 22 : w <= 500 ? 26 : w < 2000 ? 30 : 34, last = more > 0 && i === rl.length - 1;
      return '<i class="reel' + (x.b ? ' bottle' : '') + (x.s ? ' sealed' : '') + (last ? ' more' : '') + '" style="--sz:' + sz + 'px;--c:' + (/^#[0-9a-f]{3,8}$/i.test(x.c || '') ? x.c : '#94a3b8') + ';--p:' + (+x.p || 0) + '"' + ' title="' + (last ? (more + 1) + '개 더 — 재고 관리에서 모두 보기' : esc((x.n || (x.b ? '레진' : '필라멘트')) + ' · 남은 ' + (+x.p || 0) + '%' + (x.s ? ' · 안 뜯은 새 롤' : ''))) + '"' + '>' + (last ? '<b>+' + (more + 1) + '</b>' : '') + '</i>'; }).join('');
    var gauge = '<span class="gauge' + (hu || st ? ' rng' : '') + '"' + (hu || st ? ' data-rng-h="' + (hu ? hu.id : '') + '" data-rng-t="' + (st ? st.id : '') + '" role="button"' : '') + ' title="🔔 누르면 알림 구간(아래 · 위) 정하기 — 🌡️ ' + (st ? esc(st.name) : '온도 센서 없음') + ' · 💧 ' + (hu ? esc(hu.name) : '습도 센서 없음') + '">💧' + (hu ? (hu.humidity == null ? '–' : hu.humidity) + '%' : '<u>빈 칸</u>') + ' 🌡️' + (st ? (st.temp == null ? '–' : st.temp) + '°' : '<u>빈 칸</u>') + '</span>';
    return '<div class="hal-bd hal-bin' + (b.loose ? ' loose' : '') + (hot ? ' hot' : '') + '" data-drop="location" data-loc="' + esc(b.name) + '" data-ref="' + (+(b.company_id || 0)) + '"' + (b.drag != null ? ' data-mv-name="' + esc(b.name) + '" data-mv-from="' + b.drag + '" title="위 👤 · 🏢 탭으로 끌면 통째로 옮겨요"' : '') + ' style="--bx:' + (b.loose ? '#94a3b8' : boxCol(b)) + ';--cols:' + Math.max(cols, 4) + ';--rows:' + rows + '">' +
      '<span class="lid"></span><span class="body">' + gauge + (reels || '<em>' + (b.loose ? '재고 관리에 없는 위치' : b.seen ? '재고 관리 보관함' : '비었어요') + '</em>') + '</span>' +
      '<span class="tag"><b title="' + esc(b.name) + '">📦 ' + esc(b.name) + '</b><small>' + (b.loose ? '센서만' : b.seen ? '보관 위치' : (b.rolls || 0) + '개') + (hot ? ' · ⚠️ ' + rangeWarn(hu, st) : '') + '</small><span class="acts">' + acts + '</span></span>' +
      (b.company ? '<small class="hal-bin-co">🏢 ' + esc(b.company) + '</small>' : '') +
      '<div class="hal-chips">' + (devs.length ? devs.map(function (x) { return chip(x, true); }).join('') : '<small class="hal-drop-hint">＋ 센서를 여기로</small>') + '</div></div>';
  }
  function capsOf(x) { return x.caps || { state: !!x.entities.state, temp: !!x.entities.temp, hum: !!x.entities.hum }; }
  function chip(x, bare) {   // bare — 보관함 안: 온습도는 위 온습도계에 있으니 이름만
    var c = capsOf(x), v = [];
    if (c.temp && x.temp != null) v.push(x.temp + '°'); if (c.hum && x.humidity != null) v.push(x.humidity + '%');
    var rv = recvOf(x);   // 1.8.1 🎨 받는 곳 색 띠 · 표식
    return '<button type="button" class="hal-chip' + (rv ? ' srv' : '') + (S.pick === x.id ? ' on' : '') + (x.stale ? ' off' : '') + (x.perm === 'view' ? ' ro' : '') + '"' + (rv ? ' style="--srv:' + rv.col + '"' : '') + (x.perm === 'view' ? '' : ' draggable="true"') + ' data-chip="' + x.id + '" title="' + (x.perm === 'view' ? '업체 대표 · 관리자만 옮길 수 있어요' : '끌어서 놓거나 · 누르고 놓을 곳을 누르세요') + '">' +
      (bare ? '' : '<i aria-hidden="true">' + (c.state ? '⚙️' : '') + (c.temp ? '🌡️' : '') + (c.hum ? '💧' : '') + '</i>') + '<b>' + esc(x.name) + '</b>' + (!bare && v.length ? '<small>' + v.join(' · ') + '</small>' : '') + recvTag(x) + '</button>';
  }
  /** 칸 — 상태 센서(장비 값)가 먼저, 없으면 일반 센서 */
  function slotRow(devs, kinds) {
    var st = devs.filter(function (x) { return capsOf(x).state; }), gen = devs.filter(function (x) { return !capsOf(x).state; });
    var K = { state: ['⚙️', '상태'], temp: ['🌡️', '온도'], hum: ['💧', '습도'] };
    return '<div class="hal-slots">' + kinds.map(function (k) {
      var x = st.concat(gen).filter(function (o) { return capsOf(o)[k]; })[0];
      var val = !x ? '' : k === 'state' ? (x.is_on ? '가동 중' : '쉬는 중') : k === 'temp' ? (x.temp == null ? '–' : x.temp + '°C') : (x.humidity == null ? '–' : x.humidity + '%');
      return '<span class="hal-slot' + (x ? ' full' : '') + '" title="' + K[k][1] + (x ? ' — ' + esc(x.name) + (capsOf(x).state && k !== 'state' ? ' (장비 값)' : '') : ' — 비어 있음') + '"><i aria-hidden="true">' + K[k][0] + '</i>' + (x ? '<b>' + esc(val) + '</b>' : '<small>비어 있음</small>') + '</span>';
    }).join('') + '</div>';
  }
  function zone(cls, attrs, head, devs, kinds) {
    return '<div class="hal-bd ' + cls + '" ' + attrs + '><header>' + head + '</header>' + slotRow(devs, kinds) + '<div class="hal-chips">' + (devs.length ? devs.map(chip).join('') : '<small class="hal-hint">여기로 끌어 놓기</small>') + '</div></div>';
  }
  /** 1.7.5 🖨️ 프린터 모양 — 틀 · 위 레일과 노즐(출력 중이면 움직임) · 창 안의 프린터 사진 · 베드 · 다리 · 앞면 이름판 · 위 계기판(⚙️ · 🌡️ · 💧)
      1.7.6 🏭 업체 장비도 같은 틀로 — 종류마다 모양: 3D 프린터 · 작업대(레이저 · CNC · UV · 플로터 · 진공 성형) · 함(건조기 · 세척 · 경화) · 패널(그 밖) */
  var EQ_SHAPE = { laser: ['flat', '🔴'], cnc: ['flat', '🪚'], uv_print: ['flat', '🖌️'], plotter: ['flat', '✂️'], vacuum: ['flat', '🫧'], dryer: ['box', '🌀'], wash_cure: ['box', '💡'],
    scanner: ['cab', '📷'], post: ['cab', '🎨'], injection: ['cab', '💉'], measure: ['cab', '📏'], other: ['cab', '🏭'] };
  function machine(o, devs) {
    var sd = devs.filter(function (x) { return capsOf(x).state; }), all = sd.concat(devs.filter(function (x) { return !capsOf(x).state; }));
    var pick = function (k) { return all.filter(function (q) { return capsOf(q)[k]; })[0]; }, st = pick('state'), te = pick('temp'), hu = pick('hum');
    var run = !!o.run || !!(st && st.is_on), on = !!o.live || devs.some(function (x) { return !x.stale && !x.never; }) || (o.eq && !devs.length);   // 장비는 센서가 없으면 끊긴 게 아님
    var stTxt = st ? (st.is_on ? '가동 중' : '쉬는 중') : o.stTxt || '';
    var gauge = '<span class="gauge">⚙️' + (stTxt ? esc(stTxt) : '<u>빈 칸</u>') + ' 🌡️' + (te ? (te.temp == null ? '–' : te.temp) + '°' : '<u>빈 칸</u>') + ' 💧' + (hu ? (hu.humidity == null ? '–' : hu.humidity) + '%' : '<u>빈 칸</u>') + '</span>';
    return '<div class="hal-bd hal-prn s-' + o.shape + (o.eq ? ' eq k-' + esc(o.kind || 'other') : '') + (run ? ' run' : '') + (on ? '' : ' gone') + (o.fail ? ' fail' : '') + '" data-drop="' + o.drop + '" data-ref="' + o.ref + '" title="' + esc(o.name + (o.sub ? ' · ' + o.sub : '') + (stTxt ? ' · ' + stTxt : '') + (o.seen ? ' · ' + agoText(o.seen) : '') + (on ? '' : ' · 연결 꺼짐')) + '">' +
      '<span class="frame">' + gauge + '<span class="rail"><i class="head"></i></span><span class="win">' + (o.img && o.img.charAt(0) === '<' ? o.img : '<em>' + o.icon + '</em>') + '</span><span class="bed"></span></span><span class="feet"><i></i><i></i></span>' +
      '<span class="tag"><b>' + o.icon + ' ' + esc(o.name) + '</b><small>' + esc(o.note || (o.eq && !devs.length ? '센서 없음' : on ? (stTxt || '연결됨') : '연결 꺼짐')) + '</small></span>' +
      (o.co ? '<small class="hal-bin-co">🏢 ' + esc(o.co) + (o.sub ? ' · ' + esc(o.sub) : '') + '</small>' : '') +
      '<div class="hal-chips">' + (devs.length ? devs.map(function (x) { return chip(x, true); }).join('') : '<small class="hal-drop-hint">＋ 센서를 여기로</small>') + '</div></div>';
  }
  function prnZone(p, devs, e) {   // 1.7.9 e = 이어진 업체 장비 (프린터 라운지 「재고 장비로도」) — 하나로 보임
    var PS = { printing: '출력 중', paused: '일시정지', done: '끝남', failed: '실패', idle: '쉬는 중' }, bad = e && e.status && e.status !== 'ok' && e.status !== 'busy';
    return machine({ shape: 'printer', drop: 'printer', ref: p.id, name: p.name, icon: '🖨️', img: prIcon(p), run: p.state === 'printing', live: p.live, stTxt: PS[p.state] || '', seen: p.seen, fail: p.state === 'failed' || bad,
      note: bad ? (e.status_emoji || '⚠️') + ' ' + (e.status_label || e.status) : '', sub: e ? '🏭 업체 장비와 이어짐' : '' }, devs);
  }
  function eqZone(e, devs, co) {
    var sh = e.is_printer ? ['printer', e.kind === 'fdm' ? '🖨️' : '🧪'] : EQ_SHAPE[e.kind] || EQ_SHAPE.other, bad = e.status && e.status !== 'ok' && e.status !== 'busy';
    return machine({ shape: sh[0], eq: true, kind: e.kind, drop: 'equipment', ref: e.id, name: e.name, icon: sh[1], co: co, sub: e.kind_label, run: e.status === 'busy', live: false,
      note: bad ? (e.status_emoji || '⚠️') + ' ' + (e.status_label || e.status) : '', fail: bad }, devs);
  }
  /* 1.7.6 보드도 탭 따라 — 👤 내 기기(개인 보관함 · 내 프린터) · 🏢 업체 기기(업체마다 보관함 · 업체 프린터 · 장비) · 📡 전체(둘 다)
     1.7.8 주인마다 나누면 멀어서 끌기 힘듦 → 종류(보관함 · 프린터 · 장비)마다 한 줄에 같이 늘어놓고 ‹ › 단추로 좌우로 · 개인 · 업체는 배지로 */
  function strip(html, key) {
    return '<div class="hal-strip-w" data-strip="' + key + '"><button type="button" class="hal-sc l" data-sc="-1" aria-label="왼쪽으로"><i aria-hidden="true"></i></button><div class="hal-bins hal-strip">' + html + '</div><button type="button" class="hal-sc r" data-sc="1" aria-label="오른쪽으로"><i aria-hidden="true"></i></button></div>';
  }
  function badged(html, b) { return b ? html.replace(/^(<div [^>]*>)/, '$1' + b) : html; }
  function board() {
    var d = S.d, sc = scope(), cos = {}, owners = [];
    (d.companies || []).forEach(function (c) { cos[c.id] = c.name; });
    var placed = function (x) { return x.target !== 'other' && !!x.where; };
    var free = d.devices.filter(function (x) { return !placed(x); });
    /* 1.8.0 📡 대기 칸을 받는 곳마다 — 🏠 HA 서버 이름(겹치면 #번호) · SmartThings · 1.10.0 🧩 Matter (하나뿐이면 예전처럼 한 줄) */
    var freeHtml = function (xs) {
      var g = {}, keys = [];
      xs.forEach(function (x) { var k = recvKey(x); if (!g[k]) { g[k] = []; keys.push(k); } g[k].push(x); });
      if (keys.length < 2) return xs.map(chip).join('');
      return keys.map(function (k) { return '<div class="hal-freegrp" style="--srv:' + ((recvs().filter(function (v) { return v.key === k; })[0] || {}).col || 'transparent') + '"><small class="hal-freegrp-t">' + recvDot(k) + (k === 'st' ? stLogo() + ' SmartThings' : k === 'mt' ? mtLogo() + ' Matter' : k === 'mq' ? mqLogo() + ' MQTT' : '🏠 ' + esc(srvLabel(g[k][0]))) + ' · ' + g[k].length + '</small>' + g[k].map(chip).join('') + '</div>'; }).join('');
    };   // 1.7.18 대기 칸은 탭과 상관없이 모두 (어느 쪽으로든 끌어 붙이게)
    var at = function (fn) { return d.devices.filter(function (x) { return placed(x) && fn(x); }); };
    var cidOf = function (v) { return +(v || 0); };
    if (sc !== 'company') owners.push(0);
    var coName = Object.assign({}, cos);   // 1.7.17 재고 관리 서랍과 같은 범위 — 직원인 업체의 보관함도 (보기 · 붙이기는 대표 · 관리자만)
    (d.boxes || []).forEach(function (b) { if (cidOf(b.company_id) && coName[b.company_id] == null) coName[b.company_id] = b.company || '업체'; });
    if (sc !== 'mine') Object.keys(coName).forEach(function (k) { if (!coPick() || +k === coPick()) owners.push(+k); });   // 1.8.0 고른 업체만
    var multi = owners.length > 1, linked = {};
    (d.printers || []).forEach(function (p) { if (p.equipment_id) linked[p.equipment_id] = p.id; });   // 1.7.9 업체 프린터 = 업체 장비 (이어진 것은 하나로)
    var badge = function (cid) { return cid ? '<span class="hal-own co" title="업체 것">🏢 ' + esc(coName[cid] || '업체') + '</span>' : multi ? '<span class="hal-own me" title="내 것">👤 개인</span>' : ''; };
    var boxHtml = '', prHtml = '', eqHtml = '';
    owners.forEach(function (cid) {
      var boxes = [], have = {};
      (d.boxes || []).forEach(function (b) {   // 1.6.2 이름이 같으면 한 보관함으로 — 주인(개인 · 업체)마다 따로
        if (cidOf(b.company_id) !== cid) return;
        var k = bkey(b.name), o = have[k];
        if (!o) { o = have[k] = Object.assign({}, b, { reels: (b.reels || []).slice() }); boxes.push(o); return; }
        o.rolls = (o.rolls || 0) + (b.rolls || 0); o.reels = o.reels.concat(b.reels || []).slice(0, 10);
      });
      if (!cid && !(d.boxes || []).length) (d.locations || []).forEach(function (l) { if (l && !have[bkey(l)]) { have[bkey(l)] = 1; boxes.push({ name: l, key: bkey(l), rolls: 0, record: false, reels: [], seen: true }); } });   // 1.6.1 재고 관리가 아직 보관함을 안 알려 주면 위치 이름만으로
      d.devices.forEach(function (x) { if (x.target === 'location' && x.location && cidOf(x.company_id) === cid && !have[bkey(x.location)]) { have[bkey(x.location)] = 1; boxes.push({ name: x.location, company_id: cid, rolls: 0, record: false, loose: true }); } });   // 재고 관리에 없는 보관 위치
      boxHtml += boxes.map(function (b) {
        var on = at(function (x) { return x.target === 'location' && bkey(x.location) === bkey(b.name) && cidOf(x.company_id) === cid; });
        // 1.7.12 ⇄ 개인 ↔ 업체로 통째로 옮기기 (재고 관리 0.3.83+) — 이름판을 끌어 위 👤 · 🏢 탭에 놓아도
        var mv = d.config.inventory && !b.seen && !b.loose && Object.keys(cos).length ? '<button type="button" class="hal-icobtn" data-box-act="move" data-name="' + esc(b.name) + '" data-from="' + cid + '" title="' + (cid ? '개인 · 다른 업체로 옮기기' : '업체로 옮기기') + ' (필라멘트 · 센서 같이)" aria-label="옮기기">⇄</button>' : '';
        if (mv) b.drag = cid;
        if (b.seen || cid) return badged(binZone(b, on, mv), badge(cid));   // 롤 수를 모르거나 🏢 업체 보관함 — 이름 바꾸기 · 지우기는 재고 관리에서
        var acts = d.config.inventory && !b.loose ? '<button type="button" class="hal-icobtn" data-box-act="rename" data-name="' + esc(b.name) + '" title="이름 바꾸기" aria-label="이름 바꾸기">✏️</button>' : '';
        acts += '<button type="button" class="hal-icobtn" data-box-act="del" data-name="' + esc(b.name) + '" data-rolls="' + (b.all != null ? b.all : b.rolls || 0) + '" data-loose="' + (b.loose ? 1 : 0) + '" title="' + (b.loose ? '센서를 대기 칸으로' : '보관함 지우기') + '" aria-label="지우기">🗑</button>';
        return badged(binZone(b, on, mv + acts), badge(cid));
      }).join('');
      prHtml += (d.printers || []).filter(function (p) { return cidOf(p.company_id) === cid; }).map(function (p) {
        var e = p.equipment_id ? (d.equipment || []).filter(function (q) { return q.id === p.equipment_id; })[0] : null;
        return badged(prnZone(p, at(function (x) { return (x.target === 'printer' && x.printer_id === p.id) || (!!p.equipment_id && x.target === 'equipment' && x.equipment_id === p.equipment_id); }), e), badge(cid));
      }).join('');
      if (cid) eqHtml += (d.equipment || []).filter(function (e) { return e.company_id === cid && !linked[e.id]; }).map(function (e) { return badged(eqZone(e, at(function (x) { return x.target === 'equipment' && x.equipment_id === e.id; }), ''), badge(cid)); }).join('');
    });
    var noBox = '<p class="hal-hint">보관함이 없어요' + (d.config.inventory ? ' — 「➕ 보관함 만들기」로 만들어요' : '') + '.</p>';
    return '<div class="hal-board' + (S.pick ? ' picking' : '') + '" data-board><p class="hal-hint">센서 칩을 붙일 곳에 끌어 놓으세요 · 휴대폰은 칩을 누르고 놓을 곳을 눌러요. 줄이 길면 ‹ › 로 넘겨요 (끄는 중에 ‹ › 위에 대면 넘어가요). 보관함은 🌡️ 하나 · 💧 하나 — 겹치면 바꿔 끼우고 예전 센서는 대기 칸으로 가요.</p>' +
      '<section class="hal-bd free" data-drop=""><header><i aria-hidden="true">📡</i><b>대기 칸</b><small>아직 붙이지 않은 센서 — 여기로 끌면 떼어져요</small></header><div class="hal-chips">' + (free.length ? freeHtml(free) : '<small class="hal-hint">모든 센서가 붙어 있어요</small>') + '</div></section>' +
      '<h3 class="hal-bd-t k-box">📦 보관함' + (d.config.inventory && (sc !== 'company' || (d.companies || []).length) ? '<button type="button" class="hal-btn sm" data-box-act="new">➕ 보관함 만들기</button>' : '') + '</h3>' + (boxHtml ? strip(boxHtml, 'box') : noBox) +
      (prHtml ? '<h3 class="hal-bd-t k-printer">🖨️ 프린터</h3>' + strip(prHtml, 'printer') : '') +
      (eqHtml ? '<h3 class="hal-bd-t k-equip">🏭 업체 장비</h3>' + strip(eqHtml, 'equip') : '') + '</div>';
  }
  /** ‹ › 단추 — 넘칠 때만 · 끝에 닿으면 그쪽 단추를 숨김 · 넘긴 자리 기억(다시 그려도) */
  function stripBind() {
    S.stripX = S.stripX || {};
    qa('[data-strip]').forEach(function (w) {
      var k = w.getAttribute('data-strip'), el = w.querySelector('.hal-strip');
      var upd = function () { var max = el.scrollWidth - el.clientWidth - 2; w.classList.toggle('can-l', el.scrollLeft > 2); w.classList.toggle('can-r', el.scrollLeft < max); S.stripX[k] = el.scrollLeft; };
      if (S.stripX[k]) el.scrollLeft = S.stripX[k];
      el.addEventListener('scroll', upd, { passive: true }); upd();
      // 1.7.10 마우스로 끌어 좌우로 (센서 칩 · 단추에서 시작하면 그것을 끌거나 누름) — 터치는 손가락으로 그냥 밀림
      // 1.7.10 마우스로 끌어 좌우로 · 1.7.14 보관함을 위로 끌면 👤 · 🏢 탭으로 옮기기 (어디를 잡든 — 센서 칩 · 단추는 빼고). 터치는 손가락으로 밀기 · 옮기기는 ⇄ 단추
      var pan = null;
      var tabAt = function (x, y) { var t = document.elementFromPoint(x, y); t = t && t.closest('.hal-scope [data-scope]'); var to = t && t.getAttribute('data-scope'); return t && pan && pan.bin && tabOk(to, pan.from) ? t : null; };
      el.addEventListener('pointerdown', function (e) {
        if (e.pointerType !== 'mouse' || e.button !== 0 || e.target.closest('[data-chip],button,a,input')) return;
        var bin = e.target.closest('[data-mv-name]');
        pan = { x: e.clientX, y: e.clientY, l: el.scrollLeft, mode: '', id: e.pointerId, bin: bin, name: bin && bin.getAttribute('data-mv-name'), from: bin ? +bin.getAttribute('data-mv-from') : 0 };
        e.preventDefault();   // 글자 선택 · 사진 끌기로 넘어가지 않게
        document.addEventListener('pointermove', move, true); document.addEventListener('pointerup', end, true); document.addEventListener('pointercancel', end, true);   // 줄 밖으로 빨리 나가도 이어 받음
      });
      var move = function (e) {
        if (!pan || e.pointerId !== pan.id) return;
        var dx = e.clientX - pan.x, dy = e.clientY - pan.y;
        if (!pan.mode) {
          if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
          pan.mode = pan.bin && dy < 0 && -dy > Math.abs(dx) ? 'box' : 'pan';
          try { el.setPointerCapture(e.pointerId); } catch (er) {}
          if (pan.mode === 'pan') w.classList.add('panning');
          else {
            S.root.classList.add('hal-boxdrag'); pan.bin.classList.add('lifting');
            pan.ghost = document.createElement('div'); pan.ghost.className = 'hal-ghost'; pan.ghost.textContent = '📦 ' + pan.name; document.body.appendChild(pan.ghost);
          }
        }
        e.preventDefault();
        if (pan.mode === 'pan') { el.scrollLeft = pan.l - dx; return; }
        pan.ghost.style.left = e.clientX + 12 + 'px'; pan.ghost.style.top = e.clientY + 12 + 'px';
        var t = tabAt(e.clientX, e.clientY);
        qa('.hal-scope .over').forEach(function (o) { if (o !== t) o.classList.remove('over'); }); if (t) t.classList.add('over');
        pan.ghost.classList.toggle('ok', !!t);
      };
      var end = function (e) {
        if (!pan) return;
        var p = pan, t = p.mode === 'box' && e.type === 'pointerup' ? tabAt(e.clientX, e.clientY) : null;
        pan = null; w.classList.remove('panning'); S.root.classList.remove('hal-boxdrag');
        document.removeEventListener('pointermove', move, true); document.removeEventListener('pointerup', end, true); document.removeEventListener('pointercancel', end, true);
        qa('.hal-scope .over').forEach(function (o) { o.classList.remove('over'); });
        if (p.ghost) p.ghost.remove(); if (p.bin) p.bin.classList.remove('lifting');
        try { el.releasePointerCapture(e.pointerId); } catch (er) {}
        if (p.mode) el.addEventListener('click', function stop(ev) { ev.stopPropagation(); ev.preventDefault(); el.removeEventListener('click', stop, true); }, true);   // 끈 뒤의 누름은 「붙이기」로 치지 않음
        if (t) boxMove(p.name, p.from, t.getAttribute('data-scope') === 'mine' ? 0 : -1);
      };
      w.querySelectorAll('[data-sc]').forEach(function (b) {
        var dir = +b.getAttribute('data-sc');
        b.onclick = function () { el.scrollBy({ left: dir * Math.max(180, el.clientWidth * 0.8), behavior: 'smooth' }); };
        b.addEventListener('dragover', function (e) { e.preventDefault(); el.scrollLeft += dir * 14; });   // 끄는 중에 단추 위에 대면 넘어감
      });
    });
  }
  function placeTo(id, z) {
    var x = find(id); if (!x) return;
    if (x.perm === 'view') { toast('🏢 업체 기기는 그 업체 대표 · 관리자만 옮길 수 있어요.', true); return; }
    var t = z.getAttribute('data-drop'), loc = z.getAttribute('data-loc') || '', ref = +(z.getAttribute('data-ref') || 0);
    S.pick = 0;
    if (t === '' ? x.target === 'other' : t === 'location' ? x.target === 'location' && bkey(x.location) === bkey(loc) && +(x.company_id || 0) === ref : x.target === t && (t === 'printer' ? x.printer_id : x.equipment_id) === ref) { redraw(); return; }   // 제자리
    api('POST', '/devices/' + id + '/place', { target: t, location: loc, ref: ref }).then(function (r) { toast(r.message); S.d = r.data.overview; redraw(); }).catch(function (e) { fail(e); redraw(); });
  }
  function reload() { return api('GET', '/me').then(function (r) { S.d = r.data; redraw(); }); }
  function tabOk(to, from) { return to === 'company' ? !(from > 0 && Object.keys(coMap()).length < 2) : to === 'mine' && from > 0; }
  function coMap() { var m = {}; (S.d.companies || []).forEach(function (c) { m[c.id] = c.name; }); return m; }
  /** 1.7.12 📦 보관함 통째로 옮기기 — to: 0 개인 · 업체 번호 · -1 이면 업체에서 고름(하나면 그 업체) */
  function boxMove(name, from, to) {
    var cos = coMap(), opts = (from ? [[0, '👤 개인']] : []).concat(Object.keys(cos).filter(function (k) { return +k !== from; }).map(function (k) { return [+k, '🏢 ' + cos[k]]; }));
    if (to === -1) opts = opts.filter(function (o) { return o[0] > 0; });
    else if (to != null) opts = opts.filter(function (o) { return o[0] === to; });
    if (!opts.length) { toast('옮길 곳이 없어요 (이미 그쪽 보관함이에요).', true); return; }
    var dup = function (t) { return (S.d.boxes || []).some(function (x) { return +(x.company_id || 0) === t && bkey(x.name) === bkey(name); }); };
    var go = function (t, label) {
      if (!confirm('📦 「' + name + '」을(를) ' + label + '(으)로 통째로 옮길까요?\n안에 든 필라멘트 · 레진과 붙은 센서도 같이 옮겨져요.' + (t > 0 ? '\n업체 재고에 잡혀요.' : '') + (dup(t) ? '\n\n⚠️ 그쪽에 같은 이름의 보관함이 있어서 하나로 합쳐요.' : ''))) return;
      api('POST', INV + '/move', { name: name, from: from, to: t }).then(function (r) { toast(r.message || '옮겼어요.'); return reload(); }).catch(fail);
    };
    if (opts.length === 1) { go(opts[0][0], opts[0][1]); return; }
    var ov = modal('⇄ 「' + esc(name) + '」 옮기기', '<div class="hal-own-pick" role="radiogroup"><span>어디로 옮길까요?</span>' + opts.map(function (o, i) { return '<label class="' + (o[0] ? 'co' : 'me') + '"><input type="radio" name="bx-to" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(o[1]) + '</label>'; }).join('') + '</div>', { ok: '옮기기', onSave: function (w) {
      var r = w.querySelector('input[name="bx-to"]:checked'), t = r ? +r.value : opts[0][0], lb = opts.filter(function (o) { return o[0] === t; })[0];
      setTimeout(function () { go(t, lb ? lb[1] : ''); }, 0); return Promise.resolve();
    } });
  }
  function boxAct(b) {
    var a = b.getAttribute('data-box-act'), name = b.getAttribute('data-name') || '';
    if (a === 'move') { boxMove(name, +b.getAttribute('data-from'), null); return; }
    if (a === 'new') {
      // 1.7.8 누구 보관함인지 고름 — 📡 전체: 👤 개인 · 🏢 업체마다 / 👤 내 기기: 개인 / 🏢 업체 기기: 업체 (하나면 그 업체)
      var sc = scope(), own = (sc === 'company' ? [] : [[0, '👤 개인']]).concat(sc === 'mine' ? [] : (S.d.companies || []).map(function (c) { return [c.id, '🏢 ' + c.name]; }));
      var html = '<label>보관함 이름<input type="text" data-bx-name maxlength="40" placeholder="예: 드라이박스 · 서랍 2칸"></label>' +
        (own.length > 1 ? '<div class="hal-own-pick" role="radiogroup" aria-label="누구 보관함"><span>누구 보관함인가요?</span>' + own.map(function (o, i) { return '<label class="' + (o[0] ? 'co' : 'me') + '"><input type="radio" name="bx-own" value="' + o[0] + '"' + (i === 0 ? ' checked' : '') + '> ' + esc(o[1]) + '</label>'; }).join('') + '</div>'
          : '<p class="hal-hint">' + esc(own[0] ? own[0][1] : '👤 개인') + ' 보관함으로 만들어요.</p>');
      var ov = modal('📦 보관함 만들기', html, { ok: '만들기', onSave: function (w) {
        var nm = (w.querySelector('[data-bx-name]').value || '').trim(), r = w.querySelector('input[name="bx-own"]:checked'), cid = r ? +r.value : own[0] ? own[0][0] : 0;
        if (!nm) return Promise.reject(new Error('보관함 이름을 넣어 주세요.'));
        return api('POST', INV, { name: nm, company_id: cid }).then(function (res) { toast(res.message || '📦 보관함을 만들었어요.'); return reload(); });
      } });
      var inp = ov.querySelector('[data-bx-name]'); if (inp) inp.focus();
    } else if (a === 'rename') {
      var to = (prompt('「' + name + '」 새 이름 (롤 · 센서의 보관 위치도 같이 바뀌어요)', name) || '').trim(); if (!to || to === name) return;
      api('POST', INV + '/rename', { from: name, to: to }).then(function (r) { toast(r.message || '이름을 바꿨어요.'); return reload(); }).catch(fail);
    } else if (a === 'del') {
      var rolls = +b.getAttribute('data-rolls'), loose = b.getAttribute('data-loose') === '1';
      if (rolls > 0) { toast('🧵 「' + name + '」에 롤이 ' + rolls + '개 있어요 — 재고 관리에서 롤을 옮긴 뒤 지워 주세요.', true); return; }
      var on = S.d.devices.filter(function (x) { return x.target === 'location' && bkey(x.location) === bkey(name); });
      if (!confirm(loose ? '「' + name + '」의 센서 ' + on.length + '개를 대기 칸으로 뺄까요?' : '빈 보관함 「' + name + '」을(를) 지울까요?' + (on.length ? '\n붙은 센서 ' + on.length + '개는 대기 칸으로 가요.' : ''))) return;
      on.reduce(function (p, x) { return p.then(function () { return api('POST', '/devices/' + x.id + '/place', { target: '' }); }); }, Promise.resolve())
        .then(function () { return loose ? { message: '센서를 대기 칸으로 뺐어요.' } : api('POST', INV + '/delete', { name: name, company_id: 0 }); })
        .then(function (r) { toast(r.message); return reload(); }).catch(function (e) { fail(e); reload(); });
    }
  }
  function boardBind() {
    var bd = q('[data-board]'); if (!bd) return;
    var over = function (z) { qa('.hal-bd.over').forEach(function (o) { if (o !== z) o.classList.remove('over'); }); if (z) z.classList.add('over'); };
    bd.onclick = function (e) {
      var c = e.target.closest('[data-chip]');
      if (c) { var id = +c.getAttribute('data-chip'); if (find(id).perm === 'view') { toast('🏢 업체 기기는 그 업체 대표 · 관리자만 옮길 수 있어요.', true); return; } if (S.pick && S.pick !== id) { var zz = c.closest('[data-drop]'); if (zz) { placeTo(S.pick, zz); return; } } S.pick = S.pick === id ? 0 : id; redraw(); return; }
      var rg = e.target.closest('[data-rng-h],[data-rng-t]');   // 1.9.0 🔔 온습도계 → 알림 구간
      if (rg && !S.pick) { e.preventDefault(); e.stopPropagation(); rangeBox(find(rg.getAttribute('data-rng-h')) || null, find(rg.getAttribute('data-rng-t')) || null); return; }
      var a = e.target.closest('[data-box-act]'); if (a) { boxAct(a); return; }
      var z = e.target.closest('[data-drop]'); if (z && S.pick) placeTo(S.pick, z);
    };
    bd.ondragstart = function (e) {
      var c = e.target.closest && e.target.closest('[data-chip]'); if (!c) return; e.dataTransfer.setData('text/plain', c.getAttribute('data-chip')); e.dataTransfer.effectAllowed = 'move'; bd.classList.add('picking'); };
    bd.ondragend = function () { bd.classList.remove('picking'); over(null); };
    bd.ondragover = function (e) { var z = e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); e.dataTransfer.dropEffect = 'move'; over(z); };
    bd.ondrop = function (e) { var z = e.target.closest('[data-drop]'); if (!z) return; e.preventDefault(); over(null); var id = +e.dataTransfer.getData('text/plain'); if (id) placeTo(id, z); };
  }
  /* 1.7.0 🗺️ 연결 지도 — 어디서 받아(🏠 Home Assistant · SmartThings) → 어느 기기가 → 어디에 붙어(📦 보관함 · 🖨️ 프린터 · 🏭 장비 · 대기 칸) → 어느 확장으로 이어지는지 한눈에
     선: 초록 = 값이 들어옴 · 회색 점선 = 끊김 · 아직 값 없음. 마디에 마우스를 올리면 그 마디의 선만 진하게, 기기를 누르면 고치기 */
  /** 1.7.2 프린터 사진(프린터 라운지 · 3D 카탈로그) — 없거나 못 불러오면 🖨️ */
  function prIcon(p) { var u = String((p && p.image) || ''); return /^(https?:\/\/|\/)[^"'<>\s]+$/.test(u) ? '<img class="hal-pimg" src="' + esc(u) + '" alt="" loading="lazy" onerror="this.replaceWith(\'🖨️\')">' : '🖨️'; }
  /* 1.14.0 🗺️ 연결 지도 필터 — 전체 · 👤 개인 · 🏢 업체마다 (이 브라우저에 기억) */
  function mapPick() { var v = pref('mapco', 'all'); return v === 'all' || v === 'mine' || coList().some(function (c) { return String(c.id) === v; }) ? v : 'all'; }
  function mapKeep(cid) { var f = mapPick(); return f === 'all' || (f === 'mine' ? !cid : +cid === +f); }
  function mapBar() {
    if (!hasCo()) return '';
    var f = mapPick(), n = function (fn) { return S.d.devices.filter(fn).length + (S.d.printers || []).filter(fn).length; };
    var opts = [['all', '📡', '전체', n(function () { return true; })], ['mine', '👤', '개인', n(function (x) { return !x.company_id; })]].concat(coList().map(function (c) { return [String(c.id), '🏢', c.name, n(function (x) { return +x.company_id === c.id; })]; }));
    return '<div class="hal-gf hal-mapf" role="tablist" aria-label="지도 범위">' + opts.map(function (o) { return '<button type="button" role="tab" data-mapco="' + esc(o[0]) + '" class="' + (f === o[0] ? 'on' : '') + '" aria-selected="' + (f === o[0]) + '"><i aria-hidden="true">' + o[1] + '</i>' + esc(o[2]) + '<em>' + o[3] + '</em></button>'; }).join('') + '</div>';
  }
  function mapView() {
    var d = S.d, N = {}, cols = [[], [], [], []], E = [], K0 = [];   // 1.14.0 K0 = 받는 곳 칸의 차례 (같은 PC 이름끼리 나란히)
    // 1.7.3 많아도 보이게 — 마디는 아이콘 · 이름만, 값 · 상태 같은 설명은 마우스를 올리면 (title)
    var node = function (c, id, html, cls, attrs, sortKey) {
      if (N[id]) return; N[id] = 1;
      var tip = esc(html.replace(/<small>/g, ' · ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim());
      attrs = attrs || ''; attrs = attrs.indexOf('title="') >= 0 ? attrs.replace('title="', 'title="' + tip + ' — ') : attrs + ' title="' + tip + '"';
      cols[c].push('<div class="hal-mn ' + (cls || '') + '" data-n="' + esc(id) + '"' + attrs + '>' + html + '</div>');
      if (c === 0) K0.push(sortKey || '\uffff' + id);
    };
    var edge = function (a, b, live) { for (var i = 0; i < E.length; i++) if (E[i][0] === a && E[i][1] === b) { E[i][2] = E[i][2] || live; return; } E.push([a, b, live]); };
    var go2 = function (u) { return u ? ' data-href="' + esc(u) + '" role="link" tabindex="0"' : ''; };   // 1.9.5 🔗 붙인 곳 · 이어지는 곳 → 그 화면
    var INV = d.config.inventory, prOf = {}; (d.printers || []).forEach(function (p) { prOf[p.id] = p; });
    var eqCo = {}; (d.equipment || []).forEach(function (e) { eqCo[e.id] = e.company_id; });
    var lbl = function (ic, t, sub) { return '<i aria-hidden="true">' + ic + '</i><span><b>' + esc(t) + '</b>' + (sub ? '<small>' + sub + '</small>' : '') + '</span>'; };
    var boxOf = {}, boxOfC = {}; (d.boxes || []).forEach(function (b) { if (!boxOf[bkey(b.name)]) boxOf[bkey(b.name)] = b; boxOfC[(+(b.company_id || 0)) + '|' + bkey(b.name)] = b; });   // 1.9.5 주인(개인 · 업체)마다
    var inst = (d.smartthings && d.smartthings.installs) || [], stOf = {};
    inst.forEach(function (s) { (s.site_devices || []).forEach(function (id) { stOf[id] = s; }); if (s.device_id) stOf[s.device_id] = stOf[s.device_id] || s; });
    // 1.7.1 🖨️ 내 프린터 모두 — 프린터 라운지가 직접 받는 연결(💻 PC 연결 프로그램)도 · 출력 상태 · 마지막으로 받은 때
    var lnk = {}; (d.printers || []).forEach(function (p) { if (p.equipment_id) lnk[p.equipment_id] = p.id; });
    var PST = { printing: '🟢 출력 중', paused: '⏸ 일시정지', done: '✅ 끝남', failed: '⚠️ 실패', idle: '쉬는 중' };
    (d.printers || []).forEach(function (p) {
      if (!mapKeep(p.company_id)) return;   // 1.14.0 🗺️ 필터
      var tn = 't:p:' + p.id, sub = ['프린터'];
      if (PST[p.state]) sub.push(PST[p.state]); if (p.seen) sub.push(agoText(p.seen));
      var on = !!p.live || d.devices.some(function (x) { return x.target === 'printer' && x.printer_id === p.id && !x.stale && !x.never; });   // 연결이 꺼졌으면 회색으로 흐릿하게
      node(2, tn, lbl(prIcon(p), p.name, esc(sub.join(' · ') + (on ? '' : ' · 연결 꺼짐'))), 'k-printer' + (on ? '' : ' gone'), go2(p.company_id ? '/my-printer/company' : '/my-printer'));
      node(3, 'x:mpr', lbl('🖨️', '프린터 라운지', '출력 상태 · 주변 온습도'), 'k-ext', go2('/my-printer')); edge(tn, 'x:mpr', !!p.live);
      if (p.equipment_id && d.config.inventory) { node(3, 'x:eq', lbl('🏭', '업체 장비', '장비 상태 · 온습도'), 'k-ext', go2('/inventory?tab=equipment')); edge(tn, 'x:eq', !!p.live); }   // 1.7.9 이어진 업체 장비
      // 1.7.4 사이트 ⇄ 💻 PC(라즈베리파이)의 연결 프로그램 ⇄ 프린터 — 프린터 라운지와 같은 이름 · SimplyPrint 는 따로
      if (p.via === 'simply') { node(0, 'src:simply', lbl('🔗', 'SimplyPrint', '클라우드로 프린터 상태를 받음'), 'k-hook'); edge('src:simply', tn, !!p.live); }
      else if ((p.via === 'script' || (p.seen && !p.via)) && p.host) { var pn = 'src:pc:' + p.host; node(0, pn, lbl('🖨️', p.host, '프린터 연결 프로그램 — 이 PC 에서 프린터 ⇄ 사이트'), 'k-hook', '', p.host.toLowerCase() + ' 1'); edge(pn, tn, !!p.live); }   // 1.14.0 💻 PC 이름 (내 프린터 0.1.95+) — 같은 PC 의 Matter 중계와 같은 이름 · 아이콘만 다르게
      else if (p.via === 'script' || (p.seen && !p.via)) { node(0, 'src:pc', lbl('💻', 'PC 연결 프로그램', 'PC · 라즈베리파이에서 프린터 ⇄ 사이트 (상태를 받고 · 원격 출력을 보냄)'), 'k-hook'); edge('src:pc', tn, !!p.live); }
    });
    d.devices.forEach(function (x) {
      if (!mapKeep(x.company_id)) return;   // 1.14.0 🗺️ 필터
      var live = !x.stale && !x.never, c = capsOf(x), dn = 'd:' + x.id, v = [];
      if (c.temp && x.temp != null) v.push('🌡️ ' + x.temp + '°'); if (c.hum && x.humidity != null) v.push('💧 ' + x.humidity + '%'); if (c.state) v.push(x.is_on ? '⚙️ 가동 중' : '⏸ 쉬는 중');
      // ① 출처
      var s = srcOf(x) === 'st' ? stOf[x.id] : null, sn;
      if (srcOf(x) === 'ha') { sn = 'src:ha'; node(0, sn, haLogo() + '<span><b>Home Assistant</b><small>값을 보내는 집</small></span>', 'k-ha'); }
      else if (srcOf(x) === 'mt') { sn = 'src:mt:' + (x.ha_server || ''); node(0, sn, mtLogo() + '<span><b>' + esc(x.ha_server_name || 'Matter') + '</b><small>Matter 중계 — 이 PC 에서 Matter 센서 → 사이트</small></span>', 'k-mt', '', String(x.ha_server_name || 'matter').toLowerCase() + ' 2'); }   // 1.13.1 중계마다 (SmartThings 로 나오던 것)
      else if (srcOf(x) === 'mq') { sn = 'src:mq:' + (x.ha_server || ''); node(0, sn, mqLogo() + '<span><b>' + esc(x.ha_server_name || 'MQTT') + '</b><small>MQTT 중계 — 브로커의 토픽 → 사이트</small></span>', 'k-mq', '', String(x.ha_server_name || 'mqtt').toLowerCase() + ' 3'); }   // 1.15.0 📨
      else if (s) { sn = 'src:st' + s.id; node(0, sn, stLogo() + '<span><b>' + esc(s.location || 'SmartThings') + '</b><small>SmartThings' + (s.status === 'active' ? '' : ' · ⚠️ ' + esc(s.status)) + '</small></span>', 'k-st'); }
      else { sn = 'src:st'; node(0, sn, stLogo() + '<span><b>SmartThings</b><small>클라우드 센서</small></span>', 'k-st'); }
      // ② 기기
      node(1, dn, lbl(c.state ? '⚙️' : c.temp && c.hum ? '🌡️' : c.hum ? '💧' : '🌡️', x.name, (live ? '<em class="on">●</em> ' : '<em class="off">●</em> ') + (v.join(' · ') || agoText(x.seen))), 'k-dev' + (live ? '' : ' off') + (x.over ? ' hot' : ''), x.perm === 'view' ? '' : ' data-edit="' + x.id + '" role="button" tabindex="0" title="눌러서 고치기"');
      edge(sn, dn, live);
      // ③ 붙인 곳
      var tn, placed = x.target !== 'other' && !!x.where;
      if (!placed) {   // 1.7.11 대기 칸 안에 그 센서들 이름 (끊긴 것은 흐리게)
        tn = 't:wait';
        var wl = d.devices.filter(function (o) { return !(o.target !== 'other' && !!o.where); });
        node(2, tn, lbl('📡', '대기 칸 ' + wl.length, '아직 붙이지 않음') + '<ul class="hal-mn-list">' + wl.map(function (o) { var oc = capsOf(o); return '<li class="' + (!o.stale && !o.never ? 'on' : 'off') + '"><i aria-hidden="true">' + (oc.state ? '⚙️' : oc.temp && oc.hum ? '🌡️' : oc.hum ? '💧' : '🌡️') + '</i>' + esc(o.name) + '</li>'; }).join('') + '</ul>', 'k-wait');
      }
      else if (x.target === 'location') { var b = boxOfC[(+(x.company_id || 0)) + '|' + bkey(x.location)] || boxOf[bkey(x.location)] || { name: x.location, company_id: x.company_id }; tn = 't:l:' + bkey(x.location); node(2, tn, lbl('📦', b.name, b.rolls != null ? '보관함 · 롤 ' + b.rolls + '개' : '보관함'), 'k-box', ' style="--bx:' + boxCol(b) + '"' + (INV ? go2(b.company_id ? '/inventory?tab=stock&company=' + b.company_id + '&box=' + encodeURIComponent(bkey(b.name)) : '/inventory?tab=drawer&box=' + encodeURIComponent(b.name)) : '')); }
      else if (x.target === 'printer') { tn = 't:p:' + x.printer_id; node(2, tn, lbl('🖨️', x.where, '프린터'), 'k-printer', go2(prOf[x.printer_id] && prOf[x.printer_id].company_id ? '/my-printer/company' : '/my-printer')); }
      else if (lnk[x.equipment_id]) { tn = 't:p:' + lnk[x.equipment_id]; }   // 1.7.9 프린터와 이어진 장비 — 프린터 하나로
      else { tn = 't:e:' + x.equipment_id; node(2, tn, lbl('🏭', x.where, '장비'), 'k-equip', INV ? go2('/inventory?tab=equipment' + (eqCo[x.equipment_id] ? '&company=' + eqCo[x.equipment_id] : '')) : ''); }
      edge(dn, tn, live);
      // ④ 이어지는 확장
      if (!placed) return;
      if (x.target === 'location' && d.config.inventory) { node(3, 'x:inv', lbl('🧵', '재고 관리', '보관함 습도 · 건조일 · 알림'), 'k-ext', go2('/inventory?tab=drawer')); edge(tn, 'x:inv', live); }
      if (x.target === 'printer') { node(3, 'x:mpr', lbl('🖨️', '프린터 라운지', '출력 상태 · 주변 온습도'), 'k-ext', go2('/my-printer')); edge(tn, 'x:mpr', live); }
      if (x.target === 'equipment' && d.config.inventory) { node(3, 'x:eq', lbl('🏭', '업체 장비', '장비 상태 · 온습도'), 'k-ext', go2('/inventory?tab=equipment')); edge(tn, 'x:eq', live); }
      if (c.state && x.target !== 'location') { node(3, 'x:mnt', lbl('🛠', '정비 수첩', '가동 시간 → 정비 때'), 'k-ext', go2('/maintenance')); edge(tn, 'x:mnt', live); }
    });
    S.mapE = E;
    var T = [['📥', '받는 곳'], ['📡', '기기'], ['📌', '붙인 곳'], ['🔗', '이어지는 곳']];
    cols[0] = cols[0].map(function (h, j) { return [K0[j], j, h]; }).sort(function (a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] - b[1]; }).map(function (x) { return x[2]; });   // 1.14.0 같은 PC 이름끼리 나란히
    return '<div class="hal-map-wrap"><p class="hal-hint">선이 <b class="hal-map-k on">초록</b>이면 값이 들어오고, <b class="hal-map-k off">회색 점선</b>이면 끊겼거나 아직 값이 없어요. 마디에 마우스를 올리면 그 연결만 진하게 · 기기를 누르면 고치기 · 붙인 곳 · 이어지는 곳을 누르면 그 화면으로.</p>' +
      '<div class="hal-map" data-map><svg class="hal-map-svg" aria-hidden="true"></svg>' + mapBar() + '<div class="hal-map-cols">' + cols.map(function (c, i) { return '<div class="hal-map-col"><h4><i aria-hidden="true">' + T[i][0] + '</i>' + T[i][1] + ' <small>' + c.length + '</small></h4>' + (c.join('') || '<p class="hal-hint">—</p>') + '</div>'; }).join('') + '</div></div></div>';
  }
  /** 선 그리기 — 마디의 실제 자리를 재서 곡선으로 (창 크기가 바뀌면 다시) */
  function mapLines() {
    var m = q('[data-map]'); if (!m) return;
    var svg = m.querySelector('svg'), r0 = m.getBoundingClientRect(), pos = {};
    m.querySelectorAll('[data-n]').forEach(function (el) { var r = el.getBoundingClientRect(); pos[el.getAttribute('data-n')] = { l: r.left - r0.left + m.scrollLeft, r: r.right - r0.left + m.scrollLeft, y: r.top - r0.top + m.scrollTop + r.height / 2 }; });   // 좁은 화면은 옆으로 밀림 — 민 만큼 더함
    svg.setAttribute('width', m.scrollWidth); svg.setAttribute('height', m.scrollHeight);
    svg.innerHTML = (S.mapE || []).map(function (e) {
      var a = pos[e[0]], b = pos[e[1]]; if (!a || !b) return '';
      var x1 = a.r, x2 = b.l, dx = Math.max(24, (x2 - x1) / 2);
      return '<path data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" class="' + (e[2] ? 'on' : 'off') + '" d="M' + x1 + ' ' + a.y + ' C' + (x1 + dx) + ' ' + a.y + ' ' + (x2 - dx) + ' ' + b.y + ' ' + x2 + ' ' + b.y + '"/>' +
        // 1.9.5 선이 붙는 곳 — 양 끝에 점
        '<circle data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" class="' + (e[2] ? 'on' : 'off') + '" cx="' + x1 + '" cy="' + a.y + '" r="4"/><circle data-a="' + esc(e[0]) + '" data-b="' + esc(e[1]) + '" class="' + (e[2] ? 'on' : 'off') + '" cx="' + x2 + '" cy="' + b.y + '" r="4"/>';
    }).join('');
  }
  function mapBind() {
    var m = q('[data-map]'); if (!m) return;
    mapLines();
    if (!S.mapRs) { S.mapRs = true; var t = 0; addEventListener('resize', function () { clearTimeout(t); t = setTimeout(function () { if (S.root && S.root.querySelector('[data-map]')) mapLines(); }, 120); }); }
    var hl = function (id) {
      var keep = {}; if (id) keep[id] = 1;
      m.querySelectorAll('path,circle').forEach(function (p) { var hit = id && (p.getAttribute('data-a') === id || p.getAttribute('data-b') === id); p.classList.toggle('hl', !!hit); p.classList.toggle('dim', !!id && !hit); if (hit) { keep[p.getAttribute('data-a')] = 1; keep[p.getAttribute('data-b')] = 1; } });
      m.querySelectorAll('[data-n]').forEach(function (el) { el.classList.toggle('dim', !!id && !keep[el.getAttribute('data-n')]); });
    };
    m.addEventListener('mouseover', function (e) { var n = e.target.closest('[data-n]'); hl(n ? n.getAttribute('data-n') : ''); });
    m.addEventListener('mouseleave', function () { hl(''); });
    var open = function (e) { if (e.target.closest('[data-edit]')) return; var h = e.target.closest('[data-href]'); if (!h) return; e.preventDefault(); go(h.getAttribute('data-href')); };   // 1.9.5 🔗 그 화면으로
    m.addEventListener('click', open);
    m.addEventListener('keydown', function (e) { if (e.key === 'Enter') open(e); });
  }
  function redraw() { var y = window.scrollY; draw(); window.scrollTo(0, y); }
  function selBind() {
    qa('[data-sel-on]').forEach(function (b) { b.onclick = function () { S.sel = {}; redraw(); }; });
    qa('[data-sel-off]').forEach(function (b) { b.onclick = function () { S.sel = null; redraw(); }; });
    qa('[data-sel]').forEach(function (c) { c.onchange = function () { var id = c.getAttribute('data-sel'); if (c.checked) S.sel[id] = 1; else delete S.sel[id]; redraw(); }; });
    qa('[data-sel-all]').forEach(function (c) { c.onchange = function () { S.sel = {}; if (c.checked) S.d.devices.forEach(function (x) { S.sel[x.id] = 1; }); redraw(); }; });
    qa('[data-sel-stale]').forEach(function (b) { b.onclick = function () { S.sel = {}; S.d.devices.forEach(function (x) { if (x.stale) S.sel[x.id] = 1; }); redraw(); }; });
    qa('[data-sel-grp]').forEach(function (s) { s.onchange = function () {   // 1.4.6 📁
      var ids = Object.keys(S.sel).map(Number); if (!ids.length || s.value === '-') return;
      s.disabled = true;
      api('POST', '/devices/group', { ids: ids, grp: s.value }).then(function (r) { toast(r.message); S.sel = null; S.d = r.data.overview; redraw(); }).catch(function (e) { fail(e); redraw(); });
    }; });
    qa('[data-sel-del]').forEach(function (b) { b.onclick = function () {
      var ids = Object.keys(S.sel).map(Number); if (!ids.length) return;
      if (!confirm('고른 기기 ' + ids.length + '개를 지울까요?\n온습도 기록 · 가동 시간 · 사진도 같이 지워지고 되돌릴 수 없어요. (SmartThings 센서는 고른 것에서 빠져요)')) return;
      b.disabled = true; b.textContent = '지우는 중…';
      api('POST', '/devices/delete', { ids: ids }).then(function (r) { toast(r.message); S.sel = null; S.d = r.data.overview; redraw(); }).catch(function (e) { fail(e); redraw(); });
    }; });
  }
  function draw() {
    if (S.sel) { var have = {}; S.d.devices.forEach(function (x) { have[x.id] = 1; }); Object.keys(S.sel).forEach(function (k) { if (!have[k]) delete S.sel[k]; }); if (!S.d.devices.length) S.sel = null; }
    var d = S.d, live = d.devices.filter(function (x) { return !x.stale; }).length, over = d.devices.filter(function (x) { return x.over; }).length;
    wrap('<section class="hal-hero"><div><h1>📡 IoT 연결</h1><p>Home Assistant · SmartThings · Matter 의 온습도 센서 · 프린터 · 장비 상태를 받아 재고 관리 · 정비 수첩 · 내 프린터에 이어요.</p></div>' +
      '<div class="hal-stats"><span title="연결할 수 있는 기기 (관리자가 정함)">기기 <b>' + d.devices.length + '</b>' + (d.limits ? (d.limits.admin ? ' <small title="관리자는 기기 수 한도가 없어요">· 관리자 무제한</small>' : ' / ' + d.limits.member) : '') + '</span><span>🟢 연결됨 <b>' + live + '</b></span>' + (over ? '<span class="hot">⚠️ 기준 넘음 <b>' + over + '</b></span>' : '') + '<button class="hal-btn ghost" data-guide title="연결 방법 보기" aria-label="연결 방법 보기">❓ 연결 방법</button>' + (d.devices.length > 1 && !S.sel ? '<button class="hal-btn ghost" data-sel-on title="체크 박스로 골라 한 번에 분류 옮기기 · 지우기">☑️ 여러 개 고르기</button>' : '') + (d.slots && d.slots.enabled ? ' <button class="hal-btn ghost" data-slot title="' + (d.slots.selling ? '코인 · 마일리지로 센서 칸 사기 · 구매한 칸 보기' : '구매한 센서 칸 보기 · 취소') + '">💳 ' + (d.slots.selling ? '칸 늘리기' : '구매한 칸') + '</button>' : '') + ' <button class="hal-btn light" data-new>➕ 기기 연결</button></div></section>' +
      srcCard() +
      (d.devices.length ? scopeBar() + (scope() === 'map' ? mapView() : (S.sel ? selBar() : '') + tools() + (pref('view', 'card') === 'board' ? board() : grouped())) +
        '<p class="hal-note">' + (liveSec() ? '🔄 이 화면은 ' + (liveSec() >= 60 && liveSec() % 60 === 0 ? liveSec() / 60 + '분' : liveSec() + '초') + '마다 스스로 새 값을 받아 와요' : '🔄 새 값을 보려면 화면을 새로 고쳐 주세요') + ' (Home Assistant 는 ' + (d.config.send_mode === 'change' ? '값이 변하면' : (d.config.interval_min || 10) + '분마다') + ' · 상태가 바뀌면 바로 보내요).</p><p class="hal-note">🔒 받는 주소는 비밀번호와 같아요 — 남에게 보이지 마세요. 사이트가 내 집으로 접속하지 않고, 내 Home Assistant 가 보내는 값만 받아요.' + (d.config.inventory ? ' · <a href="/inventory?tab=drawer" data-go>🧵 필라멘트 서랍 보기 (재고 관리)</a>' : '') + '</p>'
        : '<section class="hal-start"><h2>' + haLogo() + ' Home Assistant 는 세 걸음이면 돼요</h2><ol><li><b>① HACS 에서 「3ds」 설치</b><span>단추 한 번으로 저장소가 들어가요</span></li><li><b>② 사이트 주소 · 연결 코드 붙여 넣기</b><span>복사 단추 두 번</span></li><li><b>③ 「⚡ 알아서 찾아 연결」 → 확인</b><span>내 프린터 · 필라멘트 보관 위치와 이름이 맞는 것을 찾아 줘요</span></li></ol><div class="hal-row center"><button class="hal-btn pri big" data-new>➕ 첫 기기 연결하기</button><button class="hal-btn big" data-guide>❓ 그림으로 보는 연결 방법</button></div></section>'));
    qa('[data-guide]').forEach(function (b) { b.onclick = function () { guideBox(); }; });
    qa('[data-srctab]').forEach(function (b) { b.onclick = function () { setPref('srctab', b.getAttribute('data-srctab')); redraw(); }; });   // 1.7.16
    qa('[data-scope]').forEach(function (b) { b.onclick = function () { setPref('scope', b.getAttribute('data-scope')); setPref('gf', 'all'); S.lim = 0; redraw(); }; });   // 1.5.0
    qa('[data-gf]').forEach(function (b) { b.onclick = function () { setPref('gf', b.getAttribute('data-gf')); S.lim = 0; redraw(); }; });   // 1.4.6 분류 고르기 · 보기 모양
    qa('[data-src]').forEach(function (b) { b.onclick = function () { setPref('src', b.getAttribute('data-src')); S.lim = 0; redraw(); }; });   // 1.4.7 출처
    qa('[data-co]').forEach(function (b) { b.onclick = function () { setPref('co', b.getAttribute('data-co')); S.lim = 0; redraw(); }; });   // 1.8.0 🏢 업체
    qa('[data-mapco]').forEach(function (b) { b.onclick = function () { setPref('mapco', b.getAttribute('data-mapco')); redraw(); }; });   // 1.14.0 🗺️ 지도 필터
    qa('[data-hasrv]').forEach(function (b) { b.onclick = function () { var v = b.getAttribute('data-hasrv'); setPref('hasrv', v); if (v !== 'all') setPref('src', 'ha'); S.lim = 0; redraw(); }; });   // 1.8.0 🏠 HA 서버
    moreBind();
    qa('[data-view]').forEach(function (b) { b.onclick = function () { setPref('view', b.getAttribute('data-view')); redraw(); }; });
    qa('details[data-grp]').forEach(function (g) { g.addEventListener('toggle', function () { var was = grpFold(g.getAttribute('data-grp')); try { localStorage.setItem('hal:grp:' + g.getAttribute('data-grp'), g.open ? '1' : '0'); } catch (e) {} if (g.open && was) redraw(); }); });   // 1.4.7 접혀 있던 묶음을 펴면 그 카드를 그림   // 1.4.6 접은 분류 기억
    stBind();
    boardBind();
    stripBind();
    mapBind();
    qa('[data-snap]').forEach(function (b) { snapLoad(b); b.onclick = function () { var u = SNAP[b.getAttribute('data-snap')]; if (u && u.url) modal('📷 ' + esc(find(b.getAttribute('data-snap')).name), '<img class="hal-snapbig" src="' + u.url + '" alt="">'); }; });
    qa('[data-new]').forEach(function (b) { b.onclick = function () { connectBox(); }; });
    qa('[data-new-mt]').forEach(function (b) { b.onclick = function () { form(null, 'mt'); }; });   // 1.10.0 🧩
    qa('[data-guide-mt]').forEach(function (b) { b.onclick = function () { guideBox('mt'); }; });
    mtWinBind(document);   // 1.11.0 🪟
    mqBind();   // 1.15.0 📨
    qa('[data-slot]').forEach(function (b) { b.onclick = function () { slotBox(); }; });   // 1.4.8 💳
    qa('[data-edit]').forEach(function (b) { b.onclick = function () { var dv = find(b.getAttribute('data-edit')); if (dv && dv.perm === 'view') { toast('🏢 업체 기기는 그 업체 대표 · 관리자만 고칠 수 있어요.'); return; } form(dv); }; });   // 1.5.0
    qa('[data-yaml]').forEach(function (b) { b.onclick = function () { yamlBox(find(b.getAttribute('data-yaml'))); }; });
    qa('[data-revive]').forEach(function (b) { b.onclick = function () { revive(b); }; });
    selBind();
  }

  /* 1.1.2 SmartThings 로고 (공식 심볼 — 하늘색 둥근 네모 안의 흰 허브 · 연결점). 그림 파일 없이 SVG 한 줄: 흰 바탕 + 심볼. 상표는 삼성의 것 — 연결 대상을 가리키는 데에만 씀
   *   심볼 모양 출처: Simple Icons (CC0) — SmartThings press kit */
  var ST_PATH = 'M11.51 0C8.338 0 5.034.537 2.694 2.694.5 5.174 0 8.464 0 11.525v.942c0 3.165.537 6.499 2.694 8.84C5.188 23.513 8.494 24 11.569 24h.854c3.18 0 6.528-.53 8.883-2.694C23.514 18.811 24 15.5 24 12.423v-.853c0-3.18-.53-6.528-2.694-8.876C18.826.494 15.544 0 12.482 0zM12 3.505c1.244 0 2.256.99 2.256 2.206 0 1.065-.685 1.976-1.715 2.181v1.59c1.48.214 2.528 1.43 2.528 2.934 0 1.654-1.377 3-3.07 3-1.692 0-3.068-1.346-3.068-3 0-.17.017-.335.045-.497l-1.536-.488a2.258 2.258 0 01-1.962 1.12c-.237 0-.471-.037-.698-.11-1.183-.375-1.833-1.622-1.449-2.78a2.246 2.246 0 012.146-1.524c.237 0 .471.036.698.108a2.23 2.23 0 011.313 1.098c.204.391.282.823.232 1.249l1.535.488c.44-.86 1.378-1.453 2.384-1.599V7.892c-1.029-.205-1.896-1.116-1.896-2.181 0-1.217 1.012-2.206 2.257-2.206zm0 .882c-.747 0-1.354.594-1.354 1.324 0 .73.607 1.324 1.354 1.324.746 0 1.354-.594 1.354-1.324 0-.73-.608-1.324-1.354-1.324zm6.522 3.75c.98 0 1.843.613 2.146 1.525.186.56.138 1.158-.135 1.683-.274.526-.74.915-1.314 1.096-.227.073-.461.11-.698.11a2.258 2.258 0 01-1.962-1.12l-.634.201-.278-.838.632-.202a2.21 2.21 0 011.546-2.347c.226-.072.46-.108.697-.108zM5.476 9.02c-.588 0-1.105.368-1.287.915-.23.694.159 1.442.869 1.668.136.043.277.065.419.065.588 0 1.105-.368 1.287-.915a1.29 1.29 0 00-.081-1.01 1.338 1.338 0 00-.788-.658 1.377 1.377 0 00-.42-.065zm13.045 0c-.142 0-.282.021-.419.065a1.32 1.32 0 00-.869 1.668c.182.547.7.915 1.287.915.142 0 .283-.022.42-.065.344-.11.623-.343.787-.659.165-.315.193-.673.082-1.009a1.348 1.348 0 00-1.288-.915zM12 10.474c-1.095 0-1.986.871-1.986 1.942 0 1.07.89 1.941 1.986 1.941 1.094 0 1.985-.87 1.985-1.94 0-1.072-.89-1.943-1.985-1.943zm-2.706 4.831l.73.519-.39.526c.709.757.801 1.925.16 2.787-.423.57-1.106.91-1.827.91-.478 0-.937-.147-1.325-.422a2.177 2.177 0 01-.499-3.082 2.28 2.28 0 012.76-.71zm5.41 0l.392.528a2.285 2.285 0 012.76.71 2.178 2.178 0 01-.499 3.082 2.275 2.275 0 01-1.325.421 2.28 2.28 0 01-1.827-.91 2.172 2.172 0 01.16-2.785l-.39-.527zm-6.734 1.21c-.433 0-.843.205-1.097.547-.44.59-.304 1.42.3 1.849a1.37 1.37 0 001.891-.293c.44-.59.305-1.42-.3-1.85a1.364 1.364 0 00-.794-.252zm8.059 0c-.287 0-.561.088-.795.254a1.307 1.307 0 00-.299 1.849 1.371 1.371 0 001.891.293 1.307 1.307 0 00.3-1.85 1.37 1.37 0 00-1.097-.545Z';
  /* 1.4.3 Home Assistant 로고 (공식 심볼 — 집 · 회로 · SmartThings 하늘색과 구분되게 주황). 그림 파일 없이 SVG 한 줄. 상표는 Home Assistant(Open Home Foundation)의 것 — 연결 대상 표시로만 씀
   *   심볼 모양 출처: Simple Icons (CC0) — home-assistant/assets */
  var HA_PATH = 'M22.939 10.627 13.061.749a1.505 1.505 0 0 0-2.121 0l-9.879 9.878C.478 11.21 0 12.363 0 13.187v9c0 .826.675 1.5 1.5 1.5h9.227l-4.063-4.062a2.034 2.034 0 0 1-.664.113c-1.13 0-2.05-.92-2.05-2.05s.92-2.05 2.05-2.05 2.05.92 2.05 2.05c0 .233-.041.456-.113.665l3.163 3.163V9.928a2.05 2.05 0 0 1-1.15-1.84c0-1.13.92-2.05 2.05-2.05s2.05.92 2.05 2.05a2.05 2.05 0 0 1-1.15 1.84v8.127l3.146-3.146A2.051 2.051 0 0 1 18 12.239c1.13 0 2.05.92 2.05 2.05s-.92 2.05-2.05 2.05c-.25 0-.488-.047-.709-.13L12.9 20.602v3.088h9.6c.825 0 1.5-.675 1.5-1.5v-9c0-.825-.477-1.977-1.061-2.561z';
  function haLogo(cls) { return '<svg class="hal-stl hal-hal' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="#18BCF2" d="' + HA_PATH + '"/></svg>'; }
  function stLogo(cls) { return '<svg class="hal-stl' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="2" y="2" width="20" height="20" rx="5" fill="#fff"/><path fill="#15BFFF" d="' + ST_PATH + '"/></svg>'; }

  /* ── 📡 SmartThings 카드 ──
   *  1.1.0 로그인 연결 (API Access App · OAuth): 「🔗 SmartThings 연결하기」 → 삼성 계정 로그인 → 허용 → 돌아와서 「⚙️ 센서 고르기」. 센서 하나가 기기 카드 하나.
   *  0.2.0 예전 방식(연결 코드 · SmartApp)은 관리자가 켰거나 그렇게 이은 것이 있을 때만 접어 둔 칸에 보임 */
  var ST_STATUS = { active: ['on', '연결됨'], syncing: ['wait', '센서 맞추는 중'], choose: ['wait', '센서를 골라 주세요'], unlinked: ['off', '회원과 안 이어짐'], error: ['bad', '확인이 필요해요'] };
  /* 1.1.0 💳 고지 — 삼성이 SmartThings API 를 유료 플랜으로 바꾸는 중이라 무료 이용이 중지될 수 있음. 연결하기 전 · 연결한 뒤 · 연결 방법 · 센서 고르기에 늘 보임 */
  var ST_PAY_URL = 'https://blog.smartthings.com/smartthings-updates/a-new-enhanced-smartthings-api-experience/';
  function stPay() {
    return '<p class="hal-note-pay" role="note">💳 <b>미리 알려 드려요</b> — 삼성이 2026년 10월부터 SmartThings 연동(API)을 <b>유료 이용제</b>로 바꾸고 있어요. 그래서 이 연결은 삼성의 정책에 따라 <b>무료 이용이 중지되어 값이 더 들어오지 않게 될 수 있어요</b>. ' +
      '값이 멈추면 기기 카드에 「끊김」으로 보이고, 기기 카드와 그동안의 기록은 그대로 남아요. <a href="' + ST_PAY_URL + '" target="_blank" rel="noopener">삼성 SmartThings 의 안내 글</a></p>';
  }
  function minsLeft(at) { return Math.max(0, Math.ceil((new Date(at.replace(' ', 'T')) - new Date(S.d.now.replace(' ', 'T'))) / 60000)); }
  /* 1.7.16 받는 곳 칸 — 탭으로 SmartThings · 🏠 Home Assistant (HA 로 이은 센서도 같은 자리에서) */
  function srcCard() {
    var d = S.d, ha = d.devices.filter(function (x) { return srcOf(x) === 'ha'; }), st = d.smartthings, ins = (st && st.installs) || [];
    var svs = haServers(), many = svs.length > 1;   // 1.8.0 🏠 HA 서버마다 탭 (하나면 예전처럼 「Home Assistant」 하나)
    var mts = d.devices.filter(function (x) { return srcOf(x) === 'mt'; });   // 1.10.0 🧩
    var mqs = d.devices.filter(function (x) { return srcOf(x) === 'mq'; });   // 1.15.0 📨
    var tab = pref('srctab', ''), ok = tab === 'st' || tab === 'mt' || tab === 'mq' || (!many && tab === 'ha') || (many && tab.indexOf('ha:') === 0 && svs.some(function (v) { return 'ha:' + v.id === tab; }));
    if (!ok) tab = ins.length || !ha.length ? 'st' : many ? 'ha:' + svs[0].id : 'ha';
    if (!st && tab === 'st') tab = many ? 'ha:' + svs[0].id : 'ha';
    var stOn = ins.filter(function (x) { return x.status === 'active'; }).length;
    var haTab = function (key, label, xs) { var on = xs.filter(function (x) { return !x.stale && !x.never; }).length; return '<button type="button" role="tab" data-srctab="' + esc(key) + '" class="' + (tab === key ? 'on' : '') + '" aria-selected="' + (tab === key) + '">' + haLogo() + ' ' + recvDot(key) + esc(label) + ' <small>' + (xs.length ? '🟢 ' + on + ' / ' + xs.length : '–') + '</small></button>'; };
    var bar = '<div class="hal-srctabs" role="tablist" aria-label="받는 곳">' + (st ? '<button type="button" role="tab" data-srctab="st" class="' + (tab === 'st' ? 'on' : '') + '" aria-selected="' + (tab === 'st') + '">' + stLogo() + ' ' + (many ? recvDot('st') : '') + 'SmartThings <small>' + (ins.length ? '🟢 ' + stOn + ' / ' + ins.length : '–') + '</small></button>' : '') +
      (many ? svs.map(function (v) { return haTab('ha:' + v.id, v.label, ha.filter(function (x) { return (x.ha_server || '') === v.id; })); }).join('') : haTab('ha', 'Home Assistant', ha)) +
      '<button type="button" role="tab" data-srctab="mt" class="' + (tab === 'mt' ? 'on' : '') + '" aria-selected="' + (tab === 'mt') + '">' + mtLogo() + ' ' + recvDot('mt') + 'Matter <small>' + (mts.length ? '🟢 ' + mts.filter(function (x) { return !x.stale && !x.never; }).length + ' / ' + mts.length : '–') + '</small></button>' +
      '<button type="button" role="tab" data-srctab="mq" class="' + (tab === 'mq' ? 'on' : '') + '" aria-selected="' + (tab === 'mq') + '">' + mqLogo() + ' ' + recvDot('mq') + 'MQTT <small>' + (mqs.length ? '🟢 ' + mqs.filter(function (x) { return !x.stale && !x.never; }).length + ' / ' + mqs.length : '–') + '</small></button></div>';
    var cur = many && tab.indexOf('ha:') === 0 ? svs.filter(function (v) { return 'ha:' + v.id === tab; })[0] : null;
    return '<div class="hal-srcbox">' + bar + (tab === 'st' ? stCard() : tab === 'mt' ? mtCard(mts) : tab === 'mq' ? mqCard(mqs) : haCard(cur ? ha.filter(function (x) { return (x.ha_server || '') === cur.id; }) : ha, cur)) + '</div>';
  }
  /** 🏠 Home Assistant 로 이은 센서 — HA 의 「3ds」 통합이 고른 것 (누르면 고치기) */
  function haCard(ha, srv) {   // 1.8.0 srv = 탭으로 고른 HA 서버
    var on = ha.filter(function (x) { return !x.stale && !x.never; }).length, off = ha.filter(function (x) { return x.stale && !x.never; }).length;
    var pill = ha.length ? (off ? '<span class="hal-pill bad">⚠️ 끊김 ' + off + '</span>' : on ? '<span class="hal-pill on">🟢 연결됨' + (on > 1 ? ' ' + on : '') + '</span>' : '<span class="hal-pill wait">⏳ 값을 기다리는 중</span>') : '<span class="hal-pill">연결 안 됨</span>';
    var head = '<header class="hal-stc-h"><span class="hal-stc-logo ha" aria-hidden="true">' + haLogo() + '</span><div><h2>' + (srv ? '🏠 ' + esc(srv.label) : 'Home Assistant') + '</h2><p>HA 의 「3ds」 통합에서 고른 온습도 센서 · 프린터 · 장비 상태가 사이트로 들어와요 (사이트가 HA 에 접속하지 않아요).</p></div>' + pill + '</header>';
    var chips = ha.map(function (x) {
      var c = capsOf(x), live = !x.stale && !x.never, v = [];
      if (c.temp && x.temp != null) v.push(x.temp + '°'); if (c.hum && x.humidity != null) v.push(x.humidity + '%'); if (c.state) v.push(x.is_on ? '가동 중' : '쉬는 중');
      return '<button type="button" class="hal-hachip' + (live ? '' : ' off') + '"' + (x.perm === 'view' ? '' : ' data-edit="' + x.id + '"') + ' title="' + esc(x.name + ' · ' + (x.where || '📡 대기 칸') + ' · ' + (x.never ? '값을 기다리는 중' : agoText(x.seen))) + '"><span class="hal-dot ' + (x.never ? 'wait' : live ? 'on' : 'off') + '"></span>' + ICON[x.target] + ' ' + esc(x.name) + (v.length ? '<small>' + esc(v.join(' · ')) + '</small>' : '') + '</button>';
    }).join('');
    return '<section class="hal-stc ha">' + head + (ha.length ? '<div class="hal-stc-devs ha">' + chips + '</div>'
      : '<p class="hal-hint">아직 HA 로 이은 센서가 없어요 — HACS 에서 「3ds」를 설치하고 사이트 주소 · 연결 코드를 붙여 넣으면 돼요.</p>') +
      '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-new>➕ 기기 연결</button><button type="button" class="hal-btn sm" data-guide>❓ 연결 방법</button></div>' +
      '<p class="hal-hint">센서를 더하거나 빼려면 HA › 설정 › 기기 및 서비스 › 3ds › <b>구성</b>. 이름이 보관함 · 프린터 · 장비와 거의 같으면 거기에, 아니면 📡 대기 칸으로 들어와요.</p></section>';
  }
  /** 1.10.0 🧩 Matter — 집 안 Matter 서버에 붙은 「3ds Matter 연결」 프로그램이 보낸 온습도 (애플 홈 · 구글 홈 센서를 「다른 앱과 공유」로) */
  function mtCard(xs) {
    var on = xs.filter(function (x) { return !x.stale && !x.never; }).length, off = xs.filter(function (x) { return x.stale && !x.never; }).length;
    var pill = xs.length ? (off ? '<span class="hal-pill bad">⚠️ 끊김 ' + off + '</span>' : on ? '<span class="hal-pill on">🟢 연결됨' + (on > 1 ? ' ' + on : '') + '</span>' : '<span class="hal-pill wait">⏳ 값을 기다리는 중</span>') : '<span class="hal-pill">연결 안 됨</span>';
    var chips = xs.map(function (x) {
      var live = !x.stale && !x.never, v = [];
      if (x.temp != null) v.push(x.temp + '°'); if (x.humidity != null) v.push(x.humidity + '%');
      return '<button type="button" class="hal-hachip' + (live ? '' : ' off') + '"' + (x.perm === 'view' ? '' : ' data-edit="' + x.id + '"') + ' title="' + esc(x.name + ' · ' + (x.where || '📡 대기 칸') + ' · ' + (x.never ? '값을 기다리는 중' : agoText(x.seen))) + '"><span class="hal-dot ' + (x.never ? 'wait' : live ? 'on' : 'off') + '"></span>' + ICON[x.target] + ' ' + esc(x.name) + (v.length ? '<small>' + esc(v.join(' · ')) + '</small>' : '') + '</button>';
    }).join('');
    return '<section class="hal-stc mt"><header class="hal-stc-h"><span class="hal-stc-logo mt" aria-hidden="true">' + mtLogo() + '</span><div><h2>Matter <small>3ds 연결</small></h2><p>애플 홈 · 구글 홈 · SmartThings 에 넣어 둔 Matter 온습도 센서를, 집 안의 「3ds Matter 연결」 프로그램이 사이트로 보내요 (Home Assistant 없이 · 사이트가 집에 접속하지 않아요).</p></div>' + pill + '</header>' +
      (xs.length ? '<div class="hal-stc-devs ha">' + chips + '</div><details class="hal-mtmore"><summary>💻 다른 기기에 설치 (윈도우 · 리눅스 · 맥)</summary>' + mtWin() + '</details>' : '<p class="hal-hint">아직 Matter 로 이은 센서가 없어요 — 늘 켜 두는 PC 에 아래 한 줄로 중계를 설치하면, 센서마다 기기가 저절로 생겨요.</p>' + mtWin()) +
      '<div class="hal-row hal-stc-more"><button type="button" class="hal-btn sm" data-new-mt title="Docker 판에 키를 직접 넣을 때">🔑 직접 만들기</button><button type="button" class="hal-btn sm" data-guide-mt>❓ 연결 방법</button><a class="hal-btn sm" href="' + MT_REPO + '#readme" target="_blank" rel="noopener">📖 설치 안내</a></div></section>';
  }
  /* ── 1.15.0 📨 MQTT 중계 — 집 안 MQTT 브로커(Mosquitto · HA 의 Mosquitto 애드온)의 온습도 토픽 (Zigbee2MQTT · Tasmota · Shelly · ESPHome) → 「3ds MQTT 중계」 → 사이트
   *  브로커 주소 · 포트 · 계정 · 토픽은 여기서 (비밀번호는 사이트에 암호화 · 중계가 연결 코드로 받아 감) · 중계가 찾은 토픽에서 「➕ 받기」를 누른 것만 기기로 */
  function mqLogo(cls) { return '<svg class="hal-stl hal-mql' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" d="M3.5 20.5A17 17 0 0 1 20.5 3.5M3.5 14.5A11 11 0 0 1 14.5 3.5M3.5 8.5a5 5 0 0 1 5-5"/><circle cx="18" cy="18" r="3" fill="currentColor"/></svg>'; }
  function mqOs() { var v = pref('mqos', ''); return v === 'win' || v === 'sh' ? v : mtOs(); }
  function mqLine(os) { var L = S.d.link || {}, sh = (os || mqOs()) === 'sh', u = (L.site || location.origin) + API + '/mq/' + (L.code || '') + (sh ? '.sh' : '.ps1'); return sh ? 'curl -fsSL "' + u + '" | bash' : 'irm "' + u + '" | iex'; }
  function mqWin(os) {
    os = os || mqOs();
    var sh = os === 'sh';
    return '<section class="hal-sec hal-mtwin hal-mqwin" data-mqos="' + os + '"><h4>' + mqLogo() + ' 중계 설치 <small>한 줄 · 따로 깔 것 없음</small></h4>' +
      '<div class="hal-seg hal-mtos" role="tablist"><button type="button" role="tab" data-mq-os="win" class="' + (sh ? '' : 'on') + '" aria-selected="' + !sh + '">🪟 윈도우</button><button type="button" role="tab" data-mq-os="sh" class="' + (sh ? 'on' : '') + '" aria-selected="' + sh + '">🐧 리눅스 · 🍎 맥 · 🍓 라즈베리파이</button></div>' +
      '<div class="hal-copy"><span>' + (sh ? '터미널' : 'PowerShell') + '</span><code data-mq-line>' + esc(mqLine(os)) + '</code><button type="button" class="hal-btn sm pri" data-mq-cp>📋 복사</button></div>' +
      '<ol class="hal-stc-steps"><li><em>1</em>위 ⚙️ 브로커 설정 저장</li><li><em>2</em>' + (sh ? '<b>터미널</b> 열기 (SSH 도 돼요)' : '시작 › <b>PowerShell</b> 열기') + '</li><li><em>3</em>붙여 넣고 Enter</li></ol>' +
      '<p class="hal-hint">브로커와 같은 집 네트워크의 늘 켜 두는 기기에 · 켤 때마다 저절로 시작해요' + (sh ? ' (python3 기본 기능만 · systemd · crontab · 맥은 launchd)' : '') + '. 🔒 한 줄에 내 연결 코드가 들어 있어요 (남에게 보이지 마세요).</p></section>';
  }
  function mqWinBind(root) {
    Array.prototype.forEach.call(root.querySelectorAll('[data-mq-cp]'), function (b) { b.onclick = function () { var box = b.closest('.hal-mqwin'); copy(mqLine(box && box.getAttribute('data-mqos')), b); }; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-mq-os]'), function (b) { b.onclick = function () { var os = b.getAttribute('data-mq-os'), box = b.closest('.hal-mqwin'); setPref('mqos', os); if (!box) return; var t = document.createElement('div'); t.innerHTML = mqWin(os); var nb = t.firstChild; box.parentNode.replaceChild(nb, box); mqWinBind(nb.parentNode); }; });
  }
  function mqLive(r) { return !!(r && r.at && new Date(S.d.now.replace(' ', 'T')) - new Date(String(r.at).replace(' ', 'T')) < 180000); }   // 중계는 30초마다 알림 — 3분 넘게 없으면 꺼진 것
  function mqBad(r) { return !!(r && r.broker && r.broker !== 'ok' && r.broker !== 'start'); }
  function mqCard(xs) {
    var M = S.d.mqtt || { seen: [], topics: ['#'], port: 1883, host: '' }, R = M.relay, live = mqLive(R), bad = live && mqBad(R);
    var pill = !M.saved ? '<span class="hal-pill wait">⚙️ 브로커 설정 전</span>' : !R ? '<span class="hal-pill">연결 안 됨</span>' : !live ? '<span class="hal-pill bad">⚠️ 중계 꺼짐</span>' : bad ? '<span class="hal-pill bad">⚠️ 브로커 확인</span>' : '<span class="hal-pill on">🟢 연결됨' + (M.picked ? ' ' + M.picked : '') + '</span>';
    var brk = '<div class="hal-mqb"><div><b>📮 ' + esc(M.host || '브로커 주소 없음') + ':' + esc(M.port) + '</b><small>' + (M.user ? '👤 ' + esc(M.user) + (M.has_pass ? ' · 🔑 비밀번호' : '') : '계정 없음') + (M.tls ? ' · 🔒 TLS' : '') + ' · 토픽 <code>' + esc(M.topics.join('  ')) + '</code></small></div><button type="button" class="hal-btn sm' + (M.saved ? '' : ' pri') + '" data-mq-set>⚙️ 브로커 설정</button></div>' +
      (R ? '<p class="hal-hint hal-mqr">💻 <b>' + esc(R.name || '중계') + '</b> · ' + (live ? '🟢 ' : '⚪ ') + esc(agoText(R.at)) + (bad ? ' · <b class="hal-mqerr">⚠️ ' + esc(R.broker) + '</b>' : '') + '</p>' : '');
    var row = function (s) {
      var on = s.device_id != null, dv = on ? find(s.device_id) : null, v = [];
      if (s.temperature != null) v.push('🌡️ ' + s.temperature + '°'); if (s.humidity != null) v.push('💧 ' + s.humidity + '%');
      return '<li class="hal-mqi' + (on ? ' on' : '') + '"><div><b>' + esc(dv ? dv.name : s.name) + '</b><small>' + esc(v.join(' · ') || '–') + ' · <code>' + esc(s.key) + '</code> · ' + esc(agoText(s.at)) + '</small></div>' +
        (on ? '<button type="button" class="hal-btn sm" data-mq-off="' + esc(s.key) + '" title="그만 받기 (기기 · 기록은 그대로)">✅ 받는 중</button>' : '<button type="button" class="hal-btn sm pri" data-mq-on="' + esc(s.key) + '">➕ 받기</button>') + '</li>';
    };
    var seen = M.seen || [], top = seen.filter(function (s, i) { return s.device_id != null || i < 8; }), rest = seen.filter(function (s, i) { return s.device_id == null && i >= 8; });
    var list = seen.length ? '<h4 class="hal-mqh">🔎 찾은 센서 <small>' + seen.length + '개 · 「➕ 받기」를 누른 것만 기기로 (📡 대기 칸)</small></h4><ul class="hal-mql">' + top.map(row).join('') + '</ul>' +
        (rest.length ? '<details class="hal-mtmore"><summary>나머지 ' + rest.length + '개 보기</summary><ul class="hal-mql">' + rest.map(row).join('') + '</ul></details>' : '')
      : '<p class="hal-hint">' + (R && live ? '🔎 중계가 브로커에서 온습도 토픽을 찾는 중이에요 — 센서가 값을 올리면 여기에 보여요 (토픽 칸이 맞는지도 봐 주세요).' : '아직 찾은 센서가 없어요 — 브로커 설정을 저장하고, 늘 켜 두는 PC 에 아래 한 줄로 중계를 설치하면 브로커의 온습도 토픽이 여기에 보여요.') + '</p>';
    return '<section class="hal-stc mq"><header class="hal-stc-h"><span class="hal-stc-logo mq" aria-hidden="true">' + mqLogo() + '</span><div><h2>MQTT <small>3ds 중계</small></h2><p>Zigbee2MQTT · Tasmota · Shelly · ESPHome 처럼 집 안 MQTT 브로커에 올라오는 온습도 값을, 「3ds MQTT 중계」가 사이트로 보내요 (Home Assistant 없이 · 사이트가 집에 접속하지 않아요).</p></div>' + pill + '</header>' +
      brk + list + (R ? '<details class="hal-mtmore"><summary>💻 다른 기기에 설치 (윈도우 · 리눅스 · 맥)</summary>' + mqWin() + '</details>' : mqWin()) + '</section>';
  }
  function mqSetBox() {
    var M = S.d.mqtt || { topics: ['#'], port: 1883, host: '' };
    var html = '<section class="hal-sec"><div class="hal-two"><label>브로커 주소 <small>IP 또는 이름</small><input name="host" value="' + esc(M.host) + '" placeholder="예: 192.168.0.54" autocapitalize="off" autocomplete="off" spellcheck="false"></label>' +
        '<label>포트 <small>보통 1883 · TLS 8883</small><input name="port" type="number" min="1" max="65535" inputmode="numeric" value="' + esc(M.port || 1883) + '"></label></div>' +
        '<label class="hal-chk"><input type="checkbox" name="tls"' + (M.tls ? ' checked' : '') + '> 🔒 TLS 로 붙기 (mqtts)</label></section>' +
      '<section class="hal-sec"><h4>계정 <small>브로커가 익명을 받으면 비워 두기</small></h4><div class="hal-two"><label>사용자 이름<input name="user" value="' + esc(M.user || '') + '" autocapitalize="off" autocomplete="off" spellcheck="false"></label>' +
        '<label>비밀번호<input name="pass" type="password" value="" placeholder="' + (M.has_pass ? '그대로 (바꿀 때만 적기)' : '없으면 비워 두기') + '" autocomplete="new-password"></label></div>' +
        (M.has_pass ? '<label class="hal-chk"><input type="checkbox" name="clear_pass"> 적어 둔 비밀번호 지우기</label>' : '') +
        '<p class="hal-hint">🔒 비밀번호는 사이트에 암호화해 두고, 내 중계만 연결 코드로 받아 가요 (이 화면에 다시 보이지 않아요). 읽기만 하는 계정이면 더 좋아요.</p></section>' +
      '<section class="hal-sec"><h4>받을 토픽 <small>한 줄에 하나 · 10줄까지</small></h4><textarea name="topics" rows="3" autocapitalize="off" spellcheck="false">' + esc((M.topics || ['#']).join('\n')) + '</textarea>' +
        '<p class="hal-hint"><code>#</code> = 모두 · 예: <code>zigbee2mqtt/+</code> · <code>tele/+/SENSOR</code> · <code>shellies/#</code> — 온도 · 습도가 든 것만 「찾은 센서」에 보여요.</p></section>';
    var ov = modal(mqLogo() + ' MQTT 브로커 설정', html, { ok: '저장', onSave: function (o) {
      var v = {}; Array.prototype.forEach.call(o.querySelectorAll('[name]'), function (i) { v[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
      if (!v.pass) delete v.pass;
      return api('PUT', '/mqtt', v).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); });
    } });
    var tls = ov.querySelector('[name=tls]'), port = ov.querySelector('[name=port]');
    tls.onchange = function () { if (tls.checked && port.value === '1883') port.value = '8883'; else if (!tls.checked && port.value === '8883') port.value = '1883'; };
  }
  function mqBind() {
    qa('[data-mq-set]').forEach(function (b) { b.onclick = mqSetBox; });
    qa('[data-mq-on],[data-mq-off]').forEach(function (b) {
      b.onclick = function () {
        var on = b.hasAttribute('data-mq-on'), k = b.getAttribute(on ? 'data-mq-on' : 'data-mq-off');
        if (!on && !confirm('이 토픽을 그만 받을까요? 기기와 그동안의 기록은 남아요.')) return;
        b.disabled = true;
        api('POST', '/mqtt/pick', { key: k, on: on }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(function (e) { b.disabled = false; fail(e); });
      };
    });
    mqWinBind(S.root);
  }
  function stCard() {
    var T = S.d.smartthings; if (!T) return '';
    var ins = T.installs || [], oa = ins.filter(function (x) { return x.mode === 'oauth'; }), old = ins.filter(function (x) { return x.mode !== 'oauth'; });
    var live = ins.filter(function (x) { return x.status === 'active'; }).length, bad = ins.filter(function (x) { return x.status === 'error' || x.last_error; }).length, todo = ins.filter(function (x) { return x.status === 'choose'; }).length;
    var pill = ins.length ? (bad ? '<span class="hal-pill bad">⚠️ 확인 필요</span>' : live ? '<span class="hal-pill on">🟢 연결됨' + (live > 1 ? ' ' + live : '') + '</span>' : todo ? '<span class="hal-pill wait">👉 센서 고르기</span>' : '<span class="hal-pill wait">⏳ 맞추는 중</span>') : '<span class="hal-pill">⚪ 연결 안 됨</span>';
    var head = '<header class="hal-stc-h"><span class="hal-stc-logo" aria-hidden="true">' + stLogo() + '</span><div><h2>SmartThings</h2><p>삼성 SmartThings 의 온습도계 · 플러그 · 프린터 기기 · 문 · 움직임 센서 값이 바뀔 때마다 바로 들어와요.</p></div>' + pill + '</header>';
    if (!ins.length && !T.oauth && !(T.ready && T.code_flow)) return '<section class="hal-stc off">' + head + '<p class="hal-hint">관리자가 아직 SmartThings 연결을 준비하지 않았어요.</p></section>';
    // 로그인 연결 — 아직 안 이었으면 큰 단추 하나
    var go = !oa.length && T.oauth ? '<div class="hal-stc-go"><ol class="hal-stc-steps"><li><em>1</em>삼성 계정으로 로그인</li><li><em>2</em>「허용」 누르기</li><li><em>3</em>받을 센서 고르기</li></ol>' +
      '<div class="hal-row"><button type="button" class="hal-btn pri big" data-st-go>🔗 SmartThings 연결하기</button><button type="button" class="hal-btn big" data-st-guide>❓ 그림으로 보기</button></div>' +
      '<p class="hal-hint">🔒 사이트는 값을 읽기만 해요 (기기를 켜거나 끄지 않아요). 삼성 계정 비밀번호는 삼성 화면에만 적어요.</p>' + stPay() + '</div>' : '';
    var list = oa.map(function (x) {
      var s = ST_STATUS[x.status] || ['', x.status], names = (x.site_devices || []).map(find).filter(Boolean);
      return '<article class="hal-stc-i"><div class="hal-stc-ih"><div><b>📍 ' + esc(x.location || 'SmartThings 위치') + '</b><small><span class="hal-dot ' + s[0] + '"></span>' + s[1] + ' · 센서 ' + (x.picked || 0) + '개' + (x.last_event_at ? ' · 마지막 값 ' + esc(agoText(x.last_event_at)) : '') + '</small></div>' +
        '<div class="hal-row">' + (x.status === 'active' || x.status === 'error' ? '<button type="button" class="hal-btn sm" data-revive title="구독을 다시 확인하고 지금 값을 물어봐요">🔄 다시 잇기</button>' : '') + '<button type="button" class="hal-btn sm' + (x.status === 'choose' ? ' pri' : '') + '" data-st-pick="' + x.id + '">⚙️ 센서 고르기</button><button type="button" class="hal-btn sm danger" data-st-del="' + x.id + '">연결 끊기</button></div></div>' +
        (x.last_error ? '<p class="hal-warn">' + esc(x.last_error) + (T.oauth ? ' <button type="button" class="hal-btn sm" data-st-go>🔗 다시 연결</button>' : '') + '</p>' : '') +
        (names.length ? '<div class="hal-stc-devs">' + names.map(function (d) { return '<span>' + ICON[d.target] + ' ' + esc(d.name) + '</span>'; }).join('') + '</div>'
          : '<p class="hal-hint">' + (x.status === 'choose' ? '아직 고른 센서가 없어요 — <b>⚙️ 센서 고르기</b>를 눌러 받을 센서를 체크해 주세요.' : '센서 값을 기다리는 중이에요.') + '</p>') + '</article>';
    }).join('');
    var more = oa.length ? '<div class="hal-row hal-stc-more">' + (T.oauth ? '<button type="button" class="hal-btn sm" data-st-go>➕ 다른 위치 연결</button>' : '') + '<button type="button" class="hal-btn sm" data-st-guide>❓ 연결 방법</button></div>' : '';
    return '<section class="hal-stc">' + head + go + (list ? '<div class="hal-stc-list rows">' + list + '</div>' : '') + more + (go ? '' : stPay()) + stOld(T, old) + '</section>';
  }
  /* 0.2.0 예전 방식 — 연결 코드를 SmartThings 앱의 설정 화면에 적음 (SmartApp). 관리자가 켰거나(code_flow) 그렇게 이은 것이 있을 때만 */
  function stOld(T, ins) {
    if (!ins.length && !(T.ready && T.code_flow)) return '';
    var opts = '<option value="">➕ 새 기기 만들기 (「SmartThings」)</option>' + S.d.devices.map(function (x) { return '<option value="' + x.id + '">' + ICON[x.target] + ' ' + esc(x.name) + '</option>'; }).join('');
    var code = !T.code_flow ? '' : T.code ? '<div class="hal-stc-code"><div><small>연결 코드 · ' + minsLeft(T.code.expires_at) + '분 남음 · 한 번만</small><b data-st-code-v>' + esc(T.code.code) + '</b><small>붙일 기기: ' + esc(T.code.device_id ? ((find(T.code.device_id) || {}).name || '–') : '새 기기 「SmartThings」') + '</small></div><div class="hal-row"><button type="button" class="hal-btn pri" data-st-copy>📋 복사</button><button type="button" class="hal-btn" data-st-new>🔄 새로</button></div></div>'
      : '<div class="hal-stc-code empty"><label>값을 넘길 기기<select data-st-dev-new>' + opts + '</select></label><button type="button" class="hal-btn" data-st-new' + (T.ready ? '' : ' disabled') + '>🔑 연결 코드 만들기</button></div>';
    var list = ins.map(function (x) {
      var s = ST_STATUS[x.status] || ['', x.status];
      var sel = '<select data-st-relink="' + x.id + '" aria-label="값을 넘길 기기">' + (x.device_id ? '' : '<option value="">— 기기 고르기 —</option>') + S.d.devices.map(function (d) { return '<option value="' + d.id + '"' + (d.id === x.device_id ? ' selected' : '') + '>' + ICON[d.target] + ' ' + esc(d.name) + '</option>'; }).join('') + '</select>';
      return '<article class="hal-stc-i"><div class="hal-stc-ih"><div><b>📍 ' + esc(x.location || 'SmartThings 위치') + '</b><small><span class="hal-dot ' + s[0] + '"></span>' + s[1] + ' · 마지막 값 ' + esc(x.last_event_at ? agoText(x.last_event_at) : '아직 없음') + '</small></div><div class="hal-stc-to">→ ' + sel + '</div><button type="button" class="hal-btn sm danger" data-st-del="' + x.id + '">연결 끊기</button></div>' +
        (x.last_error ? '<p class="hal-warn">' + esc(x.last_error) + '</p>' : '') + (x.sensors.length ? sensList(x.sensors, 40) : '<p class="hal-hint">센서 값을 기다리는 중이에요. SmartThings 앱에서 센서를 골랐는지 확인해 주세요.</p>') + '</article>';
    }).join('');
    var how = !T.code_flow ? '' : '<ol><li><b>「🔑 연결 코드 만들기」</b> — 값을 넘길 기기를 먼저 고르면 그 기기로 들어가요.</li>' +
      '<li>SmartThings 앱 → <b>자동화</b> 탭 → <b>＋</b> → <b>루틴 추가</b> → 아래 <b>발견</b>에서 이 사이트의 앱을 눌러요.</li>' +
      '<li><b>연결 코드</b> 칸에 8글자를 적고 <b>다음</b> → 센서를 골라 <b>완료</b> → <b>허용</b>.</li></ol>' +
      '<p class="hal-hint">연결 코드는 ' + (T.code_min || 30) + '분 안에 한 번만 쓸 수 있어요. 센서를 바꾸려면 SmartThings 앱에서 그 앱을 열어 고쳐요.</p>';
    return '<details class="hal-stc-how"' + (ins.length ? ' open' : '') + '><summary>🔑 예전 방식 — 연결 코드로 잇기 (SmartThings 앱의 SmartApp)</summary>' + code + (list ? '<div class="hal-stc-list">' + list + '</div>' : '') + how + '</details>';
  }
  /** 「🔗 SmartThings 연결하기」 — 로그인 주소를 받아 그리로 감 (돌아오면 route 가 이어서 함) */
  function stGo(btn) {
    if (btn) { btn.disabled = true; btn.textContent = 'SmartThings 로 가는 중…'; }
    api('POST', '/smartthings/oauth/start', {}).then(function (r) { location.href = r.data.url; }).catch(function (e) { fail(e); draw(); });
  }
  /* 1.4.2 🔄 다시 잇기 — 끊긴 SmartThings 기기를 지금 바로 (구독 다시 확인 · 지금 값 물어보기). 기다리는 동안 단추를 막음 */
  function revive(b) {
    qa('[data-revive]').forEach(function (x) { x.disabled = true; x.textContent = '다시 잇는 중…'; });
    api('POST', '/smartthings/revive', {}).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); })
      .catch(function (e) { fail(e); api('GET', '/me').then(function (r) { S.d = r.data; draw(); }).catch(function () { draw(); }); });
  }
  function stBind() {
    var root = q('.hal-stc'); if (!root) return;
    root.onclick = function (ev) {
      var t = ev.target, b;
      if ((b = t.closest('[data-st-go]'))) { stGo(b); return; }
      if ((b = t.closest('[data-st-pick]'))) { stPick(+b.getAttribute('data-st-pick')); return; }
      if (t.closest('[data-st-guide]')) { guideBox('st'); return; }
      if (t.closest('[data-st-copy]')) { copy(String(S.d.smartthings.code.code), t.closest('[data-st-copy]')); return; }
      if (t.closest('[data-st-new]')) { var sel = root.querySelector('[data-st-dev-new]'), dev = sel ? sel.value : (S.d.smartthings.code && S.d.smartthings.code.device_id) || ''; api('POST', '/smartthings/code', { device_id: dev ? +dev : null }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail); return; }
      var del = t.closest('[data-st-del]'); if (del && confirm('SmartThings 연결을 끊을까요? 기기 카드와 기록은 남아요.')) api('DELETE', '/smartthings/installs/' + del.getAttribute('data-st-del')).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail);
    };
    root.onchange = function (ev) {
      var s = ev.target.closest('[data-st-relink]'); if (!s || !s.value) return;
      api('PUT', '/smartthings/installs/' + s.getAttribute('data-st-relink'), { device_id: +s.value }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); }).catch(fail);
    };
  }
  /* 1.1.0 ⚙️ 센서 고르기 — 그 위치의 SmartThings 기기 가운데 받을 것을 체크. 센서 하나가 기기 카드 하나 (이름이 같은 카드가 있으면 거기에 · 없으면 새 카드) */
  var PK_ICON = { '온도': '🌡️', '습도': '💧', '전력': '🔌', '스위치': '💡', '열림': '🚪', '움직임': '🏃', '재실': '🏠', '누수': '💦', '밝기': '☀️', '전력량': '📈', '배터리': '🔋' };
  /* 1.2.0 붙일 곳 — 새 카드 · 🖨️ 내 프린터(프린터 라운지에 보임) · 이미 있는 카드. 프린터 라운지에서 넘어왔으면(S.pickPrinter) 그 프린터가 먼저 골라짐 */
  function stPick(id) {
    var want = S.pickPrinter || 0; S.pickPrinter = 0; try { sessionStorage.removeItem('hal:st:printer'); } catch (e) {}   // 한 번만 씀
    var data = null, ov = modal('⚙️ SmartThings 센서 고르기', '<div class="hal-empty sm">SmartThings 에서 기기를 불러오는 중…</div>', { ok: '저장', onSave: function (o) {
      var picks = Array.prototype.map.call(o.querySelectorAll('[data-pk]:checked'), function (c) { var to = o.querySelector('[data-pk-to="' + c.getAttribute('data-pk') + '"]'); var v = to ? to.value : ''; return { id: c.getAttribute('data-pk'), site_device_id: v && v.charAt(0) !== 'p' ? +v : null, printer_id: v.charAt(0) === 'p' ? +v.slice(2) : null }; });
      var w = o.querySelector('[data-pk-w]');
      return api('PUT', '/smartthings/installs/' + id + '/devices', { devices: picks, power_on_w: w && w.value !== '' ? +w.value : null }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); });
    } });
    ov.classList.add('wide');
    var body = ov.querySelector('.hal-modal-c'), ok = ov.querySelector('[data-ok]'); ok.disabled = true;
    var sync = function () {
      var n = 0; Array.prototype.forEach.call(ov.querySelectorAll('[data-pk]'), function (c) { c.closest('li').classList.toggle('on', c.checked); if (c.checked) n++; });
      var cnt = ov.querySelector('[data-pk-count]'); if (cnt) cnt.textContent = n ? n + '개 고름' : '고른 것 없음';
      if (data) { ok.disabled = n > data.max; if (cnt && n > data.max) cnt.textContent = n + '개 — ' + data.max + '개까지 고를 수 있어요'; }
    };
    api('GET', '/smartthings/installs/' + id + '/devices').then(function (r) {
      data = r.data; var D = data.devices, first = !D.some(function (x) { return x.picked; });
      if (!D.length) { body.innerHTML = '<div class="hal-empty sm">이 위치에는 받을 수 있는 센서(온도 · 습도 · 플러그 · 문 · 움직임 …)가 없어요.<br>SmartThings 앱에 센서를 먼저 등록해 주세요.</div>'; return; }
      var P = S.d.printers || [], wantOk = want && P.some(function (p) { return p.id === want; });
      var wp = wantOk ? P.filter(function (p) { return p.id === want; })[0] : null;
      var opts = function (x) {
        // 이미 붙인 카드 → 프린터 라운지에서 고른 프린터(플러그 · 온습도계) → 이름이 같은 프린터 → 이름이 같은 카드 → 새 카드
        var cur = x.resave && x.suggest_printer ? 'p:' + x.suggest_printer : x.site_device_id ? String(x.site_device_id) : wantOk && x.kind !== 'other' ? 'p:' + want : x.suggest_printer ? 'p:' + x.suggest_printer : x.suggest ? String(x.suggest) : '';
        return '<option value="">➕ 새 기기 카드로</option>' +
          (P.length ? '<optgroup label="🖨️ 내 프린터에 붙이기 (프린터 라운지에 보여요)">' + P.map(function (p) { return '<option value="p:' + p.id + '"' + (cur === 'p:' + p.id ? ' selected' : '') + '>🖨️ ' + esc(p.name) + '</option>'; }).join('') + '</optgroup>' : '') +
          (S.d.devices.length ? '<optgroup label="이미 있는 기기 카드">' + S.d.devices.map(function (d) { return '<option value="' + d.id + '"' + (cur === String(d.id) ? ' selected' : '') + '>' + ICON[d.target] + ' ' + esc(d.name) + '</option>'; }).join('') + '</optgroup>' : '');
      };
      body.innerHTML = (wp ? '<p class="hal-to to-printer hal-pk-want"><i aria-hidden="true">🖨️</i><span><small>프린터 라운지에서 왔어요</small><b>「' + esc(wp.name) + '」에 붙일 플러그 · 온습도계를 체크해 주세요</b></span></p>' : '') +
        '<p class="hal-guide-top">📍 <b>' + esc(data.location || 'SmartThings') + '</b> 의 센서예요. 받을 것을 체크하고 <b>저장</b>하면 값이 바뀔 때마다 바로 들어와요. 센서 하나가 기기 카드 하나가 돼요.</p>' +
        '<div class="hal-pk-tools"><b data-pk-count></b><span><button type="button" class="hal-chip" data-pk-env>🌡️ 온습도계 모두</button><button type="button" class="hal-chip" data-pk-none>모두 해제</button></span></div>' +
        '<ul class="hal-pk">' + D.map(function (x) {
          var on = x.picked || (first && !wp && x.kind === 'env'), vals = x.values.map(function (v) { return esc(v.what) + (v.value !== '' ? ' <b>' + esc(v.value) + '</b>' : ''); }).join(' · ');
          return '<li class="' + (on ? 'on' : '') + '" data-kind="' + esc(x.kind) + '"><label class="hal-pk-m"><input type="checkbox" data-pk="' + esc(x.id) + '"' + (on ? ' checked' : '') + '><span class="hal-ico">' + (x.kind === 'printer' ? '🖨️' : x.kind === 'power' ? '🔌' : PK_ICON[(x.values[0] || {}).what] || '📟') + '</span><span class="hal-pk-t"><b>' + esc(x.label) + (x.kind === 'printer' ? ' <em class="hal-pk-tag">프린터 기기</em>' : '') + '</b><small>' + vals + '</small>' +
              (x.kind === 'printer' ? '<small class="hal-pk-note">' + (x.resave ? '⚠️ 예전 방식(온습도계 · 플러그처럼)으로 받고 있어요 — 붙일 곳을 <b>내 프린터</b>로 두고 <b>저장</b>을 한 번 눌러 주세요. ' : '') + '🖨️ 내 프린터에 붙이면 출력 상태 · 진행률 · 노즐/베드 온도가 프린터 라운지 카드로 가요.</small>' : '') + '</span></label>' +
            '<label class="hal-pk-to">붙일 곳<select data-pk-to="' + esc(x.id) + '">' + opts(x) + '</select></label></li>';
        }).join('') + '</ul>' +
        (D.some(function (x) { return x.values.some(function (v) { return v.what === '전력'; }); }) ? '<section class="hal-sec"><label>🔌 플러그가 이 전력(W)보다 많이 쓰면 「가동 중」 <small>프린터 · 건조기의 대기 전력보다 조금 높게 — 가동 시간(정비 수첩)을 세요</small><input type="number" min="0.5" max="5000" step="0.5" inputmode="decimal" data-pk-w value="' + esc(data.power_on_w) + '"></label></section>' : '') +
        (P.length ? '<p class="hal-hint">🖨️ <b>프린터 라운지에 보이게 하려면</b> 「붙일 곳」을 <b>내 프린터</b>로 골라 주세요 — 플러그는 전력으로 <b>출력 중 · 쉬는 중</b>이, 온습도계는 프린터 카드에 <b>주변 온도 · 습도</b>가 보여요 (진행률 · 남은 시간 · 카메라는 SmartThings 로는 알 수 없어요).</p>' : '') +
        '<p class="hal-hint">🔒 사이트는 값을 읽기만 해요. 체크를 풀어도 이미 만든 기기 카드와 기록은 남아요 (카드의 ✏️ 에서 지울 수 있어요). 카드의 ✏️ 에서 알림 기준 · 필라멘트 보관함 · 내 프린터에 붙일 수 있어요.' + (data.room < 3 ? ' 새 기기 카드는 ' + data.room + '개 더 만들 수 있어요.' : '') + '</p>' + stPay();
      ok.disabled = false; sync();
    }).catch(function (e) { body.innerHTML = '<div class="hal-empty sm">' + esc(e.message) + '</div>'; });
    ov.addEventListener('change', sync);
    ov.addEventListener('click', function (ev) {
      var env = ev.target.closest('[data-pk-env]'), none = ev.target.closest('[data-pk-none]'); if (!env && !none) return;
      Array.prototype.forEach.call(ov.querySelectorAll('[data-pk]'), function (c) { if (none) c.checked = false; else if (c.closest('li').getAttribute('data-kind') === 'env') c.checked = true; }); sync();
    });
  }

  function copy(txt, btn) {
    var label = btn.textContent, done = function () { btn.textContent = '✔ 복사했어요'; setTimeout(function () { btn.textContent = label; }, 1600); };
    var fallback = function () { var ta = document.createElement('textarea'); ta.value = txt; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (e) { toast('복사하지 못했어요 — 글을 직접 골라 복사해 주세요.', true); } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, fallback); else fallback();
  }
  /* 0.1.8 ❓ 연결 방법 — 한 걸음씩, 화면 그림에 누를 곳을 빨갛게.
   *   그림은 사진이 아니라 화면을 본떠 그린 것 (가볍고 · 다크 테마에도 맞고 · 화면이 조금 바뀌어도 뜻이 통하게). 실제 Home Assistant · SmartThings 화면은 버전에 따라 조금 다를 수 있음
   *   1.1.0 📡 SmartThings 연결 방법도 같은 모양으로 — 위쪽 탭으로 고름 */
  function shot(bar, html, kind) { return '<div class="hal-shot' + (kind ? ' ' + kind : '') + '" aria-hidden="true"><div class="hal-shot-bar"><i></i><i></i><i></i><span>' + bar + '</span></div><div class="hal-shot-b">' + html + '</div></div>'; }
  function hl(html, n) { return '<span class="hal-hl">' + html + (n ? '<b class="hal-hl-n">' + n + '</b>' : '') + '</span>'; }
  function fakeBtn(t, cls) { return '<span class="hal-fake-btn ' + (cls || '') + '">' + t + '</span>'; }
  function fakeFld(label, val) { return '<div class="hal-fake-fld">' + (label ? '<small>' + label + '</small>' : '') + '<span>' + val + '</span></div>'; }
  function fakeChk(on, t) { return '<div class="hal-fake-chk"><i class="' + (on ? 'on' : '') + '">' + (on ? '✓' : '') + '</i>' + t + '</div>'; }
  function guideSteps(steps) { return '<ol class="hal-guide">' + steps.map(function (s, i) { return '<li><div class="hal-guide-t"><em>' + (i + 1) + '</em><div><b>' + s[0] + '</b><p>' + s[1] + '</p></div></div>' + s[2] + '</li>'; }).join('') + '</ol>'; }
  function guideHa() {
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
      ['사이트에서 마무리', '1~2분 안에 이 화면에 🟢 로 나타나요. 카드의 <b>✏️</b>에서 <b>알림 기준</b> · 이름 · 붙일 곳 · <b>사진 공개</b>를 정하고, 재고 관리에서 필라멘트의 <b>보관 위치</b>를 목록에서 고르면 습도가 필라멘트에 같이 보여요.',
        shot('사이트 · IoT 연결 · 재고 관리', '<div class="hal-fake-card"><div class="hal-fake-row"><span>🧵 <b>드라이박스</b></span>' + hl('<span class="hal-fake-ico">✏️</span>', 2) + '</div><div class="hal-fake-vals"><span>💧 <b>32.5</b>%</span><span>🌡️ <b>23.4</b>°C</span></div>' + hl('<div class="hal-fake-st"><i></i>방금</div>', 1) + '</div>' + hl('<div class="hal-fake-fld"><small>보관 위치 <em>🏠 온습도 센서가 있는 곳</em></small><span>드라이박스 ▾</span></div>', 3) + '<div class="hal-fake-tags"><span>💧 건조 12일 뒤</span><span class="ha">🏠 💧32.5% 🌡️23.4°C</span></div>')]
    ];
    var more = '<section class="hal-sec hal-tips"><h4>💡 더 알아 두면 좋아요</h4><ul>' +
      '<li><b>프린터 · 업체 장비</b>는 통합을 한 번 더 추가해 「내 프린터 — 하나씩」 · 「업체 장비 — 하나씩」을 고르세요. Home Assistant 의 기기를 고르면 상태 · 진행률 · 카메라 센서를 찾아 채워 줘요.</li>' +
      '<li><b>센서를 더 붙이거나 빼려면</b> Home Assistant 의 그 통합에서 <b>구성</b>을 누르세요.</li>' +
      '<li><b>이미 붙인 센서를 다른 곳으로</b> 옮기려면 이 화면의 카드 ✏️ → 「무엇에 붙일까요?」를 바꾸면 돼요.</li>' +
      '<li><b>🟢 로 안 바뀌면</b> Home Assistant 를 다시 시작했는지, 사이트 주소가 <code>https://</code> 로 시작하는지 확인하세요. 그래도 안 되면 설정 › 시스템 › 로그에서 <code>g7_link</code> 를 찾아보세요.</li>' +
      '<li>HACS 를 안 쓰면 연결 창의 <b>📝 HACS 없이 설정 글로</b>를 누르세요.</li></ul>' +
      '<p class="hal-hint">그림은 화면을 본떠 그린 거예요. Home Assistant 화면은 버전에 따라 조금 다를 수 있어요.</p></section>';
    return '<p class="hal-guide-top">처음이라면 <b>5분</b>이면 돼요. Home Assistant 에서 할 일(①~⑥)과 사이트에서 할 일(⑦)을 순서대로 보여 드려요. 빨간 테두리 <span class="hal-hl sm">이렇게</span> 표시한 곳을 순서대로 누르면 돼요.</p>' + guideSteps(steps) + more;
  }
  /* 1.1.0 📡 SmartThings 연결 방법 — 로그인 연결 (연결하기 → 삼성 계정 로그인 → 허용 → 센서 고르기 → 카드) */
  function guideSt() {
    var btn = fakeBtn, fld = fakeFld, chk = fakeChk, site = esc(location.hostname || '사이트');
    var card = '<div class="hal-fake-row"><span class="hal-fake-repo"><span class="hal-fake-logo st">' + stLogo() + '</span><span><b>SmartThings</b><small>온습도계 · 플러그 · 문 · 움직임 센서</small></span></span><span class="hal-fake-pill">⚪ 연결 안 됨</span></div>';
    var steps = [
      ['「🔗 SmartThings 연결하기」 누르기', '이 화면 위쪽 <b>SmartThings 카드</b>의 단추예요. 누르면 삼성 SmartThings 의 로그인 화면으로 넘어가요.',
        shot('사이트 · IoT 연결', card + '<div class="hal-fake-end">' + hl(btn('🔗 SmartThings 연결하기', 'pri'), 1) + '</div>')],
      ['삼성 계정으로 로그인', 'SmartThings 앱에서 쓰는 <b>삼성 계정</b>으로 로그인해요. 비밀번호는 삼성 화면에만 적어요 — 사이트는 볼 수 없어요. 이미 로그인되어 있으면 이 걸음은 건너뛰어요.',
        shot('삼성 계정 · 로그인', '<b class="hal-fake-t">Samsung account</b>' + hl(fld('이메일 또는 전화번호', 'me@example.com') + fld('비밀번호', '●●●●●●●●●●'), 1) + '<div class="hal-fake-end">' + hl(btn('로그인', 'pri'), 2) + '</div>', 'st')],
      ['위치를 고르고 「허용」', '센서가 있는 <b>위치</b>(예: 우리집)를 고르고 <b>허용</b>(Authorize)을 눌러요. 사이트가 받는 권한은 <b>기기 · 위치 보기</b>(읽기)뿐이라 기기를 켜거나 끌 수 없어요.',
        shot('SmartThings · 권한 허용', '<b class="hal-fake-t">「' + site + '」 이(가) 요청하는 권한</b>' + chk(1, '기기 보기 <small>(값 읽기)</small>') + chk(1, '위치 보기 <small>(이름 · 온도 단위)</small>') + hl(fld('위치', '우리집 ▾'), 1) + '<div class="hal-fake-end">' + btn('취소') + ' ' + hl(btn('허용', 'pri'), 2) + '</div>', 'st')],
      ['받을 센서 고르기', '사이트로 돌아오면 그 위치의 센서 목록이 떠요. 받을 것을 체크하고 <b>저장</b>. <b>온습도계는 미리 체크</b>되어 있어요. 이름이 같은 기기 카드가 있으면 거기에 붙고, 없으면 새 카드가 생겨요.',
        shot('사이트 · ⚙️ 센서 고르기', hl(chk(1, '🌡️ <b>드라이박스 온습도계</b> <small>온도 23.4°C · 습도 32%</small>') + chk(1, '🔌 <b>건조기 플러그</b> <small>전력 120 W</small>') + chk(0, '🚪 현관문 <small>열림 닫힘</small>'), 1) + '<div class="hal-fake-end">' + hl(btn('저장', 'pri'), 2) + '</div>')],
      ['끝 — 카드에서 알림 기준 · 붙일 곳 정하기', '바로 기기 카드에 값이 보이고, 값이 바뀔 때마다 들어와요. 카드의 <b>✏️</b>에서 <b>알림 기준</b>(예: 습도 40%)과 <b>붙일 곳</b>(필라멘트 보관함 · 내 프린터)을 정하면 재고 관리 · 정비 수첩 · 내 프린터와 이어져요.',
        shot('사이트 · IoT 연결', '<div class="hal-fake-card"><div class="hal-fake-row"><span>🧵 <b>드라이박스 온습도계</b> <span class="hal-fake-pill st">' + stLogo() + ' SmartThings</span></span>' + hl('<span class="hal-fake-ico">✏️</span>', 2) + '</div><div class="hal-fake-vals"><span>💧 <b>32</b>%</span><span>🌡️ <b>23.4</b>°C</span></div>' + hl('<div class="hal-fake-st"><i></i>방금</div>', 1) + '</div>' + hl(fld('습도가 이보다 높으면 (%)', '40') + fld('무엇에 붙일까요?', '🧵 필라멘트 · 레진 보관함 — 드라이박스'), 3))]
    ];
    /* 1.3.0 🖨️ 프린터에 쓸 수 있는 것 — SmartThings 의 무엇을 붙이면 프린터 라운지에 무엇이 보이나 (지원 표 · 받는 상태 목록) */
    var Y = '<i class="y">✅</i>', N = '<i class="n">–</i>', tr = function (name, a, b, c, d) { return '<tr><th scope="row">' + name + '</th><td>' + a + '</td><td>' + b + '</td><td>' + c + '</td><td>' + d + '</td></tr>'; };
    var sup = '<section class="hal-sec hal-sup"><h4>🖨️ 프린터에 쓸 수 있는 것 <small>SmartThings 의 무엇을 「🖨️ 내 프린터」에 붙이면 프린터 라운지에 무엇이 보이나</small></h4>' +
      '<div class="hal-sup-w"><table><thead><tr><th></th><th>🖨️ Bambu Lab<small>Edge 드라이버 (LAN)</small></th><th>🖨️ Klipper<small>Edge 드라이버 (Moonraker)</small></th><th>🔌 전력 플러그</th><th>🌡️ 온습도계</th></tr></thead><tbody>' +
      tr('출력 시작 · 끝 저절로 기록', Y, Y, Y + '<small>전력으로</small>', N) + tr('진행률 (%)', Y, Y, N, N) + tr('남은 시간', '<i class="y">≈</i><small>어림</small>', Y, N, N) + tr('출력물 이름', N, Y, N, N) +
      tr('일시정지 · 실패 구분', N, Y, N, N) + tr('노즐 · 베드 온도', Y, Y, N, N) + tr('AMS 습도 · 조명', Y, N, N, N) + tr('부품 팬', N, Y, N, N) + tr('주변 온도 · 습도', N, N, N, Y) +
      tr('📷 카메라 · 타임랩스', N, N, N, N) + '</tbody></table></div>' +
      '<ul class="hal-sup-st"><li><b>Bambu Lab</b> 이 알려 주는 상태 — <span>출력 중</span> <span>쉬는 중</span>. 끝날 때 진행률이 98% 를 넘었으면 <span class="ok">완료</span>, 아니면 <span class="no">그만둠</span>으로 기록해요.</li>' +
      '<li><b>Klipper</b> 가 알려 주는 상태 — <span>standby 쉬는 중</span> <span>printing 출력 중</span> <span>paused 일시정지</span> <span class="ok">complete 완료</span> <span class="no">cancelled · error 실패</span></li>' +
      '<li><b>전력 플러그</b> — 정한 W 보다 많이 쓰면 <span>출력 중</span>, 내려가면 <span class="ok">완료</span>.</li></ul>' +
      '<p class="hal-hint">프린터 기기는 SmartThings 허브에 <b>커뮤니티 Edge 드라이버</b>를 깔아 등록한 3D 프린터예요 (삼성 공식 기기 종류는 아니에요). 드라이버 · 버전에 따라 보이는 값이 다를 수 있고, ⚙️ 센서 고르기에 <b>🖨️ 프린터 기기</b>로 나오면 받을 수 있어요. 📷 카메라 · 타임랩스는 SmartThings 로 받을 수 없어요 — 프린터 라운지의 <b>한 줄 연결</b>이나 Home Assistant 로 (같은 프린터에 같이 써도 돼요).</p></section>';
    var more = '<section class="hal-sec hal-tips"><h4>💡 더 알아 두면 좋아요</h4><ul>' +
      '<li><b>센서를 더하거나 빼려면</b> SmartThings 카드의 <b>⚙️ 센서 고르기</b>에서 체크를 바꾸고 저장하세요. 다시 로그인할 필요는 없어요.</li>' +
      '<li><b>다른 집 · 사무실(위치)</b>의 센서도 받으려면 <b>➕ 다른 위치 연결</b>을 누르고 삼성 화면에서 그 위치를 고르세요.</li>' +
      '<li><b>전력을 재는 플러그</b>는 정한 W(기본 10W)보다 많이 쓰는 동안을 「가동 중」으로 봐요 — 프린터 · 건조기의 가동 시간이 정비 수첩에 쌓여요. 전력을 못 재는 플러그는 켜짐 = 가동 중.</li>' +
      '<li><b>프린터 라운지에 보이게 하려면</b> ⚙️ 센서 고르기의 「붙일 곳」를 <b>🖨️ 내 프린터</b>로 고르세요. 프린터에 꽂은 <b>전력 플러그</b>는 출력 중 · 쉬는 중과 출력 기록을, <b>온습도계</b>는 프린터 카드의 주변 온도 · 습도를 보여 줘요.</li>' +
      '<li><b>필라멘트 보관함 습도</b>로 쓰려면 카드 ✏️ → 「필라멘트 · 레진 보관함」을 고르고 보관 위치를 필라멘트에 적은 것과 같게 적으세요. SmartThings 의 센서 이름이 보관 위치와 같으면 알아서 붙어요.</li>' +
      '<li><b>카드에 ⚠️ 가 보이면</b> 안내 글 옆의 <b>🔗 다시 연결</b>을 눌러 한 번 더 로그인하세요. 고른 센서는 그대로 있어요.</li>' +
      '<li><b>그만 쓰려면</b> <b>연결 끊기</b> — 기기 카드와 기록은 남아요. SmartThings 앱의 「연결된 서비스」에서 지워도 끊겨요.</li></ul>' +
      '<p class="hal-hint">그림은 화면을 본떠 그린 거예요. 삼성 계정 · SmartThings 화면은 조금 다를 수 있어요.</p></section>';
    return '<p class="hal-guide-top">앱을 깔거나 코드를 적을 필요 없이 <b>1분</b>이면 돼요. 삼성 화면에서 할 일(②③)과 사이트에서 할 일(①④⑤)을 순서대로 보여 드려요. 빨간 테두리 <span class="hal-hl sm">이렇게</span> 표시한 곳을 순서대로 누르면 돼요.</p>' + stPay() + guideSteps(steps) + sup + more;
  }
  /** 1.10.0 🧩 연결 방법 › Matter — 3ds Matter 연결 프로그램 (Matter 서버가 있으면 붙기만 · 없으면 같이 띄움) */
  function guideMt() {   // 1.11.1 스크롤 없이 — 그림 단추를 누르면 그것 하나만 (◀ 처음으로)
    var site = (S.d.link && S.d.link.site) || location.origin;
    var T = [['win', '💻', '한 줄 설치', '윈도우 · 리눅스 · 맥 · 라즈베리파이'], ['pi', '🐳', 'Matter 서버도 같이', 'Docker (라즈베리파이 · NAS)'], ['pair', '📲', '센서 넣기', '공유 코드'], ['dev', '📦', '사이트 기기', '대기 칸 → 붙이기'], ['thread', '📶', 'Thread 센서', '경계 라우터'], ['off', '🔌', '연결 끊기', '끄기 · 센서 빼기']];   // 1.13.0 🔌
    var P = {
      win: mtWin(),
      pi: '<section class="hal-sec"><h4>🐳 Matter 서버가 없는 집 <small>Docker — 라즈베리파이 · 리눅스 · NAS</small></h4><ol class="hal-mtg-ol">' +
        '<li>설치 안내대로 받고 <code>config/config.yaml</code> 을 만들어요 (<code>matter:</code> 줄은 지우기)</li><li><code>docker compose --profile server up -d</code> — 공식 Matter 서버와 중계를 같이 켜요</li>' +
        '<li>아래 <b>🔑 키를 직접 넣을 기기 만들기</b> → 받는 키를 <code>devices:</code> 에 (사이트 <code>' + esc(site) + '</code>)</li><li>Matter 서버가 이미 있으면 Docker 대신 💻 한 줄 설치가 쉬워요</li></ol>' +
        '<div class="hal-row"><a class="hal-btn pri" href="' + MT_REPO + '#readme" target="_blank" rel="noopener">📖 설치 안내 열기</a></div></section>',
      pair: '<section class="hal-sec"><h4>📲 센서 넣기 <small>코드는 직접 적어요 · 몇 분 뒤 만료</small></h4><div class="hal-mtg-apps">' +
        '<div><b>🍎 애플 홈</b><span>센서 › ⚙️ › 페어링 모드 켜기</span></div><div><b>🟢 구글 홈</b><span>기기 › ⚙️ › 연결된 Matter 앱 및 서비스</span></div><div><b>🔷 SmartThings</b><span>기기 › ⋮ › 다른 서비스와 공유</span></div></div>' +
        '<p class="hal-hint">설치 때 묻거나 — 🪟 <code>powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMatter\\link.ps1" -Pair</code> · 🐧🍎 <code>python3 ~/.3ds-matter/link.py --pair</code> · 🐳 <code>docker compose run --rm -it link pair</code></p></section>',
      dev: '<section class="hal-sec"><h4>📦 사이트 기기</h4><div class="hal-mtg-apps"><div><b>💻 한 줄 설치</b><span>센서마다 기기를 저절로 만들어 📡 대기 칸에 — 끌어서 보관함 · 프린터에 붙여요</span></div>' +
        '<div><b>🐳 Docker 판</b><span>🔑 키를 직접 넣을 기기 만들기 → 받는 키를 설정에</span></div><div><b>🗑 지우면</b><span>사이트에서 지운 기기는 다시 만들지 않아요</span></div></div></section>',
      thread: '<section class="hal-sec"><h4>📶 Thread 센서</h4><div class="hal-mtg-apps"><div><b>경계 라우터</b><span>홈팟 미니 · Apple TV · Nest 허브 같은 것이 집에 있어야 해요</span></div>' +
        '<div><b>Matter 서버 쪽</b><span>리눅스면 IPv6 경로를 받도록 한 번 설정 (설치 안내 「Thread 센서」)</span></div><div><b>Wi-Fi 센서</b><span>할 일이 없어요</span></div></div></section>',
      // 1.13.0 🔌 연결 끊기 — 중계 끄기 · 센서 빼기 · 사이트 기기 지우기 (필요한 것만)
      off: '<section class="hal-sec"><h4>🔌 연결 끊기 <small>필요한 것만 — 셋은 따로예요</small></h4><div class="hal-mtg-apps">' +
        '<div><b>① 중계 끄기</b><span>그 기기에서 보내기를 멈추고 지워요 · 사이트 기기는 「끊김」으로 남아요</span><code>🪟 powershell -ExecutionPolicy Bypass -File "$env:LOCALAPPDATA\\3dsMatter\\uninstall.ps1"</code><code>🐧🍎 bash ~/.3ds-matter/uninstall.sh</code><code>🐳 docker compose down</code></div>' +
        '<div><b>② 센서 하나 빼기</b><span>Matter 서버에서 빼고, 사이트 기기도 지울지 물어봐요 (애플 홈 · 구글 홈에는 그대로)</span><code>🪟 … \\3dsMatter\\link.ps1 -Remove</code><code>🐧🍎 python3 ~/.3ds-matter/link.py --remove</code><code>🐳 docker compose run --rm link remove &lt;노드&gt;</code></div>' +
        '<div><b>③ 사이트 기기만 지우기</b><span>기기 ✏️ 고치기 › 🗑 지우기 — 중계는 그 센서를 다시 만들지 않아요</span></div></div></section>'
    };
    return '<div class="hal-mtg"><p class="hal-mtg-flow">🌡️ 센서 → Matter 서버 → 중계 → 이 사이트 <small>HA 없이 · 센서는 원래 앱에 그대로</small></p>' +
      '<div class="hal-mtg-tiles">' + T.map(function (t) { return '<button type="button" class="hal-mtg-tile' + (t[0] === 'win' ? ' main' : '') + '" data-mtg="' + t[0] + '"><i aria-hidden="true">' + t[1] + '</i><b>' + t[2] + '</b><small>' + t[3] + '</small></button>'; }).join('') + '</div>' +
      Object.keys(P).map(function (k) { return '<div class="hal-mtg-pane" data-mtg-pane="' + k + '" hidden><button type="button" class="hal-btn sm hal-mtg-back" data-mtg-back>◀ 처음으로</button>' + P[k] + '</div>'; }).join('') + '</div>';
  }
  function mtGuideBind(root) {
    root.addEventListener('click', function (ev) {
      var t = ev.target.closest('[data-mtg]'), b = ev.target.closest('[data-mtg-back]'); if (!t && !b) return;
      var g = (t || b).closest('.hal-mtg'), k = t ? t.getAttribute('data-mtg') : '';
      g.querySelector('.hal-mtg-tiles').hidden = !!k; g.querySelector('.hal-mtg-flow').hidden = !!k;
      Array.prototype.forEach.call(g.querySelectorAll('[data-mtg-pane]'), function (p) { p.hidden = p.getAttribute('data-mtg-pane') !== k; });
      var c = g.closest('.hal-modal-c'); if (c) c.scrollTop = 0;
    });
  }
  function guideBox(tab) {
    var T = S.d.smartthings || {}, hasSt = !!(T.oauth || (T.installs || []).some(function (x) { return x.mode === 'oauth'; }));
    tab = tab === 'mt' ? 'mt' : (tab || srcTab()) === 'st' && hasSt ? 'st' : 'ha';   // 1.10.0 🧩
    var seg = '<div class="hal-seg" role="tablist"><button type="button" role="tab" data-gt="ha">' + haLogo() + ' Home Assistant</button>' + (hasSt ? '<button type="button" role="tab" data-gt="st">' + stLogo() + ' SmartThings</button>' : '') + '<button type="button" role="tab" data-gt="mt">' + mtLogo() + ' Matter</button></div>';
    var ov = modal('❓ 연결 방법', seg + '<div data-gp="ha">' + guideHa() + '</div>' + (hasSt ? '<div data-gp="st">' + guideSt() + '</div>' : '') + '<div data-gp="mt">' + guideMt() + '</div>', { left: '<button type="button" class="hal-btn pri" data-start></button>' });
    ov.classList.add('wide');
    mtWinBind(ov); mtGuideBind(ov);   // 1.11.0 🪟 · 1.11.1 그림 단추
    var show = function (t) {
      tab = t;
      Array.prototype.forEach.call(ov.querySelectorAll('[data-gp]'), function (p) { p.hidden = p.getAttribute('data-gp') !== t; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-gt]'), function (b) { var on = b.getAttribute('data-gt') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var st = ov.querySelector('[data-start]'); st.textContent = t === 'st' ? '🔗 SmartThings 연결하기' : t === 'mt' ? '🔑 키를 직접 넣을 기기 만들기' : '➕ 지금 연결하기'; st.hidden = t === 'st' && !T.oauth;
      ov.querySelector('.hal-modal-c').scrollTop = 0;
    };
    show(tab);
    ov.addEventListener('click', function (ev) {
      var g = ev.target.closest('[data-gt]'); if (g) { show(g.getAttribute('data-gt')); return; }
      var st = ev.target.closest('[data-start]'); if (!st) return;
      if (tab === 'st') { stGo(st); return; }
      ov.__close(); if (tab === 'mt') { form(null, 'mt'); return; } connectBox('ha');
    });
  }

  /** ➕ 기기 연결 — HACS 통합으로 (쉬움: HA 화면에서 센서를 고르면 끝) · 아니면 설정 글을 직접 붙여 넣기 */
  /* 1.3.1 어느 쪽을 먼저 보일까 — SmartThings 만 쓰는 회원(이어 둔 위치가 있고 Home Assistant 기기가 없음)이면 SmartThings, 아니면 Home Assistant */
  function srcTab() {
    var T = S.d.smartthings || {}, oa = (T.installs || []).some(function (x) { return x.mode === 'oauth'; });
    return oa && !(S.d.devices || []).some(function (d) { return d.source !== 'smartthings'; }) ? 'st' : 'ha';
  }
  /* 1.3.1 ➕ 기기 연결 › SmartThings — 아직이면 「연결하기」, 이었으면 위치마다 「센서 고르기」 · 무엇을 붙일 수 있나 */
  function stConnect(T, oa) {
    var what = '<section class="hal-sec"><h4>무엇을 붙일 수 있나요</h4><ul class="hal-ct-what">' +
      '<li><i>🌡️</i><span><b>온습도계</b> — 필라멘트 보관함의 습도 · 내 프린터 둘레의 온습도</span></li>' +
      '<li><i>🔌</i><span><b>전력을 재는 플러그</b> — 프린터 · 건조기의 가동 시간, 내 프린터의 출력 중 · 완료</span></li>' +
      '<li><i>🖨️</i><span><b>프린터 기기</b> (Edge 드라이버 — Bambu Lab · Klipper) — 출력 상태 · 진행률 · 노즐/베드 온도</span></li>' +
      '<li><i>🚪</i><span><b>문 · 움직임 · 밝기 · 배터리 …</b> — 기기 카드에 값으로</span></li></ul>' +
      '<p class="hal-hint">센서 고르기의 <b>「붙일 곳」</b>에서 필라멘트 보관함 카드나 <b>🖨️ 내 프린터</b>를 골라요. <a href="#" data-guide-st>프린터에 쓸 수 있는 것 표 보기 →</a></p></section>';
    if (!oa.length) {
      return '<section class="hal-sec"><h4><em>1</em> 삼성 계정으로 연결 <small>앱을 깔거나 코드를 적지 않아요</small></h4>' +
        '<ol class="hal-stc-steps"><li><em>1</em>삼성 계정으로 로그인</li><li><em>2</em>「허용」 누르기</li><li><em>3</em>받을 센서 고르기</li></ol>' +
        (T.oauth ? '<div class="hal-row"><button type="button" class="hal-btn pri big" data-st-go>🔗 SmartThings 연결하기</button></div>' : '<p class="hal-warn">관리자가 아직 SmartThings 연결을 준비하지 않았어요.</p>') +
        '<p class="hal-hint">🔒 사이트는 값을 읽기만 해요 (기기를 켜거나 끄지 않아요). 삼성 계정 비밀번호는 삼성 화면에만 적어요.</p></section>' + what + stPay();
    }
    return '<section class="hal-sec"><h4><em>1</em> 받을 센서 고르기 <small>이미 삼성 계정과 이어져 있어요</small></h4><div class="hal-ct-locs">' + oa.map(function (x) {
        return '<div class="hal-ct-loc"><span><b>📍 ' + esc(x.location || 'SmartThings 위치') + '</b><small>센서 ' + (x.picked || 0) + '개 받는 중' + (x.last_error ? ' · ⚠️ 확인 필요' : '') + '</small></span>' +
          '<button type="button" class="hal-btn pri" data-st-pick="' + x.id + '">⚙️ 센서 고르기</button></div>';
      }).join('') + '</div>' +
      '<p class="hal-hint">새로 산 센서도 SmartThings 앱에 등록한 뒤 여기서 체크하면 돼요 — 다시 로그인할 필요 없어요.</p>' +
      (T.oauth ? '<div class="hal-row"><button type="button" class="hal-btn sm" data-st-go>➕ 다른 위치(집 · 사무실) 연결</button></div>' : '') + '</section>' + what + stPay();
  }
  function connectBox(tab) {
    var T = S.d.smartthings || {}, oa = (T.installs || []).filter(function (x) { return x.mode === 'oauth'; }), hasSt = !!(T.oauth || oa.length);
    tab = tab === 'mt' ? 'mt' : (tab || srcTab()) === 'st' && hasSt ? 'st' : 'ha';   // 1.10.0 🧩
    var seg = '<div class="hal-seg" role="tablist"><button type="button" role="tab" data-ct="ha">' + haLogo() + ' Home Assistant</button>' + (hasSt ? '<button type="button" role="tab" data-ct="st">' + stLogo() + ' SmartThings</button>' : '') + '<button type="button" role="tab" data-ct="mt">' + mtLogo() + ' Matter</button></div>';
    var L = S.d.link, rp = String(L.repo).split('/'), my = 'https://my.home-assistant.io/redirect/';
    var row = function (label, val, key) { return '<div class="hal-copy"><span>' + label + '</span><code>' + esc(val) + '</code><button type="button" class="hal-btn sm pri" data-cp="' + key + '">📋 복사</button></div>'; };
    var ov = modal('➕ 기기 연결', seg + '<div data-cpn="ha"><section class="hal-sec"><h4><em>1</em> HACS 에서 「3ds」 설치 <small>처음 한 번만</small></h4>' +
        '<div class="hal-row"><a class="hal-btn pri" target="_blank" rel="noopener" href="' + my + 'hacs_repository/?owner=' + encodeURIComponent(rp[0]) + '&repository=' + encodeURIComponent(rp[1] || '') + '&category=integration">🧩 내 Home Assistant 의 HACS 에서 열기</a></div>' +
        '<p class="hal-hint">열린 화면에서 <b>다운로드</b>를 누르고 Home Assistant 를 다시 시작해 주세요. 단추가 안 되면 HACS › 사용자 지정 저장소에 <code>https://github.com/' + esc(L.repo) + '</code> (종류: 통합)을 넣으면 돼요.</p></section>' +
      '<section class="hal-sec"><h4><em>2</em> 통합을 추가하고 아래 두 가지를 붙여 넣기</h4>' +
        '<div class="hal-row"><a class="hal-btn" target="_blank" rel="noopener" href="' + my + 'config_flow_start/?domain=g7_link">⚙️ 「3ds」 통합 추가 열기</a></div>' + row('사이트 주소', L.site, 'site') + row('연결 코드', L.code, 'code') +
        '<p class="hal-hint">🔒 연결 코드는 비밀번호와 같아요. 새어 나갔으면 아래 「코드 새로 만들기」.</p></section>' +
      '<section class="hal-sec"><h4><em>3</em> 「⚡ 알아서 찾아 연결」 → 확인</h4><p class="hal-hint">사이트의 <b>내 프린터</b> · 필라멘트 <b>보관 위치</b>와 이름이 맞는 Home Assistant 기기 · 습도 센서를 찾아 체크해 둬요. 맞으면 <b>확인</b>만 누르면 끝 — 프린터는 상태 · 진행률 · 카메라, 보관함은 습도 · 온도가 한 번에 붙어요. 이름이 달라 못 찾은 것은 같은 목록에서 직접 체크하거나 「하나씩」으로 붙이면 돼요. 조금 뒤 이 화면에 🟢 로 나타나요.</p></section></div>' + (hasSt ? '<div data-cpn="st">' + stConnect(T, oa) + '</div>' : '') +
      '<div data-cpn="mt">' + guideMt() + '<div class="hal-row"><button type="button" class="hal-btn sm" data-ct-mt>🔑 키를 직접 넣을 기기 만들기 (Docker 판)</button></div></div>',
      { left: '<button type="button" class="hal-btn" data-guide2>❓ 그림으로 보기</button><span data-ha-only><button type="button" class="hal-btn" data-rl>🔑 코드 새로 만들기</button><button type="button" class="hal-btn" data-manual>📝 HACS 없이 설정 글로</button></span>' });
    mtWinBind(ov); mtGuideBind(ov);   // 1.11.0 🪟 · 1.11.1 그림 단추
    // 1.3.1 Home Assistant · SmartThings 바꿔 보기
    var show = function (t) {
      tab = t;
      Array.prototype.forEach.call(ov.querySelectorAll('[data-cpn]'), function (p) { p.hidden = p.getAttribute('data-cpn') !== t; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-ct]'), function (b) { var on = b.getAttribute('data-ct') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on ? 'true' : 'false'); });
      var ho = ov.querySelector('[data-ha-only]'); if (ho) ho.hidden = t !== 'ha';
      ov.querySelector('.hal-modal-c').scrollTop = 0;
    };
    show(tab);
    ov.addEventListener('click', function (ev) {
      var ct = ev.target.closest('[data-ct]'); if (ct) { show(ct.getAttribute('data-ct')); return; }
      if (ev.target.closest('[data-ct-mt]')) { ov.__close(); form(null, 'mt'); return; }   // 1.10.0 🧩
      var sg = ev.target.closest('[data-st-go]'); if (sg) { stGo(sg); return; }
      var sp = ev.target.closest('[data-st-pick]'); if (sp) { ov.__close(); stPick(+sp.getAttribute('data-st-pick')); return; }
      if (ev.target.closest('[data-guide-st]')) { ev.preventDefault(); ov.__close(); guideBox('st'); return; }
      var c = ev.target.closest('[data-cp]'); if (c) { copy(c.getAttribute('data-cp') === 'site' ? L.site : L.code, c); return; }
      if (ev.target.closest('[data-guide2]')) { ov.__close(); guideBox(tab); return; }
      if (ev.target.closest('[data-manual]')) { ov.__close(); form(null); return; }
      if (ev.target.closest('[data-rl]') && confirm('연결 코드를 새로 만들까요? Home Assistant 의 통합에서 기기를 더 붙이거나 고치려면 새 코드를 넣어야 해요. (이미 붙인 기기는 계속 값이 들어와요)')) api('POST', '/link/rotate', {}).then(function (r) { toast(r.message); S.d = r.data.overview; ov.__close(); connectBox('ha'); }).catch(fail);
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
  function form(d, kind) {   // 1.10.0 kind = 'mt' — 🧩 Matter 기기로 새로 만들기 (센서 이름 없이)
    var D = S.d, isNew = !d, isSt = !!(d && d.source === 'smartthings'), isMt = d ? d.source === 'matter' : kind === 'mt', isMq = !!(d && d.source === 'mqtt');   // 1.15.0 📨
    d = d || { target: 'location', name: '', location: '', entities: {}, humidity_max: 40, temp_max: null, notify: true, snap_public: false };
    var e = d.entities, ent = function (k, label, ph) { return '<label>' + label + '<input name="ent_' + k + '" value="' + esc(e[k] || '') + '" placeholder="' + ph + '" autocapitalize="off" autocomplete="off" spellcheck="false"></label>'; };
    var tg = Object.keys(D.targets).filter(function (k) { return k === 'location' || k === 'other' || (k === 'printer' && D.printers.length) || (k === 'equipment' && D.equipment.length); });
    var html =
      '<section class="hal-sec"><h4><em>1</em> 무엇에 붙일까요?</h4><div class="hal-pick">' + tg.map(function (k) { return '<label><input type="radio" name="target" value="' + k + '"' + (d.target === k ? ' checked' : '') + '><span><i>' + ICON[k] + '</i>' + esc(D.targets[k]) + '</span></label>'; }).join('') + '</div>' +
        '<div data-for="location"><label>보관 위치 <small>필라멘트에 적은 「보관 위치」와 같게</small><input name="location" list="hal-locs" maxlength="40" value="' + esc(d.location || '') + '" placeholder="예: 드라이박스 · AMS · 서랍 2칸"><datalist id="hal-locs">' + D.locations.map(function (l) { return '<option value="' + esc(l) + '">'; }).join('') + '</datalist></label>' +
          (D.locations.length ? '<div class="hal-locs"><small>📦 보관함에서 고르기</small>' + D.locations.map(function (l) { return '<button type="button" class="hal-locchip" data-loc="' + esc(l) + '">📦 ' + esc(l) + '</button>'; }).join('') + '</div>' : '') + '</div>' +   // 1.4.12
        '<div data-for="printer"><label>내 프린터<select name="printer_id">' + D.printers.map(function (p) { return '<option value="' + p.id + '"' + (d.printer_id === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>'; }).join('') + '</select></label></div>' +
        '<div data-for="equipment"><label>업체 장비<select name="equipment_id">' + D.equipment.map(function (x) { var c = D.companies.filter(function (y) { return y.id === x.company_id; })[0]; return '<option value="' + x.id + '"' + (d.equipment_id === x.id ? ' selected' : '') + '>' + esc((c ? c.name + ' — ' : '') + x.name) + '</option>'; }).join('') + '</select></label></div>' +
        '<label>이름 <small>비우면 위에서 고른 것</small><input name="name" maxlength="60" value="' + esc(d.name || '') + '" placeholder="예: 거실 드라이박스"></label>' +
        '<label>📁 분류 <small>화면에서 묶어 보여 줄 곳 — 자동이면 붙인 곳 따라</small><select name="grp">' + grpOpts(d.grp || '', isNew ? 'new' : d.group_auto || 'none') + '</select></label></section>' +   // 1.4.6
      (isSt ? '<section class="hal-sec"><h4><em>2</em> ' + stLogo() + ' SmartThings 센서</h4><p class="hal-hint">이 기기의 값은 SmartThings 에서 들어와요. 받을 센서는 화면 위쪽 SmartThings 카드의 <b>⚙️ 센서 고르기</b>에서 바꿔요.</p></section>' : '') +
      (isMt ? '<section class="hal-sec"><h4><em>2</em> ' + mtLogo() + ' Matter 센서</h4><p class="hal-hint">이 기기의 값은 <b>3ds Matter 연결</b> 프로그램에서 들어와요 (Home Assistant 센서 이름은 없어도 돼요). ' + (isNew ? '저장하면 나오는 <b>받는 키</b>를 그 설정에 넣어요.' : '<a href="#" data-mt-key>🔑 받는 키 · 설정 보기</a>') + '</p></section>' : '') +
      (isMq ? '<section class="hal-sec"><h4><em>2</em> ' + mqLogo() + ' MQTT 토픽</h4><p class="hal-hint">이 기기의 값은 <b>3ds MQTT 중계</b>에서 들어와요. 받을 토픽은 받는 곳 › MQTT 카드의 <b>🔎 찾은 센서</b>에서 바꿔요.</p></section>' : '') +
      (isSt || isMt || isMq ? '' : '<section class="hal-sec"><h4><em>2</em> Home Assistant 센서 이름</h4><p class="hal-hint">HA 의 <b>개발자 도구 › 상태</b>에서 보이는 이름이에요. 있는 것만 적으면 돼요.</p>' +
        '<div data-for="printer equipment other" class="hal-preset">빠르게 채우기: ' + Object.keys(PRESET).map(function (k) { return '<button type="button" class="hal-chip" data-preset="' + k + '">' + PRESET[k][0] + '</button>'; }).join('') + '</div>' +
        '<div class="hal-two">' + ent('hum', '💧 습도', 'sensor.drybox_humidity') + ent('temp', '🌡️ 온도', 'sensor.drybox_temperature') + '</div>' +
        '<div data-for="printer equipment other">' + ent('state', '⚙️ 상태 <small>프린터 상태 · 전원 스위치 · 플러그 — 가동 시간을 세요</small>', 'sensor.p1s_print_status 또는 switch.dryer') + '</div>' +
        '<div data-for="printer" class="hal-two">' + ent('progress', '진행률 (%)', 'sensor.p1s_print_progress') + ent('remaining', '남은 시간 (분)', 'sensor.p1s_remaining_time') + ent('job', '작업 이름', 'sensor.p1s_task_name') + '</div></section>') +
      '<section class="hal-sec"><h4><em>3</em> 알림 기준 <small>비우면 알리지 않아요</small></h4>' +
        '<div class="hal-two"><label>습도가 이보다 낮으면 (%)<input name="humidity_min" type="number" min="0" max="100" inputmode="numeric" value="' + esc(d.humidity_min == null ? '' : d.humidity_min) + '" placeholder="안 알림"></label>' +   // 1.9.0 아래 기준
          '<label>온도가 이보다 낮으면 (°C)<input name="temp_min" type="number" inputmode="numeric" value="' + esc(d.temp_min == null ? '' : d.temp_min) + '" placeholder="안 알림"></label></div>' +
        '<div class="hal-two"><label>습도가 이보다 높으면 (%)<div class="hal-chips">' + [20, 30, 40, 50].map(function (v) { return '<button type="button" class="hal-chip" data-hm="' + v + '">' + v + '%</button>'; }).join('') + '</div><input name="humidity_max" type="number" min="1" max="100" inputmode="numeric" value="' + esc(d.humidity_max == null ? '' : d.humidity_max) + '" placeholder="안 알림"></label>' +
        '<label>온도가 이보다 높으면 (°C)<div class="hal-chips"></div><input name="temp_max" type="number" inputmode="numeric" value="' + esc(d.temp_max == null ? '' : d.temp_max) + '" placeholder="안 알림"></label></div>' +
        '<label class="hal-chk"><input type="checkbox" name="notify"' + (d.notify ? ' checked' : '') + '> 기준을 넘으면 알림 받기</label><p class="hal-hint">필라멘트는 보통 습도 20~40% 아래로 둬요 (나일론 · PVA 는 더 낮게).</p></section>' +
      (isSt || isMt || isMq ? '' : '<section class="hal-sec"><h4><em>4</em> 카메라 사진 <small>HACS 통합에서 카메라를 골랐을 때</small></h4><label class="hal-chk"><input type="checkbox" name="snap_public"' + (d.snap_public ? ' checked' : '') + '> 🌐 사진을 다른 회원에게 공개</label><p class="hal-hint">끄면 나만 봐요 (기본). 켜면 사이트의 다른 화면(예: 내 프린터)에서 이 사진을 보일 수 있어요. 언제든 끌 수 있어요.</p></section>');
    var ov = modal(isNew ? (isMt ? mtLogo() + ' Matter 기기 만들기' : '➕ 기기 연결') : '✏️ 기기 고치기', html, {
      ok: isNew ? (isMt ? '만들고 받는 키 보기' : '만들고 설정 글 보기') : '저장',
      left: isNew ? '' : '<button type="button" class="hal-btn danger" data-del>🗑 지우기</button>',
      onSave: function (o) {
        var v = {}; Array.prototype.forEach.call(o.querySelectorAll('[name]'), function (i) { if (i.type === 'radio' && !i.checked) return; v[i.name] = i.type === 'checkbox' ? i.checked : i.value.trim(); });
        if (isNew && isMt) v.source = 'matter';   // 1.10.0 🧩
        return api(isNew ? 'POST' : 'PUT', '/devices' + (isNew ? '' : '/' + d.id), v).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); if (isNew) setTimeout(function () { yamlBox(find(r.data.id)); }, 60); });
      }
    });
    var $ = function (sel) { return ov.querySelector(sel); }, f = function (k) { return $('[name="' + k + '"]'); };
    var sync = function () {
      var t = ($('[name=target]:checked') || {}).value || 'location';
      Array.prototype.forEach.call(ov.querySelectorAll('[data-for]'), function (el) { el.hidden = el.getAttribute('data-for').split(' ').indexOf(t) < 0; });
      Array.prototype.forEach.call(ov.querySelectorAll('[data-hm]'), function (b) { b.classList.toggle('on', b.getAttribute('data-hm') === f('humidity_max').value); });
      var lk = function (v) { return String(v || '').replace(/\s+/g, '').toLowerCase(); }, cur = lk(f('location') && f('location').value);   // 1.4.12 고른 보관함 표시
      Array.prototype.forEach.call(ov.querySelectorAll('[data-loc]'), function (b) { b.classList.toggle('on', cur !== '' && lk(b.getAttribute('data-loc')) === cur); });
    };
    ov.addEventListener('change', sync); ov.addEventListener('input', sync); sync();
    ov.addEventListener('click', function (ev) {
      if (ev.target.closest('[data-mt-key]')) { ev.preventDefault(); ov.__close(); mtKeyBox(d); return; }   // 1.10.0 🧩
      var hm = ev.target.closest('[data-hm]'); if (hm) { f('humidity_max').value = hm.getAttribute('data-hm'); sync(); return; }
      var lc = ev.target.closest('[data-loc]'); if (lc) { f('location').value = lc.getAttribute('data-loc'); if (!f('name').value) f('name').placeholder = lc.getAttribute('data-loc'); sync(); return; }   // 1.4.12 📦
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
  /** 1.10.0 🧩 Matter 기기 — 받는 키 · 3ds Matter 연결 설정 (config.yaml 의 devices 한 줄) */
  function mtKeyBox(d) {
    if (!d) return;
    var site = (S.d.link && S.d.link.site) || location.origin;
    var conf = 'site: ' + site + '\ndevices:\n  - node: 1            # link.py nodes 에 나오는 노드 번호\n    name: ' + String(d.name).replace(/[\r\n]+/g, ' ') + '\n    key: ' + d.token + '\n';
    var ov = modal(mtLogo() + ' ' + esc(d.name) + ' — 3ds Matter 연결에 넣기',
      '<section class="hal-sec"><h4><em>1</em> 받는 키 <small>비밀번호와 같아요 — 남에게 보이지 마세요</small></h4><div class="hal-copy"><span>key</span><code>' + esc(d.token) + '</code><button type="button" class="hal-btn sm pri" data-mtcp="key">📋 복사</button></div></section>' +
      '<section class="hal-sec"><h4><em>2</em> <code>config/config.yaml</code> 에 넣기 <small>devices 아래에 한 줄씩</small></h4><div class="hal-code"><pre>' + esc(conf) + '</pre><button type="button" class="hal-btn sm pri" data-mtcp="conf">📋 복사</button></div>' +
        '<p class="hal-hint"><code>node</code> 는 <code>link.py nodes</code> 에 나오는 번호로 바꿔요. 저장하면 30초 안에 보내기 시작하고, 이 화면의 기기가 🟢 로 바뀌어요.</p></section>' +
      '<section class="hal-sec"><h4>아직 3ds Matter 연결이 없으면</h4><p class="hal-hint"><a href="' + MT_REPO + '#readme" target="_blank" rel="noopener">📖 설치 안내</a> — 집에 Matter 서버가 있으면 그 주소만, 없으면 라즈베리파이 · 리눅스에 같이 켜요.</p></section>');
    ov.addEventListener('click', function (ev) { var c = ev.target.closest('[data-mtcp]'); if (c) copy(c.getAttribute('data-mtcp') === 'key' ? d.token : conf, c); });
  }
  function yamlBox(d) {
    if (!d) return;
    if (d.source === 'matter') { mtKeyBox(d); return; }   // 1.10.0 🧩 Matter 기기는 HA 설정 글이 아니라 받는 키
    if (d.source === 'mqtt') { toast('MQTT 기기는 설정 글이 없어요 — 받는 곳 › MQTT 카드에서 토픽을 골라요.'); return; }   // 1.15.0 📨
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
    ['max_devices', '회원 한 명이 연결할 수 있는 기기 (기본 · 1~1000)', 'num'], ['max_devices_company', '업체 하나에 둘 수 있는 기기 (기본 · 그 업체로 분류된 것을 회원 모두 합쳐 · 0 = 막지 않음)', 'num'],   // 1.4.7
    ['limit_admin_free', '관리자(최고 관리자 · 관리자 역할)는 기기 수 · 업체 한도에서 빼기 (칸을 살 필요 없음)', 'bool'],   // 1.4.10
    ['slot_enabled', '💳 한도를 넘는 센서 칸을 코인 · 마일리지로 팔기 (회원 칸 · 업체 칸)', 'bool'], ['slot_mode', '💳 칸 결제 방식', 'sel', [['once', '한 번 사면 계속'], ['monthly', '달마다 결제 (자동 연장)']]],
    ['slot_coin_price', '💳 센서 1개 값 — 코인 (0 = 안 팖)', 'num'], ['slot_coin_price10', '💳 센서 10개 묶음 값 — 코인 (0 = 안 팖)', 'num'], ['slot_mileage_price', '💳 센서 1개 값 — 마일리지 (0 = 안 팖)', 'num'], ['slot_mileage_price10', '💳 센서 10개 묶음 값 — 마일리지 (0 = 안 팖)', 'num'], ['slot_cancel_days', '💳 산 뒤 이 날 수 안 · 안 쓴 칸만 취소(환불) — 0 = 취소 안 받음 (0~30)', 'num'],   // 1.8.3   // 1.4.8
    ['max_devices_members', '회원마다 다르게 — 「회원번호 또는 이메일:개수」 쉼표로 (예: 12:50, kim@example.com:100)', 'area'], ['max_devices_companies', '업체마다 다르게 — 「업체번호:개수」 쉼표로 (예: 3:100, 7:0 · 0 = 막지 않음) · 업체 번호는 업체 주소 /companies/번호', 'area'], ['send_mode', '전송 방식 (통합 「3ds」)', 'sel', [['change', '값이 변하면 보내기 (권장)'], ['interval', '주기적으로 보내기']]],
    ['change_hum', '「변하면」: 습도가 이만큼(%) 변하면 보냄 (1~10 · 온도는 0.5°C)', 'num'], ['idle_min', '「변하면」: 변화가 없어도 이만큼(분)마다 한 번 (5~180)', 'num'],
    ['interval_min', '「주기적으로」 · 설정 글(YAML): 값 보내는 주기 (분, 1~60)', 'num'], ['refresh_sec', '화면이 새 값을 다시 받는 간격 (초, 5~3600 · 0 = 끔)', 'num'],
    ['away_after_min', '회원이 화면을 이만큼(분) 안 보면 「자리 비움」 (5~1440 · 0 = 끔: 늘 같은 주기)', 'num'], ['away_interval_min', '자리 비움일 때 값 보내는 주기 (분) — 통합 「3ds」이 스스로 늦춤', 'num'], ['keep_days', '온습도 기록을 며칠 둘지 (한 시간에 한 줄)', 'num'], ['stale_hours', '몇 시간 소식이 없으면 「끊김」', 'num'], ['alert_gap_hours', '같은 기기의 경고를 다시 보내기까지 (시간)', 'num'],
    ['notify_site', '기준을 넘으면 사이트 알림', 'bool'], ['notify_mail', '기준을 넘으면 메일도', 'bool'], ['snapshot', '카메라 사진 받기 (기기마다 최신 한 장 · 주인만 봄)', 'bool'], ['snap_gap_min', '사진을 받는 가장 짧은 간격 (분)', 'num'], ['printer_link', '내 프린터로 출력 상태 넘기기', 'bool'], ['company_link', '업체 보유 장비에 연결', 'bool'], ['hacs_repo', 'HACS 통합 저장소 (GitHub 주인/이름)', 'text'], ['timezone', '시간대 (예: Asia/Seoul)', 'text']];
  /* 📡 SmartThings — 관리자 설정 · 앱 등록 안내 (한 걸음씩)
   *  1.1.0 API Access App (OAuth-In) — ⚡ 자동 등록(개인 액세스 토큰을 한 번 붙여 넣기) · 📝 직접 등록(Developer Center 또는 SmartThings CLI)
   *  0.2.0 의 Developer Workspace · WebHook SmartApp(연결 코드) 방식은 「고급」에 */
  var ST_FIELDS = [['st_enabled', 'SmartThings 연결 쓰기', 'bool'], ['st_client_id', 'Client ID', 'text'], ['st_client_secret', 'Client Secret', 'secret']];
  var ST_MORE = [['st_app_id', 'App ID (비워 두면 회원이 처음 연결할 때 알아서 채워요)', 'text'], ['st_max_events_min', '위치 하나가 1분에 보낼 수 있는 값 (넘으면 버림, 10~2000)', 'num'], ['st_poll_min', '값이 이만큼(분) 안 오면 지금 값을 직접 물어보고 구독도 다시 확인 — 값이 그대로인 센서가 「끊김」이 되지 않게 · 끊긴 뒤 저절로 다시 잇기 (스케줄 15분마다 · 15~1440 · 0 = 끔)', 'num'],
    ['st_code_flow', '(예전 방식) 연결 코드로 잇기도 보이기 — WebHook SmartApp 으로 등록했을 때만', 'bool'], ['st_code_min', '(예전 방식) 연결 코드를 쓸 수 있는 시간 (분, 5~1440)', 'num'],
    ['st_ping_unsigned', '(예전 방식) 서명 없는 PING 에도 답하기 — 보통은 끔', 'bool'], ['st_public_key', '서명 공개 키 PEM — 비우면 key.smartthings.com 에서 받아요', 'area']];
  function stField(s, f) {
    if (f[2] === 'bool') return '<label class="hal-chk"><input type="checkbox" data-k="' + f[0] + '"' + (s[f[0]] ? ' checked' : '') + '> ' + esc(f[1]) + '</label>';
    if (f[2] === 'secret') return '<label>' + esc(f[1]) + ' <small>' + (s.st_client_secret_set ? '🔒 저장됨 (암호화) — 바꿀 때만 적어요' : '아직 없음') + '</small><input type="password" autocomplete="new-password" data-k="' + f[0] + '" value="" placeholder="' + (s.st_client_secret_set ? '●●●●●●●● 그대로 두기' : '앱을 등록하고 받은 Client Secret') + '"></label>';
    if (f[2] === 'area') return '<label class="full">' + esc(f[1]) + '<textarea data-k="' + f[0] + '" rows="3" spellcheck="false" placeholder="-----BEGIN PUBLIC KEY-----">' + esc(s[f[0]] || '') + '</textarea></label>';
    return '<label>' + esc(f[1]) + '<input type="' + (f[2] === 'num' ? 'number' : 'text') + '" data-k="' + f[0] + '" value="' + esc(s[f[0]]) + '" autocomplete="off" spellcheck="false"></label>';
  }
  function stAdmin(s, info) {
    var I = info || {}, done = !!(s.st_client_id && s.st_client_secret_set);
    var cp = function (label, v, k) { return '<div class="hal-copy">' + (label ? '<span>' + label + '</span>' : '') + '<code>' + esc(v) + '</code><button type="button" class="hal-btn sm pri" data-acp="' + k + '">📋 복사</button></div>'; };
    var ok = !done ? '<span class="hal-pill">⚪ 아직 등록 전</span>' : !s.st_enabled ? '<span class="hal-pill wait">⏸ 등록됨 — 「SmartThings 연결 쓰기」가 꺼져 있어요</span>'
      : I.confirmed_at ? '<span class="hal-pill on">✅ 주소 확인됨 · ' + esc(I.confirmed_at) + '</span>' : '<span class="hal-pill wait">⏳ 주소 확인을 기다리는 중</span>';
    var li = function (x, i) { return '<li><em>' + (i + 1) + '</em><div><b>' + x[0] + '</b><p>' + x[1] + '</p>' + (x[2] || '') + '</div></li>'; };
    var auto = [
      ['삼성 계정으로 「개인 액세스 토큰」 만들기', '<a href="https://account.smartthings.com/tokens" target="_blank" rel="noopener">account.smartthings.com/tokens</a> 에 SmartThings 를 쓰는 삼성 계정으로 로그인 → <b>토큰 생성</b>(Generate new token) → 이름은 아무거나 → 권한에서 <b>애플리케이션</b>(Applications)을 체크 → 만들어진 토큰을 복사해요. 토큰은 24시간만 살아 있어요.'],
      ['토큰을 붙여 넣고 「⚡ 자동 등록」', '사이트가 SmartThings 에 앱 「' + esc(I.app_name || '') + '」을 만들고, Client ID · Client Secret 을 저장하고, 주소 확인까지 해요. 토큰은 이때 한 번만 쓰고 <b>저장하지 않아요</b>.',
        '<div class="hal-copy hal-st-reg"><input type="password" autocomplete="off" spellcheck="false" data-st-pat placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" aria-label="개인 액세스 토큰"><button type="button" class="hal-btn pri" data-st-reg' + (I.https === false ? ' disabled' : '') + '>⚡ 자동 등록</button></div>'],
      ['끝 — 내 계정으로 먼저 연결해 보기', '위에 <b>✅ 주소 확인됨</b>이 보이면 회원 화면 <a href="' + BASE + '" target="_blank">' + BASE + '</a> 의 SmartThings 카드에 <b>🔗 SmartThings 연결하기</b> 단추가 생겨요. 회원은 삼성 계정으로 로그인 → 허용 → 센서 고르기만 하면 돼요.']
    ];
    var manual = [
      ['앱 등록 화면 열기', '<a href="https://developer.smartthings.com/console" target="_blank" rel="noopener">Developer Center</a> › <b>Service Integrations</b> › <b>Register New App</b>. 그 메뉴가 아직 안 보이면 <a href="https://github.com/SmartThingsCommunity/smartthings-cli#readme" target="_blank" rel="noopener">SmartThings CLI</a> 로 아래 명령을 치고 <b>OAuth-In App</b> 을 골라요.', cp('', 'smartthings apps:create', 'cli')],
      ['아래 값을 그대로 붙여 넣기', '이름은 회원이 삼성의 「허용」 화면에서 보게 돼요. 권한(Scopes)은 <b>읽기</b> 두 개만 체크해요.',
        cp('Display Name', I.app_name || '', 'name') + cp('Target URL', I.target_url || '', 'url') + cp('Redirect URI', I.redirect_uri || '', 'redirect') + cp('Scopes', (I.scopes || []).join(' '), 'scopes')],
      ['나온 Client ID · Client Secret 을 아래에 붙여 넣고 저장', '<b>Client Secret 은 이때 한 번만 보여요</b> — 바로 복사해 두세요. 「SmartThings 연결 쓰기」도 같이 켜고 <b>저장</b>.'],
      ['주소 확인', '앱을 등록하면 SmartThings 가 사이트로 확인 요청(CONFIRMATION)을 보내고 사이트가 알아서 답해요 — 이 화면을 새로 고치면 <b>✅ 주소 확인됨</b>. 안 바뀌면 Developer Center 의 <b>Confirm Target URL</b> 을 누르거나 <code>smartthings apps:register</code> 를 한 번 더 쳐요.']
    ];
    return '<section class="hal-form hal-st-admin"><div class="full hal-st-ah"><h2>' + stLogo() + ' SmartThings 연결 <small>API Access App · 로그인(OAuth) 방식</small></h2>' + ok + '<span class="hal-hint">연결한 위치 ' + n(I.installs) + ' · 회원과 이은 것 ' + n(I.linked) + '</span></div>' +
      (I.https === false ? '<p class="hal-warn full">⚠️ 사이트 주소(APP_URL)가 https 가 아니에요 — SmartThings 는 https 주소만 받아요.</p>' : '') +
      '<div class="full hal-st-how"><div class="hal-seg" role="tablist"><button type="button" role="tab" data-rt="auto" class="' + (done ? '' : 'on') + '">⚡ 자동 등록 <small>추천</small></button><button type="button" role="tab" data-rt="manual" class="' + (done ? 'on' : '') + '">📝 직접 등록</button></div>' +
        '<ol class="hal-st-steps" data-rp="auto"' + (done ? ' hidden' : '') + '>' + auto.map(li).join('') + '</ol><ol class="hal-st-steps" data-rp="manual"' + (done ? '' : ' hidden') + '>' + manual.map(li).join('') + '</ol></div>' +
      ST_FIELDS.map(function (f) { return stField(s, f); }).join('') +
      '<p class="hal-note-pay full" role="note">💳 <b>유료 이용제 안내</b> — 삼성이 2026년 10월부터 SmartThings API 를 유료 플랜으로 바꾸고 있어요 (개인 월 $4.99 · 상업용은 따로). <b>무료 이용이 중지되면 앱 등록 · 회원 연결 · 값 받기가 멈출 수 있어요</b> — 거부되면 Developer Center 에서 플랜을 확인해 주세요. ' +
      '회원 화면의 SmartThings 카드 · 연결 방법 · 센서 고르기에도 「무료 이용이 중지될 수 있다」는 안내가 늘 보여요. <a href="' + ST_PAY_URL + '" target="_blank" rel="noopener">삼성 SmartThings 의 안내 글</a></p>' +
      '<details class="full hal-st-more"><summary>고급 · 예전 방식 (연결 코드)</summary><div class="hal-form-in">' + ST_MORE.map(function (f) { return stField(s, f); }).join('') +
        '<p class="hal-hint full">예전 방식: Developer Workspace 에서 <b>WebHook SmartApp</b>(Automation)으로 등록했다면 Target URL 은 위와 같고' + (I.legacy_target_url ? ' (예전 주소 <code>' + esc(I.legacy_target_url) + '</code> 로 등록했어도 계속 받아요)' : '') + ', 「연결 코드로 잇기도 보이기」를 켜면 회원 화면에 연결 코드 칸이 나와요. 이 방식은 삼성의 배포 승인을 받기 전에는 등록한 계정만 설치할 수 있어요.</p></div></details>' +
      '<p class="hal-hint full">🔒 SmartThings 가 보내는 모든 요청의 HTTP 서명(rsa-sha256 · Digest · Date)을 확인하고 맞지 않으면 거부해요. 사이트가 받는 권한은 읽기뿐(' + esc((I.scopes || []).join(' · ')) + ')이고, 회원 토큰은 암호화해 두고 끝나기 전에 새로 받아요.</p></section>';
  }
  /* 1.9.0 ⚙️ 관리자 설정을 탭으로 — 칸은 모두 그려 두고(저장은 그대로 모두) 고른 탭만 보임 · 고른 탭은 이 브라우저에 기억 */
  var AGROUPS = [
    ['base', '⚙️ 기본', ['enabled', 'menu_enabled', 'menu_label', 'refresh_sec', 'hacs_repo', 'timezone']],
    ['limit', '🔢 기기 한도', ['max_devices', 'max_devices_company', 'limit_admin_free', 'max_devices_members', 'max_devices_companies']],
    ['slot', '💳 센서 칸', ['slot_enabled', 'slot_mode', 'slot_coin_price', 'slot_coin_price10', 'slot_mileage_price', 'slot_mileage_price10', 'slot_cancel_days']],
    ['send', '📤 값 보내기', ['send_mode', 'change_hum', 'idle_min', 'interval_min', 'away_after_min', 'away_interval_min', 'keep_days', 'stale_hours']],
    ['alert', '🔔 알림', ['alert_gap_hours', 'notify_site', 'notify_mail']],
    ['cam', '📷 카메라', ['snapshot', 'snap_gap_min']],
    ['link', '🔗 다른 확장', ['printer_link', 'company_link']],
    ['st', 'SmartThings', []]
  ];
  function agroupOf(k) { for (var i = 0; i < AGROUPS.length; i++) if (AGROUPS[i][2].indexOf(k) >= 0) return AGROUPS[i][0]; return 'base'; }
  function aTab() { var t = pref('atab', 'base'); return AGROUPS.some(function (g) { return g[0] === t; }) ? t : 'base'; }
  function aTabShow() { var t = aTab(); qa('[data-tg]').forEach(function (el) { el.hidden = el.getAttribute('data-tg') !== t; }); qa('[data-atab]').forEach(function (b) { var on = b.getAttribute('data-atab') === t; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); }); }
  function renderAdmin() {
    api('GET', '/admin/settings').then(function (r) {
      var s = r.data.settings, st = r.data.stats;
      wrap('<section class="hal-hero"><div><h1>📡 IoT 연결 — 관리자</h1><p>회원 화면: <a href="' + BASE + '" target="_blank">' + BASE + '</a> · 회원 기기의 값 · 받는 주소는 관리자에게도 보이지 않아요</p></div><div class="hal-stats"><span>쓰는 회원 <b>' + n(st.users) + '</b></span><span>기기 <b>' + n(st.devices) + '</b></span><span>🟢 연결됨 <b>' + n(st.live) + '</b></span><span>기록 <b>' + n(st.readings) + '</b>줄</span><span>' + stLogo() + ' SmartThings <b>' + n(st.st_installs) + '</b></span></div></section>' +
        '<div class="hal-seg hal-atabs" role="tablist" aria-label="설정 묶음">' + AGROUPS.map(function (g) { return '<button type="button" role="tab" data-atab="' + g[0] + '">' + (g[0] === 'st' ? stLogo() + ' ' : '') + g[1] + '</button>'; }).join('') + '</div>' +   // 1.9.0 탭
        '<div class="hal-form">' + FIELDS.map(function (f) {
          if (f[2] === 'sel') return '<label data-tg="' + agroupOf(f[0]) + '">' + esc(f[1]) + '<select data-k="' + f[0] + '">' + f[3].map(function (o) { return '<option value="' + o[0] + '"' + (s[f[0]] === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></label>';
          if (f[2] === 'area') return '<label data-tg="' + agroupOf(f[0]) + '" class="full">' + esc(f[1]) + '<textarea data-k="' + f[0] + '" rows="2" spellcheck="false" placeholder="비우면 모두 기본값">' + esc(s[f[0]] || '') + '</textarea></label>';   // 1.4.7
          return f[2] === 'bool' ? '<label data-tg="' + agroupOf(f[0]) + '" class="hal-chk"><input type="checkbox" data-k="' + f[0] + '"' + (s[f[0]] ? ' checked' : '') + '> ' + esc(f[1]) + '</label>' : '<label data-tg="' + agroupOf(f[0]) + '">' + esc(f[1]) + '<input type="' + (f[2] === 'num' ? 'number' : 'text') + '" data-k="' + f[0] + '" value="' + esc(s[f[0]]) + '"></label>';
        }).join('') + '<p class="hal-hint full" data-tg="send">전송 방식은 여기서 정하고 회원의 통합이 따라요 (회원은 주기를 더 길게만 바꿀 수 있어요). 「값이 변하면」: 습도 · 온도가 정한 만큼 변했을 때만 보내고(잇따라 변해도 1분에 한 번까지), 변화가 없으면 가끔 한 번만 — 값이 안정된 보관함은 요청이 줄고, 뚜껑을 열어 습도가 오르면 더 빨리 알아요. 「주기적으로」: 정한 주기마다 보내요 (기기 100대 · 10분이면 한 시간에 600번). 회원이 사이트의 IoT 연결 · 정비 수첩 화면을 한동안 안 보면(자리 비움) 통합이 느린 주기로 바꿔 보내요 — 그동안에도 출력 시작 · 끝 같은 상태 변화는 바로 오고, 습도 경고는 느린 주기만큼 늦어질 수 있어요. 다시 화면을 열면 다음 번 값이 올 때부터 평소 주기로 돌아와요 (설정 글(YAML)로 붙인 기기는 늘 같은 주기) — 요청 하나에 조회 1 · 저장 1~3. 기록은 기기마다 한 시간에 한 줄만 남기고 위 날짜가 지나면 지워요. 받는 주소는 1분에 30번까지만 받아요.</p>' +
        '</div><div data-tg="st">' + stAdmin(s, r.data.smartthings) + '</div><div class="hal-acts hal-acts-end"><button class="hal-btn pri" id="hal-asave">저장</button></div>');
      aTabShow();
      S.root.onclick = function (ev) {
        var at = ev.target.closest('[data-atab]'); if (at) { setPref('atab', at.getAttribute('data-atab')); aTabShow(); return; }   // 1.9.0 탭
        var I = r.data.smartthings || {}, c = ev.target.closest('[data-acp]'), t = ev.target.closest('[data-rt]'), g = ev.target.closest('[data-st-reg]');
        if (c) { copy({ url: I.target_url, redirect: I.redirect_uri, name: I.app_name, cli: 'smartthings apps:create', scopes: (I.scopes || []).join(' ') }[c.getAttribute('data-acp')] || '', c); return; }
        if (t) { qa('[data-rt]').forEach(function (b) { b.classList.toggle('on', b === t); }); qa('[data-rp]').forEach(function (p) { p.hidden = p.getAttribute('data-rp') !== t.getAttribute('data-rt'); }); return; }
        if (g) {   // 1.1.0 ⚡ 자동 등록 — 토큰은 이 요청에만 쓰임 (저장하지 않음)
          var pat = (q('[data-st-pat]').value || '').trim(); if (!pat) { toast('개인 액세스 토큰을 붙여 넣어 주세요.', true); return; }
          g.disabled = true; g.textContent = 'SmartThings 에 등록하는 중…';
          api('POST', '/admin/smartthings/register', { token: pat }).then(function (x) { toast(x.message); renderAdmin(); }).catch(function (e) { g.disabled = false; g.textContent = '⚡ 자동 등록'; fail(e); });
        }
      };
      q('#hal-asave').onclick = function () {
        var out = {}; qa('[data-k]').forEach(function (i) { out[i.getAttribute('data-k')] = i.type === 'checkbox' ? i.checked : i.type === 'number' ? +i.value : i.value; });
        api('PUT', '/admin/settings', { settings: out }).then(function (x) { toast(x.message || '저장했어요.'); renderAdmin(); }).catch(fail);
      };
    }).catch(function (e) { wrap('<div class="hal-empty">' + esc(e.message) + '</div>'); });
  }

  // ── 시작 ──
  function route() {
    if (S.root.hasAttribute('data-hal-admin')) return renderAdmin();
    var ret = S.ret; S.ret = null;
    // 1.1.0 SmartThings 로그인 · 허용을 마치고 돌아옴 (?code=…&state=…) → 로그인 정보와 함께 서버에 넘겨 잇고, 처음이면 센서 고르기를 바로 엶
    if (ret && ret.code) {
      wrap('<div class="hal-empty">' + stLogo() + ' SmartThings 와 연결하는 중…</div>');
      api('POST', '/smartthings/oauth/finish', { code: ret.code, state: ret.state }).then(function (r) { toast(r.message); S.d = r.data.overview; draw(); if (r.data.choose) stPick(r.data.install_id); })
        .catch(function (e) { toast(e.status === 401 ? '로그인한 뒤 「SmartThings 연결하기」를 다시 눌러 주세요.' : e.message, true); route(); });
      return;
    }
    if (ret && ret.error) toast(ret.error === 'access_denied' ? 'SmartThings 연결을 취소했어요.' : 'SmartThings 가 연결을 받아 주지 않았어요 (' + ret.error + ').', true);
    wrap('<div class="hal-empty">불러오는 중…</div>');
    api('GET', '/me').then(function (r) { S.d = r.data; draw(); if (S.deep) { S.deep = false; stDeepOpen(); } }).catch(function (e) {
      wrap(e.status === 401 ? '<section class="hal-hero"><div><h1>📡 IoT 연결</h1><p>Home Assistant · SmartThings · Matter 의 온습도 센서 · 프린터 · 장비 상태를 받아 재고 관리 · 정비 수첩 · 내 프린터에 이어요.</p></div></section><div class="hal-empty">로그인하면 내 기기를 연결할 수 있어요. <a href="/login" data-go>로그인</a></div>' : '<div class="hal-empty">' + esc(e.message) + '</div>');
    });
  }
  /* 1.0.0 예전 주소(/ha-link · /admin/ha-link — HA 연결 때)로 왔으면 주소 줄만 새 주소로 바꿔 보임 (같은 화면 · 다시 불러오지 않음) */
  function newPath() {
    try { var p = location.pathname, q = p.replace(/(^|\/)ha-link(?=\/|$)/, '$1iot-link'); if (q !== p && history.replaceState) history.replaceState(history.state, '', q + location.search + location.hash); } catch (e) {}
  }
  /* 1.1.0 SmartThings 가 돌려보낸 주소 (/iot-link?code=…&state=… 또는 ?error=…&state=…) — 값을 챙기고 주소 줄에서는 바로 지움 (새로 고침 · 뒤로 가기에 다시 쓰이지 않게) */
  function stReturn() {
    try {
      var p = new URLSearchParams(location.search), st = p.get('state') || '', code = p.get('code') || '', err = p.get('error') || '';
      if (!/^[a-f0-9]{40}$/.test(st) || (!code && !err)) return null;
      if (history.replaceState) history.replaceState(history.state, '', location.pathname + location.hash);
      return { code: code, state: st, error: err.replace(/[^\w.-]/g, '').slice(0, 40) };
    } catch (e) { return null; }
  }
  /* 1.2.0 프린터 라운지의 「자동 연결 › SmartThings」에서 넘어옴 (/iot-link?st=pick&printer=7) — 값을 챙기고 주소 줄에서는 지움.
   *   그 프린터는 삼성 로그인을 다녀와도 기억함 (sessionStorage) — 센서 고르기의 「붙일 곳」가 그 프린터로 미리 골라짐 */
  function stDeep() {
    try {
      var p = new URLSearchParams(location.search); if (p.get('st') !== 'pick') return false;
      var id = parseInt(p.get('printer') || '0', 10) || 0;
      if (id > 0) { S.pickPrinter = id; try { sessionStorage.setItem('hal:st:printer', String(id)); } catch (e) {} }
      if (history.replaceState) history.replaceState(history.state, '', location.pathname + location.hash);
      return true;
    } catch (e) { return false; }
  }
  function stDeepOpen() {
    var T = S.d && S.d.smartthings; if (!T) return;
    var oa = (T.installs || []).filter(function (x) { return x.mode === 'oauth'; });
    if (oa.length) { stPick(oa[0].id); return; }
    var card = q('.hal-stc'); if (card && card.scrollIntoView) card.scrollIntoView({ block: 'center' });
    toast(T.oauth ? '먼저 「🔗 SmartThings 연결하기」를 눌러 주세요 — 연결하면 센서 고르기가 바로 열려요.' : '관리자가 아직 SmartThings 연결을 준비하지 않았어요.', !T.oauth);
  }
  function tick() {
    var root = document.querySelector('[data-hal-app],[data-hal-admin]');
    if (!root) { S.root = null; return; }
    newPath();
    if (root.hasAttribute('data-hal-app')) {
      var ret = stReturn(); if (ret) { S.ret = ret; S.key = ''; }
      if (stDeep()) { S.deep = true; S.key = ''; }
      if (!S.pickPrinter) { try { S.pickPrinter = parseInt(sessionStorage.getItem('hal:st:printer') || '0', 10) || 0; } catch (e) {} }
    }
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
  function sig(d) { return JSON.stringify([d.devices.map(function (x) { return [x.id, x.temp, x.humidity, x.state, x.is_on, x.seen, x.stale, x.over, x.snap_at, x.hours_30d, x.name, x.where, x.humidity_max, x.temp_max, x.snap_public, x.sensors, x.target, x.location, x.printer_id, x.equipment_id]; }), d.smartthings, d.boxes, (d.printers || []).map(function (p) { return [p.id, p.state, p.live, p.via]; })]); }
  function live() {
    if (liveBusy || !S.root || !S.d || S.root.hasAttribute('data-hal-admin') || document.hidden || document.querySelector('.hal-modal') || !document.contains(S.root)) return;
    liveBusy = true; liveAt = Date.now();
    api('GET', '/me').then(function (r) { var old = sig(S.d); S.d = r.data; if (sig(r.data) !== old && !document.querySelector('.hal-modal')) { var y = window.scrollY; draw(); window.scrollTo(0, y); } else { qa('.hal-st').forEach(function (el, i) { var d = S.d.devices[i]; if (d && !d.never && !d.stale) el.innerHTML = '<span class="hal-dot on"></span>' + agoText(d.seen); }); } })
      .catch(function () {}).then(function () { liveBusy = false; });
  }
  setInterval(function () { var s = liveSec(); if (s && Date.now() - liveAt >= s * 1000 - 500) live(); }, 5000);   // 5초마다 「때가 됐나」만 봄 — 요청은 정한 간격에 한 번
  document.addEventListener('visibilitychange', function () { if (!document.hidden && Date.now() - liveAt > 4000) live(); });   // 1.7.20 「다시 받는 간격」을 꺼 두어도 돌아오면 한 번
  if (BC) BC.onmessage = function () { if (!document.hidden) { liveBusy = false; live(); } else liveAt = 0; };
})();
