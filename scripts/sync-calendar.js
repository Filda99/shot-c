'use strict';
/*
 * Stáhne kalendář koncertů (iCal / .ics) a přepíše data/events.json
 * i novy-web/data/events.json. Spouští ho GitHub Action každou hodinu.
 *
 *   CALENDAR_ICS_URL=https://... node scripts/sync-calendar.js
 *
 * Pravidla:
 * - Kalendář je zdroj pravdy pro všechno, co v něm je (minulé i budoucí akce).
 * - Starší koncerty, které v kalendáři nejsou, zůstanou v archivu (pokud
 *   ten den v kalendáři nic není).
 * - Přeskočí se zrušené akce (STATUS:CANCELLED), soukromé (CLASS:PRIVATE
 *   nebo CONFIDENTIAL) a akce, jejichž název začíná „#“ (např. „# zkouška“).
 * - Opakované akce (RRULE) se berou jen jako první výskyt.
 * - Když se kalendář nepodaří stáhnout nebo to není iCal, nic se nezmění.
 *
 * Bez závislostí, Node 18+.
 */
const fs = require('node:fs');
const path = require('node:path');

const TZ = 'Europe/Prague';
const FILES = ['data/events.json', 'novy-web/data/events.json'];

/* ---------- čas ---------- */

function pad(n) { return String(n).padStart(2, '0'); }

/** Posun časového pásma tz v minutách v okamžiku ms (např. 60 pro +01:00). */
function offsetMinutes(ms, tz) {
  const parts = {};
  new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).formatToParts(new Date(ms)).forEach((p) => { parts[p.type] = p.value; });
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return Math.round((asUtc - Math.floor(ms / 1000) * 1000) / 60000);
}

/** Místní čas v pásmu tz → UTC milisekundy. */
function zonedToUtc(y, mo, d, h, mi, s, tz) {
  const naive = Date.UTC(y, mo - 1, d, h, mi, s);
  let guess = naive;
  for (let i = 0; i < 3; i += 1) { guess = naive - offsetMinutes(guess, tz) * 60000; }
  return guess;
}

/** UTC milisekundy → ISO 8601 s offsetem v Praze, např. 2026-12-05T16:00:00+01:00. */
function toPragueIso(ms) {
  const off = offsetMinutes(ms, TZ);
  const local = new Date(ms + off * 60000);
  const sign = off >= 0 ? '+' : '-';
  const abs = Math.abs(off);
  return local.getUTCFullYear() + '-' + pad(local.getUTCMonth() + 1) + '-' + pad(local.getUTCDate()) +
    'T' + pad(local.getUTCHours()) + ':' + pad(local.getUTCMinutes()) + ':' + pad(local.getUTCSeconds()) +
    sign + pad(Math.floor(abs / 60)) + ':' + pad(abs % 60);
}

function isValidTz(tz) {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true; } catch (e) { return false; }
}

/* ---------- iCal ---------- */

function unescapeText(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();
}

/** Rozbalí zalomené řádky a rozdělí kalendář na VEVENTy (pole vlastností). */
function parseIcs(text) {
  if (!/BEGIN:VCALENDAR/.test(text)) { throw new Error('Stažený soubor není iCal kalendář.'); }
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const events = [];
  let cur = null;
  let depth = 0; // vnořené bloky uvnitř VEVENT (VALARM) přeskočíme
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; depth = 0; continue; }
    if (!cur) { continue; }
    if (line === 'END:VEVENT') { events.push(cur); cur = null; continue; }
    if (line.startsWith('BEGIN:')) { depth += 1; continue; }
    if (line.startsWith('END:')) { depth -= 1; continue; }
    if (depth > 0) { continue; }
    const colon = line.indexOf(':');
    if (colon < 1) { continue; }
    const head = line.slice(0, colon).split(';');
    const name = head[0].toUpperCase();
    const params = {};
    head.slice(1).forEach((p) => {
      const eq = p.indexOf('=');
      if (eq > 0) { params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, ''); }
    });
    if (!(name in cur)) { cur[name] = { value: line.slice(colon + 1), params }; }
  }
  return events;
}

/** DTSTART/DTEND → { ms, allDay } */
function parseDate(prop) {
  const v = prop.value.trim();
  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(v);
  if (m || prop.params.VALUE === 'DATE') {
    m = m || /^(\d{4})(\d{2})(\d{2})/.exec(v);
    return { allDay: true, y: +m[1], mo: +m[2], d: +m[3], ms: zonedToUtc(+m[1], +m[2], +m[3], 0, 0, 0, TZ) };
  }
  m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/.exec(v);
  if (!m) { throw new Error('Neznámý formát data: ' + v); }
  const n = m.slice(1, 7).map(Number);
  if (m[7] === 'Z') { return { allDay: false, ms: Date.UTC(n[0], n[1] - 1, n[2], n[3], n[4], n[5]) }; }
  const tz = prop.params.TZID && isValidTz(prop.params.TZID) ? prop.params.TZID : TZ;
  return { allDay: false, ms: zonedToUtc(n[0], n[1], n[2], n[3], n[4], n[5], tz) };
}

function slug(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'akce';
}

function pragueDay(ms) { return toPragueIso(ms).slice(0, 10); }

