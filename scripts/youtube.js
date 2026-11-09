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

/** Stránka kanálu /videos → [{ id, title }] v pořadí od nejnovějšího (bez Shorts). */
function parseVideosPage(html) {
  const m = /ytInitialData\s*=\s*(\{[\s\S]*?\});\s*<\/script>/.exec(html);
  if (!m) { throw new Error('Na stránce kanálu chybí ytInitialData.'); }
  const data = JSON.parse(m[1]);
  const out = [];
  const seen = new Set();
  const text = (t) => (t ? t.simpleText || t.content || (t.runs || []).map((r) => r.text).join('') : '');
  (function walk(node) {
    if (!node || typeof node !== 'object') { return; }
    if (Array.isArray(node)) { node.forEach(walk); return; }
    const vr = node.videoRenderer;
    if (vr && /^[\w-]{11}$/.test(vr.videoId || '') && !seen.has(vr.videoId)) {
      seen.add(vr.videoId);
      out.push({ id: vr.videoId, title: text(vr.title) });
      return;
    }
    const lk = node.lockupViewModel;
    if (lk && /VIDEO/.test(lk.contentType || '') && /^[\w-]{11}$/.test(lk.contentId || '') && !seen.has(lk.contentId)) {
      seen.add(lk.contentId);
      const meta = lk.metadata && lk.metadata.lockupMetadataViewModel;
      out.push({ id: lk.contentId, title: meta ? text(meta.title) : '' });
      return;
    }
    Object.keys(node).forEach((k) => walk(node[k]));
  })(data);
  return out;
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

async function fromPage(channel) {
  const res = await get(channel.replace(/\/+$/, '') + '/videos');
  if (!res.ok) { throw new Error('Stránka kanálu vrátila HTTP ' + res.status); }
  return parseVideosPage(await res.text());
}

async function fromFeed(data) {
  let channelId = data.channelId;
  if (!channelId) {
    const res = await get(data.channel);
    if (!res.ok) { throw new Error('Stránka kanálu vrátila HTTP ' + res.status); }
    channelId = parseChannelId(await res.text());
  }
  console.log('ID kanálu: ' + channelId);
  const res = await get('https://www.youtube.com/feeds/videos.xml?channel_id=' + channelId);
  if (!res.ok) { throw new Error('RSS kanálu vrátilo HTTP ' + res.status); }
  const videos = [];
  for (const v of parseFeed(await res.text())) {
    if (videos.length >= COUNT) { break; }
    if (!(await isShort(v.id))) { videos.push(v); }
  }
  return videos;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  if (!data.channel && !data.channelId) { console.log('videos.json: chybí kanál, nic nedělám.'); return; }

  // 1) záložka Videa na kanálu (bez Shorts), 2) záložně RSS kanálu
  let videos = [];
  if (data.channel) {
    try { videos = await fromPage(data.channel); } catch (e) { console.log('Stránka kanálu: ' + e.message); }
  }
  if (!videos.length) {
    try { videos = await fromFeed(data); } catch (e) { console.log('RSS: ' + e.message); }
  }
  videos = videos.slice(0, COUNT);
  if (!videos.length) { throw new Error('Videa se nepodařilo načíst.'); }
  const out = Object.assign({}, data, { videos, updated: new Date().toISOString() });
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2) + '\n');
  console.log('Videa: ' + videos.map((v) => v.title).join(' | '));
}

if (require.main === module) {
  main().catch((err) => { console.error(err.message); process.exit(1); });
}

module.exports = { parseChannelId, parseFeed, parseVideosPage };
