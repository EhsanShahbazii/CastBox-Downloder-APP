import { CatalogClient, catalogResult } from '../desktop/catalog/client';

// Explicit opt-in live test. Output is summaries only, never raw responses or URLs.
const client = new CatalogClient();
let failed = false;
let ids: string[] = [];
const operations: Array<[string, () => Promise<unknown>]> = [
  ['search', () => client.search({ keyword: 'coffee', limit: 2 })],
  ['suggestions', () => client.suggestions({ keyword: 'coffee', limit: 3 })],
  ['channel', () => client.channel({ channelId: '5439580' })],
  ['episodeIndex', async () => { const index = await client.episodeIndex({ channelId: '5439580' }); ids = index.map(item => item.id); return index; }],
  ['episodeBatch50', async () => {
    if (ids.length < 50) throw new Error('Sample index has fewer than 50 episodes');
    const batch = await client.episodes({ channelId: '5439580', episodeIds: ids.slice(0, 50) });
    if (batch.missingIds.length || batch.episodes.length !== 50) throw new Error('Sample batch did not return all 50 episodes');
    return batch.episodes;
  }],
  ['episode', () => client.episode({ episodeId: '813705274' })],
];
for (const [operation, run] of operations) {
  const result = await catalogResult(run);
  if (!result.ok) failed = true;
  console.log(JSON.stringify(result.ok ? { operation, ok: true, count: Array.isArray(result.value) ? result.value.length : 1 } : { operation, ...result }));
}
if (failed) process.exitCode = 1;
