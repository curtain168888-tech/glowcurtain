/* 織光窗簾 空間作品集（網頁翻閱版）
   flip：StPageFlip 單頁翻頁（電腦、平板橫放）／scroll：電腦上下捲動／reflow：手機版直式排版
   頁內連結（目錄、對照表、頁碼…）在三種模式都能跳頁，並寫入瀏覽器歷史：按「返回」或瀏覽器上一頁回到原頁。 */
(function () {
  'use strict';
  var d = document, root = d.documentElement, mode = root.getAttribute('data-mode');
  var canFlip = root.getAttribute('data-canflip') === '1';
  var $ = function (id) { return d.getElementById(id); };
  var META = JSON.parse($('pf-meta').textContent), N = META.length;
  var book = $('book'), where = $('where'), rng = $('rng'), backB = $('back'), cta = $('cta'), cta2 = $('cta2'), viewA = $('view');
  var prevB = $('prev'), nextB = $('next'), sprev = $('sprev'), snext = $('snext');
  var PAGES = Array.prototype.slice.call(book.querySelectorAll('.page'));
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var clamp = function (n) { return Math.max(1, Math.min(N, n | 0)); };
  var hashNo = function () { var m = /^#p(\d+)$/.exec(location.hash || ''); return m ? clamp(+m[1]) : 0; };
  var cur = hashNo() || 1, pf = null;

  /* ---------- GA4 ---------- */
  function ga(name, params) { try { if (window.gtag) window.gtag('event', name, params); } catch (e) { /* 無 GA 時略過 */ } }
  var gaT = null, gaLast = 0;
  function trackPage() {
    clearTimeout(gaT);
    gaT = setTimeout(function () {
      if (gaLast === cur) return; gaLast = cur;
      ga('portfolio_page', { page_no: cur, page_label: META[cur - 1].l, view_mode: mode });
    }, 1200);
  }
  d.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-cta]');
    if (a) ga('portfolio_cta', { cta: a.getAttribute('data-cta'), page_no: cur, page_label: META[cur - 1].l, view_mode: mode });
  }, true);

  /* ---------- 頂部狀態列 ---------- */
  function quoteHref(n) { var s = META[n - 1].s; return s === 'motor' ? '/?motor=1#quote' : s ? '/?style=' + s + '#quote' : '/#quote'; }
  function status() {
    var m = META[cur - 1];
    where.innerHTML = '';
    var b = d.createElement('b'); b.innerHTML = pad2(cur) + '<i>/</i>' + N;
    var s = d.createElement('span'); s.textContent = m.l;
    where.appendChild(b); where.appendChild(s);
    var atStart = cur <= 1, atEnd = cur >= N;
    prevB.disabled = sprev.disabled = atStart; nextB.disabled = snext.disabled = atEnd;
    if (rng) rng.value = cur;
    var q = quoteHref(cur);
    cta.href = q; cta2.href = q;
    cta.textContent = m.s === 'motor' ? '試算電動升級' : m.s ? '試算這一款' : '線上試算';
    if (viewA && canFlip) viewA.href = (mode === 'scroll' ? location.pathname : '?view=scroll') + '#p' + cur;
  }

  /* ---------- 歷史紀錄：跳頁＝新增一筆（可返回），一般翻頁＝只改網址 ---------- */
  var hashT = null;
  function replaceHash(n, now) {
    clearTimeout(hashT);
    var run = function () { if (n === 1 && !location.hash) return; try { history.replaceState(history.state, '', '#p' + n); } catch (e) { /* Safari 呼叫次數上限 */ } };
    if (now) run(); else hashT = setTimeout(run, 350);
  }
  function pushHash(n) {
    var st = history.state || {};
    try {
      history.replaceState(Object.assign({}, st, { y: window.scrollY }), '', '#p' + cur);
      history.pushState({ d: (st.d || 0) + 1, from: cur }, '', '#p' + n);
    } catch (e) { /* 忽略 */ }
    showBack();
  }
  function showBack() {
    var st = history.state, ok = !!(st && st.d > 0 && st.from);
    backB.hidden = !ok;
    if (ok) backB.innerHTML = '<span aria-hidden="true">↩</span>返回 p.' + pad2(st.from);
  }
  backB.addEventListener('click', function () { history.back(); });
  // 上一頁／下一頁（popstate）與手動改網址 #pN（hashchange）都會同時觸發，只處理一次
  var lastPop = 0;
  function fromUrl(useY) {
    var n = hashNo() || 1; showBack();
    if (mode === 'flip') { if (pf && n !== cur) flipTo(n); }
    else scrollToPage(n, useY && history.state && typeof history.state.y === 'number' ? history.state.y : null);
  }
  window.addEventListener('popstate', function () { lastPop = Date.now(); fromUrl(true); });
  window.addEventListener('hashchange', function () { if (Date.now() - lastPop > 100) fromUrl(false); });

  /* ---------- 跳頁 ---------- */
  function go(n, push) {
    n = clamp(n);
    if (n === cur) { if (mode !== 'flip') scrollToPage(n); return; }
    if (push !== false) pushHash(n);
    if (mode === 'flip') flipTo(n); else scrollToPage(n);
  }
  function step(dir) {
    if (mode === 'flip') { if (pf) dir > 0 ? pf.flipNext() : pf.flipPrev(); }
    else { var n = clamp(cur + dir); if (n !== cur) scrollToPage(n); }
  }
  d.addEventListener('click', function (e) {
    var g = e.target.closest && e.target.closest('a.goto');
    if (!g) return;
    var n = +g.getAttribute('data-goto');
    if (!n) return;
    e.preventDefault(); closeToc(); go(n);
  });
  prevB.addEventListener('click', function () { step(-1); });
  nextB.addEventListener('click', function () { step(1); });
  sprev.addEventListener('click', function () { step(-1); });
  snext.addEventListener('click', function () { step(1); });

  /* ---------- 目錄抽屜 ---------- */
  var toc = $('toc'), scrim = $('scrim'), tocBtn = $('toc-open'), lastFocus = null;
  function openToc() {
    lastFocus = d.activeElement;
    toc.hidden = false; scrim.hidden = false; tocBtn.setAttribute('aria-expanded', 'true');
    var c = toc.querySelector('a.cur'); if (c) c.classList.remove('cur');
    var a = toc.querySelector('a[data-goto="' + cur + '"]');
    if (!a) { for (var k = cur; k > 0 && !a; k--) a = toc.querySelector('a[data-goto="' + k + '"]'); }
    if (a) { a.classList.add('cur'); a.scrollIntoView({ block: 'center' }); a.focus({ preventScroll: true }); }
    ga('portfolio_toc', { page_no: cur });
  }
  function closeToc() {
    if (toc.hidden) return;
    toc.hidden = true; scrim.hidden = true; tocBtn.setAttribute('aria-expanded', 'false');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }
  tocBtn.addEventListener('click', openToc);
  $('toc-close').addEventListener('click', closeToc);
  scrim.addEventListener('click', closeToc);

  /* ---------- 鍵盤 ---------- */
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { closeToc(); return; }
    if (!toc.hidden || mode !== 'flip' || !pf) return;
    if (e.target.closest && e.target.closest('input, textarea, select')) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (['ArrowRight', 'PageDown', ' '].indexOf(e.key) >= 0) { e.preventDefault(); pf.flipNext(); }
    else if (['ArrowLeft', 'PageUp'].indexOf(e.key) >= 0) { e.preventDefault(); pf.flipPrev(); }
    else if (e.key === 'Home') { e.preventDefault(); go(1); }
    else if (e.key === 'End') { e.preventDefault(); go(N); }
  });

  /* ---------- 全螢幕（瀏覽器支援才顯示）---------- */
  var fsB = $('fs');
  var canFs = mode === 'flip' && !!(root.requestFullscreen || root.webkitRequestFullscreen) && (d.fullscreenEnabled || d.webkitFullscreenEnabled);
  if (canFs) {
    fsB.hidden = false;
    fsB.addEventListener('click', function () {
      var isFs = d.fullscreenElement || d.webkitFullscreenElement;
      try {
        var r = isFs ? (d.exitFullscreen || d.webkitExitFullscreen).call(d) : (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
        if (r && r.catch) r.catch(function () { fsB.hidden = true; });
      } catch (err) { fsB.hidden = true; }
    });
    var upd = function () { fsB.textContent = (d.fullscreenElement || d.webkitFullscreenElement) ? '離開全螢幕' : '全螢幕'; };
    d.addEventListener('fullscreenchange', upd); d.addEventListener('webkitfullscreenchange', upd);
  }
  if (canFlip && viewA) { viewA.hidden = false; viewA.textContent = mode === 'scroll' ? '翻頁閱讀' : '捲動閱讀'; }

  /* ---------- 圖片預載（前後頁先載入，翻頁時不會空白）---------- */
  function preload(n) {
    [n, n + 1, n - 1, n + 2].forEach(function (k) {
      var el = PAGES[k - 1]; if (!el) return;
      Array.prototype.forEach.call(el.querySelectorAll('img[loading="lazy"]'), function (img) { img.loading = 'eager'; });
    });
  }

  /* ---------- 模式切換：裝置轉向或視窗大小跨過門檻時，保留頁碼重新整理 ---------- */
  function modeFor() {
    var w = window.innerWidth, h = window.innerHeight;
    var f = w >= 900 && Math.min((w - 120) / 1400, (h - 120) / 1000) >= 0.5;
    return w < 900 ? 'reflow' : (f && !/[?&]view=scroll\b/.test(location.search)) ? 'flip' : 'scroll';
  }
  var rzT = null;
  window.addEventListener('resize', function () {
    clearTimeout(rzT);
    rzT = setTimeout(function () {
      if (modeFor() !== mode) { replaceHash(cur, true); location.reload(); return; }
      if (mode === 'flip') layoutFlip();
      else if (mode === 'scroll') zoomScroll();
    }, 160);
  });

  /* ===================== 翻頁模式 ===================== */
  var fit = $('fit'), stage = $('stage');
  function fitSize() {
    var r = stage.getBoundingClientRect();
    var side = r.width >= 1100 ? 72 : 60;
    var w = Math.min(r.width - side * 2, (r.height - 20) * 1.4, 1400);
    w = Math.max(320, Math.floor(w));
    fit.style.width = w + 'px'; fit.style.height = Math.round(w / 1.4) + 'px';
  }
  function setZoom() {
    var pw = pf ? pf.getRender().getRect().pageWidth : fit.clientWidth;
    root.style.setProperty('--z', (pw / 1400).toFixed(5));
  }
  function layoutFlip() { fitSize(); if (pf) { pf.update(); } setZoom(); }
  function flipTo(n, instant) {
    if (!pf) return;
    n = clamp(n);
    if (n === cur) return;
    preload(n);
    if (instant || reduce) { pf.turnToPage(n - 1); onPage(n); }
    else pf.flip(n - 1, 'top');
  }
  function onPage(n) {
    cur = n; status(); replaceHash(n, true); preload(n); trackPage();
  }
  function loadScript(src) {
    return new Promise(function (ok, no) { var s = d.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; d.head.appendChild(s); });
  }
  function initFlip() {
    fitSize();
    loadScript(window.PF_LIB || 'page-flip.browser.js').then(function () {
      pf = new window.St.PageFlip(book, {
        width: 1400, height: 1000, size: 'stretch', minWidth: 1400, maxWidth: 1400, minHeight: 1000, maxHeight: 1000,
        usePortrait: true, showCover: false, startPage: cur - 1, flippingTime: reduce ? 300 : 800, maxShadowOpacity: 0.45,
        drawShadow: true, mobileScrollSupport: true, showPageCorners: !coarse, swipeDistance: 24, clickEventForward: true, useMouseEvents: !coarse,
      });
      pf.loadFromHTML(PAGES);
      // 永遠單頁顯示（橫式頁面不適合左右對頁）；拿掉套件設定的最小尺寸
      book.style.minWidth = '0'; book.style.minHeight = '0';
      pf.on('flip', function (e) { onPage(e.data + 1); });
      pf.on('changeState', function (e) { root.classList.toggle('is-flipping', e.data !== 'read'); });
      layoutFlip();
      root.classList.add('pf-ready');
      onPage(cur);
      if (coarse) touchNav();
      if (rng) {
        rng.addEventListener('input', function () { where.lastChild.textContent = '→ ' + pad2(+rng.value) + '　' + META[+rng.value - 1].l; });
        rng.addEventListener('change', function () { var n = +rng.value; if (n !== cur) { pushHash(n); flipTo(n, true); } });
      }
    }).catch(function () {
      // 套件載入失敗：改用捲動模式
      location.replace('?view=scroll#p' + cur);
    });
  }
  // 觸控裝置（平板）：套件內建的拖曳要拉過整頁才會翻，滑得不夠快還會反向翻頁；改成自己判斷——
  // 左右滑動（不限速度）＝翻頁；輕點頁面左側 30%＝上一頁、其他位置＝下一頁；點到連結就照連結跳頁。
  var coarse = !!(window.matchMedia && matchMedia('(any-pointer: coarse)').matches);
  function touchNav() {
    var s = null;
    book.addEventListener('pointerdown', function (e) {
      if (!e.isPrimary) { s = null; return; }
      s = { x: e.clientX, y: e.clientY, t: Date.now(), link: !!(e.target.closest && e.target.closest('a')) };
    });
    book.addEventListener('pointercancel', function () { s = null; });
    book.addEventListener('pointerup', function (e) {
      if (!s || !e.isPrimary || !pf) { s = null; return; }
      var dx = e.clientX - s.x, dy = e.clientY - s.y, dt = Date.now() - s.t, link = s.link;
      var r = book.getBoundingClientRect(), corner = (e.clientY - r.top) / r.height < 0.5 ? 'top' : 'bottom';
      s = null;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 1200) { dx < 0 ? pf.flipNext(corner) : pf.flipPrev(corner); return; }
      if (link || Math.abs(dx) + Math.abs(dy) > 12 || dt > 700) return;
      (e.clientX - r.left) / r.width < 0.3 ? pf.flipPrev(corner) : pf.flipNext(corner);
    });
  }

  /* ===================== 捲動／手機版 ===================== */
  function scrollToPage(n, y) {
    if (typeof y === 'number') { window.scrollTo(0, y); return; }
    var el = PAGES[n - 1]; if (!el) return;
    var far = Math.abs(n - cur) > 3 || reduce;
    var top = el.getBoundingClientRect().top + window.scrollY - (mode === 'scroll' ? 74 : (parseFloat(getComputedStyle(root).getPropertyValue('--tb-h')) || 52));
    window.scrollTo({ top: Math.max(0, top), behavior: far ? 'auto' : 'smooth' });
  }
  function zoomScroll() {
    var z = Math.min(1, (window.innerWidth - 48) / 1400);
    root.style.setProperty('--z', Math.max(0.3, z).toFixed(5));
  }
  function watchScroll() {
    if (!('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var n = PAGES.indexOf(en.target) + 1;
        if (n > 0 && n !== cur) { cur = n; status(); replaceHash(n); trackPage(); }
      });
    }, { rootMargin: '-35% 0px -60% 0px' });
    PAGES.forEach(function (p) { io.observe(p); });
  }

  /* ---------- 啟動 ---------- */
  showBack(); status();
  if (mode === 'flip') initFlip();
  else {
    if (mode === 'scroll') zoomScroll();
    var start = cur;
    // 捲動位置由程式自己還原（返回時回到點連結前的位置），避免瀏覽器又跳到 #pN 開頭
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    if (start > 1) {
      var go0 = function () { if (cur === start && Math.abs(PAGES[start - 1].getBoundingClientRect().top - 60) > 40) scrollToPage(start); };
      scrollToPage(start);
      window.addEventListener('load', go0, { once: true });
      if (d.fonts && d.fonts.ready) d.fonts.ready.then(go0);
    }
    requestAnimationFrame(function () { requestAnimationFrame(watchScroll); });
    trackPage();
  }
  ga('portfolio_open', { view_mode: mode, start_page: cur });
})();
