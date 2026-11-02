/*
 * Shot-C concerts: pure logic + small DOM renderer.
 *
 * The first half of this file has NO DOM dependency and is exported for Node
 * tests (`node tests/events.test.js`). The second half renders into the page.
 *
 * Event schema (data/events.json) is documented in README.md.
 * All times are interpreted as absolute instants (ISO 8601 with offset) and
 * displayed in Europe/Prague regardless of the browser time zone.
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.ShotCEvents = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var TIME_ZONE = 'Europe/Prague';
  var LOCALE = 'cs-CZ';
  var HOUR_MS = 60 * 60 * 1000;
  var DEFAULT_DURATION_MS = 2 * HOUR_MS; // rule: missing end = start + 2 h
  var ALL_DAY_DURATION_MS = 24 * HOUR_MS; // rule: missing end of an all-day event = start + 24 h
  var ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})$/;

  var SOCIAL_LINKS = [
    { label: 'Facebook', href: 'https://www.facebook.com/czshotc/' },
    { label: 'Instagram', href: 'https://www.instagram.com/shotc.band' },
    { label: 'YouTube', href: 'https://youtube.com/c/ShotCVocalBand' }
  ];

  /* ---------- parsing and validation ---------- */

  function parseIso(value) {
    if (typeof value !== 'string' || !ISO_WITH_OFFSET.test(value)) { return NaN; }
    return Date.parse(value);
  }

  /**
   * Validates raw JSON and adds startMs / endMs.
   * Invalid entries are skipped and reported in `errors`; the page never breaks.
   */
  function normalizeEvents(raw) {
    var events = [];
    var errors = [];
    var seen = {};
    if (!Array.isArray(raw)) {
      return { events: events, errors: ['events data is not an array'] };
    }
    raw.forEach(function (item, index) {
      var label = 'event #' + index;
      if (!item || typeof item !== 'object') { errors.push(label + ': not an object'); return; }
      if (typeof item.id !== 'string' || item.id === '') { errors.push(label + ': missing id'); return; }
      label = 'event "' + item.id + '"';
      if (seen[item.id]) { errors.push(label + ': duplicate id'); return; }
      var startMs = parseIso(item.start);
      if (isNaN(startMs)) { errors.push(label + ': start must be ISO 8601 with offset'); return; }
      var allDay = item.allDay === true;
      var endMs = NaN;
      var endDerived = false;
      if (item.end !== undefined && item.end !== null && item.end !== '') {
        endMs = parseIso(item.end);
        if (isNaN(endMs)) { errors.push(label + ': invalid end, default duration used'); }
        else if (endMs < startMs) { errors.push(label + ': end before start, default duration used'); endMs = NaN; }
      }
      if (isNaN(endMs)) {
        endMs = startMs + (allDay ? ALL_DAY_DURATION_MS : DEFAULT_DURATION_MS);
        endDerived = true;
      }
      seen[item.id] = true;
      var copy = {};
      Object.keys(item).forEach(function (key) { copy[key] = item[key]; });
      copy.allDay = allDay;
      copy.startMs = startMs;
      copy.endMs = endMs;
      copy.endDerived = endDerived;
      events.push(copy);
    });
    return { events: events, errors: errors };
  }

  /* ---------- selection and ordering (pure) ---------- */

  function compareAsc(a, b) {
    return (a.startMs - b.startMs) || (a.endMs - b.endMs) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  }

  /** Future and currently running events (end >= now), nearest first. */
  function selectUpcoming(events, nowMs) {
    return events.filter(function (ev) { return ev.endMs >= nowMs; }).sort(compareAsc);
  }

  /** Every event, newest start first. */
  function selectAllDescending(events) {
    return events.slice().sort(function (a, b) { return compareAsc(b, a); });
  }

  /** 'upcoming' | 'ongoing' | 'past' */
  function eventStatus(ev, nowMs) {
    if (ev.endMs < nowMs) { return 'past'; }
    if (ev.startMs <= nowMs) { return 'ongoing'; }
    return 'upcoming';
  }

  /* ---------- Europe/Prague formatting ---------- */

  var formatterCache = {};
  function formatter(key, options) {
    if (!formatterCache[key]) {
      options.timeZone = TIME_ZONE;
      formatterCache[key] = new Intl.DateTimeFormat(LOCALE, options);
    }
    return formatterCache[key];
  }

  function pragueParts(ms) {
    var parts = formatter('parts', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(new Date(ms));
    var out = {};
    parts.forEach(function (p) { out[p.type] = p.value; });
    return out;
  }

  function pragueYear(ms) { return Number(pragueParts(ms).year); }
  function pragueDateKey(ms) { var p = pragueParts(ms); return p.year + '-' + p.month + '-' + p.day; }
  function formatDay(ms) { return String(Number(pragueParts(ms).day)); }
  function formatMonthShort(ms) { return formatter('monthShort', { month: 'short' }).format(new Date(ms)); }
  function formatTime(ms) { var p = pragueParts(ms); return p.hour + ':' + p.minute; }
  function formatDateLong(ms) {
    return formatter('long', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ms));
  }

  /** "17:00–18:00", "17:00" (end unknown), "Celý den" (all-day). */
  function formatTimeRange(ev) {
    if (ev.allDay) { return 'celý den'; }
    var start = formatTime(ev.startMs);
    if (ev.endDerived) { return start; }
    if (pragueDateKey(ev.startMs) === pragueDateKey(ev.endMs)) {
      return start + '–' + formatTime(ev.endMs);
    }
    var p = pragueParts(ev.endMs);
    return start + ' – ' + Number(p.day) + '. ' + Number(p.month) + '. ' + formatTime(ev.endMs);
  }

  /** Groups an already sorted list by Prague calendar year, keeping order. */
  function groupByYear(sortedEvents) {
    var groups = [];
    sortedEvents.forEach(function (ev) {
      var year = pragueYear(ev.startMs);
      var last = groups[groups.length - 1];
      if (!last || last.year !== year) {
        last = { year: year, events: [] };
        groups.push(last);
      }
      last.events.push(ev);
    });
    return groups;
  }

  /* ---------- "now" and the testing hook ---------- */

  /**
   * Testing hook: window.__NOW__ (ISO string with offset or epoch ms) or
   * ?now=2026-11-15T17:30:00+01:00 in the URL. A raw "+" in the query string is
   * decoded as a space by browsers, so spaces are turned back into "+".
   */
  function parseNowOverride(value) {
    if (typeof value === 'number' && isFinite(value)) { return value; }
    if (typeof value !== 'string') { return NaN; }
    var text = value.trim().replace(/ /g, '+');
    return parseIso(text);
  }

  function resolveNow(search, win, realNowMs) {
    var fromWindow = win ? parseNowOverride(win.__NOW__) : NaN;
    if (!isNaN(fromWindow)) { return { ms: fromWindow, overridden: true }; }
    var match = /[?&]now=([^&#]*)/.exec(search || '');
    if (match) {
      var decoded;
      try { decoded = decodeURIComponent(match[1].replace(/\+/g, '%2B')); } catch (e) { decoded = ''; }
      var fromQuery = parseNowOverride(decoded);
      if (!isNaN(fromQuery)) { return { ms: fromQuery, overridden: true }; }
    }
    return { ms: realNowMs, overridden: false };
  }

  /* ---------- DOM rendering (browser only) ---------- */

  function isSafeUrl(url) { return typeof url === 'string' && /^https?:\/\//i.test(url); }

  function el(doc, tag, className, text) {
    var node = doc.createElement(tag);
    if (className) { node.className = className; }
    if (text !== undefined) { node.textContent = text; }
    return node;
  }

  function socialLinksParagraph(doc) {
    var p = el(doc, 'p', 'events-social');
    SOCIAL_LINKS.forEach(function (link, i) {
      if (i > 0) { p.appendChild(doc.createTextNode(' · ')); }
      var a = el(doc, 'a', null, link.label);
      a.href = link.href;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      p.appendChild(a);
    });
    return p;
  }

  function renderEvent(doc, ev, status, level) {
    var li = el(doc, 'li', 'event is-' + status);
    var time = el(doc, 'time', 'event-date');
    time.setAttribute('datetime', ev.start);
    time.title = formatDateLong(ev.startMs);
    time.appendChild(el(doc, 'span', 'event-day', formatDay(ev.startMs)));
    time.appendChild(el(doc, 'span', 'event-month', formatMonthShort(ev.startMs)));
    li.appendChild(time);

    var body = el(doc, 'div', 'event-body');
    var heading = el(doc, level, 'event-place', ev.city || ev.title || '');
    if (ev.venue) { heading.appendChild(el(doc, 'span', 'event-venue', ', ' + ev.venue)); }
    body.appendChild(heading);

    if (status === 'ongoing') { body.appendChild(el(doc, 'p', 'event-badge', 'Právě probíhá')); }
    else if (status === 'past') { body.appendChild(el(doc, 'p', 'event-badge', 'Proběhlo')); }

    if (ev.title && ev.city) { body.appendChild(el(doc, 'p', 'event-title', ev.title)); }
    var timeLine = el(doc, 'p', 'event-time', formatDateLong(ev.startMs) + ', ' + formatTimeRange(ev));
    body.appendChild(timeLine);
    if (ev.note) { body.appendChild(el(doc, 'p', 'event-note', ev.note)); }
    if (isSafeUrl(ev.url)) {
      var a = el(doc, 'a', 'event-link', 'Více informací');
      a.href = ev.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      body.appendChild(a);
    }
    li.appendChild(body);
    return li;
  }

  function renderList(doc, container, events, nowMs, level) {
    var ol = el(doc, 'ol', 'event-list');
    events.forEach(function (ev) { ol.appendChild(renderEvent(doc, ev, eventStatus(ev, nowMs), level)); });
    container.appendChild(ol);
  }

  function showMessage(doc, container, text, withSocial) {
    container.textContent = '';
    container.appendChild(el(doc, 'p', 'events-status', text));
    if (withSocial) { container.appendChild(socialLinksParagraph(doc)); }
  }

  function renderUpcoming(doc, container, events, nowMs) {
    var list = selectUpcoming(events, nowMs);
    container.textContent = '';
    if (list.length === 0) {
      showMessage(doc, container, 'Další koncerty právě chystáme, sledujte nás.', true);
      return;
    }
    renderList(doc, container, list, nowMs, 'h3');
  }

  function renderAll(doc, container, events, nowMs) {
    var list = selectAllDescending(events);
    container.textContent = '';
    if (list.length === 0) {
      showMessage(doc, container, 'Zatím tu nejsou žádné koncerty. Sledujte nás na sociálních sítích.', true);
      return;
    }
    groupByYear(list).forEach(function (group) {
      var section = el(doc, 'section', 'year-group');
      section.appendChild(el(doc, 'h2', 'year-heading', String(group.year)));
      renderList(doc, section, group.events, nowMs, 'h3');
      container.appendChild(section);
    });
  }

  function init(win) {
    var doc = win.document;
    var container = doc.querySelector('[data-events]');
    if (!container) { return; }
    var mode = container.getAttribute('data-events-mode') === 'all' ? 'all' : 'upcoming';
    var src = container.getAttribute('data-events-src') || 'data/events.json';
    var now = resolveNow(win.location.search, win, Date.now());
    if (now.overridden) { doc.documentElement.setAttribute('data-now-override', new Date(now.ms).toISOString()); }
    container.setAttribute('aria-busy', 'true');

    win.fetch(src, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) { throw new Error('HTTP ' + response.status); }
        return response.json();
      })
      .then(function (raw) {
        var result = normalizeEvents(raw);
        result.errors.forEach(function (message) { win.console.warn('[events] ' + message); });
        if (mode === 'all') { renderAll(doc, container, result.events, now.ms); }
        else { renderUpcoming(doc, container, result.events, now.ms); }
      })
      .catch(function (error) {
        win.console.warn('[events] could not load ' + src + ': ' + error.message);
        showMessage(doc, container, 'Seznam koncertů se nepodařilo načíst. Aktuální informace najdete na našich sociálních sítích:', true);
      })
      .then(function () { container.removeAttribute('aria-busy'); });
  }

  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function () { init(window); });
    } else {
      init(window);
    }
  }

  return {
    TIME_ZONE: TIME_ZONE,
    DEFAULT_DURATION_MS: DEFAULT_DURATION_MS,
    ALL_DAY_DURATION_MS: ALL_DAY_DURATION_MS,
    normalizeEvents: normalizeEvents,
    selectUpcoming: selectUpcoming,
    selectAllDescending: selectAllDescending,
    eventStatus: eventStatus,
    groupByYear: groupByYear,
    resolveNow: resolveNow,
    parseNowOverride: parseNowOverride,
    pragueYear: pragueYear,
    formatDay: formatDay,
    formatMonthShort: formatMonthShort,
    formatTime: formatTime,
    formatTimeRange: formatTimeRange,
    formatDateLong: formatDateLong
  };
}));
