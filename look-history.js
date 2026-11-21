/* Version History: the one script (Nov 21 2026). look-history.css draws the look and its one movement: the changelog
   rows (and the home's five numbers) write in on load, under html.motion only. This keeps that to the first visit of
   each page in a tab: on a later visit the rows are simply there (html.hx-seen). site.js fetches this file only while
   the page wears data-look="history" and reduced motion is not asked for. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__historyLive || !d.addEventListener) return;
  W.__historyLive = 1;
  if (r.getAttribute('data-look') !== 'history') return;
  var key = 'hx-typed:' + location.pathname;
  try {
    if (sessionStorage.getItem(key)) {
      r.classList.add('hx-seen');
      if (d.getAnimations) d.getAnimations().forEach(function (a) { if (a.animationName === 'hx-type') a.finish(); });
    } else sessionStorage.setItem(key, '1');
  } catch (e) {}
})();
