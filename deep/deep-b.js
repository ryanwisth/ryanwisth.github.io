/* Option B, "Inspector". The site behaves like a tool: on wide screens, a canvas of project plates (the three to start
   with large, the other 13 as a list of small plates) and a sticky inspector that shows the record of the plate you point
   at or focus: what it does, My rules, I tested, Added, its page, its film (plays on click). Pointing at the claim (or
   focusing a link in it) brings back the site's own record: its film and the five facts. The top bar is a toolbar.
   The one motion: the inspector crossfades its record in 120 ms (sd-swap), never under reduced motion.
   Phones get no inspector: each plate opens its record inline beneath it. */
SD.ready(function () {
  var el = SD.el, q = SD.q, qa = SD.qa, main = q("main"), d = document;
  var wide = matchMedia("(min-width: 960px)");
  q(".topbar").classList.add("sd-b-tool");

  function dl(rows) {
    var x = el("dl", "sd-b-log");
    rows.forEach(function (rw) { if (!rw[1]) return; var dv = el("div"); dv.appendChild(el("dt", null, rw[0])); dv.appendChild(el("dd", null, rw[1])); x.appendChild(dv); });
    return x;
  }
  function plain(s) { return s.replace(/<[^>]+>/g, ""); }

  if (q("body.case")) {
    /* ---------- case page head: title and result on the left; the film as the canvas; the changelog as the inspector ---------- */
    var C = SD.caseHead(); if (!C) return;
    var app = el("div", "sd-b-capp"), cv = el("div", "sd-b-ccanvas"), insp = el("aside", "sd-b-insp sd-b-cinsp");
    insp.setAttribute("aria-label", "Changelog");
    var head = el("header", "sd-b-chead"), top = el("div", "sd-b-ctop"); top.appendChild(C.back); top.appendChild(C.kicker); head.appendChild(top); head.appendChild(C.h1);
    if (C.now) { head.appendChild(el("p", "sd-b-result", q("dd", C.now).innerHTML)); C.now.remove(); }
    cv.appendChild(head); cv.appendChild(C.film); if (C.script) cv.appendChild(C.script);
    var inner = el("div", "sd-b-insp-in"); C.log.removeAttribute("aria-label"); inner.appendChild(C.log); insp.appendChild(inner);
    app.appendChild(cv); app.appendChild(insp);
    main.insertBefore(app, main.firstChild); C.head.remove();
    return;
  }

  /* ---------- home ---------- */
  var H = SD.home(), P = H.projects;
  var app = el("div", "sd-b-app"), cv = el("div", "sd-b-canvas"), insp = el("aside", "sd-b-insp"), box = el("div", "sd-b-insp-in");
  insp.setAttribute("aria-label", "Project record"); insp.appendChild(box);

  /* the claim */
  var hero = el("section", "sd-b-hero"); hero.appendChild(H.h1); hero.appendChild(H.sub); hero.appendChild(H.mail);
  cv.appendChild(hero);

  /* the site's own record: its film and the five facts, under "Updated <date>" */
  var site = el("div", "sd-b-rec sd-b-site");
  site.appendChild(H.film);
  var fl = el("ul", "sd-b-facts"); H.facts.forEach(function (f) { fl.appendChild(el("li", null, "<b>" + f.b + "</b> " + f.s)); }); site.appendChild(fl);
  var siteSpot = el("div", "sd-b-sitespot");             // where the site record sits on a phone
  cv.appendChild(siteSpot);

  function record(p) {
    var rec = el("div", "sd-b-rec");
    rec.appendChild(el("p", "sd-b-rk", p.starter ? p.kicker : p.group));
    rec.appendChild(el("p", "sd-b-rname", '<a href="' + p.href + '">' + p.name + "</a>"));
    rec.appendChild(SD.film(p.page, { label: "Narrated film: " + plain(p.name) }).fig);
    var logSpot = el("div"); rec.appendChild(logSpot);
    function fill() {
      logSpot.replaceChildren(dl([["What it does", p.what], [p.rulesLabel, p.rules && p.rules.length ? (p.starter ? p.rules.join("; ") : SD.list(p.rules)) : ""],
        ["I tested", p.tested && p.tested.length ? SD.list(p.tested) : ""], ["Added", SD.dateHtml(p.date)]]));
    }
    fill(); if (!p.starter) SD.record(p).then(fill);
    rec.appendChild(el("p", "sd-b-rlinks", '<a href="' + p.href + '">See the project</a>' + (p.demo ? ' <a href="' + p.demo.href + '">' + p.demo.text + "</a>" : "")));
    return rec;
  }

  /* the inspector: one record at a time, crossfaded */
  var cur = null, curKey = null, timer = 0;
  function show(key, make) {
    if (!wide.matches || key === curKey) return;
    curKey = key;
    qa(".sd-b-cur").forEach(function (x) { x.classList.remove("sd-b-cur"); });
    var src = key === "site" ? hero : q('[data-key="' + key + '"]', cv); if (src) src.classList.add("sd-b-cur");
    var next = make(), old = cur;
    if (old) qa("video", old).forEach(function (v) { v.pause(); });
    if (old && SD.moving()) {
      old.classList.add("sd-b-out"); box.appendChild(next); next.classList.add("sd-b-in");
      setTimeout(function () { if (old.parentNode === box) old.remove(); old.classList.remove("sd-b-out"); next.classList.remove("sd-b-in"); }, 130);
    } else { if (old) old.remove(); box.appendChild(next); }
    cur = next;
  }
  function hook(node, key, make) {
    node.setAttribute("data-key", key);
    node.addEventListener("pointerenter", function () { clearTimeout(timer); timer = setTimeout(function () { show(key, make); }, 70); });
    node.addEventListener("pointerleave", function () { clearTimeout(timer); });
    node.addEventListener("focusin", function () { clearTimeout(timer); show(key, make); });
  }
  hook(hero, "site", function () { return site; });

  /* an inline record beneath a plate, for phones */
  function opener(plate, p) {
    var b = el("button", "sd-b-more", "Show the record"), spot = el("div", "sd-b-inline"), made = false;
    b.type = "button"; b.setAttribute("aria-expanded", "false");
    b.addEventListener("click", function () {
      if (!made) { spot.appendChild(record(p)); made = true; }
      var open = !spot.hasAttribute("data-open");
      if (open) spot.setAttribute("data-open", ""); else { spot.removeAttribute("data-open"); qa("video", spot).forEach(function (v) { v.pause(); }); }
      b.textContent = open ? "Hide the record" : "Show the record"; b.setAttribute("aria-expanded", open ? "true" : "false");
    });
    plate.appendChild(b); plate.appendChild(spot);
  }

  /* the three to start with: large plates, the newest widest */
  var fs = el("section", "sd-b-sec"); fs.id = "featured"; fs.appendChild(el("h2", null, H.featuredH.innerHTML));
  var stars = el("div", "sd-b-stars");
  P.filter(function (p) { return p.starter; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; }).forEach(function (p, i) {
    var pl = el("article", "sd-b-plate sd-b-star sd-b-star" + i);
    pl.appendChild(el("div", "sd-b-poster", '<img src="img/film-' + p.page + '-history.jpg" alt="" width="960" height="540" loading="lazy">'));
    var tx = el("div", "sd-b-ptext");
    tx.appendChild(el("p", "sd-b-pk", p.kicker));
    var h = el("h3", "sd-b-pname", '<a href="' + p.href + '">' + p.name + "</a>"); if (p.vt) h.setAttribute("style", p.vt); tx.appendChild(h);
    if (i === 0) tx.appendChild(el("p", "sd-b-pwhat", p.what));
    pl.appendChild(tx);
    hook(pl, p.page, function () { return record(p); });
    opener(pl, p);
    stars.appendChild(pl);
  });
  fs.appendChild(stars); cv.appendChild(fs);

  /* the other 13: small plates in a list, grouped as the page groups them */
  var ws = el("section", "sd-b-sec"); ws.id = "work"; ws.appendChild(el("h2", null, H.workH.innerHTML));
  H.groups.forEach(function (g) {
    var gs = el("div", "sd-b-group"); gs.appendChild(el("h3", "sd-b-gname", g.name));
    var ul = el("ul", "sd-b-list");
    g.projects.forEach(function (p) {
      var li = el("li", "sd-b-plate sd-b-row");
      li.appendChild(el("div", "sd-b-thumb", '<img src="img/film-' + p.page + '-history.jpg" alt="" width="960" height="540" loading="lazy">'));
      var tx = el("div", "sd-b-ptext");
      tx.appendChild(el("h4", "sd-b-pname", '<a href="' + p.href + '">' + p.name + "</a>"));
      tx.appendChild(el("p", "sd-b-pwhat", p.what));
      li.appendChild(tx);
      li.appendChild(el("p", "sd-b-pdate", SD.dateHtml(p.date)));
      hook(li, p.page, function () { return record(p); });
      opener(li, p);
      ul.appendChild(li);
    });
    gs.appendChild(ul); ws.appendChild(gs);
  });
  cv.appendChild(ws);

  /* how each one is built, and the closing line */
  var hs = el("section", "sd-b-sec sd-b-how"); hs.id = "how"; hs.appendChild(el("h2", null, H.howH.innerHTML)); hs.appendChild(H.method);
  cv.appendChild(hs);
  var bs = el("section", "sd-b-close"); bs.appendChild(H.band); cv.appendChild(bs);

  app.appendChild(cv); app.appendChild(insp);
  var wrap = el("div", "wrap sd-b-wrap"); wrap.appendChild(app);
  main.replaceChildren(wrap);

  function place() {
    if (wide.matches) { if (site.parentNode !== box) { box.replaceChildren(site); cur = site; curKey = "site"; hero.classList.add("sd-b-cur"); } }
    else { siteSpot.appendChild(site); cur = null; curKey = null; qa(".sd-b-cur").forEach(function (x) { x.classList.remove("sd-b-cur"); }); }
  }
  place();
  if (wide.addEventListener) wide.addEventListener("change", place);
  /* the records' rules and tests arrive from their pages in the background, so the first point is instant */
  P.forEach(function (p) { if (!p.starter) SD.record(p); });
});
