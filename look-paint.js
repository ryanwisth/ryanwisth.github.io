/* Paint & Meadow: the moving extras that need a script (the lively pass, Nov 19; brief _tools/paint/LIVELY.md).
   look-paint.css paints the look and holds the one constant motion (wind in the grass); this file adds only what follows
   the reader: scroll, pointer, press, keyboard focus. site.js fetches it only while the page wears data-look="paint" and
   the visitor has not asked for reduced motion. It switches itself on only while <html> carries both data-look="paint" and
   .motion, and takes away everything it added (listeners, elements, classes, properties) the moment either goes: the
   look picker, "Pause motion", or a reduced-motion change. No people or characters anywhere (Ryan, Nov 19).

   The guardrails (the same as Brush & Scroll's):
   - one moving accent at a time: the ambient ones (a gust's leaves, the leaf that lands) wait while one the reader caused
     (a puff of seeds) is showing, and are cleared by it;
   - scroll-driven movement stops when the scroll stops; the constant motion is the wind (the grass, the gust through the
     boards and the tufts at their feet, cloud shadows and leaf light drifting: the fluid pass, Nov 20, section at the end);
   - decoration only: every element is aria-hidden, takes no clicks, and never moves layout;
   - words never sit on moving light: the moving light (leaf light, the sun on a card, fireflies, stars, cloud shadows) is
     kept to the painted world and to the boards' edge ring, never under a line of text;
   - passive listeners, one requestAnimationFrame per frame at most, nothing while the tab is hidden. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__paintMotion || !d.addEventListener || !W.requestAnimationFrame) return;
  W.__paintMotion = 1;
  var NS = 'http://www.w3.org/2000/svg';
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  var mqDark = matchMedia('(prefers-color-scheme: dark)');
  var live = false, offs = [], made = [], styled = [], timers = [], frames = 0;

  function wanted() { return r.getAttribute('data-look') === 'paint' && r.classList.contains('motion') && !mqReduce.matches; }
  function night() { var t = r.getAttribute('data-theme'); return t === 'dark' || (t !== 'light' && mqDark.matches); }
  function on(t, type, fn, opt) { t.addEventListener(type, fn, opt); offs.push(function () { t.removeEventListener(type, fn, opt); }); }
  function mk(tag, cls, parent, before) {
    var e = d.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true');
    if (parent) parent.insertBefore(e, before || null);
    made.push(e); return e;
  }
  function svg(tag, attrs, parent) { var e = d.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function prop(el, k, v) { el.style.setProperty(k, v); if (styled.indexOf(el) < 0) styled.push(el); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function now() { return performance.now(); }
  function drop(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }
  function rnd(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); } // seeded, so a relayout repaints the same path
  function noise(t) { var i = Math.floor(t), f = t - i, u = f * f * (3 - 2 * f); return rnd(i) * (1 - u) + rnd(i + 1) * u; }

  /* ---------- one moving accent at a time ---------- */
  var acc = { until: 0 }, flying = [];
  function ambientFree() { return now() > acc.until; }
  function claim(ms) { acc.until = now() + ms; clearFlying(); }
  function fly(el, keyframes, opt, then) {
    var a = el.animate(keyframes, opt); flying.push(el);
    a.onfinish = function () { var i = flying.indexOf(el); if (i >= 0) flying.splice(i, 1); if (then) then(el); else drop(el); if (live && !scrolling && !flying.length) later(settle, 300); }; // the leaf lands once the gust has passed
    return a;
  }
  function clearFlying() { flying.slice().forEach(function (e) { e.getAnimations().forEach(function (a) { a.cancel(); }); drop(e); }); flying = []; }

  /* ---------- the one frame: scroll work and pointer work share a single requestAnimationFrame ---------- */
  var raf = 0, vs = 0, dirtyScroll = false, dirtyPtr = false, sy = 0, psy = 0, pt = 0, speed = 0, idleT = 0, windT = 0, scrolling = false;
  function need() { if (!raf && !d.hidden) raf = requestAnimationFrame(frame); }
  function onScroll() { dirtyScroll = true; need(); }
  function frame(t) {
    raf = 0; frames++;
    if (dirtyScroll) { dirtyScroll = false; scrollFrame(t); }
    if (dirtyPtr) { dirtyPtr = false; if (flyStep()) dirtyPtr = true; }
    var sp = sway(t);
    if (dirtyScroll || dirtyPtr || sp) need();
  }
  function scrollFrame(t) {
    sy = W.scrollY || 0;
    var dt = Math.max(8, t - (pt || t - 16)), v = Math.abs(sy - psy) / dt, dir = sy > psy ? 1 : sy < psy ? -1 : 0;
    speed = speed * .6 + v * .4; vs = vs * .6 + (sy - psy) / dt * .4; psy = sy; pt = t;
    if (!scrolling && dir) startMove();
    if (speed > .9) { r.classList.add('pm-windy'); clearTimeout(windT); windT = 0; } // 1. faster scrolling raises the wind
    depth(); path(); stars();
    if (dir) boundary(dir);
    clearTimeout(idleT); idleT = setTimeout(rest, 160); // (not later(): one timer a frame would pile up in its list)
  }
  function startMove() { scrolling = true; if (FP) FP.th.classList.add('pm-moving'); lift(); }
  function rest() {
    scrolling = false; speed = 0; vs = 0; pt = 0; need(); // the boards settle back in the next frames
    if (FP) FP.th.classList.remove('pm-moving');
    clearTimeout(windT); windT = setTimeout(function () { r.classList.remove('pm-windy'); }, 900); // 8. the grass comes to rest
    later(settle, 220);
    placeFocus(); // a picture that loaded during the scroll can move the focused control after the last scroll event
  }

  /* ---------- 3. depth, 5. cloud shadows, 6. leaf light: all read from scroll position, so they stop when it stops ---------- */
  var hero = null, cloudOn = false, sections = [], shades = [], leads = null, chead = null;
  var BANDS = 'main > .section, main > .sum-method, main > .prose:has(> .pager)'; // every hill band (home's sections; a case page's "how" and closing block)
  function depthSetup() {
    hero = d.querySelector('.lead-hero') || d.querySelector('main > .case-head'); // a case page: the sky behind its title
    cloudOn = !!hero && hero.classList.contains('lead-hero') && getComputedStyle(hero, '::after').content !== 'none';
    leads = d.querySelector('.lead-hero .leads');
    chead = leads ? null : d.querySelector('main > .case-head');
    try { sections = [].slice.call(d.querySelectorAll(BANDS)); } catch (e) { sections = [].slice.call(d.querySelectorAll('main > .section, main > .sum-method')); }
    sections.forEach(function (s) { shades.push(mk('i', 'pm-layer pm-shade', s)); });
    if (leads) shades.push(mk('i', 'pm-layer pm-shade pm-band', leads));
    if (chead) shades.push(mk('i', 'pm-layer pm-shade pm-band pm-band-c', chead));
    if (!night()) [].forEach.call(d.querySelectorAll('.leads .card.lead, main > .case-head + .sum .fact'), function (c) { mk('i', 'pm-layer pm-dapple', c, c.firstChild); });
  }
  function shadeDrift() { // the cloud shadows and the leaf light drift on at rest: each gets an inner layer the CSS moves
    [].forEach.call(d.querySelectorAll('.pm-shade, .pm-dapple'), function (e) { e.appendChild(d.createElement('i')).className = 'pm-drift'; });
  }
  function depth() {
    var vh = W.innerHeight;
    if (hero) {
      var hb = hero.getBoundingClientRect();
      if (hb.bottom > 0) {
        prop(hero, '--pm-sy', (sy * .25).toFixed(1) + 'px');
        if (cloudOn) { prop(hero, '--pm-cy', (sy * .16).toFixed(1) + 'px'); prop(hero, '--pm-cx', (-sy * .05).toFixed(1) + 'px'); }
      }
    }
    sections.forEach(function (s) {
      var b = s.getBoundingClientRect();
      if (b.top > vh || b.top + 200 < 0) return;
      prop(s, '--pm-hy', clamp((b.top - vh * .5) * -.05, -16, 16).toFixed(1) + 'px'); // the hill sits back: it moves a little slower
    });
    shades.forEach(function (e) { prop(e, '--pm-shx', (sy * .14).toFixed(1) + 'px'); });
    var lh = leads || (chead && chead.nextElementSibling);
    if (lh) { prop(lh, '--pm-lx', (Math.sin(sy / 90) * 9 + sy * .03).toFixed(1) + 'px'); prop(lh, '--pm-ly', (Math.cos(sy / 70) * 6).toFixed(1) + 'px'); }
  }

  /* ---------- 2. the footpath paints itself ----------
     site.js lays a thin thread down the left margin and draws it as far as the reading line. Here that line is repainted as
     a worn earth footpath: a ragged body a little wider in places, a darker edge on the side away from the sun, a paler worn
     strip, and grass tufts along both edges. It is built once (from the line's shape) and revealed down to the reading line
     by a clip, so a frame costs one attribute. Where it is being walked, the grass at its head parts, and stands back up
     when the scroll stops. It starts where the meadow starts (never in the sky). */
  var FP = null, STEP = 5;
  function pathSetup() {
    var th = d.querySelector('main > .thread'); if (!th || getComputedStyle(th).display === 'none') return;
    var s = th.querySelector('svg'), line = th.querySelector('.th-line'); if (!s || !line) return;
    var id = 'pm-fp-clip', defs = svg('defs', {}, s), cp = svg('clipPath', { id: id }, defs), rect = svg('rect', { x: -400, y: 0, width: 4000, height: 0 }, cp);
    var g = svg('g', { 'class': 'pm-fp', 'clip-path': 'url(#' + id + ')' }, null); s.insertBefore(g, line);
    var edge = svg('path', { 'class': 'pm-fp-edge' }, g), body = svg('path', { 'class': 'pm-fp-body' }, g), worn = svg('path', { 'class': 'pm-fp-worn' }, g);
    var g1 = svg('path', { 'class': 'pm-fp-g1' }, g), g2 = svg('path', { 'class': 'pm-fp-g2' }, g);
    var part = svg('g', { 'class': 'pm-part' }, s);
    svg('path', { 'class': 'pl', d: 'M-9 0c-1-6-3-11-7-15 5 3 7 9 8 15zM-6 0c0-7 1-12 4-17-2 6-2 11-1 17z', fill: 'currentColor' }, part);
    svg('path', { 'class': 'pr', d: 'M9 0c1-6 3-11 7-15-5 3-7 9-8 15zM6 0c0-7-1-12-4-17 2 6 2 11 1 17z', fill: 'currentColor' }, part);
    made.push(defs, g, part);
    FP = { th: th, line: line, rect: rect, edge: edge, body: body, worn: worn, g1: g1, g2: g2, part: part, d: null, P: [], y0: 0, k: -1 };
    var mo = new MutationObserver(function (m) { m.forEach(function (x) { if (x.attributeName === 'd') FP.d = null; }); path(); });
    mo.observe(line, { attributes: true, attributeFilter: ['d', 'style'] });
    offs.push(function () { mo.disconnect(); });
    path();
  }
  function meadowTop() { // where the meadow begins, in the thread's coordinates: the band's ground (home, or under a case title), else the top
    if (!leads && chead) { var cb = chead.getBoundingClientRect(), cbh = parseFloat(getComputedStyle(r).getPropertyValue('--pm-bh')) || 0;
      if (!cbh) { var t0 = d.createElement('i'); t0.style.cssText = 'position:absolute;height:var(--pm-bh)'; d.body.appendChild(t0); cbh = t0.offsetHeight; d.body.removeChild(t0); }
      return cb.bottom - FP.th.getBoundingClientRect().top + cbh * .5; }
    if (!leads) return 0;
    var bh = parseFloat(getComputedStyle(leads).paddingTop) / .8 || 0;
    return leads.getBoundingClientRect().top - FP.th.getBoundingClientRect().top + bh * .5;
  }
  function build() {
    var ds = FP.line.getAttribute('d') || ''; FP.d = ds; FP.P = []; FP.k = -1;
    var L = 0; try { L = ds ? FP.line.getTotalLength() : 0; } catch (e) {}
    if (L < 20) { FP.body.setAttribute('d', ''); FP.edge.setAttribute('d', ''); FP.worn.setAttribute('d', ''); FP.g1.setAttribute('d', ''); FP.g2.setAttribute('d', ''); return; }
    var n = Math.floor(L / STEP), P = [], i, p, y0 = meadowTop(), small = W.innerWidth <= 620, sh = small ? 0 : -7, ws = small ? .62 : 1; FP.y0 = y0; // a narrow screen: a slimmer path, not shifted toward the edge
    for (i = 0; i <= n; i++) { p = FP.line.getPointAtLength(i * STEP); P.push(p.x + sh, p.y); } // a little further from the boards' edge
    FP.P = P;
    var Lft = [], Rgt = [], EL = [], ER = [], wornD = '', ga = '', gb = '', started = -1, tuftAt = 0, bodyD = '', edgeD = '', cut = false;
    var tb = FP.th.getBoundingClientRect(), keep = [];
    [].forEach.call(d.querySelectorAll('.section-head h2, .prose > h2'), function (h) { // where the path must stop: short of the heading and its board
      var hb = h.getBoundingClientRect(), bd = h.closest('.prose:not(.case-head)'), left = Math.min(hb.left, bd ? bd.getBoundingClientRect().left : hb.left);
      keep.push({ x: left - tb.left - 12, t: hb.top - tb.top - 8, b: hb.bottom - tb.top + 8 });
    });
    function blocked(x, y) { for (var q = 0; q < keep.length; q++) if (x > keep[q].x && y > keep[q].t && y < keep[q].b) return true; return false; }
    function flush() { if (Lft.length > 1) { bodyD += 'M' + Lft.join('L') + 'L' + Rgt.reverse().join('L') + 'Z'; edgeD += 'M' + EL.join('L') + 'L' + ER.reverse().join('L') + 'Z'; } Lft = []; Rgt = []; EL = []; ER = []; }
    for (i = 0; i <= n; i++) {
      var a = Math.max(0, i - 1), b = Math.min(n, i + 1), dx = P[2 * b] - P[2 * a], dy = P[2 * b + 1] - P[2 * a + 1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l;
      var x = P[2 * i], y = P[2 * i + 1];
      if (y < y0 - 2) continue;
      if (blocked(x, y)) { if (!cut) { flush(); cut = true; } continue; }
      if (cut) { cut = false; wornD += 'M' + (x - nx * .8).toFixed(1) + ' ' + (y - ny * .8).toFixed(1); }
      if (started < 0) started = i;
      var ramp = clamp((i - started) / 10, 0, 1), w = (3.4 + 1.6 * noise(i * STEP / 70) + .5 * (rnd(i) - .5)) * ramp * ws, we = w + 1.6 + .6 * rnd(i + 7);
      Lft.push((x + nx * w).toFixed(1) + ' ' + (y + ny * w).toFixed(1)); Rgt.push((x - nx * w * .9).toFixed(1) + ' ' + (y - ny * w * .9).toFixed(1));
      EL.push((x + nx * we).toFixed(1) + ' ' + (y + ny * we + .8).toFixed(1)); ER.push((x - nx * (w * .9 - .6)).toFixed(1) + ' ' + (y - ny * (w * .9 - .6) + .8).toFixed(1));
      wornD += (wornD ? 'L' : 'M') + (x - nx * .8).toFixed(1) + ' ' + (y - ny * .8).toFixed(1);
      // grass tufts along both edges, every 18 to 40 px, alternating sides; a few blades each, leaning out from the path
      if (i * STEP >= tuftAt && ramp === 1 && !blocked(x - 20, y) && !blocked(x + 20, y)) {
        var side = rnd(i * 3) < .5 ? 1 : -1, off = (w + 1.2) * side, bx = x + nx * off, by = y + ny * off, nb = 3 + Math.floor(rnd(i + 2) * 3), j;
        for (j = 0; j < nb; j++) {
          var h = (6 + 8 * rnd(i * 5 + j)) * ws, lean = side * (.25 + .5 * rnd(i * 9 + j)), ox = bx + side * j * 1.6, tip = (ox + lean * h).toFixed(1) + ' ' + (by - h).toFixed(1);
          var blade = 'M' + (ox - 1.1).toFixed(1) + ' ' + (by + .5).toFixed(1) + 'Q' + (ox + lean * h * .3).toFixed(1) + ' ' + (by - h * .5).toFixed(1) + ' ' + tip + 'Q' + (ox + .6 + lean * h * .2).toFixed(1) + ' ' + (by - h * .45).toFixed(1) + ' ' + (ox + 1.2).toFixed(1) + ' ' + (by + .5).toFixed(1) + 'Z';
          if (rnd(i * 13 + j) < .62) ga += blade; else gb += blade;
        }
        tuftAt = i * STEP + 18 + 22 * rnd(i + 11);
      }
    }
    flush();
    if (!bodyD) return;
    FP.body.setAttribute('d', bodyD);
    FP.edge.setAttribute('d', edgeD);
    FP.worn.setAttribute('d', wornD); FP.g1.setAttribute('d', ga); FP.g2.setAttribute('d', gb);
  }
  function path() {
    if (!FP) return;
    if (FP.d !== (FP.line.getAttribute('d') || '')) build();
    if (!FP.P.length) return;
    var drawn = parseFloat(FP.line.style.strokeDasharray) || 0, n = FP.P.length / 2 - 1, k = Math.min(n, Math.floor(drawn / STEP));
    if (k === FP.k) return;
    FP.k = k;
    var hx = FP.P[2 * k], hy = FP.P[2 * k + 1];
    FP.rect.setAttribute('y', FP.y0.toFixed(1)); FP.rect.setAttribute('height', Math.max(0, hy - FP.y0 + 2).toFixed(1));
    var shown = hy > FP.y0 + 30;
    FP.part.style.opacity = shown ? '1' : '0';
    FP.part.setAttribute('transform', 'translate(' + hx.toFixed(1) + ' ' + (hy + 3).toFixed(1) + ')');
  }

  /* ---------- 7. a gust at each section: crossing into a new section sends a leaf or two across its hill band ----------
     By night it is a dandelion seed. One at a time; at most two in the air. */
  var bounds = [], cur = -1;
  function boundsSetup() { bounds = sections.slice(); cur = index(); }
  function index() { var line = W.innerHeight * .62, k = -1; bounds.forEach(function (s, i) { if (s.getBoundingClientRect().top < line) k = i; }); return k; }
  function boundary(dir) {
    var k = index(); if (k === cur) return;
    var crossed = dir > 0 ? bounds[k] : bounds[cur]; cur = k;
    if (!crossed || !ambientFree() || flying.length) return;
    gust(crossed, 0); later(function () { if (live && ambientFree() && flying.length < 2) gust(crossed, 1); }, 450);
  }
  function gust(sec, n) {
    var nt = night(), e = mk('i', nt ? 'pm-seed' : 'pm-leaf', sec), vw = d.documentElement.clientWidth, x0 = -sec.getBoundingClientRect().left - 30;
    var y = 40 + 50 * Math.random() + n * 22, amp = 14 + 10 * Math.random(), turns = nt ? 30 : 540 + 200 * Math.random(), kf = [], i;
    for (i = 0; i <= 8; i++) { var f = i / 8; kf.push({ transform: 'translate(' + (x0 + f * (vw + 60)).toFixed(0) + 'px,' + (y + Math.sin(f * 6.3 + n) * amp - f * 18).toFixed(0) + 'px) rotate(' + (f * turns).toFixed(0) + 'deg)', opacity: i === 0 || i === 8 ? 0 : 1 }); }
    fly(e, kf, { duration: 1900 + 400 * Math.random(), easing: 'cubic-bezier(.35,.1,.55,.9)' });
  }

  /* ---------- 8. settling when you stop: a single leaf lands by the nearest heading (it lifts away when you scroll on) ---------- */
  var landed = null;
  function settle() {
    if (!live || scrolling || landed || !ambientFree() || flying.length) return;
    var vh = W.innerHeight, best = null, bd = 1e9;
    [].forEach.call(d.querySelectorAll('.section-head h2, .prose > h2'), function (h) {
      var b = h.getBoundingClientRect(); if (b.bottom < 70 || b.top > vh - 60) return;
      var dd = Math.abs((b.top + b.bottom) / 2 - vh * .45); if (dd < bd) { bd = dd; best = h; }
    });
    if (!best) return;
    if (getComputedStyle(best).position === 'static') { best.style.position = 'relative'; prop(best, '--pm-pos', '1'); }
    var e = mk('i', (night() ? 'pm-seed' : 'pm-leaf') + ' pm-land', best); landed = e;
    // beside the end of the heading's last line (never over its words)
    var rg = d.createRange(); rg.selectNodeContents(best); var rs = rg.getClientRects(), hb = best.getBoundingClientRect(), last = rs[rs.length - 1];
    if (last) { var lx = last.right - hb.left + 14; if (lx + 20 > hb.width) { lx = Math.max(0, last.right - hb.left - 18); e.style.top = (last.top - hb.top - 20).toFixed(0) + 'px'; } else e.style.top = (last.top - hb.top + last.height * .3).toFixed(0) + 'px';
      e.style.left = lx.toFixed(0) + 'px'; e.style.marginLeft = '0'; }
    e.animate([{ transform: 'translate(-26px,-60px) rotate(-70deg)', opacity: 0 }, { transform: 'translate(-12px,-34px) rotate(20deg)', opacity: 1, offset: .35 },
      { transform: 'translate(-20px,-14px) rotate(-30deg)', offset: .7 }, { transform: 'translate(0,0) rotate(8deg)', opacity: 1 }], { duration: 1500, easing: 'ease-out', fill: 'forwards' });
  }
  function lift() {
    if (!landed) return; var e = landed; landed = null;
    var a = e.animate([{ opacity: 1 }, { transform: 'translate(30px,-30px) rotate(60deg)', opacity: 0 }], { duration: 500, easing: 'ease-in', fill: 'forwards' });
    a.onfinish = function () { drop(e); };
  }

  /* ---------- 9. a card: the sun breaks through on it, the grass at its foot leans away ---------- */
  function cardsSetup() {
    [].forEach.call(d.querySelectorAll('.leads .card.lead'), function (c) { mk('i', 'pm-layer pm-tuft l', c); mk('i', 'pm-layer pm-tuft r', c); });
  }
  function onOver(e) {
    var c = e.target.closest && e.target.closest('.leads .card.lead'); if (c && !c.classList.contains('pm-sun')) c.classList.add('pm-sun');
    var a = e.target.closest && e.target.closest('.hero-sub a, .hero-mail a, footer.site a:not(.btn), .topnav a, .prose p a:not(.btn), .prose li a:not(.btn), .prose dd a:not(.btn), .pager-contact a, figcaption a'); // 12. stroke from the side the pointer came in
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) { var b = a.getBoundingClientRect(); a.setAttribute('data-pm-from', e.clientX > b.left + b.width / 2 ? 'r' : 'l'); }
  }
  function onOut(e) {
    var c = e.target.closest && e.target.closest('.leads .card.lead');
    if (c && !(e.relatedTarget && c.contains(e.relatedTarget))) c.classList.remove('pm-sun');
  }

  /* ---------- 10. a tap on open ground: a small puff of dandelion seeds from the point ---------- */
  var down = null;
  function onDown(e) {
    down = { x: e.clientX, y: e.clientY, t: now() };
    if (e.pointerType !== 'mouse') { var c = e.target.closest && e.target.closest('.leads .card.lead'); if (c) { c.classList.add('pm-sun'); later(function () { c.classList.remove('pm-sun'); }, 1400); }
      var bc = e.target.closest && e.target.closest('.pm-board'), b = bc && bc.__pmb;
      if (b && b.w) { var pu = push = { b: b, v: clamp((e.clientX - b.l - b.w / 2) / (b.w / 2), -1, 1), touch: true }; later(function () { if (push === pu) push = null; need(); }, 450); need(); }
      if (WK) { ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now(); chk = ptr.t; ptr.ok = openGround(ptr.x, ptr.y); WK.sp = 1.2; dirtyPtr = true; need(); } }
  }
  function onUp(e) {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || now() - down.t > 600) { down = null; return; }
    down = null;
    if (!e.target.closest) return;
    var ctl = e.target.closest('a, button, summary, label');
    if (ctl) { scatter(e.pageX, e.pageY, 4); return; } // 5. a press: petals scatter from the point
    if (e.target.closest('a, button, input, select, textarea, summary, video, label, p, h1, h2, h3, h4, li, b, span, .card, .band, .more-g, .shot, .method, .topbar, details, .prose:not(.case-head), .fact, .chart-card, .flow, .term, .paper, .figure img, .legend, dl, figcaption, svg')) return;
    puff(e.pageX, e.pageY);
    if (!night()) scatter(e.pageX, e.pageY, 2, true); // and two painted petals ride out with the seeds
  }
  function puff(x, y) {
    claim(1500);
    for (var i = 0; i < 5; i++) {
      var e = mk('i', 'pm-seed', d.body), a = -Math.PI / 2 + (i - 2) * .42 + (Math.random() - .5) * .3, dist = 34 + 26 * Math.random();
      e.style.left = (x - 5) + 'px'; e.style.top = (y - 5) + 'px';
      fly(e, [{ transform: 'translate(0,0) rotate(0)', opacity: 0 }, { opacity: 1, offset: .15 },
        { transform: 'translate(' + (Math.cos(a) * dist + 14).toFixed(0) + 'px,' + (Math.sin(a) * dist - 18).toFixed(0) + 'px) rotate(' + (40 * (i - 2)) + 'deg)', opacity: 0 }],
        { duration: 1300 + 200 * Math.random(), easing: 'cubic-bezier(.2,.6,.4,1)' });
    }
  }

  /* ---------- 11. a leading figure: a warm glint runs under it once, when it first comes into view ---------- */
  var gio = null;
  function glintSetup() {
    var figs = d.querySelectorAll('.fact b, .bigfig > b, .figure .big, .stat b'); if (!figs.length || !W.IntersectionObserver) return;
    gio = new IntersectionObserver(function (en) { en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('pm-glint'); gio.unobserve(x.target); } }); }, { threshold: .9 });
    [].forEach.call(figs, function (f) { gio.observe(f); });
    offs.push(function () { gio.disconnect(); gio = null; });
  }

  /* ---------- 14. keyboard focus: a painted ring of leaves ---------- */
  var FOC = null, focEl = null;
  function onFocusIn(e) {
    var t = e.target; if (!t || !t.matches) return;
    var kbd = false; try { kbd = t.matches(':focus-visible'); } catch (x) {}
    if (!kbd) { focusOff(); return; }
    focEl = t; if (!FOC) FOC = mk('i', 'pm-focus', d.body);
    placeFocus(); FOC.classList.add('pm-on');
    if (FOC.animate) FOC.animate([{ rotate: '-2.5deg' }, { rotate: '1deg', offset: .45 }, { rotate: '0deg' }], { duration: 650, easing: 'ease-out' });
  }
  function onKey(e) {
    if ((e.key !== 'Enter' && e.key !== ' ') || !focEl || !FOC || d.activeElement !== focEl) return;
    if (FOC.animate) FOC.animate([{ scale: '1' }, { scale: '.94', offset: .35 }, { scale: '1' }], { duration: 320, easing: 'ease-out' });
    var b = focEl.getBoundingClientRect(); scatter(b.left + b.width / 2 + W.scrollX, b.top + W.scrollY + 4, 3);
  }
  function placeFocus() {
    if (!focEl || !FOC) return; var b = focEl.getBoundingClientRect(), p = 15;
    FOC.style.left = (b.left + W.scrollX - p).toFixed(0) + 'px'; FOC.style.top = (b.top + W.scrollY - p).toFixed(0) + 'px';
    FOC.style.width = (b.width + 2 * p).toFixed(0) + 'px'; FOC.style.height = (b.height + 2 * p).toFixed(0) + 'px';
  }
  function focusOff() { focEl = null; if (FOC) FOC.classList.remove('pm-on'); }

  /* ---------- 15. night: stars in the band's sky twinkle as the page moves; fireflies near a fine pointer over open ground ---------- */
  var ST = [];
  var STAR = [[22, 10], [27, 22], [33, 7], [38, 16], [24, 34], [83, 11], [88, 24], [93, 8], [96, 19], [79, 30], [41, 30], [86, 38], [30, 44], [91, 45], [18, 52]];
  function starsSetup() {
    var hosts = []; if (leads) hosts.push([leads, '']); var ft = d.querySelector('footer.site'); if (ft) hosts.push([ft, ' f']);
    hosts.forEach(function (h) {
      if (getComputedStyle(h[0]).position === 'static') return;
      for (var j = 0; j < 3; j++) {
        var bg = STAR.filter(function (s, i) { return i % 3 === j; }).map(function (s, i) { var z = 1 + ((i + j) % 2) * .6; return 'radial-gradient(' + z + 'px ' + z + 'px at ' + s[0] + '% ' + (h[1] ? s[1] * .9 : s[1] * 1.8) + '%, #f6f1dc 60%, rgba(246,241,220,0))'; }).join(',');
        var e = mk('i', 'pm-layer pm-stars' + h[1], h[0], h[0].firstChild); e.style.background = bg; ST.push(e);
      }
    });
  }
  function stars() { ST.forEach(function (e, i) { e.style.opacity = (.55 + .45 * Math.sin(sy / (60 + i * 17) + i * 1.9)).toFixed(2); }); }
  var FLY = [], ptr = { x: 0, y: 0, ok: false, t: 0 }, flyHideT = 0, chk = 0;
  function flySetup() { if (!mqFine.matches) return; for (var i = 0; i < 3; i++) FLY.push({ e: mk('i', 'pm-fly', d.body), x: 0, y: 0, ph: i * 2.1 }); }
  function openGround(x, y) { // no words within 46 px: the fireflies keep off every line of text and every board
    var pts = [[x, y], [x - 46, y], [x + 46, y], [x, y - 40], [x, y + 40]];
    for (var i = 0; i < pts.length; i++) {
      var el = d.elementFromPoint(pts[i][0], pts[i][1]);
      if (!el || (el.closest && el.closest('a, button, p, h1, h2, h3, h4, li, b, span, .card, .band, .more-g, .shot, .method, .topbar, details, video, img, .film, .prose:not(.case-head), .fact, .chart-card, .flow, .term, .paper, .legend, dl, figcaption, svg, .case-head'))) return false;
    }
    return true;
  }
  function onMove(e) {
    var t = now();
    if (WK) { var dd = Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y), dtt = Math.max(8, t - ptr.t); WK.sp = WK.sp * .7 + clamp(dd / dtt, 0, 4) * .3; }
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = t; dirtyPtr = true;
    if (t - chk > 120) { chk = t; ptr.ok = openGround(ptr.x, ptr.y); } // hit-tested here, in the event, never inside the frame
    if (e.pointerType === 'mouse') { // a board leans away from where the pointer is over it
      var c = e.target.closest && e.target.closest('.pm-board'), b = c && c.__pmb;
      if (b && b.w) push = { b: b, v: clamp((e.clientX - b.l - b.w / 2) / (b.w / 2), -1, 1) }; else if (push && !push.touch) push = null;
    }
    need();
  }
  function flyStep() {
    if (!FLY.length && !WK) return false;
    var t = now();
    var moving = false, nt = night(), fresh = t - ptr.t < 1400;
    if (WK) { // the grass parts under the pointer: wider while it moves fast, standing back up as it slows, gone 1.4 s after
      WK.sp *= .94;
      var ta = fresh && ptr.ok ? 6 + clamp(WK.sp * 16, 0, 24) : 0;
      WK.ang += (ta - WK.ang) * .18;
      if (Math.abs(ta - WK.ang) > .2) moving = true;
      WK.e.style.transform = 'translate(' + ptr.x.toFixed(1) + 'px,' + ptr.y.toFixed(1) + 'px)';
      WK.a.style.transform = 'rotate(' + (-WK.ang).toFixed(1) + 'deg)'; WK.b.style.transform = 'rotate(' + WK.ang.toFixed(1) + 'deg)';
      WK.e.classList.toggle('pm-on', fresh && ptr.ok);
    }
    if (!nt) { FLY.forEach(function (f) { f.e.classList.remove('pm-on'); }); return moving || fresh; }
    FLY.forEach(function (f, i) {
      var tx = ptr.x + Math.cos(t / 900 + f.ph) * (22 + 8 * i), ty = ptr.y + Math.sin(t / 700 + f.ph) * (16 + 6 * i) - 10;
      if (!f.x) { f.x = tx; f.y = ty; }
      f.x += (tx - f.x) * .08; f.y += (ty - f.y) * .08;
      if (Math.abs(tx - f.x) + Math.abs(ty - f.y) > .6) moving = true;
      f.e.style.transform = 'translate(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px)';
      f.e.classList.toggle('pm-on', ptr.ok);
    });
    // they drift while the pointer moves and a moment after; then they hold still and fade
    if (t - ptr.t > 1400) { FLY.forEach(function (f) { f.e.classList.remove('pm-on'); }); if (WK) WK.e.classList.remove('pm-on'); return moving; }
    return moving || t - ptr.t < 1400;
  }


  /* ================= fluid pass (Nov 20, Ryan: "the pages should feel alive and fluid", brief _tools/fluid/BRIEF.md) =========
     The whole page is a meadow in wind. Every board stands in the meadow on a spring rooted at its foot (origin bottom
     centre) and is moved by one wind field, in this one frame:
     - the gust: the same 7 s clock as the grass fringes (read once from their CSS animation), so a gust bends the hero band,
       then each hill band a beat later, and the boards in it lean a hair as it passes, left to right across the screen;
     - scroll is a gust: speed leans every board on screen, and the boards lag the page a little (inertia) and settle;
     - a board arriving on screen is blown in from upwind and settles (never a fade-up);
     - the pointer: a board leans away from where the pointer is (a touch pushes it).
     The lean is held to 1.8 px at a board's top corner and boards taller than two windows do not lean, so words being read move
     at most a couple of pixels; at rest every inline value is taken off again, so words render crisp and still.
     Between gusts the frame sleeps (one timer wakes it for the next gust of a board on screen). */
  var BOARDS = '.leads .card.lead, .more-g, main ol.method, main .band, .fact, .chart-card, .term, main > .prose:not(.case-head), .pager a';
  var BD = [], bio = null, ro = null, cyc0 = 0, CYC = 7000, gustT = 0, push = null, armed = false, swLast = 0;
  var K = 70, C = 2 * Math.sqrt(70) * .8; // a spring a little under critical: settles in about 0.6 s with no visible bounce
  function gustClock() { // phase of the grass's gust (an animation with no delay: the hero band's, or a case page's first band)
    cyc0 = now();
    try { var as = d.getAnimations(); for (var i = 0; i < as.length; i++) { var a = as[i];
      if (/^pm-gust/.test(a.animationName || '') && a.currentTime != null && !(a.effect.getTiming().delay > 0)) { cyc0 = now() - a.currentTime; break; } } } catch (e) {}
  }
  function boardsSetup() {
    var els = [].slice.call(d.querySelectorAll(BOARDS));
    els = els.filter(function (e) { return !els.some(function (o) { return o !== e && o.contains(e); }); }); // no board inside another
    gustClock();
    var tc = now();
    els.forEach(function (el) {
      var b = { el: el, r: 0, vr: 0, x: 0, vx: 0, y: 0, vy: 0, on: false, top: 0, h: 0, l: 0, w: 0, amax: 0, delay: 0, tc: tc, seen: false };
      el.__pmb = b; el.classList.add('pm-board'); BD.push(b);
      // grass tufts at the board's foot bend in the gust (the lead cards have theirs already); only where the board is
      // already positioned, so nothing about its layout changes
      if (!el.matches('.card.lead') && getComputedStyle(el).position !== 'static') b.tf = [mk('i', 'pm-layer pm-tuft pm-ft l', el), mk('i', 'pm-layer pm-tuft pm-ft r', el)];
    });
    boardsMeasure();
    if (W.IntersectionObserver) {
      bio = new IntersectionObserver(function (en) {
        en.forEach(function (x) { var b = x.target.__pmb; if (!b || !x.isIntersecting || b.seen) return; b.seen = true; if (armed && !d.hidden) arrive(b); });
        armed = true;
      }, { rootMargin: '0px 0px -6% 0px' });
      BD.forEach(function (b) { bio.observe(b.el); });
      offs.push(function () { bio.disconnect(); bio = null; });
    }
    if (W.ResizeObserver) { var roT = 0; ro = new ResizeObserver(function () { clearTimeout(roT); roT = setTimeout(function () { if (live) { boardsMeasure(); need(); } }, 200); }); ro.observe(d.body); offs.push(function () { ro.disconnect(); ro = null; clearTimeout(roT); }); }
  }
  function boardsMeasure() {
    var words = null, syy = W.scrollY || 0, vw = r.clientWidth || 1, vh = W.innerHeight, hosts = [], h0 = leads || d.querySelector('main > .case-head + .sum');
    if (h0) hosts.push(h0.getBoundingClientRect().top + syy);
    sections.forEach(function (s) { hosts.push(s.getBoundingClientRect().top + syy); });
    BD.forEach(function (b) {
      var q = b.el.getBoundingClientRect(), k = 0;
      b.top = q.top + syy - b.y; b.h = q.height; b.l = q.left - b.x; b.w = q.width;
      b.amax = q.height > vh * 2 ? 0 : Math.min(.5, 1.8 / Math.max(q.height, q.width / 2, 1) * 57.3);
      hosts.forEach(function (ht, i) { if (ht <= b.top + 100) k = i; });
      b.delay = Math.min(k, 2) * 900 + clamp((b.l + b.w / 2) / vw, 0, 1) * 350; // a beat per band down the page, and left to right
      // the tufts' CSS gust runs on the same clock: its delay is counted from when the tufts were made
      prop(b.el, '--pm-gd', (cyc0 + b.delay - b.tc).toFixed(0) + 'ms');
      if (b.tf) tuftsClear(b, words || (words = wordRects()));
    });
  }
  function wordRects() { // every visible line of words, link and picture on the page (read at measure time, never in the frame)
    var out = [], tw = d.createTreeWalker(d.querySelector('main') || d.body, NodeFilter.SHOW_TEXT), n, rg = d.createRange();
    while ((n = tw.nextNode())) { if (!/\S/.test(n.nodeValue) || (n.parentNode.checkVisibility && !n.parentNode.checkVisibility())) continue; rg.selectNodeContents(n); var rs = rg.getClientRects(); for (var i = 0; i < rs.length; i++) out.push(rs[i]); }
    [].forEach.call(d.querySelectorAll('main :is(a:not(.pm-board), button, summary, img, video)'), function (e) { out.push(e.getBoundingClientRect()); });
    return out;
  }
  function tuftsClear(b, words) { // a tuft stands only where no word, link or picture is within 3 px of it
    b.tf.forEach(function (t) {
      t.classList.remove('pm-off'); var c = t.getBoundingClientRect();
      var hit = words.some(function (n) { return n.right > c.left - 3 && n.left < c.right + 3 && n.bottom > c.top - 3 && n.top < c.bottom + 3; });
      t.classList.toggle('pm-off', hit);
    });
  }
  function arrive(b) { b.x = -9; b.vx = 0; b.r = -b.amax * 2.2; b.vr = 0; need(); }
  function gustAt(b, tn) { var u = (((tn - cyc0 - b.delay) % CYC) + CYC) % CYC; u = (u - 4100) / 1500; return u > 0 && u < 1 ? Math.pow(Math.sin(Math.PI * u), 2) : 0; }
  function untilGust(b, tn) { var u = (((tn - cyc0 - b.delay) % CYC) + CYC) % CYC; return (4100 - u + CYC) % CYC; }
  function restB(b) {
    b.r = b.vr = b.x = b.vx = b.y = b.vy = 0;
    if (b.on) { b.on = false; b.el.classList.remove('pm-spr'); b.el.style.removeProperty('rotate'); b.el.style.removeProperty('translate'); }
  }
  function sway() {
    if (!BD.length || d.hidden) return false;
    var tn = now(), dt = clamp((tn - (swLast || tn - 16)) / 1000, .004, .05), vh = W.innerHeight, busy = false, next = 1e9;
    swLast = tn;
    var wind = clamp(speed / 2.2, 0, 1), lag = clamp(vs * 1.4, -2.4, 2.4);
    for (var i = 0; i < BD.length; i++) {
      var b = BD[i];
      if (b.top - sy > vh + 40 || b.top + b.h - sy < -40) { if (b.on) restB(b); continue; }
      var g = gustAt(b, tn), p = push && push.b === b ? push.v : 0;
      var tr = b.amax * (.8 * g + .9 * wind - .7 * p), tx = b.amax ? .8 * (g + wind) : 0, ty = b.amax ? lag : 0;
      b.vr += (K * (tr - b.r) - C * b.vr) * dt; b.r += b.vr * dt;
      b.vx += (K * (tx - b.x) - C * b.vx) * dt; b.x += b.vx * dt;
      b.vy += (K * (ty - b.y) - C * b.vy) * dt; b.y += b.vy * dt;
      var still = !tr && !tx && !ty && Math.abs(b.r) < .002 && Math.abs(b.vr) < .01 && Math.abs(b.x) < .04 && Math.abs(b.vx) < .2 && Math.abs(b.y) < .04 && Math.abs(b.vy) < .2;
      if (still) { restB(b); next = Math.min(next, untilGust(b, tn)); continue; }
      busy = true;
      if (!b.on) { b.on = true; b.el.classList.add('pm-spr'); }
      b.el.style.rotate = b.r.toFixed(3) + 'deg'; b.el.style.translate = b.x.toFixed(2) + 'px ' + b.y.toFixed(2) + 'px';
    }
    clearTimeout(gustT); gustT = 0;
    if (!busy) { swLast = 0; if (next < 1e9) gustT = setTimeout(function () { gustT = 0; if (live) need(); }, Math.max(16, next - 8)); }
    return busy;
  }

  /* the pointer parts the grass: where it moves over open ground (and where a finger lands there), two clumps of grass part
     under it, more the faster it goes, and stand back up when it stops */
  var WK = null;
  function wakeSetup() { WK = { e: mk('i', 'pm-wake', d.body), ang: 0, sp: 0, lx: 0, ly: 0, lt: 0 }; WK.a = d.createElement('i'); WK.b = d.createElement('i'); WK.e.appendChild(WK.a); WK.e.appendChild(WK.b); }

  /* a press: a few painted petals (by night, seeds) scatter downwind from the point */
  function scatter(x, y, n, keep) {
    if (!keep) claim(1300);
    var nt = night();
    for (var i = 0; i < n; i++) {
      var e = mk('i', nt ? 'pm-seed pm-sc' : 'pm-petal', d.body), a = -Math.PI / 2 + .35 + (i - (n - 1) / 2) * .55 + (Math.random() - .5) * .3, dist = 26 + 22 * Math.random();
      e.style.left = (x - 5) + 'px'; e.style.top = (y - 5) + 'px';
      fly(e, [{ transform: 'translate(0,0) rotate(0)', opacity: 0 }, { opacity: 1, offset: .12 },
        { transform: 'translate(' + (Math.cos(a) * dist + 22).toFixed(0) + 'px,' + (Math.sin(a) * dist - 6 + 14).toFixed(0) + 'px) rotate(' + (120 + 90 * i) + 'deg)', opacity: 0 }],
        { duration: 1000 + 250 * Math.random(), easing: 'cubic-bezier(.2,.6,.4,1)' });
    }
  }

  /* ---------- on, off ---------- */
  function relay() { if (FP) { FP.d = null; path(); } boundsSetup(); depth(); placeFocus(); boardsMeasure(); need(); }
  function start() {
    live = true; frames = 0;
    r.classList.add('pm-live');
    sy = psy = W.scrollY || 0;
    depthSetup(); pathSetup(); boundsSetup(); cardsSetup(); glintSetup(); starsSetup(); flySetup();
    shadeDrift(); boardsSetup(); wakeSetup();
    depth(); stars(); need();
    on(W, 'scroll', onScroll, { passive: true });
    on(W, 'scroll', placeFocus, { passive: true });
    on(W, 'resize', relay, { passive: true });
    on(W, 'load', relay);
    on(d, 'pointerdown', onDown, { passive: true });
    on(d, 'pointerup', onUp, { passive: true });
    on(d, 'pointercancel', function () { down = null; }, { passive: true });
    on(d, 'pointerover', onOver, { passive: true });
    on(d, 'pointerout', onOut, { passive: true });
    on(d, 'pointermove', onMove, { passive: true });
    on(d, 'focusin', onFocusIn);
    on(d, 'keydown', onKey);
    on(d, 'focusout', function () { setTimeout(function () { if (d.activeElement !== focEl) focusOff(); }, 0); });
    on(d, 'visibilitychange', function () { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; dirtyScroll = dirtyPtr = false; clearFlying(); FLY.forEach(function (f) { f.e.classList.remove('pm-on'); }); BD.forEach(restB); clearTimeout(gustT); gustT = 0; swLast = 0; } else need(); });
  }
  function stop() {
    live = false;
    offs.forEach(function (f) { f(); }); offs = [];
    timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); clearTimeout(windT); clearTimeout(gustT); gustT = 0;
    BD.forEach(function (b) { restB(b); b.el.classList.remove('pm-board'); delete b.el.__pmb; }); BD = []; push = null; armed = false; swLast = 0; WK = null; vs = 0;
    cancelAnimationFrame(raf); raf = 0; dirtyScroll = dirtyPtr = false;
    clearFlying(); if (landed) { drop(landed); landed = null; }
    made.forEach(drop); made = [];
    styled.forEach(function (el) { if (el.style.getPropertyValue('--pm-pos')) el.style.removeProperty('position');
      ['--pm-sy', '--pm-cx', '--pm-cy', '--pm-hy', '--pm-shx', '--pm-lx', '--pm-ly', '--pm-pos', '--pm-gd'].forEach(function (k) { el.style.removeProperty(k); }); }); styled = [];
    [].forEach.call(d.querySelectorAll('.pm-sun, .pm-glint, .pm-moving'), function (e) { e.classList.remove('pm-sun', 'pm-glint', 'pm-moving'); });
    [].forEach.call(d.querySelectorAll('[data-pm-from]'), function (e) { e.removeAttribute('data-pm-from'); });
    r.classList.remove('pm-live', 'pm-windy');
    FP = FOC = null; focEl = null; hero = leads = chead = null; sections = []; shades = []; bounds = []; ST = []; FLY = []; scrolling = false;
  }
  var theme0 = r.getAttribute('data-theme');
  function sync() {
    var w = wanted(), th = r.getAttribute('data-theme');
    if (w && !live) start(); else if (!w && live) stop();
    else if (live && th !== theme0) { stop(); start(); } // a light/dark switch: day things off, night things on (and back)
    theme0 = th;
  }
  new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-look', 'class', 'data-motion', 'data-theme'] });
  if (mqReduce.addEventListener) { mqReduce.addEventListener('change', sync); mqDark.addEventListener('change', function () { if (live) { stop(); start(); } }); }
  W.__paintMotionState = function () { return { live: live, made: made.length, listeners: offs.length, frames: frames }; }; // read by the checks
  sync();
})();
