/* Shot-C | Originalno: nástřel nového webu. */
(function () {
  'use strict';

  /* ===== Kampaň na Doniu: tady stačí přepsat čísla a odkaz ===== */
  var CAMPAIGN = {
    url: '#',                          // odkaz na kampaň na Doniu (doplnit)
    raised: 86500,                     // vybráno v Kč (ukázková hodnota)
    goal: 150000,                      // cíl v Kč (ukázková hodnota)
    end: '2026-12-15T23:59:00+01:00'   // konec kampaně (ukázková hodnota)
  };

  /* ===== Newsletter: formulář ze Senderu (app.sender.net → Forms → Embed).
     Obě ID jsou veřejná (jsou vidět v kódu každé stránky s formulářem), API klíč sem nikdy nepatří.
     Prázdné = místo formuláře se ukáže náhradní text. ===== */
  var SENDER = {
    accountId: '4908a4a9db8401', // z embed kódu: sender('…')
    formId: 'aADB17' // z embed kódu: data-sender-form-id="…"
  };

  var TZ = 'Europe/Prague';
  var nf = new Intl.NumberFormat('cs-CZ');

  // Odkazy z cizích dat (kalendář) pouštíme jen jako http(s), ne javascript: apod.
  function safeHttp(u) {
    if (typeof u !== 'string') { return null; }
    try { var p = new URL(u, location.href); return /^https?:$/.test(p.protocol) ? p.href : null; } catch (e) { return null; }
  }

  function kc(n) { return nf.format(n).replace(/\s/g, ' ') + ' Kč'; }

  function plural(n, one, few, many) {
    if (n === 1) { return one; }
    if (n >= 2 && n <= 4) { return few; }
    return many;
  }

  /* Aktuální čísla stahuje GitHub Action z Donia do data/donio.json.
     Když soubor chybí nebo je neplatný, zůstanou hodnoty z CAMPAIGN. */
  function initCampaign() {
    fetch('data/donio.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; })
      .then(function (d) {
        if (d && d.url && d.updated && d.raised >= 0 && d.goal > 0) {
          CAMPAIGN.url = d.url;
          CAMPAIGN.raised = d.raised;
          CAMPAIGN.goal = d.goal;
          CAMPAIGN.end = d.end;          // null = sbírka bez konce
        }
        renderCampaign();
      });
  }

  function renderCampaign() {
    document.querySelectorAll('[data-donio-link]').forEach(function (a) {
      a.href = CAMPAIGN.url;
      if (CAMPAIGN.url !== '#') { a.target = '_blank'; a.rel = 'noopener'; }
    });

    var box = document.querySelector('[data-campaign]');
    if (!box) { return; }
    var pct = Math.min(100, Math.round(CAMPAIGN.raised / CAMPAIGN.goal * 100));
    box.querySelector('[data-raised]').textContent = kc(CAMPAIGN.raised);
    box.querySelector('[data-goal]').textContent = kc(CAMPAIGN.goal);
    box.querySelector('[role=progressbar]').setAttribute('aria-valuenow', pct);

    var daysEl = box.querySelector('[data-days]');
    if (!CAMPAIGN.end) {
      daysEl.hidden = true;
      if (box.querySelector('.campaign__sep')) { box.querySelector('.campaign__sep').hidden = true; }
    }
    var days = Math.ceil((Date.parse(CAMPAIGN.end) - Date.now()) / 864e5);
    daysEl.textContent = days > 0
      ? 'zbývá ' + days + ' ' + plural(days, 'den', 'dny', 'dní')
      : 'kampaň skončila, díky!';

    requestAnimationFrame(function () {
      setTimeout(function () { box.querySelector('.campaign__fill').style.width = pct + '%'; }, 300);
    });
  }

  /* ===== Mobilní menu ===== */
  function initNav() {
    var nav = document.querySelector('.nav');
    var btn = nav && nav.querySelector('.nav__toggle');
    if (!btn) { return; }
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('.nav__menu a').forEach(function (a) {
      a.addEventListener('click', function () {
        nav.classList.remove('is-open');
        btn.setAttribute('aria-expanded', 'false');
      });
    });
  }

  /* ===== Koncerty z data/events.json ===== */
  var COLORS = ['--c1', '--c2', '--c3', '--c4', '--c5', '--c6'];

  function fmt(ms, opts) {
    return new Intl.DateTimeFormat('cs-CZ', Object.assign({ timeZone: TZ }, opts)).format(ms);
  }

  function svg(id) {
    return '<svg aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  function gigItem(ev, i, past) {
    var li = document.createElement('li');
    li.className = 'gig';
    li.style.setProperty('--gc', 'var(' + COLORS[i % COLORS.length] + ')');

    var date = document.createElement('div');
    date.className = 'gig__date';
    var day = document.createElement('span');
    day.className = 'gig__day';
    day.textContent = fmt(ev.startMs, { day: 'numeric' }).replace(/\.?$/, '.');
    var month = document.createElement('span');
    month.className = 'gig__month';
    month.textContent = fmt(ev.startMs, { month: 'long' });
    var year = document.createElement('span');
    year.className = 'gig__year';
    year.textContent = fmt(ev.startMs, { year: 'numeric' });
    date.appendChild(day); date.appendChild(month); date.appendChild(year);
    li.appendChild(date);

    var body = document.createElement('div');
    var title = document.createElement('h3');
    title.className = 'gig__title';
    title.textContent = ev.title;
    body.appendChild(title);
    if (!past) {
      // „sobota 16:00 – místo konání“ (místo z pole Místo v kalendáři)
      var meta = document.createElement('p');
      meta.className = 'gig__meta';
      var time = fmt(ev.startMs, { weekday: 'long' }) + (ev.allDay ? '' : ' ' + fmt(ev.startMs, { hour: 'numeric', minute: '2-digit' }));
      var when = document.createElement('span');
      when.className = 'gig__time';
      when.textContent = time;
      meta.appendChild(when);
      if (ev.venue) {
        meta.appendChild(document.createTextNode('–'));
        var where = document.createElement('span');
        where.className = 'gig__place';
        where.textContent = ev.venue;
        meta.appendChild(where);
      }
      body.appendChild(meta);
    }
    li.appendChild(body);

    var evLink = safeHttp(ev.url);
    if (evLink && !past) {
      var a = document.createElement('a');
      a.className = 'gig__link';
      a.href = evLink;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Více info';
      li.appendChild(a);
    }
    return li;
  }

  function initGigs() {
    var list = document.querySelector('[data-gigs]');
    var pastList = document.querySelector('[data-gigs-past]');
    if (!list) { return; }

    fetch('data/events.json')
      .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
      .then(function (raw) {
        var now = Date.now();
        var events = raw.map(function (e) {
          var s = Date.parse(e.start);
          var en = e.end ? Date.parse(e.end) : s + 2 * 36e5;
          return Object.assign({}, e, { startMs: s, endMs: en });
        }).filter(function (e) {
          // soukromé akce na web nepatří, veřejnost se na ně stejně nedostane
          return !isNaN(e.startMs) && !/soukrom/i.test(e.title + ' ' + (e.venue || ''));
        });

        var upcoming = events.filter(function (e) { return e.endMs >= now; })
          .sort(function (a, b) { return a.startMs - b.startMs; });
        var past = events.filter(function (e) { return e.endMs < now; })
          .sort(function (a, b) { return b.startMs - a.startMs; });

        list.innerHTML = '';
        if (!upcoming.length) {
          list.innerHTML = '<li class="gigs__empty">Nové termíny brzy přidáme. Mezitím nás sledujte na sítích.</li>';
        }
        upcoming.forEach(function (e, i) { list.appendChild(gigItem(e, i, false)); });
        past.forEach(function (e, i) { pastList.appendChild(gigItem(e, i, true)); });
      })
      .catch(function () {
        list.innerHTML = '<li class="gigs__empty">Koncerty se nepodařilo načíst. Aktuální termíny najdete na našem Facebooku.</li>';
      });
  }

  /* ===== Minulé koncerty: rozbalení ===== */
  function initPast() {
    var btn = document.querySelector('[data-past-toggle]');
    var list = document.querySelector('[data-gigs-past]');
    if (!btn || !list) { return; }
    btn.addEventListener('click', function () {
      var open = list.hidden;
      list.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      btn.textContent = open ? 'Skrýt minulé koncerty' : 'Kde jsme už zpívali';
    });
  }

  /* ===== Hudba: přepínání alb šipkami ===== */
  function initDiscs() {
    var discs = document.querySelectorAll('[data-discs] .disc');
    if (discs.length < 2) { return; }
    var current = 0;
    function show(n) {
      current = (n + discs.length) % discs.length;
      discs.forEach(function (d, i) { d.classList.toggle('is-active', i === current); });
    }
    document.querySelectorAll('[data-disc]').forEach(function (b) {
      b.addEventListener('click', function () { show(current + Number(b.getAttribute('data-disc'))); });
    });
    discs.forEach(function (d, i) {
      var next = d.querySelector('.disc__next');
      if (next) { next.addEventListener('click', function () { show(i + 1); }); next.style.cursor = 'pointer'; }
    });
  }

  /* ===== Videa: poslední videa z YouTube (data/videos.json plní deploy) ===== */
  function initVideos() {
    var grid = document.querySelector('[data-videos]');
    if (!grid) { return; }
    fetch('data/videos.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
      .then(function (data) {
        var videos = (data.videos || []).filter(function (v) { return /^[\w-]{11}$/.test(v.id); }).slice(0, 3);
        if (!videos.length) { return; }
        grid.innerHTML = '';
        videos.forEach(function (v) {
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.className = 'video video--yt';
          a.href = 'https://www.youtube.com/watch?v=' + v.id;
          a.target = '_blank'; a.rel = 'noopener';
          var im = document.createElement('img');
          im.src = 'https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg';
          im.alt = ''; im.loading = 'lazy';
          a.appendChild(im);
          a.insertAdjacentHTML('beforeend', '<span class="video__play">' + svg('i-play') + '</span>');
          var label = document.createElement('span');
          label.className = 'video__label';
          label.textContent = v.title || 'Video';
          a.appendChild(label);
          li.appendChild(a); grid.appendChild(li);
        });
      })
      .catch(function () { /* necháme dlaždice s odkazem na kanál */ });
  }

  var y = document.querySelector('[data-year]');
  if (y) { y.textContent = new Date().getFullYear(); }

  /* Newsletter: načte univerzální skript Senderu a vloží jeho embedded formulář. */
  function initNewsletter() {
    var box = document.querySelector('[data-sender-form]');
    if (!box || !/^[\w-]+$/.test(SENDER.accountId) || !/^[\w-]+$/.test(SENDER.formId)) { return; }
    var field = document.createElement('div');
    field.className = 'sender-form-field';
    field.setAttribute('data-sender-form-id', SENDER.formId);
    box.appendChild(field);
    box.hidden = false;
    var fb = document.querySelector('[data-sender-fallback]');
    if (fb) { fb.hidden = true; }
    window.Sender = 'sender';
    window.sender = window.sender || function () { (window.sender.q = window.sender.q || []).push(arguments); };
    window.sender.l = Date.now();
    window.sender.on = window.sender.on || function (ev, cb) {
      window.sender.listeners = window.sender.listeners || {};
      (window.sender.listeners[ev] = window.sender.listeners[ev] || []).push(cb);
    };
    var sc = document.createElement('script');
    sc.async = true;
    sc.src = 'https://cdn.sender.net/accounts_resources/universal.js';
    document.head.appendChild(sc);
    window.sender(SENDER.accountId);
    styleSenderShadow(field);
  }

  /* Když Sender vykreslí formulář do (otevřeného) shadow DOM, styly webu se k němu nedostanou.
     Proto do něj zkopírujeme pravidla .sender-form-field ze style.css. */
  function styleSenderShadow(field) {
    var tries = 0;
    var css = '';
    try {
      Array.prototype.forEach.call(document.styleSheets, function (sh) {
        var rules; try { rules = sh.cssRules; } catch (e) { return; }
        Array.prototype.forEach.call(rules || [], function (r) {
          if (r.selectorText && r.selectorText.indexOf('.sender-form-field') !== -1) {
            css += r.cssText.replace(/\.newsletter \.sender-form-field ?/g, ':host ') + '\n';
          }
        });
      });
    } catch (e) { return; }
    var root = getComputedStyle(document.documentElement);
    ['--ink', '--line', '--font-body', '--font-head'].forEach(function (v) {
      css = css.split('var(' + v + ')').join(root.getPropertyValue(v).trim());
    });
    (function look() {
      var hosts = [field].concat(Array.prototype.slice.call(field.querySelectorAll('*')));
      var done = false;
      hosts.forEach(function (h) {
        if (h.shadowRoot && !h.shadowRoot.querySelector('style[data-shotc]')) {
          var st = document.createElement('style');
          st.setAttribute('data-shotc', '');
          st.textContent = css;
          h.shadowRoot.appendChild(st);
          done = true;
        }
      });
      if (!done && ++tries < 40) { setTimeout(look, 250); }
    })();
  }

  initCampaign();
  initNav();
  initGigs();
  initPast();
  initDiscs();
  initVideos();
  initNewsletter();
}());
