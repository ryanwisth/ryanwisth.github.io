/* Pen & Hatch (key hatch): the home film's calm poster, while this look has no film twins of its own (films false in
   LOOK_ROWS, so the yarn film is the one that plays). Puts img/hatch/poster-index[-night].jpg on the home film and holds
   it until a press (no auto-play of the yarn film inside this look); follows the light/dark setting. Loaded by look.js.
   Once hatch film twins exist (films true), this file goes. Spec: page-films/out/hatch/LOOK.md section 5. */
(function () {
  var d = document, r = d.documentElement, BASE = "";
  try { BASE = d.currentScript.src.replace(/[^\/]*$/, ""); } catch (e) {}
  var mq = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
  function on() { return r.getAttribute("data-look") === "hatch"; }
  function night() { var t = r.getAttribute("data-theme"); if (t === "dark" || t === "light") return t === "dark"; return !!(mq && mq.matches); }
  function poster() {
    var v = d.querySelector(".lead-hero .hero-film video"); if (!v || !on()) return;
    var u = BASE + "img/hatch/poster-index" + (night() ? "-night" : "") + ".jpg";
    if (v.getAttribute("poster") !== u) v.setAttribute("poster", u);
    if (!v.dataset.phHeld) {
      v.dataset.phHeld = "1"; v.dataset.held = "1";
      if (!v.paused) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
    }
  }
  if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", poster); else poster();
  addEventListener("load", poster);
  if (window.MutationObserver) new MutationObserver(poster).observe(r, { attributes: true, attributeFilter: ["data-theme"] });
  if (mq && mq.addEventListener) mq.addEventListener("change", poster);
})();
