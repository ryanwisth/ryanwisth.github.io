/* Backdrop & Spotlight: the one script of the look (look.js loads it while the look is worn). The look itself is all CSS
   (look-backdrop.css: baked plates and tiles in img/backdrop/, nothing painted or moving at run time). This only gives the
   home film its own calm painted poster (day or night, img/backdrop/poster-index[-night].jpg, baked by
   _tools/backdrop/pages/bake.html) while the look has no film twins of its own, and holds that film for a press instead of
   playing the yarn film inside this look. Once backdrop twins exist (films true in look.js), this file goes. */
(function () {
  'use strict';
  var d = document, r = d.documentElement, W = window;
  if (W.__bkLive || !d.addEventListener) return;
  W.__bkLive = 1;
  var BASE = ''; try { BASE = d.currentScript.src.replace(/[^\/]*$/, ''); } catch (e) {}
  function on() { return r.getAttribute('data-look') === 'backdrop'; }
  function night() { var t = r.getAttribute('data-theme'); return t === 'dark' || (t !== 'light' && !!W.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches); }
  function poster() {
    var v = d.querySelector('.lead-hero .hero-film video'); if (!v || !on()) return;
    var want = BASE + 'img/backdrop/poster-index' + (night() ? '-night' : '') + '.jpg';
    if (v.getAttribute('poster') === want) return;
    if (!v.dataset.bkPoster) {                       // first time: hold the yarn film for a press
      v.dataset.bkPoster = '1'; v.dataset.held = '1';
      if (!v.paused) { v.pause(); try { v.currentTime = 0; } catch (e) {} }
      var box = v.parentNode; if (box && box.classList) box.classList.add('paused');
    }
    v.setAttribute('poster', want);
  }
  function start() {
    poster();
    addEventListener('load', poster);
    if (W.MutationObserver) new MutationObserver(poster).observe(r, { attributes: true, attributeFilter: ['data-theme', 'data-look'] });
    if (W.matchMedia) { var mq = matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', poster); }
  }
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', start); else start();
})();
