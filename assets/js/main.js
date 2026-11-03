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

  var TZ = 'Europe/Prague';
  var nf = new Intl.NumberFormat('cs-CZ');

  function kc(n) { return nf.format(n).replace(/\s/g, ' ') + ' Kč'; }

  function plural(n, one, few, many) {
    if (n === 1) { return one; }
    if (n >= 2 && n <= 4) { return few; }
    return many;
  }

  function initCampaign() {
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

    var days = Math.ceil((Date.parse(CAMPAIGN.end) - Date.now()) / 864e5);
    box.querySelector('[data-days]').textContent = days > 0
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

  function gigItem(ev, i, past) {
    var li = document.createElement('li');
    li.className = 'gig';
    li.style.setProperty('--gc', 'var(' + COLORS[i % COLORS.length] + ')');

    var date = document.createElement('div');
    date.className = 'gig__date';
    date.textContent = fmt(ev.startMs, { day: 'numeric', month: 'numeric' }).replace(/\s/g, '');
    var small = document.createElement('small');
    small.textContent = past
      ? fmt(ev.startMs, { year: 'numeric' })
      : fmt(ev.startMs, { weekday: 'short' }) + (ev.allDay ? '' : ' ' + fmt(ev.startMs, { hour: 'numeric', minute: '2-digit' }));
    date.appendChild(small);
    li.appendChild(date);

    var body = document.createElement('div');
    var title = document.createElement('div');
    title.className = 'gig__title';
    title.textContent = ev.title;
    body.appendChild(title);
    if (ev.venue && !past) {
      var meta = document.createElement('div');
      meta.className = 'gig__meta';
      meta.textContent = ev.venue;
      body.appendChild(meta);
    }
    li.appendChild(body);

    if (ev.url && !past) {
      var a = document.createElement('a');
      a.className = 'gig__link';
      a.href = ev.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = 'Více info →';
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

  var y = document.querySelector('[data-year]');
  if (y) { y.textContent = new Date().getFullYear(); }

  initCampaign();
  initNav();
  initGigs();
}());
