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

  /* ===== Instagram: JSON feed (např. z behold.so). Prázdné = barevné placeholdery ===== */
  var INSTAGRAM = {
    feedUrl: 'https://feeds.behold.so/KVe4qiyMuQ455cLIgPna',
    count: 6
  };

  var TZ = 'Europe/Prague';
  var nf = new Intl.NumberFormat('cs-CZ');

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
      var meta = document.createElement('p');
      meta.className = 'gig__meta';
      meta.innerHTML = svg('i-pin');
      var where = document.createElement('span');
      var time = ev.allDay ? '' : fmt(ev.startMs, { weekday: 'long' }) + ' ' + fmt(ev.startMs, { hour: 'numeric', minute: '2-digit' });
      where.textContent = [ev.venue, time].filter(Boolean).join(' · ');
      meta.appendChild(where);
      body.appendChild(meta);
    }
    li.appendChild(body);

    if (ev.url && !past) {
      var a = document.createElement('a');
      a.className = 'gig__link';
      a.href = ev.url;
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
        }).filter(function (e) { return !isNaN(e.startMs); });

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

  /* ===== Instagram: posledních pár příspěvků ===== */
  function initInstagram() {
    var row = document.querySelector('[data-insta]');
    if (!row || !INSTAGRAM.feedUrl) { return; }
    fetch(INSTAGRAM.feedUrl)
      .then(function (r) { if (!r.ok) { throw new Error(r.status); } return r.json(); })
      .then(function (data) {
        var posts = (Array.isArray(data) ? data : data.posts || []).slice(0, INSTAGRAM.count);
        if (!posts.length) { return; }
        row.innerHTML = '';
        posts.forEach(function (p) {
          var img = (p.sizes && p.sizes.medium && p.sizes.medium.mediaUrl) || p.thumbnailUrl || p.mediaUrl;
          if (!img || !p.permalink) { return; }
          var li = document.createElement('li');
          var a = document.createElement('a');
          a.href = p.permalink; a.target = '_blank'; a.rel = 'noopener';
          var im = document.createElement('img');
          im.src = img; im.loading = 'lazy';
          im.alt = (p.prunedCaption || p.caption || 'Příspěvek na Instagramu').slice(0, 120);
          a.appendChild(im); li.appendChild(a); row.appendChild(li);
        });
      })
      .catch(function () { /* necháme placeholdery */ });
  }

  var y = document.querySelector('[data-year]');
  if (y) { y.textContent = new Date().getFullYear(); }

  initCampaign();
  initNav();
  initGigs();
  initPast();
  initDiscs();
  initInstagram();
}());
