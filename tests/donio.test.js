'use strict';
// node tests/donio.test.js
const assert = require('node:assert/strict');
const { parseDonio } = require('../scripts/donio.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log('ok   - ' + name); }
  catch (error) { console.error('FAIL - ' + name + '\n' + error.stack); process.exitCode = 1; }
}

// Výřez ze skutečné stránky donio.cz (escapovaný RSC payload), zkrácený.
const card = '{\\"title\\":\\"Výzva\\",\\"currentAmountInCents\\":480000,\\"targetAmountInCents\\":10000000,\\"donationsCount\\":5}';
const main = (ends) => '{\\"donationsCount\\":403,\\"isCommercial\\":false,\\"title\\":\\"Podpořme Zoiku\\",' +
  '\\"currentAmountInCents\\":46031000,\\"goalInCents\\":120000000,\\"numericId\\":26822,' +
  '\\"coverImage\\":{\\"small\\":\\"https://static.donio.cz/x.webp\\"},\\"endsAt\\":' + ends + ',\\"isProjectLongTerm\\":true}';

test('vezme částku a cíl hlavního projektu, ne podsbírky', () => {
  const r = parseDonio('<html>' + card + main('\\"$undefined\\"') + '</html>');
  assert.deepEqual(r, { raised: 460310, goal: 1200000, end: null });
});

test('přečte konec sbírky', () => {
  const r = parseDonio(main('\\"2026-12-15T22:59:00.000+00:00\\"'));
  assert.equal(r.end, '2026-12-15T22:59:00.000Z');
});

test('neznámá struktura vyhodí chybu', () => {
  assert.throws(() => parseDonio('<html>' + card + '</html>'), /strukturu/);
});

console.log(passed + ' passed');
