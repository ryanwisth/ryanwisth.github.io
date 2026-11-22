/* Cel & Tide: the diorama's moving part (Nov 21 2026). look-cel.css draws the world and every solid; this only moves the
   world's planes with the scroll, by two numbers on <html>:
     --dk-rise  how far the horizon has risen (the camera tilting down toward the sea as you read on);
     --dk-ny    how far the near sea's net has slid toward you.
   site.js loads this file only when motion is allowed, so with reduced motion the world simply stands still. "Pause motion"
   (data-motion="paused") stops it too. On phones only the horizon moves (the net stays put), one update per frame at most. */
(function () {
  var r = document.documentElement, raf = 0, phone = innerWidth <= 620;
  if (r.getAttribute('data-look') !== 'cel') return;
  function go() {
    raf = 0;
    if (r.getAttribute('data-look') !== 'cel') return;
    if (r.getAttribute('data-motion') === 'paused') { r.style.removeProperty('--dk-rise'); r.style.removeProperty('--dk-ny'); return; }
    var vh = innerHeight, y = window.scrollY, hz0 = vh * .72, rise = Math.max(0, Math.min(y * .2, hz0 - vh * .16));
    r.style.setProperty('--dk-rise', rise.toFixed(1) + 'px');
    if (!phone) r.style.setProperty('--dk-ny', (-y * .35).toFixed(1) + 'px');
  }
  function kick() { if (!raf) raf = requestAnimationFrame(go); }
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', function () { phone = innerWidth <= 620; kick(); });
  new MutationObserver(kick).observe(r, { attributes: true, attributeFilter: ['data-motion', 'data-look'] });
  go();
})();
