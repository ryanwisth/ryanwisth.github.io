/* Ink & Wash: the moving extras that need a script (liveliness pass, Nov 20 2026). look-wash.css draws the look; this
   file adds only the parts that follow the reader (scroll, pointer, press, selection, keyboard focus). site.js fetches it
   only while the page wears data-look="wash" and the visitor has not asked for reduced motion. It switches itself on
   only while <html> carries both data-look="wash" and .motion (puts .w-live on the root), and takes away everything it
   added (listeners, elements, classes, properties) the moment either goes: the look picker, "Pause motion", or a
   reduced-motion change. Every rule it drives in look-wash.css sits under .w-live, so without it the look is unchanged.

   It is watercolour, not brush: water, pigment, blooms (backruns), glazes, granulation and dried edges, in the look's
   own washes (--w-* and --hue) and ink. Nothing it adds takes a tap or a click.

   Rules it keeps (the "guardrails"):
   - one moving accent on screen at a time: ambient ones (a falling drop, the settle glaze, a star) wait while one the
     reader caused (a lift, a tap bloom, a pool) is showing, and are cleared by it;
   - scroll-driven movement stops when the scroll stops; the existing slow drift and orbit are the only constants;
   - passive listeners, one requestAnimationFrame per frame at most, nothing while the tab is hidden. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__washMotion || !d.addEventListener || !W.requestAnimationFrame) return;
  W.__washMotion = 1;
  var NS = 'http://www.w3.org/2000/svg';
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  var mqSlow = matchMedia('(pointer: coarse), (max-width: 620px)');
  var mqDark = matchMedia('(prefers-color-scheme: dark)');
  var SDA = !!(W.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var live = false, offs = [], made = [], styled = [], timers = [], anims = [];

  function wanted() { return r.getAttribute('data-look') === 'wash' && r.classList.contains('motion') && !mqReduce.matches; }
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
  function anim(el, kf, opt) { var a; try { a = el.animate(kf, opt); } catch (e) { return null; } anims.push(a); a.addEventListener('finish', function () { var i = anims.indexOf(a); if (i >= 0) anims.splice(i, 1); }); return a; }
  function hueOf(el) { return (el && getComputedStyle(el).getPropertyValue('--hue').trim()) || getComputedStyle(r).getPropertyValue('--w-blue').trim() || '#6fb0dc'; }
  function dark() { return getComputedStyle(r).getPropertyValue('--sky').trim() !== 'none'; } // the night sky is on

  /* ---------- 15. one moving accent at a time ---------- */
  var acc = { name: '', until: 0 };
  function ambientFree() { return now() > acc.until; }
  function claim(name, ms) { acc.name = name; acc.until = now() + ms; clearFalls(); unglaze(); starOff(); }

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
    thread(false);
    if (!SDA) scrub();
    hero();
    if (dir) boundary(dir);
    clearTimeout(idleT); idleT = setTimeout(rest, 150); // (not later(): one timer a frame would pile up in its list)
  }
  function rest() { scrolling = false; speed = 0; pt = 0; thread(true); settle(); starKick(); }
  function startMove() { if (T) T.bloom.classList.remove('w-on'); unglaze(); }

  /* ---------- 1. the margin line as a wet wash line ----------
     site.js draws the thread (.th-line) to the reading line; here the drawn part is redrawn as a filled ink core whose
     width was set when the brush passed (slow = loaded and a little wider, fast = thin), with a dilute wash spreading
     beside it where it was laid slowly (wet), none where fast (dry). When the scroll stops, a small bloom (a backrun:
     water creeping back into the drying wash) spreads at the head, in the colour of the part of the page it is in. */
  var STEP = 6, T = null;
  function threadSetup() {
    var th = d.querySelector('main > .thread'); if (!th) return;
    var svg = th.querySelector('svg'), line = th.querySelector('.th-line'), head = th.querySelector('.th-head');
    if (!svg || !line || !head) return;
    var halo = d.createElementNS(NS, 'path'), body = d.createElementNS(NS, 'path');
    halo.setAttribute('class', 'w-th-wash'); body.setAttribute('class', 'w-th-core');
    svg.appendChild(halo); svg.appendChild(body); made.push(halo, body);
    T = { th: th, line: line, body: body, halo: halo, bloom: mk('i', 'w-th-bloom', th, head), d: null, P: [], N: [], Wd: null, Wt: null, k: -1, cur: 1, wet: 0, built: -2 };
    r.classList.add('w-th-on');
    var mo = new MutationObserver(function () { resample(); thread(!scrolling); }); mo.observe(line, { attributes: true, attributeFilter: ['d'] });
    offs.push(function () { mo.disconnect(); });
    resample(); thread(true);
  }
  function resample() {
    var ds = T.line.getAttribute('d') || '';
    if (ds === T.d) return;
    T.d = ds; T.P = []; T.N = []; T.k = -1; T.built = -2;
    var L = 0; try { L = ds ? T.line.getTotalLength() : 0; } catch (e) {}
    var n = Math.floor(L / STEP), i, p;
    for (i = 0; i <= n; i++) { p = T.line.getPointAtLength(i * STEP); T.P.push(p.x, p.y); }
    for (i = 0; i <= n; i++) {
      var a = Math.max(0, i - 1), b = Math.min(n, i + 1), dx = T.P[2 * b] - T.P[2 * a], dy = T.P[2 * b + 1] - T.P[2 * a + 1], l = Math.hypot(dx, dy) || 1;
      T.N.push(-dy / l, dx / l);
    }
    T.Wd = new Float32Array(n + 1).fill(1); T.Wt = new Float32Array(n + 1).fill(.6);
  }
  function thread(stopped) {
    if (!T || !T.P.length) return;
    var drawn = parseFloat(T.line.style.strokeDasharray) || 0, n = T.Wd.length - 1, k = Math.min(n, Math.floor(drawn / STEP));
    // fast = thin and dry, slow = loaded and wet; both ease toward their targets, so a change of pace reads as a change of load
    var tw = stopped ? 1 : speed < .2 ? 1.6 : speed > 2.4 ? .5 : 1.6 - (speed - .2) / 2.2 * 1.1;
    var tt = stopped ? .6 : speed < .2 ? 1 : speed > 1.6 ? 0 : 1 - (speed - .2) / 1.4;
    T.cur += (tw - T.cur) * (stopped ? 1 : .35); T.wet += (tt - T.wet) * (stopped ? 1 : .35);
    if (k > T.k) for (var i = T.k + 1; i <= k; i++) { T.Wd[i] = T.cur; T.Wt[i] = T.wet; }
    T.k = k;
    if (k !== T.built) build(k);
    if (stopped && k > 2) { // the scroll rests: a bloom creeps out at the head
      var x = T.P[2 * k], y = T.P[2 * k + 1];
      T.bloom.style.left = (x - 16).toFixed(1) + 'px'; T.bloom.style.top = (y - 16).toFixed(1) + 'px';
      T.bloom.style.setProperty('--w-bh', hueAt(y));
      T.bloom.classList.add('w-on');
    }
  }
  function hueAt(y) { // the colour of the block of the page the head is beside (thread coordinates are <main>'s)
    var m = T.th.parentNode, top = m.getBoundingClientRect().top + y, kids = m.children, best = null;
    for (var i = 0; i < kids.length; i++) { var q = kids[i].getBoundingClientRect(); if (q.height && q.top <= top) best = kids[i]; }
    var h = best && best.querySelector ? (best.matches('.section, .sum') ? best : best.querySelector('.prose > h2') || best) : null;
    return hueOf(h || m);
  }
  function build(k) {
    T.built = k;
    if (k < 1) { T.body.setAttribute('d', ''); T.halo.setAttribute('d', ''); return; }
    var base = parseFloat(getComputedStyle(T.line).strokeWidth) || 1.25, P = T.P, N = T.N, L = [], R = [], HL = [], HR = [], i, w, h, x, y, nx, ny, taper;
    for (i = 0; i <= k; i++) {
      taper = (i < 6 ? .35 + .65 * i / 6 : 1) * (i > k - 3 ? .7 + .3 * (k - i) / 3 : 1);
      w = base * T.Wd[i] / 2 * taper;
      h = w + (1 + 4.2 * T.Wt[i]) * taper; // the wash spreads out from the core as far as the line was wet
      x = P[2 * i]; y = P[2 * i + 1]; nx = N[2 * i]; ny = N[2 * i + 1];
      L.push((x + nx * w).toFixed(1) + ' ' + (y + ny * w).toFixed(1)); R.push((x - nx * w).toFixed(1) + ' ' + (y - ny * w).toFixed(1));
      HL.push((x + nx * h).toFixed(1) + ' ' + (y + ny * h).toFixed(1)); HR.push((x - nx * h * .7).toFixed(1) + ' ' + (y - ny * h * .7).toFixed(1));
    }
    T.body.setAttribute('d', 'M' + L.join('L') + 'L' + R.reverse().join('L') + 'Z');
    T.halo.setAttribute('d', 'M' + HL.join('L') + 'L' + HR.reverse().join('L') + 'Z');
  }

  /* ---------- 2 and 14 without scroll timelines: the same scrub, read from scroll position once a frame ---------- */
  var scrubs = [], FLOOD = '.section, .shot, .term, .paper, .figure:has(> img.narrow), .duo figure, .sum-vis:has(> .shot.phone), .band';
  function scrubSetup() {
    if (SDA) return;
    r.classList.add('w-sjs');
    var list = []; try { list = d.querySelectorAll(FLOOD + ', .bars .row, .minis tr'); } catch (e) { list = d.querySelectorAll('.section, .shot, .term, .paper, .band, .bars .row, .minis tr'); }
    scrubs = [].map.call(list, function (el) { return { el: el, bar: el.matches('.bars .row, .minis tr') }; });
    scrub();
  }
  function scrub() {
    var vh = innerHeight;
    for (var i = 0; i < scrubs.length; i++) {
      var s = scrubs[i], top = s.el.getBoundingClientRect().top;
      // a wash floods in between its top entering at the foot of the window and reaching 45% up; a bar fills until 55% up
      var p = clamp((vh - top) / (vh * (s.bar ? .45 : .55)), 0, 1);
      if (s.p !== p) { s.p = p; prop(s.el, '--w-p', p.toFixed(3)); }
    }
  }

  /* ---------- 3. the opening scene: parallax as it scrolls away ----------
     The sky's cloud of colour is the farthest layer and lags the page most; the moon (already setting behind the city
     by a scroll timeline where the browser has one; by the script where it has not) lags less; the city stands on the
     horizon line and moves with the page. */
  var H = null;
  function heroSetup() {
    var mail = d.querySelector('.hero-mail') || d.querySelector('.case-head .lede, .case-part > .lede');
    if (!mail) return;
    var cloud = mail.closest('.hero-one, .case-part') || null;
    if (cloud && cloud.matches('.case-part') && !cloud.querySelector(':scope > .lede')) cloud = null;
    H = { mail: mail, cloud: cloud, last: -1 };
    hero();
  }
  function hero() {
    if (!H) return;
    if (H.last < 0) { H.b = H.mail.getBoundingClientRect().bottom + (W.scrollY || 0); H.u = parseFloat(getComputedStyle(H.mail, '::before').width) / 483 || .7; }
    var s = clamp(W.scrollY || 0, 0, Math.max(1, H.b)), p = s / Math.max(1, H.b);
    if (Math.abs(p - H.last) < .002) return;
    H.last = p;
    var cap = mqSlow.matches ? 40 : 64;
    if (H.cloud) prop(H.cloud, '--w-cloud-y', Math.min(cap, s * .16).toFixed(1) + 'px'); // the sky lags most
    if (!SDA) prop(H.mail, '--w-moon-y', (clamp(s / 620, 0, 1) * 46 * H.u).toFixed(1) + 'px'); // as the scroll timeline does
  }

  /* ---------- 4. at a section boundary one drop of colour falls in the margin and spreads into a ring ---------- */
  var bounds = [], cur = -1, falls = [], lastFall = 0;
  function boundsSetup() { bounds = [].slice.call(d.querySelectorAll('main > section, main .band, main .prose > h2, main .figure')); cur = index(); }
  function index() {
    var line = innerHeight * .45, k = -1;
    for (var i = 0; i < bounds.length; i++) if (bounds[i].getBoundingClientRect().top < line) k = i;
    return k;
  }
  function boundary(dir) {
    var k = index(); if (k === cur) return;
    cur = k;
    if (!ambientFree() || falls.length >= 2 || now() - lastFall < 600) return;
    lastFall = now();
    var b = bounds[Math.max(0, dir > 0 ? k : k + 1)] || bounds[k], col = d.querySelector('main .wrap, main .prose') || d.querySelector('main');
    var left = col ? col.getBoundingClientRect().left : 20, narrow = left < 40;
    var x = narrow ? Math.max(6, left / 2) : clamp(left - 34 + Math.random() * 12, 10, left - 16), vh = innerHeight;
    var y1 = clamp(b ? b.getBoundingClientRect().top + 8 : vh * .45, vh * .2, vh * .8), y0 = Math.max(-20, y1 - vh * .45);
    var g = { drop: mk('i', 'w-fall', d.body), ring: mk('i', 'w-ring' + (narrow ? ' w-sm' : ''), d.body) };
    g.drop.style.cssText = g.ring.style.cssText = 'left:' + x.toFixed(0) + 'px;top:' + y1.toFixed(0) + 'px;--w-dh:' + hueOf(b && (b.matches('.prose > h2') ? b : b.closest('.section, .sum') || b));
    falls.push(g);
    var a = anim(g.drop, [
      { transform: 'translate(-50%,' + (y0 - y1).toFixed(0) + 'px) scale(.7,1.25)', opacity: 0 },
      { transform: 'translate(-50%,' + ((y0 - y1) * .7).toFixed(0) + 'px) scale(.8,1.2)', opacity: .95, offset: .2 },
      { transform: 'translate(-50%,0) scale(.85,1.15)', opacity: .95, offset: .96 },
      { transform: 'translate(-50%,0) scale(1.6,.5)', opacity: 0 }
    ], { duration: 640, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'both' });
    var b2 = anim(g.ring, [
      { transform: 'translate(-50%,-50%) scale(.15)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(.2)', opacity: .9, offset: .02 },
      { transform: 'translate(-50%,-50%) scale(.85)', opacity: .8, offset: .45 },
      { transform: 'translate(-50%,-50%) scale(1)', opacity: 0 }
    ], { duration: 1900, delay: 600, easing: 'cubic-bezier(.2,.6,.3,1)', fill: 'both' });
    if (b2) b2.onfinish = function () { killFall(g); }; else later(function () { killFall(g); }, 2600);
    if (!a) killFall(g);
  }
  function killFall(g) { var i = falls.indexOf(g); if (i >= 0) falls.splice(i, 1); drop(g.drop); drop(g.ring); }
  function clearFalls() { falls.slice().forEach(killFall); }

  /* ---------- 5. scroll stops: a second glaze deepens the nearest heading's wash, once ---------- */
  var glazed = null;
  function settle() {
    if (!ambientFree()) return;
    var hs = d.querySelectorAll('main .section-head h2, main .prose > h2'), line = innerHeight * .45, best = null, bd = 1e9;
    for (var i = 0; i < hs.length; i++) {
      var q = hs[i].getBoundingClientRect();
      if (q.bottom < 0 || q.top > innerHeight) continue;
      var dd = Math.abs((q.top + q.bottom) / 2 - line); if (dd < bd) { bd = dd; best = hs[i]; }
    }
    if (best === glazed) return;
    unglaze();
    glazed = best;
    if (best) best.classList.add('w-glaze');
  }
  function unglaze() { if (glazed) glazed.classList.remove('w-glaze'); glazed = null; }

  /* ---------- 6, 7, 9, 12, 14: presses and taps ---------- */
  var down = null;
  var FIG = '.fact b, .bigfig b, .card .stat b';
  function wetOff() { var s = d.querySelectorAll('.w-wet'); for (var i = 0; i < s.length; i++) s[i].classList.remove('w-wet'); }
  function onDown(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    down = { x: e.clientX, y: e.clientY, t: now(), type: e.pointerType };
    if (e.pointerType !== 'mouse') { var c = t.closest('.card'); if (c) c.classList.add('w-wet'); } // 6: on touch the wash bleeds while the finger is down
    var btn = t.closest('.btn.primary, .demo-poster .play'); if (btn) lift(btn, e.clientX, e.clientY);  // 7
  }
  function onUp(e) {
    wetOff();
    var dn = down; down = null;
    if (!dn || e.pointerType === 'mouse' || Math.hypot(e.clientX - dn.x, e.clientY - dn.y) > 10 || now() - dn.t > 600) return;
    var t = e.target && e.target.closest ? e.target : null;
    var fig = t && t.closest(FIG), row = t && t.closest('.bars .row');
    if (fig) pool(fig, 1800);                      // 12
    if (row) { row.classList.add('w-tap'); later(function () { row.classList.remove('w-tap'); }, 1800); } // 14
    waterDrop(e.clientX, e.clientY);               // 9
  }
  function onKeyClick(e) { if (e.detail === 0 && e.target.closest) { var s = e.target.closest('.btn.primary, .demo-poster .play'); if (s) lift(s); } }
  // 7: pressing the ink button blots it: a paler spot where the pigment was lifted, which fades as it dries back
  function lift(el, cx, cy) {
    claim('lift', 1100);
    var q = el.getBoundingClientRect(), p = mk('i', 'w-lift', d.body);
    var x = cx === undefined || (cx < q.left || cx > q.right) ? q.width / 2 : cx - q.left, y = cy === undefined || (cy < q.top || cy > q.bottom) ? q.height / 2 : cy - q.top;
    p.style.cssText = 'left:' + (q.left + (W.scrollX || 0)).toFixed(1) + 'px;top:' + (q.top + (W.scrollY || 0)).toFixed(1) + 'px;width:' + q.width.toFixed(1) + 'px;height:' + q.height.toFixed(1) + 'px;--w-x:' + x.toFixed(0) + 'px;--w-y:' + y.toFixed(0) + 'px;--w-r:' + Math.max(18, q.height * .9).toFixed(0) + 'px';
    later(function () { drop(p); }, 1300);
  }
  // 9: a drop of clear water where a finger taps: it pushes the pigment out into a pale bloom with a darker rim
  var lastTap = null;
  function waterDrop(x, y) {
    claim('tap', 900);
    drop(lastTap);
    var p = lastTap = mk('i', 'w-tapb', d.body);
    p.style.left = x.toFixed(0) + 'px'; p.style.top = y.toFixed(0) + 'px';
    later(function () { drop(p); if (lastTap === p) lastTap = null; }, 1000);
  }
  // 12: a pooled wash round a big figure's leading number: colour that ran to the edge of a puddle and dried there
  function pool(el, ms) {
    var rg = d.createRange(), w = d.createTreeWalker(el, 4), n, m;
    rg.selectNodeContents(el);
    while ((n = w.nextNode())) { m = /[$£]?\d[\d.,: ]*\s?(%|k|x|×)?/.exec(n.nodeValue); if (m) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].replace(/\s+$/, '').length); break; } }
    var q = rg.getBoundingClientRect(), e = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize) || 24;
    // an oval 1.35 lines tall round the number's middle, wide enough to clear its ends, at most 2.4 times as wide as tall
    var S = Math.max(q.height, fs) * 1.35, Wd = Math.min(Math.max(S, q.width + fs * .7), S * 2.4);
    prop(el, '--w-ph', S.toFixed(1) + 'px');
    prop(el, '--w-pw', Wd.toFixed(1) + 'px');
    prop(el, '--w-cx', (q.left - e.left + q.width / 2).toFixed(1) + 'px');
    prop(el, '--w-cy', (q.top - e.top + q.height * .5).toFixed(1) + 'px');
    prop(el, '--w-pc', hueOf(el.closest('.chart-card, .card, .fact, .sum, .prose') || el));
    claim('pool', 700);
    el.classList.add('w-pool');
    if (ms) later(function () { el.classList.remove('w-pool'); }, ms);
  }

  /* ---------- 8 (a wash swipe from the side the pointer came in), 12 on hover ---------- */
  var LINKS = ':is(.hero-sub, footer.site, .prose, .lede, .hero-mail) a';
  function onOver(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return;
    var a = t.closest(LINKS);
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) {
      var rs = a.getClientRects(), q = rs[0];
      for (var i = 0; i < rs.length; i++) if (e.clientY >= rs[i].top && e.clientY <= rs[i].bottom) { q = rs[i]; break; }
      if (q) a.setAttribute('data-w-from', e.clientX > q.left + q.width / 2 ? 'r' : 'l');
    }
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) pool(f, 0);
  }
  function onOut(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return;
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) f.classList.remove('w-pool');
  }

  /* ---------- 10. a wet round brush tip for a cursor (fine pointers only) ----------
     The dot sits on the hit point (moved in the pointermove handler itself, no frame lag); its halo of dilute colour is
     wet and lags a little behind when the brush moves, then catches up. Native cursor kept in text fields. */
  var TIP = null;
  function tipSetup() {
    if (!mqFine.matches) return;
    TIP = { el: mk('i', 'w-tip', d.body), x: -99, y: -99, hx: 0, hy: 0, raf: 0, shown: false };
    r.classList.add('w-tip-on');
  }
  function tipMove(e) {
    if (!TIP || e.pointerType !== 'mouse') return;
    var x = e.clientX, y = e.clientY;
    if (TIP.shown) { TIP.hx += TIP.x - x; TIP.hy += TIP.y - y; TIP.hx = clamp(TIP.hx, -14, 14); TIP.hy = clamp(TIP.hy, -14, 14); }
    TIP.x = x; TIP.y = y;
    TIP.el.style.transform = 'translate(' + x + 'px,' + y + 'px)';
    var tg = e.target && e.target.closest ? e.target : null;
    var text = tg && tg.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    var link = !text && tg && tg.closest('a[href], button, summary, label, [role="button"], .look-pick-btn');
    TIP.el.classList.toggle('w-link', !!link);
    TIP.el.classList.toggle('w-off', !!text);
    if (!TIP.shown) { TIP.shown = true; TIP.el.classList.add('w-on'); }
    if (!TIP.raf) TIP.raf = requestAnimationFrame(tipHalo);
  }
  function tipHalo() { // the wet halo eases back under the tip
    TIP.raf = 0;
    TIP.hx *= .78; TIP.hy *= .78;
    if (Math.abs(TIP.hx) < .3 && Math.abs(TIP.hy) < .3) TIP.hx = TIP.hy = 0;
    TIP.el.style.setProperty('--hx', TIP.hx.toFixed(1) + 'px'); TIP.el.style.setProperty('--hy', TIP.hy.toFixed(1) + 'px');
    if (TIP.hx || TIP.hy) TIP.raf = requestAnimationFrame(tipHalo);
  }
  function tipLeave(e) { if (TIP && !e.relatedTarget) { TIP.shown = false; TIP.el.classList.remove('w-on'); } }

  /* ---------- 11. a selection in body text is a glaze behind the words, with a hard dried edge ---------- */
  var SELHOST = '.prose, .lede, .hero-sub, .hero h1, .card .body, .fact, .band';
  var SEL = null, selRaf = 0;
  function onSel() { if (!selRaf) selRaf = requestAnimationFrame(paintSel); }
  function clearSel() { if (SEL) { drop(SEL.box); SEL.host.classList.remove('w-selhost'); SEL = null; } }
  function paintSel() {
    selRaf = 0;
    var s = W.getSelection && getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) { clearSel(); return; }
    var rg = s.getRangeAt(0), anc = rg.commonAncestorContainer, el = anc.nodeType === 1 ? anc : anc.parentNode;
    var host = el && el.closest && el.closest(SELHOST);
    if (!host) {
      var a = rg.startContainer, b = rg.endContainer;
      a = (a.nodeType === 1 ? a : a.parentNode).closest(SELHOST); b = (b.nodeType === 1 ? b : b.parentNode).closest(SELHOST);
      host = a && a === b ? a : null;
    }
    if (!host) { clearSel(); return; }
    if (!SEL || SEL.host !== host) { clearSel(); SEL = { host: host, box: mk('span', 'w-sel', host) }; host.classList.add('w-selhost'); }
    var hr = SEL.box.getBoundingClientRect(), rs = rg.getClientRects(), lines = [], i, q, l;
    for (i = 0; i < rs.length; i++) {
      q = rs[i]; if (q.width < 1 || q.height < 1) continue;
      l = lines[lines.length - 1];
      if (l && Math.abs(l.t - q.top) < q.height * .5) { l.l = Math.min(l.l, q.left); l.r = Math.max(l.r, q.right); l.b = Math.max(l.b, q.bottom); }
      else lines.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
    var html = '';
    for (i = 0; i < lines.length && i < 80; i++) {
      l = lines[i];
      html += '<i style="left:' + (l.l - hr.left - 3).toFixed(1) + 'px;top:' + (l.t - hr.top + 1).toFixed(1) + 'px;width:' + (l.r - l.l + 6).toFixed(1) + 'px;height:' + Math.max(4, l.b - l.t - 2).toFixed(1) + 'px"></i>';
    }
    SEL.box.innerHTML = html;
  }

  /* ---------- 13. keyboard focus: a wash ring with a hard dried edge ---------- */
  var FOC = null, focRaf = 0, focEl = null;
  function onFocusIn(e) {
    var el = e.target; if (!el || el === d || !el.matches) return;
    var vis = false; try { vis = el.matches(':focus-visible'); } catch (er) {}
    if (!vis) { focusOff(); return; }
    focEl = el;
    if (!FOC) FOC = mk('i', 'w-focus', d.body);
    r.classList.add('w-kbd');
    placeFocus();
  }
  function focusOff() { focEl = null; r.classList.remove('w-kbd'); if (FOC) FOC.classList.remove('w-on'); }
  function placeFocus() {
    focRaf = 0;
    if (!focEl || !FOC) return;
    if (!d.contains(focEl) || d.activeElement !== focEl) { focusOff(); return; }
    var q = focEl.getBoundingClientRect(), ar = q.width / Math.max(1, q.height), round = ar > .7 && ar < 1.4 && q.width < 90;
    var pad = round ? 6 : 5;
    FOC.className = 'w-focus w-on' + (round ? ' w-round' : '');
    FOC.style.cssText = 'left:' + (q.left - pad).toFixed(1) + 'px;top:' + (q.top - pad).toFixed(1) + 'px;width:' + (q.width + 2 * pad).toFixed(1) + 'px;height:' + (q.height + 2 * pad).toFixed(1) + 'px;--w-fc:' + hueOf(focEl);
  }
  function focusFollow() { if (focEl && !focRaf) focRaf = requestAnimationFrame(placeFocus); }

  /* ---------- 15. the night sky: one star glints, rarely (dark mode, at rest, the opening scene on screen) ---------- */
  var STAR = null, starT = 0, lastStar = 0;
  function starKick() {
    clearTimeout(starT);
    if (!live || !H || !dark() || d.hidden) return;
    starT = setTimeout(starGlint, mqSlow.matches ? 22000 : 14000);
  }
  function starSpot() {
    var vh = innerHeight, vw = innerWidth, top = 72, P = [], i;
    // first choice: the sky over the moon's left shoulder, where the opening scene is on screen
    var q = H.mail.getBoundingClientRect(), cs = getComputedStyle(H.mail, '::before');
    var mw = parseFloat(cs.width) || 300, right = parseFloat(cs.right) || 60, mx = q.right - right - mw, my = q.bottom - mw;
    for (i = 0; i < 3; i++) P.push([mx + mw * (.05 + Math.random() * .2), my + mw * (.02 + Math.random() * .12)]);
    // else: the band of night sky over the title (where the look's stars already are), clear of every letter
    var h1 = d.querySelector('main .hero h1, main .case-head h1');
    if (h1) { var hq = h1.getBoundingClientRect(); for (i = 0; i < 14; i++) P.push([hq.left + Math.random() * hq.width, Math.max(top, hq.top - 70) + Math.random() * Math.max(0, hq.bottom - Math.max(top, hq.top - 70))]); }
    var host = h1 ? h1.closest('.hero, .case-head') || h1.parentNode : null, rects = [];
    if (host) { var tw = d.createTreeWalker(host, 4), n, rg = d.createRange(); while ((n = tw.nextNode())) { if (!/\S/.test(n.nodeValue)) continue; rg.selectNodeContents(n); [].push.apply(rects, [].slice.call(rg.getClientRects())); } }
    for (i = 0; i < P.length; i++) {
      var x = P[i][0], y = P[i][1], ok = y > top && y < vh - 20 && x > 10 && x < vw - 10;
      for (var k = 0; ok && k < rects.length; k++) { var t = rects[k]; if (x > t.left - 14 && x < t.right + 14 && y > t.top - 14 && y < t.bottom + 14) ok = false; }
      if (ok) return P[i];
    }
    return null;
  }
  function starGlint() {
    if (!live || scrolling || !H || !dark() || d.hidden) return;
    var p = ambientFree() ? starSpot() : null;
    if (!p) { starKick(); return; }
    var x = p[0], y = p[1];
    starOff();
    STAR = mk('i', 'w-star', d.body); STAR.style.left = x.toFixed(0) + 'px'; STAR.style.top = y.toFixed(0) + 'px';
    acc.until = Math.max(acc.until, now() + 1800); lastStar = now();
    var s = STAR; later(function () { if (STAR === s) starOff(); }, 1900);
    starKick();
  }
  function starOff() { if (STAR) { drop(STAR); STAR = null; } }

  /* ---------- on, off ---------- */
  function relay() { if (T) { T.d = null; resample(); thread(true); } boundsSetup(); if (!SDA) scrubSetup(); if (H) { H.last = -1; hero(); } if (SEL) onSel(); focusFollow(); }
  function start() {
    live = true;
    r.classList.add('w-live');
    sy = psy = W.scrollY || 0;
    if (mqFine.matches) r.classList.add('w-fine');
    threadSetup(); scrubSetup(); heroSetup(); boundsSetup(); tipSetup();
    on(W, 'scroll', onScroll, { passive: true });
    on(W, 'scroll', focusFollow, { passive: true });
    on(W, 'resize', relay, { passive: true });
    on(W, 'load', relay);
    on(d, 'pointerdown', onDown, { passive: true });
    on(d, 'pointerup', onUp, { passive: true });
    on(d, 'pointercancel', function () { wetOff(); down = null; }, { passive: true });
    on(d, 'touchstart', function () {}, { passive: true }); // lets iOS apply :active on tap
    on(d, 'click', onKeyClick, true);
    on(d, 'pointerover', onOver, { passive: true });
    on(d, 'pointerout', onOut, { passive: true });
    if (TIP) { on(d, 'pointermove', tipMove, { passive: true }); on(d, 'mouseout', tipLeave, { passive: true }); }
    on(d, 'selectionchange', onSel);
    on(d, 'focusin', onFocusIn);
    on(d, 'focusout', function () { setTimeout(function () { if (d.activeElement !== focEl) focusOff(); }, 0); });
    on(mqDark, 'change', starKick);
    on(d, 'visibilitychange', function () { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; clearFalls(); starOff(); clearTimeout(starT); if (TIP) TIP.el.classList.remove('w-on'); } else starKick(); });
    starKick();
  }
  function stop() {
    live = false;
    offs.forEach(function (f) { f(); }); offs = [];
    timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); clearTimeout(starT);
    cancelAnimationFrame(raf); raf = 0; cancelAnimationFrame(selRaf); selRaf = 0; cancelAnimationFrame(focRaf); focRaf = 0;
    if (TIP && TIP.raf) cancelAnimationFrame(TIP.raf);
    clearFalls(); clearSel(); unglaze(); starOff();
    anims.slice().forEach(function (a) { try { a.cancel(); } catch (e) {} }); anims = [];
    made.forEach(drop); made = [];
    styled.forEach(function (el) { ['--w-p', '--w-cloud-y', '--w-moon-y', '--w-ph', '--w-pw', '--w-cx', '--w-cy', '--w-pc'].forEach(function (k) { el.style.removeProperty(k); }); }); styled = [];
    [].forEach.call(d.querySelectorAll('.w-glaze, .w-wet, .w-tap, .w-pool, .w-selhost'), function (e) { e.classList.remove('w-glaze', 'w-wet', 'w-tap', 'w-pool', 'w-selhost'); });
    [].forEach.call(d.querySelectorAll('[data-w-from]'), function (e) { e.removeAttribute('data-w-from'); });
    r.classList.remove('w-live', 'w-sjs', 'w-fine', 'w-tip-on', 'w-kbd', 'w-th-on');
    T = H = TIP = FOC = SEL = null; focEl = null; glazed = null; scrubs = []; bounds = []; falls = []; lastTap = null; scrolling = false;
  }
  var theme0 = r.getAttribute('data-theme');
  function sync() {
    var w = wanted(), th = r.getAttribute('data-theme');
    if (w && !live) start(); else if (!w && live) stop();
    else if (live && th !== theme0) { starOff(); starKick(); } // a light/dark switch: the night sky comes or goes
    theme0 = th;
  }
  new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-look', 'class', 'data-motion', 'data-theme'] });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', sync);
  W.__washMotionState = function () { return { live: live, sda: SDA, made: made.length, listeners: offs.length, anims: anims.length, falls: falls.length, star: !!STAR, lastStar: lastStar }; }; // read by the checks
  sync();
})();
