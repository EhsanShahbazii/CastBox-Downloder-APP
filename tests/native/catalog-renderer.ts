import type { DesktopBridge } from '../../shared/desktop';
declare global { interface Window { castboxDesktop?: DesktopBridge } }

async function run() {
  const api = window.castboxDesktop?.catalog;
  if (!api) throw new Error('Production preload did not expose catalog');
  if ('require' in window || 'process' in window) throw new Error('Renderer Node isolation failed');
  if (location.search === '?untrusted') {
    const result = await api.channel({ channelId: '5439580' });
    if (result.ok || result.error !== 'Request denied.') throw new Error('Untrusted window was allowed');
    return ['untrusted-window-denied'];
  }
  const passed: string[] = [];
  const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
    if (!result.ok) throw new Error(result.error); return result.value;
  };
  const search = unwrap(await api.search({ keyword: 'coffee', limit: 2 }));
  if (search.channels.length !== 2 || search.nextOffset !== 2) throw new Error('First search page invalid');
  const second = unwrap(await api.search({ keyword: 'coffee', limit: 2, offset: 2 }));
  if (!second.channels.length || search.channels.map(x => x.id).join() === second.channels.map(x => x.id).join()) throw new Error('Search pagination did not advance');
  passed.push('search-and-pagination');
  if (!unwrap(await api.suggestions({ keyword: 'coffee', limit: 3 })).length) throw new Error('No suggestions');
  passed.push('suggestions');
  const channel = unwrap(await api.channel({ channelId: '5439580' }));
  if (channel.id !== '5439580') throw new Error('Wrong channel');
  passed.push('channel');
  if (search.channels[0].artworkUrl) {
    const artwork = unwrap(await api.artwork({ url: search.channels[0].artworkUrl }));
    if (!artwork.startsWith('data:image/')) throw new Error('Native artwork was not an image');
    passed.push('native-artwork');
  }
  if ((await api.artwork({ url: 'https://127.0.0.1/private' })).ok) throw new Error('Unsafe artwork allowed');
  passed.push('unsafe-artwork-denied');
  const index = unwrap(await api.episodeIndex({ channelId: channel.id }));
  if (index.length < 2) throw new Error('Index missing');
  passed.push('episode-index');
  const ids = index.slice(0, 2).map(x => x.id);
  const batch = unwrap(await api.episodes({ channelId: channel.id, episodeIds: ids }));
  if (batch.missingIds.length || batch.episodes.map(x => x.id).join() !== ids.join()) throw new Error('Batch mismatch');
  passed.push('episode-batch');
  if (unwrap(await api.episode({ episodeId: ids[0] })).id !== ids[0]) throw new Error('Episode mismatch');
  passed.push('episode');
  const invalid = await api.episode({ episodeId: '../invalid' });
  if (invalid.ok || invalid.code !== 'INVALID_INPUT') throw new Error('Invalid input not rejected');
  passed.push('invalid-input-rejected', 'renderer-node-isolation');
  return passed;
}
run().then(checks => console.log('CASTBOX_TEST:' + JSON.stringify({ ok: true, checks })))
  .catch(error => console.log('CASTBOX_TEST:' + JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Native test failed' })));
