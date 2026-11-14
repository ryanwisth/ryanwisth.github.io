/* Small progressive extras. Every page reads fully without this file. */
(function () {
  var d = document, r = d.documentElement;

  // light / dark toggle (remembers the choice)
  var b = d.querySelector('.theme-toggle');
  if (b) {
    b.hidden = false;
    b.addEventListener('click', function () {
      var cur = r.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      r.dataset.theme = next;
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  // the 3D demo loads in place on larger screens; on phones the link opens it full screen
  d.querySelectorAll('.demo-poster').forEach(function (a) {
    a.addEventListener('click', function (e) {
      if (innerWidth < 760) return;
      e.preventDefault();
      var f = d.createElement('iframe');
      f.src = a.getAttribute('href');
      f.title = 'Live 3D family tree demo';
      f.className = 'demo-frame';
      a.replaceWith(f);
      f.focus();
    });
  });

  // motion, only when the visitor has not asked for less of it
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  r.classList.add('motion');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target;
      io.unobserve(t);
      t.classList.add('in');
      setTimeout(function () { t.classList.remove('reveal'); t.style.removeProperty('--d'); }, 1300);
    });
  }, { rootMargin: '0px 0px -7% 0px', threshold: 0.06 });
  d.querySelectorAll('.section-head, .card, .principle, .band, .figure, .repo-card, .pager, .reel-item').forEach(function (el) {
    el.classList.add('reveal');
    if (el.matches('.card, .principle, .reel-item')) {
      el.style.setProperty('--d', ([].indexOf.call(el.parentNode.children, el) % (el.matches('.reel-item') ? 4 : 3)) * 90 + 'ms');
    }
    io.observe(el);
  });
  d.querySelectorAll('.flow li').forEach(function (li) {
    li.style.setProperty('--i', [].indexOf.call(li.parentNode.children, li));
  });
  d.querySelectorAll('.term .ln, .legend li').forEach(function (li) {
    li.style.setProperty('--i', [].indexOf.call(li.parentNode.children, li));
  });
  var hover = matchMedia('(hover: hover)').matches;
  d.querySelectorAll('.card').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var q = c.getBoundingClientRect();
      var x = e.clientX - q.left, y = e.clientY - q.top;
      c.style.setProperty('--mx', x + 'px');
      c.style.setProperty('--my', y + 'px');
      c.style.setProperty('--ry', ((x / q.width - .5) * 3.2).toFixed(2) + 'deg');
      c.style.setProperty('--rx', ((.5 - y / q.height) * 3.2).toFixed(2) + 'deg');
    });
    // cards with a capture play it over the thumbnail while hovered or focused
    var src = c.getAttribute('data-preview'), wrap = c.querySelector('.thumb-wrap'), v;
    if (!src || !wrap || !hover) return;
    function on() {
      if (!v) {
        v = d.createElement('video');
        v.className = 'preview'; v.muted = true; v.loop = true; v.playsInline = true; v.src = src;
        v.setAttribute('aria-hidden', 'true');
        wrap.appendChild(v);
      }
      v.classList.add('on');
      var p = v.play(); if (p && p.catch) p.catch(function () {});
    }
    function off() { if (v) { v.classList.remove('on'); v.pause(); } }
    c.addEventListener('pointerenter', on); c.addEventListener('pointerleave', off);
    c.addEventListener('focus', on); c.addEventListener('blur', off);
  });

  // figures count up once, when first seen; the final text is what the page shipped with
  var cio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target, txt = el.textContent, parts = txt.split(/(\d[\d,]*(?:\.\d+)?)/), t0 = 0;
      cio.unobserve(el);
      if (parts.length < 2) return;
      el.style.minHeight = el.getBoundingClientRect().height + 'px';
      function step(now) {
        if (!t0) t0 = now;
        var k = Math.min(1, (now - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
        if (k >= 1) { el.textContent = txt; el.style.removeProperty('min-height'); return; }
        el.textContent = parts.map(function (p, i) {
          if (!(i % 2)) return p;
          var dec = (p.split('.')[1] || '').length, n = parseFloat(p.replace(/,/g, '')) * e;
          return p.indexOf(',') > -1 ? Math.round(n).toLocaleString('en-US') : n.toFixed(dec);
        }).join('');
        requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  d.querySelectorAll('.fact b, .card .stat b, .collage .float b').forEach(function (b) { cio.observe(b); });

  // screen captures: play while on screen, pause off screen, with a pause button
  var ICON = '<svg class="i-pause" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4 2.5h3v11H4zM9 2.5h3v11H9z"/></svg><svg class="i-play" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M4.5 2.2v11.6L13.5 8z"/></svg>';
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting && !v.dataset.held) { var p = v.play(); if (p && p.catch) p.catch(function () {}); }
      else v.pause();
    });
  }, { threshold: 0.35 });
  d.querySelectorAll('video[data-auto]').forEach(function (v) {
    var box = v.parentNode, btn = d.createElement('button');
    v.removeAttribute('controls'); v.muted = true;
    box.classList.add('vid');
    btn.type = 'button'; btn.className = 'vid-toggle'; btn.innerHTML = ICON;
    btn.setAttribute('aria-label', 'Pause or play this capture');
    function flip(e) {
      if (e) e.preventDefault();
      if (v.paused) { delete v.dataset.held; v.play(); } else { v.dataset.held = '1'; v.pause(); }
    }
    btn.addEventListener('click', flip); v.addEventListener('click', flip);
    v.addEventListener('pause', function () { box.classList.toggle('paused', !!v.dataset.held); });
    v.addEventListener('play', function () { box.classList.remove('paused'); });
    box.appendChild(btn);
    vio.observe(v);
  });
})();
