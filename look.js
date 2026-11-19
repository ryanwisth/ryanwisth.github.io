/* Which look the site wears. One site carries all four:
     "yarn"   yarn and felt     (style.css on its own)
     "wash"   ink and wash      (style.css, then look-wash.css on top)
     "brush"  brush and scroll  (style.css, then look-brush.css on top)
     "cel"    cel and tide      (style.css, then look-cel.css on top)

   TO SWITCH THE DEFAULT for every visitor, change the one word on the next line. */
var SITE_LOOK = "yarn";

/* The "Style:" button in the top bar opens a short list of the four looks; picking one switches the page to it.
   TO TAKE THAT BUTTON AWAY, change true to false on the next line (both looks and ?look= keep working). */
var LOOK_SWITCH = true;

/* To try a look without changing anything, add ?look=wash, ?look=brush, ?look=cel or ?look=yarn to any page address.
   That choice lasts for that browser tab (so two tabs can show the two looks side by side).
   A pick from the list is remembered by that browser for later visits. */
(function () {
  var LOOKS = ["yarn", "wash", "brush", "cel"], look = SITE_LOOK, m = /[?&]look=(yarn|wash|brush|cel)\b/.exec(location.search), kept = null;
  var NAMES = { yarn: "Yarn & Felt", wash: "Ink & Wash", brush: "Brush & Scroll", cel: "Cel & Tide" };
  var nav0 = window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var backward = !!(nav0 && nav0.type === "back_forward");
  try {
    /* Back, Forward or reload of an address that still says ?look=: the look picked since then in this tab wins */
    if (m && !((backward || (nav0 && nav0.type === "reload")) && sessionStorage.getItem("look"))) sessionStorage.setItem("look", m[1]);
    kept = sessionStorage.getItem("look") || localStorage.getItem("look");
  } catch (e) { if (m) kept = m[1]; }
  if (LOOKS.indexOf(kept) >= 0) look = kept;

  var root = document.documentElement;
  /* The look sheets sit beside this script. Resolved from the script's own address, so 404.html (served at any depth) finds them. */
  var BASE = ""; try { BASE = document.currentScript.src.replace(/[^\/]*$/, ""); } catch (e) {}
  /* "Pause motion" (the footer button site.js builds) is remembered here and put on before the first paint */
  try { if (localStorage.getItem("motion") === "paused") root.setAttribute("data-motion", "paused"); } catch (e) {}
  var TINT = { wash: ["#f5f1ea", "#0f1730"], brush: ["#efe5cf", "#141a33"], cel: ["#5078ff", "#101b4d"] };   // the browser bar's colour: light, dark
  if (look !== "yarn") {                              // yarn adds no stylesheet: the page is drawn exactly as before
    root.setAttribute("data-look", look);
    /* The look's sheet must be in before the first paint, or the page flashes yarn. A browser that knows
       blocking="render" holds the paint for an added <link>; any other gets the old document.write, which also holds it. */
    var sheet = document.createElement("link"), canBlock = false, head = document.head || document.getElementsByTagName("head")[0];
    try { canBlock = !!(sheet.blocking && sheet.blocking.supports && sheet.blocking.supports("render")); } catch (e) {}
    if (canBlock && head && !document.body) {
      sheet.rel = "stylesheet"; sheet.href = BASE + "look-" + look + ".css"; sheet.setAttribute("blocking", "render");
      head.appendChild(sheet);
    } else document.write('<link rel="stylesheet" href="' + BASE + 'look-' + look + '.css">');
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
  /* A film may carry its yarn poster as data-poster instead of poster: then no look fetches a poster it does not show
     (a parsed poster="" is fetched before any script can change it). Without scripts such a film shows no poster. */
  function posterOf(v) { return v.getAttribute("poster") || v.getAttribute("data-poster"); }
  function toLook(v) {
    if (look === "yarn") { if (!v.hasAttribute("poster") && v.getAttribute("data-poster")) v.setAttribute("poster", v.getAttribute("data-poster")); return; }
    if (!swapped || swapped.has(v)) return;
    var e = srcOf(v), u = e && e.getAttribute("src"), m = u && FILM.exec(u);
    if (!m || m[2]) return;                           // not a page film (or its <source> is not parsed yet: the next pass gets it)
    var rec = { e: e, src: u, poster: posterOf(v), wsrc: u.replace(/\.mp4$/, "-" + look + ".mp4") };
    rec.wposter = u.replace(FILM, "img/film-" + m[1] + "-" + look + ".jpg");
    swapped.set(v, rec);
    v.setAttribute("poster", rec.wposter);
    e.setAttribute("src", rec.wsrc);
    if (v.currentSrc && v.currentSrc.slice(-rec.wsrc.length) !== rec.wsrc) v.load();
    var img = new Image();                            // a missing poster for this look: the yarn one comes back
    img.onerror = function () { if (v.getAttribute("poster") === rec.wposter) { if (rec.poster === null) v.removeAttribute("poster"); else v.setAttribute("poster", rec.poster); } };
    img.src = rec.wposter;
  }
  /* The videos do not exist yet (this runs in the head): catch each one as the page is read, before its poster is painted. */
  var mo = window.MutationObserver && new MutationObserver(function (rs) {
    for (var i = 0; i < rs.length; i++) for (var j = 0, a = rs[i].addedNodes; j < a.length; j++) {
      var n = a[j]; if (n.nodeName === "VIDEO") toLook(n); else if (n.nodeName === "SOURCE" && n.parentNode && n.parentNode.nodeName === "VIDEO") toLook(n.parentNode);
    }
  });
  if (mo && document.readyState === "loading") mo.observe(root, { childList: true, subtree: true });
  if (look !== "yarn" && swapped) {
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
  /* After a pick from the list the page reloads in the other look: the reader lands on the same part of the page
     (the same heading or paragraph at the same height on screen, not the same pixel offset, since the looks differ in
     length), and films that had started go on from the same moment. */
  var PLACE = "main h1, main h2, main h3, main h4, main p, main li, main figure, main .card, main .fact, main video";
  function barH() { var t = document.querySelector(".topbar"); return t ? t.getBoundingClientRect().bottom : 0; }
  function where() {                                  // the first block that starts below the top bar, and its height on screen
    if ((window.scrollY || 0) < 8) return null;
    var els = document.querySelectorAll(PLACE), h = barH();
    for (var i = 0; i < els.length; i++) { var r = els[i].getBoundingClientRect(); if (r.height && r.top >= h - 1) return { i: i, y: r.top - h }; }
    return null;
  }
  var placed = null;
  function goTo(p) {
    var el = document.querySelectorAll(PLACE)[p.i];
    if (!el) return;
    var y = (window.scrollY || 0) + el.getBoundingClientRect().top - barH() - p.y;
    try { window.scrollTo({ top: y, behavior: "instant" }); } catch (e) { window.scrollTo(0, y); }
    placed = { p: p, at: window.scrollY || 0 };
  }
  var place0 = null;
  try { place0 = JSON.parse(sessionStorage.getItem("look-place") || "null"); sessionStorage.removeItem("look-place"); } catch (e) {}
  if (place0 && "scrollRestoration" in history) history.scrollRestoration = "manual";
  function ready() {
    if (mo) mo.disconnect();
    var all = document.querySelectorAll("video"); for (var i = 0; i < all.length; i++) toLook(all[i]);
    if (place0) goTo(place0);                         // place first, so a film that resumes is already on screen
    var raw = null, list = [];
    try { raw = sessionStorage.getItem("look-films"); sessionStorage.removeItem("look-films"); list = JSON.parse(raw) || []; } catch (e) {}
    for (var k = 0; k < list.length; k++) {
      var vs = document.querySelectorAll("video");
      for (var n = 0; n < vs.length; n++) if (nameOf(vs[n]) === list[k].n) { resume(vs[n], list[k]); break; }
    }
  }
  /* late pictures and fonts move the blocks: once the page has loaded, put the reader back if they have not scrolled since */
  addEventListener("load", function () {
    if (placed && Math.abs((window.scrollY || 0) - placed.at) < 2) goTo(placed.p);
  });
  /* the browser's own scroll memory is off only across a switch (it would restore the old look's pixel offset) */
  var switching = false;
  addEventListener("pagehide", function () { if (!switching && "scrollRestoration" in history) history.scrollRestoration = "auto"; });
  function keep() {                                   // a film that has not started just shows the other poster
    var list = [], vs = document.querySelectorAll("video");
    for (var i = 0; i < vs.length; i++) {
      var v = vs[i], n = nameOf(v);
      if (n && (v.currentTime > 0 || !v.paused)) list.push({ n: n, t: v.currentTime, p: !v.paused, mu: v.muted, h: !!v.dataset.held });
    }
    try {
      if (list.length) sessionStorage.setItem("look-films", JSON.stringify(list));
      var w = where(); if (w) sessionStorage.setItem("look-place", JSON.stringify(w));
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ready); else ready();

  /* Back or Forward from the browser's page cache shows the page as it was left: if a different look was picked
     since then (on another page), load it again in that look. */
  addEventListener("pageshow", function (e) {
    if (!e.persisted) return;
    var now = SITE_LOOK;
    try { now = sessionStorage.getItem("look") || localStorage.getItem("look") || SITE_LOOK; } catch (er) {}
    if (LOOKS.indexOf(now) >= 0 && now !== look) location.reload();   // a reload does not re-apply ?look= over the later pick
  });
  if (!LOOK_SWITCH) return;

  /* The picker: a button that names the look being worn, and a list of the four. Built from here (no markup in the
     pages), as soon as the top bar's light/dark button is read, so it is in place before the first paint.
     Plain colours in style.css keep it readable on every look; a look sheet may restyle .look-pick-btn. */
  function go(to) {
    var held = null;
    keep(); switching = true;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    try { localStorage.setItem("look", to); sessionStorage.setItem("look", to); sessionStorage.setItem("look-focus", "1"); held = sessionStorage.getItem("look"); } catch (e) {}
    try {
      var u = new URL(location.href);
      u.searchParams.delete("look");
      if (held !== to) u.searchParams.set("look", to);   // storage is blocked: carry the choice in the address
      if (u.href !== location.href) { location.replace(u.href); return; }
    } catch (e) {}
    location.reload();
  }
  function add() {
    var nav = document.querySelector(".topnav");
    if (!nav || nav.querySelector(".look-pick")) return !!nav;
    var tt = nav.querySelector(".theme-toggle");
    if (!tt && document.readyState === "loading") return false;
    var w = document.createElement("div"), html = "", id = "look-menu";
    w.className = "look-pick";
    for (var i = 0; i < LOOKS.length; i++) {
      html += '<li role="option" tabindex="-1" data-look="' + LOOKS[i] + '" aria-selected="' + (LOOKS[i] === look) + '">' + NAMES[LOOKS[i]].replace("&", "&amp;") + "</li>";
    }
    w.innerHTML = '<button type="button" class="look-pick-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '">' +
      '<span class="look-pick-k">Style: </span><span class="look-pick-name">' + NAMES[look].replace(/^(\S+)( & .*)$/, '<span class="lp-a">$1</span><span class="lp-b">$2</span>').replace("&", "&amp;") + "</span></button>" +
      '<ul class="look-menu" id="' + id + '" role="listbox" aria-label="Style" hidden>' + html + "</ul>";
    var btn = w.firstChild, menu = w.lastChild, opts = menu.children;
    function open(k) {
      menu.hidden = false; btn.setAttribute("aria-expanded", "true");
      var j = LOOKS.indexOf(look); if (k === "last") j = opts.length - 1; else if (k === "first") j = 0;
      opts[j].focus();
    }
    function close(back) {
      if (menu.hidden) return;
      menu.hidden = true; btn.setAttribute("aria-expanded", "false");
      if (back) btn.focus();
    }
    function pick(li) {
      var to = li && li.getAttribute("data-look");
      if (!to) return;
      if (to === look) { close(true); return; }
      close(true);
      go(to);
    }
    btn.addEventListener("click", function () { if (menu.hidden) open(); else close(true); });
    btn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(e.key === "ArrowUp" ? "last" : null); }
    });
    menu.addEventListener("keydown", function (e) {
      var j = [].indexOf.call(opts, document.activeElement), n = opts.length;
      if (e.key === "ArrowDown") { e.preventDefault(); opts[(j + 1) % n].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); opts[(j - 1 + n) % n].focus(); }
      else if (e.key === "Home") { e.preventDefault(); opts[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); opts[n - 1].focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(opts[j]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close(false);
    });
    menu.addEventListener("click", function (e) { pick(e.target.closest ? e.target.closest("li") : e.target); });
    document.addEventListener("pointerdown", function (e) { if (!w.contains(e.target)) close(false); }, true);
    w.addEventListener("focusout", function (e) { if (e.relatedTarget && !w.contains(e.relatedTarget)) close(false); });
    if (tt && tt.nextSibling) nav.insertBefore(w, tt.nextSibling); else if (tt) nav.appendChild(w); else nav.appendChild(w);
    var f = null;
    try { f = sessionStorage.getItem("look-focus"); sessionStorage.removeItem("look-focus"); } catch (e) {}
    if (f) { try { btn.focus({ preventScroll: true }); } catch (e) { btn.focus(); } }
    return true;
  }
  if (document.readyState === "loading" && window.MutationObserver) {
    var pmo = new MutationObserver(function () { if (add()) pmo.disconnect(); });
    pmo.observe(root, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", function () { pmo.disconnect(); add(); });
  } else if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", add);
  else add();
})();
