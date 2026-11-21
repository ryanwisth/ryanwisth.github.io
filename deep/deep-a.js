/* Option A, "Diorama layers": the world behind the page is five planes that scroll at their own rates (sky, cloud bank,
   far islands in haze, the horizon sea, a near island), so the page reads as a deep stage; every panel on it is a solid slab
   (deep.css, .dp-slab) lit from the upper left, casting a hard shadow onto whatever plane lies under it. */
(function () {
  var DK = window.DK, d = document, b = d.body;
  /* the panels become slabs, the small controls chips */
  DK.mark(".topbar > .wrap, .hero-film, .hero-sub, .card.lead, .fact, .more-g, .method li, .band", "dp-slab");
  DK.mark(".hero-mail a, .btn, .badge, .film-script summary, .vid-sound, .method .pills span", "dp-chip");
  DK.castText(".hero h1, .hero-who, .leads-head h2, .section-head h2");

  /* the world */
  var W = 2400, w = DK.el("div", "dw", "", b, true); w.setAttribute("aria-hidden", "true");
  var sky = DK.el("div", "dw-sky", "", w), haze = DK.el("div", "dw-haze", "", w);
  var clouds = DK.el("div", "dw-clouds", "", w);
  [[40, 640, 230, 11, 7], [700, 520, 170, 21, 6], [1250, 760, 260, 5, 8], [1950, 600, 200, 9, 7]].forEach(function (c) {
    var s = DK.el("div", "", DK.cloud(c[1], c[2], c[3], c[4]), clouds); s.style.cssText = "position:absolute;left:" + c[0] + "px;bottom:0";
  });
  var far = DK.el("div", "dw-far", DK.far(W, 70, 4, 9), w);
  var sea = DK.el("div", "dw-sea", "", w), net = DK.el("div", "dw-net", "", sea);
  var isle = DK.el("div", "dw-isle", DK.isle(560, 330, 3, true), w);
  isle.firstChild.style.cssText = "position:absolute;right:-60px;bottom:0";
  var isle2 = DK.el("div", "dw-isle dw-isle2", DK.isle(300, 190, 8, false), w);
  isle2.firstChild.style.cssText = "position:absolute;left:3%;bottom:0";

  /* the camera: the horizon starts low (70% down the window) and rises as the page scrolls, so the lower page lies
     over open sea; each plane moves at its own rate, nearer ones faster */
  DK.onScroll(function (y, vh, vw) {
    var hz0 = vh * .72, rise = Math.min(y * .2, hz0 - vh * .16), hz = hz0 - rise;
    w.style.setProperty("--hz", hz0 + "px");
    clouds.style.transform = "translate3d(0," + (-rise * .45) + "px,0)";
    haze.style.transform = far.style.transform = sea.style.transform = "translate3d(0," + (-rise) + "px,0)";
    isle.style.transform = "translate3d(" + (-y * .05) + "px," + (-rise * 1.9) + "px,0)";
    isle2.style.transform = "translate3d(" + (y * .03) + "px," + (-rise * 1.35) + "px,0)";
    net.style.setProperty("--ny", (-y * .35) + "px");
    clouds.style.left = (-y * .02) + "px";
  });
})();
