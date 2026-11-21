/* Studio: the one moving extra that needs a script (Nov 21 2026). look-studio.css draws the look and all its motion;
   this adds only the top bar's scrolled state (a little more opaque once the page has moved, so text under the blur
   stays quiet). site.js fetches it only while the page wears data-look="studio" and reduced motion is not asked for.
   It runs only while <html> carries both data-look="studio" and .motion, and takes away what it added (its listener
   and classes) the moment either goes: the look picker, "Pause motion", or a reduced-motion change. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__studioLive || !d.addEventListener) return;
  W.__studioLive = 1;
  var mq = matchMedia('(prefers-reduced-motion: reduce)'), live = false, raf = 0;
  function wanted() { return r.getAttribute('data-look') === 'studio' && r.classList.contains('motion') && !mq.matches; }
  function frame() { raf = 0; r.classList.toggle('sd-scrolled', (W.scrollY || 0) > 8); }
  function onScroll() { if (!raf) raf = requestAnimationFrame(frame); }
  function start() { live = true; r.classList.add('sd-live'); addEventListener('scroll', onScroll, { passive: true }); frame(); }
  function stop() { live = false; removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf); raf = 0; r.classList.remove('sd-live', 'sd-scrolled'); }
  function check() { var w = wanted(); if (w && !live) start(); else if (!w && live) stop(); }
  new MutationObserver(check).observe(r, { attributes: true, attributeFilter: ['data-look', 'class'] });
  if (mq.addEventListener) mq.addEventListener('change', check);
  check();
})();
