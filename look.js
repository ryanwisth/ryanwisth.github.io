/* Which look the site wears. Every look is one row in LOOK_ROWS below; yarn and felt is style.css on its own,
   every other look is style.css with look-<key>.css on top.

   TO SWITCH THE DEFAULT for every visitor, change the one word on the next line to a key from LOOK_ROWS. */
var SITE_LOOK = "history";

/* The "Style:" button in the top bar opens a list of every look; picking one switches the page to it.
   TO TAKE THAT BUTTON AWAY, change true to false on the next line (every look and ?look= keep working). */
var LOOK_SWITCH = true;

/* How the "Style:" picker is drawn. "label": plain cream-and-ink pill and list, the same on every look (Nov 19 picker);
   "swatch": the same button in each look's own colours, the list showing each look's two colours beside its name;
   "grid": a tile per look with its colours as a strip, two or three across. The last two use only the base tokens
   (--bg --card --text --sig --on-sig --radius) that every look already sets. */
var LOOK_PICKER = "swatch";

/* THE LOOKS, one row each. A new look is one row here, plus its look-<key>.css (and img/<key>/, films if it has them).
     key    one short lowercase word. Never the last word of a page's file name (runner, work, ledger, phone, pipeline, 3d,
            index, stack, servers, grader, study, engine, mode, trainer, guard, scan): the film names read "-<key>" as a twin.
     name   shown in the picker.
     bar    the browser bar's colour in this look: light, dark. null leaves the page's own (yarn).
     dots   two colours that stand for the look in the picker: its paper and its signature.
     films  true when every page film has video/film-<page>-<key>.mp4 and img/film-<page>-<key>.jpg; false plays the yarn films.
   The first row is the plain look: it adds no stylesheet and writes nothing to the films. */
var LOOK_ROWS = [
  /* key      name               bar (light, dark)          dots (paper, signature)    films */
  ["yarn",  "Yarn & Felt",     null,                      ["#fbeedd", "#cf3f68"],    false],
  ["wash",  "Ink & Wash",      ["#f5f1ea", "#0f1730"],    ["#f5f1ea", "#b84a63"],    true],
  ["brush", "Brush & Scroll",  ["#efe5cf", "#141a33"],    ["#efe5cf", "#c23b22"],    true],
  /* mini replaced cel (Cel & Tide) on Ryan's word, Nov 21 2026 (his pick: option A, the overworld map). look-cel.css,
     look-cel.js and img/cel/ stay on disk, unloaded; ?look=cel and a stored "cel" open mini (RENAMED, just below the list).
     Mini has no films of its own (false): the yarn films play, in the look's stone frame. look-mini.js paints the ground;
     look.js loads it (below), not site.js. */
  ["mini",  "Mini World",      ["#5cd04c", "#1d3a3a"],    ["#5cd04c", "#2a2238"],    false],
  ["paint", "Paint & Meadow",  ["#dcc2a6", "#18373e"],    ["#d9d5b9", "#0275a0"],    true],
  ["dots",  "Dots & Panels",   ["#f6f0dc", "#272015"],    ["#f6f0dc", "#c8321e"],    true],
  /* history: light and dark (dark added Nov 21 2026; replaced Studio, which git keeps). Films: video/film-<page>-history.mp4 + img/film-<page>-history.jpg from _tools/history-films/out/ (the light twins in both settings). */
  ["history", "Studio",          ["#e9ecef", "#34332f"],  ["#e9ecef", "#14594a"],    true],
  /* gouache: every page (Nov 21 2026); look-gouache.js paints the field under the page. Films (Nov 22): video/film-<page>-gouache.mp4 + img/film-<page>-gouache.jpg from pf-gouache/out/gouache/. */
  ["gouache", "Gouache & Shape", ["#f4d7da", "#0b378d"],  ["#f4d7da", "#195fbf"],    true],
  /* backdrop: every page (Nov 21 2026), Ryan picked option B, "Matte plate"; all CSS. Films (Nov 22): video/film-<page>-backdrop.mp4 + img/film-<page>-backdrop.jpg from pf-backdrop/out/backdrop/. */
  ["backdrop", "Backdrop & Spotlight", ["#423630", "#3c324b"], ["#554437", "#a02a26"], true],
  /* silhouette: Silhouette & Tint (Nov 21 2026, Ryan's pick: way C, "cut window"). Black card ground, every part with words a
     window of lit tinted glass. look-silhouette.js sets the baked scenes into the page; look.js loads it (below), not site.js.
     Films (Nov 22): video/film-<page>-silhouette.mp4 + img/film-<page>-silhouette.jpg from pf-silhouette/out/silhouette/. */
  ["silhouette", "Silhouette & Tint", ["#000000", "#000000"], ["#e2d691", "#000000"], true]
];

