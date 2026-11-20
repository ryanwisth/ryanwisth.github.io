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

  /* ---------- the one frame loop: one rAF per frame while the page scrolls, the wet washes settle or the brush tip's
     halo eases back; nothing at rest (fluid pass, Nov 20: the drag spring and the tip halo run in this same loop) ---------- */
  var raf = 0, sy = 0, psy = 0, pt = 0, speed = 0, idleT = 0, scrolling = false;
  function kick() { if (!raf && !d.hidden && live) raf = requestAnimationFrame(frame); }
  function onScroll() { kick(); }
  function frame(t) {
    raf = 0;
    sy = W.scrollY || 0;
    var dt = Math.max(8, Math.min(64, t - (pt || t - 16))), moved = sy !== psy, vs = (sy - psy) / dt;
    if (moved) {
      speed = speed * .5 + Math.abs(vs) * .5;
      var dir = sy > psy ? 1 : -1;
      if (!scrolling) { scrolling = true; startMove(); }
      thread(false);
      if (!SDA) scrub();
      hero();
      boundary(dir);
      clearTimeout(idleT); idleT = setTimeout(rest, 150); // (not later(): one timer a frame would pile up in its list)
    }
    psy = sy; pt = t;
    var busy = dragStep(moved ? vs : 0, dt);
    if (TIP && tipStep()) busy = true;
    if (busy) kick();
  }
  function rest() { scrolling = false; speed = 0; pt = 0; thread(true); settle(); starKick(); if (SW.due.length) dabSoon(); }
  function startMove() { if (T) T.bloom.classList.remove('w-on'); unglaze(); clearTimeout(dabT); if (acc.name === 'dab') acc.until = 0; } // a dab in progress never holds back the drops

  /* ---------- fluid (Nov 20) 3: the washes are wet, so the scroll drags them ----------
     The colour under a section, a card, a capture or the band is wet pigment on the sheet: when the page is pulled,
     the pigment lags behind it a little (further the faster the pull, the big washes more than the small swatches),
     and when the pull stops it sloshes back with one soft overshoot and settles. Only the ::before washes move
     (translate, through the non-inherited --w-dy that look-wash.css hands to the pseudo-element); no word moves. It is
     written only to the washes on screen (an IntersectionObserver keeps that list), in the one frame loop, and stops
     (every --w-dy taken off again) once the spring is still. */
  var DRAG = [['.section', 1], ['.band', .7], ['.shot, .term, .paper, .figure, .duo figure, .sum-vis', .6], ['.card .thumb-wrap', .55]];
  var DR = { x: 0, v: 0, vel: 0, on: false, els: [], vis: [], io: null, last: '' };
  function dragSetup() {
    if (!W.IntersectionObserver) return;
    DR.io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var i = DR.vis.indexOf(e.target);
        if (e.isIntersecting && i < 0) DR.vis.push(e.target);
        else if (!e.isIntersecting && i >= 0) { DR.vis.splice(i, 1); e.target.style.removeProperty('--w-dy'); }
      });
    }, { rootMargin: '25% 0px' });
    DRAG.forEach(function (g) { [].forEach.call(d.querySelectorAll('main ' + g[0].split(', ').join(', main ')), function (el) { if (el.__wdk) return; el.__wdk = g[1]; DR.els.push(el); DR.io.observe(el); }); });
    r.classList.add('w-drag');
    offs.push(function () { if (DR.io) DR.io.disconnect(); DR.els.forEach(function (el) { el.style.removeProperty('--w-dy'); delete el.__wdk; }); DR = { x: 0, v: 0, vel: 0, on: false, els: [], vis: [], io: null, last: '' }; });
  }
  function dragStep(vs, dt) { // vs: the scroll's speed this frame in px/ms (signed); returns true while the pigment still moves
    if (!DR.io) return false;
    DR.vel = DR.vel * .55 + vs * .45;
    var cap = mqSlow.matches ? 14 : 22, tgt = clamp(DR.vel * 15, -cap, cap), n = Math.max(1, Math.min(4, Math.round(dt / 16.7)));
    if (Math.abs(vs) > .01) DR.on = true;
    if (!DR.on) return false;
    for (var i = 0; i < n; i++) { DR.v += (tgt - DR.x) * .1 - DR.v * .3; DR.x += DR.v; }
    if (Math.abs(DR.x) < .06 && Math.abs(DR.v) < .03 && Math.abs(tgt) < .06) { // still: take every offset off again
      DR.x = DR.v = DR.vel = 0; DR.on = false; DR.last = '';
      DR.vis.forEach(function (el) { el.style.removeProperty('--w-dy'); });
      return false;
    }
    var k = DR.x.toFixed(1);
    if (k !== DR.last) { DR.last = k; for (var j = 0; j < DR.vis.length; j++) DR.vis[j].style.setProperty('--w-dy', (DR.x * DR.vis[j].__wdk).toFixed(1) + 'px'); }
    return true;
  }

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
    lastDown = { x: e.clientX, y: e.clientY, t: now(), el: t };
    if (e.pointerType !== 'mouse') { var c = t.closest('.card'); if (c) c.classList.add('w-wet'); } // 6: on touch the wash bleeds while the finger is down
    var btn = t.closest('.btn.primary, .demo-poster .play'); if (btn) lift(btn, e.clientX, e.clientY);  // 7
  }
  function onUp(e) {
    wetOff();
    var dn = down; down = null;
    if (!dn || Math.hypot(e.clientX - dn.x, e.clientY - dn.y) > 10 || now() - dn.t > 600) return;
    var t = e.target && e.target.closest ? e.target : null;
    if (e.pointerType === 'mouse') { // fluid (Nov 20): a click on bare paper drops ink too (never on a control, never ending a selection)
      var sel = W.getSelection && W.getSelection();
      if (e.button === 0 && t && !t.closest(CTRL) && !(sel && !sel.isCollapsed)) waterDrop(e.clientX, e.clientY, t);
      return;
    }
    var fig = t && t.closest(FIG), row = t && t.closest('.bars .row');
    if (fig) pool(fig, 1800);                      // 12
    if (row) { row.classList.add('w-tap'); later(function () { row.classList.remove('w-tap'); }, 1800); } // 14
    waterDrop(e.clientX, e.clientY, t);            // 9
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
  // 9 (fluid pass, Nov 20: was clear water): a drop of ink where a finger taps, or the mouse clicks bare paper. It lands
  // dark, blooms out into the damp sheet in the colour of the part of the page it fell on, feathers at its edge (fine
  // fibres of pigment running out along the paper) and dries to a pale stain with a darker rim, then is gone.
  var lastTap = null, CTRL = 'a[href], button, input, textarea, select, label, summary, video, [role="button"], [contenteditable], .look-pick, .thread';
  function waterDrop(x, y, t) {
    claim('tap', 1000);
    drop(lastTap);
    var p = lastTap = mk('i', 'w-tapb', d.body), h = t && t.closest ? t.closest('.card, .fact, .chart-card, .sum, .section, .band, .prose, .case-head, .hero') : null;
    p.style.cssText = 'left:' + x.toFixed(0) + 'px;top:' + y.toFixed(0) + 'px;--w-ih:' + hueOf(h) + ';--w-ir:' + ((hash(x.toFixed(0) + 'y' + y.toFixed(0)) % 36) * 10) + 'deg';
    later(function () { drop(p); if (lastTap === p) lastTap = null; }, 1050);
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
    TIP = { el: mk('i', 'w-tip', d.body), x: -99, y: -99, hx: 0, hy: 0, shown: false };
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
    kick();
  }
  function tipStep() { // the wet halo eases back under the tip (a step of the one frame loop); true while it moves
    if (!TIP.hx && !TIP.hy) return false;
    TIP.hx *= .78; TIP.hy *= .78;
    if (Math.abs(TIP.hx) < .3 && Math.abs(TIP.hy) < .3) TIP.hx = TIP.hy = 0;
    TIP.el.style.setProperty('--hx', TIP.hx.toFixed(1) + 'px'); TIP.el.style.setProperty('--hy', TIP.hy.toFixed(1) + 'px');
    return !!(TIP.hx || TIP.hy);
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
  var FOC = null, focRaf = 0, focEl = null, focWas = null, focAn = null;
  function onFocusIn(e) {
    var el = e.target; if (!el || el === d || !el.matches) return;
    var vis = false; try { vis = el.matches(':focus-visible'); } catch (er) {}
    if (!vis) { focusOff(); return; }
    focEl = el;
    if (!FOC) FOC = mk('i', 'w-focus', d.body);
    r.classList.add('w-kbd');
    placeFocus();
  }
  function focusOff() { focEl = null; focWas = null; r.classList.remove('w-kbd'); if (FOC) FOC.classList.remove('w-on'); }
  function placeFocus() {
    focRaf = 0;
    if (!focEl || !FOC) return;
    if (!d.contains(focEl) || d.activeElement !== focEl) { focusOff(); return; }
    var q = focEl.getBoundingClientRect(), ar = q.width / Math.max(1, q.height), round = ar > .7 && ar < 1.4 && q.width < 90;
    var pad = round ? 6 : 5;
    FOC.className = 'w-focus w-on' + (round ? ' w-round' : '');
    var fc = hueOf(focEl);
    FOC.style.cssText = 'left:' + (q.left - pad).toFixed(1) + 'px;top:' + (q.top - pad).toFixed(1) + 'px;width:' + (q.width + 2 * pad).toFixed(1) + 'px;height:' + (q.height + 2 * pad).toFixed(1) + 'px;--w-fc:' + fc;
    if (focEl !== focWas) { // fluid (Nov 20): the ring is laid wet (the colour, spreading a hair wide) and dries to its ink edge
      focWas = focEl;
      if (focAn) try { focAn.cancel(); } catch (er) {}
      focAn = anim(FOC, [{ borderColor: fc, opacity: .35, transform: 'scale(1.06)' }, { borderColor: fc, opacity: 1, transform: 'none', offset: .3 }, { borderColor: getComputedStyle(FOC).borderTopColor }], { duration: 650, easing: 'cubic-bezier(.2, .6, .3, 1)' });
    }
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

  /* ---------- fluid (Nov 20) 1: leaving the page, ink floods it from where it was touched ----------
     Just before the browser takes its picture of the page it is leaving (pageswap, cross-document view transitions),
     a drop of ink in the colour of what was pressed is put where the finger or mouse last went down (the focused
     thing's middle for a keyboard, the middle of the window otherwise). It carries view-transition-name w-flood, so the
     next page (look-wash.css) floods the whole window with it from that spot and then lets it drain away over the new
     page. Not on a reload (the look picker reloads the page), only when the browser runs a view transition. */
  var lastDown = null;
  function onSwap(e) {
    var vt = e.viewTransition, ty = e.activation && e.activation.navigationType;
    if (!vt || !live || ty === 'reload') return;
    var vw = innerWidth, vh = innerHeight, x = vw / 2, y = vh * .45, h = null, ae = d.activeElement;
    if (lastDown && now() - lastDown.t < 5000) { x = lastDown.x; y = lastDown.y; h = lastDown.el; }
    else if (ae && ae !== d.body && ae.getBoundingClientRect) { var q = ae.getBoundingClientRect(); x = q.left + q.width / 2; y = q.top + q.height / 2; h = ae; }
    var f = mk('i', 'w-flood', d.body);
    f.style.cssText = 'left:' + clamp(x, 0, vw).toFixed(0) + 'px;top:' + clamp(y, 0, vh).toFixed(0) + 'px;--w-fh:' + hueOf(h && h.closest ? h.closest('.card, .pager a, .groupnav a, .section, .sum, .prose, .case-head, .hero, footer') || h : null);
    var gone = function () { drop(f); var i = made.indexOf(f); if (i >= 0) made.splice(i, 1); };
    try { vt.finished.then(gone, gone); } catch (er) {}
    later(gone, 2000);
  }
  function floodOff() { [].forEach.call(d.querySelectorAll('.w-flood'), drop); } // back from the back-forward cache: no ink left on the page

  /* ---------- material (Nov 20) ----------
     1 wet, then dry: a wash newly laid on the page (a section's wash, the swatch under a heading, card or capture, the
       band, the cloud) arrives darker and glossy, a sheen of water sliding off it, and dries paler; its dried rim forms
       as it dries (the rimmed mask comes in at about two thirds of the drying). Web Animations on the pseudo-element:
       the filter is added on top of whatever the page already sets, so hover states keep working. Motion only.
     6 the salt stars and the sky's grains catch the light as the page scrolls: two margin columns whose highlight
       layers cross-fade on a scroll timeline (opacity only). Motion only, wide windows only.
     8 the signature is written in when the footer arrives. Motion only.
     7 swatches and 9 captures centred on touch screens are not motion: they run while the look is worn (.wm-*), with
       motion on or paused. */
  var WETS = [['.section', '::before', 0, 1400], ['.section-head h2', '::before', 150, 1250], ['.card .thumb-wrap', '::before', 0, 1150], ['.shot, .term, .paper', '::before', 0, 1150],
    ['.sum-vis, .figure, .duo figure', '::before', 0, 1150], ['.band', '::before', 0, 1150], ['.bigfig b', '::before', 0, 1000], ['.prose > h2', '::before', 0, 1000]];
  var wio = null, wetN = 0;
  function rootVar(k) { return getComputedStyle(r).getPropertyValue(k).trim(); }
  function wet(el, ps, delay, dur) {
    var cs = getComputedStyle(el, ps); if (!cs || cs.content === 'none' || cs.display === 'none') return;
    var f = rootVar('--w-wet') || 'brightness(.82)', sh = rootVar('--w-sheen');
    anim(el, [{ filter: f }, { filter: f, offset: .3 }, { filter: 'brightness(1)' }], { duration: dur, delay: delay, easing: 'ease-out', pseudoElement: ps, composite: 'add' });
    // the sheen of standing water slides off, and until it is dry the rim has not formed (the plain mask, not the rimmed one)
    var bi = cs.backgroundImage, k0 = {}, k1 = {}, k2 = {}, mi = cs.maskImage || cs.webkitMaskImage || '', ok = 0;
    if (sh && bi && bi !== 'none') {
      var n = bi.split(/,(?![^(]*\))/).length; // (only the layer count matters: sizes and positions are repeated per layer)
      k0.backgroundImage = k1.backgroundImage = k2.backgroundImage = sh + ', ' + bi;
      k0.backgroundSize = k1.backgroundSize = k2.backgroundSize = '260% 100%, ' + cs.backgroundSize;
      k0.backgroundPosition = '100% 0, ' + cs.backgroundPosition; k1.backgroundPosition = '78% 0, ' + cs.backgroundPosition; k2.backgroundPosition = '0% 0, ' + cs.backgroundPosition;
      k0.backgroundRepeat = k1.backgroundRepeat = k2.backgroundRepeat = 'no-repeat, ' + cs.backgroundRepeat; ok = n;
    }
    [['--wash-ar', '--wash-a'], ['--wash-br', '--wash-b'], ['--wash-dr', '--wash-d']].forEach(function (p) {
      var a = rootVar(p[0]), b = rootVar(p[1]); if (a && b && mi.indexOf(a) >= 0) { k0.maskImage = k1.maskImage = mi.replace(a, b); k2.maskImage = mi; ok = 1; }
    });
    if (!ok) return;
    k1.offset = .3; wetN++;
    anim(el, [k0, k1, k2], { duration: dur, delay: delay, easing: 'ease-out', pseudoElement: ps });
  }
  function wetSetup() {
    if (!W.IntersectionObserver) return;
    var map = [];
    wio = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        wio.unobserve(e.target);
        for (var i = 0; i < map.length; i++) if (map[i][0] === e.target) { wet(e.target, map[i][1], map[i][2], map[i][3]); break; }
      });
    }, { threshold: .12 });
    WETS.forEach(function (w) { [].forEach.call(d.querySelectorAll('main ' + w[0].split(', ').join(', main ')), function (el) { map.push([el, w[1], w[2], w[3]]); wio.observe(el); }); });
    // the cloud at the head of the page dries as it blooms
    var c = d.querySelector('main .hero-one, main .case-part:has(> .lede)'); if (c) wet(c, '::before', 500, 2600);
    offs.push(function () { if (wio) wio.disconnect(); wio = null; });
  }
  // 6: the catch of the light in the margins (wide windows, browsers with scroll timelines)
  var SALTC = null;
  function saltSetup() {
    saltOff();
    if (!SDA || r.clientWidth < 1160) return;
    SALTC = [mk('i', 'w-salt w-l', d.body), mk('i', 'w-salt w-r', d.body)];
    saltSize();
  }
  function saltSize() {
    if (!SALTC) return;
    var cw = r.clientWidth, w = Math.round((cw - 1032) / 2 - 18), h = Math.max(d.body.scrollHeight, r.scrollHeight);
    if (cw < 1160) { saltOff(); return; }
    SALTC[0].style.cssText = 'left:0;width:' + w + 'px;height:' + h + 'px';
    SALTC[1].style.cssText = 'left:' + (cw - w) + 'px;width:' + w + 'px;height:' + h + 'px';
  }
  function saltOff() { if (SALTC) { SALTC.forEach(function (m) { drop(m); var i = made.indexOf(m); if (i >= 0) made.splice(i, 1); }); SALTC = null; } }
  // 8: the signature is written when the footer comes into view
  var sio = null;
  function signSetup() {
    var f = d.querySelector('footer.site'); if (!f || !W.IntersectionObserver) return;
    sio = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { f.classList.add('w-signed'); sio.disconnect(); } }, { threshold: .5 });
    sio.observe(f); offs.push(function () { if (sio) sio.disconnect(); sio = null; f.classList.remove('w-signed'); });
  }

  /* ---------- 7. swatches: a section read to its end gets a painter's test swatch of its colour in the margin ----------
     A section runs from its heading to the next heading (the last to the footer). It counts as read once its heading
     has been on screen and the reader has scrolled until its end is above the middle of the window (the last one: near
     the foot of the window). Kept at once in localStorage under rw-wash-swatches:<page path> as a list of section
     numbers, nothing else; no network. With motion on, a new swatch is dabbed in only while the page rests, after the
     settle glaze, and only if it is on screen (one moving accent at a time); otherwise it is simply there. */
  var SWK = 'rw-wash-swatches:' + location.pathname, matOn = false, matOffs = [], matMade = [], matRaf = 0;
  var SW = { a: [], seen: [], got: [], el: [], due: [] }, dabT = 0;
  var HUES = ['--w-red', '--w-green', '--w-blue', '--w-gold', '--w-violet', '--w-pink'];
  function swLoad() { try { var v = JSON.parse(localStorage.getItem(SWK) || '[]'); return Array.isArray(v) ? v.filter(function (n) { return n === (n | 0) && n >= 0 && n < 99; }) : []; } catch (e) { return []; } }
  function swSave() { try { localStorage.setItem(SWK, JSON.stringify(SW.got.slice().sort(function (a, b) { return a - b; }))); } catch (e) {} }
  function hash(s) { var h = 7; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h; }
  function hueToken(el) { // the look's own colour token for this part of the page, so a light/dark switch recolours it
    var v = (getComputedStyle(el).getPropertyValue('--hue') || '').trim().toLowerCase();
    for (var i = 0; i < HUES.length; i++) if (rootVar(HUES[i]).toLowerCase() === v) return 'var(' + HUES[i] + ')';
    return 'var(--w-blue)';
  }
  function swSetup() {
    SW.a = [].slice.call(d.querySelectorAll('main .hero h1, main .case-head h1, main .section-head h2, main .prose > h2'));
    SW.seen = SW.a.map(function () { return false; }); SW.el = []; SW.due = [];
    SW.got = swLoad().filter(function (n) { return n < SW.a.length; });
    SW.got.forEach(function (n) { swStamp(n, false); });
    swCheck();
  }
  function textRects(box) { // the line boxes of every piece of text near a box (page coordinates)
    var out = [], tw = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT), n, rg = d.createRange(), sx = W.scrollX || 0, sy2 = W.scrollY || 0;
    while ((n = tw.nextNode())) {
      if (!/\S/.test(n.nodeValue)) continue;
      var pe = n.parentElement; if (!pe || pe.closest('script, style, [hidden], .wm-sw')) continue;
      var pq = pe.getBoundingClientRect();
      if (pq.bottom + sy2 < box.t - 40 || pq.top + sy2 > box.b + 40 || !pq.width) continue;
      rg.selectNodeContents(n);
      var rs = rg.getClientRects();
      for (var i = 0; i < rs.length; i++) if (rs[i].width && rs[i].height) out.push({ l: rs[i].left + sx, r: rs[i].right + sx, t: rs[i].top + sy2, b: rs[i].bottom + sy2 });
    }
    return out;
  }
  function free(c, rects) { for (var i = 0; i < rects.length; i++) { var q = rects[i]; if (c.l < q.r + 4 && c.r > q.l - 4 && c.t < q.b + 2 && c.b > q.t - 2) return false; } return true; }
  function swPlace(n, el) {
    var a = SW.a[n]; if (!a) return;
    var cw = r.clientWidth, sx = W.scrollX || 0, sy2 = W.scrollY || 0, big = cw >= 900, w = big ? 40 : 30, h = big ? 27 : 20;
    var q = a.getBoundingClientRect(), wrap = (a.closest('.wrap, .prose') || a.parentElement).getBoundingClientRect();
    var rg = d.createRange(); rg.selectNodeContents(a); var ls = [].filter.call(rg.getClientRects(), function (x) { return x.width > 0; });
    var first = ls[0] || q, last = ls[ls.length - 1] || q;
    var fy = first.top + sy2 + (first.height - h) / 2, cands = [
      { l: wrap.right + sx + 14, t: fy },                                   // the right margin, level with the title
      { l: q.left + sx - w - 22, t: fy },                                   // the left margin
      { l: last.right + sx + 14, t: last.top + sy2 + (last.height - h) / 2, max: wrap.right + sx - 6 }, // after the title's last word
      { l: last.right + sx + 14, t: last.bottom + sy2 - h, max: wrap.right + sx - 6 }, // the same, sitting on the line
      { l: q.left + sx, t: q.top + sy2 - h - 8 },                           // above the title
      { l: wrap.right + sx - w - 18, t: q.top + sy2 - h - 8 }               // above the title, at the right
    ];
    var rects = textRects({ t: q.top + sy2 - h - 20, b: q.bottom + sy2 + h + 20 }), pick = null;
    for (var i = 0; i < cands.length && !pick; i++) {
      var c = cands[i]; c.r = c.l + w; c.b = c.t + h;
      if (c.l < 4 || c.r > cw - 4 || (c.max && c.r > c.max)) continue;
      if (free(c, rects)) pick = c;
    }
    if (!pick) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.style.left = pick.l.toFixed(1) + 'px'; el.style.top = pick.t.toFixed(1) + 'px';
    el.style.setProperty('--sw-w', w + 'px'); el.style.setProperty('--sw-h', h + 'px');
  }
  function swStamp(n, fresh) {
    if (SW.el[n]) return;
    var h = hash(location.pathname) + n * 7, el = d.createElement('i');
    el.className = 'wm-sw wm-v' + (h % 3);
    el.setAttribute('aria-hidden', 'true'); el.setAttribute('data-n', n);
    el.style.setProperty('--sw-c', hueToken(SW.a[n]));
    d.body.appendChild(el); matMade.push(el); SW.el[n] = el;
    swPlace(n, el);
    if (fresh) { el.classList.add('wm-new'); setTimeout(function () { el.classList.remove('wm-new'); }, 1400); }
  }
  function onScreen(n) { var a = SW.a[n]; if (!a) return false; var q = a.getBoundingClientRect(); return q.bottom > -30 && q.top < innerHeight + 30; }
  function swCheck() {
    matRaf = 0;
    var vh = innerHeight, mid = vh * .5, foot = d.querySelector('footer.site'), A = SW.a;
    for (var i = 0; i < A.length; i++) {
      var top = A[i].getBoundingClientRect().top;
      if (top >= 0 && top < vh) SW.seen[i] = true;
      if (!SW.seen[i] || SW.got.indexOf(i) >= 0) continue;
      var end = i + 1 < A.length ? A[i + 1].getBoundingClientRect().top : (foot ? foot.getBoundingClientRect().top : 1e9);
      if (end < (i + 1 < A.length ? mid : vh * .9)) { SW.got.push(i); swSave(); SW.due.push(i); } // kept at once
    }
    // without motion (or off screen) a swatch is simply there; with motion an on-screen one waits for the page to rest
    for (var j = SW.due.length - 1; j >= 0; j--) if (!live || !onScreen(SW.due[j])) swStamp(SW.due.splice(j, 1)[0], false);
    if (SW.due.length && live && !scrolling) dabSoon();
    lookCheck();
  }
  function dabSoon() { clearTimeout(dabT); dabT = setTimeout(dab, 1500); } // after the settle glaze has deepened
  function dab() {
    if (!SW.due.length) return;
    if (!live) { while (SW.due.length) swStamp(SW.due.shift(), false); return; }
    if (scrolling) return; // the next rest tries again
    if (!ambientFree()) { dabSoon(); return; }
    var n = SW.due.shift();
    if (!onScreen(n)) swStamp(n, false);
    else { acc.name = 'dab'; acc.until = Math.max(acc.until, now() + 1300); swStamp(n, true); }
    if (SW.due.length) dabSoon();
  }
  function matKick() { if (!matRaf && !d.hidden) matRaf = requestAnimationFrame(swCheck); }
  function matRelay() { SW.el.forEach(function (el, n) { if (el) swPlace(n, el); }); saltSize(); }

  /* ---------- 9. captures: on touch screens the one centred in the window (or playing) comes up clear ---------- */
  var CAP = '.shot, .demo-poster, .card .thumb-wrap', looked = null;
  function lookCheck() {
    if (mqFine.matches) return;
    var vh = innerHeight, best = null, bd = vh * .2, cs = d.querySelectorAll(CAP);
    for (var i = 0; i < cs.length; i++) {
      var q = cs[i].getBoundingClientRect(); if (q.bottom < 0 || q.top > vh) continue;
      var dd = Math.abs((q.top + q.bottom) / 2 - vh / 2); if (dd < bd) { bd = dd; best = cs[i]; }
    }
    if (best === looked) return;
    if (looked) looked.classList.remove('wm-look');
    looked = best; if (best) best.classList.add('wm-look');
  }
  function onPlay(e) { var c = e.target && e.target.closest && e.target.closest(CAP); if (c) c.classList.toggle('wm-play', e.type === 'play'); }
  function matStart() {
    matOn = true;
    if (!mqFine.matches) r.classList.add('wm-touch');
    swSetup();
    var on2 = function (t, type, fn, opt) { t.addEventListener(type, fn, opt); matOffs.push(function () { t.removeEventListener(type, fn, opt); }); };
    on2(W, 'scroll', matKick, { passive: true });
    on2(W, 'resize', matRelay, { passive: true });
    on2(W, 'load', matRelay);
    on2(d, 'play', onPlay, true); on2(d, 'pause', onPlay, true); on2(d, 'ended', onPlay, true);
    if (W.ResizeObserver) { var ro = new ResizeObserver(function () { matRelay(); }); ro.observe(d.body); matOffs.push(function () { ro.disconnect(); }); }
  }
  function matStop() {
    matOn = false;
    matOffs.forEach(function (f) { f(); }); matOffs = [];
    cancelAnimationFrame(matRaf); matRaf = 0; clearTimeout(dabT);
    matMade.forEach(drop); matMade = []; SW = { a: [], seen: [], got: [], el: [], due: [] };
    [].forEach.call(d.querySelectorAll('.wm-look, .wm-play'), function (e) { e.classList.remove('wm-look', 'wm-play'); }); looked = null;
    r.classList.remove('wm-touch');
  }

  /* ---------- on, off ---------- */
  function relay() { if (T) { T.d = null; resample(); thread(true); } boundsSetup(); if (!SDA) scrubSetup(); if (H) { H.last = -1; hero(); } if (SEL) onSel(); focusFollow(); saltSize(); }
  function start() {
    live = true;
    r.classList.add('w-live');
    sy = psy = W.scrollY || 0;
    if (mqFine.matches) r.classList.add('w-fine');
    threadSetup(); scrubSetup(); heroSetup(); boundsSetup(); tipSetup(); wetSetup(); saltSetup(); signSetup();
    dragSetup(); mk('i', 'w-damp', d.body);
    on(W, 'pageswap', onSwap);
    on(W, 'pageshow', floodOff);
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
    on(d, 'visibilitychange', function () { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; clearFalls(); starOff(); clearTimeout(starT); if (TIP) TIP.el.classList.remove('w-on'); } else { starKick(); kick(); } });
    starKick();
    if (SW.due.length) dabSoon();
  }
  function stop() {
    live = false;
    offs.forEach(function (f) { f(); }); offs = [];
    timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); clearTimeout(starT);
    cancelAnimationFrame(raf); raf = 0; cancelAnimationFrame(selRaf); selRaf = 0; cancelAnimationFrame(focRaf); focRaf = 0;
    clearFalls(); clearSel(); unglaze(); starOff(); clearTimeout(dabT); SALTC = null; [].forEach.call(d.querySelectorAll('.wm-new'), function (e) { e.classList.remove('wm-new'); });
    anims.slice().forEach(function (a) { try { a.cancel(); } catch (e) {} }); anims = [];
    made.forEach(drop); made = [];
    styled.forEach(function (el) { ['--w-p', '--w-cloud-y', '--w-moon-y', '--w-ph', '--w-pw', '--w-cx', '--w-cy', '--w-pc', '--w-dy'].forEach(function (k) { el.style.removeProperty(k); }); }); styled = [];
    [].forEach.call(d.querySelectorAll('.w-glaze, .w-wet, .w-tap, .w-pool, .w-selhost'), function (e) { e.classList.remove('w-glaze', 'w-wet', 'w-tap', 'w-pool', 'w-selhost'); });
    [].forEach.call(d.querySelectorAll('[data-w-from]'), function (e) { e.removeAttribute('data-w-from'); });
    r.classList.remove('w-live', 'w-sjs', 'w-fine', 'w-tip-on', 'w-kbd', 'w-th-on', 'w-drag');
    floodOff(); lastDown = null; focWas = null; focAn = null;
    T = H = TIP = FOC = SEL = null; focEl = null; glazed = null; scrubs = []; bounds = []; falls = []; lastTap = null; scrolling = false;
  }
  var theme0 = r.getAttribute('data-theme');
  function sync() {
    var w = wanted(), th = r.getAttribute('data-theme'), k = r.getAttribute('data-look') === 'wash';
    if (k && !matOn) matStart(); else if (!k && matOn) { if (live) stop(); matStop(); }
    if (w && !live) start(); else if (!w && live) { stop(); if (SW.due.length) dab(); } // paused: any swatch still waiting is simply placed
    else if (live && th !== theme0) { starOff(); starKick(); } // a light/dark switch: the night sky comes or goes
    theme0 = th;
  }
  new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-look', 'class', 'data-motion', 'data-theme'] });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', sync);
  W.__washMotionState = function () { return { live: live, sda: SDA, made: made.length, listeners: offs.length, anims: anims.length, falls: falls.length, star: !!STAR, lastStar: lastStar, mat: matOn, swatches: SW.got.slice(), swatchEls: matMade.length, due: SW.due.length, wets: wetN, salt: !!SALTC, drag: { on: DR.on, x: +DR.x.toFixed(2), els: DR.els.length, vis: DR.vis.length }, loop: !!raf }; }; // read by the checks
  sync();
})();
