/* Dots & Panels: the look's own motion layer (like look-paint.js; spec page-films/out/dots/LOOK.md section 7).
   look-dots.css holds what every visitor sees move (arrivals growing in 3 held steps, flow and verdict rows stepping in,
   bars filling in 4 held steps, hover and press). This file adds only what follows the reader:
   - the thread: ahead of the head the thin ruled line, behind it the heavy key line (a filled outline that swells 2:1
     with the pen's direction, 2 px on level runs, 4 px on upright runs), the head a small yellow plate; both move in
     held steps of 16 px along the strand, never in a smooth glide;
   - held rows (the three steps, the facts) step in left to right, one held step apart, as they enter view;
   - when scrolling stops, the nearest section title's dot strip doubles its tint for one held step;
   - when the footer comes into view, the windows of its skyline switch tint one by one, left to right, then hold.
   site.js fetches it only while data-look="dots" is on and reduced motion is off. It switches itself on only while <html>
   carries data-look="dots" and .motion, and takes away everything it added (elements, classes, properties, listeners,
   observers, timers) the moment either goes: the look picker, "Pause motion", or a reduced-motion change.
   Guardrails: one moving accent at a time; decoration only (aria-hidden, no clicks, no layout change, never under words);
   at most one requestAnimationFrame per frame; nothing while the tab is hidden. No people anywhere.
   Fluid pass (Nov 20, _tools/fluid/BRIEF.md): comic timing is the fluid. Every panel's dot tints exist in three more
   sizes (every dot's radius x .78, 1.22, 1.45; the centres never move, so the tints stay in register and no tile ever
   moves on scroll). A panel steps between sizes in held drawings (132 ms): at rest a slow wave of growth runs down the
   screen every few seconds; scrolling grows the dots by scroll speed and, when it stops, they settle in damped held steps
   (down past rest, then home); the panel under the pointer, a pressed one and the one holding keyboard focus grow one or
   two sizes. One canvas the size of the viewport (pointer-events none) draws, in held drawings of 66 ms: speed lines in
   the side gutters on a fast scroll, a burst of dots and ruled rays where a finger or button presses, and a short dot
   wake behind a mouse moving over bare ground (never over words). One requestAnimationFrame loop runs only while
   something is moving; nothing runs while the tab is hidden.
   Polish pass (Nov 20, _tools/fluid/POLISH-BRIEF.md): the hold and tick come from the sheet's --dp-hold / --dp-tick; when
   only held size steps are pending the loop naps a hold between drawings instead of asking for every frame; a page put
   away (Back/Forward cache) or a hidden tab comes back at rest; a mouse press on words starts a selection, not a burst;
   while a film plays in view the rest wave calms (half as often, never on the film's own panel). */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__dotsMotion || !d.addEventListener || !W.requestAnimationFrame) return;
  W.__dotsMotion = 1;
  var NS = 'http://www.w3.org/2000/svg', STEP = 16;
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var live = false, offs = [], made = [], marked = [], timers = [], obs = [], frame = 0, busy = 0, fastAt = -1e9;
  function fast() { return performance.now() - fastAt < 220; } // a fling: what arrives now is shown at rest, never left blank behind it

  function wanted() { return r.getAttribute('data-look') === 'dots' && r.classList.contains('motion') && !mqReduce.matches; }
  function on(t, type, fn, opt) { t.addEventListener(type, fn, opt); offs.push(function () { t.removeEventListener(type, fn, opt); }); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function mark(el, cls) { el.classList.add(cls); marked.push([el, cls]); }
  function prop(el, k, v) { el.style.setProperty(k, v); marked.push([el, null, k]); }
  function raf(fn) { if (frame || d.hidden) return; frame = requestAnimationFrame(function () { frame = 0; fn(); }); }

  // ---------- the thread, in held steps ----------
  function thread() {
    var th = d.querySelector('main > .thread'), line = th && th.querySelector('.th-line'), svg = th && th.querySelector('svg');
    if (!line || !svg) return;
    var thin = d.createElementNS(NS, 'path'); thin.setAttribute('class', 'dp-th-thin'); thin.setAttribute('aria-hidden', 'true');
    var heavy = d.createElementNS(NS, 'path'); heavy.setAttribute('class', 'dp-th'); heavy.setAttribute('aria-hidden', 'true');
    svg.appendChild(thin); svg.appendChild(heavy); made.push(thin, heavy);
    var head = d.createElement('i'); head.className = 'dp-th-head'; head.setAttribute('aria-hidden', 'true'); th.appendChild(head); made.push(head);
    var last = -1, path = '', pts = [];
    function sample() { // points every 8 px along the strand, each with the pen's width there (one length lookup per point;
      // the direction comes from the next point, so a long page's strand re-samples in a third of the time)
      pts = []; var L = line.getTotalLength(), s, p, raw = [], i, dx, dy, m, q;
      for (s = 0; s <= L; s += 8) { p = line.getPointAtLength(s); raw.push([p.x, p.y, s]); }
      for (i = 0; i < raw.length; i++) {
        p = raw[i]; q = raw[Math.min(raw.length - 1, i + 1)]; if (q === p && i) { q = p; p = raw[i - 1]; }
        dx = q[0] - p[0]; dy = q[1] - p[1]; m = Math.hypot(dx, dy) || 1;
        pts.push([raw[i][0], raw[i][1], dx / m, dy / m, (2 + 2 * Math.abs(dy / m)) * Math.min(1, 0.4 + raw[i][2] / 60)]);
      }
    }
    function outline(len) { // the filled key line from the start to len: left edge out, right edge back
      var a = [], b = [], i, t, h;
      for (i = 0; i < pts.length && i * 8 <= len; i++) { t = pts[i]; h = t[4] / 2; a.push((t[0] - t[3] * h).toFixed(1) + ' ' + (t[1] + t[2] * h).toFixed(1)); b.push((t[0] + t[3] * h).toFixed(1) + ' ' + (t[1] - t[2] * h).toFixed(1)); }
      return a.length < 2 ? '' : 'M' + a.join('L') + 'L' + b.reverse().join('L') + 'Z';
    }
    function place() {
      if (!live) return;
      var dd = line.getAttribute('d') || '';
      if (dd !== path) { path = dd; thin.setAttribute('d', dd); sample(); last = -1; }
      var lo = parseFloat(line.style.strokeDasharray) || 0, q = Math.floor(lo / STEP) * STEP;
      if (q === last) return;
      last = q;
      heavy.setAttribute('d', path ? outline(q) : '');
      if (!path || q < 2) { head.style.opacity = 0; return; }
      var p = line.getPointAtLength(q);
      head.style.transform = 'translate(' + Math.round(p.x) + 'px,' + Math.round(p.y) + 'px)'; head.style.opacity = 1;
    }
    var mo = new MutationObserver(function () { raf(place); });
    mo.observe(line, { attributes: true, attributeFilter: ['style', 'd'] }); obs.push(mo);
    mark(r, 'dp-thl'); place();
  }

  // ---------- held rows: equal panels step in left to right as the row enters view ----------
  function rows() {
    var list = [].slice.call(d.querySelectorAll('.method, .facts')).filter(function (row) { return row.getBoundingClientRect().top > innerHeight; });
    if (!list.length || !('IntersectionObserver' in W)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) {
        if (!e.isIntersecting) return;
        var row = e.target; io.unobserve(row);
        row.classList.remove('dp-wait'); if (fast()) return; mark(row, 'dp-row'); busy++;
        later(function () { row.classList.remove('dp-row'); busy--; }, 1500);
      });
    }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
    obs.push(io);
    list.forEach(function (row) {
      [].forEach.call(row.children, function (c, i) { prop(c, '--dp-i', i); });
      mark(row, 'dp-wait'); io.observe(row);
    });
  }

  // ---------- scroll rest: the nearest section title's strip doubles its tint for one held step ----------
  function rest() {
    var heads = [].slice.call(d.querySelectorAll('.section-head')), t = 0;
    if (!heads.length) return;
    on(W, 'scroll', function () {
      clearTimeout(t);
      t = later(function () {
        if (!live || busy || d.hidden) return;
        var mid = innerHeight / 2, best = null, bd = 1e9;
        heads.forEach(function (h) { var b = h.getBoundingClientRect(); if (b.bottom < 0 || b.top > innerHeight) return; var k = Math.abs((b.top + b.bottom) / 2 - mid); if (k < bd) { bd = k; best = h; } });
        if (!best || best.classList.contains('dp-dbl')) return;
        mark(best, 'dp-dbl'); busy++;
        later(function () { best.classList.remove('dp-dbl'); busy--; }, 450);
      }, 180);
    }, { passive: true });
  }

  // ---------- footer: the skyline's windows switch tint one by one as it comes into view, then hold ----------
  function windows() {
    var f = d.querySelector('footer.site .wrap');
    if (!f || !('IntersectionObserver' in W)) return;
    var w = f.clientWidth, sc = Math.max(w / 1080, 1), ox = (1080 * sc - w) / 2, oy = (34 * sc - 34) / 2, n = 18, list = [], i, x, ah, el;
    for (i = 0; i < n; i++) { // the arches of --dp-a-sky (dots-art.mjs skyline(1080, 34)): 60 px apart, heights from the seed
      x = (i + 0.5) * 60 * sc - ox; ah = 34 * (0.35 + 0.35 * ((i * 7) % 5) / 4);
      if (x < 8 || x > w - 8) continue;
      el = d.createElement('i'); el.className = 'dp-win'; el.setAttribute('aria-hidden', 'true');
      el.style.left = Math.round(x - 3) + 'px'; el.style.top = Math.round((31.3 - ah + 3) * sc - oy) + 'px';
      f.appendChild(el); made.push(el); list.push(el);
    }
    var io = new IntersectionObserver(function (en) {
      if (!en[0].isIntersecting) return;
      io.disconnect(); busy++;
      list.forEach(function (el, k) { later(function () { el.classList.add('dp-on'); if (k === list.length - 1) { busy--; blink(); } }, 300 * k); });
    }, { threshold: 0.5 });
    io.observe(f); obs.push(io);
    var seen = false, io2 = new IntersectionObserver(function (en) { seen = en[0].isIntersecting; }); io2.observe(f); obs.push(io2);
    function blink() { // then, while the footer is in view, one window at a time switches its tint (a wait: the frame holds)
      later(function () { if (!live) return; if (seen && !d.hidden && list.length) list[Math.floor(Math.random() * list.length)].classList.toggle('dp-on'); blink(); }, 2600);
    }
  }


  // ---------- fluid pass: dot sizes on panels, speed lines, tap bursts, pointer wake ----------
  // the panels whose dot tints breathe (data panels are left out: a bar's tint never changes)
  var PANELS = '.topbar, .hero-film, .case-head, .bigfig, .card, .principle, .band, .section-head, .group-h, .fact, .method > li, .flow li, .band3 > div, .film, .figure, .repo-card, .pager a, .more-g, footer.site';
  var VARS = ['red-light', 'red', 'red-2', 'yellow-light', 'yellow', 'yellow-2', 'blue-light', 'blue', 'blue-2'].map(function (k) { return '--dp-t-' + k; })
    .concat(['hero-floor', 'hero-tall', 'hero-small', 'band-cols', 'band-floor', 'frieze', 'sky', 'fact', 'stair', 'v-ok'].map(function (k) { return '--dp-a-' + k; }));
  var SIZES = { m: .78, 1: 1.22, 2: 1.45 }, HOLD = 132, TICK = 66; // read again from the sheet's tokens on start
  function ms(v, f) { v = parseFloat(v); return v > 0 ? v : f; }
  function fluid() {
    // each size is held once on <html> as its own --dp-zN-* variable (so the sheet sweep knows them as this look's own);
    // a sized panel points its tints at them, and the data inside it (bars, charts) points back at the originals
    var cs = getComputedStyle(r), root = '', css = '', keep = '', k, i, v, name;
    HOLD = ms(cs.getPropertyValue('--dp-hold'), 132); TICK = ms(cs.getPropertyValue('--dp-tick'), 66);
    for (i = 0; i < VARS.length; i++) {
      v = cs.getPropertyValue(VARS[i]).trim(); if (v.indexOf('<circle') < 0) continue;
      name = VARS[i].slice(5); keep += VARS[i] + ':var(--dp-o-' + name + ');'; root += '--dp-o-' + name + ':var(' + VARS[i] + ');';
      for (k in SIZES) root += '--dp-z' + k + '-' + name + ':' + v.replace(/(<circle\b[^>]*?\br=')([\d.]+)'/g, function (m, a, n) { return a + (parseFloat(n) * SIZES[k]).toFixed(2) + "'"; }) + ';';
    }
    for (k in SIZES) css += 'html[data-look="dots"] .dp-z' + k + ' {' + VARS.map(function (x) { return root.indexOf('--dp-z' + k + '-' + x.slice(5) + ':') < 0 ? '' : x + ':var(--dp-z' + k + '-' + x.slice(5) + ');'; }).join('') + '}\n';
    css = 'html[data-look="dots"][data-look] {' + root + '}\n' + css +
      'html[data-look="dots"] :is(.dp-z1, .dp-z2, .dp-zm) :is(.track, .bars, .minis, .linechart, .legend, .chart-card) {' + keep + '}\n';
    var st = d.createElement('style'); st.id = 'dp-fluid-sizes'; st.textContent = css; d.head.appendChild(st); made.push(st);

    var cv = d.createElement('canvas'); cv.className = 'dp-fx'; cv.setAttribute('aria-hidden', 'true'); d.body.appendChild(cv); made.push(cv);
    var g = cv.getContext('2d'), thr = false, dpr = 1, vw = 0, vh = 0, gut = 16, ink = '#272015', dot = '#c8321e';
    var panels = [], top = [], bot = [], lvl = [], bump = [], hov = -1, foc = -1;
    var sy = scrollY, cur = 0, vel = 0, lastY = scrollY, lastT = 0, scrollAt = -1e9, peak = 0, settleAt = -1, wave = -1e9;
    var bursts = [], wake = [], lines = 0, lastTick = 0, lastHold = 0, drawn = false, looping = 0, nap = 0, wx = -99, wy = -99;
    var films = [].slice.call(d.querySelectorAll('video')), filmPanel = -1;

    function measure() { // layout reads happen here only (start, resize, body size change), never inside the loop
      vw = innerWidth; vh = innerHeight; dpr = Math.min(2, W.devicePixelRatio || 1);
      cv.width = Math.round(vw * dpr); cv.height = Math.round(vh * dpr); drawn = true;
      var c = getComputedStyle(r); ink = c.getPropertyValue('--dp-line-c').trim() || ink;
      dot = r.getAttribute('data-theme') === 'dark' || (!r.getAttribute('data-theme') && matchMedia('(prefers-color-scheme: dark)').matches) ? (c.getPropertyValue('--dp-yellow').trim() || '#dfc361') : (c.getPropertyValue('--dp-red').trim() || dot);
      for (var n0 = 0; n0 < panels.length; n0++) setLvl(n0, 0);
      var all = [].slice.call(d.querySelectorAll(PANELS)), left = vw;
      panels = all.filter(function (el) { return !all.some(function (o) { return o !== el && el.contains(o); }); }); // innermost only, so no panel inherits another's size
      top = []; bot = []; lvl = []; bump = []; hov = foc = -1;
      panels.forEach(function (el, n) { // layout boxes (offsets), so a panel still growing in on arrival reads at its full size
        var y = 0, x = 0, e = el; while (e) { y += e.offsetTop; x += e.offsetLeft; e = e.offsetParent; }
        top[n] = y; bot[n] = y + el.offsetHeight; lvl[n] = 0; bump[n] = null;
        if (el.offsetWidth > vw * .6 && x >= 0 && el.closest('main')) left = Math.min(left, x);
      });
      gut = Math.max(10, Math.min(140, left - 5)); thr = !!d.querySelector('main > .thread'); // the thread owns the left gutter
    }
    function setLvl(n, z) {
      if (lvl[n] === z) return;
      var el = panels[n];
      if (lvl[n]) el.classList.remove('dp-z' + (lvl[n] < 0 ? 'm' : lvl[n]));
      if (z) el.classList.add('dp-z' + (z < 0 ? 'm' : z));
      lvl[n] = z;
    }
    function which(t) { if (!t || !t.closest) return -1; var p = t.closest(PANELS); while (p && panels.indexOf(p) < 0) p = p.parentElement && p.parentElement.closest(PANELS); return p ? panels.indexOf(p) : -1; }
    function kick() { if (!looping && live && !d.hidden) { clearTimeout(nap); looping = requestAnimationFrame(loop); } }

    function target(n, now, scrolling) { // the size a panel wants this held drawing: the largest ask wins, a dip only if nothing grows
      var z = 0, dip = false, q, s;
      if (scrolling) z = cur;
      else if (settleAt >= 0) { s = Math.floor((now - settleAt) / HOLD); q = (peak > 1 ? [2, 1, 0, -1, -1, 0] : [1, 0, -1, 0])[s]; if (q > 0) z = q; else if (q < 0) dip = true; }
      // the rest wave: runs down the screen, a dip, then two held drawings grown
      s = Math.floor((now - wave - Math.max(0, (top[n] - sy) / vh) * 900) / HOLD);
      if (s >= 0 && s < 4 && n !== filmPanel) { q = [-1, 1, 1, 0][s]; if (q > 0) z = Math.max(z, q); else if (q < 0) dip = true; }
      if (bump[n]) { s = Math.floor((now - bump[n]) / HOLD); q = [2, 2, 1][s]; if (q) z = Math.max(z, q); else bump[n] = null; }
      if (n === hov || n === foc) z = Math.max(z, 1);
      return z || (dip ? -1 : 0);
    }
    function loop(now) {
      looping = 0;
      if (!live || d.hidden) return;
      var more = false, scrolling = now - scrollAt < 140, n, inView, z, i, b, s;
      if (!scrolling && peak && settleAt < 0) settleAt = now;
      if (settleAt >= 0 && now - settleAt > 6 * HOLD) { settleAt = -1; peak = 0; }
      if (now - lastHold >= HOLD) {
        lastHold = now;
        for (n = 0; n < panels.length; n++) {
          inView = bot[n] > sy - 40 && top[n] < sy + vh + 40;
          z = inView ? target(n, now, scrolling) : 0;
          setLvl(n, z); if (z) more = true;
        }
      } else more = true;
      if (scrolling || settleAt >= 0 || now - wave < 900 + 4 * HOLD + HOLD) more = true;
      if (now - lastTick >= TICK) { // the overlay, in held drawings
        lastTick = now;
        lines = scrolling && vel > 1.6 ? Math.min(9, 3 + Math.round((vel - 1.6) * 3)) : Math.max(0, lines - 3);
        if (drawn) { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); drawn = false; }
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (lines) { // speed lines: ruled strokes in the side gutters only, new ones every drawing
          g.fillStyle = ink;
          for (i = 0; i < lines * 2; i++) {
            var side = thr ? 1 : i % 2, x = 2 + Math.random() * (gut - 4), len = 30 + Math.random() * (40 + vel * 40), y0 = Math.random() * vh;
            if (side) x = vw - x;
            g.fillRect(Math.round(x), Math.round(y0), Math.random() < .3 ? 2 : 1, Math.round(len)); // whole pixels: hairlines stay hairlines
          }
          drawn = more = true;
        }
        bursts = bursts.filter(function (o) { return now - o.t < 4 * TICK; });
        bursts.forEach(function (o) {
          s = Math.min(3, Math.floor((now - o.t) / TICK)); var R = [16, 28, 40, 50][s], big = [3.4, 3.1, 2.6, 1.8][s], ring, rr, m, j, a, x, y;
          g.fillStyle = dot; g.beginPath();
          for (ring = 0; ring < 3; ring++) { // three rings of dots, largest at the front, smaller behind it
            rr = R - ring * 7; if (rr < 6) break; m = Math.max(6, Math.round(6.2832 * rr / 7.5)); a = big * (1 - ring * .3);
            for (j = 0; j < m; j++) { x = o.x + Math.cos(j * 6.2832 / m + ring * .4) * rr; y = o.y + Math.sin(j * 6.2832 / m + ring * .4) * rr; g.moveTo(x + a, y); g.arc(x, y, a, 0, 6.2832); }
          }
          g.fill();
          if (s < 2) { g.strokeStyle = ink; g.lineWidth = 2.5 - s; g.beginPath(); for (i = 0; i < 8; i++) { a = i * .7854 + .39; g.moveTo(o.x + Math.cos(a) * (R + 4), o.y + Math.sin(a) * (R + 4)); g.lineTo(o.x + Math.cos(a) * (R + 14 - s * 4), o.y + Math.sin(a) * (R + 14 - s * 4)); } g.stroke(); }
          drawn = more = true;
        });
        wake = wake.filter(function (o) { return now - o.t < 3 * TICK; });
        if (wake.length) {
          g.fillStyle = dot; g.beginPath();
          wake.forEach(function (o) { var a = [3.2, 2.3, 1.3][Math.floor((now - o.t) / TICK)] || 0; if (a) { g.moveTo(o.x + a, o.y); g.arc(o.x, o.y, a, 0, 6.2832); } });
          g.fill(); drawn = more = true;
        }
      } else if (bursts.length || wake.length || lines) more = true;
      if (!more) return;
      // only held size steps pending: nap until the next drawing is due instead of asking for every frame
      if (scrolling || bursts.length || wake.length || lines || drawn) kick();
      else { clearTimeout(nap); nap = setTimeout(kick, Math.max(4, HOLD - (now - lastHold))); }
    }

    on(W, 'scroll', function () {
      var t = performance.now(), y = scrollY, dt = Math.max(8, t - lastT);
      vel = lastT ? vel * .6 + .4 * Math.min(8, Math.abs(y - lastY) / dt) : 0; lastY = y; lastT = t; sy = y; scrollAt = t;
      var p = vel > 2.2 ? 2 : vel > .5 ? 1 : 0; cur = p; if (p > peak) peak = p; if (p > 1) fastAt = t;
      if (peak) settleAt = -1;
      kick();
    }, { passive: true });
    on(W, 'pointerdown', function (e) {
      if (e.button > 0) return;
      // a mouse pressed on words is starting a selection: no burst over them (a finger, a control or bare ground still bursts)
      var tx = e.target; if (e.pointerType === 'mouse' && tx.closest && !tx.closest('a, button, summary, label, input, video, .card, .pager a, .repo-card') && tx.closest('p, li, dd, dt, h1, h2, h3, h4, pre, code, figcaption, blockquote, td, th')) { var n0 = which(tx); if (n0 >= 0) { bump[n0] = performance.now(); kick(); } return; }
      bursts.push({ x: e.clientX, y: e.clientY, t: performance.now() }); if (bursts.length > 4) bursts.shift();
      var n = which(e.target); if (n >= 0) bump[n] = performance.now();
      kick();
    }, { passive: true });
    on(W, 'pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var n = which(e.target); if (n !== hov) { hov = n; kick(); }
      var t = e.target, bare = t === d.body || t === r || (t.closest && !t.closest('a, button, summary, p, h1, h2, h3, h4, li, dd, dt, figcaption, pre, code, img, video, svg, canvas, label, input, blockquote, table') &&
        ![].some.call(t.childNodes, function (c) { return c.nodeType === 3 && c.nodeValue.trim(); }));
      if (!bare || Math.hypot(e.clientX - wx, e.clientY - wy) < 16) return;
      wx = e.clientX; wy = e.clientY;
      wake.push({ x: Math.round(wx / 8) * 8, y: Math.round(wy / 8) * 8, t: performance.now() }); if (wake.length > 12) wake.shift();
      kick();
    }, { passive: true });
    on(d, 'mouseout', function (e) { if (!e.relatedTarget && hov >= 0) { hov = -1; kick(); } });
    // parts arriving during a fling land at rest (no snap-in), so the page never reads blank behind a fast scroll
    if ('IntersectionObserver' in W) {
      var fio = new IntersectionObserver(function (en) { en.forEach(function (e) { if (!e.isIntersecting) return; fio.unobserve(e.target); if (fast() && !e.target.classList.contains('in')) mark(e.target, 'dp-seen'); }); }, { rootMargin: '60% 0px 60% 0px' });
      [].forEach.call(d.querySelectorAll('.reveal:not(.in)'), function (el) { if (el.getBoundingClientRect().top > innerHeight * 1.6) fio.observe(el); });
      obs.push(fio);
    }
    var tm = new MutationObserver(remeasure); tm.observe(r, { attributes: true, attributeFilter: ['data-theme'] }); obs.push(tm);
    on(d, 'focusin', function (e) { foc = which(e.target); kick(); });
    on(d, 'focusout', function () { foc = -1; kick(); });
    on(d, 'keydown', function (e) { // a key press on a control throws the same burst from its middle
      if ((e.key !== 'Enter' && e.key !== ' ') || !e.target.matches || !e.target.matches('a, button, summary')) return;
      var b = e.target.getBoundingClientRect(); bursts.push({ x: b.left + b.width / 2, y: b.top + b.height / 2, t: performance.now() });
      var n = which(e.target); if (n >= 0) bump[n] = performance.now(); kick();
    });
    var mt = 0; function remeasure() { clearTimeout(mt); mt = later(function () { if (live) { measure(); kick(); } }, 150); }
    on(W, 'resize', remeasure); on(W, 'load', remeasure);
    if ('ResizeObserver' in W) { var ro = new ResizeObserver(remeasure); ro.observe(d.body); obs.push(ro); }
    on(d, 'visibilitychange', function () { if (d.hidden) calm(); else { sy = lastY = scrollY; kick(); } });
    // the rest wave: every 5.2 s while the page sits still and nothing else moves (one moving accent at a time)
    // while a film plays in view the wave calms: every other turn, and never on the film's own panel
    var turn = 0;
    function filmOn() {
      filmPanel = -1;
      for (var i = 0; i < films.length; i++) { var v = films[i], b; if (v.paused || v.ended) continue; b = v.getBoundingClientRect(); if (b.bottom > 0 && b.top < innerHeight) { filmPanel = which(v); return true; } }
      return false;
    }
    (function every() { later(function () { turn++; if (live && !d.hidden && !busy && performance.now() - scrollAt > 1500 && (!filmOn() || turn % 2)) { wave = performance.now(); kick(); } every(); }, 5200); })();
    // put away (Back/Forward cache) or hidden: come back at rest, with nothing half drawn and no queued effects
    function calm() {
      bursts = []; wake = []; lines = 0; vel = 0; cur = 0; peak = 0; settleAt = -1; lastT = 0; hov = foc = -1; wave = -1e9;
      for (var n = 0; n < panels.length; n++) { bump[n] = null; setLvl(n, 0); }
      if (looping) cancelAnimationFrame(looping); looping = 0; clearTimeout(nap);
      g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); drawn = false;
    }
    on(W, 'pagehide', calm);
    on(W, 'pageshow', function (e) { if (e.persisted && live) { sy = lastY = scrollY; scrollAt = -1e9; remeasure(); } });
    offs.push(function () { if (looping) cancelAnimationFrame(looping); looping = 0; clearTimeout(mt); clearTimeout(nap); for (var n = 0; n < panels.length; n++) setLvl(n, 0); });
    measure(); wave = performance.now() + 1400; kick();
  }

  function start() {
    if (live) return;
    live = true; busy = 0; mark(r, 'dp-live');
    try { thread(); rows(); rest(); windows(); fluid(); } catch (e) { stop(); }
  }
  function stop() {
    if (!live) return;
    live = false;
    if (frame) cancelAnimationFrame(frame); frame = 0;
    offs.forEach(function (f) { f(); }); offs = [];
    obs.forEach(function (o) { o.disconnect(); }); obs = [];
    timers.forEach(clearTimeout); timers = [];
    made.forEach(function (e) { if (e.parentNode) e.parentNode.removeChild(e); }); made = [];
    marked.forEach(function (m) { if (m[1]) m[0].classList.remove(m[1]); else m[0].style.removeProperty(m[2]); }); marked = [];
    busy = 0;
  }
  function check() { if (wanted()) start(); else stop(); }

  new MutationObserver(check).observe(r, { attributes: true, attributeFilter: ['data-look', 'class'] });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', check); else if (mqReduce.addListener) mqReduce.addListener(check);
  check();
})();
