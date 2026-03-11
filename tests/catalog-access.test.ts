import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { webQuery } from '../desktop/catalog/web-query';
import { CatalogClient, catalogResult } from '../desktop/catalog/client';

test('public web query uses sorted decoded values and the current UTC day', () => {
  const now = new Date('2026-10-08T23:59:59Z');
  const query = webQuery({ keyword: 'tea & قهوه', limit: '2' }, now);
  const digest = createHash('md5').update('keyword=tea & قهوه&limit=2&r=1&web=1evst20261008').digest('hex');
  const expected = [24,13,4,19,6,0,8,21,25,7,28,1,15,31,10,9,17,18,22,11,27,23,2,26,12,5,29,14,20,30,16,3].map(i => digest[i]).join('');
  assert.equal(query.get('n'), expected);
  assert.equal(query.get('m'), '20261008');
  assert.equal(new URLSearchParams(query.toString()).get('keyword'), 'tea & قهوه');
  assert.equal(webQuery({ limit: '2', keyword: 'tea & قهوه' }, now).get('n'), query.get('n'));
  assert.notEqual(query.get('n'), webQuery({ keyword: 'tea & قهوه', limit: '2' }, new Date('2026-10-09T00:00:00Z')).get('n'));
});

function client(data: unknown, inspect?: (url: URL) => void) {
  return new CatalogClient((async url => {
    inspect?.(new URL(String(url)));
    return new Response(JSON.stringify({ code: 0, data }), { headers: { 'content-type': 'application/json' } });
  }) as typeof fetch);
}
test('search uses offset pagination and strips account data from channel DTOs', async () => {
  const result = await client({ channel_list: [{ cid: 1, title: 'A', user_info: { email: 'private@example.com' }, https_cover_url: 'https://example.com/art.jpg' }, { cid: 2, title: 'B' }] }, url => {
    assert.equal(url.searchParams.get('skip'), '4');
    assert.equal(url.searchParams.get('order'), 'relevance');
    assert.match(url.searchParams.get('n')!, /^[a-f0-9]{32}$/);
  }).search({ keyword: 'coffee', offset: 4, limit: 2 });
  assert.equal(result.nextOffset, 6);
  assert.equal(result.channels[0].episodeCount, null);
  assert.equal(JSON.stringify(result).includes('private@example.com'), false);
  assert.equal((await client({ channel_list: [] }).search({ keyword: 'none' })).nextOffset, null);
});
test('batch returns requested order and explicit missing IDs; unrelated items are rejected', async () => {
  const result = await client({ cid: 5, episode_list: [{ cid: 5, eid: 2, title: 'Two' }, { cid: 5, eid: 1, title: 'One' }] })
    .episodes({ channelId: '5', episodeIds: ['1', '2', '3', '1'] });
  assert.deepEqual(result.episodes.map(e => e.id), ['1', '2']);
  assert.deepEqual(result.missingIds, ['3']);
  const bad = await catalogResult(() => client({ cid: 5, episode_list: [{ cid: 6, eid: 1, title: 'Wrong' }] }).episodes({ channelId: '5', episodeIds: ['1'] }));
  assert.equal(bad.ok, false); if (!bad.ok) assert.equal(bad.code, 'INVALID_RESPONSE');
});
test('channel identity and batch limits are enforced', async () => {
  const wrong = await catalogResult(() => client({ cid: 2, title: 'Wrong' }).channel({ channelId: '1' }));
  assert.equal(wrong.ok, false);
  const tooMany = await catalogResult(() => client(null).episodes({ channelId: '1', episodeIds: Array(51).fill('2') }));
  assert.equal(tooMany.ok, false); if (!tooMany.ok) assert.equal(tooMany.code, 'INVALID_INPUT');
});
