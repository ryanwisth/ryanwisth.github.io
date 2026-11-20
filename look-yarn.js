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
  W.__yarnLiveState = function () { return { live: live, sda: SDA, made: made.length, listeners: offs.length, anims: anims.length, flecks: flecks.length, accent: acc.name }; };
  sync();
})();
