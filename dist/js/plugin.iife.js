/*! custom-iot_link 1.14.2 — IoT 연결 화면 불러오기 (이 플러그인 화면 data-hal-app 이 있을 때만 앱 · CSS 를 받음) */
(function () {
  'use strict';
  if (window.__halLoader) return;
  window.__halLoader = true;
  var API = '/api/plugins/custom-iot_link', V = '1.14.2', loading = false;
  function css() {
    if (document.getElementById('hal-css')) return;
    var l = document.createElement('link'); l.id = 'hal-css'; l.rel = 'stylesheet'; l.href = API + '/assets/iot-link.css?v=' + V; document.head.appendChild(l);
  }
  function app() {
    if (!document.querySelector('[data-hal-app],[data-hal-admin]')) return;
    css();
    if (window.__halApp) { window.__halApp.tick(); return; }
    if (loading) return; loading = true;
    var s = document.createElement('script'); s.src = API + '/assets/iot-link-app.js?v=' + V; s.async = true; s.onerror = function () { loading = false; }; document.head.appendChild(s);
  }
  app();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', app);
  addEventListener('popstate', function () { setTimeout(app, 40); });
  // 0.1.0 화면이 바뀔 때마다 바로 확인하던 것 → 몰아서 한 번
  var wait = 0;
  try { new MutationObserver(function () { if (wait) return; wait = setTimeout(function () { wait = 0; if (document.querySelector('[data-hal-app],[data-hal-admin]')) app(); }, 120); }).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
  // 0.1.0 헤더 메인 메뉴 「IoT 연결」 (#hal-nav · #hal-nav-mobile — 홈 디자인이 숨기기 · 순서 · 이모지 · 이름을 맡음)
  //  설정은 화면 HTML 에 같이 실려 옴: G7Config.appConfig.cextNav["custom-iot_link"].cfg {enabled, menu_enabled, menu_label, path}
  var NAV_ID = 'hal-nav', NAV_MOB = 'hal-nav-mobile', NAV_PATH = '/iot-link', NAV_LABEL = 'IoT 연결';
  var NAV_BASE = 'px-3 py-2 text-sm font-medium whitespace-nowrap cursor-pointer rounded-lg transition-colors';
  var NAV_ON = NAV_BASE + ' bg-gray-900 text-white dark:bg-white dark:text-gray-900';
  var NAV_OFF = NAV_BASE + ' text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800';
  var DRAWER_BTN = 'w-full flex items-center justify-start gap-3 px-3 py-2.5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer';
  function navCfg() { try { var n = window.G7Config && window.G7Config.appConfig && window.G7Config.appConfig.cextNav; return (n && n['custom-iot_link'] && n['custom-iot_link'].cfg) || {}; } catch (e) { return {}; } }
  function navGo(p) {
    try { if (window.G7Core && typeof G7Core.dispatch === 'function') { G7Core.dispatch({ handler: 'navigate', params: { path: p } }); return; } } catch (e) {}
    location.href = p;
  }
  function nav() {
    var c = navCfg(), on = c.enabled !== false && c.menu_enabled !== false, label = c.menu_label || NAV_LABEL, p = c.path || NAV_PATH;
    var here = location.pathname === p || location.pathname.indexOf(p + '/') === 0;
    var btn = document.getElementById(NAV_ID), mob = document.getElementById(NAV_MOB);
    if (!on) { if (btn) btn.remove(); if (mob) mob.remove(); return; }
    var home = document.querySelector('[data-testid="nav-home"]'), row = home && home.parentNode;
    if (row) {
      if (!btn) { btn = document.createElement('button'); btn.id = NAV_ID; btn.type = 'button'; btn.setAttribute('data-testid', 'nav-iot_link'); btn.addEventListener('click', function (e) { e.preventDefault(); navGo(p); }); }
      if (btn.textContent !== label) btn.textContent = label;
      var cls = here ? NAV_ON : NAV_OFF; if (btn.className !== cls) btn.className = cls;
      if (btn.parentNode !== row) row.appendChild(btn);
    }
    var drawer = document.querySelector('div[class*="inset-y-0"][class*="right-0"][class*="w-80"]');
    if (!drawer || (mob && drawer.contains(mob))) { if (mob) { var l0 = mob.querySelector('[data-hal-label]'); if (l0 && l0.textContent !== label) l0.textContent = label; } return; }
    var btns = Array.prototype.filter.call(drawer.querySelectorAll('button[class*="px-3 py-2.5"][class*="w-full"]'), function (b) { return !(b.closest && b.closest('[id$="-nav-mobile"]')); });
    if (!btns.length) return;
    var section = btns[btns.length - 1].parentNode;
    if (!section || !section.parentNode) return;
    if (!mob) {
      mob = document.createElement('div'); mob.id = NAV_MOB; mob.className = 'px-4 py-4 border-b border-gray-200 dark:border-gray-700';
      var b = document.createElement('button'); b.type = 'button'; b.className = DRAWER_BTN; b.setAttribute('data-testid', 'mobile-nav-iot_link');
      var s = document.createElement('span'); s.setAttribute('data-hal-label', '1'); s.textContent = label; b.appendChild(s); mob.appendChild(b);
      b.addEventListener('click', function () { try { G7Core.state.set({ mobileMenuOpen: false }); } catch (e) {} navGo(p); });
    }
    section.parentNode.insertBefore(mob, section.nextSibling);
  }

  var navT = 0;
  function navSoon() { if (navT) return; navT = setTimeout(function () { navT = 0; try { nav(); } catch (e) {} }, 60); }
  navSoon();
  addEventListener('popstate', navSoon);
  try { new MutationObserver(navSoon).observe(document.documentElement, { childList: true, subtree: true }); } catch (e) {}
})();
