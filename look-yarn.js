/* Yarn & Felt: the moving extras that need a script (liveliness pass, Nov 20 2026). style.css draws the look and
   site.js already sews the seams, lays the opening guide and draws the margin thread; this file adds only the parts
   that follow the reader (scroll, pointer, press, selection, keyboard focus). site.js fetches it only while the page
   wears the default look (no data-look attribute) and the visitor has not asked for reduced motion. It switches
   itself on only while <html> has no data-look and carries .motion, puts .y-live on the root, and takes away
   everything it added (listeners, elements, classes, properties, animations) the moment either goes: the look
   picker, "Pause motion", or a reduced-motion change. Every rule it needs in style.css is gated on
   html:not([data-look]).motion.y-live, so without this script the look is exactly as before.
   Colours are the look's own tokens (raspberry yarn, felt colours, seam threads, shade); nothing it adds takes a tap.

   Rules it keeps (the "guardrails"):
   - one moving accent on screen at a time: ambient ones (drifting fibres, the settle tug) wait while one the reader
     caused (a dimple, a pin-prick, a wrapped figure) is showing, and are cleared by it;
   - scroll-driven movement stops when the scroll stops (the thread's slack loop settles once, then is still);
   - passive listeners, one requestAnimationFrame per frame at most, nothing while the tab is hidden. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__yarnLive || !d.addEventListener || !W.requestAnimationFrame) return;
  W.__yarnLive = 1;
  var NS = 'http://www.w3.org/2000/svg';
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  var mqSmall = matchMedia('(pointer: coarse), (max-width: 620px)');
  var SDA = !!(W.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var live = false, offs = [], made = [], styled = [], timers = [], anims = [];
  var PROPS = ['--y-t', '--y-p', '--y-film-y', '--y-lift', '--y-str'];

  function wanted() { return !r.hasAttribute('data-look') && r.classList.contains('motion') && !mqReduce.matches; }
  function on(t, type, fn, opt) { t.addEventListener(type, fn, opt); offs.push(function () { t.removeEventListener(type, fn, opt); }); }
  function mk(tag, cls, parent, before) {
    var e = d.createElement(tag); e.className = cls; e.setAttribute('aria-hidden', 'true');
    if (parent) parent.insertBefore(e, before || null);
    made.push(e); return e;
  }
  function svg(tag, cls, parent) { var e = d.createElementNS(NS, tag); if (cls) e.setAttribute('class', cls); if (parent) parent.appendChild(e); return e; }
  function prop(el, k, v) { el.style.setProperty(k, v); if (styled.indexOf(el) < 0) styled.push(el); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function now() { return performance.now(); }
  function drop(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }
  function anim(el, kf, opt) { // a Web Animation that stop() cancels
    if (!el || !el.animate) return null;
    var a; try { a = el.animate(kf, opt); } catch (e) { return null; }
    anims.push(a); a.onfinish = a.oncancel = function () { var i = anims.indexOf(a); if (i >= 0) anims.splice(i, 1); };
    return a;
  }

  /* ---------- 15. one moving accent at a time ---------- */
  var acc = { name: '', until: 0 };
  function ambientFree() { return now() > acc.until; }
  function claim(name, ms) { acc.name = name; acc.until = now() + ms; clearFlecks(); }

  /* ---------- the scroll frame: one rAF per frame while scrolling, nothing at rest ---------- */
  var raf = 0, sy = 0, psy = 0, pt = 0, speed = 0, idleT = 0, scrolling = false;
  function onScroll() { if (!raf && !d.hidden) raf = requestAnimationFrame(frame); }
  function frame(t) {
    raf = 0;
    sy = W.scrollY || 0;
    var dt = Math.max(8, t - (pt || t - 16)), v = Math.abs(sy - psy) / dt;
    speed = speed * .5 + v * .5;
    var dir = sy > psy ? 1 : sy < psy ? -1 : 0;
    psy = sy; pt = t;
    if (!scrolling && dir) { scrolling = true; slackIn(); }
    tension(false);
    if (!SDA) scrub();
    hero();
    if (dir) boundary(dir);
    clearTimeout(idleT); idleT = setTimeout(rest, 150); // (not later(): one timer a frame would pile up in its list)
  }
  function rest() { scrolling = false; speed = 0; pt = 0; tension(true); slackOut(); settle(); }

  /* ---------- 1. the margin strand: tension follows the scroll ----------
     site.js draws the plied strand (.th-line with its .y-edge and .y-sh) down to the reading line. Here a fast scroll
     pulls it taut: the strand, its edge and its shadow thin (--y-t, 0 slack to 1 taut, eased). When the scroll stops
     the spare yarn past the button relaxes into a soft slack loop hanging down the margin lane, which drops, bounces
     once and is still; the next scroll pulls it back in. */
  var T = null;
  function threadSetup() {
    var th = d.querySelector('main > .thread'); if (!th) return;
    var line = th.querySelector('.th-line'), head = th.querySelector('.th-head');
    if (!line || !head) return;
    var s = svg('svg', 'y-slack'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false');
    // the loop hangs from the button: down and round, about 18 px wide and 30 px deep (inside the 18 px phone margin, scaled)
    var dd = 'M0 0C-8 9 -10 22 -2 28C6 33 10 22 4 14C1 10 -2 9 -4 10';
    svg('path', 'y-sl-sh', s).setAttribute('d', dd); svg('path', 'y-sl-edge', s).setAttribute('d', dd); svg('path', 'y-sl-yarn', s).setAttribute('d', dd);
    th.insertBefore(s, head); made.push(s);
    T = { th: th, line: line, head: head, slack: s, cur: 0, shown: false };
    prop(th, '--y-t', '0');
  }
  function tension(stopped) {
    if (!T) return;
    // a slow read leaves it slack; 0.3 px/ms and up starts to pull; 2.5 px/ms and up is fully taut
    var target = stopped ? 0 : clamp((speed - .3) / 2.2, 0, 1);
    T.cur += (target - T.cur) * (stopped ? 1 : .35);
    if (T.cur < .01) T.cur = 0;
    prop(T.th, '--y-t', T.cur.toFixed(3));
  }
  function headPoint() {
    var drawn = parseFloat(T.line.style.strokeDasharray) || 0;
    if (drawn < 24 || !T.th.classList.contains('live') || getComputedStyle(T.th).display === 'none') return null;
    try { return T.line.getPointAtLength(drawn); } catch (e) { return null; }
  }
  function slackPlace() { // true when there is a drawn strand to hang the loop from
    var p = headPoint(); if (!p) { T.slack.classList.remove('y-on'); T.shown = false; return false; }
    var s = T.slack;
    s.style.left = p.x.toFixed(1) + 'px'; s.style.top = p.y.toFixed(1) + 'px'; s.style.transform = 'scale(' + (mqSmall.matches ? .62 : 1) + ')';
    return true;
  }
  function slackOut() {
    if (!T || !slackPlace()) return;
    var s = T.slack;
    s.classList.add('y-on'); T.shown = true;
    // drops, overshoots, bounces back once, then is still
    anim(s, [{ scale: '1 0', opacity: 0 }, { scale: '1 1.16', opacity: 1, offset: .42 }, { scale: '1 .9', offset: .66 }, { scale: '1 1.04', offset: .84 }, { scale: '1 1', opacity: 1 }],
      { duration: 720, easing: 'ease-out' });
  }
  function slackIn() {
    if (!T || !T.shown) return;
    T.shown = false;
    var s = T.slack, a = anim(s, [{ scale: '1 1', opacity: 1 }, { scale: '1 0', opacity: 0 }], { duration: 140, easing: 'ease-in' });
    if (a) a.onfinish = function () { if (!T || !T.shown) s.classList.remove('y-on'); var i = anims.indexOf(a); if (i >= 0) anims.splice(i, 1); };
    else s.classList.remove('y-on');
  }

  /* ---------- 2 and 14 without scroll timelines: the same scrub, read from scroll position once a frame ---------- */
  var scrubs = [];
  function scrubSetup() {
    if (SDA) return;
    r.classList.add('y-sjs');
    scrubs = [].map.call(d.querySelectorAll('main .section-head h2, main .group-h, main .prose > h2, .bars .row, .minis tr'), function (el) {
      // the place in the page from layout offsets (as a view timeline reads it), so an entrance in mid-flight cannot shift it
      var y = 0, e = el; while (e) { y += e.offsetTop; e = e.offsetParent; }
      return { el: el, bar: el.matches('.row, tr'), y: y, h: el.offsetHeight };
    });
    scrub();
  }
  function scrub() {
    var vh = innerHeight;
    for (var i = 0; i < scrubs.length; i++) {
      var s = scrubs[i], top = s.y - (W.scrollY || 0), q = { top: top, bottom: top + s.h, height: s.h };
      // a seam is sewn between its foot entering the window and its middle reaching the middle; beads until 60% up
      var p = s.bar ? clamp((vh - q.top) / (vh * .4 + q.height), 0, 1) : clamp((vh - q.bottom) / (vh * .5 - q.height / 2), 0, 1);
      if (s.p !== p) { s.p = p; prop(s.el, '--y-p', p.toFixed(3)); }
    }
  }

  /* ---------- 3. the opening: parallax as it scrolls away ----------
     Three layers at three depths: the quilted cloth stays with the page; the film's felt patch is nearer, so it rises
     a little faster and its shadow deepens as it lifts off the cloth; the yarn under the headline slides along its
     own length, as if pulled through. Moves only while the opening scrolls away; at the top all is as before. */
  var H = null;
  function heroSetup() {
    var hs = d.querySelector('main .lead-hero'), film = hs && hs.querySelector('.hero-film'), h1 = hs && hs.querySelector('h1');
    if (!film || !h1) return;
    H = { one: hs.querySelector('.hero-one') || hs, film: film, h1: h1, last: -1, k: 0, b: 1 };
    hero();
  }
  function hero() {
    if (!H) return;
    if (H.last < 0) { // measured once, and again on resize: how far the patch may rise before it meets the headline
      var off = parseFloat(H.one.style.getPropertyValue('--y-film-y')) || 0, f = H.film.getBoundingClientRect(), h = H.h1.getBoundingClientRect();
      H.k = clamp(f.top - off - h.bottom - 6, 0, mqSmall.matches ? 10 : 18);
      H.b = Math.max(200, f.bottom - off + (W.scrollY || 0));
    }
    var p = clamp((W.scrollY || 0) / H.b, 0, 1);
    if (Math.abs(p - H.last) < .002) return;
    H.last = p;
    prop(H.one, '--y-film-y', (-p * H.k).toFixed(2) + 'px'); // the near patch rises faster than the page
    prop(H.one, '--y-lift', p.toFixed(3));                   // and lifts off the cloth (deeper shadow)
    prop(H.one, '--y-str', (p * 46).toFixed(1) + 'px');      // the headline's yarn slides along its length
  }

  /* ---------- 4. a stray fibre or felt fleck drifts past the margin when a section boundary is crossed ---------- */
  var bounds = [], cur = -1, flecks = [], lastFleck = 0, fleckN = 0;
  var FELTS = ['--y-pink', '--y-blue', '--y-yellow', '--y-green'];
  function boundsSetup() { bounds = [].slice.call(d.querySelectorAll('main > section, main .group, main .band, main .prose > h2, main .figure')); cur = index(); }
  function index() {
    var line = innerHeight * .45, k = -1;
    for (var i = 0; i < bounds.length; i++) if (bounds[i].getBoundingClientRect().top < line) k = i;
    return k;
  }
  function boundary(dir) {
    var k = index(); if (k === cur) return;
    cur = k;
    if (!ambientFree() || flecks.length >= 2 || now() - lastFleck < 500) return;
    lastFleck = now();
    var col = d.querySelector('main .wrap, main .prose') || d.querySelector('main'), left = col ? col.getBoundingClientRect().left : 20;
    var x = clamp(left - 30 + Math.random() * 12, 2, Math.max(2, left - 14)), vh = innerHeight;
    var fibre = fleckN++ % 2 === 0, f = mk('i', fibre ? 'y-fleck y-fibre' : 'y-fleck', d.body);
    if (!fibre) f.style.setProperty('--y-felt', 'var(' + FELTS[fleckN % 4] + ')');
    f.style.left = x.toFixed(0) + 'px';
    flecks.push(f);
    // light as fluff: it floats along with the scroll's direction, turning over slowly and swaying side to side
    var y0 = dir > 0 ? -20 : vh + 20, y1 = dir > 0 ? vh + 20 : -20, sw = 8 + Math.random() * 8, sp = mqSmall.matches ? 1.25 : 1;
    var a = anim(f, [
      { transform: 'translate(0,' + y0 + 'px) rotate(0deg)', opacity: 0 },
      { transform: 'translate(' + sw + 'px,' + (y0 + (y1 - y0) * .3) + 'px) rotate(70deg)', opacity: .9, offset: .22 },
      { transform: 'translate(' + (-sw * .5) + 'px,' + (y0 + (y1 - y0) * .66) + 'px) rotate(150deg)', opacity: .9, offset: .66 },
      { transform: 'translate(' + (sw * .4) + 'px,' + y1 + 'px) rotate(230deg)', opacity: 0 }
    ], { duration: (3200 + Math.random() * 600) * sp, easing: 'linear', fill: 'both' });
    if (a) a.onfinish = function () { killFleck(f); var i = anims.indexOf(a); if (i >= 0) anims.splice(i, 1); };
    else later(function () { killFleck(f); }, 100);
  }
  function forget(e) { drop(e); var i = made.indexOf(e); if (i >= 0) made.splice(i, 1); }
  function killFleck(f) { var i = flecks.indexOf(f); if (i >= 0) flecks.splice(i, 1); forget(f); }
  function clearFlecks() { flecks.slice().forEach(killFleck); }

  /* ---------- 5. scroll stops: the nearest heading's stitch line pulls tight, once ---------- */
  var tugged = null;
  function settle() {
    if (!ambientFree()) return;
    var hs = d.querySelectorAll('main .section-head h2, main .group-h, main .prose > h2'), line = innerHeight * .45, best = null, bd = 1e9;
    for (var i = 0; i < hs.length; i++) {
      var q = hs[i].getBoundingClientRect();
      if (q.bottom < 60 || q.top > innerHeight) continue;
      var dd = Math.abs((q.top + q.bottom) / 2 - line); if (dd < bd) { bd = dd; best = hs[i]; }
    }
    if (!best || best === tugged) return;
    if (tugged) tugged.classList.remove('y-tug');
    tugged = best; best.classList.add('y-tug');
    // the stitch rows draw in a little and spring back: thread pulled tight through the cloth
    anim(best, [{ transform: 'none' }, { transform: 'scaleX(.955)', offset: .35 }, { transform: 'scaleX(1.012)', offset: .7 }, { transform: 'none' }],
      { duration: 620, easing: 'ease-out', pseudoElement: '::after' });
  }

  /* ---------- 6, 7, 9, 12, 14: presses and taps ---------- */
  var down = null;
  var FIG = '.fact b, .bigfig b, .card .stat b';
  var PRESS = '.btn, .groupnav a, .pager a, .theme-toggle, .demo-poster .play, .vid-sound, .vid-toggle';
  function puffOff() { var s = d.querySelectorAll('.y-puff'); for (var i = 0; i < s.length; i++) s[i].classList.remove('y-puff'); }
  function onDown(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t) return;
    down = { x: e.clientX, y: e.clientY, t: now(), type: e.pointerType };
    if (e.pointerType !== 'mouse') { // 6: on touch the patch puffs while the finger is down
      var c = t.closest('.card, .pager a'); if (c) c.classList.add('y-puff');
    }
    var b = t.closest(PRESS); if (b) sink(b);   // 7
  }
  function onUp(e) {
    puffOff(); unsink();
    var dn = down; down = null;
    if (!dn || e.pointerType === 'mouse' || Math.hypot(e.clientX - dn.x, e.clientY - dn.y) > 10 || now() - dn.t > 600) return;
    var t = e.target && e.target.closest ? e.target : null;
    var fig = t && t.closest(FIG), row = t && t.closest('.bars .row');
    if (fig) wrapFig(fig, 1800);                    // 12
    if (row) tag(row, 1800);                        // 14
    if (!fig) pin(e.clientX, e.clientY);            // 9 (a figure's yarn loop is the answer to that tap)
  }
  function onKeyClick(e) { if (e.detail === 0 && e.target.closest) { var b = e.target.closest(PRESS); if (b) { sink(b); later(unsink, 220); } } }
  // 7: a sewing-button press: the patch sinks into the cloth, the yarn loop round it is pulled taut, and the cloth
  // keeps a dimple where it was pressed for a moment after it springs back
  var sunk = null;
  function sink(el) {
    unsink();
    sunk = el; el.classList.add('y-sink');
    claim('dimple', 1000);
    var q = el.getBoundingClientRect(), p = mk('i', 'y-dimple', d.body), pad = 10;
    p.style.cssText = 'left:' + (q.left + (W.scrollX || 0) - pad).toFixed(1) + 'px;top:' + (q.top + (W.scrollY || 0) - pad).toFixed(1) + 'px;width:' + (q.width + 2 * pad).toFixed(1) + 'px;height:' + (q.height + 2 * pad).toFixed(1) + 'px';
    later(function () { forget(p); }, 1150);
  }
  function unsink() { if (sunk) { var s = sunk; sunk = null; later(function () { s.classList.remove('y-sink'); }, 90); } }
  // 9: a pin-prick where a finger taps: the linen puckers round a tiny hole and relaxes
  var lastPin = null;
  function pin(x, y) {
    claim('pin', 700);
    forget(lastPin);
    var p = lastPin = mk('i', 'y-pin', d.body);
    p.style.left = x.toFixed(0) + 'px'; p.style.top = y.toFixed(0) + 'px';
    later(function () { forget(p); if (lastPin === p) lastPin = null; }, 800);
  }
  // 12: a loop of yarn wound round the leading number of a big figure (the "13.7" of "13.7 -> 37.5")
  function wrapFig(el, ms) {
    var rg = d.createRange(), w = d.createTreeWalker(el, 4), n, m;
    rg.selectNodeContents(el);
    while ((n = w.nextNode())) { m = /[$£]?\d[\d.,: ]*\s?(%|k|x|×)?/.exec(n.nodeValue); if (m) { rg.setStart(n, m.index); rg.setEnd(n, m.index + m[0].replace(/\s+$/, '').length); break; } }
    var q = rg.getBoundingClientRect(), e = el.getBoundingClientRect(), fs = parseFloat(getComputedStyle(el).fontSize) || 24;
    if (!q.width) q = e;
    // an oval 1.36 lines tall round the number's middle, wide enough to clear its ends, wound one and a quarter times
    var Hh = Math.max(q.height * .9, fs) * 1.36, Wd = Math.min(Math.max(Hh, q.width + fs * .95), q.width + fs * 2.4), cx = q.left - e.left + q.width / 2, cy = q.top - e.top + q.height * .5;
    var sv = el.querySelector(':scope > .y-wrap');
    if (!sv) {
      sv = svg('svg', 'y-wrap'); sv.setAttribute('aria-hidden', 'true'); sv.setAttribute('focusable', 'false');
      svg('path', 'y-wr-edge', sv); svg('path', 'y-wr-yarn', sv);
      el.appendChild(sv); made.push(sv); el.classList.add('y-wraphost');
    }
    var pts = [], i, a, k, rx, ry, N = 56, pad = 8;
    for (i = 0; i <= N; i++) { // a slightly growing spiral, so the second pass sits just outside the first
      k = i / N; a = -1.9 + k * Math.PI * 2 * 1.22;
      rx = Wd / 2 * (.95 + .1 * k); ry = Hh / 2 * (.93 + .12 * k);
      pts.push((Wd / 2 + pad + rx * Math.cos(a)).toFixed(1) + ' ' + (Hh / 2 + pad + ry * Math.sin(a) + 1.5 * Math.sin(a * 3)).toFixed(1));
    }
    var dd = 'M' + pts.join('L');
    [].forEach.call(sv.querySelectorAll('path'), function (p) { p.setAttribute('d', dd); p.setAttribute('pathLength', '1'); });
    sv.setAttribute('width', (Wd + 2 * pad).toFixed(1)); sv.setAttribute('height', (Hh + 2 * pad).toFixed(1));
    sv.style.left = (cx - Wd / 2 - pad).toFixed(1) + 'px'; sv.style.top = (cy - Hh / 2 - pad).toFixed(1) + 'px';
    claim('wrap', 600);
    el.classList.remove('y-wound'); void sv.getBoundingClientRect(); el.classList.add('y-wound');
    if (el.__yT) clearTimeout(el.__yT);
    if (ms) el.__yT = later(function () { el.classList.remove('y-wound'); }, ms);
  }
  // 14: a bar's value shown on a little felt tag
  function tag(row, ms) { row.classList.add('y-tag'); if (ms) later(function () { row.classList.remove('y-tag'); }, ms); }

  /* ---------- 8 (link stitch from the side the pointer came in), 12 and 14 on hover, 10 the needle cursor ---------- */
  var LINKS = ':is(.hero-sub, footer.site, .prose, .lede, .hero-mail, .case-part) a';
  function onOver(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return;
    var a = t.closest(LINKS);
    if (a && !(e.relatedTarget && a.contains(e.relatedTarget))) {
      var rs = a.getClientRects(), q = rs[0];
      for (var i = 0; i < rs.length; i++) if (e.clientY >= rs[i].top && e.clientY <= rs[i].bottom) { q = rs[i]; break; }
      if (q) a.setAttribute('data-y-from', e.clientX > q.left + q.width / 2 ? 'r' : 'l');
    }
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) wrapFig(f, 0);
    var row = t.closest('.bars .row');
    if (row && !(e.relatedTarget && row.contains(e.relatedTarget))) tag(row, 0);
  }
  function onOut(e) {
    var t = e.target && e.target.closest ? e.target : null; if (!t || e.pointerType !== 'mouse') return; // a finger "leaves" on lift
    var f = t.closest(FIG);
    if (f && !(e.relatedTarget && f.contains(e.relatedTarget))) f.classList.remove('y-wound');
    var row = t.closest('.bars .row');
    if (row && !(e.relatedTarget && row.contains(e.relatedTarget))) row.classList.remove('y-tag');
  }
  var TIP = null;
  function tipSetup() {
    if (!mqFine.matches) return;
    TIP = { el: mk('i', 'y-needle', d.body), x: -99, y: -99, vx: 0, vy: 0, t: 0, len: 0, ang: 0, raf: 0, shown: false };
    TIP.el.appendChild(d.createElement('b'));
    r.classList.add('y-needle-on');
  }
  function tipMove(e) {
    if (!TIP || e.pointerType !== 'mouse') return;
    var t = now(), dt = Math.max(4, t - (TIP.t || t - 16)), x = e.clientX, y = e.clientY;
    if (TIP.shown) { TIP.vx = TIP.vx * .4 + (x - TIP.x) / dt * .6; TIP.vy = TIP.vy * .4 + (y - TIP.y) / dt * .6; }
    TIP.x = x; TIP.y = y; TIP.t = t;
    TIP.el.style.transform = 'translate(' + x + 'px,' + y + 'px)'; // set here, not a frame later: the point sits on the hit point
    var tg = e.target && e.target.closest ? e.target : null;
    var text = tg && tg.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]');
    var link = !text && tg && tg.closest('a[href], button, summary, label, [role="button"], .look-pick-btn');
    TIP.el.classList.toggle('y-link', !!link);
    TIP.el.classList.toggle('y-off', !!text);
    if (!TIP.shown) { TIP.shown = true; TIP.el.classList.add('y-on'); }
    if (!TIP.raf) TIP.raf = requestAnimationFrame(tipTail);
  }
  function tipTail() { // a short length of thread trails from the needle's eye when it moves fast, and is drawn back in
    TIP.raf = 0;
    var sp = Math.hypot(TIP.vx, TIP.vy), want = clamp((sp - .5) * 14, 0, 30);
    TIP.len = want > TIP.len ? TIP.len + (want - TIP.len) * .6 : TIP.len * .72;
    if (sp > .2) TIP.ang = Math.atan2(-TIP.vy, -TIP.vx) * 180 / Math.PI;
    TIP.vx *= .7; TIP.vy *= .7;
    TIP.el.style.setProperty('--tl', TIP.len.toFixed(1) + 'px');
    TIP.el.style.setProperty('--ta', TIP.ang.toFixed(0) + 'deg');
    if (TIP.len > .4 || sp > .05) TIP.raf = requestAnimationFrame(tipTail);
    else TIP.el.style.setProperty('--tl', '0px');
  }
  function tipLeave(e) { if (TIP && !e.relatedTarget) { TIP.shown = false; TIP.el.classList.remove('y-on'); } }

  /* ---------- 11. a selection in body text sits on a strip of felt with a blanket-stitched edge ---------- */
  var SELHOST = '.prose, .lede, .hero-sub, .hero h1, .card .body, .fact, .band, .principle';
  var SEL = null, selRaf = 0;
  function onSel() { if (!selRaf) selRaf = requestAnimationFrame(paintSel); }
  function clearSel() { if (SEL) { drop(SEL.box); var i = made.indexOf(SEL.box); if (i >= 0) made.splice(i, 1); SEL.host.classList.remove('y-selhost'); SEL = null; } }
  function paintSel() {
    selRaf = 0;
    var s = W.getSelection && getSelection();
    if (!s || s.isCollapsed || !s.rangeCount) { clearSel(); return; }
    var rg = s.getRangeAt(0), anc = rg.commonAncestorContainer, el = anc.nodeType === 1 ? anc : anc.parentNode;
    var host = el && el.closest && el.closest(SELHOST);
    if (!host) { // a range that spans blocks: strip within the host of its start, if both ends share one
      var a = rg.startContainer, b = rg.endContainer;
      a = (a.nodeType === 1 ? a : a.parentNode).closest(SELHOST); b = (b.nodeType === 1 ? b : b.parentNode).closest(SELHOST);
      host = a && a === b ? a : null;
    }
    if (!host) { clearSel(); return; }
    if (!SEL || SEL.host !== host) { clearSel(); SEL = { host: host, box: mk('span', 'y-sel', host) }; host.classList.add('y-selhost'); }
    var hr = SEL.box.getBoundingClientRect(), rs = rg.getClientRects(), lines = [], i, q, l;
    for (i = 0; i < rs.length; i++) { // merge the range's boxes into one per line
      q = rs[i]; if (q.width < 1 || q.height < 1) continue;
      l = lines[lines.length - 1];
      if (l && Math.abs(l.t - q.top) < q.height * .5) { l.l = Math.min(l.l, q.left); l.r = Math.max(l.r, q.right); l.b = Math.max(l.b, q.bottom); }
      else lines.push({ l: q.left, r: q.right, t: q.top, b: q.bottom });
    }
    var html = '';
    for (i = 0; i < lines.length && i < 80; i++) {
      l = lines[i];
      html += '<i style="left:' + (l.l - hr.left - 4).toFixed(1) + 'px;top:' + (l.t - hr.top - 1).toFixed(1) + 'px;width:' + (l.r - l.l + 8).toFixed(1) + 'px;height:' + Math.max(6, l.b - l.t + 2).toFixed(1) + 'px"></i>';
    }
    SEL.box.innerHTML = html;
  }

  /* ---------- 13. keyboard focus: a running stitch sewn round the ring ----------
     The look's 3 px ink outline stays exactly as it is (so contrast is unchanged); a raspberry running stitch is
     sewn round it, 4 px outside. Patches that already show focus with their yarn loop (.loop) are left to it. */
  var FOC = null, focRaf = 0, focEl = null;
  function onFocusIn(e) {
    var el = e.target; if (!el || el === d || !el.matches) return;
    var vis = false; try { vis = el.matches(':focus-visible'); } catch (er) {}
    if (!vis || el.querySelector(':scope > .loop') || el.matches('input, textarea, select')) { focusOff(); return; }
    focEl = el;
    if (!FOC) FOC = mk('i', 'y-focus', d.body);
    FOC.classList.remove('y-on'); void FOC.offsetWidth; // sewn round again for each new stop
    placeFocus();
  }
  function focusOff() { focEl = null; if (FOC) FOC.classList.remove('y-on'); }
  function placeFocus() {
    focRaf = 0;
    if (!focEl || !FOC) return;
    if (!d.contains(focEl) || d.activeElement !== focEl) { focusOff(); return; }
    var q = focEl.getBoundingClientRect(), cs = getComputedStyle(focEl), off = parseFloat(cs.outlineOffset) || 0, ow = parseFloat(cs.outlineWidth) || 0;
    var pad = Math.max(0, off) + ow + 4, rad = (parseFloat(cs.borderTopLeftRadius) || 6) + pad;
    FOC.classList.add('y-on');
    FOC.style.cssText = 'left:' + (q.left - pad).toFixed(1) + 'px;top:' + (q.top - pad).toFixed(1) + 'px;width:' + (q.width + 2 * pad).toFixed(1) + 'px;height:' + (q.height + 2 * pad).toFixed(1) + 'px;border-radius:' + Math.min(rad, (q.height + 2 * pad) / 2).toFixed(1) + 'px';
  }
  function focusFollow() { if (focEl && !focRaf) focRaf = requestAnimationFrame(placeFocus); }

  /* ---------- on, off ---------- */
  function relay() { boundsSetup(); if (!SDA) scrubSetup(); if (H) { H.last = -1; hero(); } if (SEL) onSel(); focusFollow(); if (T && T.shown) slackPlace(); } // (moved, not bounced again)
  function start() {
    live = true;
    r.classList.add('y-live');
    sy = psy = W.scrollY || 0;
    if (mqFine.matches) r.classList.add('y-fine');
    threadSetup(); scrubSetup(); heroSetup(); boundsSetup(); tipSetup();
    on(W, 'scroll', onScroll, { passive: true });
    on(W, 'scroll', focusFollow, { passive: true });
    on(W, 'resize', relay, { passive: true });
    on(W, 'load', relay);
    on(d, 'pointerdown', onDown, { passive: true });
    on(d, 'pointerup', onUp, { passive: true });
    on(d, 'pointercancel', function () { puffOff(); unsink(); down = null; }, { passive: true });
    on(d, 'touchstart', function () {}, { passive: true }); // lets iOS apply :active on tap
    on(d, 'click', onKeyClick, true);
    on(d, 'pointerover', onOver, { passive: true });
    on(d, 'pointerout', onOut, { passive: true });
    if (TIP) { on(d, 'pointermove', tipMove, { passive: true }); on(d, 'mouseout', tipLeave, { passive: true }); }
    on(d, 'selectionchange', onSel);
    on(d, 'focusin', onFocusIn);
    on(d, 'focusout', function () { setTimeout(function () { if (d.activeElement !== focEl) focusOff(); }, 0); });
    on(d, 'visibilitychange', function () { if (d.hidden) { cancelAnimationFrame(raf); raf = 0; clearFlecks(); if (TIP) TIP.el.classList.remove('y-on'); } });
    if (W.ResizeObserver && d.querySelector('main')) { var ro = new ResizeObserver(function () { if (!scrolling) relay(); }); ro.observe(d.querySelector('main')); offs.push(function () { ro.disconnect(); }); }
  }
  function stop() {
    live = false;
    offs.forEach(function (f) { f(); }); offs = [];
    timers.forEach(clearTimeout); timers = []; clearTimeout(idleT);
    cancelAnimationFrame(raf); raf = 0; cancelAnimationFrame(selRaf); selRaf = 0; cancelAnimationFrame(focRaf); focRaf = 0;
    if (TIP && TIP.raf) cancelAnimationFrame(TIP.raf);
    clearFlecks(); clearSel();
    anims.slice().forEach(function (a) { try { a.cancel(); } catch (e) {} }); anims = [];
    made.forEach(drop); made = [];
    styled.forEach(function (el) { PROPS.forEach(function (k) { el.style.removeProperty(k); }); }); styled = [];
    [].forEach.call(d.querySelectorAll('.y-tug, .y-puff, .y-sink, .y-tag, .y-wound, .y-wraphost, .y-selhost'), function (e) { e.classList.remove('y-tug', 'y-puff', 'y-sink', 'y-tag', 'y-wound', 'y-wraphost', 'y-selhost'); });
    [].forEach.call(d.querySelectorAll('[data-y-from]'), function (e) { e.removeAttribute('data-y-from'); });
    r.classList.remove('y-live', 'y-sjs', 'y-fine', 'y-needle-on');
    T = H = TIP = FOC = SEL = null; focEl = null; tugged = null; sunk = null; lastPin = null; scrubs = []; bounds = []; flecks = []; down = null; scrolling = false; speed = 0;
  }
  function sync() {
    var w = wanted();
    if (w && !live) start(); else if (!w && live) stop();
  }
  new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-look', 'class', 'data-motion'] });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', sync);
  W.__yarnAccent = { free: ambientFree, claim: claim }; // the material block below asks before it moves anything
  W.__yarnLiveState = function () { return { live: live, sda: SDA, made: made.length, listeners: offs.length, anims: anims.length, flecks: flecks.length, accent: acc.name }; };
  sync();
})();

