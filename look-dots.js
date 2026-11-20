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
   at most one requestAnimationFrame per frame; nothing while the tab is hidden. No people anywhere. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__dotsMotion || !d.addEventListener || !W.requestAnimationFrame) return;
  W.__dotsMotion = 1;
  var NS = 'http://www.w3.org/2000/svg', STEP = 16;
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var live = false, offs = [], made = [], marked = [], timers = [], obs = [], frame = 0, busy = 0;

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
    function sample() { // points every 6 px along the strand, each with the pen's width there
      pts = []; var L = line.getTotalLength(), s, p, q, dx, dy, m;
      for (s = 0; s <= L; s += 6) {
        p = line.getPointAtLength(s); q = line.getPointAtLength(Math.min(L, s + 3)); dx = q.x - p.x; dy = q.y - p.y; m = Math.hypot(dx, dy) || 1;
        pts.push([p.x, p.y, dx / m, dy / m, (2 + 2 * Math.abs(dy / m)) * Math.min(1, 0.4 + s / 60)]);
      }
    }
    function outline(len) { // the filled key line from the start to len: left edge out, right edge back
      var a = [], b = [], i, t, h;
      for (i = 0; i < pts.length && i * 6 <= len; i++) { t = pts[i]; h = t[4] / 2; a.push((t[0] - t[3] * h).toFixed(1) + ' ' + (t[1] + t[2] * h).toFixed(1)); b.push((t[0] + t[3] * h).toFixed(1) + ' ' + (t[1] - t[2] * h).toFixed(1)); }
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
        row.classList.remove('dp-wait'); mark(row, 'dp-row'); busy++;
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
      list.forEach(function (el, k) { later(function () { el.classList.add('dp-on'); if (k === list.length - 1) busy--; }, 300 * k); });
    }, { threshold: 0.5 });
    io.observe(f); obs.push(io);
  }

  function start() {
    if (live) return;
    live = true; busy = 0; mark(r, 'dp-live');
    try { thread(); rows(); rest(); windows(); } catch (e) { stop(); }
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
