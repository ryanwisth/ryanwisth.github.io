/* Cel & Tide, deep overhaul: three option prototypes on the real home page (Nov 21 2026, waiting on Ryan's pick).
   Try one with  ?look=cel&deep=a  (or b, c). The choice lasts for the tab. ?deep=off goes back to today's look.
     a  "Diorama layers": parallax world behind the page; every panel a solid lit slab casting a hard shadow.
     b  "Live toon sea": a WebGL toon sea behind the page, the camera travels with scroll; panels are plates afloat.
     c  "Cut into the island": the page is the island in cutaway; content sits in niches carved into lit rock,
        terraces step down to a wooden jetty on the sea.
   Everything for the options lives in deep/. look-cel.css stays underneath as the base; look-cel.js is not loaded
   in these options (its margin thread and extras belong to today's look). */
(function () {
  var r = document.documentElement, m = /[?&]deep=(a|b|c|off)\b/.exec(location.search), k = null;
  try { if (m) sessionStorage.setItem("deep", m[1]); k = sessionStorage.getItem("deep"); } catch (e) { k = m && m[1]; }
  if (!k || k === "off" || r.getAttribute("data-look") !== "cel") return;
  r.setAttribute("data-deep", k);
  var BASE = document.currentScript.src.replace(/[^\/]*$/, "");
  document.write('<link rel="stylesheet" href="' + BASE + 'deep.css">');
  /* keep today's moving extras out: site.js skips a look script whose id is already on the page */
  function stub() { if (!document.getElementById("look-cel-js")) { var s = document.createElement("meta"); s.id = "look-cel-js"; document.head.appendChild(s); } }
  stub();
  function load() {
    function add(src, mod, then) { var s = document.createElement("script"); s.src = BASE + src; if (mod) s.type = "module"; if (then) s.onload = then; document.body.appendChild(s); }
    /* deep-kit.js: the shared pieces (slab classes, the painted world's SVG makers, shadow copies of headings) */
    add("deep-kit.js", false, function () { add("deep-" + k + ".js", k === "b"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", load); else load();
})();
