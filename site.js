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
  d.querySelectorAll('.section-head, .card, .principle, .band, .figure, .repo-card, .pager').forEach(function (el) {
    el.classList.add('reveal');
    if (el.matches('.card, .principle')) {
      el.style.setProperty('--d', ([].indexOf.call(el.parentNode.children, el) % 3) * 90 + 'ms');
    }
    io.observe(el);
  });
  d.querySelectorAll('.flow li').forEach(function (li) {
    li.style.setProperty('--i', [].indexOf.call(li.parentNode.children, li));
  });
  d.querySelectorAll('.card').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var q = c.getBoundingClientRect();
      c.style.setProperty('--mx', (e.clientX - q.left) + 'px');
      c.style.setProperty('--my', (e.clientY - q.top) + 'px');
    });
  });
})();
