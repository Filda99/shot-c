'use strict';
// Stáhne poslední videa z YouTube kanálu (veřejné RSS, bez API klíče)
// a uloží je do novy-web/data/videos.json. Spouští ho deploy workflow
// před nahráním webu, ručně: node scripts/youtube.js
// Nic necommituje. Kanál je v videos.json (pole "channel"), ID kanálu
// se zjistí samo ze stránky kanálu (nebo ho lze zadat jako "channelId").
// Shorts se přeskakují, na web jdou jen běžná videa.

const fs = require('node:fs');
const path = require('node:path');

const FILE = path.join(__dirname, '..', 'novy-web', 'data', 'videos.json');
const COUNT = 3;
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; shot-c.cz videa)',
  'Accept-Language': 'cs',
  Cookie: 'CONSENT=YES+cb; SOCS=CAI'
};

/** ID kanálu (UC…) ze stránky kanálu na YouTube. */
function parseChannelId(html) {
  const m = /"externalId":"(UC[\w-]{22})"/.exec(html) ||
    /<meta itemprop="identifier" content="(UC[\w-]{22})"/.exec(html) ||
    /channel_id=(UC[\w-]{22})/.exec(html) ||
    /"channelId":"(UC[\w-]{22})"/.exec(html);
  if (!m) { throw new Error('Na stránce kanálu chybí ID kanálu.'); }
  return m[1];
}

function decode(s) {
  return s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();
}

/** RSS (Atom) kanálu → [{ id, title, published }] od nejnovějšího. */
function parseFeed(xml) {
  if (!/<feed[\s>]/.test(xml)) { throw new Error('Stažený soubor není RSS kanálu.'); }
  const out = [];
  const re = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = re.exec(xml))) {
    const e = m[1];
    const id = /<yt:videoId>([\w-]{11})<\/yt:videoId>/.exec(e);
    const title = /<title>([\s\S]*?)<\/title>/.exec(e);
    const pub = /<published>([^<]+)<\/published>/.exec(e);
    if (!id) { continue; }
    out.push({ id: id[1], title: title ? decode(title[1]) : '', published: pub ? pub[1] : '' });
  }
  return out.sort((a, b) => Date.parse(b.published) - Date.parse(a.published));
}

async function get(url, opts) {
  return fetch(url, Object.assign({ headers: HEADERS, signal: AbortSignal.timeout(30000) }, opts));
}

/** Shorts: /shorts/ID vrací 200, běžné video přesměruje na /watch. */
async function isShort(id) {
  try {
    const res = await get('https://www.youtube.com/shorts/' + id, { method: 'HEAD', redirect: 'manual' });
    return res.status === 200;
  } catch (e) { return false; }
}

async function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  let channelId = data.channelId;
  if (!channelId) {
    if (!data.channel) { console.log('videos.json: chybí kanál, nic nedělám.'); return; }
    const res = await get(data.channel);
    if (!res.ok) { throw new Error('Stránka kanálu vrátila HTTP ' + res.status); }
    channelId = parseChannelId(await res.text());
  }
  const res = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId);
  if (!res.ok) { throw new Error('RSS kanálu vrátilo HTTP ' + res.status); }
  const all = parseFeed(await res.text());

  const videos = [];
  for (const v of all) {
    if (videos.length >= COUNT) { break; }
    if (await isShort(v.id)) { continue; }
    videos.push(v);
  }
  if (!videos.length) { throw new Error('Kanál nemá žádná videa.'); }
  const out = { channel: data.channel, channelId, videos, updated: new Date().toISOString() };
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('Videa: ' + videos.map((v) => v.title).join(' | '));
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { parseChannelId, parseFeed };
