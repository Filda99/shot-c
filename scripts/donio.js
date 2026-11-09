'use strict';
// Stáhne stránku sbírky na Doniu a uloží stav do novy-web/data/donio.json.
// Spouští GitHub Action .github/workflows/donio.yml, ručně: node scripts/donio.js
// Odkaz na sbírku se zadává v donio.json (pole "url"). Prázdné = nic nedělat.
// Soubor se přepíše jen když se změní částka, cíl nebo konec, ať nevznikají
// zbytečné commity.

const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'novy-web', 'data', 'donio.json');

// Donio (Next.js) posílá data projektu v RSC payloadu jako escapovaný JSON.
// Blok hlavního projektu má "currentAmountInCents", hned za ním "goalInCents"
// (podsbírky a ostatní karty mají "targetAmountInCents"), dál pak "endsAt".
function parseDonio(html) {
  const s = html.replace(/\\"/g, '"');
  const m = s.match(/"currentAmountInCents":(\d+),"goalInCents":(\d+),"numericId":\d+/);
  if (!m) { throw new Error('Na stránce chybí currentAmountInCents/goalInCents, Donio asi změnilo strukturu.'); }
  const raised = Math.round(Number(m[1]) / 100);
  const goal = Math.round(Number(m[2]) / 100);
  if (!(goal > 0)) { throw new Error('Neplatný cíl sbírky: ' + m[2]); }

  const rest = s.slice(m.index, m.index + 5000);
  const e = rest.match(/"endsAt":"([^"]*)"/);
  let end = null;
  if (e && /^\d{4}-\d{2}-\d{2}/.test(e[1]) && !Number.isNaN(Date.parse(e[1]))) {
    end = new Date(Date.parse(e[1])).toISOString();
  }
  return { raised, goal, end };
}

async function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!data.url) { console.log('donio.json: chybí url sbírky, nic nedělám.'); return; }

  const res = await fetch(data.url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; shot-c.cz stav sbirky)', 'Accept-Language': 'cs' },
    signal: AbortSignal.timeout(30000)
  });
  if (!res.ok) { throw new Error('Donio vrátilo HTTP ' + res.status); }
  const next = parseDonio(await res.text());

  if (next.raised === data.raised && next.goal === data.goal && next.end === data.end) {
    console.log('Beze změny: ' + next.raised + ' z ' + next.goal + ' Kč.');
    return;
  }
  const out = { url: data.url, raised: next.raised, goal: next.goal, end: next.end, updated: new Date().toISOString() };
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('Aktualizováno: ' + next.raised + ' z ' + next.goal + ' Kč, konec ' + (next.end || 'neuveden') + '.');
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { parseDonio };
