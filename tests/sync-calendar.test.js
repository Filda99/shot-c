'use strict';
// Testy synchronizace kalendáře: node tests/sync-calendar.test.js
const assert = require('node:assert/strict');
const S = require('../scripts/sync-calendar.js');
const E = require('../assets/js/events.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log('ok   - ' + name); }
  catch (error) { console.error('FAIL - ' + name + '\n' + error.stack); process.exitCode = 1; }
}

const ICS = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'BEGIN:VTIMEZONE',
  'TZID:Europe/Prague',
  'END:VTIMEZONE',
  'BEGIN:VEVENT',
  'UID:a@google.com',
  'DTSTART;TZID=Europe/Prague:20261205T160000',
  'DTEND;TZID=Europe/Prague:20261205T170000',
  'SUMMARY:Jedovnice – adventní koncert',
  'LOCATION:Kulturní dům\\, Jedovnice',
  'DESCRIPTION:Vstupenky: https://example.com/vstupenky\\nDalší řádek',
  'BEGIN:VALARM',
  'DESCRIPTION:Upozornění',
  'END:VALARM',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:b@google.com',
  'DTSTART:20260718T080000Z',
  'DTEND:20260718T100000Z',
  'SUMMARY:Nepomyšl – léto',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:c@google.com',
  'DTSTART;VALUE=DATE:20260911',
  'DTEND;VALUE=DATE:20260913',
  'SUMMARY:Brno – festival',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:d@google.com',
  'DTSTART;TZID=Europe/Prague:20261210T190000',
  'SUMMARY:# zkouška',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:e@google.com',
  'DTSTART;TZID=Europe/Prague:20261211T190000',
  'SUMMARY:Soukromá věc',
  'CLASS:PRIVATE',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:f@google.com',
  'DTSTART;TZID=Europe/Prague:20261212T190000',
  'SUMMARY:Zrušeno',
  'STATUS:CANCELLED',
  'END:VEVENT',
  'BEGIN:VEVENT',
  'UID:g@google.com',
  'DTSTART;TZID=Europe/Prague:20261219T15',
  ' 3000',
  'SUMMARY:Blansko',
  'END:VEVENT',
  'END:VCALENDAR'
].join('\r\n');

const events = S.toEvents(S.parseIcs(ICS));
const byTitle = (t) => events.find((e) => e.title.startsWith(t));

test('timed event in Prague time zone (winter)', () => {
  const e = byTitle('Jedovnice');
  assert.equal(e.start, '2026-12-05T16:00:00+01:00');
  assert.equal(e.end, '2026-12-05T17:00:00+01:00');
  assert.equal(e.id, '2026-12-05-jedovnice-adventni-koncert');
});

test('location is unescaped, url is taken from description, alarm is ignored', () => {
  const e = byTitle('Jedovnice');
  assert.equal(e.venue, 'Kulturní dům, Jedovnice');
  assert.equal(e.url, 'https://example.com/vstupenky');
});

test('UTC time is converted to Prague summer time', () => {
  const e = byTitle('Nepomyšl');
  assert.equal(e.start, '2026-07-18T10:00:00+02:00');
  assert.equal(e.end, '2026-07-18T12:00:00+02:00');
});

test('all-day event ends at 23:59:59 of its last day (DTEND is exclusive)', () => {
  const e = byTitle('Brno');
  assert.equal(e.allDay, true);
  assert.equal(e.start, '2026-09-11T00:00:00+02:00');
  assert.equal(e.end, '2026-09-12T23:59:59+02:00');
});

test('folded line is unfolded and missing end is left out', () => {
  const e = byTitle('Blansko');
  assert.equal(e.start, '2026-12-19T15:30:00+01:00');
  assert.equal('end' in e, false);
});

test('private, cancelled and "#" events are skipped', () => {
  assert.deepEqual(events.map((e) => e.title).sort(),
    ['Blansko', 'Brno – festival', 'Jedovnice – adventní koncert', 'Nepomyšl – léto']);
});

test('output passes the website validation', () => {
  const result = E.normalizeEvents(events);
  assert.deepEqual(result.errors, []);
  assert.equal(result.events.length, events.length);
});

test('merge keeps old archive, drops past duplicates and future events not in calendar', () => {
  const existing = [
    { id: '2025-06-07-lednice', start: '2025-06-07T10:00:00+02:00', end: '2025-06-07T17:00:00+02:00', title: 'Lednice' },
    { id: '2026-07-18-nepomysl', start: '2026-07-18T00:00:00+02:00', end: '2026-07-18T23:59:59+02:00', allDay: true, title: 'Nepomyšl' },
    { id: '2026-12-31-silvestr', start: '2026-12-31T20:00:00+01:00', title: 'Silvestr' }
  ];
  const merged = S.merge(events, existing, Date.parse('2026-11-08T12:00:00+01:00'));
  const ids = merged.map((e) => e.id);
  assert.ok(ids.includes('2025-06-07-lednice'), 'archive kept');
  assert.ok(!ids.includes('2026-07-18-nepomysl'), 'same day in calendar replaces archive');
  assert.ok(!ids.includes('2026-12-31-silvestr'), 'future event not in calendar removed');
  assert.equal(ids[0], '2026-12-19-blansko', 'newest first');
});

test('not a calendar throws instead of wiping data', () => {
  assert.throws(() => S.parseIcs('<html>Přihlaste se</html>'));
});

test('secret url is cleaned up (spaces, quotes, webcal, missing https)', () => {
  const g = 'https://calendar.google.com/calendar/ical/abc%40group.calendar.google.com/private-123/basic.ics';
  assert.equal(S.normalizeUrl('  ' + g + '\n'), g);
  assert.equal(S.normalizeUrl('"' + g + '"'), g);
  assert.equal(S.normalizeUrl(g.replace('https:', 'webcal:')), g);
  assert.equal(S.normalizeUrl(g.replace('https://', '')), g);
  assert.throws(() => S.normalizeUrl('Tajná adresa ve formátu iCal'), /není platná adresa/);
});

console.log('\n' + passed + ' passed');
