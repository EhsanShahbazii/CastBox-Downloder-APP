import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CatalogClient, catalogResult } from '../desktop/catalog/client';

const response = (data: unknown, code = 0) => new Response(JSON.stringify({ code, data }), { headers: { 'content-type': 'application/json' } });
const transport = (handler: (url: URL, options: RequestInit) => Promise<Response> | Response): typeof fetch =>
  (async (url, options) => handler(new URL(String(url)), options ?? {})) as typeof fetch;

test('suggestions send bounded encoded queries without credentials and deduplicate channels', async () => {
  const client = new CatalogClient(transport((url, options) => {
    assert.equal(url.origin, 'https://everest.castbox.fm');
    assert.equal(url.searchParams.get('keyword'), 'tea & coffee');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.deepEqual(options.headers, { Accept: 'application/json', 'X-Web': 'true' });
    return response([{ cid: 12, keyword: 'Tea' }, { cid: 12, keyword: 'Duplicate' }, { cid: 13, keyword: 'Coffee' }]);
  }));
  assert.deepEqual(await client.suggestions({ keyword: ' tea & coffee ', limit: 1 }), [{ channelId: '12', keyword: 'Tea' }]);
});

test('bad inputs are rejected before any network request', async () => {
  const client = new CatalogClient(transport(() => { throw new Error('Must not fetch'); }));
  for (const input of [{ episodeId: '../secret' }, { episodeId: '1', url: 'https://evil.example' }, { episodeId: '0' }]) {
    const result = await catalogResult(() => client.episode(input));
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.code, 'INVALID_INPUT');
  }
});

test('episode normalization preserves units, unknown values and omits raw media URLs', async () => {
  const client = new CatalogClient(transport(() => response({ eid: 42, cid: 5, title: 'Episode', duration: 186000, size: null,
    url: 'https://media.example/audio.mp3?token=secret', cover_url: 'javascript:alert(1)', release_date: 'invalid' })));
  const episode = await client.episode({ episodeId: '42' });
  assert.equal(episode.durationMs, 186000);
  assert.equal(episode.sizeBytes, null);
  assert.equal(episode.publishedAt, null);
  assert.equal(episode.artworkUrl, null);
  assert.equal(episode.hasMediaSource, true);
  assert.equal(JSON.stringify(episode).includes('secret'), false);
});

test('episode index preserves ordering, removes duplicates and retains unknown dates', async () => {
  const client = new CatalogClient(transport(() => response([{ cid: 5, episode_list: [{ eid: 42 }, { eid: 42 }, { eid: 43, release_date: '2025-05-30T11:16:17Z' }] }])));
  assert.deepEqual(await client.episodeIndex({ channelId: '5' }), [{ id: '42', publishedAt: null }, { id: '43', publishedAt: '2025-05-30T11:16:17.000Z' }]);
});

for (const [status, code] of [[401, 'ACCESS_REQUIRED'], [403, 'ACCESS_REQUIRED'], [404, 'NOT_FOUND'], [429, 'RATE_LIMITED'], [503, 'SERVICE_ERROR']] as const) {
  test(`HTTP ${status} produces ${code}, with no response-body leak`, async () => {
    const client = new CatalogClient(transport(() => new Response('private response', { status })));
    const result = await catalogResult(() => client.episode({ episodeId: '42' }));
    assert.equal(result.ok, false);
    if (!result.ok) { assert.equal(result.code, code); assert.equal(result.error.includes('private'), false); }
  });
}

test('malformed JSON, wrong identities, non-JSON, oversized data and service errors fail explicitly', async () => {
  const cases: [() => Response, string][] = [
    [() => new Response('{bad', { headers: { 'content-type': 'application/json' } }), 'INVALID_RESPONSE'],
    [() => response({ eid: 43, cid: 5, title: 'Wrong' }), 'INVALID_RESPONSE'],
    [() => new Response('<html>error</html>'), 'INVALID_RESPONSE'],
    [() => new Response('x'.repeat(4 * 1024 * 1024 + 1), { headers: { 'content-type': 'application/json' } }), 'INVALID_RESPONSE'],
    [() => response(null, 9), 'SERVICE_ERROR'],
    [() => response({ eid: 42 }), 'INVALID_RESPONSE'],
  ];
  for (const [factory, code] of cases) {
    const result = await catalogResult(() => new CatalogClient(transport(factory)).episode({ episodeId: '42' }));
    assert.equal(result.ok, false); if (!result.ok) assert.equal(result.code, code);
  }
});

test('network errors and timeouts never return fixture data', async () => {
  const disconnected = new CatalogClient(transport(() => { throw new Error('internal private detail'); }));
  const result = await catalogResult(() => disconnected.episode({ episodeId: '42' }));
  assert.equal(result.ok, false); if (!result.ok) assert.equal(result.code, 'NETWORK');
  const slow = new CatalogClient(transport((_url, options) => new Promise((_resolve, reject) => {
    options.signal!.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
  })), 10);
  const timed = await catalogResult(() => slow.episode({ episodeId: '42' }));
  assert.equal(timed.ok, false); if (!timed.ok) assert.equal(timed.code, 'TIMEOUT');
});

test('user access tokens are passed in request headers when configured', async () => {
  let capturedHeaders: Record<string, string> | undefined;
  const client = new CatalogClient(
    transport((_url, options) => {
      capturedHeaders = options.headers as Record<string, string>;
      return response([{ cid: 99, keyword: 'Auth' }]);
    }),
    10_000,
    () => ({ token: 'mock-jwt-token', secret: 'mock-secret' })
  );
  await client.suggestions({ keyword: 'test', limit: 1 });
  assert.equal(capturedHeaders?.['x-access-token'], 'mock-jwt-token');
  assert.equal(capturedHeaders?.['x-access-token-secret'], 'mock-secret');
});
