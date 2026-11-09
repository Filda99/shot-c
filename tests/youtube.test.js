'use strict';
// Testy načítání videí z YouTube: node tests/youtube.test.js
const assert = require('node:assert/strict');
const Y = require('../scripts/youtube.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed += 1; console.log('ok   - ' + name); }
  catch (error) { console.error('FAIL - ' + name + '\n' + error.stack); process.exitCode = 1; }
}

const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns="http://www.w3.org/2005/Atom">
 <title>Shot-C</title>
 <entry><id>yt:video:AAAAAAAAAAA</id><yt:videoId>AAAAAAAAAAA</yt:videoId>
  <title>Starší &amp; lepší</title><published>2024-03-01T10:00:00+00:00</published></entry>
 <entry><id>yt:video:BBBBBBBBB-_</id><yt:videoId>BBBBBBBBB-_</yt:videoId>
  <title>Sound of Silence (live)</title><published>2025-05-01T10:00:00+00:00</published></entry>
</feed>`;

test('feed is parsed, newest first, entities decoded', () => {
  const v = Y.parseFeed(FEED);
  assert.deepEqual(v.map((x) => x.id), ['BBBBBBBBB-_', 'AAAAAAAAAAA']);
  assert.equal(v[1].title, 'Starší & lepší');
});

test('not a feed throws instead of wiping data', () => {
  assert.throws(() => Y.parseFeed('<html>consent</html>'));
});

test('channel id is found on the channel page', () => {
  const id = 'UC' + 'x'.repeat(21) + 'Y';
  assert.equal(Y.parseChannelId('<script>{"externalId":"' + id + '"}</script>'), id);
  assert.equal(Y.parseChannelId('<link href="https://www.youtube.com/feeds/videos.xml?channel_id=' + id + '">'), id);
  assert.throws(() => Y.parseChannelId('<html></html>'));
});

test('videos tab is parsed (old and new YouTube layout), in page order', () => {
  const data = { contents: { tabs: [{ items: [
    { richItemRenderer: { content: { videoRenderer: { videoId: 'CCCCCCCCCCC', title: { runs: [{ text: 'Nejnovější' }] } } } } },
    { richItemRenderer: { content: { lockupViewModel: { contentId: 'DDDDDDDDDDD', contentType: 'LOCKUP_CONTENT_TYPE_VIDEO',
      metadata: { lockupMetadataViewModel: { title: { content: 'Druhé "video"' } } } } } } },
    { richItemRenderer: { content: { videoRenderer: { videoId: 'CCCCCCCCCCC', title: { simpleText: 'duplicita' } } } } }
  ] }] } };
  const html = '<script>var ytInitialData = ' + JSON.stringify(data) + ';</script>';
  assert.deepEqual(Y.parseVideosPage(html), [
    { id: 'CCCCCCCCCCC', title: 'Nejnovější' },
    { id: 'DDDDDDDDDDD', title: 'Druhé "video"' }
  ]);
  assert.throws(() => Y.parseVideosPage('<html>consent</html>'));
});

console.log('\n' + passed + ' passed');
