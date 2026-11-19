/* Which look the site wears. One site carries all four:
     "yarn"   yarn and felt     (style.css on its own)
     "wash"   ink and wash      (style.css, then look-wash.css on top)
     "brush"  brush and scroll  (style.css, then look-brush.css on top)
     "cel"    cel and tide      (style.css, then look-cel.css on top)

   TO SWITCH THE DEFAULT for every visitor, change the one word on the next line. */
var SITE_LOOK = "yarn";

/* The small round button beside the light/dark button in the top bar steps through the looks: yarn, wash, brush, cel, yarn.
   TO TAKE THAT BUTTON AWAY, change true to false on the next line (both looks and ?look= keep working). */
var LOOK_SWITCH = true;

/* To try a look without changing anything, add ?look=wash, ?look=brush, ?look=cel or ?look=yarn to any page address.
   That choice lasts for that browser tab (so two tabs can show the two looks side by side).
   A click on the button is remembered by that browser for later visits. */
(function () {
  var LOOKS = ["yarn", "wash", "brush", "cel"], look = SITE_LOOK, m = /[?&]look=(yarn|wash|brush|cel)\b/.exec(location.search), kept = null;
  try {
    if (m) sessionStorage.setItem("look", m[1]);
    kept = sessionStorage.getItem("look") || localStorage.getItem("look");
  } catch (e) { if (m) kept = m[1]; }
  if (LOOKS.indexOf(kept) >= 0) look = kept;

  var root = document.documentElement;
  var TINT = { wash: ["#f5f1ea", "#0f1730"], brush: ["#efe5cf", "#141a33"], cel: ["#5078ff", "#101b4d"] };   // the browser bar's colour: light, dark
  if (look !== "yarn") {                              // yarn adds no stylesheet: the page is drawn exactly as before
    root.setAttribute("data-look", look);
    document.write('<link rel="stylesheet" href="look-' + look + '.css">');
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].content = TINT[look][/dark/.test(metas[i].media) ? 1 : 0];
  }
  if (!document.addEventListener) return;

  /* Each page's narrated film has a twin per look: video/film-<name>.mp4 (yarn), video/film-<name>-<look>.mp4 with poster
     img/film-<name>-<look>.jpg (wash, brush, cel). Same length and soundtrack, so a click on the switch carries the moment over.
     A twin that is missing falls back to the yarn film. The yarn look writes nothing to the films. Other videos
     (captures, previews) are never touched. */
  var FILM = /video\/film-([a-z0-9-]+?)(-wash|-brush|-cel)?\.mp4$/, swapped = typeof WeakMap === "function" ? new WeakMap() : null;
  function srcOf(v) { var s = v.querySelector("source[src]"); return s || (v.hasAttribute("src") ? v : null); }
  function nameOf(v) { var e = srcOf(v), m = e && FILM.exec(e.getAttribute("src") || ""); return m ? m[1] : null; }
  function resume(v, s) {                             // put a film back at a moment: time, sound, playing or held
    var sb = v.parentNode && v.parentNode.querySelector(".vid-sound");
    function label() { if (sb) { sb.textContent = v.muted ? "♪ Play with sound" : "♪ Mute"; sb.setAttribute("aria-pressed", v.muted ? "false" : "true"); } }
    function seek() { if (Math.abs(v.currentTime - s.t) > 0.3) try { v.currentTime = s.t; } catch (e) {} }
    v.muted = s.mu; label();
    if (s.h) v.dataset.held = "1";
    seek(); v.addEventListener("loadedmetadata", seek, { once: true });
    if (s.p) {
      var p = v.play();                              // a browser may refuse sound without a click: then it plays on, muted
      if (p && p.catch) p.catch(function () { if (!v.muted) { v.muted = true; label(); var q = v.play(); if (q && q.catch) q.catch(function () {}); } });
    } else if (v.readyState < 1) v.preload = "metadata";
  }
  function toLook(v) {
    if (!swapped || swapped.has(v)) return;
    var e = srcOf(v), u = e && e.getAttribute("src"), m = u && FILM.exec(u);
    if (!m || m[2]) return;                           // not a page film (or its <source> is not parsed yet: the next pass gets it)
    var rec = { e: e, src: u, poster: v.getAttribute("poster"), wsrc: u.replace(/\.mp4$/, "-" + look + ".mp4") };
    rec.wposter = u.replace(FILM, "img/film-" + m[1] + "-" + look + ".jpg");
    swapped.set(v, rec);
    v.setAttribute("poster", rec.wposter);
    e.setAttribute("src", rec.wsrc);
    if (v.currentSrc && v.currentSrc.slice(-rec.wsrc.length) !== rec.wsrc) v.load();
    var img = new Image();                            // a missing poster for this look: the yarn one comes back
    img.onerror = function () { if (v.getAttribute("poster") === rec.wposter) { if (rec.poster === null) v.removeAttribute("poster"); else v.setAttribute("poster", rec.poster); } };
    img.src = rec.wposter;
  }
  if (look !== "yarn" && swapped) {
    /* The videos do not exist yet (this runs in the head): catch each one as the page is read, before its poster is painted. */
    var mo = window.MutationObserver && new MutationObserver(function (rs) {
      for (var i = 0; i < rs.length; i++) for (var j = 0, a = rs[i].addedNodes; j < a.length; j++) {
        var n = a[j]; if (n.nodeName === "VIDEO") toLook(n); else if (n.nodeName === "SOURCE" && n.parentNode && n.parentNode.nodeName === "VIDEO") toLook(n.parentNode);
      }
    });
    if (mo && document.readyState === "loading") mo.observe(root, { childList: true, subtree: true });
    /* A film of this look that will not load falls back to the yarn film, at the same moment. */
    document.addEventListener("error", function (ev) {
      var t = ev.target, v = t && (t.nodeName === "SOURCE" ? t.parentNode : t), rec = v && v.nodeName === "VIDEO" && swapped.get(v);
      if (!rec || rec.failed || (t.getAttribute("src") || "") !== rec.wsrc) return;
      rec.failed = true;
      var s = { t: v.currentTime, p: !v.paused, mu: v.muted, h: !!v.dataset.held };
      rec.e.setAttribute("src", rec.src);
      if (rec.poster === null) v.removeAttribute("poster"); else v.setAttribute("poster", rec.poster);
      v.load(); resume(v, s);
    }, true);
  }
  /* After a click on the switch the page reloads: films that had started go on from the same moment in the other look. */
  function ready() {
    if (mo) mo.disconnect();
    if (look !== "yarn") { var all = document.querySelectorAll("video"); for (var i = 0; i < all.length; i++) toLook(all[i]); }
    var raw = null, list = [];
    try { raw = sessionStorage.getItem("look-films"); sessionStorage.removeItem("look-films"); list = JSON.parse(raw) || []; } catch (e) {}
    for (var k = 0; k < list.length; k++) {
      var vs = document.querySelectorAll("video");
      for (var n = 0; n < vs.length; n++) if (nameOf(vs[n]) === list[k].n) { resume(vs[n], list[k]); break; }
    }
  }
  function keep() {                                   // a film that has not started just shows the other poster
    var list = [], vs = document.querySelectorAll("video");
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i], n = nameOf(v);
      if (n && (v.currentTime > 0 || !v.paused)) list.push({ n: n, t: v.currentTime, p: !v.paused, mu: v.muted, h: !!v.dataset.held });
    }
    try { if (list.length) sessionStorage.setItem("look-films", JSON.stringify(list)); } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();
  if (!LOOK_SWITCH) return;

  /* The switch. It borrows the light/dark button's class, so each look already draws it in its own material
     (a stitched button in yarn, an ink ring in wash, a brushed ring in brush, a lit disc in cel). The picture on it is the look a click takes you to. */
  var next = LOOKS[(LOOKS.indexOf(look) + 1) % LOOKS.length];
  var label = next === "wash" ? "Switch to the ink and wash look" : next === "brush" ? "Switch to the brush and scroll look" : next === "cel" ? "Switch to the cel and tide look" : "Switch to the yarn and felt look";
  var art = next === "cel"
    ? '<circle cx="5.7" cy="5.6" r="3.2" fill="currentColor"/>' +
      '<path d="M1 11.4c1.5-1.4 3.1-1.4 4.6 0 1.5 1.4 3.1 1.4 4.6 0 1.5-1.4 3.1-1.4 4.8-.1V15H1z" fill="currentColor"/>'
    : next === "brush"
    ? '<circle cx="8" cy="8.6" r="3.4" fill="currentColor"/>' +
      '<path d="M2.2 9.4c.3-3.6 2.9-6.4 6.2-6.6 2.6-.1 4.7 1.4 5.5 3.6M13.4 10.6c-.9 1.9-2.6 3.1-4.8 3.3" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>'
    : next === "wash"
    ? '<path d="M8 1.9c2.7 3.3 4.3 5.4 4.3 7.7a4.3 4.3 0 0 1-8.6 0c0-2.3 1.6-4.4 4.3-7.7z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
      '<path d="M6 9.9a2.1 2.1 0 0 0 1.7 1.9" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    : '<circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path d="M2.6 5.2c3.4.3 7 2.6 8.9 6.4M1.9 8.6c2.9-.1 5.8 1.7 7.3 4.9M5.6 2.3c3 .9 6 3.6 7.6 6.6" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>';

  var css = document.createElement("style");          // the light/dark button turns its picture over in dark; this one stays upright
  css.textContent = ".topnav .look-toggle svg{rotate:none!important}@media (min-width:621px){.topnav .look-toggle{margin-left:-8px}}";
  (document.head || root).appendChild(css);

  function flip() {
    var held = null;
    keep();
    try { localStorage.setItem("look", next); sessionStorage.setItem("look", next); held = sessionStorage.getItem("look"); } catch (e) {}
    try {
      var to = new URL(location.href);
      to.searchParams.delete("look");
      if (held !== next) to.searchParams.set("look", next);   // storage is blocked: carry the choice in the address
      if (to.href !== location.href) { location.replace(to.href); return; }
    } catch (e) {}
    location.reload();
  }
  function add() {
    var nav = document.querySelector(".topnav");
    if (!nav || nav.querySelector(".look-toggle")) return;
    var b = document.createElement("button"), after = nav.querySelector(".theme-toggle");
    b.type = "button";
    b.className = "theme-toggle look-toggle";
    b.setAttribute("aria-label", label);
    b.title = label;
    b.innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' + art + "</svg>";
    b.addEventListener("click", flip);
    if (after && after.nextSibling) nav.insertBefore(b, after.nextSibling); else nav.appendChild(b);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add); else add();
})();
