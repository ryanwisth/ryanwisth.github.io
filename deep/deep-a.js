/* Option A, "Release ledger". The claim at full scale; the facts as one typeset release line; then the page is the site's own
   release history: a deep-green spine down the left with a dated mark for every project (dates from the "Added" lines),
   projects hanging off it as entries (no cards). The three to start with show their film; the others open theirs on a click.
   The one motion: the spine above the reading line is filled, below it is a hairline (scroll-linked; still under reduced
   motion or "Pause motion", where every mark is drawn reached). */
SD.ready(function () {
  var el = SD.el, q = SD.q, qa = SD.qa, main = q("main");
  var led = null;

  function row(cls, when, body, id) {
    var r = el("div", "sd-a-row " + cls); if (id) r.id = id;
    var w = el("p", "sd-a-when"); if (when) { if (typeof when === "string") w.innerHTML = when; else w.appendChild(when); }
    r.appendChild(w); r.appendChild(el("span", "sd-a-mark")); var b = el("div", "sd-a-body"); r.appendChild(b);
    if (body) [].concat(body).forEach(function (n) { b.appendChild(n); });
    return r;
  }
  function logDl(p) {
    var dl = el("dl", "sd-a-log");
    function add(name, html) { if (!html) return; var dv = el("div"); dv.appendChild(el("dt", null, name)); dv.appendChild(el("dd", null, html)); dl.appendChild(dv); }
    /* the three on home keep their rules as the page writes them, one line with semicolons; the others' are lists on their pages */
    add(p.rulesLabel, p.rules && p.rules.length ? (p.starter ? p.rules.join("; ") : SD.list(p.rules)) : "");
    add("I tested", p.tested && p.tested.length ? SD.list(p.tested) : "");
    return dl;
  }

  if (q("body.case")) {
    /* ---------- case page head: title, result line, the changelog on the spine beside the film ---------- */
    var C = SD.caseHead(); if (!C) return;
    var head = el("header", "sd-a-chead");
    var top = el("div", "sd-a-ctop"); top.appendChild(C.back); top.appendChild(C.kicker); head.appendChild(top);
    head.appendChild(C.h1);
    if (C.now) { var res = el("p", "sd-a-result"); res.innerHTML = q("dd", C.now).innerHTML; head.appendChild(res); C.now.remove(); }
    led = el("div", "sd-a-led sd-a-cled");
    led.appendChild(el("div", "sd-a-spine", '<i class="sd-a-fill"></i>'));
    var rows = el("div", "sd-a-rows");
    rows.appendChild(row("sd-a-release", C.when, null));
    qa(":scope > div", C.dl).forEach(function (dv) {
      var dt = q("dt", dv), dd = q("dd", dv);
      rows.appendChild(row("sd-a-entry-row", dt.innerHTML, el("div", "sd-a-cdd", dd.innerHTML)));
    });
    led.appendChild(rows);
    var side = el("div", "sd-a-cfilm"); side.appendChild(C.film); if (C.script) side.appendChild(C.script);
    led.appendChild(side);
    C.log.remove();
    main.insertBefore(head, main.firstChild);
    head.after(led);
    C.head.remove();
    spine();
    return;
  }

  /* ---------- home ---------- */
  var H = SD.home();
  var hero = el("section", "sd-a-hero"), hw = el("div", "wrap sd-a-hgrid");
  var claim = el("div", "sd-a-claim"); claim.appendChild(H.h1); hw.appendChild(claim);
  var aside = el("div", "sd-a-aside"); aside.appendChild(H.sub); aside.appendChild(H.mail); hw.appendChild(aside);
  var rel = el("p", "sd-a-rel");
  H.facts.forEach(function (f) { rel.appendChild(el("span", "sd-a-fact", "<b>" + f.b + "</b> " + f.s)); });
  hw.appendChild(rel); hero.appendChild(hw);

  var ledger = el("section", "sd-a-ledger"), lw = el("div", "wrap");
  led = el("div", "sd-a-led");
  led.appendChild(el("div", "sd-a-spine", '<i class="sd-a-fill"></i>'));
  var rows = el("div", "sd-a-rows"), lastDate = null;
  function dated(iso) { if (iso === lastDate) return null; lastDate = iso; return SD.dateHtml(iso); }

  /* the site itself is the newest release: its film, under "Updated <date>" */
  rows.appendChild(row("sd-a-release", H.ver, H.film));
  lastDate = (q("time", H.ver) || {}).getAttribute ? q("time", H.ver).getAttribute("datetime") : null;

  var fh = el("h2", null, H.featuredH.innerHTML);
  rows.appendChild(row("sd-a-head", null, fh, "featured"));
  lastDate = null;
  var starters = H.projects.filter(function (p) { return p.starter; }).sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : 0; });
  starters.forEach(function (p) {
    var art = el("article", "sd-a-entry sd-a-star");
    art.appendChild(el("p", "sd-a-kick", p.kicker));
    var h = el("h3", "sd-a-name", '<a href="' + p.href + '">' + p.name + "</a>"); if (p.vt) h.setAttribute("style", p.vt); art.appendChild(h);
    var cols = el("div", "sd-a-cols"), tx = el("div", "sd-a-text");
    tx.appendChild(el("p", "sd-a-what", p.what)); tx.appendChild(logDl(p));
    var links = el("p", "sd-a-links", '<a href="' + p.href + '">' + p.go + "</a>" + (p.demo ? ' <a href="' + p.demo.href + '">' + p.demo.text + "</a>" : ""));
    tx.appendChild(links); cols.appendChild(tx);
    cols.appendChild(SD.film(p.page, { label: "Narrated film: " + p.name.replace(/<[^>]+>/g, "") }).fig);
    art.appendChild(cols);
    rows.appendChild(row("sd-a-entry-row sd-a-star-row", dated(p.date), art));
  });

  var wh = el("h2", null, H.workH.innerHTML);
  rows.appendChild(row("sd-a-head", null, wh, "work"));
  lastDate = null;
  H.groups.forEach(function (g) {
    rows.appendChild(row("sd-a-group", null, el("h3", "sd-a-gname", g.name)));
    g.projects.forEach(function (p) {
      var art = el("article", "sd-a-entry");
      art.appendChild(el("h4", "sd-a-name", '<a href="' + p.href + '">' + p.name + "</a>"));
      art.appendChild(el("p", "sd-a-what", p.what));
      var logBox = el("div", "sd-a-logbox"); art.appendChild(logBox);
      var btn = el("button", "sd-a-open", "Play the film"); btn.type = "button"; btn.setAttribute("aria-expanded", "false");
      var slot = el("div", "sd-a-slot"), f = null;
      btn.addEventListener("click", function () {
        if (!f) { f = SD.film(p.page, { label: "Narrated film: " + p.name.replace(/<[^>]+>/g, ""), preload: "metadata" }); slot.appendChild(f.fig); }
        var open = slot.hasAttribute("data-open");
        if (open) { slot.removeAttribute("data-open"); f.v.pause(); btn.textContent = "Play the film"; btn.setAttribute("aria-expanded", "false"); }
        else { slot.setAttribute("data-open", ""); btn.textContent = "Close the film"; btn.setAttribute("aria-expanded", "true"); f.go(); }
      });
      var links = el("p", "sd-a-links"); links.appendChild(btn); art.appendChild(links); art.appendChild(slot);
      rows.appendChild(row("sd-a-entry-row", dated(p.date), art));
      SD.record(p).then(function () { logBox.appendChild(logDl(p)); });
    });
  });

  var hh = el("h2", null, H.howH.innerHTML);
  rows.appendChild(row("sd-a-head", null, hh, "how"));
  rows.appendChild(row("sd-a-how", null, H.method));
  led.appendChild(rows); lw.appendChild(led); ledger.appendChild(lw);

  var band = el("section", "sd-a-band"), bw = el("div", "wrap"); bw.appendChild(H.band); band.appendChild(bw);
  main.replaceChildren(hero, ledger, band);
  spine();

  /* ---------- the one motion: the spine fills to the reading line ---------- */
  function spine() {
    var marks = qa(".sd-a-row", led);
    if (!SD.moving()) { led.classList.add("sd-a-still"); return; }
    led.classList.add("sd-a-live");
    var fill = q(".sd-a-fill", led), pending = false;
    function tick() {
      pending = false;
      var rc = led.getBoundingClientRect(), line = innerHeight * 0.42, y = Math.max(0, Math.min(rc.height, line - rc.top));
      fill.style.height = y + "px";
      for (var i = 0; i < marks.length; i++) { var m = q(".sd-a-mark", marks[i]).getBoundingClientRect(); marks[i].classList.toggle("sd-a-past", m.top + m.height / 2 - rc.top <= y); }
    }
    function ask() { if (!pending) { pending = true; requestAnimationFrame(tick); } }
    addEventListener("scroll", ask, { passive: true }); addEventListener("resize", ask);
    if (window.ResizeObserver) new ResizeObserver(ask).observe(led);
    tick();
  }
});
