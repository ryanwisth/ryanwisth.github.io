/* Gouache & Shape: the painted field under the page (Nov 21 2026; Ryan's pick: option B, "Key painting").
   Spec: page-films/out/gouache/LOOK.md. Painter source: _tools/gouache-options/build/paint.js (the picked still).
   look.js loads this file whenever the look is worn (with or without motion): it only draws. It reads the laid-out page
   and paints one inline SVG behind it (z-index -1 in the body's own stacking context): the home's three-plane scene
   around the film, a full-bleed field with a cut top edge for every section, and a cut shape behind each light panel.
   Every fill is flat. The paint body is three baked tiles (img/gouache/*.webp, made once by
   _tools/gouache/pages/bake-tiles.mjs) placed per shape at the shape's own angle and offset: no live filter runs here.
   Big fields take short strokes in several directions (long level streaks on blue read as water). No people: a cart
   carries a white card along the path, a lantern stands by it. Redrawn on resize, font load, theme change and layout
   change; never animated, except the lantern's two flat flame states (CSS, under html.motion only). */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__gqLive || !d.addEventListener) return;
  W.__gqLive = 1;
  var BASE = ''; try { BASE = d.currentScript.src.replace(/[^\/]*$/, ''); } catch (e) {}
  var NS = 'http://www.w3.org/2000/svg';
  function on() { return r.getAttribute('data-look') === 'gouache'; }
  function night() { var t = r.getAttribute('data-theme'); return t === 'dark' || (t !== 'light' && W.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }

  /* palettes: LOOK.md section 2 (OKLCH there, sRGB here) */
  var DAY = { ground: '#f4d7da', paper: '#f3f6f9', deep: '#195fbf', deep2: '#2a3c97', hill: '#829daa', hill2: '#6a7d8a',
    green: '#2f913e', green2: '#007240', greenDeep: '#015d2d', greenDeep2: '#0b4a2e', path: '#f1e7d2', fuchsia: '#c43783', red: '#bd2c42',
    redDeep: '#9a1b39', redDeep2: '#7f1f4d', tree: '#1b9247', trunk: '#463845', wall: '#f3f6f9', door: '#6a4863', sun: '#f8da58', ring: '#fbecae',
    wheel: '#463845', card: '#fbfcfd', poke: '#2a3c97', foot: '#3d4160', foot2: '#1b4ba9' };
  var NIGHTP = { ground: '#0b378d', paper: '#464361', deep: '#0057a8', deep2: '#154694', hill: '#00736f', hill2: '#006365',
    green: '#005941', green2: '#004a3b', greenDeep: '#006b45', greenDeep2: '#00805a', path: '#6b8ba2', fuchsia: '#9b2065', red: '#961733',
    redDeep: '#7d1530', redDeep2: '#6c1a44', tree: '#056641', trunk: '#2a2440', wall: '#6b8ba2', door: '#f5d754', sun: '#f5d754', ring: '#fbf0ba',
    wheel: '#1f1d36', card: '#dfe9f5', poke: '#112771', foot: '#2c3760', foot2: '#00367c' };

  /* seeded random + the shape kit (wobble, smooth, blob, cut) */
  var seed = 7;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function rr(a, b) { return a + (b - a) * rnd(); }
  var WK = 2.6;
  /* short-wave hand wobble along a polyline; each shape draws its own amplitude and phase (no uniform wobble) */
  function wobble(pts, closed, amp, wl, calm) {
    wl = wl || 22; var wt = calm ? [0.8, 0.12, 0] : [0.7, 0.38, 0.04]; amp *= WK; wl *= WK * 0.45;
    var out = [], ph = [rr(0, 6.3), rr(0, 6.3), rr(0, 6.3)], k = [rr(0.8, 1.3), rr(1.9, 2.7), rr(3.4, 4.6)], s = 0, n = pts.length, segs = closed ? n : n - 1;
    for (var i = 0; i < segs; i++) {
      var a = pts[i], b = pts[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / (L || 1), ny = dx / (L || 1), st = Math.max(1, Math.ceil(L / 4));
      for (var j = 0; j < st; j++) {
        var t = j / st, ss = s + t * L, taper = Math.min(1, Math.min(t * L, (1 - t) * L) / 10);
        var o = amp * taper * (wt[0] * Math.sin(ss * 2 * Math.PI / wl * k[0] + ph[0]) + wt[1] * Math.sin(ss * 2 * Math.PI / wl * k[1] + ph[1]) + wt[2] * Math.sin(ss * 2 * Math.PI / wl * k[2] + ph[2]));
        out.push([a[0] + dx * t + nx * o, a[1] + dy * t + ny * o]);
      }
      s += L;
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function smooth(pts, closed, per) {
    per = per || 10; var out = [], n = pts.length;
    function g(i) { return closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]; }
    for (var i = 0; i < (closed ? n : n - 1); i++) {
      var p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
      for (var j = 0; j < per; j++) {
        var t = j / per, t2 = t * t, t3 = t2 * t, q = [];
        for (var c = 0; c < 2; c++) q.push(0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * t3));
        out.push(q);
      }
    }
    if (!closed) out.push(pts[n - 1]);
    return out;
  }
  function blob(cx, cy, rx, ry, n, irr, rot) {
    var pts = []; n = n || 9; irr = irr || 0.08; rot = rot || 0;
    for (var i = 0; i < n; i++) { var a = i / n * 2 * Math.PI + rot, f = 1 + rr(-irr, irr); pts.push([cx + rx * f * Math.cos(a), cy + ry * f * Math.sin(a)]); }
    return smooth(pts, true, 12);
  }
  function cut(x, y, w, h, j) { var m = Math.max(w, h) * (j || 0.01); function J() { return rr(-m, m) + rr(-1.5, 1.5); }
    return [[x + J(), y + J()], [x + w + J(), y + J()], [x + w + J(), y + h + J()], [x + J(), y + h + J()]]; }
  function D(pts, close) { var s = 'M'; for (var i = 0; i < pts.length; i++) s += (i ? 'L' : '') + pts[i][0].toFixed(1) + ',' + pts[i][1].toFixed(1); return s + (close === false ? '' : 'Z'); }

  /* one painted shape: a flat fill, then its own paint body (a baked tile at its own angle) and, if asked, a dry-brush
     coverage band inside its edge. o: {tex: strength, angle, tile: 's'|'l', stretch, dry: band px, cls} */
  var svg, defs, sid = 0, TS = 1, NIGHTNOW = false;
  function el(tag, at, parent) { var e = d.createElementNS(NS, tag); for (var k in at) e.setAttribute(k, at[k]); (parent || svg).appendChild(e); return e; }
  function bbox(pts) { var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (var i = 0; i < pts.length; i++) { var p = pts[i]; if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return { x0: x0, x1: x1, y0: y0, y1: y1 }; }
  function pattern(tile, ang, stretch, ox, oy, size) {
    var id = 'gqp' + (sid++), s = size || 96 * TS;
    var p = el('pattern', { id: id, patternUnits: 'userSpaceOnUse', width: s, height: s, patternTransform: 'translate(' + ox.toFixed(1) + ' ' + oy.toFixed(1) + ') rotate(' + ang.toFixed(1) + ') scale(' + stretch.toFixed(2) + ' 1)' }, defs);
    el('image', { href: BASE + 'img/gouache/' + tile + '.webp', width: s, height: s, preserveAspectRatio: 'none' }, p);
    return 'url(#' + id + ')';
  }
  function shape(pts, fill, o, parent) {
    o = o || {}; var dd = D(pts), g = parent || svg, p = el('path', { d: dd, fill: fill }, g);
    if (o.cls) p.setAttribute('class', o.cls);
    if (o.tex === 0) return p;
    var b = bbox(pts), long = (b.x1 - b.x0) >= (b.y1 - b.y0);
    var ang = o.angle != null ? o.angle : (long ? rr(-9, 9) : 90 + rr(-9, 9));
    var tile = o.tile || 'l', str = o.stretch || (tile === 'l' ? rr(1.3, 1.8) : rr(0.9, 1.25));
    el('path', { d: dd, fill: pattern('stroke-' + tile, ang, str, rr(0, 90), rr(0, 90)), opacity: Math.min(1, (o.tex == null ? 1 : o.tex) * (NIGHTNOW ? 0.62 : 0.58)).toFixed(3) }, g);
    if (o.dry) {
      var cid = 'gqc' + (sid++); el('path', { d: dd }, el('clipPath', { id: cid }, defs));
      el('path', { d: dd, fill: 'none', stroke: pattern('dry', ang, 1.4, rr(0, 90), rr(0, 90)), 'stroke-width': o.dry * 2, opacity: NIGHTNOW ? 0.32 : 0.42, 'clip-path': 'url(#' + cid + ')' }, g);
    }
    return p;
  }
  /* a big field: one flat fill plus 2-4 overlapping patches of short strokes, each at its own angle (never level water) */
  function field(pts, fill, patches) {
    var g = el('g', {}), p = shape(pts, fill, { tex: 0, cls: 'gq-f' }, g), b = bbox(pts), cid = 'gqc' + (sid++);
    el('path', { d: D(pts) }, el('clipPath', { id: cid }, defs));
    var pg = el('g', { 'clip-path': 'url(#' + cid + ')' }, g), n = patches || 3, angs = [-38, 24, 61, -12, 47];
    for (var i = 0; i < n; i++) {
      var cx = b.x0 + (b.x1 - b.x0) * (i + 0.5) / n + rr(-40, 40), cy = (b.y0 + b.y1) / 2 + rr(-30, 30);
      var pb = blob(cx, cy, (b.x1 - b.x0) / n * 0.75, (b.y1 - b.y0) * 0.62, 8, 0.12, rr(0, 3));
      el('path', { d: D(pb), fill: pattern('stroke-s', angs[(i + sid) % angs.length] + rr(-8, 8), rr(0.8, 1.15), rr(0, 90), rr(0, 90)), opacity: (NIGHTNOW ? 0.3 : 0.26).toFixed(3) }, pg);
    }
    return p;
  }
  /* a cut top edge, drawn left to right at y0; kind: arches | scallops | collage | steps (each field gets its own) */
  function edge(kind, x0, x1, y0, ph) {
    var pts = [], x = x0;
    if (kind === 'arches') { while (x < x1) { var aw = rr(110, 200) * ph, ah = rr(14, 24) * ph, yy = y0 + rr(-4, 6); for (var j = 0; j <= 12; j++) pts.push([Math.min(x + aw * j / 12, x1), yy - ah * Math.sqrt(Math.sin(Math.PI * j / 12))]); x += aw; } }
    else if (kind === 'scallops') { var sw = rr(70, 96) * ph; while (x < x1) { for (var k = 0; k <= 8; k++) pts.push([Math.min(x + sw * k / 8, x1), y0 - 9 * ph * Math.sin(Math.PI * k / 8) + (x - x0) * 0.012]); x += sw * rr(0.85, 1.2); } }
    else if (kind === 'steps') { var st = 0; while (x < x1) { var w = rr(160, 320) * ph, h = rr(-18, 18) * ph; pts.push([x, y0 + st]); pts.push([Math.min(x + w, x1), y0 + st + rr(-6, 6)]); st = Math.max(-26, Math.min(26, st + h)); x += w; } }
    else { var i = 0; while (x < x1) { var w2 = rr(140, 260) * ph; pts.push([x, y0 + (i % 2 ? rr(6, 16) : rr(-16, -4)) * ph]); x += w2; i++; } pts.push([x1, y0 + rr(-10, 10)]); }
    return pts;
  }

  function R(e) { if (typeof e === 'string') e = d.querySelector(e); if (!e) return null; var b = e.getBoundingClientRect(); if (!b.width && !b.height) return null;
    return { x: b.left + scrollX, y: b.top + scrollY, w: b.width, h: b.height, r: b.right + scrollX, b: b.bottom + scrollY }; }

  /* ---------- the home scene: three planes around the film (back hills, the hub disc, the green front ground) ---------- */
  function heroScene(C, PW, phone) {
    var fr = R('.lead-hero .hero-film'), facts = R('.lead-hero .facts.proof'), lh = R('.leads-head'), mail = R('.lead-hero .hero-mail') || R('.lead-hero .hero-sub');
    if (!fr || !lh) return;
    var fieldTop = lh.y - (phone ? 46 : 66), S = phone ? 0.55 : 1;
    /* back plane: greyed hills with two crests, behind the film's right half; a lower family ridge */
    var hx0 = phone ? -10 : fr.x + fr.w * 0.25, hTop = fr.y + fr.h * (phone ? 0.42 : 0.5), hp = [[hx0, fieldTop + 30]];
    for (var i = 1; i <= 6; i++) hp.push([hx0 + (PW + 20 - hx0) * i / 6, hTop + 36 * Math.sin(i * 1.3 + 0.4) * S - (i / 6) * 70 * S + rr(-8, 8)]);
    var sm = smooth(hp, false, 12), crest = [];
    for (var c = 0; c < sm.length; c++) { var q = sm[c], f = c / sm.length, dy = 0, cr = [[0.36, 36], [0.72, 28]]; for (var z = 0; z < 2; z++) { var u = Math.abs(f - cr[z][0]) / 0.05; if (u < 1) dy -= cr[z][1] * S * (1 - u); } crest.push([q[0], q[1] + dy]); }
    shape(wobble(crest.concat([[PW + 10, fieldTop + 30]]), true, 1.0, 26), C.hill, { tex: 0.9, dry: 9, angle: -14 });
    var p2 = []; for (var k = 0; k <= 5; k++) p2.push([PW * (phone ? 0.25 : 0.58) + PW * 0.45 * k / 5, hTop + 80 * S + 30 * Math.sin(k * 1.7 + 1) * S]);
    shape(wobble(smooth(p2, false, 10).concat([[PW + 10, fieldTop + 30], [PW * (phone ? 0.25 : 0.58), fieldTop + 30]]), true, 0.9, 20), C.hill2, { tex: 0.8, dry: 7, angle: 12 });

    /* middle plane: the hub disc behind the film, lopsided down-right, a pointed tip and one notch; its family crescent */
    /* the disc stays clear of the top bar and of the words beside or above the film (no words on the disc) */
    var tb = R('.topbar'), hub = { cx: fr.x + fr.w * (phone ? 0.56 : 0.62), cy: fr.y + fr.h * (phone ? 0.6 : 0.42), rx: fr.w * (phone ? 0.6 : 0.5), ry: fr.h * (phone ? 0.68 : 0.62) };
    var topLim = phone ? fr.y - 16 : Math.max(fr.y - 60, (tb ? tb.b : 0) + 16);
    if (hub.cy - hub.ry * 1.06 < topLim) hub.ry = (hub.cy - topLim) / 1.06;
    var hubPts = blob(hub.cx, hub.cy, hub.rx, hub.ry, 9, 0.05, 0.3).map(function (q) {
      var a = Math.atan2(q[1] - hub.cy, q[0] - hub.cx), tip = Math.max(0, 1 - Math.abs(a - (-2.35)) / 0.1) * 40 * S, notch = Math.max(0, 1 - Math.abs(a - 0.9) / 0.12) * -14 * S;
      var kk = 1 + (tip + notch) / Math.hypot(q[0] - hub.cx, q[1] - hub.cy); return [hub.cx + (q[0] - hub.cx) * kk, hub.cy + (q[1] - hub.cy) * kk]; });
    var wh = wobble(hubPts, true, 1.1, 24), hg = el('g', {});
    shape(wh, C.deep, { tex: 1, dry: 7, tile: 's', cls: 'gq-hub' }, hg);
    var hcid = 'gqc' + (sid++); el('path', { d: D(wh) }, el('clipPath', { id: hcid }, defs));
    var crg = el('g', { 'clip-path': 'url(#' + hcid + ')' }, hg);
    var outer = blob(hub.cx + hub.rx * 0.22, hub.cy + hub.ry * 0.16, hub.rx * 0.86, hub.ry * 0.92, 9, 0.04, 0.6);
    var inner = blob(hub.cx - hub.rx * 0.06, hub.cy - hub.ry * 0.08, hub.rx * 0.9, hub.ry * 0.9, 9, 0.03, 1.1);
    var mid = 'gqm' + (sid++), mk = el('mask', { id: mid, maskUnits: 'userSpaceOnUse', x: hub.cx - hub.rx * 2, y: hub.cy - hub.ry * 2, width: hub.rx * 4, height: hub.ry * 4 }, defs);
    el('rect', { x: hub.cx - hub.rx * 2, y: hub.cy - hub.ry * 2, width: hub.rx * 4, height: hub.ry * 4, fill: '#fff' }, mk); el('path', { d: D(inner), fill: '#000' }, mk);
    shape(outer, C.deep2, { tex: 0.9, angle: 52, tile: 's' }, el('g', { mask: 'url(#' + mid + ')' }, crg));

    /* front plane: green ground. Its top edge climbs from low on the left (behind the numbers) to high on the right
       (the film's foot): a diagonal, never a level band stacked on the section field */
    var fx = facts ? facts : { x: fr.x, y: fr.b + 20, r: fr.r, b: fr.b + 120, w: fr.w, h: 100 };
    var gTopL = phone ? fieldTop - 40 : Math.min(fx.y + 70, fieldTop - 60), gTopR = phone ? fieldTop - 70 : Math.min(fr.b + 34, fieldTop - 150);
    var gc = phone ? [[-10, gTopL + 10], [PW * 0.4, gTopL], [PW * 0.75, gTopR + 14], [PW + 10, gTopR]]
      : [[-10, gTopL + 18], [fx.x + fx.w * 0.45, gTopL], [fx.r + 40, gTopL - 30], [fr.x + fr.w * 0.5, gTopR + 26], [PW + 10, gTopR]];
    var gs = smooth(gc, false, 16), gsc = [];
    for (var m = 0; m < gs.length; m++) { var qq = gs[m], sc = qq[0] > fx.r ? 6 * S * Math.abs(Math.sin(qq[0] / (58 * S) * Math.PI)) : 0; gsc.push([qq[0], qq[1] - sc]); }
    var gTop = function (x) { for (var n = 1; n < gsc.length; n++) if (gsc[n][0] >= x) { var a0 = gsc[n - 1], a1 = gsc[n], t = (x - a0[0]) / ((a1[0] - a0[0]) || 1); return a0[1] + (a1[1] - a0[1]) * t; } return gsc[gsc.length - 1][1]; };
    shape(wobble(gsc, false, 1.0, 22).concat([[PW + 10, fieldTop + 40], [-10, fieldTop + 40]]), C.green, { tex: 0.9, dry: 11, angle: -6 });
    /* its family shape: a cut lobe low on the left, under the numbers (not a band) */
    var lobe = [[-10, fieldTop + 40], [-10, gTopL + 60 * S], [PW * (phone ? 0.3 : 0.16), gTopL + 34 * S], [PW * (phone ? 0.55 : 0.34), fieldTop - 10], [PW * (phone ? 0.62 : 0.4), fieldTop + 40]];
    shape(wobble(smooth(lobe, false, 8), true, 0.9, 18), C.green2, { tex: 0.8, angle: 28 });

    /* the path: from the building's door down to the section edge, widening toward the viewer */
    var bx = phone ? PW - 20 - 74 * S - 8 : Math.max(fx.r + 150, fr.x + fr.w * 0.5), baseY = gTop(bx + 37 * S) + (phone ? 26 : 58) * S;
    var pc = smooth(phone ? [[bx + 30 * S, baseY], [PW * 0.6, baseY + 16], [PW * 0.42, fieldTop - 6], [PW * 0.36, fieldTop + 24]]
      : [[bx + 26, baseY], [bx - 60, baseY + 26], [fx.r + 30, fieldTop - 40], [fx.r - 70, fieldTop - 8], [fx.r - 150, fieldTop + 30]], false, 16);
    var Lp = [], Rp = [];
    for (var pi = 0; pi < pc.length; pi++) { var a = pc[Math.max(0, pi - 1)], b = pc[Math.min(pc.length - 1, pi + 1)], ddx = b[0] - a[0], ddy = b[1] - a[1], l = Math.hypot(ddx, ddy) || 1, w = (phone ? 4 : 5) + (phone ? 8 : 16) * (pi / pc.length);
      Lp.push([pc[pi][0] - ddy / l * w, pc[pi][1] + ddx / l * w]); Rp.push([pc[pi][0] + ddy / l * w, pc[pi][1] - ddx / l * w]); }
    shape(wobble(Lp.concat(Rp.reverse()), true, 0.8, 16), C.path, { tex: 0.7, angle: -30 });

    /* the building: stacked wall, two roof faces in the red family (fuchsia beside a warmer red), an arched door */
    var bw = 74 * S, bh = 62 * S, by = baseY - bh, roof = [[bx - 8 * S, by + 2], [bx + bw * 0.42, by - 50 * S], [bx + bw + 8 * S, by + 2]];
    shape(wobble(cut(bx, by, bw, bh, 0.012), true, 0.6, 14), C.wall, { tex: 0.7, angle: 90 });
    shape(wobble(roof, true, 0.7, 14), C.fuchsia, { tex: 1, angle: -32 });
    shape(wobble([[bx + bw * 0.42, by - 50 * S], [bx + bw + 8 * S, by + 2], [bx + bw * 0.62, by + 2]], true, 0.6, 12), C.red, { tex: 1, angle: 58 });
    var dx = bx + bw * 0.34, dw = bw * 0.28, dy = by + bh * 0.42, door = [[dx, by + bh], [dx, dy + dw / 2]];
    for (var di = 0; di <= 8; di++) { var da = Math.PI + di / 8 * Math.PI; door.push([dx + dw / 2 + dw / 2 * Math.cos(da), dy + dw / 2 + dw / 2 * Math.sin(da)]); }
    door.push([dx + dw, by + bh]); shape(door, C.door, { tex: 0, cls: night() ? 'gq-lit' : '' });
    /* the tree: a lobed foliage ball on a tall trunk, the hero's one patterned shape (pale dots); it meets the roof's
       fuchsia at near-equal lightness: the scene's one clash accent */
    {
      var tx = phone ? bx - 22 * S : bx + bw + 40, ty = by - 22 * S;
      shape(cut(tx - 4 * S, ty + 26 * S, 8 * S, baseY - (ty + 26 * S), 0.01), C.trunk, { tex: 0 });
      var ball = []; for (var bi = 0; bi < 96; bi++) { var ba = bi / 96 * 2 * Math.PI, lb = Math.abs(Math.sin(ba * 2.5 + 0.3)); ball.push([tx + (24 + 9 * lb) * S * Math.cos(ba), ty + (32 + 10 * lb) * S * Math.sin(ba)]); }
      var wb = wobble(ball, true, 1.0, 18); shape(wb, C.tree, { tex: 1, dry: 7, tile: 's', angle: 80 });
      var tcid = 'gqc' + (sid++); el('path', { d: D(wb) }, el('clipPath', { id: tcid }, defs));
      var dg = el('g', { 'clip-path': 'url(#' + tcid + ')' });
      for (var ti = 0; ti < 11; ti++) { var aa = rr(0, 6.28), rad = rr(0, 30) * S; el('path', { d: D(blob(tx + rad * Math.cos(aa) * 0.9, ty + rad * Math.sin(aa) * 1.2, 3.2 * Math.max(S, 0.7), 3.2 * Math.max(S, 0.7), 6, 0.1)), fill: C.ring }, dg); }
    }
    /* the cart carrying a white card along the path */
    var ci = Math.floor(pc.length * (phone ? 0.55 : 0.46)), cp = pc[ci], cq = pc[Math.min(pc.length - 1, ci + 4)], cang = Math.atan2(cq[1] - cp[1], cq[0] - cp[0]) * 180 / Math.PI;
    var cg = el('g', { transform: 'translate(' + cp[0].toFixed(1) + ' ' + (cp[1] - 4).toFixed(1) + ') rotate(' + (cang + 180).toFixed(1) + ') scale(' + S + ')' });
    shape(wobble([[-30, -18], [30, -18], [26, 0], [-26, 0]], true, 0.5, 10), C.red, { tex: 1 }, cg);
    shape(wobble([[-20, -40], [18, -44], [20, -18], [-18, -18]], true, 0.5, 10), C.card, { tex: 0.4 }, cg);
    shape(blob(-15, 2, 7, 7, 7, 0.06), C.wheel, { tex: 0 }, cg); shape(blob(15, 2, 7, 7, 7, 0.06), C.wheel, { tex: 0 }, cg);
    /* the lantern by the path: a flat flame on a pole; at night one lighter flat ring (the measured candles show one) */
    var lx = phone ? PW * 0.12 : fx.r + 70, ly = gTop(lx) + (phone ? 4 : 2) - 4;
    {
      shape(cut(lx - 2.5, ly + 8, 5, 64 * S, 0.01), C.trunk, { tex: 0 });
      if (night()) shape(blob(lx, ly, 21, 21, 9, 0.05), C.ring, { tex: 0 });
      var fl = function (sc) { var o = []; for (var fi = 0; fi < 40; fi++) { var fa = fi / 40 * 2 * Math.PI, fr0 = 11 * sc * (1 + 0.9 * Math.pow(Math.max(0, -Math.sin(fa)), 6)); o.push([lx + 11 * sc * Math.cos(fa) * (1 - 0.35 * Math.max(0, -Math.sin(fa))), ly + fr0 * Math.sin(fa) * 1.15]); } return o; };
      shape(fl(1), C.sun, { tex: 0 });
      shape(fl(0.8), C.ring, { tex: 0, cls: 'gq-flick' }); /* the second flat state: on and off under motion only */
    }
  }

  /* ---------- section fields: each a full-bleed flat field in its key's deep colour, with its own cut top ---------- */
  function sectionField(top, bottom, PW, fill, fill2, kind, side, ph) {
    var pts = edge(kind, -10, PW + 10, top, ph), bot = [];
    for (var bx0 = PW + 10; bx0 > -10; bx0 -= rr(150, 260)) bot.push([bx0, bottom + rr(-7, 7) * ph]);
    bot.push([-10, bottom + rr(-7, 7) * ph]);
    field(wobble(pts, false, 1.2, 20).concat(wobble(bot, false, 1.0, 20)), fill, 3);
    /* its family second shape: one cut lobe on one side, not a band */
    var lx0 = side ? PW * 0.7 : -10, lx1 = side ? PW + 10 : PW * 0.3, hh = Math.min(240, (bottom - top) * 0.45), lb = bottom - 4 * ph;
    var lobe = side ? [[lx1, lb], [lx0, lb], [lx0 + PW * 0.06, top + hh * 1.2], [PW * 0.88, top + hh * 0.55], [lx1, top + hh * 0.3]]
      : [[lx0, top + hh * 0.35], [PW * 0.12, top + hh * 0.5], [lx1 - PW * 0.04, top + hh * 1.3], [lx1, lb], [lx0, lb]];
    shape(wobble(lobe, true, 0.9, 18), fill2, { tex: 0.55, angle: side ? 34 : -41, tile: 's', cls: 'gq-l' });
  }
  /* a light panel's cut edge: a cut shape a few px larger, in the panel's own colour, painted behind it */
  function backing(b, pad, fill) { if (!b) return; shape(wobble(cut(b.x - pad, b.y - pad, b.w + 2 * pad, b.h + 2 * pad, 0.004), true, 0.5, 60, true), fill, { tex: 0, cls: 'gq-b' }); }

  function draw() {
    var old = d.getElementById('gq-field'); if (old) old.remove();
    if (!on() || !d.body) return;
    var C = night() ? NIGHTP : DAY, PW = r.clientWidth, PH = Math.max(d.body.scrollHeight, r.scrollHeight), phone = PW < 901;
    NIGHTNOW = night(); seed = 7; sid = 0; TS = phone ? 0.8 : 1; WK = phone ? 2.6 : Math.max(2.2, Math.min(3.2, 2.56 * PW / 1280));
    svg = d.createElementNS(NS, 'svg'); svg.id = 'gq-field'; svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    svg.setAttribute('width', PW); svg.setAttribute('height', PH); svg.setAttribute('viewBox', '0 0 ' + PW + ' ' + PH);
    defs = el('defs', {});
    var home = d.querySelector('.lead-hero .hero-film'), ph = phone ? 0.6 : 1;
    /* the brand's mark sits on a cut disc of the deep member, painted here (a text-bearing element is never clipped) */
    var mk = R('.brand .mark'); if (mk) shape(wobble(blob(mk.x + mk.w / 2, mk.y + mk.h / 2, mk.w * 0.56, mk.h * 0.6, 9, 0.06, 0.4), true, 0.5, 12), C.deep, { tex: 0.7, tile: 's', angle: 40 });
    if (home) heroScene(C, PW, phone);
    /* section fields, from the top down; each later field covers the foot of the one before */
    var lh = R('.leads-head'), leads = R('.leads'), secs = [].slice.call(d.querySelectorAll('main > section.section')), foot = R('footer.site');
    var keys = [[C.greenDeep, C.greenDeep2, 'scallops', 0], [C.redDeep, C.redDeep2, 'collage', 1], [C.deep, C.deep2, 'steps', 0]];
    /* the leads field carries its heading (as in the picked still); each later section's heading sits on the ground and
       its field starts just above its first panel and ends just below its last (busy budget: saturated area .10-.25) */
    if (lh && leads) sectionField(lh.y - (phone ? 46 : 66), leads.b + (phone ? 34 : 48), PW, C.deep, C.deep2, 'arches', 1, ph);
    for (var i = 0; i < secs.length; i++) {
      var parts = [].slice.call(secs[i].querySelectorAll('.wrap > :not(.section-head)')).map(R).filter(Boolean), k = keys[i % keys.length];
      if (!parts.length) continue; var py0 = 1e9, py1 = -1e9; parts.forEach(function (q) { py0 = Math.min(py0, q.y); py1 = Math.max(py1, q.b); });
      var hd = secs[i].querySelector('.section-head'), hdb = hd ? R(hd) : null; /* the heading on the ground stays clear of the cut edge */
      sectionField(Math.max(py0 - (phone ? (i ? 20 : 26) : 40), hdb ? hdb.b + (phone ? 24 : 32) : -1e9), py1 + (phone ? (i ? 14 : 26) : 48), PW, k[0], k[1], k[2], k[3], ph);
    }
    if (foot) { var fp = edge('arches', -10, PW + 10, foot.y + 6, ph * 0.7); shape(wobble(fp, false, 1.0, 18).concat([[PW + 10, PH + 10], [-10, PH + 10]]), C.foot, { tex: 0.4, angle: 18, tile: 's', cls: 'gq-foot' }); }
    /* the cut edges of the light panels; the one poke-out accent: the big lead card's deep backing, down-right */
    var big = R('.leads > a.card.lead:last-child');
    if (big) shape(wobble(cut(big.x + 14, big.y + 12, big.w, big.h, 0.004), true, 0.5, 60, true), C.poke, { tex: 0.8, tile: 's', angle: 30, cls: 'gq-p' });
    var panels = d.querySelectorAll('.hero-film, .facts.proof, .leads > a.card.lead, .lead-wrap, .more-g, ol.method > li, .band, .case-head, .chart-card, .band3 > div, .pager a, .repo-card');
    for (var j = 0; j < panels.length; j++) { var pb = R(panels[j]); if (pb && getComputedStyle(panels[j]).backgroundColor !== 'rgba(0, 0, 0, 0)') backing(pb, phone ? 3 : 5, C.paper); }
    d.body.insertBefore(svg, d.body.firstChild);
    r.classList.add('gq-drawn');
  }

  /* the home film, while this look has no film twins: its own calm poster, and it waits for a press (no auto-play of the
     yarn film inside this look). Once gouache twins exist (films true in LOOK_ROWS), this step is removed. */
  function poster() {
    var v = d.querySelector('.lead-hero .hero-film video'); if (!v || !on() || v.dataset.gqPoster) return;
    v.dataset.gqPoster = '1'; v.dataset.held = '1';
    v.setAttribute('poster', BASE + 'img/gouache/poster-index' + (night() ? '-night' : '') + '.jpg');
    if (!v.paused) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
    var box = v.parentNode; if (box && box.classList) box.classList.add('paused');
  }

  var tm = 0, lastW = 0, lastH = 0;
  function soon(ms) { clearTimeout(tm); tm = setTimeout(function () { draw(); }, ms == null ? 120 : ms); }
  function start() {
    poster(); draw(); lastW = r.clientWidth; lastH = d.body ? d.body.scrollHeight : 0;
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { soon(0); });
    addEventListener('load', function () { poster(); soon(0); });
    addEventListener('resize', function () { if (r.clientWidth !== lastW) { lastW = r.clientWidth; soon(); } });
    if (W.ResizeObserver) new ResizeObserver(function () { var h = d.body.scrollHeight; if (Math.abs(h - lastH) > 2) { lastH = h; soon(); } }).observe(d.body);
    if (W.MutationObserver) new MutationObserver(function () { soon(0); }).observe(r, { attributes: true, attributeFilter: ['data-theme', 'data-look'] });
    if (W.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', function () { soon(0); }); }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
