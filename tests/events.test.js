'use strict';
// Dependency-free tests: node tests/events.test.js
// Tip: run also with other time zones to prove independence, e.g.
//   TZ=America/Los_Angeles node tests/events.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../assets/js/events.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log('ok   - ' + name); }
  catch (error) { console.error('FAIL - ' + name + '\n' + error.stack); process.exitCode = 1; }
}
const at = (iso) => Date.parse(iso);
const load = (raw) => {
  const result = E.normalizeEvents(raw);
  assert.deepEqual(result.errors, []);
  return result.events;
};
const ids = (list) => list.map((ev) => ev.id);

const sample = load([
  { id: 'past', start: '2026-11-01T17:00:00+01:00', end: '2026-11-01T18:00:00+01:00', city: 'A' },
  { id: 'soon', start: '2026-11-15T17:00:00+01:00', end: '2026-11-15T18:00:00+01:00', city: 'B' },
  { id: 'later', start: '2026-12-19T15:30:00+01:00', end: '2026-12-19T16:30:00+01:00', city: 'C' },
  { id: 'middle', start: '2026-12-05T16:00:00+01:00', end: '2026-12-05T17:00:00+01:00', city: 'D' }
]);

test('future concert is shown', () => {
  const list = E.selectUpcoming(sample, at('2026-11-10T12:00:00+01:00'));
  assert.ok(ids(list).includes('soon'));
  assert.ok(!ids(list).includes('past'));
});

test('ongoing concert is shown (start <= now <= end)', () => {
  const now = at('2026-11-15T17:30:00+01:00');
  const list = E.selectUpcoming(sample, now);
  assert.equal(list[0].id, 'soon');
  assert.equal(E.eventStatus(list[0], now), 'ongoing');
  // boundary: exactly at end still shown (end >= now)
  assert.ok(ids(E.selectUpcoming(sample, at('2026-11-15T18:00:00+01:00'))).includes('soon'));
});

test('just-finished concert disappears', () => {
  const list = E.selectUpcoming(sample, at('2026-11-15T18:00:00.001+01:00'));
  assert.ok(!ids(list).includes('soon'));
  assert.equal(E.eventStatus(sample[1], at('2026-11-15T18:00:01+01:00')), 'past');
});

test('home page order is ascending (nearest first)', () => {
  const list = E.selectUpcoming(sample, at('2026-11-02T10:00:00+01:00'));
  assert.deepEqual(ids(list), ['soon', 'middle', 'later']);
});

test('/koncerty order is descending (farthest future first, oldest last)', () => {
  assert.deepEqual(ids(E.selectAllDescending(sample)), ['later', 'middle', 'soon', 'past']);
});

test('nothing is dropped from the full list even when all are past', () => {
  assert.equal(E.selectAllDescending(sample).length, sample.length);
  assert.deepEqual(E.selectUpcoming(sample, at('2030-01-01T00:00:00+01:00')), []);
});

test('empty list gives empty results', () => {
  assert.deepEqual(E.selectUpcoming([], Date.now()), []);
  assert.deepEqual(E.selectAllDescending([]), []);
  assert.deepEqual(E.groupByYear([]), []);
  assert.deepEqual(E.normalizeEvents([]), { events: [], errors: [] });
});

test('daylight saving time switch (spring: 28 Mar 2027, autumn: 25 Oct 2026)', () => {
  const dst = load([
    { id: 'before', start: '2027-03-27T20:00:00+01:00', end: '2027-03-27T21:00:00+01:00' },
    { id: 'after', start: '2027-03-28T20:00:00+02:00', end: '2027-03-28T21:00:00+02:00' },
    { id: 'autumn-cest', start: '2026-10-24T20:00:00+02:00', end: '2026-10-24T21:00:00+02:00' },
    { id: 'autumn-cet', start: '2026-10-25T20:00:00+01:00', end: '2026-10-25T21:00:00+01:00' }
  ]);
  const byId = Object.fromEntries(dst.map((ev) => [ev.id, ev]));
  // Wall-clock time in Prague is the same on both sides of the switch ...
  assert.equal(E.formatTime(byId.before.startMs), '20:00');
  assert.equal(E.formatTime(byId.after.startMs), '20:00');
  assert.equal(E.formatTime(byId['autumn-cest'].startMs), '20:00');
  assert.equal(E.formatTime(byId['autumn-cet'].startMs), '20:00');
  assert.equal(E.formatTimeRange(byId.after), '20:00–21:00');
  // ... while the instants are 23 h apart in spring.
  assert.equal(byId.after.startMs - byId.before.startMs, 23 * 3600 * 1000);
  // Ordering and filtering follow the instant, not the wall clock.
  const now = at('2027-03-28T19:30:00+02:00');
  assert.deepEqual(ids(E.selectUpcoming(dst, now)), ['after']);
  assert.deepEqual(ids(E.selectAllDescending(dst)), ['after', 'before', 'autumn-cet', 'autumn-cest']);
});

