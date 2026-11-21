/* Option C, "Cut into the island": the page IS the island, seen in cutaway. Sky and clouds over a grass cap; below it a cliff
   of upright lit / shade facets; every panel is a niche CUT INTO that rock (deep.css, .dp-niche: its inner walls lit or in
   shade by which way they face, the rim's hard shadow falling across the back wall). Each section is a terrace a step lower,
   its grass ledge casting onto the rock below; the page ends where the cliff meets the sea, on a wooden jetty. */
(function () {
  var DK = window.DK, d = document, b = d.body, main = d.querySelector("main");
  var one = d.querySelector(".hero-one"), film = d.querySelector(".hero-film");
  if (one && film && !d.querySelector(".hero-text")) {
    var t = DK.el("div", "hero-text"), h1 = one.querySelector("h1"), who = one.querySelector(".hero-who");
    [].slice.call(one.children).filter(function (e) { return e !== film && e !== h1 && e !== who; }).forEach(function (e) { t.appendChild(e); });
    one.insertBefore(t, film);
  }
  DK.mark(".hero-text, .hero-film, .card.lead, .more-g, .band, .facts", "dp-niche");
  DK.mark(".hero-film, .card.lead", "dp-deep");
  DK.mark(".hero-mail a, .btn, .badge, .film-script summary, .vid-sound, .method .pills span", "dp-chip");
  d.documentElement.style.setProperty("--rock", DK.rockTile(620, 900, 6));

  /* the sky and the island's top over the head of the page */
  var top = DK.el("div", "dc-top", "", b, true); top.setAttribute("aria-hidden", "true");
  [[60, 520, 150, 31, 7], [640, 420, 120, 17, 6], [1100, 600, 170, 13, 8], [1700, 480, 140, 23, 7]].forEach(function (c) {
    var s = DK.el("div", "dc-cloud", DK.cloud(c[1], c[2], c[3], c[4]), top); s.style.left = c[0] + "px";
  });
  DK.el("div", "dc-far", DK.far(2400, 46, 12, 10), top);
  var palm = DK.el("div", "dc-palm", DK.palm(220, 210), top);
  /* terraces: a grass ledge before each later section and before the shore */
  ["#work", "#how", "footer.site"].forEach(function (sel, i) {
    var at = d.querySelector(sel); if (!at) return;
    var L = DK.el("div", "dc-ledge dc-ledge" + i); L.setAttribute("aria-hidden", "true");
    at.parentNode.insertBefore(L, at);
  });
  /* the sea at the foot of the cliff, the jetty over it */
  var f = d.querySelector("footer.site");
  if (f) { var sea = DK.el("div", "dc-sea"); sea.setAttribute("aria-hidden", "true"); f.parentNode.insertBefore(sea, f); }
})();
