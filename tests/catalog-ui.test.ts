import test from 'node:test';
import assert from 'node:assert/strict';
import { LatestRequest, parseQuery, pageIds, episodeModel, channelModel, plainText, value } from '../ai-studio-frontend/src/catalog/model';
import { ArtworkLoader, artworkUrl } from '../desktop/catalog/artwork';

test('Castbox links resolve IDs without requesting arbitrary URLs', () => {
  assert.deepEqual(parseQuery(' coffee '), { kind: 'search', keyword: 'coffee' });
  assert.deepEqual(parseQuery('https://castbox.fm/channel/Just-Coffee-id2077029?country=us'), { kind: 'channel', id: '2077029' });
  assert.deepEqual(parseQuery('https://castbox.fm/episode/Blue-Hour-id2077029-id724086393'), { kind: 'episode', id: '724086393' });
  for (const link of ['https://castbox.fm.evil.test/channel/Foo-id1', 'https://user@castbox.fm/channel/Foo-id1', 'https://castbox.fm/x/abc', 'https://127.0.0.1/channel/Foo-id1', 'https://castbox.fm/episode/Foo-id1', ' ']) assert.throws(() => parseQuery(link));
});
test('metadata preserves unknown values, converts milliseconds and renders descriptions as text', () => {
  const channel = channelModel({ id: '1', title: 'Coffee &amp; Tea', author: '', description: '<p>Hello</p>', artworkUrl: null, episodeCount: null });
  assert.equal(channel.title, 'Coffee & Tea'); assert.equal(channel.episodeCountUnknown, true);
  const episode = episodeModel({ id: '2', channelId: '1', title: 'Episode', author: '', description: '<script>alert(1)</script><p>Hello &lt;world&gt;</p>', artworkUrl: null, publishedAt: null, durationMs: null, sizeBytes: null, hasMediaSource: false, channel: null }, channel);
  assert.equal(episode.synopsis, 'Hello <world>'); assert.equal(episode.durationFormatted, '—'); assert.equal(episode.fileSizeFormatted, '—'); assert.equal(episode.isSourceUnavailable, true);
  assert.equal(episodeModel({ id: '2', channelId: '1', title: '', author: '', description: '', artworkUrl: null, publishedAt: null, durationMs: 217000, sizeBytes: 1048576, hasMediaSource: true, channel: null }).durationFormatted, '3:37');
  assert.equal(plainText('&#x1f600; &#99999999;'), '😀');
});
test('late success and late failure cannot overwrite later search or cancelled navigation', async () => {
  const gate = new LatestRequest(); const first = gate.begin();
  let resolve!: (v: string) => void;
  const pending = new Promise<string>(r => { resolve = r; }); let display = '';
  const old = pending.then(text => { if (first()) display = text; });
  const second = gate.begin(); if (second()) display = 'new'; resolve('stale'); await old;
  assert.equal(display, 'new'); gate.cancel(); assert.equal(second(), false);
  assert.throws(() => value({ ok: false, code: 'ACCESS_REQUIRED', error: 'Access denied' }), /ACCESS_REQUIRED/);
});
test('pagination is chronological, bounded and does not mutate the full selection index', () => {
  const index = Array.from({ length: 25 }, (_, i) => ({ id: String(i + 1), publishedAt: new Date(2020, 0, i + 1).toISOString() }));
  assert.deepEqual(pageIds(index, 1), ['25','24','23','22','21','20','19','18','17','16']);
  assert.equal(pageIds(index, 3).length, 5); assert.equal(pageIds(index, 1, true)[0], '1'); assert.equal(index[0].id, '1');
});
test('artwork blocks arbitrary hosts, local addresses, credentials and non-HTTPS before transport', async () => {
  let calls = 0; const loader = new ArtworkLoader(async () => { calls++; return new Response(); });
  for (const url of ['http://s3.castbox.fm/a', 'https://127.0.0.1/a', 'https://s3.castbox.fm.evil.test/a', 'https://user@s3.castbox.fm/a', 'https://s3.castbox.fm:444/a']) await assert.rejects(loader.load({ url }));
  assert.equal(calls, 0); assert.equal(artworkUrl({ url: 'https://is1-ssl.mzstatic.com/a' }).hostname, 'is1-ssl.mzstatic.com');
});
test('artwork refuses redirects and active formats, bounds bytes and returns image data only', async () => {
  const input = { url: 'https://s3.castbox.fm/a' };
  const good = new ArtworkLoader(async (_url, options) => { assert.equal(options?.redirect, 'error'); assert.equal(options?.credentials, 'omit'); return new Response(new Uint8Array([1,2]), { headers: { 'content-type': 'image/png' } }); });
  assert.equal(await good.load(input), 'data:image/png;base64,AQI=');
  for (const response of [new Response('<svg/>', { headers: { 'content-type': 'image/svg+xml' } }), new Response('', { status: 302 }), new Response(new Uint8Array(1048577), { headers: { 'content-type': 'image/jpeg' } })]) {
    await assert.rejects(new ArtworkLoader(async () => response).load(input));
  }
});
