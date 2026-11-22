/* Studio deep overhaul: three option prototypes for the default look (key "history"), Nov 21 2026, waiting on Ryan's pick.
   Try one with  ?deep=a  (or b, c) on index.html or token-guard.html. The choice lasts for the tab; ?deep=off goes back to today.
     a  "Release ledger": the claim at full scale; the page is the site's release history on a deep-green spine that fills
        as you read (the one motion, scroll-linked).
     b  "Inspector": projects on a canvas of plates, a sticky inspector shows the record of the one you point at or focus
        (the one motion: a 120 ms crossfade when the record changes).
     c  "Proof reel": the films lead; every project is a figure plate; timestamp keys under the films seek them and mark
        the line being said (the one motion).
   Only while the history look is worn. Everything lives in deep/: this file (switch + shared kit), deep.css (built from
   _tools/studio-deep/deep.src.css by build.sh), deep-a.js / deep-b.js / deep-c.js. No page copy is written here: every
   text shown is moved or copied from the page itself (or, for the 13 other projects' rules and tests, read from their
   own case pages). New words are UI labels only (see REPORT.md). look-history.js (today's type-in) is kept out. */
(function () {
  var r = document.documentElement, m = /[?&]deep=(a|b|c|off)\b/.exec(location.search), k = null;
  try { if (m) sessionStorage.setItem("studio-deep", m[1]); k = sessionStorage.getItem("studio-deep"); } catch (e) { k = m && m[1]; }
  if (!k || k === "off" || r.getAttribute("data-look") !== "history") return;
  r.setAttribute("data-deep", k);
  /* the options are drawn in the light setting only (dark follows Ryan's pick): the page is held light, the Dark button hidden */
  r.setAttribute("data-theme", "light");
  var BASE = ""; try { BASE = document.currentScript.src.replace(/[^\/]*$/, ""); } catch (e) {}
  document.write('<link rel="stylesheet" href="' + BASE + 'deep.css">');
  /* today's one movement (look-history.js) stays out: site.js skips a look script whose id is already on the page */
  var stub = document.createElement("meta"); stub.id = "look-history-js"; (document.head || r).appendChild(stub);
  /* the page is held hidden until the option has laid it out (deep.css), with a fail-safe */
  setTimeout(function () { r.classList.add("sd-ready"); }, 2500);

  var d = document, reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function q(s, root) { return (root || d).querySelector(s); }
  function qa(s, root) { return [].slice.call((root || d).querySelectorAll(s)); }
  function moving() { return !reduce && r.getAttribute("data-motion") !== "paused"; }

  /* "Added" dates, read from each case page's own changelog line (stamp.mjs, from git); the 13 other projects carry none on home */
  var ADDED = {
    "agent-runner": "2026-11-13", "checking-ai-work": "2026-11-13", "claim-ledger": "2026-11-13", "claude-phone": "2026-11-15",
    "evidence-pipeline": "2026-11-13", "family-tree-3d": "2026-11-13", "local-ai-stack": "2026-11-13", "mcp-servers": "2026-11-13",
    "paper-grader": "2026-11-13", "pinball-study": "2026-11-13", "practice-engine": "2026-11-13", "safari-dark-mode": "2026-11-13",
    "slot": "2026-11-21", "streaks-trainer": "2026-11-13", "token-guard": "2026-11-13", "token-scan": "2026-11-13"
  };
  var MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  function longDate(iso) { var p = iso.split("-"); return +p[2] + " " + MONTHS[+p[1] - 1] + " " + p[0]; }
  function dateHtml(iso) { return '<time datetime="' + iso + '">' + longDate(iso) + "</time>"; }

  /* the text runs between the page's separators (" &middot;" hidden + ";" shown), each kept exactly as written */
  function splitRole(p) {
    var out = [], cur = "";
    [].forEach.call(p.childNodes, function (n) {
      if (n.nodeType === 3) cur += n.textContent;
      else if (n.nodeName === "B") return;
      else if (n.classList && (n.classList.contains("hx-x") || n.classList.contains("hx-alt"))) { if (n.classList.contains("hx-alt")) { out.push(cur.trim()); cur = ""; } }
      else cur += n.textContent;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function logRow(dl, name) {
    var row = null;
    qa(":scope > div", dl).forEach(function (dv) { var dt = q("dt", dv); if (dt && dt.textContent.trim() === name) row = dv; });
    return row;
  }
  function items(row) { return row ? qa("li", row).map(function (li) { return li.innerHTML; }) : []; }

  /* the home page's parts and its 16 projects, as plain data (strings are the page's own HTML, unchanged) */
  function home() {
    var H = {
      h1: q(".lead-hero h1"), sub: q(".hero-sub"), mail: q(".hero-mail"), film: q(".hero-film"), facts: [],
      ver: q(".hx-ver"), featuredH: q(".leads-head h2"), workH: q("#work .section-head h2"), howH: q("#how .section-head h2"),
      method: q(".how2"), band: q(".band"), projects: [], groups: []
    };
    qa(".facts.proof .fact").forEach(function (f) { H.facts.push({ b: q("b", f).innerHTML, s: q(":scope > span", f).innerHTML }); });
    qa(".leads a.card.lead").forEach(function (a) {
      var log = q(".hx-lead-log", a), page = a.getAttribute("href").replace(/\.html$/, ""), wrap = a.parentNode;
      var tested = null; qa(":scope > div", log).forEach(function (dv) { if (q("dt", dv).textContent.trim() === "I tested") tested = dv; });
      H.projects.push({
        page: page, href: a.getAttribute("href"), starter: true, kicker: q(".lead-k", a).innerHTML, name: q("h4", a).innerHTML,
        vt: q("h4", a).getAttribute("style") || "", what: q(".lead-what", a).innerHTML, rulesLabel: q(".lead-role b", a).innerHTML,
        rules: splitRole(q(".lead-role", a)), tested: items(tested), go: q(".lead-go", a).innerHTML,
        date: (q(".hx-added time", a) || {}).getAttribute ? q(".hx-added time", a).getAttribute("datetime") : ADDED[page],
        demo: wrap.classList.contains("lead-wrap") && q(".badge", wrap) ? { href: q(".badge", wrap).getAttribute("href"), text: q(".badge", wrap).textContent.trim() } : null,
        thumb: q(".thumb", a).getAttribute("src"), thumbAlt: q(".thumb", a).getAttribute("alt")
      });
    });
    qa(".more-g").forEach(function (g) {
      var grp = { name: q(".group-h", g).innerHTML, projects: [] };
      qa("li > a", g).forEach(function (a) {
        var page = a.getAttribute("href").replace(/\.html$/, "");
        var p = { page: page, href: a.getAttribute("href"), starter: false, group: grp.name, name: q("b", a).innerHTML, what: q("span", a).innerHTML,
          date: ADDED[page], rules: null, tested: null, rulesLabel: "My rules" };
        grp.projects.push(p); H.projects.push(p);
      });
      H.groups.push(grp);
    });
    return H;
  }

  /* My rules / I tested for the projects whose record is only on their own page: read from that page's changelog */
  var cache = {};
  function record(p) {
    if (p.rules) return Promise.resolve(p);
    if (!cache[p.page]) cache[p.page] = fetch(p.href).then(function (res) { return res.ok ? res.text() : ""; }).then(function (t) {
      var doc = new DOMParser().parseFromString(t, "text/html"), dl = q(".hx-log dl", doc);
      return dl ? { rules: items(logRow(dl, "My rules")), tested: items(logRow(dl, "I tested")) } : { rules: [], tested: [] };
    }).catch(function () { return { rules: [], tested: [] }; });
    return cache[p.page].then(function (rec) { p.rules = rec.rules; p.tested = rec.tested; return p; });
  }
  function list(arr) { return "<ul>" + arr.map(function (x) { return "<li>" + x + "</li>"; }).join("") + "</ul>"; }

  /* one project film: the history twin, poster first, two plain buttons (the labels today's look already uses) */
  function film(page, o) {
    o = o || {};
    var f = el("figure", "sd-film" + (o.cls ? " " + o.cls : "")), fr = el("div", "sd-frame"), v = d.createElement("video");
    v.setAttribute("playsinline", ""); v.muted = true; v.preload = o.preload || "none"; v.width = 960; v.height = 540;
    v.setAttribute("poster", "img/film-" + page + "-history.jpg"); v.src = "video/film-" + page + "-history.mp4";
    v.setAttribute("aria-label", o.label || "Narrated film");
    fr.appendChild(v); f.appendChild(fr);
    var bar = el("div", "sd-ctl"), play = el("button", "sd-play", "Play"), snd = el("button", "sd-snd", "Play with sound");
    play.type = snd.type = "button";
    function sync() { play.textContent = v.paused ? "Play" : "Pause"; snd.textContent = v.muted ? "Play with sound" : "Mute"; snd.setAttribute("aria-pressed", v.muted ? "false" : "true"); f.classList.toggle("sd-on", !v.paused); }
    function go() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    play.addEventListener("click", function () { if (v.paused) go(); else v.pause(); });
    snd.addEventListener("click", function () { if (v.muted) { v.muted = false; if (v.currentTime > 0.5 && !o.keepTime) v.currentTime = 0; go(); } else v.muted = true; sync(); });
    v.addEventListener("click", function () { if (v.paused) go(); else v.pause(); });
    v.addEventListener("play", sync); v.addEventListener("pause", sync); v.addEventListener("volumechange", sync);
    bar.appendChild(snd); bar.appendChild(play); f.appendChild(bar);
    sync();
    return { fig: f, v: v, bar: bar, go: go };
  }

  /* the case page's head parts */
  function caseHead() {
    var log = q(".hx-log");
    if (!log) return null;
    return { head: q(".case-head"), back: q(".case-head .back"), kicker: q(".case-head .kicker"), h1: q(".case-head h1"), log: log,
      when: q(".hx-when", log), dl: q("dl", log), now: logRow(q("dl", log), "Now"), film: q(".case-film"), script: q("main > .film-script"),
      page: location.pathname.split("/").pop().replace(/\.html$/, "") || "index" };
  }

  function ready(fn) {
    function run() { try { fn(); } catch (e) { if (window.console) console.warn("studio-deep", e); } r.classList.add("sd-ready"); }
    if (d.readyState === "loading") d.addEventListener("DOMContentLoaded", run); else run();
  }

  window.SD = { k: k, el: el, q: q, qa: qa, home: home, record: record, list: list, film: film, caseHead: caseHead, ready: ready,
    moving: moving, reduce: reduce, longDate: longDate, dateHtml: dateHtml, logRow: logRow, ADDED: ADDED };
  document.write('<script src="' + BASE + "deep-" + k + '.js"><\/script>');
})();
