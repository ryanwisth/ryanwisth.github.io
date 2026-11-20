/* Paint & Meadow: the moving extras that need a script (the lively pass, Nov 19; brief _tools/paint/LIVELY.md).
   look-paint.css paints the look and holds the one constant motion (wind in the grass); this file adds only what follows
   the reader: scroll, pointer, press, keyboard focus. site.js fetches it only while the page wears data-look="paint" and
   the visitor has not asked for reduced motion. It switches itself on only while <html> carries both data-look="paint" and
   .motion, and takes away everything it added (listeners, elements, classes, properties) the moment either goes: the
   look picker, "Pause motion", or a reduced-motion change. No people or characters anywhere (Ryan, Nov 19).

   The guardrails (the same as Brush & Scroll's):
   - one moving accent at a time: the ambient ones (a gust's leaves, the leaf that lands) wait while one the reader caused
     (a puff of seeds) is showing, and are cleared by it;
   - scroll-driven movement stops when the scroll stops; wind in the grass (CSS) is the only constant;
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
  var raf = 0, dirtyScroll = false, dirtyPtr = false, sy = 0, psy = 0, pt = 0, speed = 0, idleT = 0, windT = 0, scrolling = false;
  function need() { if (!raf && !d.hidden) raf = requestAnimationFrame(frame); }
  function onScroll() { dirtyScroll = true; need(); }
  function frame(t) {
    raf = 0; frames++;
    if (dirtyScroll) { dirtyScroll = false; scrollFrame(t); }
    if (dirtyPtr) { dirtyPtr = false; if (flyStep()) dirtyPtr = true; }
    if (dirtyScroll || dirtyPtr) need();
  }
  function scrollFrame(t) {
    sy = W.scrollY || 0;
    var dt = Math.max(8, t - (pt || t - 16)), v = Math.abs(sy - psy) / dt, dir = sy > psy ? 1 : sy < psy ? -1 : 0;
    speed = speed * .6 + v * .4; psy = sy; pt = t;
    if (!scrolling && dir) startMove();
    if (speed > .9) { r.classList.add('pm-windy'); clearTimeout(windT); windT = 0; } // 1. faster scrolling raises the wind
    depth(); path(); stars();
    if (dir) boundary(dir);
    clearTimeout(idleT); idleT = setTimeout(rest, 160); // (not later(): one timer a frame would pile up in its list)
  }
  function startMove() { scrolling = true; if (FP) FP.th.classList.add('pm-moving'); lift(); }
  function rest() {
    scrolling = false; speed = 0; pt = 0;
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
    if (e.pointerType !== 'mouse') { var c = e.target.closest && e.target.closest('.leads .card.lead'); if (c) { c.classList.add('pm-sun'); later(function () { c.classList.remove('pm-sun'); }, 1400); } }
  }
  function onUp(e) {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || now() - down.t > 600) { down = null; return; }
    down = null;
    if (!e.target.closest || e.target.closest('a, button, input, select, textarea, summary, video, label, p, h1, h2, h3, h4, li, b, span, .card, .band, .more-g, .shot, .method, .topbar, details, .prose:not(.case-head), .fact, .chart-card, .flow, .term, .paper, .figure img, .legend, dl, figcaption, svg')) return;
    puff(e.pageX, e.pageY);
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
    if (!FLY.length || !night()) return;
    ptr.x = e.clientX; ptr.y = e.clientY; ptr.t = now(); dirtyPtr = true; need();
  }
  function flyStep() {
    if (!FLY.length) return false;
    var t = now();
    if (t - chk > 120) { chk = t; ptr.ok = night() && openGround(ptr.x, ptr.y); }
    var moving = false;
    FLY.forEach(function (f, i) {
      var tx = ptr.x + Math.cos(t / 900 + f.ph) * (22 + 8 * i), ty = ptr.y + Math.sin(t / 700 + f.ph) * (16 + 6 * i) - 10;
      if (!f.x) { f.x = tx; f.y = ty; }
      f.x += (tx - f.x) * .08; f.y += (ty - f.y) * .08;
      if (Math.abs(tx - f.x) + Math.abs(ty - f.y) > .6) moving = true;
      f.e.style.transform = 'translate(' + f.x.toFixed(1) + 'px,' + f.y.toFixed(1) + 'px)';
      f.e.classList.toggle('pm-on', ptr.ok);
    });
    // they drift while the pointer moves and a moment after; then they hold still and fade
    if (t - ptr.t > 1400) { FLY.forEach(function (f) { f.e.classList.remove('pm-on'); }); return false; }
    return moving || t - ptr.t < 1400;
  }

  /* ---------- on, off ---------- */
  function relay() { if (FP) { FP.d = null; path(); } boundsSetup(); depth(); placeFocus(); }
  function start() {
    live = true; frames = 0;
    r.classList.add('pm-live');
    sy = psy = W.scrollY || 0;
    depthSetup(); pathSetup(); boundsSetup(); cardsSetup(); glintSetup(); starsSetup(); flySetup();
    depth(); stars();
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
    on(d, 'focusout', function () { setTimeout(function () { if (d.activeElement !== focEl) focusOff(); }, 0); });
    on(d, 'visibilitychange', function () { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; dirtyScroll = dirtyPtr = false; clearFlying(); FLY.forEach(function (f) { f.e.classList.remove('pm-on'); }); } });
  }
  function stop() {
    live = false;
    offs.forEach(function (f) { f(); }); offs = [];
    timers.forEach(clearTimeout); timers = []; clearTimeout(idleT); clearTimeout(windT);
    cancelAnimationFrame(raf); raf = 0; dirtyScroll = dirtyPtr = false;
    clearFlying(); if (landed) { drop(landed); landed = null; }
    made.forEach(drop); made = [];
    styled.forEach(function (el) { if (el.style.getPropertyValue('--pm-pos')) el.style.removeProperty('position');
      ['--pm-sy', '--pm-cx', '--pm-cy', '--pm-hy', '--pm-shx', '--pm-lx', '--pm-ly', '--pm-pos'].forEach(function (k) { el.style.removeProperty(k); }); }); styled = [];
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
