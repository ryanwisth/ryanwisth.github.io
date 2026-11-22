/* Option C, "Proof reel". The films lead. The site film is the hero, near full content width at 16:9, the claim above it;
   the five facts run as captions along its lower edge. Every project is a figure plate: film or poster first, the caption
   under it (name and its sentence), then My rules / I tested. Plates vary in width down the page, on one left edge.
   The one motion: timestamp keys under the films seek the film and mark the line being said (and the mark follows the
   film while it plays). Cue times are the films' own beat markers, from _tools/history-films/pf-history/out/history/
   <page>-checks.txt ("verify (web copy)"); the lines are the films' scripts as written on the pages. */
SD.ready(function () {
  var el = SD.el, q = SD.q, qa = SD.qa, main = q("main"), d = document;
  /* [seconds, the line's first words] */
  var CUES = {
    "index": [[5.0, "AI feedback, handwritten"], [11.0, "A 3D family tree"], [16.4, "And a private phone app"]],
    "paper-grader": [[11.6, "Tap Grade."], [18.2, "Up to 24 pages"], [23.0, "The student"]],
    "family-tree-3d": [[11.6, "Height is birth year"], [17.0, "One file holds everything"], [23.0, "The public demo"]],
    "claude-phone": [[12.2, "Each chat is watched live"], [17.6, "12 of 16 desktop features"], [22.4, "A reply from the phone"]],
    "token-guard": [[5.0, "Written rules did not hold"], [15.2, "482 of 662"], [23.0, "Its first step takes"]]
  };
  /* the three films' scripts, as their own pages write them under "Read the script" */
  var SCRIPTS = {
    "paper-grader": "Tap Grade on a paper tablet, and an AI writes its notes back onto the page in pen strokes. Getting feedback on handwritten work usually means retyping it, or taking a photo. Tap Grade. A program checks every equation first. Then the notes appear in handwriting-style ink. Up to 24 pages are graded at once, from one button press. The student’s own writing is never changed. The AI can add notes, never remove. Built and used on the tablet in August 2026. Feedback on the page, within seconds. Details and code are below.",
    "family-tree-3d": "A 3D family tree, with a map of where people moved, that opens from one file. A family tree can grow to tens of thousands of people, and normal charts become hard to read. Height is birth year. Distance shows closeness. Direction is the family branch. One file holds everything. Nothing to set up or install, and it works offline. The public demo holds 420 made-up people, so it can be shared safely. It runs a private family tree, and a live demo sits on this page. One file, no internet, safe to share. Details and code are below.",
    "claude-phone": "Claude Code, an AI assistant that does real work on a Mac, run from a private iPhone app. It often works for minutes, then stops to ask something. Away from the desk, the work just sat there. Each chat is watched live. An answer is one tap, while the Mac keeps doing the work. 12 of 16 desktop features work on the phone, each one tested. A reply from the phone starts the answer in 6 seconds. It is used every day, and it is never on the public internet. So the work keeps moving, from anywhere. Details are below."
  };
  function mmss(t) { t = Math.floor(t); return Math.floor(t / 60) + ":" + ("0" + (t % 60)).slice(-2); }
  /* a script paragraph split into its sentences (the text is unchanged; each sentence becomes a span) */
  function sentences(p, text) {
    var parts = text.match(/[^]*?[.!?]+[’"]?(?:\s+|$)/g) || [text];
    p.textContent = "";
    return parts.map(function (s) { var sp = el("span", "sd-c-line"); sp.textContent = s; p.appendChild(sp); return sp; });
  }
  /* the keys: seek, play, mark the line; while the film plays the mark follows the cues */
  function keys(v, cues, lines, details) {
    var row = el("div", "sd-c-keys"), btns = [], want = null;      // want: a seek asked for and not yet done
    v.addEventListener("seeked", function () { if (want != null && Math.abs(v.currentTime - want) < 0.6) want = null; });
    var targets = cues.map(function (c) { var hit = null; lines.forEach(function (sp) { if (!hit && sp.textContent.trim().indexOf(c[1]) === 0) hit = sp; }); return hit; });
    function mark(i) {
      lines.forEach(function (sp) { sp.classList.remove("sd-c-now"); });
      btns.forEach(function (b, j) { b.setAttribute("aria-pressed", j === i ? "true" : "false"); });
      if (i >= 0 && targets[i]) targets[i].classList.add("sd-c-now");
    }
    cues.forEach(function (c, i) {
      var b = el("button", "sd-c-key", mmss(c[0])); b.type = "button"; b.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-label", "Play from " + mmss(c[0]));
      b.addEventListener("click", function () {
        if (details && !details.open) details.open = true;
        want = c[0]; mark(i);
        if (v.readyState >= 1) { try { v.currentTime = want; } catch (e) {} }
        else v.addEventListener("loadedmetadata", function () { if (want != null) try { v.currentTime = want; } catch (e) {} }, { once: true });
        var p = v.play(); if (p && p.catch) p.catch(function () {});
      });
      btns.push(b); row.appendChild(b);
    });
    v.addEventListener("timeupdate", function () {
      if (v.paused || want != null) return;
      var i = -1; cues.forEach(function (c, j) { if (v.currentTime >= c[0] - 0.05) i = j; });
      if (i >= 0 && v.currentTime > cues[i][0] + 6.5) i = -1;
      mark(i);
    });
    return row;
  }
  function logDl(p) {
    var x = el("dl", "sd-c-log");
    function add(n, h) { if (!h) return; var dv = el("div"); dv.appendChild(el("dt", null, n)); dv.appendChild(el("dd", null, h)); x.appendChild(dv); }
    add(p.rulesLabel, p.rules && p.rules.length ? (p.starter ? p.rules.join("; ") : SD.list(p.rules)) : "");
    add("I tested", p.tested && p.tested.length ? SD.list(p.tested) : "");
    return x;
  }

  if (q("body.case")) {
    /* ---------- case page head: title and result line; the film as the reel; the changelog as captions under it ---------- */
    var C = SD.caseHead(); if (!C) return;
    var head = el("header", "sd-c-chead"), top = el("div", "sd-c-ctop"); top.appendChild(C.back); top.appendChild(C.kicker);
    head.appendChild(top); head.appendChild(C.h1);
    if (C.now) { head.appendChild(el("p", "sd-c-result", q("dd", C.now).innerHTML)); C.now.remove(); }
    var reel = el("div", "sd-c-creel");
    reel.appendChild(C.film);
    C.log.classList.add("sd-c-caplog"); reel.appendChild(C.log);
    var v = q("video", C.film), sp = C.script && q("p", C.script);
    if (v && sp && CUES[C.page]) {
      var lines = sentences(sp, sp.textContent);
      C.script.open = true;
      var tr = el("div", "sd-c-trans"); tr.appendChild(keys(v, CUES[C.page], lines, C.script)); tr.appendChild(C.script);
      reel.insertBefore(tr, C.log);
    }
    main.insertBefore(head, main.firstChild); head.after(reel); C.head.remove();
    return;
  }

  /* ---------- home ---------- */
  var H = SD.home();
  var hero = el("section", "sd-c-hero"), hw = el("div", "wrap");
  var top = el("div", "sd-c-top"), claim = el("div", "sd-c-claim"), aside = el("div", "sd-c-aside");
  claim.appendChild(H.h1); aside.appendChild(H.sub); aside.appendChild(H.mail); top.appendChild(claim); top.appendChild(aside); hw.appendChild(top);

  /* the reel: the site film, the facts along its lower edge, the keys and the script */
  var reel = el("div", "sd-c-reel"), shot = q(".shot", H.film), cap = q(".film-cap", H.film), det = q(".film-script", H.film);
  reel.appendChild(shot);
  var caps = el("ul", "sd-c-caps"); H.facts.forEach(function (f) { caps.appendChild(el("li", null, "<b>" + f.b + "</b> " + f.s)); }); reel.appendChild(caps);
  var under = el("div", "sd-c-under"), left = el("div", "sd-c-uleft");
  var hv = q("video", shot), hp = q("p", det), hlines = sentences(hp, hp.textContent);
  det.open = true;
  left.appendChild(keys(hv, CUES.index, hlines, det)); left.appendChild(cap);
  under.appendChild(left); under.appendChild(det); reel.appendChild(under);
  hw.appendChild(reel); hero.appendChild(hw);

  /* the three to start with: figure plates, wide, narrow, wide */
  var fs = el("section", "sd-c-sec"), fw = el("div", "wrap"); fs.id = "featured";
  fw.appendChild(el("h2", "sd-c-h2", H.featuredH.innerHTML));
  H.projects.filter(function (p) { return p.starter; }).forEach(function (p, i) {
    var fig = el("figure", "sd-c-plate sd-c-star sd-c-w" + i);
    var f = SD.film(p.page, { label: "Narrated film: " + p.name.replace(/<[^>]+>/g, ""), keepTime: true });
    fig.appendChild(f.fig);
    var sd = el("details", "film-script sd-c-script"); sd.appendChild(el("summary", null, "Read the script"));
    var spp = el("p"); sd.appendChild(spp); var lines = sentences(spp, SCRIPTS[p.page] || "");
    var tr = el("div", "sd-c-trans"); tr.appendChild(keys(f.v, CUES[p.page] || [], lines, sd)); tr.appendChild(sd);
    fig.appendChild(tr);
    var fc = el("figcaption", "sd-c-cap");
    var h = el("h3", "sd-c-name", '<a href="' + p.href + '">' + p.name + "</a>"); if (p.vt) h.setAttribute("style", p.vt); fc.appendChild(h);
    fc.appendChild(el("p", "sd-c-what", p.what));
    fc.appendChild(logDl(p));
    fc.appendChild(el("p", "sd-c-links", '<a href="' + p.href + '">' + p.go + "</a>" + (p.demo ? ' <a href="' + p.demo.href + '">' + p.demo.text + "</a>" : "")));
    fig.appendChild(fc);
    fw.appendChild(fig);
  });
  fs.appendChild(fw);

  /* the other 13: smaller plates, poster first, in rows of unequal width */
  var ws = el("section", "sd-c-sec"), ww = el("div", "wrap"); ws.id = "work";
  ww.appendChild(el("h2", "sd-c-h2", H.workH.innerHTML));
  H.groups.forEach(function (g) {
    ww.appendChild(el("h3", "sd-c-gname", g.name));
    var flow = el("div", "sd-c-flow");
    g.projects.forEach(function (p, i) {
      var fig = el("figure", "sd-c-plate sd-c-small " + ((i % 4 === 0 || i % 4 === 3) ? "sd-c-wide" : "sd-c-narrow"));
      var nm = p.name.replace(/<[^>]+>/g, "");
      var pb = el("button", "sd-c-poster", '<img src="img/film-' + p.page + '-history.jpg" alt="" width="960" height="540" loading="lazy"><span class="sd-c-play">Play the film</span>');
      pb.type = "button"; pb.setAttribute("aria-label", "Play the film: " + nm);
      pb.addEventListener("click", function () {
        var f = SD.film(p.page, { label: "Narrated film: " + nm, preload: "metadata" });
        pb.replaceWith(f.fig); f.go(); var b = q(".sd-play", f.fig); if (b) b.focus();
      });
      fig.appendChild(pb);
      var fc = el("figcaption", "sd-c-cap");
      fc.appendChild(el("h4", "sd-c-name", '<a href="' + p.href + '">' + p.name + "</a>"));
      fc.appendChild(el("p", "sd-c-what", p.what));
      var lb = el("div"); fc.appendChild(lb);
      SD.record(p).then(function () { lb.appendChild(logDl(p)); });
      fig.appendChild(fc);
      flow.appendChild(fig);
    });
    ww.appendChild(flow);
  });
  ws.appendChild(ww);

  /* how each one is built, and the closing line */
  var hs = el("section", "sd-c-sec sd-c-how"), hw2 = el("div", "wrap"); hs.id = "how";
  hw2.appendChild(el("h2", "sd-c-h2", H.howH.innerHTML)); hw2.appendChild(H.method); hw2.appendChild(H.band); hs.appendChild(hw2);
  main.replaceChildren(hero, fs, ws, hs);
});
