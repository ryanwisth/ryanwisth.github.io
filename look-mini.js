/* Mini World (Nov 21 2026, option stills): a top-down, three-quarter-view pixel world drawn behind the page.
   look-mini.css draws every panel (stone tablets, wooden signs, text boxes, books, leaves) from the 1x tiles in img/mini/;
   this paints the ground they sit on, once, onto one <canvas> at art scale (1 art pixel = 3 CSS px, 2 on phones),
   shown with image-rendering: pixelated. It never moves: it is redrawn only when the page's size changes.
     option a  the overworld: grass, a sand path that winds down the margins and crosses between sections, cliffs
               (lit lip, shaded earth face, stone stairs) where each section steps down, bushes, trees, tall grass,
               flowers, rocks, a pond by the footer, and a soft shadow under every tablet and sign.
     option b  draws nothing here (its quiet field is one CSS tile).
     option c  the tiny scale: soil seen from a hero's height, giant grass blades, clover, fallen leaves, an acorn,
               pebbles, and a pencil lying across the gaps between sections.
   Every shape is drawn by the code below. No people or creatures, only ground and objects.
   look.js loads this file whenever the page wears data-look="mini" (it draws, it does not animate). */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__miniLive || !d.addEventListener) return;
  W.__miniLive = 1;

  var K = '#2a2238';
  var box0, cv, g, PX = 3, AW = 0, AH = 0, seed = 1;
  function rnd() { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }
  function ri(a, b) { return a + Math.floor(rnd() * (b - a + 1)); }
  function px(x, y, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, 1, 1); }
  function rect(x, y, w, h, c) { g.fillStyle = c; g.fillRect(x | 0, y | 0, w | 0, h | 0); }
  // a filled ellipse, pixel by pixel; f(dx, dy, edge) picks the colour (edge = on the outline ring)
  function blob(cx, cy, rx, ry, f) {
    for (var y = -ry; y <= ry; y++) for (var x = -rx; x <= rx; x++) {
      var q = (x * x) / (rx * rx) + (y * y) / (ry * ry);
      if (q > 1) continue;
      var qi = (x * x) / ((rx - 1) * (rx - 1) || 1) + (y * y) / ((ry - 1) * (ry - 1) || 1);
      var c = f(x / rx, y / ry, qi > 1);
      if (c) px(cx + x, cy + y, c);
    }
  }
  function shadowOval(cx, cy, rx, ry) { blob(cx, cy, rx, ry, function () { return 'rgba(16,44,28,.26)'; }); }

  function box(el) {
    var b = el.getBoundingClientRect();
    return { x: Math.floor((b.left + scrollX) / PX), y: Math.floor((b.top + scrollY) / PX), w: Math.ceil(b.width / PX), h: Math.ceil(b.height / PX) };
  }
  function boxes(sel) { var out = []; d.querySelectorAll(sel).forEach(function (e) { var b = box(e); if (b.w && b.h) out.push(b); }); return out; }
  function hits(list, x, y, pad) { for (var i = 0; i < list.length; i++) { var b = list[i]; if (x > b.x - pad && x < b.x + b.w + pad && y > b.y - pad && y < b.y + b.h + pad) return true; } return false; }

  /* ------------------------------------------------------------ option a: the overworld */
  function tuft(x, y, dark, lite) { px(x, y, dark); px(x + 2, y, dark); px(x + 1, y - 1, dark); px(x + 1, y - 2, lite); px(x + 3, y - 1, dark); }
  function bush(x, y, s) {
    shadowOval(x + 1, y + s - 1, s + 1, Math.max(2, s >> 1));
    blob(x, y, s, s - 1, function (dx, dy, edge) {
      if (edge) return K;
      var l = dx + dy;
      if (l < -0.75) return '#a6ee6a';
      if (l < -0.1) return '#5fc84a';
      return l > 0.75 ? '#2f7f3a' : '#3c9a3e';
    });
    px(x - (s >> 1), y - (s >> 1), '#e8ffc0');
  }
  function tree(x, y, s) {
    shadowOval(x + 3, y + s + 3, s + 3, (s >> 1) + 1);
    rect(x - 2, y + s - 3, 5, 6, '#7a4a2a'); rect(x - 2, y + s - 3, 1, 6, K); rect(x + 2, y + s - 3, 1, 6, K); rect(x - 1, y + s - 3, 1, 6, '#a8703e');
    blob(x, y, s, s - 2, function (dx, dy, edge) {
      if (edge) return K;
      var l = dx * .8 + dy;
      if (l < -0.7) return '#7ed65a';
      if (l < -0.05) return '#46ad48';
      return l > 0.7 ? '#1f6a3a' : '#2f8a40';
    });
    for (var i = 0; i < 5; i++) { var a = ri(-s + 3, s - 3), b = ri(-s + 3, 2); px(x + a, y + b, '#a6ee6a'); px(x + a + 1, y + b, '#7ed65a'); px(x + a, y + b + 1, '#2f8a40'); }
  }
  function flower(x, y) {
    var c = ['#ff5a4a', '#ffd34a', '#ffffff', '#ff8ad0'][ri(0, 3)];
    px(x, y - 1, c); px(x - 1, y, c); px(x + 1, y, c); px(x, y + 1, c); px(x, y, '#ffe9a0'); px(x + 1, y + 2, '#2f8a40');
  }
  function rock(x, y, s) {
    shadowOval(x + 1, y + s - 1, s + 1, 2);
    blob(x, y, s + 1, s, function (dx, dy, edge) { if (edge) return K; var l = dx + dy * 1.3; return l < -0.6 ? '#eceaf6' : l < 0.3 ? '#bdb8d4' : '#8c86ad'; });
  }
  function tallGrass(x, y, w, h) {
    for (var yy = 0; yy < h; yy += 3) for (var xx = 0; xx < w; xx += 3) {
      var qx = (xx - w / 2) / (w / 2), qy = (yy - h / 2) / (h / 2); if (qx * qx + qy * qy > 1) continue;
      px(x + xx, y + yy + 2, '#1f6a34'); px(x + xx + 1, y + yy + 1, '#2f8a3a'); px(x + xx + 1, y + yy, '#7ed65a'); px(x + xx + 2, y + yy + 1, '#2f8a3a'); px(x + xx, y + yy + 1, '#3ca444');
    }
  }
  function pond(x, y, rx, ry) {
    blob(x, y, rx + 1, ry + 1, function (dx, dy, edge) { return edge ? K : (dy < -0.55 ? '#7a5a3a' : null); });
    blob(x, y + 1, rx, ry, function (dx, dy, edge) {
      if (edge) return '#c8f4ff';
      var q = dx * dx + dy * dy;
      return q < 0.35 ? '#3f86d0' : '#5fb8f0';
    });
    for (var i = 0; i < 4; i++) { var a = ri(-rx + 4, rx - 8), b = ri(-ry + 3, ry - 3); rect(x + a, y + b, ri(3, 6), 1, '#bfefff'); }
  }
  function cliff(x0, x1, y, stairX) {
    // the upper ground's lip, the earth face below it, and the shade it casts onto the lower ground (light from the upper left)
    rect(x0, y - 1, x1 - x0, 1, '#9ae86c');
    rect(x0, y, x1 - x0, 1, K);
    var rows = ['#e0b070', '#d6a464', '#c99456', '#ba8048', '#a8703e', '#946034', '#7e4e2c', '#6a3e26'];
    for (var i = 0; i < rows.length; i++) rect(x0, y + 1 + i, x1 - x0, 1, rows[i]);
    for (var x = x0 + ri(2, 6); x < x1; x += ri(5, 11)) { var L = ri(3, 6), y2 = y + ri(1, 3); rect(x, y2, 1, L, '#5a3420'); rect(x + 1, y2, 1, L, '#f0c886'); }
    rect(x0, y + 9, x1 - x0, 1, K);
    rect(x0, y + 10, x1 - x0, 2, 'rgba(16,44,28,.3)');
    for (x = x0; x < x1; x += 2) px(x, y + 12, 'rgba(16,44,28,.3)');
    if (stairX != null) {
      var sx = stairX - 8;
      rect(sx - 1, y - 1, 18, 11, K);
      for (var s = 0; s < 5; s++) { rect(sx, y + s * 2, 16, 1, '#eceaf6'); rect(sx, y + s * 2 + 1, 16, 1, '#9a94b8'); }
      rect(sx, y - 1, 16, 1, '#e8d08c');
    }
  }
  function sandPath(pts, wd) {
    function stamp(c, w) {
      for (var i = 0; i < pts.length - 1; i++) {
        var a = pts[i], b = pts[i + 1];
        var x0 = Math.min(a[0], b[0]) - (w >> 1), y0 = Math.min(a[1], b[1]) - (w >> 1);
        rect(x0, y0, Math.abs(a[0] - b[0]) + w, Math.abs(a[1] - b[1]) + w, c);
      }
    }
    stamp('#b8984e', wd + 2); stamp('#e8d08c', wd);
    for (var i = 0; i < pts.length - 1; i++) {
      var a = pts[i], b = pts[i + 1], n = (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1])) / 5;
      for (var k = 0; k < n; k++) {
        var t = k / n, x = a[0] + (b[0] - a[0]) * t + ri(-(wd >> 1) + 1, (wd >> 1) - 2), y = a[1] + (b[1] - a[1]) * t + ri(-(wd >> 1) + 1, (wd >> 1) - 2);
        px(x, y, rnd() < .5 ? '#cdb06a' : '#f8eab8');
      }
    }
  }
  function drawA() {
    rect(0, 0, AW, AH, '#5cd04c');
    for (var y = 6; y < AH; y += 9) for (var x = (y * 7) % 11; x < AW; x += 13) if (rnd() < .55) tuft(x + ri(0, 5), y + ri(0, 4), '#3aa94a', '#9ae86c');
    for (var i = 0; i < AW * AH / 90; i++) px(ri(0, AW), ri(0, AH), rnd() < .5 ? '#7cdc5a' : '#48bc48');
    var panels = boxes('.topbar .wrap, .lead-hero h1, .hero-film, .facts.proof, .leads-head h2, .leads > .card, .lead-wrap, .section-head h2, .more-g, .method > li, .band, footer.site .wrap');
    var secs = ['.lead-hero', '#work', '#how', 'footer.site'].map(function (s) { var e = d.querySelector(s); return e ? box(e) : null; });
    var wrap = d.querySelector('main .wrap'), wb = wrap ? box(wrap) : { x: 0, w: AW };
    var mL = Math.max(8, Math.floor(wb.x / 2)), mR = Math.min(AW - 8, Math.ceil(wb.x + wb.w + (AW - wb.x - wb.w) / 2));
    if (wb.x < 20) { mL = 6; mR = AW - 6; }
    // the path: down the left margin, across in each gap between sections, down the other side
    var pts = [[mR, 0], [mR, secs[0] ? secs[0].y + 8 : 40]], side = 1, cliffs = [];
    for (i = 1; i < secs.length; i++) {
      if (!secs[i]) continue;
      var gy = secs[i].y - 18;
      var cur = side ? mR : mL, nxt = side ? mL : mR;
      pts.push([cur, gy]); pts.push([nxt, gy]);
      cliffs.push([gy + 5, Math.round((cur + nxt) / 2)]);
      side = 1 - side;
    }
    pts.push([side ? mR : mL, AH + 10]);
    sandPath(pts, wb.x < 20 ? 9 : 13);
    for (i = 0; i < cliffs.length; i++) cliff(0, AW, cliffs[i][0], cliffs[i][1]);
    // a soft shadow under every tablet and sign
    panels.forEach(function (b) { rect(b.x + 2, b.y + b.h, b.w - 1, 2, 'rgba(16,44,28,.28)'); rect(b.x + b.w, b.y + 2, 2, b.h, 'rgba(16,44,28,.2)'); });
    function free(x, y, s) {
      if (hits(panels, x, y, s + 3)) return false;
      for (var j = 0; j < pts.length - 1; j++) {
        var a = pts[j], b = pts[j + 1];
        if (x > Math.min(a[0], b[0]) - 10 - s && x < Math.max(a[0], b[0]) + 10 + s && y > Math.min(a[1], b[1]) - 10 - s && y < Math.max(a[1], b[1]) + 10 + s) return false;
      }
      for (j = 0; j < cliffs.length; j++) if (y > cliffs[j][0] - s - 3 && y < cliffs[j][0] + 14 + s) return false;
      return true;
    }
    // the hedge of trees along the top edge, then the scatter
    for (x = -6; x < AW + 10; x += ri(15, 22)) tree(x, ri(-6, 0), ri(10, 14));
    for (var n = 0; n < AW * AH / 700; n++) {
      x = ri(0, AW); y = ri(26, AH); var k = rnd();
      if (k < .28) { if (free(x, y, 7)) bush(x, y, ri(5, 7)); }
      else if (k < .38) { if (free(x, y, 16) && (x < wb.x - 4 || x > wb.x + wb.w + 4)) tree(x, y, ri(12, 16)); }
      else if (k < .52) { if (free(x, y, 9)) tallGrass(x - 8, y - 5, ri(14, 22), ri(9, 13)); }
      else if (k < .62) { if (free(x, y, 4)) rock(x, y, ri(3, 4)); }
      else { if (free(x, y, 3)) { flower(x, y); if (rnd() < .6) flower(x + ri(3, 6), y + ri(-2, 3)); } }
    }
    var f = secs[3];
    if (f) { var px0 = wb.x > 60 ? AW - Math.floor(wb.x / 2) : AW - 30; pond(px0, f.y - 30, Math.min(26, Math.max(14, wb.x / 2 - 6)), 9); }
  }

  /* ------------------------------------------------------------ option c: the tiny scale */
  function blade(x, y, w, h, lean) {
    // a giant grass blade standing up out of the soil, lit on its left edge
    for (var yy = 0; yy < h; yy++) {
      var t = yy / h, ww = Math.max(1, Math.round(w * Math.min(1, (t * 1.6)))), xx = x + Math.round(lean * (1 - t) * (1 - t) * h * .25);
      rect(xx - 1, y + yy, ww + 2, 1, K);
      rect(xx, y + yy, ww, 1, '#3f9e4a');
      rect(xx, y + yy, Math.max(1, ww >> 2), 1, '#8ee07a');
      if (ww > 3) rect(xx + ww - 1, y + yy, 1, 1, '#2c7440');
      if (ww > 5) px(xx + (ww >> 1), y + yy, '#5fc06a');
    }
    rect(x - 1, y + h, w + 2, 2, 'rgba(40,24,8,.3)');
  }
  function giantLeaf(cx, cy, rx, ry, tone) {
    var P = tone === 'o' ? ['#f6b45a', '#e8893a', '#b8582a'] : tone === 'y' ? ['#fbe07a', '#efc03e', '#b88a24'] : ['#a6ee6a', '#5fc84a', '#2f8a3a'];
    shadowOval(cx + 3, cy + 3, rx, ry);
    blob(cx, cy, rx, ry, function (dx, dy, edge) {
      if (edge) return K;
      if (Math.abs(dy) < 0.07) return P[2];
      var v = Math.abs((dx * 2.2) - Math.abs(dy) * 1.6);
      if ((Math.round(dx * rx) % 6 === 0) && Math.abs(dy) < 0.8 && v < 3) return P[2];
      return (dy < -0.2 && dx < 0.2) ? P[0] : P[1];
    });
    rect(cx + rx - 1, cy, 6, 1, K); rect(cx + rx - 1, cy - 1, 6, 1, P[2]);
  }
  function acorn(x, y, s) {
    shadowOval(x + 2, y + s + 2, s + 2, 3);
    blob(x, y + 3, s, s + 2, function (dx, dy, edge) { if (edge) return K; var l = dx + dy; return l < -0.7 ? '#f0b070' : l < 0.3 ? '#c8803e' : '#8e5226'; });
    blob(x, y - 3, s + 2, s - 3, function (dx, dy, edge) { if (edge) return K; if (dy > 0.5) return null; return ((Math.round(dx * 9) + Math.round(dy * 9)) % 2) ? '#7a4f2a' : '#a0703e'; });
    rect(x - 1, y - s - 2, 2, 3, '#5a3a1e'); px(x - 2, y - s - 2, K);
  }
  function clover(x, y, s) {
    shadowOval(x + 2, y + 2, s * 2, s);
    [[-s + 1, -s + 2], [s - 1, -s + 2], [0, s - 1]].forEach(function (o) {
      blob(x + o[0], y + o[1], s, s - 1, function (dx, dy, edge) { if (edge) return K; return dx + dy < -0.6 ? '#a6ee6a' : '#4fb456'; });
    });
    px(x, y, '#2c7440');
  }
  function pebble(x, y, s) { rock(x, y, s); }
  function pencil(y, x0, x1) {
    rect(x0, y + 9, x1 - x0, 2, 'rgba(40,24,8,.3)');
    rect(x0, y - 1, x1 - x0 - 14, 1, K); rect(x0, y + 8, x1 - x0 - 14, 1, K);
    var body = ['#ffe27a', '#f2c230', '#f2c230', '#dca21e', '#dca21e', '#f2c230', '#c88a1a', '#a8701a'];
    for (var i = 0; i < 8; i++) rect(x0 + 10, y + i, x1 - x0 - 24, 1, body[i]);
    rect(x0, y, 7, 8, '#f08a9a'); rect(x0, y, 7, 2, '#ffc0c8'); rect(x0 + 7, y, 3, 8, '#c0c0c8'); rect(x0 + 8, y, 1, 8, '#ecedf4');
    rect(x0 - 1, y, 1, 8, K);
    for (i = 0; i < 14; i++) { var top = Math.round(i * 4 / 14), h = 8 - top * 2; var xx = x1 - 14 + i; rect(xx, y + top, 1, h, i > 9 ? '#3a3a44' : '#f0c890'); px(xx, y + top - 1, K); px(xx, y + top + h, K); }
  }
  function drawC() {
    rect(0, 0, AW, AH, '#c8a463');
    for (var i = 0; i < AW * AH / 22; i++) { var x = ri(0, AW), y = ri(0, AH), k = rnd(); px(x, y, k < .45 ? '#ad8a4c' : k < .8 ? '#dcbc7c' : '#8e6c38'); }
    for (i = 0; i < AW * AH / 1400; i++) { x = ri(0, AW); y = ri(0, AH); rect(x, y, 2, 1, '#e8d09a'); px(x, y + 1, '#8e6c38'); }
    var panels = boxes('.topbar, .lead-hero h1, .hero-film, .facts.proof, .leads-head h2, .leads > .card, .lead-wrap, .section-head h2, .more-g, .method > li, .band, footer.site .wrap');
    panels.forEach(function (b) { rect(b.x + 3, b.y + b.h, b.w - 2, 3, 'rgba(40,24,8,.28)'); rect(b.x + b.w, b.y + 3, 3, b.h, 'rgba(40,24,8,.2)'); });
    var wrap = d.querySelector('main .wrap'), wb = wrap ? box(wrap) : { x: 0, w: AW };
    var secs = ['#work', '#how', 'footer.site'].map(function (s) { var e = d.querySelector(s); return e ? box(e) : null; });
    function free(x, y, s) { return !hits(panels, x, y, s + 2); }
    // giant objects in the open soil
    // giant things: a leaf longer than a card, an acorn as tall as a heading, sand grains the size of pebbles
    function freeR(x, y, rx, ry) { for (var i = 0; i < panels.length; i++) { var p = panels[i]; if (x + rx > p.x - 2 && x - rx < p.x + p.w + 2 && y + ry > p.y - 2 && y - ry < p.y + p.h + 2) return false; } return true; }
    for (var n = 0; n < AW * AH / 260; n++) {
      x = ri(0, AW); y = ri(30, AH); var k2 = rnd(), rx, ry;
      if (k2 < .12) { rx = ri(38, 60); ry = ri(16, 24); if (freeR(x, y, 10, 8)) giantLeaf(x, y, rx, ry, ['o', 'y', 'g'][ri(0, 2)]); }
      else if (k2 < .2) { rx = ri(14, 20); if (freeR(x, y, 6, 6)) acorn(x, y, rx); }
      else if (k2 < .32) { rx = ri(12, 16); if (freeR(x, y, rx * 2 + 2, rx * 2)) clover(x, y, rx); }
      else if (k2 < .7) { rx = ri(4, 9); if (freeR(x, y, rx + 2, rx + 2)) pebble(x, y, rx); }
    }
    // grass blades rising along both edges
    var edgeW = Math.max(10, wb.x - 2);
    for (y = 10; y < AH; y += ri(40, 80)) {
      var h = ri(90, 220), bw = ri(10, 16);
      blade(ri(-6, Math.max(2, edgeW - bw - 4)), y, bw, h, ri(-4, 4));
      blade(AW - ri(bw, Math.max(bw + 2, edgeW)), y + ri(0, 30), bw, h, ri(-4, 4));
    }
    // a pencil lying across each gap between sections
    for (i = 0; i < secs.length; i++) if (secs[i]) pencil(secs[i].y - 16, Math.max(4, wb.x - 30), Math.min(AW - 4, wb.x + wb.w + 30));
  }

  function draw() {
    var mv = r.getAttribute('data-mv') || 'a';
    if (r.getAttribute('data-look') !== 'mini' || mv === 'b') { if (box0) box0.style.display = 'none'; return; }
    PX = innerWidth <= 620 ? 2 : 3;
    var foot = d.querySelector('footer.site'), bottom = foot ? foot.getBoundingClientRect().bottom + scrollY : d.body.scrollHeight;
    var w = Math.ceil(r.clientWidth / PX), h = Math.ceil(bottom / PX) + 2;
    if (!cv) { box0 = d.createElement('div'); box0.className = 'mini-world'; box0.setAttribute('aria-hidden', 'true'); cv = d.createElement('canvas'); box0.appendChild(cv); d.body.insertBefore(box0, d.body.firstChild); }
    box0.style.display = ''; box0.style.height = (h * PX) + 'px';
    cv.width = AW = w; cv.height = AH = h; cv.style.width = (w * PX) + 'px'; cv.style.height = (h * PX) + 'px';
    g = cv.getContext('2d'); g.imageSmoothingEnabled = false; seed = 20261121;
    if (mv === 'c') drawC(); else drawA();
  }
  var tm = 0, lastW = -1, lastH = -1;
  function soon() { clearTimeout(tm); tm = setTimeout(function () { var bw = r.clientWidth, bh = d.body.offsetHeight; if (bw === lastW && bh === lastH) return; lastW = bw; lastH = bh; draw(); }, 120); }
  function start() {
    draw(); lastW = r.clientWidth; lastH = d.body.offsetHeight;
    if (W.ResizeObserver) new ResizeObserver(soon).observe(d.body);
    addEventListener('resize', soon);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(function () { lastW = -1; soon(); });
    addEventListener('load', function () { lastW = -1; soon(); });
    new MutationObserver(function () { lastW = -1; soon(); }).observe(r, { attributes: true, attributeFilter: ['data-look', 'data-mv'] });
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
