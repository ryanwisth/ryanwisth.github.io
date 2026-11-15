/* Small progressive extras. Every page reads fully without this file. */
(function () {
  var d = document, r = d.documentElement;

  // light / dark toggle (remembers the choice)
  var b = d.querySelector('.theme-toggle');
  if (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      var cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      r.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // the 3D demo loads in place on larger screens; on phones the link opens it full screen
  d.querySelectorAll('.demo-poster').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (innerWidth < 760) return;
      e.preventDefault();
      var f = d.createElement('iframe');
      f.src = a.getAttribute('href');
      f.title = 'Live 3D family tree demo';
      f.className = 'demo-frame';
      a.replaceWith(f);
      f.focus();
    });
  });

  // ---------- seams ----------
  // Felt pieces are sewn on with a blanket stitch (a thread on the edge, ticks across it), text panels with a running
  // stitch. Drawn as SVG in px from the box size, the dash fitted so the stitches meet evenly round the corners.
  // Set up before the motion check so a reduced-motion visitor gets them too; CSS dashes stand in without scripts.
  var NS = 'http://www.w3.org/2000/svg';
  function mk(tag, cls, parent) { var e = d.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); if (parent) parent.appendChild(e); return e; }
  function sew(el, w, h) {
    var s = el._sew;
    if (!s || !w || !h || (s.w === w && s.h === h)) return;
    s.w = w; s.h = h;
    var R = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
    s.parts.forEach(function (p) { // [rect, inset, dash, period, drop]
      var i = p[1], e = p[0], iw = Math.max(0, w - 2 * i), ih = Math.max(0, h - 2 * i), rr = Math.max(0, Math.min(R - i, iw / 2, ih / 2));
      e.setAttribute('x', i); e.setAttribute('y', i + (p[4] || 0)); e.setAttribute('width', iw); e.setAttribute('height', ih);
      e.setAttribute('rx', rr.toFixed(2)); e.setAttribute('ry', rr.toFixed(2));
      if (p[2]) {
        var P = 2 * (iw + ih) - 8 * rr + 2 * Math.PI * rr, n = Math.max(4, Math.round(P / p[3]));
        e.setAttribute('stroke-dasharray', p[2] + ' ' + (P / n - p[2]).toFixed(3));
      }
    });
  }
  if (window.ResizeObserver) {
    var sro = new ResizeObserver(function (es) {
      es.forEach(function (en) {
        var bb = en.borderBoxSize && en.borderBoxSize[0], t = en.target;
        sew(t, bb ? bb.inlineSize : t.offsetWidth, bb ? bb.blockSize : t.offsetHeight);
      });
    });
    [['.card, .principle, .band, .band3 > div, .flow li', 1], ['.method > li, .fact, .chart-card, .repo-card, .tblock, .readme, .group-h', 0]].forEach(function (g) {
      d.querySelectorAll(g[0]).forEach(function (el) {
        if (el._sew) return;
        var sv = mk('svg', 'seam ' + (g[1] ? 'blanket' : 'running'));
        sv.setAttribute('aria-hidden', 'true'); sv.setAttribute('focusable', 'false');
        el._sew = { parts: g[1] ? [[mk('rect', 'sm-edge', sv), 1.2], [mk('rect', 'sm-tick', sv), 4.45, 2.2, 9.5]]
          : [[mk('rect', 'sm-sh', sv), 8, 5.6, 13, 1.2], [mk('rect', 'sm-run', sv), 8, 5.6, 13]] };
        if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
        el.appendChild(sv); sro.observe(el);
      });
    });
  } else r.classList.remove('js'); // no seams to draw: let the dashed fallback show

  // plied yarn: twist marks on a polyline that follows the strand, one every 6 px (marker-mid draws one per vertex)
  var plyN = 0;
  function plied(svg, before) {
    var id = 'ply' + (++plyN), defs = mk('defs'), m = mk('marker', '', defs), pl = mk('polyline', 'y-ply');
    m.setAttribute('id', id); m.setAttribute('markerUnits', 'userSpaceOnUse'); m.setAttribute('orient', 'auto');
    m.setAttribute('markerWidth', '1'); m.setAttribute('markerHeight', '1'); m.setAttribute('overflow', 'visible');
    mk('path', 'ply-mark', m).setAttribute('d', 'M-1.6 2.5L1.6 -2.5');
    pl.setAttribute('marker-mid', 'url(#' + id + ')');
    svg.insertBefore(defs, svg.firstChild); svg.insertBefore(pl, before || null);
    return pl;
  }
  function samples(path, len) {
    var out = [], L = Math.min(len, path.getTotalLength()), s, p;
    for (s = 0; s <= L; s += 6) { p = path.getPointAtLength(s); out.push(p.x.toFixed(1) + ',' + p.y.toFixed(1)); }
    return out;
  }
  d.querySelectorAll('.linechart .ln1').forEach(function (ln) {
    try { plied(ln.ownerSVGElement, ln.nextSibling).setAttribute('points', samples(ln, 1e9).join(' ')); } catch (e) {}
  });

  // motion, only when the visitor has not asked for less of it
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  r.classList.add('motion');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target;
      io.unobserve(t);
      t.classList.add('in');
      if (t.matches('.section-head:first-child')) { var sec = t.closest('.section'); if (sec) sec.classList.add('unzipped'); } // the zip runs
      setTimeout(function () { t.classList.remove('reveal'); t.style.removeProperty('--d'); }, 1800);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
  d.querySelectorAll('.section-head, .group-h, .card, .principle, .band, .figure, .film, .repo-card, .pager').forEach(function (el) {
    el.classList.add('reveal');
    if (el.matches('.card, .principle')) {
      el.style.setProperty('--d', ([].indexOf.call(el.parentNode.children, el) % 4) * 110 + 'ms');
    }
    io.observe(el);
  });
  d.querySelectorAll('.flow li').forEach(function (li) {
    li.style.setProperty('--i', [].indexOf.call(li.parentNode.children, li));
  });
  d.querySelectorAll('.term .ln, .legend li').forEach(function (li) {
    li.style.setProperty('--i', [].indexOf.call(li.parentNode.children, li));
  });
  var hover = matchMedia('(hover: hover)').matches;
  d.querySelectorAll('.card').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var q = c.getBoundingClientRect();
      var x = e.clientX - q.left, y = e.clientY - q.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      c.style.setProperty('--tz', ((.5 - x / q.width) * 3).toFixed(2) + 'deg'); // the pinched side lifts
    });
    // cards with a capture play it over the thumbnail while hovered or focused
    var src = c.getAttribute('data-preview'), wrap = c.querySelector('.thumb-wrap'), v;
    if (!src || !wrap || !hover) return;
    function on() {
      if (!v) {
        v = d.createElement('video');
        v.className = 'preview'; v.muted = true; v.loop = true; v.playsInline = true; v.src = src;
        v.setAttribute('aria-hidden', 'true');
        wrap.appendChild(v);
      }
      v.classList.add('on');
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    function off() { if (v) { v.classList.remove('on'); v.pause(); } }
    c.addEventListener('pointerenter', on); c.addEventListener('pointerleave', off);
    c.addEventListener('focus', on); c.addEventListener('blur', off);
  });

  // figures count up once, when first seen; the final text is what the page shipped with
  function countUp(el) {
    var txt = el.textContent, parts = txt.split(/(\d[\d,]*(?:\.\d+)?)/), t0 = 0;
    if (parts.length < 2) return;
    el.style.minHeight = el.getBoundingClientRect().height + 'px';
    function step(now) {
      if (!t0) t0 = now;
      var k = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
      if (k >= 1) { el.textContent = txt; el.style.removeProperty('min-height'); return; }
      el.textContent = parts.map(function (p, i) {
        if (!(i % 2)) return p;
        var dec = (p.split('.')[1] || '').length, n = parseFloat(p.replace(/,/g, '')) * e;
        return p.indexOf(',') > -1 ? Math.round(n).toLocaleString('en-US') : n.toFixed(dec);
      }).join('');
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      cio.unobserve(en.target);
      countUp(en.target);
    });
  }, { threshold: 0.6 });

  // figure drawings: each dot and box knows its place in line
  d.querySelectorAll('.g-dots, .g-box').forEach(function (g) {
    var k = 0;
    [].forEach.call(g.children, function (c, i) {
      c.style.setProperty('--i', i);
      if (c.className === 'x') c.style.setProperty('--k', k++);
    });
  });

  // ---------- the guide: a strand of yarn ----------
  // Timed, once, on the first screen: yarn is laid through the gaps between boxes, slack at first, and pulled
  // taut at each stop; its head is a button and each spot is sewn down as it arrives. Any scroll, key or tap ends the run.
  function guide(host, dim, build, onlit) {
    var ov = d.createElement('div');
    ov.className = 'guide'; ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = '<svg focusable="false"><path class="g-track"/><path class="y-sh"/><path class="y-edge"/><path class="g-trail"/><path class="g-m" visibility="hidden"/></svg><i class="g-ball"></i>';
    var track = ov.querySelector('.g-track'), trail = ov.querySelector('.g-trail'), meter = ov.querySelector('.g-m'), ball = ov.lastChild;
    var gsh = ov.querySelector('.y-sh'), ged = ov.querySelector('.y-edge'), gply = plied(ov.firstChild, meter);
    function yarnTo(dsh) { // the strand's shadow, edge and twist follow its shape and drawn length
      var dd = trail.getAttribute('d'); gsh.setAttribute('d', dd); ged.setAttribute('d', dd);
      trail.style.strokeDasharray = gsh.style.strokeDasharray = ged.style.strokeDasharray = dsh;
      gply.setAttribute('points', samples(trail, dsh === 'none' ? 1e9 : parseFloat(dsh)).join(' '));
    }
    var pts, cum, slack, snapT, mid, travel = null, state = 0, cur = 0, timer; // state: 0 waiting, 1 running, 2 done
    function R(el) {
      var h = host.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { l: r.left - h.left, t: r.top - h.top, r: r.right - h.left, b: r.bottom - h.top, cx: (r.left + r.right) / 2 - h.left, cy: (r.top + r.bottom) / 2 - h.top };
    }
    function dOf(k) { // the strand as far as stop k; a slack leg sags (level legs) or bows outward (upright legs)
      var s = 'M' + pts[0].x + ' ' + pts[0].y, i, a, b, mx, my, v;
      for (i = 1; i <= k; i++) {
        a = pts[i - 1]; b = pts[i]; mx = (a.x + b.x) / 2; my = (a.y + b.y) / 2; v = slack[i] || 0;
        if (Math.abs(b.y - a.y) < 1) my += Math.min(12, Math.abs(b.x - a.x) * .14) * v;
        else mx += (a.x < mid ? -1 : 1) * Math.min(8, Math.abs(b.y - a.y) * .1) * v;
        s += 'Q' + mx.toFixed(1) + ' ' + my.toFixed(1) + ' ' + b.x + ' ' + b.y;
      }
      return s;
    }
    function lenTo(k) { if (k < 1) return 0; meter.setAttribute('d', dOf(k)); return meter.getTotalLength(); }
    function layout() {
      pts = build(R, innerWidth <= 620 ? 9 : 12);
      mid = host.getBoundingClientRect().width / 2; cum = [0]; slack = [0]; snapT = [0];
      var path = 'M' + pts[0].x + ' ' + pts[0].y, i;
      for (i = 1; i < pts.length; i++) {
        cum.push(cum[i - 1] + Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y)); // every leg is level or upright
        path += 'L' + pts[i].x + ' ' + pts[i].y; slack[i] = 0; snapT[i] = 0;
      }
      track.setAttribute('d', path); trail.setAttribute('d', dOf(pts.length - 1));
    }
    function pos(i) { return 'translate(' + pts[i].x + 'px,' + pts[i].y + 'px)'; }
    function each(hit, fn) { if (hit) (hit.length ? [].slice.call(hit) : [hit]).forEach(fn); }
    function finish() {
      if (state === 2) return;
      state = 2; clearTimeout(timer); travel = null;
      layout();
      pts.forEach(function (p) { each(p.hit, function (el) { el.classList.add('lit'); }); });
      yarnTo('none'); [trail, gsh, ged].forEach(function (p) { p.classList.add('on'); }); ball.style.transform = pos(pts.length - 1);
      ball.classList.remove('hit'); ball.classList.add('show', 'rest');
    }
    function frame(now) {
      if (state !== 1) return;
      var i, t, k, e, a, b, len, p;
      for (i = 1; i < pts.length; i++) if (snapT[i]) { // a leg just pulled taut springs past straight, then rests
        t = (now - snapT[i]) / 520;
        if (t >= 1) { slack[i] = 0; snapT[i] = 0; } else slack[i] = Math.exp(-5 * t) * Math.cos(9 * t);
      }
      trail.setAttribute('d', dOf(pts.length - 1));
      if (travel) {
        if (!travel.t0) travel.t0 = now;
        k = Math.min(1, (now - travel.t0) / travel.dur); e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
        a = lenTo(travel.a); b = lenTo(travel.n); len = a + (b - a) * e;
        yarnTo(len.toFixed(1) + ' 99999');
        p = trail.getPointAtLength(len); ball.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
        if (k >= 1) {
          for (i = travel.a + 1; i <= travel.n; i++) snapT[i] = now;
          cur = travel.n; travel = null; ball.style.transform = pos(cur); leg();
        }
      } else yarnTo(lenTo(cur).toFixed(1) + ' 99999');
      requestAnimationFrame(frame);
    }
    function leg() { // the button is sitting on stop `cur`
      if (state !== 1) return;
      var p = pts[cur], n = cur + 1;
      each(p.hit, function (el, k) {
        setTimeout(function () { if (state !== 1) return; el.classList.add('lit'); if (onlit) onlit(el); }, k * 170);
      });
      ball.classList.remove('hit'); void ball.offsetWidth; ball.classList.add('hit');
      while (n < pts.length && !pts[n].hit) n++;
      if (n >= pts.length) { timer = setTimeout(finish, 900); return; }
      timer = setTimeout(function () {
        if (state !== 1) return;
        for (var i = cur + 1; i <= n; i++) { slack[i] = 1; snapT[i] = 0; } // the next legs are paid out slack
        travel = { a: cur, n: n, t0: 0, dur: Math.max(380, Math.min(950, (cum[n] - cum[cur] || 1) * 1.25)) };
      }, p.dwell || (p.hit && p.hit.length ? 240 + 170 * p.hit.length : 300));
    }
    // spots wait unstitched from the first paint, so nothing flashes bright and then dims
    host.classList.add('g-host', 'g-run');
    dim.forEach(function (el) { el.classList.add('g-stop'); });
    host.appendChild(ov);
    ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { addEventListener(ev, finish, { passive: true }); });
    addEventListener('resize', function () { if (state < 2) finish(); else { layout(); yarnTo('none'); ball.style.transform = pos(pts.length - 1); } });
    addEventListener('load', function () { if (state) { layout(); if (state === 2) { yarnTo('none'); ball.style.transform = pos(pts.length - 1); } } });
    setTimeout(function () { // after the entry animations have settled
      if (state) return;
      try { layout(); } catch (e) { state = 2; host.classList.remove('g-run'); ov.remove(); return; }
      state = 1; ball.style.transform = pos(0); ball.classList.add('show');
      requestAnimationFrame(frame);
      timer = setTimeout(leg, 200);
    }, 1100);
    setTimeout(finish, 16000);
  }
  var top0 = (window.scrollY || 0) < 40;

  // home: headline, I set, Agents write, I verify, then the "15 case studies" button
  var hh = d.querySelector('.hero-grid > div'), guided = false;
  if (hh && top0 && hh.querySelectorAll('.method > li').length === 3 && hh.querySelector('.btn.primary')) {
    var hl = hh.querySelectorAll('.method > li'), hb = hh.querySelector('.btn.primary'), h1 = hh.querySelector('h1');
    guide(hh, [].slice.call(hl), function (R, g) {
      var a = R(hl[0]), b = R(hl[1]), c = R(hl[2]), H = R(h1), B = R(hb), x = a.l - g;
      if (b.t > a.b - 2) // boxes stacked (phones): straight down the left edge
        return [{ x: x, y: H.cy, hit: h1, dwell: 300 }, { x: x, y: a.cy, hit: hl[0] }, { x: x, y: b.cy, hit: hl[1] }, { x: x, y: c.cy, hit: hl[2], dwell: 460 }, { x: x, y: B.cy, hit: hb }];
      var y1 = a.t - 10, y2 = B.t - 10, xr = c.r + 10; // once round the strip, in the gaps
      return [{ x: x, y: H.cy, hit: h1, dwell: 300 }, { x: x, y: y1 }, { x: a.l + 24, y: y1, hit: hl[0] }, { x: b.l + 24, y: y1, hit: hl[1] },
        { x: c.l + 24, y: y1, hit: hl[2], dwell: 460 }, { x: xr, y: y1 }, { x: xr, y: y2 }, { x: B.l + 24, y: y2, hit: hb }];
    });
  }

  // case pages: the visual, three figures, I set, Agents wrote, I checked; the ball rests at the stated limit
  var sum = d.querySelector('.sum');
  if (sum && top0) {
    var sv = sum.querySelector('.sum-vis'), sf = sum.querySelectorAll('.fact'), sl = sum.querySelectorAll('.method > li'), lim = sum.querySelector('.ticks .no');
    if (sv && sf.length === 3 && sl.length === 3 && lim) {
      guided = true;
      guide(sum, [sv].concat([].slice.call(sf), [].slice.call(sl)), function (R, g) {
        var V = R(sv), F = [R(sf[0]), R(sf[1]), R(sf[2])], M = [R(sl[0]), R(sl[1]), R(sl[2])], L = R(lim), x = V.l - g, p = [];
        if (F[0].l > V.r - 1) { // figures beside the visual: down the gap between them, then back along the gap above the strip
          var cx = (V.r + F[0].l) / 2, yt = Math.min(V.t, F[0].t) - 10, hy = (Math.max(V.b, F[2].b) + M[0].t) / 2;
          p.push({ x: V.l + 24, y: yt, hit: sv }, { x: cx, y: yt });
          F.forEach(function (f, i) { p.push({ x: cx, y: f.cy, hit: sf[i] }); });
          p.push({ x: cx, y: hy }, { x: x, y: hy });
        } else {
          p.push({ x: x, y: V.t + 24, hit: sv });
          if (F[1].t > F[0].b - 2) F.forEach(function (f, i) { p.push({ x: x, y: f.cy, hit: sf[i] }); });
          else p.push({ x: x, y: F[0].cy, hit: sf });
        }
        if (M[1].t > M[0].b - 2) { // strip stacked
          M.forEach(function (m, i) { p.push({ x: x, y: m.t + 20, hit: sl[i] }); });
          p.push({ x: x, y: L.cy, hit: lim });
        } else { // under the strip, then up its right side to the limit line
          var yb = M[0].b + 10, xr = M[2].r + g;
          p.push({ x: x, y: M[0].cy, hit: sl[0] }, { x: x, y: yb }, { x: M[1].l + 24, y: yb, hit: sl[1] }, { x: M[2].l + 24, y: yb, hit: sl[2], dwell: 460 }, { x: xr, y: yb }, { x: xr, y: L.cy, hit: lim });
        }
        return p;
      }, function (el) { if (el.classList.contains('fact')) countUp(el.querySelector('b')); });
    }
  }
  d.querySelectorAll('.fact b, .card .stat b, .collage .float b').forEach(function (b) {
    if (guided && b.closest('.sum')) return; // these count when the ball lands on them
    cio.observe(b);
  });

  // home: one thread winds down the case studies, past a button on each group label. It is drawn as far as the
  // reading line (45% down the window), read from scroll position once a frame, so a jump cannot leave it stale.
  var th = d.querySelector('.thread'), grs = d.querySelectorAll('.groups .group');
  if (th && grs.length) {
    th.innerHTML = '<svg focusable="false"><path class="th-holes"/><path class="y-sh"/><path class="y-edge"/><path class="th-line"/></svg><i class="th-head"></i>';
    var holes = th.querySelector('.th-holes'), yarn = th.querySelector('.th-line'), head = th.lastChild, stops = [], tlen = 0, tick = 0;
    var tsh = th.querySelector('.y-sh'), ted = th.querySelector('.y-edge'), tply = plied(th.firstChild), tpts = [];
    var lay = function () {
      stops = []; th.classList.remove('live');
      if (th.offsetParent === null) return; // hidden on narrow screens
      var H = th.getBoundingClientRect(), s = '', px = 0, pb = 0;
      [].forEach.call(grs, function (g, i) {
        var q = g.getBoundingClientRect(), h = g.querySelector('.group-h').getBoundingClientRect();
        var right = (h.left + h.right) / 2 > H.left + H.width / 2, x = right ? H.width + 14 : -14;
        var bx = (right ? h.right - 35 : h.left + 35) - H.left, by = h.top + 35 - H.top, t = q.top - H.top;
        s += i ? 'C' + px + ' ' + (pb + 50) + ' ' + x + ' ' + (t - 50) + ' ' + x + ' ' + (t + 10) : 'M' + x + ' ' + (t - 24);
        s += 'L' + x + ' ' + (by - 22) + 'Q' + x + ' ' + by + ' ' + bx + ' ' + by + 'Q' + x + ' ' + by + ' ' + x + ' ' + (by + 22);
        pb = q.bottom - H.top - 10; s += 'L' + x + ' ' + pb;
        stops.push(by); px = x;
      });
      s += 'L' + px + ' ' + (pb + 30);
      holes.setAttribute('d', s); yarn.setAttribute('d', s); tsh.setAttribute('d', s); ted.setAttribute('d', s);
      tlen = yarn.getTotalLength(); tpts = samples(yarn, tlen); th.classList.add('live');
    };
    var run = function () {
      tick = 0;
      if (!stops.length) return;
      var y = innerHeight * .45 - th.getBoundingClientRect().top, lo = 0, hi = tlen, m, k, p;
      for (k = 0; k < 18; k++) { m = (lo + hi) / 2; if (yarn.getPointAtLength(m).y < y) lo = m; else hi = m; }
      tsh.style.strokeDasharray = ted.style.strokeDasharray = yarn.style.strokeDasharray = lo.toFixed(1) + ' 99999';
      tply.setAttribute('points', tpts.slice(0, Math.floor(lo / 6) + 1).join(' '));
      p = yarn.getPointAtLength(lo); head.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
      head.style.opacity = lo < 2 ? 0 : 1;
      [].forEach.call(grs, function (g, i) { g.classList.toggle('on', stops[i] <= y); });
    };
    addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(run); }, { passive: true });
    addEventListener('resize', function () { lay(); run(); });
    addEventListener('load', function () { lay(); run(); });
    lay(); run();
  }

  // screen captures: play while on screen, pause off screen, with a pause button
  var ICON = '<svg class="i-pause" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg><svg class="i-play" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.2v11.6L13.5 8z"/></svg>';
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting && !v.dataset.held) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { threshold: 0.35 });
  d.querySelectorAll('video[data-auto]').forEach(function (v) {
    var box = v.parentNode, btn = d.createElement('button');
    v.removeAttribute('controls'); v.muted = true;
    box.classList.add('vid');
    btn.type = 'button'; btn.className = 'vid-toggle'; btn.innerHTML = ICON;
    btn.setAttribute('aria-label', 'Pause or play this capture');
    function flip(e) {
      if (e) e.preventDefault();
      if (v.paused) { delete v.dataset.held; v.play(); } else { v.dataset.held = '1'; v.pause(); }
    }
    btn.addEventListener('click', flip); v.addEventListener('click', flip);
    v.addEventListener('pause', function () { box.classList.toggle('paused', !!v.dataset.held); });
    v.addEventListener('play', function () { box.classList.remove('paused'); });
    box.appendChild(btn);
    // a clip with a soundtrack starts muted (browsers require it); this button turns the sound on
    if (v.hasAttribute('data-sound')) {
      var sb = d.createElement('button');
      sb.type = 'button'; sb.className = 'vid-sound';
      var label = function () { sb.textContent = v.muted ? '\u266A Sound on' : '\u266A Sound off'; sb.setAttribute('aria-pressed', v.muted ? 'false' : 'true'); };
      sb.addEventListener('click', function (e) {
        e.preventDefault();
        v.muted = !v.muted;
        if (!v.muted) { v.currentTime = 0; delete v.dataset.held; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        label();
      });
      label(); box.appendChild(sb);
    }
    vio.observe(v);
  });
})();
