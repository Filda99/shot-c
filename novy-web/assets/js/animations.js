/* Shot-C | Originalno: animace při scrollu a v intervalech.
   Prvky se označují tady podle tříd, v index.html není potřeba nic přidávat. */
(function () {
  'use strict';

  if (!('IntersectionObserver' in window)) { return; }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { return; }

  var root = document.documentElement;
  root.classList.add('anim');

  /* ===== 1) Odhalení při scrollu ===== */
  // [selektor, směr, rozestup mezi sourozenci v s]
  var REVEAL = [
    ['.section .title, .bio .title', 'up', 0],
    ['.intro, .contact__lead, .contact__role, .contact__name, .contact__lines', 'up', 0],
    ['.disc-head .arrows', 'right', 0],
    ['.disc.is-active .disc__info', 'left', 0],
    ['.disc.is-active .disc__main', 'zoom', 0],
    ['.disc.is-active .disc__next', 'right', 0],
    ['.videos .center, .press', 'up', 0],
    ['.video-grid > li', 'tilt', .12],
    ['.insta__title, .insta__more', 'up', 0],
    ['[data-insta] > li', 'zoom', .07],
    ['.downloads > li', 'up', .08],
    ['.bio__photo', 'left', 0],
    ['.bio__text > p, .bio__icons', 'up', .1],
    ['[data-past-toggle]', 'up', 0]
  ];

  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    });
  }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });

  function mark(el, dir, delay) {
    if (el.hasAttribute('data-reveal')) { return; }
    el.setAttribute('data-reveal', dir);
    if (delay) { el.style.setProperty('--d', delay + 's'); }
    io.observe(el);
  }

  function markAll(scope) {
    REVEAL.forEach(function (r) {
      var els = (scope || document).querySelectorAll(r[0]);
      Array.prototype.forEach.call(els, function (el) {
        var idx = Array.prototype.indexOf.call(el.parentNode.children, el);
        mark(el, r[1], r[2] ? Math.min(idx, 8) * r[2] : 0);
      });
    });
  }
  markAll();

  // Koncerty a Instagram se načítají až po chvíli: nové řádky taky „najedou“
  function watch(sel, dir, step) {
    var box = document.querySelector(sel);
    if (!box) { return; }
    new MutationObserver(function () {
      var kids = box.children;
      for (var i = 0; i < kids.length; i++) { mark(kids[i], dir, Math.min(i, 8) * step); }
    }).observe(box, { childList: true });
  }
  watch('[data-gigs]', 'left', .1);
  watch('[data-gigs-past]', 'up', .04);
  watch('[data-insta]', 'zoom', .07);

  /* ===== 2) Scroll: ukazatel postupu, navigace, parallax ===== */
  var bar = document.createElement('div');
  bar.className = 'scroll-progress';
  bar.setAttribute('aria-hidden', 'true');
  document.body.appendChild(bar);

  var nav = document.querySelector('.nav');
  var bgSpans = document.querySelectorAll('.videos__bg span');
  var videos = document.querySelector('.videos');
  var bioPhoto = document.querySelector('.bio__photo');
  var links = Array.prototype.map.call(document.querySelectorAll('.nav__menu a[href^="#"]:not(.nav__donio)'), function (a) {
    return { a: a, sec: document.querySelector(a.getAttribute('href')) };
  }).filter(function (l) { return l.sec; });

  // poměr, jak daleko je prvek prošlý oknem (0 = vstupuje dole, 1 = odešel nahoře)
  function progress(el) {
    var r = el.getBoundingClientRect();
    var h = window.innerHeight;
    return Math.max(0, Math.min(1, (h - r.top) / (h + r.height)));
  }

  var ticking = false;
  function onScroll() {
    ticking = false;
    var max = root.scrollHeight - window.innerHeight;
    bar.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);

    if (nav) { nav.classList.toggle('is-stuck', nav.getBoundingClientRect().top <= 0 && window.scrollY > 10); }

    if (videos) {
      var p = progress(videos);
      Array.prototype.forEach.call(bgSpans, function (s, i) {
        var dir = i % 2 ? 1 : -1;
        s.style.setProperty('--sx', (dir * (p - 0.5) * 30).toFixed(2) + '%');
      });
    }
    if (bioPhoto) { bioPhoto.style.setProperty('--py', (progress(bioPhoto) * 100).toFixed(1) + '%'); }

    var line = window.innerHeight * 0.35;
    var current = null;
    links.forEach(function (l) { if (l.sec.getBoundingClientRect().top <= line) { current = l; } });
    links.forEach(function (l) { l.a.classList.toggle('is-current', l === current); });
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ===== 3) Počítadlo vybrané částky na Doniu ===== */
  var raised = document.querySelector('[data-raised]');
  if (raised) {
    var target = parseInt(raised.textContent.replace(/\D/g, ''), 10);
    if (target > 0) {
      var nf = new Intl.NumberFormat('cs-CZ');
      var t0 = null, dur = 1600;
      var step = function (t) {
        if (t0 === null) { t0 = t; }
        var k = Math.min(1, (t - t0) / dur);
        var eased = 1 - Math.pow(1 - k, 3);
        raised.textContent = nf.format(Math.round(target * eased)).replace(/\s/g, ' ') + ' Kč';
        if (k < 1) { requestAnimationFrame(step); }
      };
      setTimeout(function () { requestAnimationFrame(step); }, 300);
    }
  }

  /* ===== 4) Opakující se animace (jen když je prvek vidět a karta je aktivní) ===== */
  var visible = new WeakMap();
  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) { visible.set(e.target, e.isIntersecting); });
  });

  function every(el, ms, fn) {
    if (!el) { return; }
    vio.observe(el);
    setInterval(function () {
      if (!document.hidden && visible.get(el)) { fn(el); }
    }, ms);
  }

  function replay(el, cls, ms) {
    el.classList.remove(cls);
    void el.offsetWidth; // restart animace
    el.classList.add(cls);
    setTimeout(function () { el.classList.remove(cls); }, ms);
  }

  // Hero: vlna přes šest barevných „hlasů“
  var crew = document.querySelector('.hero__crew');
  setTimeout(function () { if (crew) { replay(crew, 'is-singing', 1800); } }, 1600);
  every(crew, 6000, function (el) { replay(el, 'is-singing', 1800); });

  // Ikony sítí: postupné poskočení
  document.querySelectorAll('.icons').forEach(function (ul, n) {
    Array.prototype.forEach.call(ul.children, function (li, i) { li.style.setProperty('--i', i); });
    setTimeout(function () {
      every(ul, 9000, function (el) { replay(el, 'is-hop', 1200); });
    }, n * 1500);
  });

  // Instagram a Ke stažení: náhodná dlaždice se „ťukne“
  function popRandom(sel) {
    return function (box) {
      var items = box.querySelectorAll(sel);
      if (!items.length) { return; }
      replay(items[Math.floor(Math.random() * items.length)], 'is-pop', 800);
    };
  }
  every(document.querySelector('[data-insta]'), 2400, popRandom(':scope > li'));
  every(document.querySelector('.downloads'), 3200, popRandom('.dl'));

  // Barevný pruh v patičce
  every(document.querySelector('.stripe'), 5000, function (el) { replay(el, 'is-wave', 1500); });
}());