/** VEVENTy → záznamy ve formátu events.json. */
function toEvents(vevents) {
  const out = [];
  const used = {};
  vevents.forEach((ev) => {
    const title = ev.SUMMARY ? unescapeText(ev.SUMMARY.value) : '';
    if (!ev.DTSTART || !title || title.startsWith('#')) { return; }
    if (ev.STATUS && /CANCELLED/i.test(ev.STATUS.value)) { return; }
    if (ev.CLASS && /PRIVATE|CONFIDENTIAL/i.test(ev.CLASS.value)) { return; }

    const start = parseDate(ev.DTSTART);
    const item = { id: '', start: '', end: '', title };
    if (start.allDay) {
      let last = start; // DTEND u celodenní akce je den PO konci
      if (ev.DTEND) {
        const e = parseDate(ev.DTEND);
        const lastMs = e.ms - 12 * 3600000; // den před DTEND (bezpečně přes změnu času)
        if (lastMs > start.ms) { last = { ms: lastMs }; }
      }
      const endDay = pragueDay(last.ms).split('-').map(Number);
      item.start = toPragueIso(start.ms);
      item.end = toPragueIso(zonedToUtc(endDay[0], endDay[1], endDay[2], 23, 59, 59, TZ));
      item.allDay = true;
    } else {
      item.start = toPragueIso(start.ms);
      if (ev.DTEND) {
        const e = parseDate(ev.DTEND);
        if (e.ms >= start.ms) { item.end = toPragueIso(e.ms); }
      }
    }
    if (!item.end) { delete item.end; }

    if (ev.LOCATION) {
      const venue = unescapeText(ev.LOCATION.value);
      if (venue) { item.venue = venue; }
    }
    let url = ev.URL ? ev.URL.value.trim() : '';
    if (!url && ev.DESCRIPTION) {
      const m = /https?:\/\/[^\s<>"\\]+/.exec(unescapeText(ev.DESCRIPTION.value));
      if (m) { url = m[0]; }
    }
    if (/^https?:\/\//.test(url)) { item.url = url; }

    let id = pragueDay(start.ms) + '-' + slug(title);
    if (used[id]) { used[id] += 1; id += '-' + used[id]; } else { used[id] = 1; }
    item.id = id;
    out.push(item);
  });
  return out;
}

/** Spojí kalendář s archivem: staré akce bez náhrady v kalendáři zůstanou. */
function merge(calendarEvents, existing, nowMs) {
  const calDays = new Set(calendarEvents.map((e) => e.start.slice(0, 10)));
  const calIds = new Set(calendarEvents.map((e) => e.id));
  const archive = existing.filter((e) => {
    const end = Date.parse(e.end || e.start);
    return end < nowMs && !calIds.has(e.id) && !calDays.has(String(e.start).slice(0, 10));
  });
  return calendarEvents.concat(archive)
    .sort((a, b) => Date.parse(b.start) - Date.parse(a.start));
}

/* ---------- spuštění ---------- */

/**
 * Očistí adresu ze secretu: ořízne mezery, uvozovky a <>, webcal: → https:,
 * doplní chybějící https://. Když to ani tak není adresa, vysvětlí proč
 * (bez vypsání samotné adresy, ta je tajná).
 */
function normalizeUrl(raw) {
  let u = String(raw).trim().replace(/^["'<]+|["'>]+$/g, '').trim();
  u = u.replace(/^webcal:\/\//i, 'https://');
  if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(u)) { u = 'https://' + u; }
  let parsed;
  try { parsed = new URL(u); } catch (e) {
    const hints = [];
    if (/\s/.test(u)) { hints.push('obsahuje mezeru nebo nový řádek uprostřed'); }
    if (!/\./.test(u)) { hints.push('nevypadá jako webová adresa'); }
    throw new Error('Secret CALENDAR_ICS_URL není platná adresa (' + (hints.join(', ') || 'neznámý formát') +
      ', délka ' + u.length + ' znaků). Má vypadat jako https://calendar.google.com/calendar/ical/…/basic.ics');
  }
  if (!/\.ics($|\?)/i.test(parsed.pathname + parsed.search) && !/ical/i.test(parsed.pathname)) {
    console.log('Upozornění: adresa nekončí na .ics, zkontroluj, že je to iCal adresa kalendáře.');
  }
  return parsed.href;
}

async function main() {
  const url = process.env.CALENDAR_ICS_URL;
  if (!url) {
    console.log('CALENDAR_ICS_URL není nastavená, nic nedělám.');
    return;
  }
  const res = await fetch(normalizeUrl(url));
  if (!res.ok) { throw new Error('Kalendář se nepodařilo stáhnout: HTTP ' + res.status); }
  const calendar = toEvents(parseIcs(await res.text()));
  console.log('Veřejných akcí v kalendáři: ' + calendar.length);

  const root = path.join(__dirname, '..');
  FILES.forEach((rel) => {
    const file = path.join(root, rel);
    if (!fs.existsSync(file)) { return; }
    const existing = JSON.parse(fs.readFileSync(file, 'utf8'));
    const merged = merge(calendar, existing, Date.now());
    fs.writeFileSync(file, JSON.stringify(merged, null, 2) + '\n');
    console.log(rel + ': ' + merged.length + ' koncertů.');
  });
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { normalizeUrl, parseIcs, toEvents, merge, toPragueIso, zonedToUtc, offsetMinutes };
