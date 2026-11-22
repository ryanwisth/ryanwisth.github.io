/* Mini World (Nov 21 2026): the ground under the page, a top-down, three-quarter-view pixel field.
   look-mini.css draws every object the page's parts become (stone tablets, wooden notice boards) from 1x tiles in
   img/mini/; this paints the field they stand on, once, onto one <canvas> at art scale (1 art pixel = 3 CSS px, 2 on
   phones), shown with image-rendering: pixelated. It never moves; it is redrawn only when the page's size, the light/dark
   setting or the look changes.
   What it paints: grass with tufts; a sand path that winds down the margins (on phones it keeps a lane of its own down
   the left edge, never under the panels) and crosses wherever the page moves on; a cliff at each crossing (lit lip,
   shaded earth face, stone stairs where the path goes down); trees along the top, bushes, tall grass, flowers, rocks,
   a pond near the footer; and a solid shadow under every tablet and board. Night (the dark setting) is the same field
   under a moonlit tint. Every shape is drawn by the code below: ground and objects only, no people or creatures.
   look.js loads this file whenever the page wears data-look="mini", with or without reduced motion (it draws, it does
   not animate). */
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
  /* the parts of the page that are objects on the field (look-mini.css frames each one) */
  var OBJ = '.topbar .wrap, .lead-hero h1, .hero-sub, .hero-mail, .hero-film, .facts, .leads-head h2, .leads > .card, .lead-wrap, .section-head h2, .more-g, ' +
    '.method > li, .band, footer.site .wrap, .case-head, main .figure, main > .prose, .hx-log, .repo-card, .pager a, .case-toc';
  function night() {
    var t = r.getAttribute('data-theme');
    return t === 'dark' || (t !== 'light' && W.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function drawField() {
    rect(0, 0, AW, AH, '#5cd04c');
    for (var y = 6; y < AH; y += 9) for (var x = (y * 7) % 11; x < AW; x += 13) if (rnd() < .55) tuft(x + ri(0, 5), y + ri(0, 4), '#3aa94a', '#9ae86c');
    for (var i = 0; i < AW * AH / 90; i++) px(ri(0, AW), ri(0, AH), rnd() < .5 ? '#7cdc5a' : '#48bc48');
    var panels = boxes(OBJ).filter(function (b) { return b.w > 2 && b.h > 2; });
    var phone = AW * PX <= 620;
    // the content column: the widest run of objects; the margins either side of it carry the path
    var left = AW, right = 0;
    panels.forEach(function (b) { if (b.w < AW * .9) { left = Math.min(left, b.x); right = Math.max(right, b.x + b.w); } });
    if (left >= right) { left = 10; right = AW - 10; }
    var lane = phone ? 9 : 13;
    var mL = phone ? Math.max(5, Math.floor(left / 2)) : Math.max(8, Math.floor(left / 2));
    var mR = phone ? mL : Math.min(AW - 8, Math.ceil(right + (AW - right) / 2));
    // gaps between bands of objects: where the page moves on, the ground steps down a cliff and the path crosses
    var sorted = panels.slice().sort(function (a, b) { return a.y - b.y; }), bands = [];
    sorted.forEach(function (b) { var last = bands[bands.length - 1]; if (last && b.y <= last.y1 + 2) last.y1 = Math.max(last.y1, b.y + b.h); else bands.push({ y0: b.y, y1: b.y + b.h }); });
    var cliffs = [], lastC = -1e9, topY = bands.length ? bands[0].y1 : 40;
    for (i = 1; i < bands.length; i++) {
      var gap = bands[i].y0 - bands[i - 1].y1;
      if (gap >= 22 && bands[i - 1].y1 > topY && bands[i - 1].y1 - lastC > (phone ? 220 : 160)) { var cy = bands[i - 1].y1 + Math.floor((gap - 13) / 2) + 2; cliffs.push(cy); lastC = cy; }
    }
    var pts = [[mR, 0]], side = 1;
    cliffs.forEach(function (cy) {
      var cur = side ? mR : mL, nxt = phone ? mL : (side ? mL : mR);
      pts.push([cur, cy - 7]); pts.push([nxt, cy - 7]); pts.push([nxt, cy + 14]);
      if (!phone) side = 1 - side;
    });
    pts.push([side ? mR : mL, AH + 10]);
    sandPath(pts, lane);
    var stairs = [];
    cliffs.forEach(function (cy, k) { var cur = phone ? mL : (k % 2 === 0 ? mL : mR); stairs.push(cur); cliff(0, AW, cy, cur); });
    panels.forEach(function (b) { rect(b.x + 2, b.y + b.h, b.w - 1, 2, 'rgba(16,44,28,.28)'); rect(b.x + b.w, b.y + 2, 2, b.h, 'rgba(16,44,28,.2)'); });
    function free(x, y, s) {
      if (hits(panels, x, y, s + 3)) return false;
      for (var j = 0; j < pts.length - 1; j++) {
        var a = pts[j], b = pts[j + 1], h = (lane >> 1) + 3 + s;
        if (x > Math.min(a[0], b[0]) - h && x < Math.max(a[0], b[0]) + h && y > Math.min(a[1], b[1]) - h && y < Math.max(a[1], b[1]) + h) return false;
      }
      for (j = 0; j < cliffs.length; j++) if (y > cliffs[j] - s - 3 && y < cliffs[j] + 14 + s) return false;
      return true;
    }
    for (x = -6; x < AW + 10; x += ri(15, 22)) tree(x, ri(-6, 0), ri(10, 14));
    for (var n = 0; n < AW * AH / 700; n++) {
      x = ri(0, AW); y = ri(26, AH); var k = rnd();
      if (k < .28) { if (free(x, y, 7)) bush(x, y, ri(5, 7)); }
      else if (k < .38) { if (free(x, y, 16) && (x < left - 4 || x > right + 4)) tree(x, y, ri(12, 16)); }
      else if (k < .52) { if (free(x, y, 9)) tallGrass(x - 8, y - 5, ri(14, 22), ri(9, 13)); }
      else if (k < .62) { if (free(x, y, 4)) rock(x, y, ri(3, 4)); }
      else { if (free(x, y, 3)) { flower(x, y); if (rnd() < .6) flower(x + ri(3, 6), y + ri(-2, 3)); } }
    }
    var foot = d.querySelector('footer.site');
    if (foot && !phone && AW - right > 40) { var fb = box(foot); pond(AW - Math.floor((AW - right) / 2) - 4, fb.y - 34, Math.min(26, Math.floor((AW - right) / 2) - 8), 9); }
    if (night()) {
      // after dark: one moonlit tint over the whole field (multiply keeps every pixel's step and outline)
      g.globalCompositeOperation = 'multiply'; rect(0, 0, AW, AH, '#3d4f8c'); g.globalCompositeOperation = 'source-over';
      for (i = 0; i < AW * AH / 2600; i++) { x = ri(0, AW); y = ri(0, AH); if (!hits(panels, x, y, 2)) { px(x, y, '#d8e4ff'); } }
    }
  }

  function draw() {
    if (r.getAttribute('data-look') !== 'mini') { if (box0) box0.style.display = 'none'; return; }
    PX = innerWidth <= 620 ? 2 : 3;
    var foot = d.querySelector('footer.site'), bottom = foot ? foot.getBoundingClientRect().bottom + scrollY : d.body.scrollHeight;
    var w = Math.ceil(r.clientWidth / PX), h = Math.ceil(bottom / PX) + 2;
    if (!cv) { box0 = d.createElement('div'); box0.className = 'mini-world'; box0.setAttribute('aria-hidden', 'true'); cv = d.createElement('canvas'); box0.appendChild(cv); d.body.insertBefore(box0, d.body.firstChild); }
    box0.style.display = ''; box0.style.height = (h * PX) + 'px';
    cv.width = AW = w; cv.height = AH = h; cv.style.width = (w * PX) + 'px'; cv.style.height = (h * PX) + 'px';
    g = cv.getContext('2d'); g.imageSmoothingEnabled = false; seed = 20261121;
    drawField();
  }
  var tm = 0, lastW = -1, lastH = -1;
  function soon() { clearTimeout(tm); tm = setTimeout(function () { var bw = r.clientWidth, bh = d.body.offsetHeight; if (bw === lastW && bh === lastH) return; lastW = bw; lastH = bh; draw(); }, 120); }
  function again() { lastW = -1; soon(); }
  function start() {
    draw(); lastW = r.clientWidth; lastH = d.body.offsetHeight;
    if (W.ResizeObserver) new ResizeObserver(soon).observe(d.body);
    addEventListener('resize', soon);
    if (d.fonts && d.fonts.ready) d.fonts.ready.then(again);
    addEventListener('load', again);
    new MutationObserver(again).observe(r, { attributes: true, attributeFilter: ['data-look', 'data-theme'] });
    if (W.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', again); }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
