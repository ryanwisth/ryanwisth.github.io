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

  // motion, only when the visitor has not asked for less of it
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  r.classList.add('motion');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target;
      io.unobserve(t);
      t.classList.add('in');
      setTimeout(function () { t.classList.remove('reveal'); t.style.removeProperty('--d'); }, 1300);
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
      c.style.setProperty('--ry', ((x / q.width - .5) * 3.2).toFixed(2) + 'deg');
      c.style.setProperty('--rx', ((.5 - y / q.height) * 3.2).toFixed(2) + 'deg');
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

  // ---------- the guide ball ----------
  // Timed, once, on the first screen: a ball travels a thin line through the gaps between
  // boxes and each spot lights as it arrives. Any scroll, key or tap ends the run at once.
  function guide(host, dim, build, onlit) {
    var ov = d.createElement('div');
    ov.className = 'guide'; ov.setAttribute('aria-hidden', 'true');
    ov.innerHTML = '<svg focusable="false"><defs><linearGradient id="gg" gradientUnits="userSpaceOnUse"><stop class="s1" offset="0"/><stop class="s2" offset="1"/></linearGradient></defs><path class="g-track"/><path class="g-trail" pathLength="1"/></svg><i class="g-ball"></i>';
    var track = ov.querySelector('.g-track'), trail = ov.querySelector('.g-trail'), grad = ov.querySelector('linearGradient'), ball = ov.lastChild;
    var pts, cum, total, state = 0, cur = 0, anims = [], timer; // state: 0 waiting, 1 running, 2 done
    function R(el) {
      var h = host.getBoundingClientRect(), r = el.getBoundingClientRect();
      return { l: r.left - h.left, t: r.top - h.top, r: r.right - h.left, b: r.bottom - h.top, cx: (r.left + r.right) / 2 - h.left, cy: (r.top + r.bottom) / 2 - h.top };
    }
    function layout() {
      pts = build(R, innerWidth <= 620 ? 9 : 12);
      cum = [0];
      var path = 'M' + pts[0].x + ' ' + pts[0].y, i, z = pts[pts.length - 1];
      for (i = 1; i < pts.length; i++) {
        cum.push(cum[i - 1] + Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y)); // every leg is level or upright
        path += 'L' + pts[i].x + ' ' + pts[i].y;
      }
      total = cum[cum.length - 1] || 1;
      track.setAttribute('d', path); trail.setAttribute('d', path);
      grad.setAttribute('x1', pts[0].x); grad.setAttribute('y1', pts[0].y); grad.setAttribute('x2', z.x); grad.setAttribute('y2', z.y);
    }
    function pos(i) { return 'translate(' + pts[i].x + 'px,' + pts[i].y + 'px)'; }
    function each(hit, fn) { if (hit) (hit.length ? [].slice.call(hit) : [hit]).forEach(fn); }
    function finish() {
      if (state === 2) return;
      state = 2; clearTimeout(timer);
      anims.forEach(function (a) { a.cancel(); }); anims = [];
      layout();
      pts.forEach(function (p) { each(p.hit, function (el) { el.classList.add('lit'); }); });
      trail.style.strokeDashoffset = 0; ball.style.transform = pos(pts.length - 1);
      ball.classList.remove('hit'); ball.classList.add('show', 'rest');
    }
    function leg() { // the ball is sitting on stop `cur`
      if (state !== 1) return;
      var p = pts[cur], n = cur + 1;
      each(p.hit, function (el, k) {
        setTimeout(function () { if (state !== 1) return; el.classList.add('lit'); if (onlit) onlit(el); }, k * 170);
      });
      ball.classList.remove('hit'); void ball.offsetWidth; ball.classList.add('hit');
      while (n < pts.length && !pts[n].hit) n++;
      if (n >= pts.length) { timer = setTimeout(finish, 600); return; }
      timer = setTimeout(function () {
        if (state !== 1) return;
        var a = cur, span = cum[n] - cum[a] || 1, kf = [], j;
        for (j = a; j <= n; j++) kf.push({ transform: pos(j), offset: j === a ? 0 : j === n ? 1 : (cum[j] - cum[a]) / span });
        var o = { duration: Math.max(260, Math.min(820, span * 1.1)), easing: 'cubic-bezier(.45,0,.2,1)', fill: 'forwards' };
        var m = ball.animate(kf, o), t = trail.animate([{ strokeDashoffset: 1 - cum[a] / total }, { strokeDashoffset: 1 - cum[n] / total }], o);
        anims = [m, t];
        m.onfinish = function () {
          if (state !== 1) return;
          cur = n; ball.style.transform = pos(n); trail.style.strokeDashoffset = 1 - cum[n] / total;
          m.cancel(); t.cancel(); anims = [];
          leg();
        };
      }, p.dwell || (p.hit && p.hit.length ? 240 + 170 * p.hit.length : 300));
    }
    // spots wait dimmed from the first paint, so nothing flashes bright and then dims
    host.classList.add('g-host', 'g-run');
    dim.forEach(function (el) { el.classList.add('g-stop'); });
    host.appendChild(ov);
    ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { addEventListener(ev, finish, { passive: true }); });
    addEventListener('resize', function () { if (state < 2) finish(); else { layout(); ball.style.transform = pos(pts.length - 1); } });
    addEventListener('load', function () { if (state) { layout(); if (state === 2) ball.style.transform = pos(pts.length - 1); } });
    setTimeout(function () { // after the entry animations have settled
      if (state) return;
      try { layout(); } catch (e) { state = 2; host.classList.remove('g-run'); ov.remove(); return; }
      state = 1; ball.style.transform = pos(0); ball.classList.add('show');
      timer = setTimeout(leg, 200);
    }, 1000);
    setTimeout(finish, 14000);
  }
  var top0 = (window.scrollY || 0) < 40 && typeof d.body.animate === 'function';

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

  // home gutter: a stop is filled once its heading has passed the ball, and its chip pulses on arrival.
  // Read from positions on scroll (five boxes, once a frame) so a jump past a group cannot leave a stop stale.
  var gs = d.querySelectorAll('.groups .group, #how');
  if (gs.length > 1) {
    var tick = 0, rail = d.querySelector('.rail'), mark = function () {
      tick = 0;
      var line = innerHeight * .45;
      // one ball at a time: the hero's ball hands over once the gutter ball starts to follow
      r.classList.toggle('railed', !!rail && rail.offsetParent !== null && gs[0].getBoundingClientRect().top < line);
      gs.forEach(function (g) {
        var q = g.getBoundingClientRect();
        g.classList.toggle('on', q.top < line);
        g.classList.toggle('cur', q.top < line && q.bottom > line);
      });
    };
    addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(mark); }, { passive: true });
    addEventListener('resize', mark);
    mark();
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