test('formatting is independent of the browser time zone (Europe/Prague)', () => {
  const ev = load([{ id: 'x', start: '2026-11-15T17:00:00+01:00', end: '2026-11-15T18:00:00+01:00' }])[0];
  assert.equal(E.formatDay(ev.startMs), '15');
  assert.equal(E.formatMonthShort(ev.startMs), 'lis');
  assert.equal(E.formatTimeRange(ev), '17:00–18:00');
  // 00:30 Prague time on 1 Jan is still 31 Dec in UTC.
  const ny = load([{ id: 'ny', start: '2027-01-01T00:30:00+01:00', end: '2027-01-01T01:30:00+01:00' }])[0];
  assert.equal(E.pragueYear(ny.startMs), 2027);
  assert.equal(E.formatDay(ny.startMs), '1');
});

test('year grouping uses the Prague calendar year', () => {
  const list = load([
    { id: 'a', start: '2027-01-01T00:30:00+01:00', end: '2027-01-01T01:30:00+01:00' },
    { id: 'b', start: '2026-12-31T23:00:00+01:00', end: '2026-12-31T23:50:00+01:00' },
    { id: 'c', start: '2026-05-01T12:00:00+02:00', end: '2026-05-01T13:00:00+02:00' }
  ]);
  const groups = E.groupByYear(E.selectAllDescending(list));
  assert.deepEqual(groups.map((g) => g.year), [2027, 2026]);
  assert.deepEqual(groups.map((g) => ids(g.events)), [['a'], ['b', 'c']]);
});

test('missing end uses start + 2 h and shows only the start time', () => {
  const ev = load([{ id: 'n', start: '2026-11-15T17:00:00+01:00' }])[0];
  assert.equal(ev.endMs - ev.startMs, E.DEFAULT_DURATION_MS);
  assert.equal(ev.endDerived, true);
  assert.equal(E.formatTimeRange(ev), '17:00');
  assert.equal(E.eventStatus(ev, at('2026-11-15T18:59:00+01:00')), 'ongoing');
  assert.equal(E.eventStatus(ev, at('2026-11-15T19:00:01+01:00')), 'past');
});

test('all-day event without end lasts 24 h and prints "celý den"', () => {
  const ev = load([{ id: 'd', start: '2026-09-11T00:00:00+02:00', allDay: true }])[0];
  assert.equal(ev.endMs - ev.startMs, E.ALL_DAY_DURATION_MS);
  assert.equal(E.formatTimeRange(ev), 'celý den');
});

test('invalid entries are skipped or repaired and reported, never thrown', () => {
  const result = E.normalizeEvents([
    null,
    { start: '2026-11-15T17:00:00+01:00' },
    { id: 'no-offset', start: '2026-11-15T17:00:00' },
    { id: 'dup', start: '2026-11-15T17:00:00+01:00' },
    { id: 'dup', start: '2026-11-16T17:00:00+01:00' },
    { id: 'bad-end', start: '2026-11-15T17:00:00+01:00', end: '2026-11-15T16:00:00+01:00' }
  ]);
  assert.deepEqual(ids(result.events), ['dup', 'bad-end']);
  assert.equal(result.events[1].endDerived, true);
  assert.equal(result.errors.length, 5);
  assert.deepEqual(E.normalizeEvents({}).events, []);
});

test('testing hook: ?now= (also with a raw "+") and window.__NOW__', () => {
  const real = at('2026-01-01T00:00:00Z');
  const expected = at('2026-11-15T17:30:00+01:00');
  assert.deepEqual(E.resolveNow('?now=2026-11-15T17:30:00+01:00', null, real), { ms: expected, overridden: true });
  assert.deepEqual(E.resolveNow('?now=2026-11-15T17:30:00%2B01:00', null, real), { ms: expected, overridden: true });
  assert.deepEqual(E.resolveNow('?x=1&now=2026-11-15T16:30:00Z', null, real), { ms: expected, overridden: true });
  assert.deepEqual(E.resolveNow('', { __NOW__: '2026-11-15T17:30:00+01:00' }, real), { ms: expected, overridden: true });
  assert.deepEqual(E.resolveNow('?now=garbage', {}, real), { ms: real, overridden: false });
  assert.deepEqual(E.resolveNow('', {}, real), { ms: real, overridden: false });
});

test('bundled data/events.json is valid and complete', () => {
  const raw = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'events.json'), 'utf8'));
  const result = E.normalizeEvents(raw);
  assert.deepEqual(result.errors, []);
  assert.equal(result.events.length, raw.length);
  // On 2026-11-02 the three published upcoming concerts are the ones on the home page.
  const upcoming = E.selectUpcoming(result.events, at('2026-11-02T12:00:00+01:00'));
  assert.deepEqual(ids(upcoming), ['2026-11-15-praha-koncert-s-a-cappellou-intonic', '2026-12-05-jedovnice', '2026-12-19-blansko']);
  // All 75 events from the WordPress export (2022-2026), each with a title or city.
  assert.equal(raw.length, 75);
  raw.forEach((ev) => assert.ok(ev.title || ev.city, ev.id + ' has no title or city'));
});

console.log(passed + ' tests passed' + (process.exitCode ? ' (with failures)' : ''));
