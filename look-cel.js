/* Cel & Tide: the moving extras that need a script (liveliness pass, Nov 20 2026). look-cel.css draws the look; this
   file adds only the parts that follow the reader (scroll, pointer, press, selection, keyboard focus). site.js fetches
   it only while the page wears data-look="cel" and the visitor has not asked for reduced motion. It switches itself on
   only while <html> carries both data-look="cel" and .motion, puts .c-live on the root, and takes away everything it
   added (listeners, elements, classes, properties) the moment either goes: the look picker, "Pause motion", or a
   reduced-motion change. Every rule it drives sits at the end of look-cel.css under html[data-look="cel"].motion.c-live.
   The material pass (Nov 20 2026) adds two parts that are not motion, collected marks and captures seen through water:
   they run whenever the look is worn (.c-mat on the root), "Pause motion" included, and go when the look changes.

   The look's law (page-films/out/cel/LOOK.md) holds for everything added here: one sun, upper left; a thing's shade is
   its lit paint x #9c8c86; no outline, no stroke, no dark rim (rings are painted bands, masks cut them); no cast
   shadows; the world is painted soft, controls and data things take one hard lit/shade step; arrivals pop with one
   overshoot, exits thin to nothing in a round puff. Paints are the ones listed in look-cel.css only.

   Guardrails (item 15): one moving accent at a time (ambient ones, the margin puffs and the heading glint, wait while one
   the reader caused, a ripple, a splash or a buoy ring, is showing, and are cleared by it); scroll-driven movement stops
   when the scroll stops; passive listeners, at most one requestAnimationFrame per frame, nothing while the tab is hidden. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__celLive || !d.addEventListener || !W.requestAnimationFrame) return;
  W.__celLive = 1;
  var NS = 'http://www.w3.org/2000/svg';
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  var SDA = !!(W.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var live = false, offs = [], made = [], styled = [], timers = [];

  function wanted() { return r.getAttribute('data-look') === 'cel' && r.classList.contains('motion') && !mqReduce.matches; }
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
  function drop(e) { if (e && e.parentNode) e.parentNode.removeChild(e); var i = made.indexOf(e); if (i >= 0) made.splice(i, 1); }
  function narrow() { return innerWidth <= 620 || !mqFine.matches; }

  /* ---------- 15. one moving accent at a time ---------- */
  var acc = { name: '', until: 0 };
  function ambientFree() { return now() > acc.until; }
  function claim(name, ms) { acc.name = name; acc.until = now() + ms; clearPuffs(); glintOff(); }

  /* ---------- the scroll frame: one rAF per frame while scrolling, nothing at rest ---------- */
  var raf = 0, sy = 0, psy = 0, pt = 0, speed = 0, idleT = 0, scrolling = false;
  function onScroll() { if (!raf && !d.hidden) raf = requestAnimationFrame(frame); }
  function frame(t) {
    raf = 0;
    sy = W.scrollY || 0;
    var dt = Math.max(8, t - (pt || t - 16)), v = Math.abs(sy - psy) / dt;
    speed = speed * .5 + v * .5;
    var dir = sy > psy ? 1 : sy < psy ? -1 : 0;
    psy = sy; pt = t;
    if (!scrolling && dir) { scrolling = true; startMove(); }
    thread(false, dt);
    if (!SDA) { scrub(); sparkScrub(); }
    hero();
    if (dir) boundary(dir);
    clearTimeout(idleT); idleT = setTimeout(rest, 150); // (not later(): one timer a frame would pile up in its list)
  }
  function rest() { scrolling = false; speed = 0; pt = 0; thread(true, 16); settle(); }
  function startMove() { if (T) { T.curl.classList.remove('cl-on'); T.g.classList.remove('cl-calm'); clearTimeout(T.calmT); } }

  /* ---------- 1. the margin thread as a line of sea foam ----------
     site.js still draws its white streak (.th-line) to the reading line. Over it, where the scroll has just passed, the
     foam churns: a lumpy band wider than the line and a few bubbles beside it, laid as wide as the scroll was fast and
     trailing behind the head for longer the faster it went. When the scroll stops the churn thins away and a small foam
     curl breaks at the head. Filled shapes only (no stroke). */
  var STEP = 6, T = null;
  function threadSetup() {
    var th = d.querySelector('main > .thread'); if (!th) return;
    var svg = th.querySelector('svg'), line = th.querySelector('.th-line'), head = th.querySelector('.th-head');
    if (!svg || !line || !head) return;
    var g = d.createElementNS(NS, 'g'), churn = d.createElementNS(NS, 'path'), bub = d.createElementNS(NS, 'path');
    g.setAttribute('class', 'cl-th'); churn.setAttribute('class', 'cl-th-churn'); bub.setAttribute('class', 'cl-th-bub');
    g.appendChild(churn); g.appendChild(bub); svg.appendChild(g); made.push(g);
    T = { th: th, line: line, g: g, churn: churn, bub: bub, curl: mk('i', 'cl-curl', th, head), d: null, P: [], N: [], C: null, k: -1, ph: 0, calmT: 0 };
    var mo = new MutationObserver(function () { resample(); if (!scrolling) thread(true, 16); }); mo.observe(line, { attributes: true, attributeFilter: ['d'] });
    offs.push(function () { mo.disconnect(); clearTimeout(T && T.calmT); });
    resample(); T.k = drawnK();
  }
  function resample() {
    var ds = T.line.getAttribute('d') || '';
    if (ds === T.d) return;
    T.d = ds; T.P = []; T.N = [];
    var L = 0; try { L = ds ? T.line.getTotalLength() : 0; } catch (e) {}
    var n = Math.floor(L / STEP), i, p;
    for (i = 0; i <= n; i++) { p = T.line.getPointAtLength(i * STEP); T.P.push(p.x, p.y); }
    for (i = 0; i <= n; i++) {
      var a = Math.max(0, i - 1), b = Math.min(n, i + 1), dx = T.P[2 * b] - T.P[2 * a], dy = T.P[2 * b + 1] - T.P[2 * a + 1], l = Math.hypot(dx, dy) || 1;
      T.N.push(-dy / l, dx / l);
    }
    T.C = new Float32Array(n + 1); T.k = Math.min(T.k, n);
  }
  function drawnK() { var drawn = parseFloat(T.line.style.strokeDasharray) || 0; return Math.min(T.C.length - 1, Math.floor(drawn / STEP)); }
  function thread(stopped, dt) {
    if (!T || !T.P.length) return;
    var k = drawnK(), i;
    if (!stopped) {
      // churn laid where the head passed: none below .25 px/ms, full at 2.2 px/ms; older churn calms each frame, slower
      // when the scroll was fast, so a fast scroll leaves a long stretched wake and a slow one a short one
      var c = clamp((speed - .25) / 1.95, 0, 1), keep = Math.pow(.9 + .07 * c, dt / 16);
      for (i = 0; i < T.C.length; i++) if (T.C[i] > 0) T.C[i] = T.C[i] * keep < .03 ? 0 : T.C[i] * keep;
      if (k > T.k) for (i = Math.max(0, T.k + 1); i <= k; i++) T.C[i] = Math.max(T.C[i], c);
      else if (k < T.k) for (i = k; i <= T.k && i < T.C.length; i++) T.C[i] = Math.max(T.C[i], c * .8); // going back up churns too
      T.k = k; T.ph += dt * .012;
      buildChurn(k);
      return;
    }
    T.k = k;
    // the scroll has stopped: the churn thins away (CSS, half a second), and the foam curls at the head
    if (T.churn.getAttribute('d')) {
      T.g.classList.add('cl-calm');
      clearTimeout(T.calmT);
      T.calmT = setTimeout(function () { if (!T || scrolling) return; T.C.fill(0); T.churn.setAttribute('d', ''); T.bub.setAttribute('d', ''); T.g.classList.remove('cl-calm'); }, 560);
    }
    if (k > 2) {
      T.curl.style.left = (T.P[2 * k] - 13).toFixed(1) + 'px'; T.curl.style.top = (T.P[2 * k + 1] - 13).toFixed(1) + 'px';
      T.curl.classList.add('cl-on');
    }
  }
  function buildChurn(k) {
    var P = T.P, N = T.N, C = T.C, out = '', bub = '', L = null, R = null, i, h, x, y, nx, ny, s, o, rr;
    for (i = 0; i <= k + 1 && i < C.length; i++) {
      var ci = i <= k ? C[i] : 0;
      if (ci > 0) {
        h = 2.6 + ci * (3.4 + 2 * Math.sin(i * .9 + T.ph));       // half-width: lumpy, and the lumps travel (it churns)
        x = P[2 * i]; y = P[2 * i + 1]; nx = N[2 * i]; ny = N[2 * i + 1];
        if (!L) { L = []; R = []; }
        L.push((x + nx * h).toFixed(1) + ' ' + (y + ny * h).toFixed(1));
        R.push((x - nx * h).toFixed(1) + ' ' + (y - ny * h).toFixed(1));
        if (ci > .3 && i % 4 === 0) { // a bubble beside the band, alternating sides
          s = (i / 4) % 2 ? 1 : -1; o = h + 3 + 1.6 * Math.sin(i * 2.3 + T.ph * 1.3); rr = .9 + ci * 1.7;
          var bx = x + nx * o * s, by = y + ny * o * s;
          bub += 'M' + (bx - rr).toFixed(1) + ' ' + by.toFixed(1) + 'a' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 1 0 ' + (2 * rr).toFixed(1) + ' 0a' + rr.toFixed(1) + ' ' + rr.toFixed(1) + ' 0 1 0 ' + (-2 * rr).toFixed(1) + ' 0Z';
        }
      } else if (L) {
        if (L.length > 1) out += 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z';
        L = R = null;
      }
    }
    if (L && L.length > 1) out += 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z';
    T.churn.setAttribute('d', out); T.bub.setAttribute('d', bub);
  }

  /* ---------- 2 and 14 without scroll timelines: the same scrub, read from scroll position once a frame ---------- */
  var scrubs = [];
  var TIDE = 'main :is(.sum, .figure, .more, .how2)';
  function scrubSetup() {
    if (SDA) return;
    r.classList.add('cl-sjs');
    scrubs = [].map.call(d.querySelectorAll(TIDE + ', .bars .row, .minis tr'), function (el) {
      return { el: el, bar: !el.matches(TIDE) };
    });
    scrub();
  }
  function scrub() {
    var vh = innerHeight;
    for (var i = 0; i < scrubs.length; i++) {
      var s = scrubs[i], top = s.el.getBoundingClientRect().top;
      // the tide rises over the first 60% of a window's scroll after the block's top comes in at the foot; a bar fills
      // between entering and 55% up the window
      var p = clamp((vh - top) / (vh * (s.bar ? .45 : .6)), 0, 1);
      if (s.p !== p) { s.p = p; prop(s.el, '--cl-p', p.toFixed(3)); }
    }
  }

  /* ---------- 3. the opening scene: parallax as it scrolls away ----------
     The clouds lag furthest (they are far), the island band and the boat on it a little, the wind gusts and the sea under
     the page not at all. The sun (the light/dark ball in the top bar, upper left of the world's light) never moves. */
  var H = null;
  function heroSetup() {
    var hr = d.querySelector('.hero'), leads = d.querySelector('.leads'), ch = d.querySelector('.case-head');
    if (hr && leads) H = { cl: hr, band: leads, end: leads, last: -1 };
    else if (ch) H = { cl: ch, band: ch, end: ch, last: -1, cs: 1 };
    if (H) { H.lim = 0; hero(); }
  }
  function hero() {
    if (!H) return;
    if (H.last < 0) { // measured once, and again on resize: how far the scene scrolls before its band has left the window
      var q = H.end.getBoundingClientRect(), sh = parseFloat(getComputedStyle(r).getPropertyValue('--sh')) || 300;
      H.sh = sh; H.lim = Math.max(1, q.top + (W.scrollY || 0) + (H.cs ? q.height : 0) + sh + 120);
    }
    var y = clamp(W.scrollY || 0, 0, H.lim);
    if (Math.abs(y - H.last) < .5) return;
    H.last = y;
    prop(H.cl, '--cl-cy', Math.min(y * .22, H.sh * .55).toFixed(1) + 'px');  // clouds: far, they lag most
    prop(H.band, '--cl-by', Math.min(y * .08, H.sh * .16).toFixed(1) + 'px'); // island and boat: nearer
  }

  /* ---------- 4. a puff of foam crosses the margin when a section boundary is crossed ---------- */
  var bounds = [], cur = -1, puffs = [], lastPuff = 0;
  function boundsSetup() { bounds = [].slice.call(d.querySelectorAll('main > section, main .more-g, main .band, main .prose > h2, main .figure, main .sum')); cur = index(); }
  function index() {
    var line = innerHeight * .45, k = -1;
    for (var i = 0; i < bounds.length; i++) if (bounds[i].getBoundingClientRect().top < line) k = i;
    return k;
  }
  function boundary(dir) {
    var k = index(); if (k === cur) return;
    cur = k;
    if (!ambientFree() || puffs.length >= 2 || now() - lastPuff < 500) return;
    lastPuff = now();
    var col = d.querySelector('main .wrap, main .prose') || d.querySelector('main'), left = col ? col.getBoundingClientRect().left : 20;
    var size = left > 60 ? 26 : 14, x = clamp(left - size - 8, 2, Math.max(2, left - size - 2)), vh = innerHeight;
    var p = mk('i', 'cl-puff', d.body), y0 = dir > 0 ? vh * .18 : vh * .72, y1 = y0 + dir * vh * .34;
    p.style.cssText = 'left:' + x.toFixed(0) + 'px;width:' + size + 'px;height:' + size + 'px';
    puffs.push(p);
    var a = p.animate([
      { transform: 'translate(0,' + y0.toFixed(0) + 'px) scale(.3)', opacity: 0 },
      { transform: 'translate(0,' + (y0 + dir * vh * .03).toFixed(0) + 'px) scale(1.12,.9)', opacity: 1, offset: .14 },
      { transform: 'translate(0,' + (y0 + dir * vh * .07).toFixed(0) + 'px) scale(1)', opacity: 1, offset: .26 },
      { transform: 'translate(0,' + y1.toFixed(0) + 'px) scale(1.5)', opacity: 0 }
    ], { duration: narrow() ? 1900 : 1500, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' });
    a.onfinish = function () { killPuff(p); };
  }
  function killPuff(p) { var i = puffs.indexOf(p); if (i >= 0) puffs.splice(i, 1); drop(p); }
  function clearPuffs() { puffs.slice().forEach(killPuff); }

  /* ---------- 5. the scroll stops: a sun glint slides once across the nearest heading ---------- */
  var glinted = null, glintEl = null;
  function settle() {
    if (!ambientFree()) return;
    var hs = d.querySelectorAll('main .section-head h2, main .prose > h2'), line = innerHeight * .45, best = null, bd = 1e9;
    for (var i = 0; i < hs.length; i++) {
      var q = hs[i].getBoundingClientRect();
      if (q.bottom < 0 || q.top > innerHeight) continue;
      var dd = Math.abs((q.top + q.bottom) / 2 - line); if (dd < bd) { bd = dd; best = hs[i]; }
    }
    if (best === glinted) return;
    glintOff();
    glinted = best;
    if (!best) return;
    best.classList.add('cl-glinthost');
    glintEl = mk('span', 'cl-glint', best);
    var g = glintEl;
    later(function () { if (glintEl === g) glintOff(); }, 1000);
  }
  function glintOff() { if (glintEl) { if (glintEl.parentNode) glintEl.parentNode.classList.remove('cl-glinthost'); drop(glintEl); glintEl = null; } }

  /* ---------- 6, 7, 9, 12, 14: presses and taps ---------- */
  var down = null;
  var FIG = '.fact b, .bigfig b, .card .stat b';
  var CTRL = '.btn, .lead-go, .vid-sound, .vid-toggle, .pills span, .back, .theme-toggle, .look-toggle, .demo-poster .play, .motion-toggle';
  function floatOff() { var s = d.querySelectorAll('.cl-float'); for (var i = 0; i < s.length; i++) s[i].classList.remove('cl-float'); }
  function onDown(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    down = { x: e.clientX, y: e.clientY, t: now(), type: e.pointerType };
    if (e.pointerType !== 'mouse') { // 6: on touch the panel floats up while the finger is down
      var c = t.closest('.card, .pager a'); if (c) c.classList.add('cl-float');
    }
    var k = t.closest(CTRL); if (k) ripple(k);   // 7
  }
  function onUp(e) {
    floatOff();
    var dn = down; down = null;
    if (!dn || e.pointerType === 'mouse' || Math.hypot(e.clientX - dn.x, e.clientY - dn.y) > 10 || now() - dn.t > 600) return;
    var t = e.target && e.target.closest ? e.target : null;
    var fig = t && t.closest(FIG), row = t && t.closest('.bars .row');
    if (fig) ring(fig, 1800);                      // 12
    if (row) { row.classList.add('cl-tap'); later(function () { row.classList.remove('cl-tap'); }, 1800); } // 14
    splash(e.clientX, e.clientY);                  // 9
  }
  function onKeyClick(e) { if (e.detail === 0 && e.target.closest) { var k = e.target.closest(CTRL); if (k) ripple(k); } }
  // 7: the control squashes onto its shadow (CSS) and a ring of ripple runs out from under it, in its shadow's paint
  function ripple(el) {
    claim('ripple', 650);
    var q = el.getBoundingClientRect(), p = mk('i', 'cl-ripple', d.body), u = getComputedStyle(el).getPropertyValue('--u').trim();
    var w = q.width * 1.18 + 34, h = q.height * 1.5 + 22;
    p.style.cssText = 'left:' + (q.left + (W.scrollX || 0) + q.width / 2 - w / 2 + 3).toFixed(1) + 'px;top:' + (q.top + (W.scrollY || 0) + q.height / 2 - h / 2 + 5).toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px' + (u ? ';--cl-u:' + u : '');
    later(function () { drop(p); }, 700);
  }
  // 9: a splash where a finger taps: a foam ring (lit / shade) and four droplets, thinning to nothing
  var lastSplash = null;
  function splash(x, y) {
    claim('splash', 700);
    drop(lastSplash);
    var p = lastSplash = mk('i', 'cl-splash', d.body);
    p.style.left = x.toFixed(0) + 'px'; p.style.top = y.toFixed(0) + 'px';
    later(function () { drop(p); if (lastSplash === p) lastSplash = null; }, 760);
  }
  // 12: a buoy ring floats round a big figure's leading number
  function ring(el, ms) {
    var rg = d.createRange(), w = d.createTreeWalker(el, 4), n, m;
    rg.selectNodeContents(el);
    while ((n = w.nextNode())) { m = /[$£]?\d[\d.,: ]*\s?(%|k|x|×)?/.exec(n.nodeValue); if (m) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].replace(/\s+$/, '').length); break; } }
    var q = rg.getBoundingClientRect(), e = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize) || 24;
    if (!q.width) q = e;
    // an ellipse round the number's middle: its hole clears the number by about a quarter em each side, a band 0.2 em thick
    var bw = Math.max(fs * .22, 5), Hh = Math.max(q.height, fs) * .98 + 2 * bw, Ww = Math.max(Hh, q.width + fs * .5 + 2 * bw);
    prop(el, '--cl-rw', Ww.toFixed(1) + 'px');
    prop(el, '--cl-rh', Hh.toFixed(1) + 'px');
    prop(el, '--cl-rb', bw.toFixed(1) + 'px');
    prop(el, '--cl-rx', (q.left - e.left + q.width / 2).toFixed(1) + 'px');
    prop(el, '--cl-ry', (q.top - e.top + q.height * .52).toFixed(1) + 'px');
    claim('ring', 600);
    el.classList.add('cl-ring');
    if (ms) later(function () { el.classList.remove('cl-ring'); }, ms);
  }

  /* ---------- 8 (link band from the side the pointer came in), 12 on hover, 10 the glint cursor ---------- */
  var LINKS = ':is(.hero-sub, footer.site, .prose, .lede) a:not(.btn, .back, .pager a)';
  function onOver(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return;
    var a = t.closest(LINKS);
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) {
      var rs = a.getClientRects(), q = rs[0];
      for (var i = 0; i < rs.length; i++) if (e.clientY >= rs[i].top && e.clientY <= rs[i].bottom) { q = rs[i]; break; }
      if (q) a.setAttribute('data-cl-from', e.clientX > q.left + q.width / 2 ? 'r' : 'l');
    }
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) ring(f, 0);
  }
  function onOut(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return; // a finger "leaves" on lift
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) f.classList.remove('cl-ring');
  }

  var DOT = null;
  function dotSetup() {
    if (!mqFine.matches) return;
    DOT = { el: mk('i', 'cl-dot', d.body), shown: false };
    r.classList.add('cl-dot-on');
  }
  function dotMove(e) {
    if (!DOT || e.pointerType !== 'mouse') return;
    DOT.el.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; // set here, not a frame later: the dot sits on the hit point
    var tg = e.target && e.target.closest ? e.target : null;
    var text = tg && tg.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    var link = !text && tg && tg.closest('a[href], button, summary, label, [role="button"], video');
    DOT.el.classList.toggle('cl-link', !!link);
    DOT.el.classList.toggle('cl-off', !!text);
    if (!DOT.shown) { DOT.shown = true; DOT.el.classList.add('cl-on'); }
  }
  function dotLeave(e) { if (DOT && !e.relatedTarget) { DOT.shown = false; DOT.el.classList.remove('cl-on'); } }

  /* ---------- 11. a selection in text is a sunlit band behind the words, with its shade lip ---------- */
  var SELHOST = '.prose, .lede, .hero-sub, .hero h1, .case-head, .card .body, .fact, .band, .chart-card, .flow li, .method > li, .more-g, .band3 > div, .repo-card';
  var SEL = null, selRaf = 0;
  function onSel() { if (!selRaf) selRaf = requestAnimationFrame(paintSel); }
  function clearSel() { if (SEL) { drop(SEL.box); SEL.host.classList.remove('cl-selhost'); SEL = null; } r.classList.remove('cl-selon'); }
  function paintSel() {
    selRaf = 0;
    var s = W.getSelection && getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) { clearSel(); return; }
    var rg = s.getRangeAt(0), anc = rg.commonAncestorContainer, el = anc.nodeType === 1 ? anc : anc.parentNode;
    var host = el && el.closest && el.closest(SELHOST);
    if (!host) { clearSel(); return; } // a range across panels keeps the browser's own (yellow) selection
    for (var e2 = el; e2 && e2 !== host; e2 = e2.parentElement) { // a panel inside the host (a terminal, a caption) would hide a band laid behind it
      var cs2 = getComputedStyle(e2);
      if (cs2.display !== 'inline' && (cs2.backgroundImage !== 'none' || !/rgba\(\d+, \d+, \d+, 0\)|transparent/.test(cs2.backgroundColor))) { host = e2; break; }
    }
    if (!SEL || SEL.host !== host) { clearSel(); SEL = { host: host, box: mk('span', 'cl-sel', host) }; host.classList.add('cl-selhost'); }
    var hr = SEL.box.getBoundingClientRect(), rs = rg.getClientRects(), lines = [], i, q, l;
    for (i = 0; i < rs.length; i++) { // merge the range's boxes into one per line
      q = rs[i]; if (q.width < 1 || q.height < 1) continue;
      l = lines[lines.length - 1];
      if (l && Math.abs(l.t - q.top) < q.height * .5) { l.l = Math.min(l.l, q.left); l.r = Math.max(l.r, q.right); l.b = Math.max(l.b, q.bottom); }
      else lines.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
    var html = '';
    for (i = 0; i < lines.length && i < 80; i++) {
      l = lines[i];
      html += '<i style="left:' + (l.l - hr.left - 3).toFixed(1) + 'px;top:' + (l.t - hr.top).toFixed(1) + 'px;width:' + (l.r - l.l + 6).toFixed(1) + 'px;height:' + Math.max(4, l.b - l.t - 1).toFixed(1) + 'px"></i>';
    }
    SEL.box.innerHTML = html;
    r.classList.toggle('cl-selon', lines.length > 0);
  }

  /* ---------- 13. keyboard focus: a painted ring (a lit yellow slab ring with its shade lip), not an outline ---------- */
  var FOC = null, focRaf = 0, focEl = null;
  function onFocusIn(e) {
    var el = e.target; if (!el || el === d || !el.matches) return;
    var vis = false; try { vis = el.matches(':focus-visible'); } catch (er) {}
    if (!vis) { focusOff(); return; }
    focEl = el;
    if (!FOC) FOC = mk('i', 'cl-focus', d.body);
    r.classList.add('cl-kbd');
    placeFocus();
  }
  function focusOff() { focEl = null; r.classList.remove('cl-kbd'); if (FOC) FOC.classList.remove('cl-on'); }
  function placeFocus() {
    focRaf = 0;
    if (!focEl || !FOC) return;
    if (!d.contains(focEl) || d.activeElement !== focEl) { focusOff(); return; }
    var q = focEl.getBoundingClientRect(), cs = getComputedStyle(focEl), pad = 3, bw = 5;
    var rad = parseFloat(cs.borderTopLeftRadius) || 0;
    if (/%/.test(cs.borderTopLeftRadius)) rad = Math.min(q.width, q.height) * parseFloat(cs.borderTopLeftRadius) / 100;
    rad = Math.min(rad, Math.min(q.width, q.height) / 2);
    var w = q.width + 2 * (pad + bw), h = q.height + 2 * (pad + bw), ro = Math.min(rad ? rad + pad + bw : 9, w / 2, h / 2), ri = Math.max(0, ro - bw);
    FOC.className = 'cl-focus cl-on';
    FOC.style.cssText = 'left:' + (q.left - pad - bw).toFixed(1) + 'px;top:' + (q.top - pad - bw).toFixed(1) + 'px;width:' + w.toFixed(1) + 'px;height:' + h.toFixed(1) + 'px';
    // a ring shaped like a flat slab: its top face a filled band between two rounded rectangles (even-odd) in lit
    // yellow all the way round, and the same band in the shade paint slid 2 px right and 3 px down behind it (the lip,
    // as on every slab here); yellow is on every side, so the ring is never weaker than the old yellow outline
    var key = w.toFixed(0) + 'x' + h.toFixed(0) + 'r' + ro.toFixed(0);
    if (FOC.__k !== key) {
      FOC.__k = key;
      var band = rr(0, 0, w, h, ro) + rr(bw, bw, w - 2 * bw, h - 2 * bw, ri);
      FOC.innerHTML = '<svg viewBox="0 0 ' + w.toFixed(1) + ' ' + h.toFixed(1) + '" focusable="false">' +
        '<path class="cl-fs" fill="#9c8308" fill-rule="evenodd" transform="translate(2 3)" d="' + band + '"/><path class="cl-fl" fill="#ffef10" fill-rule="evenodd" d="' + band + '"/></svg>';
    }
  }
  function rr(x, y, w, h, k) {
    var f = function (n) { return n.toFixed(1); };
    return 'M' + f(x + k) + ' ' + f(y) + 'H' + f(x + w - k) + 'A' + f(k) + ' ' + f(k) + ' 0 0 1 ' + f(x + w) + ' ' + f(y + k) + 'V' + f(y + h - k) + 'A' + f(k) + ' ' + f(k) + ' 0 0 1 ' + f(x + w - k) + ' ' + f(y + h) +
      'H' + f(x + k) + 'A' + f(k) + ' ' + f(k) + ' 0 0 1 ' + f(x) + ' ' + f(y + h - k) + 'V' + f(y + k) + 'A' + f(k) + ' ' + f(k) + ' 0 0 1 ' + f(x + k) + ' ' + f(y) + 'Z';
  }
  function focusFollow() { if (focEl && !focRaf) focRaf = requestAnimationFrame(placeFocus); }

  /* ---------- material (Nov 20 2026): sea glints (6, motion), the end card's arrival (8, motion), collected marks (7)
     and captures seen through water (9). 7 and 9 are not motion: they run whenever the page wears this look (.c-mat),
     with motion paused too, and are taken away only when the look changes. 1 (arrivals on twos) is CSS only. ---------- */

  /* 6. two strips of glints a side, in the margins only, from the top of the sea (under the island band) to the foot of
     <main>; their two layers cross-fade with the scroll (a scroll timeline; here once a frame where there is none) */
  var SP = null;
  function sparkSetup() {
    SP = { els: [], top: 0, n: 12, span: 1 };
    for (var i = 0; i < 4; i++) SP.els.push(mk('i', 'cl-spark' + (i % 2 ? ' cl-b' : ''), d.querySelector('main')));
    sparkLay();
  }
  function seaTop(main) {
    var mr = main.getBoundingClientRect(), ch = d.querySelector('main .case-head'), ld = d.querySelector('main .leads');
    if (ch) { var c = getComputedStyle(ch, '::after'), q = ch.getBoundingClientRect(); return q.bottom - mr.top + (parseFloat(c.top) - q.height) + parseFloat(c.height) - (parseFloat(getComputedStyle(ch).getPropertyValue('--ch-fade')) || 520); }
    if (ld) { var c2 = getComputedStyle(ld, '::after'); return ld.getBoundingClientRect().top - mr.top + parseFloat(c2.top) + parseFloat(c2.height); }
    return 0;
  }
  function sparkLay() {
    var main = d.querySelector('main'); if (!SP || !main) return;
    var mr = main.getBoundingClientRect(), L = 1e9, Rr = -1e9;
    [].forEach.call(main.querySelectorAll('.wrap, .prose, .figure, .facts, .chart-card, .flow, .term, .shot, .band, .card, .more-g, .sum'), function (e) {
      var q = e.getBoundingClientRect(); if (q.width < 40 || q.height < 4) return; if (q.left < L) L = q.left; if (q.right > Rr) Rr = q.right;
    });
    var ml = L - mr.left, mrw = mr.right - Rr, top = Math.max(0, seaTop(main));
    var smax = Math.max(1, d.documentElement.scrollHeight - innerHeight);
    SP.n = Math.max(4, Math.round(smax / 700)); SP.span = smax / SP.n;
    SP.els.forEach(function (e, i) {
      var left = i < 2, m = left ? ml : mrw, w = Math.min(110, m - 10);
      if (w < 10) { e.style.display = 'none'; return; }
      e.style.display = ''; e.style.top = top + 'px'; e.style.bottom = '0px'; e.style.width = w + 'px';
      e.style.left = (left ? (ml - w) / 2 : mr.width - mrw + (mrw - w) / 2) + 'px';
      e.style.setProperty('--cl-n', SP.n);
    });
    if (!SDA) sparkScrub();
  }
  function sparkScrub() {
    if (!SP) return;
    var ph = ((W.scrollY || 0) / SP.span) % 1, a = 1 - Math.abs(ph * 2 - 1); // 0 at the start of each span, 1 half way
    SP.els.forEach(function (e, i) { e.style.opacity = i % 2 ? (1 - a).toFixed(3) : a.toFixed(3); });
  }

  /* 8. the end card's ball pops in (on twos, CSS) when the footer first comes on screen */
  var endIO = null;
  function endSetup() {
    var f = d.querySelector('footer.site'); if (!f || !W.IntersectionObserver) return;
    endIO = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { f.classList.add('cl-endin'); endIO.disconnect(); } }); }, { threshold: .4 });
    endIO.observe(f); offs.push(function () { if (endIO) endIO.disconnect(); endIO = null; f.classList.remove('cl-endin'); });
  }

  var mat = false, moffs = [], mmade = [], mraf = 0;
  function mon(t, type, fn, opt) { t.addEventListener(type, fn, opt); moffs.push(function () { t.removeEventListener(type, fn, opt); }); }
  function mmk(tag, cls, parent, before) { var e = d.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true'); parent.insertBefore(e, before || null); mmade.push(e); return e; }
  function mScroll() { if (!mraf) mraf = requestAnimationFrame(mFrame); }
  function mFrame() { mraf = 0; marksRead(); capLook(); }

  /* 7. collected marks. A section runs from its heading to the next heading (the last one to the footer); it counts as
     read once its heading has been on screen and its end has passed the middle of the window (the last one: once the
     footer is in view; or the page is at its foot). Its number is kept at once in localStorage["rw-cel-marks:<path>"] (nothing else is stored; no network) and
     a buoy ball is set afloat beside the heading: right after the heading, else in the right margin, else the left,
     wherever no line of text is within 8 px; if no place is free it is not shown. Stamped one at a time; it pops only
     with motion on and when it is on screen. */
  var MK = null, KINDS = 5;
  function marksSetup() {
    var key = 'rw-cel-marks:' + location.pathname, got = [];
    try { got = JSON.parse(localStorage.getItem(key) || '[]'); } catch (e) { got = []; }
    if (!Array.isArray(got)) got = [];
    var hs = [].slice.call(d.querySelectorAll('main .section-head h2, main .prose > h2'));
    MK = { key: key, got: got.filter(function (n) { return typeof n === 'number' && n >= 0 && n < hs.length; }), hs: hs, seen: [], els: {}, queue: [] };
    MK.got.forEach(function (i) { stampMark(i, false); });
    marksRead();
  }
  function marksRead() {
    if (!MK) return;
    var vh = innerHeight, foot = d.querySelector('footer.site'), atEnd = (W.scrollY || 0) + vh >= d.documentElement.scrollHeight - 4;
    for (var i = 0; i < MK.hs.length; i++) {
      if (MK.got.indexOf(i) >= 0) continue;
      var q = MK.hs[i].getBoundingClientRect();
      if (q.bottom > 0 && q.top < vh) MK.seen[i] = 1;
      if (!MK.seen[i]) continue;
      var last = i + 1 >= MK.hs.length, end = !last ? MK.hs[i + 1].getBoundingClientRect().top : (foot ? foot.getBoundingClientRect().top : 1e9);
      if (end < vh * (last ? .85 : .5) || atEnd) earn(i); // the last section ends at the footer: read once the footer is in view
    }
  }
  function earn(i) {
    MK.got.push(i);
    try { localStorage.setItem(MK.key, JSON.stringify(MK.got)); } catch (e) {}
    MK.queue.push(i); if (MK.queue.length === 1) nextStamp();
  }
  function nextStamp() {
    if (!MK || !MK.queue.length) return;
    if (live && !ambientFree()) { later(nextStamp, 260); return; }
    var i = MK.queue[0], el = stampMark(i, live), on = el && el.getBoundingClientRect().bottom > 0 && el.getBoundingClientRect().top < innerHeight;
    if (live && on) claim('mark', 460);
    MK.queue.shift();
    if (MK.queue.length) setTimeout(nextStamp, live && on ? 460 : 0);
  }
  function textRects(y0, y1) {
    var out = [], main = d.querySelector('main'), tw = d.createTreeWalker(main, NodeFilter.SHOW_TEXT), n, rg = d.createRange();
    while ((n = tw.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      var p = n.parentElement; if (!p || p.closest('[aria-hidden="true"], svg, .thread, script, style')) continue;
      var pr = p.getBoundingClientRect(); if (pr.bottom < y0 || pr.top > y1 || !pr.width) continue;
      rg.selectNodeContents(n); var rs = rg.getClientRects();
      for (var k = 0; k < rs.length; k++) if (rs[k].width && rs[k].bottom >= y0 && rs[k].top <= y1) out.push(rs[k]);
    }
    return out;
  }
  function placeFor(h) {
    var q = h.getBoundingClientRect(), sz = innerWidth <= 620 ? 11 : 14, pad = 8, y = q.top + q.height / 2;
    var rg = d.createRange(); rg.selectNodeContents(h); var lr = rg.getClientRects(), last = lr[lr.length - 1] || q;
    var hasBg = getComputedStyle(h).backgroundColor !== 'rgba(0, 0, 0, 0)';
    var col = h.closest('.prose, .wrap, section') || h.parentElement, cr = col.getBoundingClientRect();
    var panel = h.closest('.prose:not(.case-head), .band, .more-g, .card');
    var cands = [
      { x: (hasBg ? q.right : last.right) + 12 + sz / 2, y: hasBg ? y : last.top + last.height / 2, kind: panel ? 'panel' : 'water' },
      { x: (cr.right + innerWidth) / 2, y: y, kind: 'water', need: innerWidth - cr.right },
      { x: cr.left / 2, y: y, kind: 'water', need: cr.left }
    ];
    var rects = textRects(y - 60, y + 60);
    for (var c = 0; c < cands.length; c++) {
      var k = cands[c]; if (k.need !== undefined && k.need < sz + 10) continue;
      var bx0 = k.x - sz / 2 - 6, bx1 = k.x + sz / 2 + 6, by0 = k.y - sz / 2, by1 = k.y + sz / 2 + 4; // the ball, its foam collar
      if (bx0 < 4 || bx1 > innerWidth - 4) continue;
      if (k.kind === 'panel' && panel) { var pq = panel.getBoundingClientRect(); if (bx1 > pq.right - 6) continue; }
      var free = true;
      for (var r = 0; r < rects.length && free; r++) { var t = rects[r]; if (bx1 + pad > t.left && bx0 - pad < t.right && by1 + pad > t.top && by0 - pad < t.bottom) free = false; }
      if (free) return k;
    }
    return null;
  }
  function stampMark(i, animate) {
    var main = d.querySelector('main'), h = MK.hs[i]; if (!main || !h) return null;
    var el = MK.els[i] || (MK.els[i] = mmk('i', 'cm-mark cm-k' + (i % KINDS), main));
    return layMark(i, el, animate);
  }
  function layMark(i, el, animate) {
    var p = placeFor(MK.hs[i]), main = d.querySelector('main');
    if (!p) { el.style.display = 'none'; return null; }
    var mr = main.getBoundingClientRect();
    el.style.display = ''; el.style.left = (p.x - mr.left) + 'px'; el.style.top = (p.y - mr.top) + 'px';
    el.classList.toggle('cm-on-panel', p.kind === 'panel');
    el.style.setProperty('--cm-u', p.kind === 'panel' ? 'var(--c-drop-cloud)' : 'var(--c-drop-sea)');
    if (animate) { el.classList.remove('cm-new'); void el.offsetWidth; el.classList.add('cm-new'); setTimeout(function () { el.classList.remove('cm-new'); }, 600); }
    return el;
  }
  function marksRelay() { if (MK) for (var i in MK.els) layMark(+i, MK.els[i], false); }

  /* 9. captures seen through water: a tinted layer (the sea's blue with the look's net faint in it) over each screenshot,
     picture and film; clear on hover (anywhere on its panel), keyboard focus inside it, playing, or on a touch screen
     while it is the capture nearest the middle of the window */
  var CAPSEL = 'main :is(.shot img, .shot video, .figure > img, .figure .pair > img, .figure > video, .paper img, .card .thumb)';
  var CAPS = [], looked = null;
  function capSetup() {
    CAPS = [];
    [].forEach.call(d.querySelectorAll(CAPSEL), function (m) {
      var host = m.parentElement; while (host && getComputedStyle(host).display === 'inline') host = host.parentElement;
      if (!host) return;
      if (getComputedStyle(host).position === 'static') host.classList.add('cm-caphost');
      var w = mmk('span', 'cm-water', host, m.nextSibling);
      var c = { m: m, host: host, w: w, box: m.closest('.card, .shot, .figure, .paper') || host, hov: 0, foc: 0, look: 0, play: m.tagName === 'VIDEO' && !m.paused ? 1 : 0 };
      CAPS.push(c);
    });
    if (W.ResizeObserver) { var ro = new ResizeObserver(function () { capLay(); }); CAPS.forEach(function (c) { ro.observe(c.m); }); moffs.push(function () { ro.disconnect(); }); }
    capLay(); capLook();
  }
  function capLay() {
    // layout offsets, not screen rectangles: a card in the middle of its pop is scaled, and its rectangle with it
    CAPS.forEach(function (c) {
      var m = c.m, cs = getComputedStyle(m), x = 0, y = 0, e = m;
      var pl = parseFloat(cs.paddingLeft) || 0, pt = parseFloat(cs.paddingTop) || 0, pr = parseFloat(cs.paddingRight) || 0, pb = parseFloat(cs.paddingBottom) || 0;
      while (e && e !== c.host) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      var s = c.w.style, wd = m.clientWidth - pl - pr, ht = m.clientHeight - pt - pb;
      if (e !== c.host || wd < 40 || ht < 30) { s.display = 'none'; return; }
      s.display = ''; s.left = (x + m.clientLeft + pl) + 'px'; s.top = (y + m.clientTop + pt) + 'px';
      s.width = wd + 'px'; s.height = ht + 'px';
      s.borderRadius = pl ? '12px' : cs.borderRadius;
      capPaint(c);
    });
  }
  function capPaint(c) { c.w.classList.toggle('cm-clear', !!(c.hov || c.foc || c.look || c.play)); }
  function capOver(e) {
    if (e.pointerType && e.pointerType !== 'mouse') return;
    CAPS.forEach(function (c) { var inside = c.box.contains(e.target); if (inside !== !!c.hov) { c.hov = inside ? 1 : 0; capPaint(c); } });
  }
  function capLeave(e) { if (!e.relatedTarget) CAPS.forEach(function (c) { if (c.hov) { c.hov = 0; capPaint(c); } }); }
  function capFocus() {
    var a = d.activeElement, kb = a && a !== d.body && a.matches && a.matches(':focus-visible');
    CAPS.forEach(function (c) { var f = kb && (c.box.contains(a) || a === c.m) ? 1 : 0; if (f !== c.foc) { c.foc = f; capPaint(c); } });
  }
  function capPlay(e) { var v = e.target; CAPS.forEach(function (c) { if (c.m === v) { c.play = e.type === 'play' || e.type === 'playing' ? 1 : 0; capPaint(c); } }); }
  function capLook() {
    if (mqFine.matches || !CAPS.length) { if (looked) { looked.look = 0; capPaint(looked); looked = null; } return; }
    var mid = innerHeight / 2, best = null, bd = innerHeight * .2;
    CAPS.forEach(function (c) { var q = c.m.getBoundingClientRect(); if (!q.height) return; var dd = Math.abs((q.top + q.bottom) / 2 - mid); if (dd < bd) { bd = dd; best = c; } });
    if (best === looked) return;
    if (looked) { looked.look = 0; capPaint(looked); }
    looked = best; if (best) { best.look = 1; capPaint(best); }
  }

  function mRelay() { capLay(); marksRelay(); }
  var settleT = 0;
  function mSettle() { clearTimeout(settleT); settleT = setTimeout(function () { if (mat) mRelay(); }, 250); } // after arrivals finish popping (a heading mid-pop is scaled)
  function matStart() {
    mat = true; r.classList.add('c-mat');
    capSetup(); marksSetup();
    mon(W, 'scroll', mScroll, { passive: true });
    mon(W, 'resize', mRelay, { passive: true });
    mon(W, 'load', mRelay);
    mon(d, 'load', function (e) { if (e.target && e.target.tagName === 'IMG') mRelay(); }, true);
    mon(d, 'animationend', function (e) { if (MK && MK.got.length && e.target && e.target.nodeType === 1 && !/(^| )c[lm]-/.test(e.target.className || '')) mSettle(); }, true);
    mon(d, 'pointerover', capOver, { passive: true });
    mon(d, 'mouseout', capLeave, { passive: true });
    mon(d, 'focusin', capFocus); mon(d, 'focusout', function () { setTimeout(capFocus, 0); });
    ['play', 'playing', 'pause', 'ended'].forEach(function (t) { mon(d, t, capPlay, true); });
    if (W.ResizeObserver) { var main = d.querySelector('main'); if (main) { var ro = new ResizeObserver(mRelay); ro.observe(main); moffs.push(function () { ro.disconnect(); }); } }
  }
  function matStop() {
    mat = false;
    moffs.forEach(function (f) { f(); }); moffs = [];
    cancelAnimationFrame(mraf); mraf = 0; clearTimeout(settleT);
    mmade.forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); }); mmade = [];
    [].forEach.call(d.querySelectorAll('.cm-caphost'), function (e) { e.classList.remove('cm-caphost'); });
    r.classList.remove('c-mat');
    MK = null; CAPS = []; looked = null;
  }

  /* ---------- on, off ---------- */
  function relay() { if (T) { T.d = null; resample(); } boundsSetup(); if (!SDA) scrub(); if (H) { H.last = -1; hero(); } if (SEL) onSel(); focusFollow();  sparkLay(); }
  function start() {
    live = true;
    r.classList.add('c-live');
    sy = psy = W.scrollY || 0;
    if (mqFine.matches) r.classList.add('cl-fine');
    threadSetup(); scrubSetup(); heroSetup(); boundsSetup(); dotSetup(); sparkSetup(); endSetup();
    on(W, 'scroll', onScroll, { passive: true });
    on(W, 'scroll', focusFollow, { passive: true });
    on(W, 'resize', relay, { passive: true });
    on(W, 'load', relay);
    on(d, 'pointerdown', onDown, { passive: true });
    on(d, 'pointerup', onUp, { passive: true });
    on(d, 'pointercancel', function () { floatOff(); down = null; }, { passive: true });
    on(d, 'touchstart', function () {}, { passive: true }); // lets iOS apply :active (the squash) on tap
    on(d, 'click', onKeyClick, true);
    on(d, 'pointerover', onOver, { passive: true });
    on(d, 'pointerout', onOut, { passive: true });
    if (DOT) { on(d, 'pointermove', dotMove, { passive: true }); on(d, 'mouseout', dotLeave, { passive: true }); }
    on(d, 'selectionchange', onSel);
    on(d, 'focusin', onFocusIn);
    on(d, 'focusout', function () { setTimeout(function () { if (d.activeElement !== focEl) focusOff(); }, 0); });
    on(d, 'visibilitychange', function () { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; clearPuffs(); if (DOT) DOT.el.classList.remove('cl-on'); } });
    if (W.ResizeObserver) { var main = d.querySelector('main'); if (main) { var ro = new ResizeObserver(function () { relay(); }); ro.observe(main); offs.push(function () { ro.disconnect(); }); } }
  }
  function stop() {
    live = false;
    offs.forEach(function (f) { f(); }); offs = [];
    timers.forEach(clearTimeout); timers = []; clearTimeout(idleT);
    cancelAnimationFrame(raf); raf = 0; cancelAnimationFrame(selRaf); selRaf = 0; cancelAnimationFrame(focRaf); focRaf = 0;
    clearPuffs(); clearSel(); glintOff();
    made.slice().forEach(drop); made = [];
    styled.forEach(function (el) { ['--cl-p', '--cl-cy', '--cl-by', '--cl-rw', '--cl-rh', '--cl-rb', '--cl-rx', '--cl-ry'].forEach(function (k) { el.style.removeProperty(k); }); }); styled = [];
    [].forEach.call(d.querySelectorAll('.cl-float, .cl-tap, .cl-ring, .cl-selhost, .cl-glinthost'), function (e) { e.classList.remove('cl-float', 'cl-tap', 'cl-ring', 'cl-selhost', 'cl-glinthost'); });
    [].forEach.call(d.querySelectorAll('[data-cl-from]'), function (e) { e.removeAttribute('data-cl-from'); });
    r.classList.remove('c-live', 'cl-sjs', 'cl-fine', 'cl-dot-on', 'cl-kbd', 'cl-selon');
    T = H = DOT = FOC = SEL = SP = null; focEl = null; glinted = null; scrubs = []; bounds = []; puffs = []; lastSplash = null; scrolling = false;
  }
  function sync() {
    var w = wanted(), m = r.getAttribute('data-look') === 'cel';
    if (w && !live) start(); else if (!w && live) stop();
    if (m && !mat) matStart(); else if (!m && mat) matStop();
    if (mat && MK && !live && MK.queue.length) { MK.queue.forEach(function (i) { stampMark(i, false); }); MK.queue = []; } // motion went off mid-queue: place the rest still
  }
  new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-look', 'class', 'data-motion'] });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', sync);
  W.__celLiveState = function () { return { live: live, sda: SDA, made: made.length, listeners: offs.length, puffs: puffs.length, acc: acc.name, mat: mat, marks: MK ? MK.got.slice() : null, caps: CAPS.length, mlisteners: moffs.length }; }; // read by the checks
  sync();
})();
