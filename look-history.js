/* Studio (key "history"), the Inspector (Ryan's pick "B: Inspector", Nov 21 2026). The site behaves like a tool.
   Home, on wide screens: a canvas of plates (the claim, the five to start with large, the other 12 as rows) and a sticky
   inspector that shows the record of what is selected. Selection works like a design tool: the selected plate wears a
   1 px green outline with four square handles (one frame, .vh-sel, moved without animation). Pointing, Tab, and the up and
   down arrows (while a plate has focus) move it; Escape goes back to the claim, which shows the site's own record (its film
   and the five facts). At load the first starter is selected, so the first screen shows a real project record.
   Tightened (Ryan's pick, Nov 23 2026): the toolbar is name, Projects, How I work, GitHub and a filled "Email me"; Dark/Light,
   the Style picker and "Pause motion" sit in the footer; the claim carries three figures from the facts list; the three
   starters are equal plates (picture, kicker, title, one sentence of their own description, one figure from their own text);
   "How I build each one" sits right under them. Phones: no inspector and no site record; each plate opens its record inline.
   Case pages: the write-up is a document canvas on the left; the project's inspector sits right and sticky (film, the
   result line, My rules / AI wrote / I tested, Added, its links, then "On this page" with the section in view marked).
   Phones: the record sits under the title, the outline folded under "On this page". 404: the toolbar and an empty inspector.
   The one motion: the inspector crossfades a new record in 120 ms (vh-fade), never under reduced motion or "Pause motion".
   look.js loads this file whenever Studio is worn (with or without motion), id look-history-js, so site.js never loads it
   twice. The page is held hidden until this has laid it out (html.vh-ready; look.js sets a 2.5 s fail-safe).
   No page copy is written here: every text shown is moved or copied from the page (or, for the 13 other projects' rules
   and tests, read from their own case pages). New words are short UI labels only. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__historyLive || !d.addEventListener) return;
  W.__historyLive = 1;
  if (r.getAttribute('data-look') !== 'history') { r.classList.add('vh-ready'); return; }
  var reduce = W.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wide = W.matchMedia ? matchMedia('(min-width: 960px)') : { matches: true };
  function moving() { return !reduce && r.getAttribute('data-motion') !== 'paused'; }
  function el(tag, cls, html) { var e = d.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function q(s, root) { return (root || d).querySelector(s); }
  function qa(s, root) { return [].slice.call((root || d).querySelectorAll(s)); }
  function plain(s) { return s.replace(/<[^>]+>/g, ''); }
  function onWide(fn) { if (wide.addEventListener) wide.addEventListener('change', fn); else if (wide.addListener) wide.addListener(fn); }

  /* "Added" dates, from each case page's own changelog line (stamp.mjs, from git); the 13 other projects carry none on home */
  var ADDED = {
    'agent-runner': '2026-11-13', 'checking-ai-work': '2026-11-13', 'claim-ledger': '2026-11-13', 'claude-phone': '2026-11-15',
    'evidence-pipeline': '2026-11-13', 'family-tree-3d': '2026-11-13', 'local-ai-stack': '2026-11-13', 'mcp-servers': '2026-11-13',
    'paper-grader': '2026-11-13', 'pinball-study': '2026-11-13', 'practice-engine': '2026-11-13', 'safari-dark-mode': '2026-11-13',
    'slot': '2026-11-21', 'streaks-trainer': '2026-11-13', 'token-guard': '2026-11-13', 'token-scan': '2026-11-13'
  };
  var STARTER = {
    'paper-grader-screen': { line: 1, shot: 'img/panel-simulated.jpg', fig: '314', find: '314', cap: 'drawing files decoded' },
    'slot':           { line: 1, shot: 'img/slot-link.jpg', fig: '28 of 28', find: '28 of 28', cap: 'linked-play checks passed, handheld to handheld by radio' },
    'claude-phone':   { line: 1, shot: 'img/claude-phone.jpg', fig: '6 s', find: '6 seconds', cap: 'from my reply on the phone to the answer starting' },
    'paper-grader':   { line: 1, shot: null, fig: '0', find: 'changed 0 times', cap: 'changes to the student\u2019s own writing' },
    'family-tree-3d': { line: 1, shot: 'img/family-tree-3d.jpg', fig: '1 MB', find: 'about 1 MB', cap: 'one page with the whole tree, no internet needed' }
  };
  /* the hero's three figures, in this order, taken from the page's own facts list by their figures */
  var HERO_FIGS = ['16', '\u2212\u2154', '13'];
  function sentences(html) { var t = plain(html).replace(/\s+/g, ' ').trim(); return t.match(/[^.!?]+[.!?]+(\s|$)/g) || [t]; }
  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function dateHtml(iso) { if (!iso) return ''; var p = iso.split('-'); return '<time datetime="' + iso + '">' + (+p[2]) + ' ' + MONTHS[+p[1] - 1] + ' ' + p[0] + '</time>'; }

  /* the text runs between the page's separators (the hidden " &middot;" and the shown ";" or ":"), each kept as written */
  function runs(p) {
    var out = [], cur = '';
    [].forEach.call(p.childNodes, function (n) {
      if (n.nodeType === 3) cur += n.textContent;
      else if (n.nodeName === 'B') return;
      else if (n.classList && (n.classList.contains('hx-x') || n.classList.contains('hx-alt'))) { if (n.classList.contains('hx-alt')) { out.push(cur.trim()); cur = ''; } }
      else cur += n.textContent;
    });
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  function logRow(dl, name) {
    var row = null;
    qa(':scope > div', dl).forEach(function (dv) { var dt = q('dt', dv); if (dt && dt.textContent.trim() === name) row = dv; });
    return row;
  }
  function items(row) { return row ? qa('li', row).map(function (li) { return li.innerHTML; }) : []; }
  function list(arr) { return '<ul>' + arr.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'; }
  function rowsDl(rows, cls) {
    var x = el('dl', cls || 'vh-rows');
    rows.forEach(function (rw) { if (!rw[1]) return; var dv = el('div'); dv.appendChild(el('dt', null, rw[0])); dv.appendChild(el('dd', null, rw[1])); x.appendChild(dv); });
    return x;
  }
  function crumb(parts, title, href) {
    var h = el('div', 'vh-ihead');
    h.appendChild(el('p', 'vh-crumb', parts.map(function (s) { return '<span>' + s + '</span>'; }).join('<span class="vh-sep" aria-hidden="true"> / </span>')));
    if (title) h.appendChild(el('p', 'vh-title', href ? '<a href="' + href + '">' + title + '</a>' : title));
    return h;
  }

  /* one project film: the history twin, poster first, two plain buttons (the labels the look already uses) */
  function film(page, label) {
    var f = el('figure', 'vh-film'), fr = el('div', 'vh-frame'), v = d.createElement('video');
    v.setAttribute('playsinline', ''); v.muted = true; v.preload = 'none'; v.width = 960; v.height = 540;
    v.setAttribute('poster', 'img/film-' + page + '-history.jpg'); v.src = 'video/film-' + page + '-history.mp4';
    v.setAttribute('aria-label', label);
    fr.appendChild(v); f.appendChild(fr);
    var bar = el('div', 'vh-ctl'), play = el('button', 'vh-play', 'Play'), snd = el('button', 'vh-snd', 'Play with sound');
    play.type = snd.type = 'button';
    function sync() { play.textContent = v.paused ? 'Play' : 'Pause'; snd.textContent = v.muted ? 'Play with sound' : 'Mute'; snd.setAttribute('aria-pressed', v.muted ? 'false' : 'true'); }
    function go() { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
    play.addEventListener('click', function () { if (v.paused) go(); else v.pause(); });
    snd.addEventListener('click', function () { if (v.muted) { v.muted = false; if (v.currentTime > 0.5) v.currentTime = 0; go(); } else v.muted = true; sync(); });
    v.addEventListener('click', function () { if (v.paused) go(); else v.pause(); });
    v.addEventListener('play', sync); v.addEventListener('pause', sync); v.addEventListener('volumechange', sync);
    bar.appendChild(snd); bar.appendChild(play); f.appendChild(bar);
    sync();
    return f;
  }

  /* the inspector: one record at a time, crossfaded (the one motion) */
  function Inspector(box) {
    var cur = null;
    return {
      put: function (next) {
        var old = cur;
        if (old === next) return;
        if (old) qa('video', old).forEach(function (v) { v.pause(); });
        if (old && moving()) {
          old.classList.add('vh-out'); box.appendChild(next); next.classList.add('vh-in');
          setTimeout(function () { if (old.parentNode === box && old !== cur) old.remove(); old.classList.remove('vh-out'); next.classList.remove('vh-in'); }, 130);
        } else { if (old && old.parentNode === box) old.remove(); box.appendChild(next); }
        cur = next;
      },
      clear: function () { cur = null; }
    };
  }

  /* the inspector never scrolls inside itself: when it is taller than the window it rides up with the page until its foot
     is in view, then stays (sticky top = the smaller of 76 px and window height minus its height) */
  function stick(insp) {
    function set() { insp.style.top = wide.matches ? Math.min(76, innerHeight - insp.offsetHeight - 16) + 'px' : ''; }
    set(); addEventListener('resize', set);
    if (W.ResizeObserver) new ResizeObserver(set).observe(insp);
  }

  function ready() { r.classList.add('vh-ready'); }
  function run(fn) {
    function go() { try { fn(); } catch (e) { if (W.console) console.warn('studio inspector', e); } ready(); }
    if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', go); else go();
  }

  run(function () {
    var main = q('main'), top = q('.topbar');
    if (top) { top.classList.add('vh-tool'); toolbar(top); }
    if (!main) return;
    if (q('body.case')) { casePage(main); return; }
    if (q('.lead-hero')) homePage(main);
  });

  /* ============ the toolbar (tightened, Ryan's pick Nov 23 2026): name, Projects, How I work, GitHub, "Email me" ============
     The date tag leaves the toolbar (home keeps it as the site record's crumb); Dark/Light, the Style picker and "Pause motion"
     move to the footer as one group of tool buttons. The picker is built by look.js while the page parses; if it arrives
     later it is moved when it does. */
  function toolbar(top) {
    var mail = q('.topnav .nav-mail', top);
    if (mail) { mail.textContent = 'Email me'; mail.classList.add('vh-cta'); }
    var foot = q('footer.site .wrap');
    if (!foot) return;
    var tools = el('div', 'vh-ftools');
    foot.appendChild(tools);
    function gather() {
      var tt = q('.theme-toggle', top), lp = q('.look-pick', top), mt = q('.motion-toggle', foot);
      if (tt) tools.appendChild(tt);
      if (mt && mt.parentNode !== tools) tools.insertBefore(mt, tools.firstChild);
      if (lp) tools.appendChild(lp);
      return !!lp;
    }
    if (!gather() && W.MutationObserver) {
      var mo = new MutationObserver(function () { if (gather()) mo.disconnect(); });
      mo.observe(top, { childList: true, subtree: true });
    }
  }

  /* ================================ home ================================ */
  function homePage(main) {
    var H = {
      h1: q('.lead-hero h1'), sub: q('.hero-sub'), mail: q('.hero-mail'), film: q('.hero-film'), facts: [],
      ver: q('.hx-ver'), brand: q('.topbar .brand'), featuredH: q('.leads-head h2'), workH: q('#work .section-head h2'), howH: q('#how .section-head h2'),
      method: q('.how2'), band: q('.band'), projects: [], groups: []
    };
    qa('.facts.proof .fact').forEach(function (f) { H.facts.push({ b: q('b', f).innerHTML, s: q(':scope > span', f).innerHTML }); });
    qa('.leads a.card.lead').forEach(function (a) {
      var log = q('.hx-lead-log', a), page = a.getAttribute('href').replace('.html#', '-').replace(/\.html$/, ''), wrap = a.parentNode, tested = null;
      if (log) qa(':scope > div', log).forEach(function (dv) { if (q('dt', dv).textContent.trim() === 'I tested') tested = dv; });
      var t = q('.hx-added time', a), nowRow = log ? logRow(log, 'Now') : null;
      H.projects.push({
        page: page, href: a.getAttribute('href'), starter: true, group: q('.lead-k', a).innerHTML, name: q('h4', a).innerHTML,
        vt: q('h4', a).getAttribute('style') || '', what: q('.lead-what', a).innerHTML, rulesLabel: q('.lead-role b', a).innerHTML,
        rules: runs(q('.lead-role', a)), tested: items(tested), date: t ? t.getAttribute('datetime') : ADDED[page],
        now: nowRow ? q('dd', nowRow).textContent : '',
        demo: wrap.classList.contains('lead-wrap') && q('.badge', wrap) ? { href: q('.badge', wrap).getAttribute('href'), text: q('.badge', wrap).textContent.trim() } : null
      });
    });
    qa('.more-g').forEach(function (g) {
      var grp = { name: q('.group-h', g).innerHTML, projects: [] };
      qa('li > a', g).forEach(function (a) {
        var page = a.getAttribute('href').replace(/\.html$/, '');
        var p = { page: page, href: a.getAttribute('href'), starter: false, group: grp.name, name: q('b', a).innerHTML, what: q('span', a).innerHTML,
          date: ADDED[page], rules: null, tested: null, rulesLabel: 'My rules' };
        grp.projects.push(p); H.projects.push(p);
      });
      H.groups.push(grp);
    });
    var P = H.projects, BRAND = H.brand ? plain(H.brand.innerHTML.replace(/<span class="mark">.*?<\/span>/, '')).trim() : '';

    /* My rules / I tested for the projects whose record is only on their own page: read from that page's changelog */
    var cache = {};
    function fetchRec(p) {
      if (p.rules) return Promise.resolve(p);
      if (!W.fetch || !W.DOMParser) return Promise.resolve(p);
      if (!cache[p.page]) cache[p.page] = fetch(p.href).then(function (res) { return res.ok ? res.text() : ''; }).then(function (t) {
        var doc = new DOMParser().parseFromString(t, 'text/html'), dl = q('.hx-log dl', doc);
        return dl ? { rules: items(logRow(dl, 'My rules')), tested: items(logRow(dl, 'I tested')) } : { rules: [], tested: [] };
      }).catch(function () { return { rules: [], tested: [] }; });
      return cache[p.page].then(function (rec) { p.rules = rec.rules; p.tested = rec.tested; return p; });
    }

    var app = el('div', 'vh-app'), cv = el('div', 'vh-canvas'), insp = el('aside', 'vh-insp'), box = el('div', 'vh-insp-in');
    insp.setAttribute('aria-label', 'Project record'); insp.appendChild(box);
    var I = Inspector(box), sel = el('div', 'vh-sel'); sel.setAttribute('aria-hidden', 'true');
    for (var k = 0; k < 4; k++) sel.appendChild(el('i'));

    /* the claim: a selectable object; selected at load, its record is the site's */
    var hero = el('section', 'vh-hero vh-obj'); hero.setAttribute('tabindex', '-1'); hero.setAttribute('aria-label', plain(H.h1.innerHTML));
    hero.appendChild(H.h1); hero.appendChild(H.sub);
    var hs3 = el('ul', 'vh-stats');
    HERO_FIGS.forEach(function (fig) {
      var f = H.facts.filter(function (x) { return plain(x.b).replace(/\s+/g, '') === fig; })[0];
      if (f) hs3.appendChild(el('li', null, '<b>' + f.b + '</b><span>' + f.s + '</span>'));
    });
    if (hs3.children.length) hero.appendChild(hs3);
    cv.appendChild(hero);
    if (H.ver) H.ver.remove();
    var site = el('div', 'vh-rec vh-site');
    site.appendChild(crumb([H.ver ? H.ver.innerHTML : ''], BRAND));
    site.appendChild(H.film);
    var fl = el('ul', 'vh-facts'); H.facts.forEach(function (f) { fl.appendChild(el('li', null, '<b>' + f.b + '</b> ' + f.s)); }); site.appendChild(fl);

    function record(p) {
      var rec = el('div', 'vh-rec');
      rec.appendChild(crumb([BRAND, p.group], p.name, p.href));
      rec.appendChild(film(p.page, 'Narrated film: ' + plain(p.name)));
      var spot = el('div');
      rec.appendChild(spot);
      function fill() {
        spot.replaceChildren(rowsDl([['What it does', p.what], [p.rulesLabel, p.rules && p.rules.length ? (p.starter ? p.rules.join('; ') : list(p.rules)) : ''],
          ['I tested', p.tested && p.tested.length ? list(p.tested) : ''], ['Added', dateHtml(p.date)]]));
      }
      fill(); if (!p.starter) fetchRec(p).then(fill);
      rec.appendChild(el('p', 'vh-links', '<a href="' + p.href + '">See the project</a>' + (p.demo ? ' <a href="' + p.demo.href + '">' + p.demo.text + '</a>' : '')));
      return rec;
    }

    /* selection: one frame with four handles, moved (never animated) onto the selected object */
    var objs = [], made = {}, curKey = null, timer = 0;
    function frame() {
      var o = curKey && q('[data-key="' + curKey + '"]', cv);
      if (!o || !wide.matches) { sel.hidden = true; return; }
      var a = o.getBoundingClientRect(), c = cv.getBoundingClientRect();
      sel.hidden = false;
      sel.style.top = Math.round(a.top - c.top) + 'px'; sel.style.left = Math.round(a.left - c.left) + 'px';
      sel.style.width = Math.round(a.width) + 'px'; sel.style.height = Math.round(a.height) + 'px';
    }
    function select(key) {
      if (!wide.matches || key === curKey) { frame(); return; }
      curKey = key;
      objs.forEach(function (o) { o.node.classList.toggle('vh-cur', o.key === key); });
      var o = objs.filter(function (x) { return x.key === key; })[0];
      if (o) { if (!made[key]) made[key] = o.make(); I.put(made[key]); }
      frame();
    }
    function hook(node, key, make) {
      node.setAttribute('data-key', key); node.classList.add('vh-obj');
      objs.push({ node: node, key: key, make: make });
      node.addEventListener('pointerenter', function (e) { if (e.pointerType === 'touch') return; clearTimeout(timer); timer = setTimeout(function () { select(key); }, 70); });
      node.addEventListener('pointerleave', function () { clearTimeout(timer); });
      node.addEventListener('focusin', function () { clearTimeout(timer); select(key); });
    }
    hook(hero, 'site', function () { return site; });

    /* an inline record beneath a plate, for phones */
    function opener(plate, p) {
      var b = el('button', 'vh-more', 'Show the record'), spot = el('div', 'vh-inline'), built = false;
      b.type = 'button'; b.setAttribute('aria-expanded', 'false');
      b.addEventListener('click', function () {
        if (!built) { spot.appendChild(record(p)); built = true; }
        var open = !spot.hasAttribute('data-open');
        if (open) spot.setAttribute('data-open', ''); else { spot.removeAttribute('data-open'); qa('video', spot).forEach(function (v) { v.pause(); }); }
        b.textContent = open ? 'Hide the record' : 'Show the record'; b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      plate.appendChild(b); plate.appendChild(spot);
    }

    /* the five to start with, in page order: two then three; picture, kicker, title, one line, one figure */
    var fs = el('section', 'vh-sec'); fs.id = 'featured'; fs.appendChild(el('h2', null, H.featuredH.innerHTML));
    var stars = el('div', 'vh-stars');
    P.filter(function (p) { return p.starter; }).forEach(function (p, i) {
      var pl = el('article', 'vh-plate vh-star vh-star' + i);
      var S = STARTER[p.page] || {}, shot = S.shot || 'img/film-' + p.page + '-history.jpg';
      pl.appendChild(el('div', 'vh-poster' + (S.shot ? ' vh-shot' : ''), '<img src="' + shot + '" alt="" width="960" height="540"' + (i ? ' loading="lazy"' : '') + '>'));
      var tx = el('div', 'vh-ptext');
      tx.appendChild(el('p', 'vh-pk', p.group));
      var h = el('h3', 'vh-pname', '<a href="' + p.href + '">' + p.name + '</a>'); if (p.vt) h.setAttribute('style', p.vt); tx.appendChild(h);
      var ss = sentences(p.what);
      tx.appendChild(el('p', 'vh-pwhat', (ss[S.line || 0] || ss[0]).trim()));
      var own = plain(p.what) + ' ' + p.now;
      if (S.fig && own.indexOf(S.find) >= 0) tx.appendChild(el('p', 'vh-pnum', '<b>' + S.fig + '</b> ' + S.cap));
      pl.appendChild(tx);
      hook(pl, p.page, function () { return record(p); });
      opener(pl, p);
      stars.appendChild(pl);
    });
    fs.appendChild(stars); cv.appendChild(fs);
    /* how each one is built: directly under the five to start with */
    var hs = el('section', 'vh-sec vh-how'); hs.id = 'how'; hs.appendChild(el('h2', null, H.howH.innerHTML)); hs.appendChild(H.method);
    cv.appendChild(hs);

    /* the other 12: rows, grouped as the page groups them */
    var ws = el('section', 'vh-sec'); ws.id = 'work'; ws.appendChild(el('h2', null, H.workH.innerHTML));
    H.groups.forEach(function (g) {
      var gs = el('div', 'vh-group'); gs.appendChild(el('h3', 'vh-gname', g.name));
      var ul = el('ul', 'vh-list');
      g.projects.forEach(function (p) {
        var li = el('li', 'vh-plate vh-row');
        li.appendChild(el('div', 'vh-thumb', '<img src="img/film-' + p.page + '-history.jpg" alt="" width="960" height="540" loading="lazy">'));
        var tx = el('div', 'vh-ptext');
        tx.appendChild(el('h4', 'vh-pname', '<a href="' + p.href + '">' + p.name + '</a>'));
        tx.appendChild(el('p', 'vh-pwhat', p.what));
        li.appendChild(tx);
        li.appendChild(el('p', 'vh-pdate', dateHtml(p.date)));
        hook(li, p.page, function () { return record(p); });
        opener(li, p);
        ul.appendChild(li);
      });
      gs.appendChild(ul); ws.appendChild(gs);
    });
    cv.appendChild(ws);

    /* the closing line */
    var bs = el('section', 'vh-close'); bs.appendChild(H.band); cv.appendChild(bs);
    cv.appendChild(sel);

    app.appendChild(cv); app.appendChild(insp);
    var wrap = el('div', 'wrap vh-wrap'); wrap.appendChild(app);
    main.replaceChildren(wrap);

    /* keyboard: up and down move the selection between objects while one has focus; Escape goes back to the claim */
    function focusObj(o) { var a = o.key === 'site' ? null : q('.vh-pname a', o.node); (a || o.node).focus(); }
    cv.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      if (e.target.closest('video, .vh-inline, button, details')) return;
      var i = -1; objs.forEach(function (o, j) { if (o.node.contains(e.target)) i = j; });
      if (i < 0) return;
      var j = Math.max(0, Math.min(objs.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)));
      e.preventDefault();
      if (j !== i) focusObj(objs[j]);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape' || e.defaultPrevented || !wide.matches) return;
      if (e.target.closest && e.target.closest('.look-pick, .look-menu')) return;
      if (!app.contains(e.target) && e.target !== d.body) return;
      select('site'); hero.focus();
    });

    var first = P.filter(function (p) { return p.starter; })[0];
    function place() {
      if (wide.matches) {
        if (site.parentNode !== box) { box.replaceChildren(); I.clear(); }
        curKey = null; select(first ? first.page : 'site');
      } else {
        /* phones: the hero's three figures stand in for the site record (no film box under the claim) */
        if (site.parentNode) site.remove(); I.clear(); box.replaceChildren(); curKey = null;
        objs.forEach(function (o) { o.node.classList.remove('vh-cur'); }); sel.hidden = true;
      }
    }
    place();
    onWide(place);
    stick(insp);
    if (W.ResizeObserver) new ResizeObserver(function () { frame(); }).observe(cv);
    addEventListener('resize', frame);
    /* the records' rules and tests arrive from their pages in the background, so the first point is instant */
    P.forEach(function (p) { if (!p.starter) fetchRec(p); });
  }

  /* ================================ case pages ================================ */
  function casePage(main) {
    var head = q(':scope > .case-head', main), log = q(':scope > .hx-log', main), brand = q('.topbar .brand');
    var BRAND = brand ? plain(brand.innerHTML.replace(/<span class="mark">.*?<\/span>/, '')).trim() : '';
    var app = el('div', 'vh-capp'), chead = el('header', 'vh-chead'), doc = el('div', 'vh-doc'), insp = el('aside', 'vh-insp vh-cinsp'), box = el('div', 'vh-insp-in');
    insp.setAttribute('aria-label', 'Project record'); insp.appendChild(box);
    if (head) { while (head.firstChild) chead.appendChild(head.firstChild); head.remove(); }
    var kicker = q('.kicker', chead), group = kicker ? runs(kicker)[0] : '';

    if (!log) {
      /* 404 (or any page without a changelog): the toolbar and an empty inspector, in the page's own words */
      var rec = el('div', 'vh-rec vh-empty');
      rec.appendChild(crumb([BRAND]));
      var h1 = q('h1', chead), links = el('p', 'vh-links'), back = q('.back', chead), mail = q('footer.site a[href^="mailto:"]');
      if (h1) rec.appendChild(el('p', 'vh-blank', h1.innerHTML));
      if (back) links.appendChild(back.cloneNode(true));
      if (mail) { links.appendChild(d.createTextNode(' ')); links.appendChild(mail.cloneNode(true)); }
      rec.appendChild(links); box.appendChild(rec);
      app.classList.add('vh-capp-empty');
      app.appendChild(chead); app.appendChild(insp);
      main.replaceChildren(app);
      return;
    }

    var dl = q('dl', log), when = q('.hx-when', log), now = logRow(dl, 'Now');
    var rec2 = el('div', 'vh-rec');
    rec2.appendChild(crumb([BRAND, group]));
    /* the film and its script: the inspector's media slot */
    var media = el('div', 'vh-media'), cf = q(':scope > .case-film', main), fsc = q(':scope > .film-script', main);
    if (cf) media.appendChild(cf); if (fsc) media.appendChild(fsc);
    rec2.appendChild(media);
    if (now) { rec2.appendChild(el('p', 'vh-result', q('dd', now).innerHTML)); }
    var rows = el('dl', 'vh-rows');
    ['My rules', 'AI wrote', 'I tested'].forEach(function (n) { var rw = logRow(dl, n); if (rw) rows.appendChild(rw); });
    var times = when ? qa('time', when) : [];
    if (times[0]) { var a1 = el('div'); a1.appendChild(el('dt', null, 'Added')); a1.appendChild(el('dd', null, times[0].outerHTML)); rows.appendChild(a1); }
    if (times[1]) { var a2 = el('div'); a2.appendChild(el('dt', null, 'Last changed')); a2.appendChild(el('dd', null, times[1].outerHTML)); rows.appendChild(a2); }
    rec2.appendChild(rows);
    var btns = qa('.repo-card a.btn', main);
    if (btns.length) {
      var lk = el('p', 'vh-links');
      btns.forEach(function (b, i) { var c = b.cloneNode(true); c.className = ''; if (i) lk.appendChild(d.createTextNode(' ')); lk.appendChild(c); });
      rec2.appendChild(lk);
    }
    box.appendChild(rec2);

    /* the document: Problem and Built (the rest of the changelog, as written) first, then the write-up */
    var intro = el('dl', 'vh-brief');
    ['Problem', 'Built'].forEach(function (n) { var rw = logRow(dl, n); if (rw) intro.appendChild(rw); });
    if (intro.children.length) doc.appendChild(intro);
    log.remove();
    var toc = q(':scope > .case-toc', main);
    [].slice.call(main.children).forEach(function (c) { if (c !== toc) doc.appendChild(c); });

    /* "On this page" (site.js builds it and marks the section in view): last in the inspector; on phones folded under a
       button with the list's own heading */
    var fold = el('div', 'vh-toc'), tb = el('button', 'vh-toc-btn', toc ? q('p', toc).textContent : '');
    tb.type = 'button'; tb.setAttribute('aria-expanded', 'false'); fold.appendChild(tb);
    tb.addEventListener('click', function () {
      var open = toc.hidden; toc.hidden = !open; tb.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) dispatchEvent(new Event('scroll'));
    });
    function placeToc() {
      if (!toc) return;
      if (wide.matches) { toc.hidden = false; box.appendChild(toc); fold.remove(); }
      else { toc.hidden = true; tb.setAttribute('aria-expanded', 'false'); fold.appendChild(toc); box.appendChild(fold); }
    }
    placeToc(); onWide(placeToc);

    app.appendChild(chead); app.appendChild(insp); app.appendChild(doc);
    main.replaceChildren(app);
    stick(insp);
  }
})();