/* ===== Yarn & Felt material (Nov 20 2026): the cloth itself =====
   style.css (section "Yarn & Felt material") draws the static parts: fibres, slubbed linen, embroidered headings,
   reverse stitching, pinked panels, the woven label and the linen scrim over captures. This block adds what needs a
   script, in two layers:
   - while the default look is worn (no data-look), motion on or paused: .y-mat on the root, merit patches (7) and a
     capture cleared by being centred on a touch screen (9);
   - only while motion is on as well: a fresh-sewn patch pressed flat (1) and the nap sheen spans (6).
   A look change removes everything; "Pause motion" removes the moving layer. Merit patches are stored in
   localStorage["rw-yarn-patches:<path>"] (a list of section numbers) and nothing else; no network. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__yarnMat || !d.addEventListener) return;
  W.__yarnMat = 1;
  var NS = 'http://www.w3.org/2000/svg';
  var mqReduce = matchMedia('(prefers-reduced-motion: reduce)');
  var mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  var mqSmall = matchMedia('(pointer: coarse), (max-width: 620px)');
  var SDA = !!(W.CSS && CSS.supports && CSS.supports('animation-timeline: view()'));
  var FELT = '.card, .principle, .band, .band3 > div', COTTON = '.fact, .chart-card, .repo-card, .readme';
  var CAPS = '.shot, .thumb-wrap';
  var mat = false, mov = false, offs = [], moffs = [], made = [], mmade = [], anims = [], timers = [];
  var KEY = 'rw-yarn-patches:' + location.pathname;

  function wantMat() { return !r.hasAttribute('data-look'); }
  function wantMov() { return wantMat() && r.classList.contains('motion') && !mqReduce.matches; }
  function on(list, t, type, fn, opt) { t.addEventListener(type, fn, opt); list.push(function () { t.removeEventListener(type, fn, opt); }); }
  function later(fn, ms) { var t = setTimeout(fn, ms); timers.push(t); return t; }
  function drop(e) { if (e && e.parentNode) e.parentNode.removeChild(e); }
  function free() { return !W.__yarnAccent || !r.classList.contains('y-live') || W.__yarnAccent.free(); }
  function claim(n, ms) { if (W.__yarnAccent && r.classList.contains('y-live')) W.__yarnAccent.claim(n, ms); }
  function anim(el, kf, opt) {
    if (!el || !el.animate) return null;
    var a; try { a = el.animate(kf, opt); } catch (e) { return null; }
    anims.push(a); a.onfinish = a.oncancel = function () { var i = anims.indexOf(a); if (i >= 0) anims.splice(i, 1); };
    return a;
  }
  function onScreen(b) { return b.bottom > 0 && b.top < innerHeight; }

  /* ---------- 7. merit patches ----------
     A section runs from one big heading to the next (the last one to the footer). It counts as read once its heading
     has been on screen and its end has passed the middle of the window (or the page is scrolled to the bottom). It is
     kept at once; its patch is stitched on one at a time, and only animated if it is on screen with motion on. */
  var heads = [], seen = [], got = [], marks = {}, queue = [], qT = 0, chk = 0;
  function load() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (n) { return n === (n | 0); }) : []; } catch (e) { return []; } }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(got)); } catch (e) {} }
  var FELTS = [['--y-yellow', '--s-yellow'], ['--y-blue', '--s-blue'], ['--y-green', '--s-green'], ['--y-pink', '--s-pink']];
  var SHAPES = [ // [felt outline, stitch line inside it, mark]: no words; one carries the RW monogram
    ['<circle cx="16" cy="16" r="14"/>', '<circle cx="16" cy="16" r="11.3"/>', '<path class="ym-mk" d="M9 21V11h3.4a2.7 2.7 0 0 1 0 5.4H9M12.2 16.4l2.9 4.6M15.9 11l1.4 10 1.8-6.4 1.8 6.4 1.4-10"/>'],
    ['<path d="M16 2l12.1 7v14L16 30 3.9 23V9z"/>', '<path d="M16 5.2l9.3 5.4v10.8L16 26.8l-9.3-5.4V10.6z"/>', '<path class="ym-mk" d="M11.5 11.5l9 9M20.5 11.5l-9 9"/>'],
    ['<path d="M16 2.2l3.9 8.3 9 1.1-6.6 6.2 1.7 8.9L16 22.3l-8 4.4 1.7-8.9-6.6-6.2 9-1.1z"/>', '<path d="M16 6.6l2.6 5.5 6 .8-4.4 4.1 1.1 5.9L16 20l-5.3 2.9 1.1-5.9-4.4-4.1 6-.8z"/>', ''],
    ['<rect x="5" y="5" width="22" height="22" rx="4" transform="rotate(45 16 16)"/>', '<rect x="8.2" y="8.2" width="15.6" height="15.6" rx="2.6" transform="rotate(45 16 16)"/>', '<circle class="ym-dot" cx="14" cy="14" r="1.3"/><circle class="ym-dot" cx="18" cy="14" r="1.3"/><circle class="ym-dot" cx="14" cy="18" r="1.3"/><circle class="ym-dot" cx="18" cy="18" r="1.3"/>'],
    ['<path d="M4 4.5h24V16c0 7-5.6 11-12 13.5C9.6 27 4 23 4 16z"/>', '<path d="M7 7.4h18V16c0 5.3-4.2 8.4-9 10.4-4.8-2-9-5.1-9-10.4z"/>', '<path class="ym-mk" d="M16 17.4a1.4 1.4 0 1 1 1.4-1.4 2.8 2.8 0 0 1-2.8 2.8 4.2 4.2 0 0 1-4.2-4.2 5.6 5.6 0 0 1 5.6-5.6"/>']
  ];
  function pageHash() { var h = 0, p = location.pathname; for (var i = 0; i < p.length; i++) h = (h * 31 + p.charCodeAt(i)) | 0; return Math.abs(h); }
  function findHeads() {
    heads = [].filter.call(d.querySelectorAll('.hero h1, .case-head h1, .section-head h2, .prose > h2'), function (h) { return h.offsetParent || h.getClientRects().length; });
    seen = heads.map(function () { return false; });
  }
  function textRects(top, bottom) { // line boxes of every word in main (and the top bar) between two page heights
    var out = [], roots = [d.querySelector('main'), d.querySelector('header'), d.querySelector('footer.site')];
    roots.forEach(function (root) {
      if (!root) return;
      var tw = d.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, rg = d.createRange();
      while ((n = tw.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        var pe = n.parentElement; if (!pe || pe.closest('.y-merit, [aria-hidden="true"]')) continue;
        var pb = pe.getBoundingClientRect(); if (pb.bottom + scrollY < top || pb.top + scrollY > bottom) continue;
        rg.selectNodeContents(n);
        [].forEach.call(rg.getClientRects(), function (q) { if (q.width > 0.5 && q.height > 0.5) out.push({ l: q.left + scrollX, t: q.top + scrollY, r: q.right + scrollX, b: q.bottom + scrollY }); });
      }
    });
    [].forEach.call(d.querySelectorAll('main a, main button, header a, header button'), function (e) { var q = e.getBoundingClientRect(); if (q.width && q.bottom + scrollY > top && q.top + scrollY < bottom) out.push({ l: q.left + scrollX, t: q.top + scrollY, r: q.right + scrollX, b: q.bottom + scrollY }); });
    return out;
  }
  function hits(a, list, pad) { for (var i = 0; i < list.length; i++) { var q = list[i]; if (a.l < q.r + pad && a.r > q.l - pad && a.t < q.b + pad && a.b > q.t - pad) return true; } return false; }
  function spot(i, S) { // where patch i fits beside its heading without touching a word; null if nowhere
    var h = heads[i]; if (!h) return null;
    var hb = h.getBoundingClientRect(), vw = r.clientWidth, rg = d.createRange(); rg.selectNodeContents(h);
    var lines = [].filter.call(rg.getClientRects(), function (q) { return q.width > 1; }); if (!lines.length) return null;
    var L = lines[lines.length - 1], ribbon = getComputedStyle(h).backgroundColor !== 'rgba(0, 0, 0, 0)';
    var endX = ribbon ? hb.right : L.right, midY = (ribbon ? hb.top + hb.height / 2 : L.top + L.height / 2);
    var c = [
      { x: endX + 14, y: midY - S / 2 },                                          // after the last word (or beside the ribbon)
      { x: hb.right + Math.max(8, (vw - hb.right - S) / 2), y: hb.top + Math.min(hb.height, 60) / 2 - S / 2 }, // the right margin
      { x: Math.min(L.right, vw - 8) - S, y: (ribbon ? hb.top : L.top) - S - 10 }  // above the end of the title
    ];
    var busy = textRects(hb.top + scrollY - S - 60, hb.bottom + scrollY + S + 20), sig = headSig(h);
    Object.keys(marks).forEach(function (k) { var m = marks[k]; if (m && m.box && +k !== i) busy.push(m.box); });
    for (var k = 0; k < c.length; k++) {
      var a = { l: c[k].x + scrollX, t: c[k].y + scrollY }; a.r = a.l + S; a.b = a.t + S;
      if (c[k].x < 6 || c[k].x + S > vw - 6) continue;
      if (hits(a, busy, 4)) continue;
      a.sig = sig; return a;
    }
    return null;
  }
  function headSig(h) { // where the heading's words are now, in page coordinates
    var rg = d.createRange(); rg.selectNodeContents(h);
    return [].map.call(rg.getClientRects(), function (q) { return Math.round(q.left + scrollX) + ',' + Math.round(q.top + scrollY) + ',' + Math.round(q.right + scrollX); }).join(' ');
  }
  function verify() { // a heading that has moved since its patch was placed (late layout, a font, a picture): place it again
    Object.keys(marks).forEach(function (k) {
      var m = marks[k], i = +k; if (!m || !m.box || !heads[i]) return;
      if (headSig(heads[i]) === m.box.sig) return;
      drop(m.el); var j = mmade.indexOf(m.el); if (j >= 0) mmade.splice(j, 1); delete marks[i]; stitch(i, false);
    });
  }
  function stitch(i, animate) {
    if (marks[i]) return;
    var S = mqSmall.matches ? 22 : 30, a = spot(i, S);
    if (!a) { marks[i] = { el: null, box: null }; return; } // no free room: not shown
    var k = (pageHash() + i * 3) % SHAPES.length, f = FELTS[(pageHash() + i) % FELTS.length], sh = SHAPES[k];
    var el = d.createElement('span'); el.className = 'y-merit' + (animate ? ' y-new' : ''); el.setAttribute('aria-hidden', 'true');
    el.style.cssText = 'left:' + a.l.toFixed(1) + 'px;top:' + a.t.toFixed(1) + 'px;width:' + S + 'px;height:' + S + 'px;--yf:var(' + f[0] + ');--ys:var(' + f[1] + ');--yr:' + ((i % 2 ? 1 : -1) * (4 + (i * 7) % 5)) + 'deg';
    el.innerHTML = '<svg viewBox="0 0 32 32" focusable="false"><g class="ym-felt">' + sh[0] + '</g><g class="ym-st">' + sh[1] + '</g>' + sh[2] + '</svg>';
    d.body.appendChild(el); mmade.push(el);
    marks[i] = { el: el, box: a, k: k };
  }
  function check() {
    chk = 0;
    if (!mat) return;
    var vh = innerHeight, foot = d.querySelector('footer.site'), bottom = scrollY + vh >= r.scrollHeight - 4;
    heads.forEach(function (h, i) {
      if (got.indexOf(i) >= 0) return;
      var hb = h.getBoundingClientRect(); if (onScreen(hb)) seen[i] = true;
      var end = heads[i + 1] ? heads[i + 1].getBoundingClientRect().top : foot ? foot.getBoundingClientRect().top : r.scrollHeight - scrollY;
      if (seen[i] && (end < vh / 2 || bottom)) { got.push(i); save(); queue.push(i); }
    });
    if (queue.length && !qT) drain();
  }
  function drain() { // one patch at a time; an on-screen one waits while another accent shows
    qT = 0;
    if (!mat || !queue.length) return;
    var i = queue[0], h = heads[i], vis = h && onScreen(h.getBoundingClientRect()), moving = r.classList.contains('motion') && !mqReduce.matches;
    if (vis && moving && !free()) { qT = later(drain, 400); return; }
    queue.shift();
    stitch(i, vis && moving);
    if (vis && moving && marks[i] && marks[i].el) { claim('merit', 1100); later(function () { if (marks[i] && marks[i].el) marks[i].el.classList.remove('y-new'); }, 1300); }
    if (queue.length) qT = later(drain, vis ? 700 : 0);
  }
  function replace() { // after a resize: lay the kept patches again
    mmade.forEach(drop); mmade = []; marks = {};
    findHeads(); got.forEach(function (i) { if (i < heads.length) stitch(i, false); });
  }

  /* ---------- 9. a capture centred on a touch screen loses its scrim ---------- */
  var centred = null;
  function centre() {
    if (mqFine.matches) return;
    var vh = innerHeight, best = null, bd = 1e9;
    [].forEach.call(d.querySelectorAll(CAPS), function (e) {
      var b = e.getBoundingClientRect(); if (!b.height || !onScreen(b)) return;
      var dd = Math.abs(b.top + b.height / 2 - vh / 2); if (dd < vh * .22 && dd < bd) { bd = dd; best = e; }
    });
    if (best !== centred) { if (centred) centred.classList.remove('y-clear'); if (best) best.classList.add('y-clear'); centred = best; }
  }

  /* ---------- 1. fresh-sewn: puckered at the seam, then pressed flat ----------
     When a patch's own entrance ends (site.js: "sewn" for felt pieces, "tile" for a case page's facts), its seam is
     gathered (a ring of shade inside the edge, the patch a little lifted) and relaxes flat in 1.1 s, as if pressed.
     The footer's woven label is pressed on the same way when the footer first comes into view. */
  var pressed = typeof WeakSet === 'function' ? new WeakSet() : null;
  function press(el, pseudo) {
    if (!mov || !free() || (pressed && pressed.has(el))) return;
    if (pressed) pressed.add(el);
    var cs = getComputedStyle(el, pseudo || null), sh = cs.getPropertyValue('--shadow').trim(), up = cs.getPropertyValue('--shadow-hover').trim(), sd = cs.getPropertyValue('--shade').trim();
    if (!sh || !up) return;
    var kf = [
      { boxShadow: up + ', inset 0 0 7px 2px ' + sd + ', inset 0 0 0 1.5px ' + sd, offset: 0 },
      { boxShadow: up + ', inset 0 0 5px 1px ' + sd + ', inset 0 0 0 1px ' + sd, offset: .35 },
      { boxShadow: sh + ', inset 0 0 0 0 transparent, inset 0 0 0 0 transparent', offset: 1 }
    ];
    var opt = { duration: 1100, easing: 'cubic-bezier(.25, .7, .2, 1)' };
    if (pseudo) { opt.pseudoElement = pseudo; kf = [{ transform: 'rotate(-2deg) translateY(-1.5px) scale(1.06)', boxShadow: '0 4px 6px ' + sd, offset: 0 }, { transform: 'rotate(-2deg)', offset: 1 }]; }
    anim(el, kf, opt);
  }
  function onAnimEnd(e) {
    var n = e.animationName, t = e.target;
    if ((n === 'sewn' || n === 'tile') && t.matches && t.matches(FELT + ', ' + COTTON)) {
      var b = t.getBoundingClientRect(); if (onScreen(b)) press(t);
    }
  }

  /* ---------- 6. nap sheen spans (fine pointers, wide screens, scroll timelines: no work on phones) ---------- */
  function napOn() {
    if (!SDA || !mqFine.matches || mqSmall.matches) return;
    [].forEach.call(d.querySelectorAll(FELT), function (p) {
      if (p.querySelector(':scope > .y-nap')) return;
      var s = d.createElement('span'); s.className = 'y-nap'; s.setAttribute('aria-hidden', 'true'); s.appendChild(d.createElement('i'));
      p.insertBefore(s, p.querySelector(':scope > .seam')); made.push(s); // before the seam, so :last-child stays the seam
    });
  }

  /* ---------- on, off ---------- */
  var sT = 0, rT = 0, ro = null;
  function onScroll() {
    if (!chk) chk = requestAnimationFrame(check);
    clearTimeout(sT); sT = setTimeout(function () { centre(); verify(); }, 150);
  }
  function matStart() {
    mat = true; r.classList.add('y-mat');
    findHeads(); got = load().filter(function (i) { return i < heads.length; });
    got.forEach(function (i) { stitch(i, false); });
    on(offs, W, 'scroll', onScroll, { passive: true });
    on(offs, W, 'resize', function () { clearTimeout(rT); rT = setTimeout(function () { replace(); centre(); }, 200); }, { passive: true });
    if (W.ResizeObserver && d.querySelector('main')) {
      var last = r.scrollHeight; ro = new ResizeObserver(function () { var hgt = r.scrollHeight; if (hgt !== last) { last = hgt; clearTimeout(rT); rT = setTimeout(replace, 250); } });
      ro.observe(d.querySelector('main')); offs.push(function () { ro.disconnect(); ro = null; });
    }
    check(); centre(); rT = setTimeout(verify, 1200);
  }
  function matStop() {
    mat = false;
    offs.forEach(function (f) { f(); }); offs = [];
    clearTimeout(sT); clearTimeout(rT); cancelAnimationFrame(chk); chk = 0; clearTimeout(qT); qT = 0; queue = [];
    mmade.forEach(drop); mmade = []; marks = {};
    if (centred) centred.classList.remove('y-clear'); centred = null;
    [].forEach.call(d.querySelectorAll('.y-clear'), function (e) { e.classList.remove('y-clear'); });
    r.classList.remove('y-mat');
  }
  function movStart() {
    mov = true;
    on(moffs, d, 'animationend', onAnimEnd, true);
    napOn();
    var foot = d.querySelector('footer.site .wrap > span:nth-of-type(2)');
    if (foot && 'IntersectionObserver' in W) {
      var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { io.disconnect(); later(function () { press(foot, '::before'); }, 250); } }); }, { threshold: 1 });
      io.observe(foot); moffs.push(function () { io.disconnect(); });
    }
  }
  function movStop() {
    mov = false;
    moffs.forEach(function (f) { f(); }); moffs = [];
    timers.forEach(clearTimeout); timers = [];
    anims.slice().forEach(function (a) { try { a.cancel(); } catch (e) {} }); anims = [];
    made.forEach(drop); made = [];
    mmade.forEach(function (e) { e.classList.remove('y-new'); });
    if (qT) { qT = 0; if (mat) qT = later(drain, 0); } // a waiting patch is stitched at once, finished
  }
  function sync() {
    var m = wantMat(), v = wantMov();
    if (mov && !v) movStop();
    if (mat && !m) matStop(); else if (m && !mat) matStart();
    if (v && !mov) movStart();
  }
  new MutationObserver(sync).observe(r, { attributes: true, attributeFilter: ['data-look', 'class'] });
  if (mqReduce.addEventListener) mqReduce.addEventListener('change', sync);
  W.__yarnMatState = function () { return { mat: mat, mov: mov, patches: mmade.length, kept: got.slice(), heads: heads.length, naps: made.length, anims: anims.length, listeners: offs.length + moffs.length, key: KEY }; };
  sync();
})();