/* To try a look without changing anything, add ?look=<key> (?look=wash, ?look=mini, ?look=yarn ...) to any page address.
   That choice lasts for that browser tab (so two tabs can show two looks side by side).
   A pick from the list is remembered by that browser for later visits. */
(function () {
  var LOOKS = [], NAMES = {}, TINT = {}, DOTS = {}, TWINS = {}, PLAIN = LOOK_ROWS[0][0];
  for (var r0 = 0; r0 < LOOK_ROWS.length; r0++) {
    var row = LOOK_ROWS[r0], key = row[0];
    LOOKS.push(key); NAMES[key] = row[1]; DOTS[key] = row[3];
    if (row[2]) TINT[key] = row[2];
    if (row[4] && r0 > 0) TWINS[key] = true;
  }
  /* retired keys that now open another look: an old address or a stored pick is carried over, never dropped */
  var RENAMED = { cel: "mini" };
  var look = SITE_LOOK, m = new RegExp("[?&]look=(" + LOOKS.concat(Object.keys(RENAMED)).join("|") + ")\\b").exec(location.search), kept = null;
  if (m && RENAMED[m[1]]) m = [m[0], RENAMED[m[1]]];
  var nav0 = window.performance && performance.getEntriesByType && performance.getEntriesByType("navigation")[0];
  var backward = !!(nav0 && nav0.type === "back_forward");
  try {
    /* Back, Forward or reload of an address that still says ?look=: the look picked since then in this tab wins */
    if (m && !((backward || (nav0 && nav0.type === "reload")) && sessionStorage.getItem("look"))) sessionStorage.setItem("look", m[1]);
    kept = sessionStorage.getItem("look") || localStorage.getItem("look");
  } catch (e) { if (m) kept = m[1]; }
  if (kept && RENAMED[kept]) { kept = RENAMED[kept]; try { if (sessionStorage.getItem("look")) sessionStorage.setItem("look", kept); if (localStorage.getItem("look")) localStorage.setItem("look", kept); } catch (e) {} }
  if (LOOKS.indexOf(kept) >= 0) look = kept;
  /* a look that has since been retired (Studio, Nov 21 2026) is forgotten, so the page wears the default */
  else if (kept) try { sessionStorage.removeItem("look"); localStorage.removeItem("look"); } catch (e) {}

  var root = document.documentElement;
  /* The look sheets sit beside this script. Resolved from the script's own address, so 404.html (served at any depth) finds them. */
  var BASE = ""; try { BASE = document.currentScript.src.replace(/[^\/]*$/, ""); } catch (e) {}
  /* "Pause motion" (the footer button site.js builds) is remembered here and put on before the first paint */
  try { if (localStorage.getItem("motion") === "paused") root.setAttribute("data-motion", "paused"); } catch (e) {}
  if (look !== PLAIN) {                              // yarn adds no stylesheet: the page is drawn exactly as before
    root.setAttribute("data-look", look);
    /* The look's sheet must be in before the first paint, or the page flashes yarn. A browser that knows
       blocking="render" holds the paint for an added <link>; any other gets the old document.write, which also holds it. */
    var sheet = document.createElement("link"), canBlock = false, head = document.head || document.getElementsByTagName("head")[0];
    try { canBlock = !!(sheet.blocking && sheet.blocking.supports && sheet.blocking.supports("render")); } catch (e) {}
    if (canBlock && head && !document.body) {
      sheet.rel = "stylesheet"; sheet.href = BASE + "look-" + look + ".css"; sheet.setAttribute("blocking", "render");
      head.appendChild(sheet);
    } else document.write('<link rel="stylesheet" href="' + BASE + 'look-' + look + '.css">');
    if (look === "mini" || look === "gouache" || look === "silhouette") { // the ground under the page (mini, gouache) or the baked scenes (silhouette): loaded with or without motion
      var mjs = document.createElement("script"); mjs.src = BASE + "look-" + look + ".js"; mjs.async = true;
      (head || document.documentElement).appendChild(mjs);
    }
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    if (TINT[look]) for (var i = 0; i < metas.length; i++) metas[i].content = TINT[look][/dark/.test(metas[i].media) ? 1 : 0];
  }
  if (!document.addEventListener) return;

  /* Each page's narrated film has a twin per look: video/film-<name>.mp4 (yarn), video/film-<name>-<look>.mp4 with poster
     img/film-<name>-<look>.jpg (wash, brush, cel, paint). Same length and soundtrack, so a click on the switch carries the moment over.
     A twin that is missing falls back to the yarn film. The yarn look writes nothing to the films. Other videos
     (captures, previews) are never touched. */
  var FILM = new RegExp("video\\/film-([a-z0-9-]+?)(-" + LOOKS.slice(1).join("|-") + ")?\\.mp4$"), swapped = typeof WeakMap === "function" ? new WeakMap() : null;
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
    if (look === PLAIN || !TWINS[look]) { if (!v.hasAttribute("poster") && v.getAttribute("data-poster")) v.setAttribute("poster", v.getAttribute("data-poster")); return; }
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
  if (look !== PLAIN && TWINS[look] && swapped) {
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
  /* Page-change direction, for each look's own page transition (polish pass, Nov 20 2026). On the incoming page:
     html[data-nav] = back | forward | reload, and the same word is added to the cross-document view transition's types,
     so a sheet can write html:active-view-transition-type(back)::view-transition-new(root) { ... } to play in reverse.
     Here in the head script so the listener is in before the first render, as pagereveal requires. */
  addEventListener("pagereveal", function (e) {
    var a = window.navigation && navigation.activation, dir = "forward";
    if (a) {
      if (a.navigationType === "reload") dir = "reload";
      else if (a.navigationType === "traverse" && a.from && a.entry && a.entry.index < a.from.index) dir = "back";
    }
    root.setAttribute("data-nav", dir);
    try { if (e.viewTransition && e.viewTransition.types) e.viewTransition.types.add(dir); } catch (er) {}
  });
  if (!LOOK_SWITCH) return;

  /* The picker: a button that names the look being worn, and a list of every look. Built from here (no markup in the
     pages), as soon as the top bar's light/dark button is read, so it is in place before the first paint.
     "label" is drawn by the plain colours in style.css. "swatch" and "grid" add the small sheet below, which reads only
     base tokens every look sets, so no look's own stylesheet is touched and each look wears the picker in its colours.
     --card is painted over --bg because some looks make --card see-through; the highlight is --sig on --on-sig. */
  var DESIGN = /^(swatch|grid)$/.test(LOOK_PICKER) ? LOOK_PICKER : "label";
  if (DESIGN !== "label") {
    var ps = document.createElement("style"), X = ":root:root .look-pick.lp-" + DESIGN;
    ps.id = "look-pick-style";
    ps.textContent =
      X + " { --lp-bg: var(--bg); --lp-card: var(--card); --lp-ink: var(--text); --lp-rim: var(--text); --lp-hi: var(--sig); --lp-on-hi: var(--on-sig); }" +
      X + " .look-pick-btn, " + X + " .look-menu { background: linear-gradient(var(--lp-card), var(--lp-card)) var(--lp-bg); color: var(--lp-ink); border-color: var(--lp-rim); }" +
      X + " .look-pick-btn { border-radius: var(--radius); }" +
      X + " .look-menu { border-radius: min(var(--radius), 14px); max-height: calc(100vh - 96px); overflow: auto; overscroll-behavior: contain; }" +
      X + " .look-menu li { border-radius: min(var(--radius), 9px); }" +
      X + " .look-menu li[aria-selected=\"true\"] { font-weight: 800; }" +
      X + " .lp-dot { flex: none; width: 14px; height: 14px; border-radius: 50%; background: linear-gradient(135deg, var(--d1) 50%, var(--d2) 50%); border: 1.5px solid currentColor; }" +
      (DESIGN === "grid" ?
        X + " .look-pick-btn .lp-dot { width: 16px; height: 16px; }" +
        X + " .look-menu:not([hidden]) { display: grid; grid-template-columns: repeat(var(--lp-cols), 10em); gap: 6px; min-width: 0; padding: 8px; }" +
        X + " .look-menu li { flex-direction: column; align-items: stretch; gap: 7px; min-height: 0; padding: 8px 8px 10px; white-space: normal; border: 1.5px solid transparent; }" +
        X + " .look-menu li::before { display: none; }" +
        X + " .look-menu .lp-dot { width: auto; height: 26px; border-radius: min(var(--radius), 6px); background: linear-gradient(90deg, var(--d1) 50%, var(--d2) 50%); }" +
        X + " .look-menu li[aria-selected=\"true\"] { border-color: currentColor; }" +
        X + " .look-menu li[aria-selected=\"true\"] .lp-name::after { content: \" \\2713\"; }" +
        "@media (max-width: 480px) { " + X + " .look-menu:not([hidden]) { grid-template-columns: repeat(2, calc((100vw - 64px) / 2)); } }" : "");
    (document.head || document.getElementsByTagName("head")[0]).appendChild(ps);
  }
  function dot(k) { return '<span class="lp-dot" aria-hidden="true" style="--d1:' + DOTS[k][0] + ";--d2:" + DOTS[k][1] + '"></span>'; }
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
  /* Studio pass (Nov 21 2026, kept for every look): the picker is its own small control at the right end of the top bar, after the nav
     (no longer one of the nav's links); it is still built once the nav's light/dark button is read. */
  function add() {
    var nav = document.querySelector(".topnav");
    if (!nav || nav.parentNode.querySelector(".look-pick")) return !!nav;
    var tt = nav.querySelector(".theme-toggle");
    if (!tt && document.readyState === "loading") return false;
    var w = document.createElement("div"), html = "", id = "look-menu";
    w.className = "look-pick" + (DESIGN === "label" ? "" : " lp-" + DESIGN);
    if (DESIGN === "grid") w.style.setProperty("--lp-cols", LOOKS.length > 6 ? 3 : 2);
    for (var i = 0; i < LOOKS.length; i++) {
      var nm = NAMES[LOOKS[i]].replace("&", "&amp;");
      html += '<li role="option" tabindex="-1" data-look="' + LOOKS[i] + '" aria-selected="' + (LOOKS[i] === look) + '">' +
        (DESIGN === "label" ? nm : dot(LOOKS[i]) + '<span class="lp-name">' + nm + "</span>") + "</li>";
    }
    w.innerHTML = '<button type="button" class="look-pick-btn" aria-haspopup="listbox" aria-expanded="false" aria-controls="' + id + '">' +
      (DESIGN === "grid" ? dot(look) : "") + '<span class="look-pick-k">Style: </span><span class="look-pick-name">' + NAMES[look].replace(/^(\S+)( & .*)$/, '<span class="lp-a">$1</span><span class="lp-b">$2</span>').replace("&", "&amp;") + "</span></button>" +
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
      if (e.key === "ArrowDown" || e.key === "ArrowRight") { e.preventDefault(); opts[(j + 1) % n].focus(); }
      else if (e.key === "ArrowUp" || e.key === "ArrowLeft") { e.preventDefault(); opts[(j - 1 + n) % n].focus(); }
      else if (e.key === "Home") { e.preventDefault(); opts[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); opts[n - 1].focus(); }
      else if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(opts[j]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close(false);
    });
    menu.addEventListener("click", function (e) { pick(e.target.closest ? e.target.closest("li") : e.target); });
    document.addEventListener("pointerdown", function (e) { if (!w.contains(e.target)) close(false); }, true);
    w.addEventListener("focusout", function (e) { if (e.relatedTarget && !w.contains(e.relatedTarget)) close(false); });
    nav.parentNode.insertBefore(w, nav.nextSibling);
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
