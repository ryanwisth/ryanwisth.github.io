/* Cel & Tide deep options: shared kit (A and C use the SVG makers; all three use the slab marks and heading shadows).
   Every shape is made here by code. One sun, upper left: lit faces look up and left, shade faces down and right,
   one hard edge between them. */
(function () {
  var d = document, DK = window.DK = {};
  DK.rng = function (seed) { var a = seed >>> 0; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  DK.all = function (sel) { return [].slice.call(d.querySelectorAll(sel)); };
  DK.mark = function (sel, cls) { DK.all(sel).forEach(function (e) { cls.split(" ").forEach(function (c) { e.classList.add(c); }); }); };
  DK.el = function (tag, cls, html, parent, first) { var e = d.createElement(tag); if (cls) e.className = cls; if (html) e.innerHTML = html; if (parent) { if (first) parent.insertBefore(e, parent.firstChild); else parent.appendChild(e); } return e; };
  /* a heading's cast shadow: a copy of its words (data-t), painted #9c8c86 in multiply under it, offset lower right */
  DK.castText = function (sel) { DK.all(sel).forEach(function (e) { e.setAttribute("data-t", e.textContent.replace(/\s+/g, " ").trim()); e.classList.add("dp-cast"); }); };
  var id = 0;
  /* a cloud bank: lumps (circles) on a flat base. Each lump's lit part is the same circle moved up-left, clipped to the
     bank, so every lump carries a hard shade crescent lower right; the underside is one shade band */
  DK.cloud = function (w, h, seed, n) {
    var R = DK.rng(seed), c = [], i, k = "dk" + (++id), base = h * .86;
    for (i = 0; i < n; i++) {
      var t = (i + .5) / n, r = h * (.22 + .34 * Math.sin(Math.PI * t) * (.6 + .4 * R()));
      c.push([w * (.06 + .88 * t) + (R() - .5) * w * .05, base - r * (.35 + .4 * R()), r]);
    }
    c.push([w * .5, base - h * .1, Math.min(w * .42, h * .3)]);
    var circ = function (dx, dy, s) { return c.map(function (q) { return '<circle cx="' + (q[0] + dx * q[2]).toFixed(1) + '" cy="' + (q[1] + dy * q[2]).toFixed(1) + '" r="' + (q[2] * s).toFixed(1) + '"/>'; }).join(""); };
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' +
      '<defs><clipPath id="' + k + 'u">' + circ(0, 0, 1) + '</clipPath><clipPath id="' + k + 'b"><rect x="0" y="0" width="' + w + '" height="' + base + '"/></clipPath></defs>' +
      '<g clip-path="url(#' + k + 'b)"><g fill="#a9c1cf">' + circ(0, 0, 1) + '</g>' +
      '<g clip-path="url(#' + k + 'u)"><g fill="#eeeff0"><g clip-path="url(#' + k + 'b)">' + circ(-.16, -.22, .97) + '</g></g>' +
      '<rect x="0" y="' + (base - h * .09) + '" width="' + w + '" height="' + h + '" fill="#a9c1cf"/></g></g></svg>';
  };
  /* far islands: flat silhouettes in the haze colour on the horizon */
  DK.far = function (w, h, seed, n) {
    var R = DK.rng(seed), s = "", i;
    for (i = 0; i < n; i++) {
      var x = w * (i + R() * .6) / n, bw = 60 + R() * 170, bh = h * (.25 + R() * .7), p = [];
      p.push([x, h]); p.push([x + bw * .12, h - bh * .7]); p.push([x + bw * .3, h - bh]); p.push([x + bw * .55, h - bh * .86]); p.push([x + bw * .8, h - bh * .45]); p.push([x + bw, h]);
      s += '<path fill="' + (i % 2 ? "#5c6892" : "#616c8c") + '" d="M' + p.map(function (q) { return q[0].toFixed(1) + " " + q[1].toFixed(1); }).join("L") + 'Z"/>';
    }
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' + s + "</svg>";
  };
  function palmPaths(px, py, ph) {
      var tx = px + 26, ty2 = py - ph, s = "";
      s += '<path fill="#76714c" d="M' + (px - 7) + " " + py + "Q" + (px + 4) + " " + (py - ph * .5) + " " + (tx - 4) + " " + ty2 + "L" + (tx + 4) + " " + (ty2 + 2) + "Q" + (px + 12) + " " + (py - ph * .5) + " " + (px + 7) + " " + py + 'Z"/>';
      s += '<path fill="#4a3f2a" d="M' + (px + 1) + " " + py + "Q" + (px + 8) + " " + (py - ph * .5) + " " + (tx + 1) + " " + (ty2 + 1) + "L" + (tx + 4) + " " + (ty2 + 2) + "Q" + (px + 12) + " " + (py - ph * .5) + " " + (px + 7) + " " + py + 'Z"/>';
      var fr = [[-1, -.25], [-.9, .35], [-.35, -.75], [.45, -.7], [1, -.15], [.95, .45], [.1, .9]];
      fr.forEach(function (f, j) {
        var L = 70 + 14 * (j % 3), ex = tx + f[0] * L, ey = ty2 + f[1] * L * .6 + 18, cx = tx + f[0] * L * .5, cy = ty2 - 22 + f[1] * 10;
        var lit = f[0] < .3 && f[1] < .5;
        s += '<path fill="' + (lit ? "#4a792b" : "#125028") + '" d="M' + tx + " " + ty2 + "Q" + cx + " " + (cy - 10) + " " + ex + " " + ey + "Q" + (cx + 4) + " " + (cy + 10) + " " + tx + " " + (ty2 + 6) + 'Z"/>';
        if (lit) s += '<path fill="#125028" d="M' + tx + " " + (ty2 + 3) + "Q" + (cx + 2) + " " + (cy + 2) + " " + ex + " " + ey + "Q" + (cx + 4) + " " + (cy + 10) + " " + tx + " " + (ty2 + 6) + 'Z"/>';
      });
        return s;
  }
  DK.palm = function (w, h) { return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' + palmPaths(w * .42, h, h * .72) + "</svg>"; };
  /* a near island: a rock of upright facets (lit ones face left, shade ones right), a grass cap with its front lip in
     shade, a foam line where it meets the water, one palm. w x h, the waterline at h - 30 */
  DK.isle = function (w, h, seed, palm) {
    var R = DK.rng(seed), wl = h - 34, top = h * .34, s = "", i, n = 7, xs = [], k = "dk" + (++id);
    for (i = 0; i <= n; i++) xs.push(w * (.06 + .88 * i / n) + (i > 0 && i < n ? (R() - .5) * w * .05 : 0));
    var ty = function (x) { var u = (x - w * .06) / (w * .88); return top + Math.pow(Math.abs(u - .45) * 2, 2.4) * (wl - top) * .55 + 6 * Math.sin(u * 17); };
    /* the rock: each facet a quad from the grass line to the water; facets alternate lit / shade by which way they lean */
    for (i = 0; i < n; i++) {
      var x0 = xs[i], x1 = xs[i + 1], xm = (x0 + x1) / 2 + (R() - .5) * 14, y0 = ty(x0) + 12, y1 = ty(x1) + 12;
      s += '<path fill="#505469" d="M' + x0 + " " + (y0) + "L" + xm + " " + ((y0 + y1) / 2 - 4) + "L" + (xm - 8) + " " + wl + "L" + (x0 - (i === 0 ? 14 : 0)) + " " + wl + 'Z"/>';
      s += '<path fill="#3e404e" d="M' + xm + " " + ((y0 + y1) / 2 - 4) + "L" + x1 + " " + y1 + "L" + (x1 + (i === n - 1 ? 16 : 0)) + " " + wl + "L" + (xm - 8) + " " + wl + 'Z"/>';
      s += '<path fill="none" stroke="#30313d" stroke-width="2.2" d="M' + (xm - 2) + " " + ((y0 + y1) / 2 + 10) + "L" + (xm - 6) + " " + (wl - 8) + '"/>';
    }
    /* the grass cap: lit top, its front lip a band in shade (one hard step) */
    var g = [], g2 = [];
    for (i = 0; i <= 40; i++) { var x = w * (.04 + .92 * i / 40); g.push(x.toFixed(1) + " " + (ty(x) - 2).toFixed(1)); g2.push(x.toFixed(1) + " " + (ty(x) + 16 + 5 * Math.sin(i * 1.7)).toFixed(1)); }
    s += '<path fill="#405a1a" d="M' + g.join("L") + "L" + g2.reverse().join("L") + 'Z"/>';
    var gt = []; for (i = 0; i <= 40; i++) { var x2 = w * (.04 + .92 * i / 40); gt.push(x2.toFixed(1) + " " + (ty(x2) + 7 + 3 * Math.sin(i * 2.3)).toFixed(1)); }
    s += '<path fill="#6a8a31" d="M' + w * .04 + " " + (ty(w * .04) - 14) + "Q" + w * .45 + " " + (top - 26) + " " + w * .96 + " " + (ty(w * .96) - 14) + "L" + gt.reverse().join("L") + 'Z"/>';
    s += '<path fill="#7d9c3c" d="M' + w * .1 + " " + (ty(w * .1) - 12) + "Q" + w * .38 + " " + (top - 22) + " " + w * .56 + " " + (top - 14) + "Q" + w * .3 + " " + (top - 6) + " " + w * .1 + " " + (ty(w * .1) - 6) + 'Z"/>';
    /* foam where rock meets water */
    s += '<path fill="#ffffff" d="M' + (w * .02) + " " + (wl - 2) + "Q" + w * .5 + " " + (wl - 10) + " " + w * .98 + " " + (wl - 2) + "Q" + w + " " + (wl + 9) + " " + w * .9 + " " + (wl + 10) + "Q" + w * .5 + " " + (wl + 16) + " " + w * .08 + " " + (wl + 10) + "Q" + 0 + " " + (wl + 8) + " " + w * .02 + " " + (wl - 2) + 'Z"/>';
    if (palm) s += palmPaths(w * .62, top - 8, h * .44);
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" aria-hidden="true">' + s + "</svg>";
  };
  /* a tile of cliff face: upright facets, each a lit side (facing left, toward the sun) and a shade side, a crack between,
     and now and then a ledge line. Repeats sideways and down without a seam (the facets run the full height). */
  DK.rockTile = function (w, h, seed) {
    /* rows of blocks; each block a solid: its front face lit, a top bevel that faces up (lighter), a right side face in
       shade, a crack round it. Rows and blocks are cut to fill the tile exactly, so it repeats both ways. */
    var R = DK.rng(seed), s = "", y = 0;
    while (y < h) {
      var rh = 80 + R() * 90; if (h - (y + rh) < 70) rh = h - y;
      var x = -R() * 60, first = null;
      while (x < w) {
        var bw = 70 + R() * 110; if (x + bw > w - 50 && x + bw < w + 50) bw = w - x;
        var tb = 7 + R() * 6, sw = 10 + R() * 12, sk = (R() - .5) * 10;
        [0, -w, w].forEach(function (o) {
          var X = x + o; if (X > w || X + bw < 0) return;
          s += '<rect x="' + X.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + bw.toFixed(1) + '" height="' + rh.toFixed(1) + '" fill="#30313d"/>';
          s += '<path fill="#505469" d="M' + (X + 2) + " " + (y + tb) + "L" + (X + bw - sw) + " " + (y + tb + sk * .3) + "L" + (X + bw - sw + sk) + " " + (y + rh - 3) + "L" + (X + 2) + " " + (y + rh - 3) + 'Z"/>';
          s += '<path fill="#3e404e" d="M' + (X + bw - sw) + " " + (y + tb + sk * .3) + "L" + (X + bw - 2) + " " + (y + tb - 3) + "L" + (X + bw - 2) + " " + (y + rh - 3) + "L" + (X + bw - sw + sk) + " " + (y + rh - 3) + 'Z"/>';
          s += '<path fill="#6a6f88" d="M' + (X + 2) + " " + (y + 2) + "L" + (X + bw - 2) + " " + (y + 2) + "L" + (X + bw - 2) + " " + (y + tb - 3) + "L" + (X + bw - sw) + " " + (y + tb + sk * .3) + "L" + (X + 2) + " " + (y + tb) + 'Z"/>';
        });
        x += bw;
      }
      y += rh;
    }
    return "url(\"data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + " " + h + '">' + s + "</svg>") + "\")";
  };
  /* one rAF per frame while the page moves; fn(scrollY, viewport height) */
  DK.onScroll = function (fn) {
    var raf = 0; function go() { raf = 0; fn(window.scrollY, innerHeight, innerWidth); }
    addEventListener("scroll", function () { if (!raf) raf = requestAnimationFrame(go); }, { passive: true });
    addEventListener("resize", function () { if (!raf) raf = requestAnimationFrame(go); });
    go();
  };
  DK.still = matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.getAttribute("data-motion") === "paused";
})();
