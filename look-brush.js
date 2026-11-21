/* Brush & Scroll: the moving extras that need a script. look-brush.css draws the look; this file adds only the parts
   that follow the reader (scroll, pointer, press, selection, keyboard focus). site.js fetches it only while the page
   wears data-look="brush" and the visitor has not asked for reduced motion. It switches itself on only while <html>
   carries both data-look="brush" and .motion, and takes away everything it added (listeners, elements, classes,
   properties) the moment either goes: the look picker, "Pause motion", or a reduced-motion change.
   Every visual it adds is ink, vermilion or the look's existing tokens; nothing it adds takes a tap or a click.
   Ink and paper pass (Nov 19): a second, smaller part (.b-ink) runs whenever the look is worn, motion on or paused:
   collector's seals (kept in localStorage under rw-brush-seals:<path>, nothing else, no network) and, on touch
   screens, the capture centred in the window shown in colour. It is taken away the moment the look changes.

   Rules it keeps (the "guardrails"):
   - one moving accent on screen at a time: ambient ones (falling petals, the settle coat) wait while one the reader
     caused (a print, a drop, a ring) is showing, and are cleared by it;
   - scroll-driven movement stops when the scroll stops; the outlines' boil (CSS) is the only constant;
   - passive listeners, one requestAnimationFrame per frame at most, nothing while the tab is hidden. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__brushMotion || !d.addEventListener || !W.requestAnimationFrame) return;
  W.__brushMotion = 1;
  var NS = 'http://www.w3.org/2000/svg';
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  var mqDark = matchMedia('(prefers-color-scheme: dark)');
  var SDA = !!(W.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var live = false, offs = [], made = [], styled = [], timers = [];

  function wanted() { return r.getAttribute('data-look') === 'brush' && r.classList.contains('motion') && !mqReduce.matches; }
  function on(t, type, fn, opt) { t.addEventListener(type, fn, opt); offs.push(function () { t.removeEventListener(type, fn, opt); }); }
  function mk(tag, cls, parent, before) {
    var e = d.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true');
    if (parent) parent.insertBefore(e, before || null);
    made.push(e); return e;
  }
  function prop(el, k, v) { el.style.setProperty(k, v); if (styled.indexOf(el) < 0) styled.push(el); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function now() { return performance.now(); }
  function drop(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }

  /* ---------- 15. one moving accent at a time ---------- */
  var acc = { name: '', until: 0 };
  function ambientFree() { return now() > acc.until; }
  function claim(name, ms) { acc.name = name; acc.until = now() + ms; clearPetals(); }

  /* ---------- the scroll frame: one rAF per frame while scrolling, nothing at rest ---------- */
  var raf = 0, sy = 0, psy = 0, pt = 0, speed = 0, idleT = 0, relT = 0, scrolling = false, sDirty = false;
  function onScroll() { sDirty = true; kick(); } // the scroll frame now runs inside the one fluid loop (below)
  function frame(t) {
    raf = 0;
    sy = W.scrollY || 0;
    var dt = Math.max(8, t - (pt || t - 16)), v = Math.abs(sy - psy) / dt;
    speed = speed * .5 + v * .5;
    var dir = sy > psy ? 1 : sy < psy ? -1 : 0;
    psy = sy; pt = t;
    if (!scrolling && dir) { scrolling = true; startMove(); }
    thread(false);
    if (!SDA) scrub();
    hero();
    if (dir) boundary(dir);
    wetScroll(dir);
    clearTimeout(idleT); idleT = setTimeout(rest, 150); // (not later(): one timer a frame would pile up in its list)
  }
  function rest() { scrolling = false; speed = 0; pt = 0; r.classList.remove('b-scr'); thread(true); settle(); }
  function startMove() { if (T) T.pool.classList.remove('b-on'); r.classList.add('b-scr'); } // b-scr: the sheets' sway holds while the page moves (the flex takes over)

  /* ---------- 1. the margin thread as a brush stroke ----------
     site.js draws the thread (.th-line) to the reading line; here the drawn part is redrawn as a filled stroke whose
     width was set at the moment the brush passed: slow = loaded and wide, fast = thin, with dry split bristles beside
     it. Its width eases back, and when the scroll stops the ink pools into a small blot at the head. */
  var STEP = 6, T = null;
  function threadSetup() {
    var th = d.querySelector('main > .thread'); if (!th) return;
    var svg = th.querySelector('svg'), line = th.querySelector('.th-line'), head = th.querySelector('.th-head');
    if (!svg || !line || !head) return;
    var body = d.createElementNS(NS, 'path'), dry = d.createElementNS(NS, 'path');
    body.setAttribute('class', 'b-th-body'); dry.setAttribute('class', 'b-th-dry');
    svg.appendChild(body); svg.appendChild(dry); made.push(body, dry);
    T = { th: th, line: line, body: body, dry: dry, pool: mk('i', 'b-th-pool', th, head), d: null, P: [], N: [], Wd: null, Dr: null, k: -1, cur: 1, built: -2 };
    var mo = new MutationObserver(function () { resample(); thread(!scrolling); }); mo.observe(line, { attributes: true, attributeFilter: ['d'] });
    offs.push(function () { mo.disconnect(); });
    resample(); thread(true);
  }
  function resample() {
    var ds = T.line.getAttribute('d') || '';
    if (ds === T.d) return;
    T.d = ds; T.P = []; T.N = []; T.k = -1; T.built = -2;
    var L = 0; try { L = ds ? T.line.getTotalLength() : 0; } catch (e) {}
    if (!(L > 0)) { T.Wd = new Float32Array(0); T.Dr = new Uint8Array(0); return; } // an empty line (not drawn yet): nothing to sample
    var n = Math.floor(L / STEP), i, p;
    for (i = 0; i <= n; i++) { p = T.line.getPointAtLength(i * STEP); T.P.push(p.x, p.y); }
    for (i = 0; i <= n; i++) {
      var a = Math.max(0, i - 1), b = Math.min(n, i + 1), dx = T.P[2 * b] - T.P[2 * a], dy = T.P[2 * b + 1] - T.P[2 * a + 1], l = Math.hypot(dx, dy) || 1;
      T.N.push(-dy / l, dx / l);
    }
    T.Wd = new Float32Array(n + 1).fill(1); T.Dr = new Uint8Array(n + 1);
  }
  function thread(stopped) {
    if (!T || !T.P.length) return;
    var drawn = parseFloat(T.line.style.strokeDasharray) || 0, n = T.Wd.length - 1, k = Math.min(n, Math.floor(drawn / STEP));
    // fast = thin and dry, slow = loaded; the width eases toward its target so a change of pace reads as a pressure change
    var target = stopped ? 1 : speed < .25 ? 1.25 : speed > 2.6 ? .34 : 1.25 - (speed - .25) / 2.35 * .91;
    T.cur += (target - T.cur) * (stopped ? 1 : .35);
    if (k > T.k) for (var i = T.k + 1; i <= k; i++) { T.Wd[i] = T.cur; T.Dr[i] = !stopped && speed > 1.5 ? 1 : 0; }
    T.k = k;
    if (k !== T.built) build(k);
    if (stopped && k > 2) { // the brush rests: the ink pools at the head
      T.pool.style.left = (T.P[2 * k] - 9).toFixed(1) + 'px'; T.pool.style.top = (T.P[2 * k + 1] - 9).toFixed(1) + 'px';
      T.pool.classList.add('b-on');
    }
  }
  function build(k) {
    T.built = k;
    if (k < 1) { T.body.setAttribute('d', ''); T.dry.setAttribute('d', ''); return; }
    var base = parseFloat(getComputedStyle(T.line).strokeWidth) || 3.4, P = T.P, N = T.N, L = [], R = [], dry = '', i, w, x, y, nx, ny, run = null;
    for (i = 0; i <= k; i++) {
      w = base * T.Wd[i] / 2 * (i < 6 ? .3 + .7 * i / 6 : 1) * (i > k - 3 ? .75 + .25 * (k - i) / 3 : 1);
      x = P[2 * i]; y = P[2 * i + 1]; nx = N[2 * i]; ny = N[2 * i + 1];
      L.push((x + nx * w).toFixed(1) + ' ' + (y + ny * w).toFixed(1));
      R.push((x - nx * w).toFixed(1) + ' ' + (y - ny * w).toFixed(1));
      if (T.Dr[i]) { // two split bristles either side of the thin core
        if (!run) run = [[], []];
        run[0].push((x + nx * (w + 1.6)).toFixed(1) + ' ' + (y + ny * (w + 1.6)).toFixed(1));
        run[1].push((x - nx * (w + 1.3)).toFixed(1) + ' ' + (y - ny * (w + 1.3)).toFixed(1));
      } else if (run) { if (run[0].length > 1) dry += 'M' + run[0].join('L') + 'M' + run[1].join('L'); run = null; }
    }
    if (run && run[0].length > 1) dry += 'M' + run[0].join('L') + 'M' + run[1].join('L');
    T.body.setAttribute('d', 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z');
    T.dry.setAttribute('d', dry);
  }

  /* ---------- 2 and 14 without scroll timelines: the same scrub, read from scroll position once a frame ---------- */
  var scrubs = [];
  function scrubSetup() {
    if (SDA) return;
    r.classList.add('b-sjs');
    scrubs = [].map.call(d.querySelectorAll('.section, .prose > h2, .bars .row, .minis tr'), function (el) {
      return { el: el, bar: !el.matches('.section, h2') };
    });
    scrub();
  }
  function scrub() {
    var vh = innerHeight;
    for (var i = 0; i < scrubs.length; i++) {
      var s = scrubs[i], top = s.el.getBoundingClientRect().top + (s.el.matches('.section') ? 10 : 0);
      // a stroke paints between entering at the foot of the window and reaching its middle; a bar until 55% up
      var p = clamp((vh - top) / (vh * (s.bar ? .45 : .5)), 0, 1);
      if (s.p !== p) { s.p = p; prop(s.el, '--b-p', p.toFixed(3)); }
    }
  }

  /* ---------- 3. the opening painting: parallax as it scrolls away ----------
     The sun is lifted out of the scene (the scene's own disc is removed from its picture) and drawn behind the far
     range, so it can sink behind the mountains; the mist is its own band and drifts lower than the hills. */
  var H = null;
  function heroSetup() {
    var one = d.querySelector('.hero-one'), mail = one && one.querySelector('.hero-mail');
    if (!one || !mail) return;
    H = { one: one, mail: mail, sun: mk('i', 'b-sun', one), mist: mk('i', 'b-mist', mail), last: -1 };
    sceneNoSun(); hero();
  }
  function sceneNoSun() {
    if (!H) return;
    var s = getComputedStyle(H.one).getPropertyValue('--b-scene').trim();
    var t = s.replace(/%3Ccircle cx='1060' cy='150' r='78' fill='%23[0-9a-fA-F]{6}'\s*\/%3E/, '');
    if (t !== s && t) { prop(H.one, '--b-scene-x', t); r.classList.add('b-sun-out'); } else r.classList.remove('b-sun-out');
  }
  function hero() {
    if (!H) return;
    if (H.last < 0) { // measured once, and again on resize: the bottom of the painting on the page, and its height
      H.b = H.mail.getBoundingClientRect().bottom + (W.scrollY || 0);
      H.sh = parseFloat(getComputedStyle(H.mail, '::before').height) || 260;
    }
    var p = clamp((W.scrollY || 0) / Math.max(1, H.b), 0, 1), sh = H.sh;
    if (Math.abs(p - H.last) < .002) return;
    H.last = p;
    prop(H.one, '--b-sun-y', (p * .22 * sh).toFixed(1) + 'px');   // the sun sinks behind the far range
    prop(H.one, '--b-mist-y', (p * .12 * sh).toFixed(1) + 'px');  // the mist drifts down slower than the page moves
    prop(H.one, '--b-hill-y', (p * .035 * sh).toFixed(1) + 'px'); // the hills barely: they are nearest
  }

  /* ---------- 4. a petal or two falls past the margin when a section boundary is crossed ---------- */
  var bounds = [], cur = -1, petals = [], lastPetal = 0;
  function boundsSetup() { bounds = [].slice.call(d.querySelectorAll('main > section, main .more-g, main .band, main .prose > h2, main .figure')); cur = index(); }
  function index() {
    var line = innerHeight * .45, k = -1;
    for (var i = 0; i < bounds.length; i++) if (bounds[i].getBoundingClientRect().top < line) k = i;
    return k;
  }
  function boundary(dir) {
    var k = index(); if (k === cur) return;
    cur = k;
    if (!ambientFree() || petals.length >= 2 || now() - lastPetal < 500 || (FL.playing.length && filmOnScreen())) return;
    lastPetal = now();
    var col = d.querySelector('main .wrap, main .prose') || d.querySelector('main'), left = col ? col.getBoundingClientRect().left : 20;
    var x = clamp(left - 26 + Math.random() * 10, 2, Math.max(2, left - 12)), vh = innerHeight;
    var p = mk('i', 'b-petal', d.body), y0 = dir > 0 ? -24 : vh + 24, y1 = dir > 0 ? vh + 24 : -24, sw = 14 + Math.random() * 12;
    p.style.left = x.toFixed(0) + 'px';
    petals.push(p);
    var a = p.animate([
      { transform: 'translate(0,' + y0 + 'px) rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + sw + 'px,' + (y0 + (y1 - y0) * .3) + 'px) rotate(140deg)', opacity: .9, offset: .25 },
      { transform: 'translate(' + (-sw * .4) + 'px,' + (y0 + (y1 - y0) * .65) + 'px) rotate(260deg)', opacity: .9, offset: .65 },
      { transform: 'translate(' + (sw * .6) + 'px,' + y1 + 'px) rotate(400deg)', opacity: 0 }
    ], { duration: 2600 + Math.random() * 600, easing: 'linear', fill: 'both' });
    a.onfinish = function () { killPetal(p); };
  }
  function killPetal(p) { var i = petals.indexOf(p); if (i >= 0) petals.splice(i, 1); drop(p); }
  function clearPetals() { petals.slice().forEach(killPetal); }

  /* ---------- 5. scroll stops: the nearest heading's stroke gets a second, darker coat ---------- */
  var coated = null;
  function settle() {
    if (!ambientFree()) return;
    var hs = d.querySelectorAll('main .section-head h2, main .prose > h2'), line = innerHeight * .45, best = null, bd = 1e9;
    for (var i = 0; i < hs.length; i++) {
      var q = hs[i].getBoundingClientRect();
      if (q.bottom < 0 || q.top > innerHeight) continue;
      var dd = Math.abs((q.top + q.bottom) / 2 - line); if (dd < bd) { bd = dd; best = hs[i]; }
    }
    if (best === coated) return;
    if (coated) coated.classList.remove('b-coat');
    coated = best;
    if (best) { best.classList.add('b-coat'); wet(best, best.matches('.prose > h2') ? '::after' : '::before', 120); }
  }

  /* ---------- 6, 7, 9, 12, 14: presses and taps ---------- */
  var down = null;
  var FIG = '.fact b, .bigfig b, .card .stat b';
  function soakOff() { var s = d.querySelectorAll('.b-soak'); for (var i = 0; i < s.length; i++) s[i].classList.remove('b-soak'); }
  function onDown(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    down = { x: e.clientX, y: e.clientY, t: now(), type: e.pointerType };
    if (e.pointerType !== 'mouse') { // 6: on touch the sheet soaks while the finger is down
      var c = t.closest('.card, .pager a'); if (c) c.classList.add('b-soak');
    }
    var seal = t.closest('.btn.primary, .demo-poster .play'); if (seal) print(seal);   // 7
    fluidDown(e);
  }
  function onUp(e) {
    soakOff();
    var dn = down; down = null;
    fluidUp(e, dn);
    if (!dn || e.pointerType === 'mouse' || Math.hypot(e.clientX - dn.x, e.clientY - dn.y) > 10 || now() - dn.t > 600) return;
    var t = e.target && e.target.closest ? e.target : null;
    var fig = t && t.closest(FIG), row = t && t.closest('.bars .row');
    if (fig) ring(fig, 1800);                      // 12
    if (row) { row.classList.add('b-tap'); later(function () { row.classList.remove('b-tap'); }, 1800); } // 14
    inkDrop(e.clientX, e.clientY);                 // 9
  }
  function onKeyClick(e) {
    if (e.detail !== 0 || !e.target.closest) return;
    var s = e.target.closest('.btn.primary, .demo-poster .play'); if (s) print(s);
    // Enter or Space on a focused link or button throws the same ink a click does (keyboard only: a script's .click() has no focus frame)
    var a = e.target.closest('a[href], button, summary'); if (!a || !live || !r.classList.contains('b-kbd') || d.activeElement !== a) return;
    var q = a.getBoundingClientRect(); if (q.bottom < 0 || q.top > innerHeight) return;
    flick(q.left + Math.min(q.width - 6, 18), q.top + q.height / 2, -.6, false); push(a, 0, 3.2);
  }
  // 7: the seal leaves a faint red print where it was pressed, which fades in about a second
  function print(el) {
    claim('print', 1100);
    var q = el.getBoundingClientRect(), p = mk('i', 'b-print', d.body);
    p.style.cssText = 'left:' + (q.left + (W.scrollX || 0) + 2).toFixed(1) + 'px;top:' + (q.top + (W.scrollY || 0) + 3).toFixed(1) + 'px;width:' + q.width.toFixed(1) + 'px;height:' + q.height.toFixed(1) + 'px';
    later(function () { drop(p); }, 1300);
  }
  // 9: an ink drop where a finger taps, spreading into the paper
  var lastDrop = null;
  function inkDrop(x, y) {
    claim('drop', 700);
    drop(lastDrop);
    var p = lastDrop = mk('i', 'b-drop', d.body);
    p.style.left = x.toFixed(0) + 'px'; p.style.top = y.toFixed(0) + 'px';
    later(function () { drop(p); if (lastDrop === p) lastDrop = null; }, 800);
  }
  // 12: a brushed circle drawn round a big figure
  function ring(el, ms) {
    // ring the leading number (the "2.7" of "2.7 times faster"), not a whole phrase: a ring round a long phrase is a smear
    var rg = d.createRange(), w = d.createTreeWalker(el, 4), n, m;
    rg.selectNodeContents(el);
    while ((n = w.nextNode())) { m = /[$\u00a3]?\d[\d.,:\u2009]*\s?(%|k|x|\u00d7)?/.exec(n.nodeValue); if (m) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].replace(/\s+$/, '').length); break; } }
    var q = rg.getBoundingClientRect(), e = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize) || 24;
    // a square ring 1.3 lines tall (1.9 ran into the line below on phones) round the figure's middle, stretched sideways to clear its ends (at most 1.6 em each side)
    var S = Math.max(q.height, fs) * 1.3, Wd = Math.min(Math.max(S, q.width * 1.35 + fs * .4), q.width + fs * 3.2, S * 2.3);
    prop(el, '--b-es', S.toFixed(1) + 'px');
    prop(el, '--b-sx', (Wd / S).toFixed(3));
    prop(el, '--b-cx', (q.left - e.left + q.width / 2).toFixed(1) + 'px');
    prop(el, "--b-cy", (q.top - e.top + q.height * .44).toFixed(1) + "px");
    claim('ring', 600);
    el.classList.add('b-enso');
    if (ms) later(function () { el.classList.remove('b-enso'); }, ms);
  }

  /* ---------- 8 (link stroke from the side the pointer came in), 12 on hover, 10 the brush-tip cursor ---------- */
  var LINKS = ':is(.hero-sub, footer.site, .prose, .lede, .hero-mail) a';
  function onOver(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return;
    var a = t.closest(LINKS);
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) {
      var rs = a.getClientRects(), q = rs[0];
      for (var i = 0; i < rs.length; i++) if (e.clientY >= rs[i].top && e.clientY <= rs[i].bottom) { q = rs[i]; break; }
      if (q) a.setAttribute('data-b-from', e.clientX > q.left + q.width / 2 ? 'r' : 'l');
    }
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) ring(f, 0);
  }
  function onOut(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return; // a finger "leaves" on lift
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) f.classList.remove('b-enso');
  }

  var TIP = null;
  function tipSetup() {
    if (!mqFine.matches) return;
    TIP = { el: mk('i', 'b-tip', d.body), x: -99, y: -99, vx: 0, vy: 0, t: 0, len: 0, ang: 0, raf: 0, shown: false };
    r.classList.add('b-tip-on');
  }
  function tipMove(e) {
    if (!TIP || e.pointerType !== 'mouse') return;
    var t = now(), dt = Math.max(4, t - (TIP.t || t - 16)), x = e.clientX, y = e.clientY;
    if (TIP.shown) { TIP.vx = TIP.vx * .4 + (x - TIP.x) / dt * .6; TIP.vy = TIP.vy * .4 + (y - TIP.y) / dt * .6; }
    TIP.x = x; TIP.y = y; TIP.t = t;
    TIP.el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; // set here, not a frame later: the dot sits on the hit point
    var tg = e.target && e.target.closest ? e.target : null;
    var text = tg && tg.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    var link = !text && tg && tg.closest('a[href], button, summary, label, [role="button"], .look-pick-btn');
    TIP.el.classList.toggle('b-link', !!link);
    TIP.el.classList.toggle('b-off', !!text);
    if (!TIP.shown) { TIP.shown = true; TIP.el.classList.add('b-on'); }
    if (!TIP.raf) TIP.raf = requestAnimationFrame(tipTail);
  }
  function tipTail() { // the dot stretches into a short tapered stroke behind it when moving fast, and draws back in
    TIP.raf = 0;
    var sp = Math.hypot(TIP.vx, TIP.vy), want = clamp((sp - .5) * 14, 0, 34);
    TIP.len = want > TIP.len ? TIP.len + (want - TIP.len) * .6 : TIP.len * .72;
    if (sp > .2) TIP.ang = Math.atan2(-TIP.vy, -TIP.vx) * 180 / Math.PI;
    TIP.vx *= .7; TIP.vy *= .7;
    TIP.el.style.setProperty('--tl', TIP.len.toFixed(1) + 'px');
    TIP.el.style.setProperty('--ta', TIP.ang.toFixed(0) + 'deg');
    if (TIP.len > .4 || sp > .05) TIP.raf = requestAnimationFrame(tipTail);
    else TIP.el.style.setProperty('--tl', '0px');
  }
  function tipLeave(e) { if (TIP && !e.relatedTarget) { TIP.shown = false; TIP.el.classList.remove('b-on'); } }

  /* ---------- 11. a selection in body text is painted as a rough ochre stroke behind the words ---------- */
  var SELHOST = '.prose, .lede, .hero-sub, .hero h1, .card .body, .fact, .band';
  var SEL = null, selRaf = 0;
  function onSel() { if (!selRaf) selRaf = requestAnimationFrame(paintSel); }
  function clearSel() { if (SEL) { drop(SEL.box); SEL.host.classList.remove('b-selhost'); SEL = null; } }
  function paintSel() {
    selRaf = 0;
    var s = W.getSelection && getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) { clearSel(); return; }
    var rg = s.getRangeAt(0), anc = rg.commonAncestorContainer, el = anc.nodeType === 1 ? anc : anc.parentNode;
    var host = el && el.closest && el.closest(SELHOST);
    if (!host) { // a range that spans blocks: paint within the host of its start, if both ends share one
      var a = rg.startContainer, b = rg.endContainer;
      a = (a.nodeType === 1 ? a : a.parentNode).closest(SELHOST); b = (b.nodeType === 1 ? b : b.parentNode).closest(SELHOST);
      host = a && a === b ? a : null;
    }
    if (!host) { clearSel(); return; }
    if (!SEL || SEL.host !== host) { clearSel(); SEL = { host: host, box: mk('span', 'b-sel', host) }; host.classList.add('b-selhost'); }
    var hr = SEL.box.getBoundingClientRect(), rs = rg.getClientRects(), lines = [], i, q, l; // the overlay's own origin (its containing block)
    for (i = 0; i < rs.length; i++) { // merge the range's boxes into one per line
      q = rs[i]; if (q.width < 1 || q.height < 1) continue;
      l = lines[lines.length - 1];
      if (l && Math.abs(l.t - q.top) < q.height * .5) { l.l = Math.min(l.l, q.left); l.r = Math.max(l.r, q.right); l.b = Math.max(l.b, q.bottom); }
      else lines.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
    var html = '';
    for (i = 0; i < lines.length && i < 80; i++) {
      l = lines[i];
      html += '<i style="left:' + (l.l - hr.left - 4).toFixed(1) + 'px;top:' + (l.t - hr.top + 1).toFixed(1) + 'px;width:' + (l.r - l.l + 8).toFixed(1) + 'px;height:' + Math.max(4, l.b - l.t - 2).toFixed(1) + 'px"></i>';
    }
    SEL.box.innerHTML = html;
  }

  /* ---------- 13. keyboard focus: a brushed ring instead of the square outline ---------- */
  var FOC = null, focRaf = 0, focEl = null;
  function onFocusIn(e) {
    var el = e.target; if (!el || el === d || !el.matches) return;
    var vis = false; try { vis = el.matches(':focus-visible'); } catch (er) {}
    if (!vis) { focusOff(); return; }
    focEl = el;
    if (!FOC) FOC = mk('i', 'b-focus', d.body);
    r.classList.add('b-kbd');
    placeFocus();
  }
  function focusOff() { focEl = null; r.classList.remove('b-kbd'); if (FOC) FOC.classList.remove('b-on'); }
  function placeFocus() {
    focRaf = 0;
    if (!focEl || !FOC) return;
    if (!d.contains(focEl) || d.activeElement !== focEl) { focusOff(); return; }
    var q = focEl.getBoundingClientRect(), ar = q.width / Math.max(1, q.height), round = ar > .6 && ar < 1.7 && q.width < 120; // small and squarish: a ring; anything else: a brushed frame
    var pad = round ? Math.max(9, q.width * .2) : 7;
    FOC.className = 'b-focus b-on' + (round ? ' b-round' : '');
    FOC.style.cssText = 'left:' + (q.left - pad).toFixed(1) + 'px;top:' + (q.top - pad).toFixed(1) + 'px;width:' + (q.width + 2 * pad).toFixed(1) + 'px;height:' + (q.height + 2 * pad).toFixed(1) + 'px';
  }
  function focusFollow() { if (focEl && !focRaf) focRaf = requestAnimationFrame(placeFocus); }

  /* ---------- ink and paper (Nov 19) ----------
     1 wet, then dry: anything newly painted (an outline or colour block coming in, a section stroke or heading stroke
       being painted by the scroll, the settle coat) starts darker with a sheen sliding over it and dries to matte in
       about a second (Web Animations on the pseudo-element; filter and a background sheen only). Motion only.
     6 mica: two thin columns in the margins whose glints cross-fade with the scroll (a scroll timeline on opacity;
       light paper only). Motion only.
     7 collector's seals and 9 captures centred on touch screens are not motion: they run while the look is worn
       (.b-ink), with motion on or paused. */
  var wets = [], wio = null, wetScrub = [];
  function wetFilter() { return getComputedStyle(r).getPropertyValue('--b-wet').trim() || 'brightness(.75)'; }
  function wet(el, ps, delay, noSheen) {
    if (!el || !el.animate) return null;
    var f = wetFilter(), sh = noSheen ? null : getComputedStyle(r).getPropertyValue('--b-sheen').trim(), a;
    var k0 = { filter: f, offset: 0 }, k1 = { filter: f, offset: .25 }, k2 = { filter: 'none', offset: 1 };
    if (sh) { k0.backgroundImage = k1.backgroundImage = k2.backgroundImage = sh; k0.backgroundSize = k1.backgroundSize = k2.backgroundSize = '260% 100%';
      k0.backgroundPosition = '100% 0'; k1.backgroundPosition = '80% 0'; k2.backgroundPosition = '0% 0'; k0.backgroundRepeat = k1.backgroundRepeat = k2.backgroundRepeat = 'no-repeat'; }
    try { a = el.animate([k0, k1, k2], { duration: 1150, delay: delay || 0, easing: 'ease-out', pseudoElement: ps }); } catch (e) { return null; }
    wets.push(a); a.onfinish = a.oncancel = function () { var i = wets.indexOf(a); if (i >= 0) wets.splice(i, 1); };
    return a;
  }
  var OUTL = '.card, .band, .method > li, .film .shot, .fact, .chart-card, .repo-card, .band3 > div, .pager a, .term, .paper, .shot';
  function wetSetup() {
    if (!W.IntersectionObserver) return;
    wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target; wio.unobserve(el);
        if (el.matches('.section-head h2, .case-head h1')) { wet(el, '::after', 150); return; }
        if (el.matches('.section, .prose > h2')) return; // painted by the scroll: wetted in wetScroll()
        var dv = getComputedStyle(el).getPropertyValue('--d').trim(), dd = (parseFloat(dv) || 0) / (/ms$/.test(dv) ? 1000 : 1); // --d is written in s or ms
        wet(el, '::after', dd * 1000);
        if (!el.matches('.shot, .film .shot, .flow li')) wet(el, '::before', dd * 1000 + 420);
      });
    }, { threshold: .12 });
    [].forEach.call(d.querySelectorAll(OUTL + ', .section-head h2, .case-head h1'), function (el) { wio.observe(el); });
    offs.push(function () { if (wio) wio.disconnect(); wio = null; });
    wetScrub = [].slice.call(d.querySelectorAll('main .section, main .prose > h2'));
  }
  // a stroke being painted by the scroll stays wet while it is painted and dries a second after
  function wetScroll(dir) {
    if (dir <= 0) return;
    var vh = innerHeight, t = now();
    for (var i = 0; i < wetScrub.length; i++) {
      var el = wetScrub[i], top = el.getBoundingClientRect().top;
      if (top > vh || top < vh * .45) continue;
      if (el.__bw && t - el.__bwt < 220) continue;
      if (el.__bw && el.__bw.playState === 'running') el.__bw.currentTime = 0;
      else el.__bw = wet(el, el.matches('.section') ? '::before' : '::after', 0);
      el.__bwt = t;
    }
  }
  // 6: mica glints in the margins, light paper only
  var MICA = null;
  function micaSetup() {
    micaOff();
    if (!SDA || getComputedStyle(r).getPropertyValue('--b-mica-a').indexOf('url') < 0) return;
    MICA = [mk('i', 'b-mica b-l', d.body), mk('i', 'b-mica b-r', d.body)];
    micaSize();
  }
  function micaSize() {
    if (!MICA) return;
    var cw = r.clientWidth, w = Math.max(12, Math.round((cw - 1032) / 2 - 12)), h = Math.max(d.body.scrollHeight, r.scrollHeight);
    MICA[0].style.cssText = 'left:0;width:' + w + 'px;height:' + h + 'px';
    MICA[1].style.cssText = 'left:' + (cw - w) + 'px;width:' + w + 'px;height:' + h + 'px';
  }
  function micaOff() { if (MICA) { MICA.forEach(function (m) { drop(m); var i = made.indexOf(m); if (i >= 0) made.splice(i, 1); }); MICA = null; } }

  /* ---------- 7. collector's seals: a section read to its end gets a seal in its margin ----------
     A section runs from its heading to the next heading (the last to the footer). It counts as read once its heading
     has been on screen and the reader has scrolled until its end is above the middle of the window. Earned seals are
     kept in localStorage under rw-brush-seals:<page path> as a list of section numbers, nothing else; no network. */
  var SK = 'rw-brush-seals:' + location.pathname, inkOn = false, inkOffs = [], inkMade = [], inkRaf = 0;
  var SEAL = { a: [], seen: [], got: [], el: [], due: [] };
  function sealsLoad() { try { var v = JSON.parse(localStorage.getItem(SK) || '[]'); return Array.isArray(v) ? v.filter(function (n) { return n === (n | 0) && n >= 0 && n < 99; }) : []; } catch (e) { return []; } }
  function sealsSave() { try { localStorage.setItem(SK, JSON.stringify(SEAL.got.slice().sort(function (a, b) { return a - b; }))); } catch (e) {} }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }
  function sealSetup() {
    SEAL.a = [].slice.call(d.querySelectorAll('main .hero h1, main .case-head h1, main .section-head h2, main .prose > h2'));
    SEAL.seen = SEAL.a.map(function () { return false; }); SEAL.el = []; SEAL.due = [];
    SEAL.got = sealsLoad().filter(function (n) { return n < SEAL.a.length; });
    SEAL.got.forEach(function (n) { stampSeal(n, false); });
    sealCheck();
  }
  function textRects(box) { // the line boxes of every piece of text near a box (page coordinates)
    var out = [], tw = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT), n, rg = d.createRange(), sx = W.scrollX || 0, sy2 = W.scrollY || 0;
    while ((n = tw.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      var pe = n.parentElement; if (!pe || pe.closest('.b-cseal, script, style, [hidden]')) continue;
      var pq = pe.getBoundingClientRect();
      if (pq.bottom + sy2 < box.t - 40 || pq.top + sy2 > box.b + 40 || !pq.width) continue;
      rg.selectNodeContents(n);
      var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) if (rs[i].width && rs[i].height) out.push({ l: rs[i].left + sx, r: rs[i].right + sx, t: rs[i].top + sy2, b: rs[i].bottom + sy2 });
    }
    return out;
  }
  function free(c, rects) { for (var i = 0; i < rects.length; i++) { var q = rects[i]; if (c.l < q.r + 4 && c.r > q.l - 4 && c.t < q.b + 2 && c.b > q.t - 2) return false; } return true; }
  function sealPlace(n, el) {
    var a = SEAL.a[n]; if (!a) return;
    var cw = r.clientWidth, sx = W.scrollX || 0, sy2 = W.scrollY || 0, s = cw >= 900 ? 34 : 24;
    var q = a.getBoundingClientRect(), wrap = (a.closest('.wrap, .prose') || a.parentElement).getBoundingClientRect();
    var rg = d.createRange(); rg.selectNodeContents(a); var ls = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; });
    var first = ls[0] || q, last = ls[ls.length - 1] || q;
    var fy = first.top + sy2 + (first.height - s) / 2, cands = [
      { l: wrap.right + sx + 12, t: fy },                                   // the right margin, level with the title
      { l: q.left + sx - s - 22, t: fy },                                   // the left margin
      { l: last.right + sx + 14, t: last.top + sy2 + (last.height - s) / 2, max: wrap.right + sx - 6 }, // after the title's last word
      { l: last.right + sx + 14, t: last.bottom + sy2 - s, max: wrap.right + sx - 6 }, // the same, sitting on the line (clear of the line above)
      { l: q.left + sx, t: q.top + sy2 - s - 8 },                           // above the title
      { l: wrap.right + sx - s - 18, t: q.top + sy2 - s - 8 }               // above the title, at the right
    ];
    var rects = textRects({ t: q.top + sy2 - s - 20, b: q.bottom + sy2 + s + 20 }), pick = null;
    for (var i = 0; i < cands.length && !pick; i++) {
      var c = cands[i]; c.r = c.l + s; c.b = c.t + s;
      if (c.l < 4 || c.r > cw - 4 || (c.max && c.r > c.max)) continue;
      if (free(c, rects)) pick = c;
    }
    if (!pick) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.style.left = pick.l.toFixed(1) + 'px'; el.style.top = pick.t.toFixed(1) + 'px'; el.style.setProperty('--s', s + 'px');
  }
  function stampSeal(n, fresh) {
    if (SEAL.el[n]) return;
    var h = hash(location.pathname) + n * 7, el = d.createElement('i');
    el.className = 'b-cseal b-v' + (h % 5);
    el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-n', n);
    el.style.setProperty('--rot', ((h * 13) % 15 - 7) + 'deg');
    d.body.appendChild(el); inkMade.push(el); SEAL.el[n] = el;
    sealPlace(n, el);
    var q = el.getBoundingClientRect(); // stamped (and the accent claimed) only where it can be seen; off screen it is simply there
    if (fresh && live && q.bottom > 0 && q.top < innerHeight && el.style.display !== 'none') {
      el.classList.add('b-new'); claim('seal', 1300); setTimeout(function () { el.classList.remove('b-new'); }, 1400);
    }
  }
  function sealCheck() {
    inkRaf = 0;
    var vh = innerHeight, mid = vh * .5, foot = d.querySelector('footer.site'), A = SEAL.a;
    for (var i = 0; i < A.length; i++) {
      var top = A[i].getBoundingClientRect().top;
      if (top >= 0 && top < vh) SEAL.seen[i] = true;
      if (!SEAL.seen[i] || SEAL.got.indexOf(i) >= 0) continue;
      var end = i + 1 < A.length ? A[i + 1].getBoundingClientRect().top : (foot ? foot.getBoundingClientRect().top : 1e9);
      if (end < (i + 1 < A.length ? mid : vh * .9)) { SEAL.got.push(i); sealsSave(); SEAL.due.push(i); } // kept at once
    }
    // stamped one at a time: one moving accent on the screen (a seal waits while another accent shows)
    if (SEAL.due.length) { if (!live || ambientFree()) stampSeal(SEAL.due.shift(), true); if (SEAL.due.length) setTimeout(inkKick, 200); }
    lookCheck();
  }
  function inkKick() { if (!inkRaf && !d.hidden) inkRaf = requestAnimationFrame(sealCheck); }
  function sealRelay() { SEAL.el.forEach(function (el, n) { if (el) sealPlace(n, el); }); micaSize(); }

  /* ---------- 9. captures: on touch screens the one centred in the window (or playing) is in colour ---------- */
  var CAP = '.shot, .demo-poster, .card .thumb-wrap', looked = null;
  function lookCheck() {
    if (mqFine.matches) return;
    var vh = innerHeight, best = null, bd = vh * .2, cs = d.querySelectorAll(CAP);
    for (var i = 0; i < cs.length; i++) {
      var q = cs[i].getBoundingClientRect(); if (q.bottom < 0 || q.top > vh) continue;
      var dd = Math.abs((q.top + q.bottom) / 2 - vh / 2); if (dd < bd) { bd = dd; best = cs[i]; }
    }
    if (best === looked) return;
    if (looked) looked.classList.remove('b-look');
    looked = best; if (best) best.classList.add('b-look');
  }
  function onPlay(e) { var c = e.target && e.target.closest && e.target.closest(CAP); if (c) c.classList.toggle('b-play', e.type === 'play'); }
  // 8: the colophon seal stamps when the footer first comes into view (motion only; it is simply there otherwise)
  var fio = null;
  function colophonSetup() {
    var f = d.querySelector('footer.site'); if (!f || !W.IntersectionObserver) return;
    fio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { f.classList.add('b-stamped'); fio.disconnect(); } }, { threshold: .5 });
    fio.observe(f); offs.push(function () { if (fio) fio.disconnect(); fio = null; f.classList.remove('b-stamped'); });
  }
  function inkStart() {
    inkOn = true;
    r.classList.add('b-ink'); if (!mqFine.matches) r.classList.add('b-touch');
    sealSetup();
    var on2 = function (t, type, fn, opt) { t.addEventListener(type, fn, opt); inkOffs.push(function () { t.removeEventListener(type, fn, opt); }); };
    on2(W, 'scroll', inkKick, { passive: true });
    on2(W, 'resize', sealRelay, { passive: true });
    on2(W, 'load', sealRelay);
    on2(d, 'play', onPlay, true); on2(d, 'pause', onPlay, true); on2(d, 'ended', onPlay, true);
    if (W.ResizeObserver) { var ro = new ResizeObserver(function () { sealRelay(); }); ro.observe(d.body); inkOffs.push(function () { ro.disconnect(); }); }
  }
  function inkStop() {
    inkOn = false;
    inkOffs.forEach(function (f) { f(); }); inkOffs = [];
    cancelAnimationFrame(inkRaf); inkRaf = 0;
    inkMade.forEach(drop); inkMade = []; SEAL = { a: [], seen: [], got: [], el: [], due: [] };
    [].forEach.call(d.querySelectorAll('.b-look, .b-play'), function (e) { e.classList.remove('b-look', 'b-play'); }); looked = null;
    r.classList.remove('b-ink', 'b-touch');
  }

  /* ---------- fluid pass (Nov 20): the page is a hand scroll ----------
     One requestAnimationFrame loop for the whole look (the scroll frame above runs inside it). It runs while the page
     scrolls, while a sheet is still settling, or while the rod is turning, and stops when everything is at rest.
     - every hung sheet (cards, bands, case-page panels) carries a small spring: scroll speed makes its colour block and
       outline lag and slip off-register (the paper flexing), then they settle with one or two damped swings. The text
       on the sheet moves at most about 1.5 px; the block and outline up to 10 px.
     - a scroll rod (rod, silk band and the paper curling onto it) rises at the foot of the window while the page
       scrolls; its grain turns with the scroll and slows to a stop, then it drops away. pointer-events: none.
     - at rest each sheet hangs from its pin and sways a hair (CSS b-hang); amplitude set here so that no corner moves
       more than about 1.3 px; phases are staggered so a slow wave runs along a row.
     - a pointer brushing across a sheet ruffles it; a press dips it; a tap or click flicks ink from the brush tip.
     Visibility is kept by an IntersectionObserver, so the loop never reads layout. */
  var SHEETS = ':is(.card, .band, .method > li, .fact, .chart-card, .repo-card, .band3 > div, .pager a, .term, .paper, .film .shot)';
  var FL = { raf: 0, y: 0, t: 0, v: 0, vis: [], io: null, rod: null, grain: null, ph: 0, spin: 0, rodOn: false, rodT: 0, still: 0, flicks: [], fading: null, lastFlick: null, playing: [] };
  /* polish: the motion vocabulary, shared with look-brush.css (--b-lay, --b-lift, --snap, --spring; .24/.34/.46 s).
     One spring for every sheet (pull K, damping D, at rest below REST), one curve and length for every thrown mark. */
  var MO = { K: .11, D: .2, REST: .06, LAY: 'cubic-bezier(.2,.85,.35,1)', MARK: 860, ROD_HOLD: 450, FLICKS: 2 };
  function kick() { if (!FL.raf && !d.hidden && live) FL.raf = requestAnimationFrame(loop); }
  function loop(t) {
    FL.raf = 0;
    if (sDirty) { sDirty = false; frame(t); }
    var busy = fluid(t);
    if (busy || sDirty) kick();
  }
  function sheetsSetup() {
    var list = d.querySelectorAll(SHEETS), k = 0;
    FL.vis = [];
    FL.io = W.IntersectionObserver ? new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var s = e.target.__bf; if (!s) return;
        var i = FL.vis.indexOf(s);
        if (e.isIntersecting && i < 0) { FL.vis.push(s); s.el.classList.add('b-vis'); }
        else if (!e.isIntersecting && i >= 0) { FL.vis.splice(i, 1); calm(s); s.el.classList.remove('b-vis'); }
      });
    }, { rootMargin: '12% 0px' }) : null;
    [].forEach.call(list, function (el) {
      if (el.parentNode && el.parentNode.closest && el.parentNode.closest(SHEETS)) return; // a sheet inside a sheet moves with its parent
      var w = el.offsetWidth, h = el.offsetHeight; if (!w || !h) return;
      var L = Math.max(h, w / 2, 40);
      el.__bf = { el: el, x: 0, vx: 0, y: 0, vy: 0, on: false };
      el.classList.add('b-fl');
      prop(el, '--b-sa', (1 / L * 57.3).toFixed(3) + 'deg');           // sway: no corner moves more than ~1 px either way
      prop(el, '--b-ph', ((k++ * .83) % 11).toFixed(2) + 's');          // staggered phase: a slow wave along a row
      if (FL.io) FL.io.observe(el);
    });
  }
  function sheetsOff() {
    if (FL.io) FL.io.disconnect(); FL.io = null;
    FL.vis.forEach(calm); FL.vis = [];
    [].forEach.call(d.querySelectorAll('.b-fl'), function (el) { el.classList.remove('b-fl', 'b-vis'); el.style.removeProperty('--b-fx'); el.style.removeProperty('--b-fy'); el.__bf = null; });
  }
  function calm(s) { s.x = s.vx = s.y = s.vy = 0; s.wx = s.wy = ''; if (s.on) { s.on = false; s.el.style.removeProperty('--b-fx'); s.el.style.removeProperty('--b-fy'); } }
  function push(el, dx, dy) { // a local impulse to the sheet under a pointer
    var c = el && el.closest && el.closest('.b-fl'), s = c && c.__bf; if (!s) return;
    s.vx = clamp(s.vx + dx, -6, 6); s.vy = clamp(s.vy + dy, -6, 6); kick();
  }
  function rodSetup() {
    FL.rod = mk('i', 'b-rod', d.body);
    FL.grain = mk('i', 'b-rod-grain', FL.rod);
    mk('i', 'b-rod-curl', FL.rod);
  }
  function fluid(t) {
    var y = W.scrollY || 0, dt = clamp(t - (FL.t || t - 16), 8, 50), f = dt / 16.7;
    var v = (y - FL.y) / dt; FL.y = y; FL.t = t;
    FL.v = FL.v * .6 + v * .4;                                           // px per ms, smoothed
    var moving = Math.abs(v) > .02, busy = false;
    // the sheets: spring toward a lag set by scroll speed (down = the block hangs back, below)
    var tgt = clamp(FL.v * 5, -10, 10);
    for (var i = 0; i < FL.vis.length; i++) {
      var s = FL.vis[i];
      s.vy += ((tgt - s.y) * MO.K - s.vy * MO.D) * f; s.vx += (-s.x * MO.K - s.vx * MO.D) * f;
      s.y += s.vy * f; s.x += s.vx * f;
      s.y = clamp(s.y, -12, 12); s.x = clamp(s.x, -12, 12);
      if (Math.abs(s.y) + Math.abs(s.vy) + Math.abs(s.x) + Math.abs(s.vx) < MO.REST && !moving) { calm(s); continue; }
      busy = true; s.on = true;
      var fy = s.y.toFixed(1), fx = s.x.toFixed(1); // written only when it changes by a tenth of a pixel: each write restyles the sheet
      if (fy !== s.wy) { s.wy = fy; s.el.style.setProperty('--b-fy', fy); }
      if (fx !== s.wx) { s.wx = fx; s.el.style.setProperty('--b-fx', fx); }
    }
    // the rod: turns with the scroll and runs down; rises while moving, drops ~0.45 s after the last movement
    if (FL.rod) {
      FL.spin = moving ? FL.v : FL.spin * Math.pow(.86, f);
      FL.ph = (FL.ph + FL.spin * dt * .9) % 24; if (FL.ph < 0) FL.ph += 24;
      FL.grain.style.transform = 'translate3d(0,' + (FL.ph - 24).toFixed(2) + 'px,0)';
      if (moving) FL.still = t;
      var want = t - FL.still < MO.ROD_HOLD;
      if (want !== FL.rodOn) { FL.rodOn = want; FL.rod.classList.toggle('b-on', want); }
      if (want || Math.abs(FL.spin) > .005) busy = true;
    }
    return busy;
  }
  // a tap or click flicks ink from the brush: a tapered flick and a spray of drops thrown one way, that land and dry
  function flick(x, y, ang, big) {
    // pooled: at most MO.FLICKS in the air; the oldest is not cut off but dries away fast (no jump, no pile-up on spam)
    while (FL.flicks.length >= MO.FLICKS) {
      var o = FL.flicks.shift();
      if (FL.fading) drop(FL.fading); FL.fading = o; // one drying away at a time, so spam never shows more than three
      (function (o) { var fa = o.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 140, fill: 'forwards' }); fa.onfinish = function () { drop(o); if (FL.fading === o) FL.fading = null; }; })(o);
    }
    var g = mk('i', 'b-flick', d.body), n = big ? 6 : 4, a0 = ang;
    FL.flicks.push(g); FL.lastFlick = { x: x, y: y, t: now() };
    g.style.left = x.toFixed(0) + 'px'; g.style.top = y.toFixed(0) + 'px';
    var st = mk('i', 'b-flick-s', g); st.style.rotate = (a0 * 180 / Math.PI).toFixed(0) + 'deg';
    st.animate([{ scale: '0 1', opacity: 1 }, { scale: '1 1', opacity: 1, offset: .35 }, { scale: '1 1', opacity: 1, offset: .7 }, { scale: '1 1', opacity: 0 }],
      { duration: MO.MARK - 40, easing: MO.LAY, fill: 'both' });
    for (var i = 0; i < n; i++) {
      var a = a0 + (Math.random() - .5) * .9, dist = (big ? 26 : 18) + Math.random() * (big ? 34 : 22), sz = 2.5 + Math.random() * (i ? 4.5 : 6);
      var p = mk('i', 'b-flick-d' + (i === 1 ? ' b-v' : ''), g);
      p.style.width = p.style.height = sz.toFixed(1) + 'px';
      var tx = Math.cos(a) * dist, ty = Math.sin(a) * dist;
      p.animate([
        { transform: 'translate(-50%,-50%) translate(0,0) scale(.4,.4)', opacity: 1 },
        { transform: 'translate(-50%,-50%) translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(1.5,.7)', opacity: 1, offset: .26 },
        { transform: 'translate(-50%,-50%) translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(1,1)', opacity: 1, offset: .34 },
        { transform: 'translate(-50%,-50%) translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(1,1)', opacity: 1, offset: .72 },
        { transform: 'translate(-50%,-50%) translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) scale(1,1)', opacity: 0 }
      ], { duration: MO.MARK, easing: MO.LAY, fill: 'both', delay: i * 12 });
    }
    later(function () { drop(g); var k = FL.flicks.indexOf(g); if (k >= 0) FL.flicks.splice(k, 1); }, MO.MARK + 90);
  }
  var lastMv = { x: 0, y: 0, dx: 1, dy: -1 };
  function fluidMove(e) { // a mouse brushing across a sheet ruffles it, in the direction it travelled
    if (e.pointerType !== 'mouse') return;
    var dx = e.clientX - lastMv.x, dy = e.clientY - lastMv.y; lastMv.x = e.clientX; lastMv.y = e.clientY;
    if (Math.abs(dx) + Math.abs(dy) > 1) { lastMv.dx = dx; lastMv.dy = dy; }
    if (Math.abs(dx) + Math.abs(dy) > 6) push(e.target, clamp(dx * .05, -1.2, 1.2), clamp(dy * .05, -1.2, 1.2));
  }
  function fluidDown(e) { // a press dips the sheet where it was pressed
    var c = e.target && e.target.closest && e.target.closest('.b-fl'); if (!c) return;
    var q = c.getBoundingClientRect(), ox = (e.clientX - (q.left + q.width / 2)) / Math.max(1, q.width / 2);
    push(c, clamp(ox * 2.4, -2.4, 2.4), 3.2);
  }
  function fluidUp(e, dn) { // after onUp's checks: a tap (touch) or a click (mouse) flicks ink
    if (!dn || Math.hypot(e.clientX - dn.x, e.clientY - dn.y) > 10 || now() - dn.t > 600) return;
    var lf = FL.lastFlick; if (lf && now() - lf.t < 350 && Math.hypot(e.clientX - lf.x, e.clientY - lf.y) < 24) return; // a double click selects a word: one flick, not two
    var sl = W.getSelection && getSelection(); if (sl && !sl.isCollapsed) return; // text being selected: the brush stays out of the way
    var ang;
    if (e.pointerType === 'mouse') { ang = Math.atan2(lastMv.dy, lastMv.dx); if (Math.hypot(lastMv.dx, lastMv.dy) < 2) ang = -.6; }
    else ang = -.6 + (e.clientX > innerWidth / 2 ? -2 : 0) + (Math.random() - .5) * .5; // a finger flicks up and away from the near edge
    flick(e.clientX, e.clientY, ang, e.pointerType !== 'mouse');
  }
  function fluidFocus(e) { // keyboard focus landing on a sheet (or inside one) nudges it, like a finger on the paper
    var el = e.target; if (!el || !el.closest) return;
    var vis = false; try { vis = el.matches(':focus-visible'); } catch (er) {}
    if (!vis) return;
    push(el, 0, 2.2);
    if (FOC) FOC.getAnimations().forEach(function (a) { a.currentTime = 0; }); // the frame is drawn again round the new element
  }
  function fluidOff() {
    if (FL.raf) cancelAnimationFrame(FL.raf); FL.raf = 0;
    sheetsOff();
    FL.flicks.forEach(drop); FL.flicks = []; drop(FL.fading); FL.fading = null; FL.lastFlick = null;
    FL.playing.forEach(function (v) { var c = v.closest && v.closest('.b-hush'); if (c) c.classList.remove('b-hush'); }); FL.playing = [];
    FL.rod = FL.grain = null; FL.rodOn = false; FL.spin = 0; FL.t = 0;
  }
  // polish: everything to rest at once, with no motion (tab hidden, page leaving or going into the back/forward cache,
  // page shown again from it): no half-flexed sheet, raised rod, thrown ink or falling petal is ever frozen or replayed
  function restNow() {
    if (FL.raf) cancelAnimationFrame(FL.raf); FL.raf = 0; sDirty = false;
    FL.vis.forEach(calm); FL.v = FL.spin = 0; FL.t = 0; FL.y = W.scrollY || 0;
    if (FL.rod) { FL.rodOn = false; FL.rod.classList.add('b-now'); FL.rod.classList.remove('b-on'); FL.rod.offsetWidth; FL.rod.classList.remove('b-now'); }
    FL.flicks.forEach(drop); FL.flicks = []; drop(FL.fading); FL.fading = null;
    clearPetals(); if (lastDrop) { drop(lastDrop); lastDrop = null; }
    if (scrolling) { clearTimeout(idleT); rest(); }
    if (TIP) { if (TIP.raf) cancelAnimationFrame(TIP.raf); TIP.raf = 0; TIP.len = TIP.vx = TIP.vy = 0; TIP.el.style.setProperty('--tl', '0px'); }
  }
  // 14 a playing film: its own sheet stops swaying, and no petal falls while a film plays on screen
  function filmPlay(e) {
    var v = e.target; if (!v || v.tagName !== 'VIDEO') return;
    var i = FL.playing.indexOf(v), on = e.type === 'play' || e.type === 'playing';
    if (on && i < 0) FL.playing.push(v); else if (!on && i >= 0) FL.playing.splice(i, 1);
    var c = v.closest('.b-fl') || v.closest('.film, .demo-poster'); if (c) c.classList.toggle('b-hush', on);
  }
  function filmOnScreen() {
    for (var i = 0; i < FL.playing.length; i++) { var q = FL.playing[i].getBoundingClientRect(); if (q.bottom > 0 && q.top < innerHeight) return true; }
    return false;
  }

  /* ---------- on, off ---------- */
  function relay() { if (live) { sheetsOff(); sheetsSetup(); } if (T) { T.d = null; resample(); thread(true); } boundsSetup(); if (!SDA) scrubSetup(); if (H) { H.last = -1; hero(); } if (SEL) onSel(); focusFollow(); micaSize(); }
  function start() {
    live = true;
    r.classList.add('b-live');
    sy = psy = W.scrollY || 0;
    if (mqFine.matches) r.classList.add('b-fine');
    threadSetup(); scrubSetup(); heroSetup(); boundsSetup(); tipSetup(); wetSetup(); micaSetup(); colophonSetup();
    sheetsSetup(); rodSetup(); FL.y = sy;
    // sheets not yet reached unroll from their top edge when they are (those already on screen are left as they are)
    [].forEach.call(d.querySelectorAll('.card, .band, .figure, .film, .repo-card, .pager'), function (el) { if (!el.classList.contains('in')) el.classList.add('b-ur'); });
    on(W, 'scroll', onScroll, { passive: true });
    on(W, 'scroll', focusFollow, { passive: true });
    on(W, 'resize', function () { clearTimeout(relT); relT = setTimeout(relay, 140); }, { passive: true }); // a drag-resize relays once, when it pauses
    on(W, 'pagehide', restNow); on(W, 'pageswap', restNow);
    on(W, 'pageshow', function (e) { if (e.persisted) { restNow(); relay(); } });
    on(d, 'play', filmPlay, true); on(d, 'playing', filmPlay, true); on(d, 'pause', filmPlay, true); on(d, 'ended', filmPlay, true);
    [].forEach.call(d.querySelectorAll('video'), function (v) { if (!v.paused) filmPlay({ target: v, type: 'play' }); });
    on(W, 'load', relay);
    on(d, 'pointerdown', onDown, { passive: true });
    on(d, 'pointerup', onUp, { passive: true });
    on(d, 'pointercancel', function () { soakOff(); down = null; }, { passive: true });
    on(d, 'touchstart', function () {}, { passive: true }); // lets iOS apply :active (the seal's press) on tap
    on(d, 'click', onKeyClick, true);
    on(d, 'pointerover', onOver, { passive: true });
    on(d, 'pointerout', onOut, { passive: true });
    if (TIP) { on(d, 'pointermove', tipMove, { passive: true }); on(d, 'mouseout', tipLeave, { passive: true }); }
    on(d, 'selectionchange', onSel);
    on(d, 'focusin', onFocusIn);
    on(d, 'focusin', fluidFocus);
    on(d, 'pointermove', fluidMove, { passive: true });
    on(d, 'focusout', function () { setTimeout(function () { if (d.activeElement !== focEl) focusOff(); }, 0); });
    on(mqDark, 'change', function () { sceneNoSun(); micaSetup(); });
    on(d, 'visibilitychange', function () { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; restNow(); if (TIP) { TIP.shown = false; TIP.el.classList.remove('b-on'); } } });
  }
  function stop() {
    live = false;
    offs.forEach(function (f) { f(); }); offs = [];
    timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); clearTimeout(relT);
    cancelAnimationFrame(raf); raf = 0; fluidOff();
    if (TIP && TIP.raf) cancelAnimationFrame(TIP.raf);
    clearPetals(); clearSel();
    wets.slice().forEach(function (a) { a.cancel(); }); wets = []; wetScrub.forEach(function (el) { el.__bw = null; }); wetScrub = []; MICA = null;
    made.forEach(drop); made = [];
    styled.forEach(function (el) { ['--b-p', '--b-sa', '--b-ph', '--b-fx', '--b-fy', '--b-sun-y', '--b-mist-y', '--b-hill-y', '--b-scene-x', '--b-es', '--b-sx', '--b-cx', '--b-cy'].forEach(function (k) { el.style.removeProperty(k); }); }); styled = [];
    [].forEach.call(d.querySelectorAll('.b-coat, .b-soak, .b-tap, .b-enso, .b-selhost, .b-ur, .b-hush'), function (e) { e.classList.remove('b-coat', 'b-soak', 'b-tap', 'b-enso', 'b-selhost', 'b-ur', 'b-hush'); });
    [].forEach.call(d.querySelectorAll('[data-b-from]'), function (e) { e.removeAttribute('data-b-from'); });
    r.classList.remove('b-live', 'b-scr', 'b-sjs', 'b-fine', 'b-tip-on', 'b-kbd', 'b-sun-out');
    T = H = TIP = FOC = SEL = null; [].forEach.call(d.querySelectorAll('.b-cseal.b-new'), function (e) { e.classList.remove('b-new'); }); focEl = null; coated = null; scrubs = []; bounds = []; petals = []; lastDrop = null; scrolling = false;
  }
  var theme0 = r.getAttribute('data-theme');
  function sync() {
    var w = wanted(), th = r.getAttribute('data-theme'), k = r.getAttribute('data-look') === 'brush';
    if (k && !inkOn) inkStart(); else if (!k && inkOn) { if (live) stop(); inkStop(); }
    if (w && !live) start(); else if (!w && live) stop();
    else if (live && th !== theme0) { sceneNoSun(); micaSetup(); } // a light/dark switch: the scene picture changed, mica only on light paper
    theme0 = th;
  }
  new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-look', 'class', 'data-motion', 'data-theme'] });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', sync);
  W.__brushMotionState = function () { return { live: live, sda: SDA, made: made.length, listeners: offs.length, ink: inkOn, inkListeners: inkOffs.length, seals: SEAL.got.slice(), sealEls: inkMade.length, wets: wets.length, mica: !!MICA, fluid: { sheets: d.querySelectorAll('.b-fl').length, vis: FL.vis.length, v: +FL.v.toFixed(3), loop: !!FL.raf, rod: FL.rodOn } }; }; // read by the checks
  sync();
})();
