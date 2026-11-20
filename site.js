/* Small progressive extras. Every page reads fully without this file. */
(function () {
  var d = document, r = d.documentElement;

  // light / dark toggle (remembers the choice). The browser bar's colour follows the click: both theme-color tags
  // (one per system setting; look.js has already set them for the look) are given the chosen theme's colour.
  var metas = [].slice.call(d.querySelectorAll('meta[name="theme-color"]')), tint = { light: null, dark: null };
  metas.forEach(function (m) { tint[/dark/.test(m.media) ? 'dark' : 'light'] = m.content; });
  function barTint() {
    var t = r.dataset.theme;
    metas.forEach(function (m) { var c = t ? tint[t] : tint[/dark/.test(m.media) ? 'dark' : 'light']; if (c) m.content = c; });
  }
  barTint();
  var b = d.querySelector('.theme-toggle');
  if (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      var cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      r.dataset.theme = next; barTint();
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }
  // Back or Forward from the page cache: take up a light/dark choice made on another page since
  addEventListener('pageshow', function (e) {
    if (!e.persisted) return;
    var t = null; try { t = localStorage.getItem('theme'); } catch (er) {}
    if (t && t !== r.dataset.theme) { r.dataset.theme = t; barTint(); }
  });

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
    [['.card, .principle, .band, .band3 > div, .flow li', 1], ['.method > li, .fact, .chart-card, .repo-card, .tblock, .readme', 0]].forEach(function (g) {
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

  // ---------- selection: a loop of yellow yarn ----------
  // Hover or keyboard focus on a pressable patch draws a loop of yarn round it, 5 to 9 px outside the box. The SVG is
  // built on first use and redrawn in px when the box changes size; CSS shows it and draws it in. Set up before the
  // motion check, so a reduced-motion visitor gets the loop too (already drawn). Without scripts the outline stays.
  if (window.ResizeObserver) {
    var loopDraw = function (el, w, h) {
      var L = el._loop;
      if (!L || !w || !h || (L.w === w && L.h === h)) return;
      L.w = w; L.h = h;
      var cs = getComputedStyle(el), bl = parseFloat(cs.borderLeftWidth) || 0, bt = parseFloat(cs.borderTopWidth) || 0;
      var R = Math.min(Math.max(parseFloat(cs.borderTopLeftRadius) || 0, 8), w / 2, h / 2);
      var sw = w - 2 * R, sh = h - 2 * R, q = Math.PI * R / 2, P = 2 * (sw + sh) + 4 * q, C = Math.cos, S = Math.sin;
      var segs = [ // the box's own rounded outline, walked clockwise from the top left: [length, point and outward normal at t]
        [sw, function (t) { return [R + t, 0, 0, -1]; }],
        [q, function (t) { var a = -Math.PI / 2 + t / R; return [w - R + R * C(a), R + R * S(a), C(a), S(a)]; }],
        [sh, function (t) { return [w, R + t, 1, 0]; }],
        [q, function (t) { var a = t / R; return [w - R + R * C(a), h - R + R * S(a), C(a), S(a)]; }],
        [sw, function (t) { return [w - R - t, h, 0, 1]; }],
        [q, function (t) { var a = Math.PI / 2 + t / R; return [R + R * C(a), h - R + R * S(a), C(a), S(a)]; }],
        [sh, function (t) { return [0, h - R - t, -1, 0]; }],
        [q, function (t) { var a = Math.PI + t / R; return [R + R * C(a), R + R * S(a), C(a), S(a)]; }]
      ];
      var at = function (s) {
        s = ((s % P) + P) % P;
        for (var i = 0; i < 7 && s > segs[i][0]; i++) s -= segs[i][0];
        return segs[i][1](Math.min(s, segs[i][0]));
      };
      // a lap and a little more, so the yarn crosses itself; the gap swells between 5 and 9 px (3.5 waves a lap,
      // so the overlap sits at a different distance and the two ends cross instead of lying on each other)
      var s0 = 2 * sw + sh + 3 * q + sh * .35, run = P * 1.08, n = Math.max(24, Math.ceil(run / 5)), dd = '';
      for (var k = 0; k <= n; k++) {
        var s = s0 + run * k / n, p = at(s), o = 7 + 2 * S(2 * Math.PI * 3.5 * (s - s0) / P);
        dd += (k ? 'L' : 'M') + (p[0] + p[2] * o).toFixed(1) + ' ' + (p[1] + p[3] * o).toFixed(1);
      }
      var sv = L.svg;
      sv.style.left = -bl + 'px'; sv.style.top = -bt + 'px'; sv.style.width = w + 'px'; sv.style.height = h + 'px';
      L.paths.forEach(function (e) { e.setAttribute('d', dd); });
      var len = L.paths[1].getTotalLength();
      L.paths.forEach(function (e) { e.setAttribute('stroke-dasharray', len.toFixed(1) + ' ' + (len + 20).toFixed(1)); });
      sv.style.setProperty('--len', len.toFixed(1) + 'px');
    };
    var lro = new ResizeObserver(function (es) {
      es.forEach(function (en) {
        var bb = en.borderBoxSize && en.borderBoxSize[0], t = en.target;
        loopDraw(t, bb ? bb.inlineSize : t.offsetWidth, bb ? bb.blockSize : t.offsetHeight);
      });
    });
    var loopOn = function () {
      var el = this;
      if (el._loop) return;
      var sv = mk('svg', 'loop');
      sv.setAttribute('aria-hidden', 'true'); sv.setAttribute('focusable', 'false');
      el._loop = { svg: sv, paths: [mk('path', 'lp-under', sv), mk('path', 'lp-yarn', sv), mk('path', 'lp-hi', sv)] };
      el._loop.paths[0].setAttribute('transform', 'translate(0 1)');
      el._loop.paths[2].setAttribute('transform', 'translate(-.5 -1)');
      if (getComputedStyle(el).position === 'static') el.style.position = 'relative';
      el.appendChild(sv); el.classList.add('lp-on'); lro.observe(el);
    };
    d.querySelectorAll('.topnav a, .groupnav a, .pager a, .btn, .card').forEach(function (el) {
      el.addEventListener('pointerenter', loopOn); el.addEventListener('focusin', loopOn);
    });
  }

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

  // ---------- motion: off when the system asks for less of it, or when "Pause motion" (footer) is on ----------
  // Paused is html[data-motion="paused"] (set before the first paint by look.js from localStorage "motion") and no
  // .motion class: every look sheet runs its loops only under html.motion, and style.css stops the rest under the attribute.
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function paused() { return r.getAttribute('data-motion') === 'paused'; }
  function moving() { return !reduce && !paused(); }

  // screen captures and films: play while on screen (only when motion is on), pause off screen, with a pause button.
  // Built before the motion return, so a reduced-motion or paused visitor still gets the buttons (the film then waits for a click).
  var ICON = '<svg class="i-pause" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg><svg class="i-play" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.2v11.6L13.5 8z"/></svg>';
  var vio = 'IntersectionObserver' in window && new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      v._seen = en.isIntersecting;
      if (en.isIntersecting && !v.dataset.held && (moving() || !v.muted)) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else if (!en.isIntersecting) v.pause();
    });
  }, { threshold: 0.35 });
  var autos = [].slice.call(d.querySelectorAll('video[data-auto]'));
  autos.forEach(function (v) {
    var box = v.parentNode, bar = d.createElement('div'), btn = d.createElement('button');
    v.removeAttribute('controls'); v.muted = true;
    box.classList.add('vid');
    bar.className = 'vid-bar';
    // one fixed name; aria-pressed says whether it is paused (the icon shows the same)
    btn.type = 'button'; btn.className = 'vid-toggle'; btn.innerHTML = ICON;
    btn.setAttribute('aria-label', v.hasAttribute('data-sound') ? 'Pause film' : 'Pause capture');
    function state() { box.classList.toggle('paused', v.paused); btn.setAttribute('aria-pressed', v.paused ? 'true' : 'false'); }
    function flip(e) {
      if (e) e.preventDefault();
      if (v.paused) { delete v.dataset.held; var p = v.play(); if (p && p.catch) p.catch(function () {}); } else { v.dataset.held = '1'; v.pause(); }
    }
    btn.addEventListener('click', flip); v.addEventListener('click', flip);
    v.addEventListener('pause', state); v.addEventListener('play', state);
    bar.appendChild(btn);
    // a clip with a soundtrack starts muted (browsers require it); this button turns the sound on
    // (its label is the action, worded so it cannot be read as the state)
    if (v.hasAttribute('data-sound')) {
      var sb = d.createElement('button');
      sb.type = 'button'; sb.className = 'vid-sound';
      var label = function () { sb.textContent = v.muted ? '\u266A Play with sound' : '\u266A Mute'; sb.setAttribute('aria-pressed', v.muted ? 'false' : 'true'); };
      sb.addEventListener('click', function (e) {
        e.preventDefault();
        v.muted = !v.muted;
        if (!v.muted) { v.currentTime = 0; delete v.dataset.held; var p = v.play(); if (p && p.catch) p.catch(function () {}); }
        label();
      });
      label(); bar.insertBefore(sb, btn);
    }
    box.appendChild(bar);
    state();
    if (vio) vio.observe(v);
  });

  // "Pause motion" / "Resume motion": a button in the footer, remembered by this browser. Not shown when the system
  // already asks for reduced motion (everything is still then).
  var foot = d.querySelector('footer.site .wrap');
  if (foot && !reduce) {
    var mb = d.createElement('button');
    mb.type = 'button'; mb.className = 'motion-toggle';
    var mlabel = function () { mb.textContent = paused() ? 'Resume motion' : 'Pause motion'; };
    mb.addEventListener('click', function () {
      var stop = !paused();
      if (stop) { r.setAttribute('data-motion', 'paused'); r.classList.remove('motion'); }
      else { r.removeAttribute('data-motion'); r.classList.add('motion'); }
      try { if (stop) localStorage.setItem('motion', 'paused'); else localStorage.removeItem('motion'); } catch (e) {}
      autos.forEach(function (v) {                 // looping films stop; one playing with sound is the reader's choice
        if (stop && v.muted && !v.paused) v.pause();
        else if (!stop && v._seen && !v.dataset.held && v.paused) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      });
      mlabel();
    });
    mlabel(); foot.appendChild(mb);
  }

  // Each look's moving extras (scroll, pointer, selection, focus) live in look-<name>.js beside this file (look-yarn.js
  // for the default look, which carries no data-look). One is fetched only while its look is worn and reduced motion
  // is not asked for, and again if the look changes to it. Each script switches itself off when its look is taken off.
  var jsBase = (d.currentScript && d.currentScript.src || '').replace(/site\.js[^\/]*$/, '');
  var LIVE = { yarn: 1, wash: 1, brush: 1, cel: 1 };
  function lookJs() {
    var k = r.getAttribute('data-look') || 'yarn';
    if (reduce || !jsBase || !LIVE[k] || d.getElementById('look-' + k + '-js')) return;
    var s = d.createElement('script'); s.id = 'look-' + k + '-js'; s.async = true; s.src = jsBase + 'look-' + k + '.js'; d.body.appendChild(s);
  }
  if (window.MutationObserver) new MutationObserver(lookJs).observe(r, { attributes: true, attributeFilter: ['data-look'] });

  // the rest is decoration that moves: built only when motion is on at load
  if (!moving() || !('IntersectionObserver' in window)) { lookJs(); return; }
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

  // figures show their final value at once: a count-up shows wrong figures mid-count ("1 of 1")

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
      // The run stays on the first screen: it always reaches its first stop, then goes on only as far as the stops in view,
      // so the ball rests where the reader can see it. A stop left out is simply sewn down.
      var all = build(R, innerWidth <= 620 ? 9 : 12), top = host.getBoundingClientRect().top + (window.scrollY || 0), must = 1, keep = 1;
      while (must < all.length - 1 && !all[must].hit) must++;
      while (keep < all.length && top + all[keep].y <= innerHeight - 20) keep++;
      keep = Math.max(keep, must + 1);
      while (keep > must + 1 && !all[keep - 1].hit) keep--;
      pts = all.slice(0, keep);
      all.slice(keep).forEach(function (p) { each(p.hit, function (el) { el.classList.add('lit'); }); });
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

  // home, three-lead first screen: headline, the film under it, then the three lead cases; the ball rests on the last one in view
  // (with the film on top that is the film on most screens)
  var lh = d.querySelector('.lead-hero > .wrap');
  if (lh && top0 && lh.querySelectorAll('.leads > .lead').length === 3 && lh.querySelector('h1')) {
    var lc = lh.querySelectorAll('.leads > .lead'), l1 = lh.querySelector('h1'), lf = lh.querySelector('.hero-film .shot');
    guide(lh, [].slice.call(lc), function (R, g) {
      var a = R(lc[0]), b = R(lc[1]), c = R(lc[2]), H = R(l1), F = lf && R(lf), x = a.l - g;
      var p = [{ x: x, y: H.cy, hit: l1, dwell: 300 }];
      if (F && F.t > H.b - 2 && F.b < a.t) p.push({ x: x, y: Math.min(F.t + 40, F.cy), hit: lf, dwell: 460 }); // the film sits between the headline and the cards
      if (b.t > a.b - 2) // cards stacked (phones): straight down the left edge
        return p.concat([{ x: x, y: a.t + 40, hit: lc[0] }, { x: x, y: b.t + 40, hit: lc[1] }, { x: x, y: c.t + 40, hit: lc[2] }]);
      var y1 = a.t - 10; // along the gap above the cards
      return p.concat([{ x: x, y: y1 }, { x: a.l + 24, y: y1, hit: lc[0] }, { x: b.l + 24, y: y1, hit: lc[1] }, { x: c.l + 24, y: y1, hit: lc[2] }]);
    });
  }

  // case pages: the visual, three figures, I set, Agents wrote, I checked; the ball rests at the stated limit
  var sum = d.querySelector('.sum');
  if (sum && top0) {
    var sv = sum.querySelector('.sum-vis'), sf = sum.querySelectorAll('.fact'), sl = sum.querySelectorAll('.method > li'), lim = sum.querySelector('.ticks .no');
    if (sv && sf.length === 3 && (sl.length === 3 || !sl.length)) { // the strip now sits lower on the page, in its own block: then the ball rests on the third figure
      guided = true;
      guide(sum, [sv].concat([].slice.call(sf), [].slice.call(sl)), function (R, g) {
        var V = R(sv), F = [R(sf[0]), R(sf[1]), R(sf[2])], M = sl.length ? [R(sl[0]), R(sl[1]), R(sl[2])] : null, L = lim && R(lim), x = V.l - g, p = [];
        if (F[0].l > V.r - 1) { // figures beside the visual: down the gap between them, then back along the gap above the strip
          var cx = (V.r + F[0].l) / 2, yt = Math.min(V.t, F[0].t) - 10, hy = M ? (Math.max(V.b, F[2].b) + M[0].t) / 2 : 0;
          p.push({ x: V.l + 24, y: yt, hit: sv }, { x: cx, y: yt });
          F.forEach(function (f, i) { p.push({ x: cx, y: f.cy, hit: sf[i] }); });
          if (M) p.push({ x: cx, y: hy }, { x: x, y: hy });
        } else {
          p.push({ x: x, y: V.t + 24, hit: sv });
          if (F[1].t > F[0].b - 2) F.forEach(function (f, i) { p.push({ x: x, y: f.cy, hit: sf[i] }); });
          else p.push({ x: x, y: F[0].cy, hit: sf });
        }
        if (!M) return p;
        if (M[1].t > M[0].b - 2) { // strip stacked
          M.forEach(function (m, i) { p.push({ x: x, y: m.t + 20, hit: sl[i] }); });
          if (L) p.push({ x: x, y: L.cy, hit: lim });
        } else { // under the strip, then up its right side to the limit line
          var yb = M[0].b + 10, xr = M[2].r + g;
          p.push({ x: x, y: M[0].cy, hit: sl[0] }, { x: x, y: yb }, { x: M[1].l + 24, y: yb, hit: sl[1] }, { x: M[2].l + 24, y: yb, hit: sl[2], dwell: 460 });
          if (L) p.push({ x: xr, y: yb }, { x: xr, y: L.cy, hit: lim });
        }
        return p;
      });
    }
  }

  // every page: one thread runs down the left margin beside the content, from under the headline to the last block.
  // It keeps the same distance from the content as the guide's strand, so it winds in where the column narrows,
  // passes under the zips, and tacks a stitch into each section heading. It is drawn as far as the reading line
  // (45% down the window; nothing at the very top, all of it at the very bottom), read from scroll position once a
  // frame so a jump cannot leave it stale. Decoration only: built here, after the reduced-motion return.
  var mainEl = d.querySelector('main'), th1 = mainEl && mainEl.querySelector('h1');
  if (th1) {
    var th = d.createElement('span');
    th.className = 'thread'; th.setAttribute('aria-hidden', 'true');
    th.innerHTML = '<svg focusable="false"><path class="th-holes"/><path class="y-sh"/><path class="y-edge"/><path class="th-line"/></svg><i class="th-head"></i>';
    mainEl.appendChild(th);
    var plyT = 0, holes = th.querySelector('.th-holes'), yarn = th.querySelector('.th-line'), head = th.lastChild, stops = [], tlen = 0, tick = 0, mtop = 0, drawn = -1;
    var tsh = th.querySelector('.y-sh'), ted = th.querySelector('.y-edge'), tply = plied(th.firstChild), tpts = [];
    var box = function (el) { // place in <main>, from layout offsets, so a reveal in mid-flight cannot shift it
      var x = 0, y = 0, e = el;
      while (e && e !== mainEl) { x += e.offsetLeft; y += e.offsetTop; e = e.offsetParent; }
      return { l: x, t: y, b: y + el.offsetHeight };
    };
    var lay = function () {
      var g = innerWidth <= 620 ? 9 : 12, leads = mainEl.querySelector('.lead-hero .leads'), S = [], q, s, i, k, px, py, end;
      var y0 = leads ? (box(th1).t + box(th1).b) / 2 : box(th1).b + 10; // home: from the headline, where the guide's strand starts, so the thread takes over from it
      stops = []; drawn = -1; mtop = mainEl.getBoundingClientRect().top + (window.scrollY || 0);
      [].forEach.call(mainEl.children, function (c) { // the blocks the strand runs beside, top to bottom
        var inner = c.matches('.prose, .figure, .sum') ? c : c.matches('section:not(.sum)') ? c.querySelector('.wrap') : null;
        [].forEach.call(inner ? inner.children : [c], function (el) {
          if (el === th || !el.offsetHeight || getComputedStyle(el).position === 'absolute') return;
          q = box(el); q.x = Math.max(7, q.l - (g > 9 && c.matches('.prose:not(.case-head)') ? 18 : g)); // running text gets more air
          if (q.b <= y0 + 20) return;
          k = S[S.length - 1];
          if (k && Math.abs(k.x - q.x) < 4) k.b = Math.max(k.b, q.b); else S.push(q);
        });
      });
      th.classList.remove('live'); mainEl.classList.remove('th-live');
      if (!S.length) return;
      S[0].t = y0;
      [].forEach.call(mainEl.querySelectorAll('.prose > h2, .section-head h2'), function (h) {
        q = box(h); stops.push({ el: h, y: (q.t + q.b) / 2, x: q.l + 9 });
      });
      s = 'M' + S[0].x + ' ' + y0; px = S[0].x; py = y0;
      S.forEach(function (sg, n) {
        if (n) { // change lanes across the gap between two blocks, in an S-bend at least 44 px tall
          k = Math.max(0, (44 - (sg.t - py)) / 2); q = Math.max(sg.t + k, py + 2); i = (q - py) / 2;
          s += 'C' + px + ' ' + (py + i) + ' ' + sg.x + ' ' + (q - i) + ' ' + sg.x + ' ' + q; px = sg.x; py = q;
        }
        end = sg.b - (S[n + 1] ? Math.max(0, (44 - (S[n + 1].t - sg.b)) / 2) : 6);
        stops.forEach(function (st) { // a tack stitch: in under the heading's patch and back out
          if (st.y - 16 < py || st.y + 16 > end) return;
          s += 'L' + px + ' ' + (st.y - 16) + 'Q' + px + ' ' + st.y + ' ' + st.x + ' ' + st.y + 'Q' + px + ' ' + st.y + ' ' + px + ' ' + (st.y + 16); py = st.y + 16;
        });
        if (end > py) { s += 'L' + px + ' ' + end; py = end; }
      });
      holes.setAttribute('d', s); yarn.setAttribute('d', s); tsh.setAttribute('d', s); ted.setAttribute('d', s);
      tlen = yarn.getTotalLength(); tpts = samples(yarn, tlen); th.classList.add('live'); mainEl.classList.add('th-live');
    };
    var run = function () {
      tick = 0;
      if (!tlen || !th.classList.contains('live')) return;
      var sy = window.scrollY || 0, vh = innerHeight, max = Math.max(1, r.scrollHeight - vh);
      var y = sy + vh * (.45 * Math.min(1, sy / 240) + .55 * Math.max(0, 1 - (max - sy) / (vh * .5))) - mtop, lo = 0, hi = tlen, m, k, p;
      for (k = 0; k < 18; k++) { m = (lo + hi) / 2; if (yarn.getPointAtLength(m).y < y) lo = m; else hi = m; }
      stops.forEach(function (st) { st.el.classList.toggle('th-on', st.y <= y); });
      if (Math.abs(lo - drawn) < .5) return;
      drawn = lo;
      tsh.style.strokeDasharray = ted.style.strokeDasharray = yarn.style.strokeDasharray = lo.toFixed(1) + ' 99999';
      // twist marks are re-laid only when the scroll rests (every frame cost dropped frames on long pages)
      clearTimeout(plyT); plyT = setTimeout(function () { tply.setAttribute('points', tpts.slice(0, Math.floor(drawn / 6) + 1).join(' ')); }, 150);
      // the button rolls down the strand and bobs like a needle, so a scroll reads as sewing: without this the head sits
      // still at the reading line while the page slides under it, and the thread looks frozen
      p = yarn.getPointAtLength(lo); head.style.transform = 'translate(' + (p.x + 2.5 * Math.sin(lo / 11)).toFixed(1) + 'px,' + p.y.toFixed(1) + 'px) rotate(' + (lo * 1.3).toFixed(0) + 'deg)';
      head.style.opacity = lo < 2 ? 0 : 1;
      mainEl.classList.toggle('th-go', lo > 2); // one yarn at a time: the opening guide's strand bows out once the thread is under way
    };
    var relay = function () { if (!tick) tick = requestAnimationFrame(function () { lay(); run(); }); };
    addEventListener('scroll', function () { if (!tick) tick = requestAnimationFrame(run); }, { passive: true });
    addEventListener('resize', relay); addEventListener('load', relay);
    if ('ResizeObserver' in window) new ResizeObserver(relay).observe(mainEl); // late images and fonts move the blocks
    lay(); run();
  }
  lookJs(); // after the thread is built: look-brush.js redraws it as a brush stroke

})();
