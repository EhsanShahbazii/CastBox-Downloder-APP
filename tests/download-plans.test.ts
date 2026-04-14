import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink, rename, readdir, link } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { DirectoryGrants, filename, safeSegment, inspectPath, checkSpace } from '../desktop/downloads/paths';
import { DownloadPlanner } from '../desktop/downloads/planner';
import { LibraryStore } from '../desktop/library/store';
import { CatalogClient } from '../desktop/catalog/client';
import type { PlanInput } from '../shared/downloads';

class TestCatalog extends CatalogClient {
  override async channel() { return { id: '1', title: 'Show', author: 'Author', description: '', artworkUrl: null, episodeCount: 2 }; }
  override async planningEpisodes(input: unknown) {
    return (input as { episodeIds: string[] }).episodeIds.filter(id => id !== '9').map(id => ({ extension: id === '8' ? null : '.m4a', episode: { id, channelId: '1', title: 'Same title', author: 'Author', description: '', artworkUrl: null, publishedAt: null, durationMs: null, sizeBytes: null, hasMediaSource: true, channel: null } }));
  }
}
async function fixture(work: (ctx: { root: string; path: string; grants: DirectoryGrants; store: LibraryStore; planner: DownloadPlanner; input: PlanInput }) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'castbox-plans-')); const path = join(root, 'destination'); await mkdir(path);
  const grants = new DirectoryGrants(); const store = new LibraryStore(join(root, 'library.sqlite'));
  try { const grant = await grants.issue(path); await work({ root, path, grants, store, planner: new DownloadPlanner(grants, store, new TestCatalog()), input: { grantId: grant.id, channelId: '1', episodeIds: ['2', '3'], filenamePattern: '{title}.mp3', groupByChannel: false, duplicatePolicy: 'rename', concurrency: 3 } }); }
  finally { store.close(); await rm(root, { recursive: true, force: true }); }
}
test('portable filenames neutralize metadata and preserve the source extension', () => {
  const tokens = { channel: '../Show', title: 'CON', eid: '123', date: 'undated' };
  assert.equal(filename('{title}.mp3', tokens, '.m4a', false), '_CON.m4a');
  assert.equal(filename('{channel}/{eid}', tokens, '.mp3', true), '.._Show/123.mp3');
  for (const pattern of ['/absolute', '../bad', './bad', 'a//b', 'a\\b', 'C:/x', '{unknown}', 'x:y']) assert.throws(() => filename(pattern, tokens, '.mp3', false));
  assert.equal(safeSegment('NUL.txt '), '_NUL.txt'); assert.ok(Buffer.byteLength(safeSegment('🎧'.repeat(100))) <= 120);
});
test('full selection gets deterministic distinct names; prepare and commit write no destination files', () => fixture(async ({ path, planner, input, store, root }) => {
  const plan = await planner.prepare(input);
  assert.deepEqual(plan.entries.map(x => x.relativePath), ['Same title.m4a', 'Same title (2).m4a']);
  assert.equal(plan.unknownSizeCount, 2); assert.equal(plan.knownBytes, 0);
  const [a, b] = await Promise.all([planner.commit({ planId: plan.id }), planner.commit({ planId: plan.id })]);
  assert.equal(a.committedAt, b.committedAt); assert.equal(planner.list().length, 1); assert.deepEqual(await readdir(path), []);
  store.close(); const reopened = new LibraryStore(join(root, 'library.sqlite'));
  assert.equal(reopened.listPlans()[0].status, 'planned'); assert.equal(reopened.reservedTargets().size, 2); reopened.close();
}));
test('existing-file skip/rename/overwrite decisions are explicit and replacement is only planned', () => fixture(async ({ path, planner, input }) => {
  await writeFile(join(path, 'Same title.m4a'), 'keep');
  const skip = await planner.prepare({ ...input, episodeIds: ['2'], duplicatePolicy: 'skip' }); assert.equal(skip.entries[0].disposition, 'skip'); await assert.rejects(planner.commit({ planId: skip.id }), /no new files/);
  const replace = await planner.prepare({ ...input, episodeIds: ['2'], duplicatePolicy: 'overwrite' }); assert.equal(replace.entries[0].disposition, 'replace'); await planner.commit({ planId: replace.id });
  assert.equal(await readFile(join(path, 'Same title.m4a'), 'utf8'), 'keep');
  const renamed = await planner.prepare({ ...input, episodeIds: ['3'] }); assert.equal(renamed.entries[0].relativePath, 'Same title (2).m4a');
}));
test('root swaps, symlinks, hardlinks and directory/file conflicts fail closed', () => fixture(async ({ root, path, grants, planner, input }) => {
  await symlink(root, join(path, 'Show')); await assert.rejects(planner.prepare({ ...input, groupByChannel: true }), /symbolic/); await rm(join(path, 'Show'));
  await writeFile(join(path, 'Same title.m4a'), 'x'); await link(join(path, 'Same title.m4a'), join(root, 'hardlink')); await assert.rejects(planner.prepare(input), /regular/);
  await rm(join(path, 'Same title.m4a')); await mkdir(join(path, 'Same title.m4a')); await assert.rejects(planner.prepare(input), /regular/); await rm(join(path, 'Same title.m4a'), { recursive: true });
  await assert.rejects(inspectPath(path, '../outside'), /Unsafe/);
  await rename(path, path + '-old'); await mkdir(path); await assert.rejects(grants.get(input.grantId), /Destination changed/);
}));
test('filesystem changes after review and expired/forged grants cannot commit', () => fixture(async ({ path, planner, input, grants, store }) => {
  await assert.rejects(planner.prepare({ ...input, grantId: randomUUID() }), /permission has expired/);
  const plan = await planner.prepare({ ...input, episodeIds: ['2'] }); await writeFile(join(path, 'Same title.m4a'), 'created later'); await assert.rejects(planner.commit({ planId: plan.id }), /changed since review/);
  let now = 1000; const timed = new DownloadPlanner(grants, store, new TestCatalog(), () => now);
  const expiring = await timed.prepare({ ...input, filenamePattern: '{eid}' }); now += 16 * 60000; await assert.rejects(timed.commit({ planId: expiring.id }), /expired/);
  const revoked = await planner.prepare({ ...input, filenamePattern: '{eid}' }); planner.revoke(); await assert.rejects(planner.commit({ planId: revoked.id }), /expired/);
  assert.equal(planner.list().length, 0);
}));
test('unavailable entries block commit; conflicting plan reservations roll back atomically', () => fixture(async ({ planner, input, store }) => {
  const unavailable = await planner.prepare({ ...input, episodeIds: ['2', '8', '9'] }); assert.equal(unavailable.entries.filter(x => x.disposition === 'blocked').length, 2); await assert.rejects(planner.commit({ planId: unavailable.id }), /unavailable/);
  const first = await planner.prepare({ ...input, episodeIds: ['2'] }); const second = await planner.prepare({ ...input, episodeIds: ['2'] });
  await planner.commit({ planId: first.id }); await assert.rejects(planner.commit({ planId: second.id }), /another plan/);
  assert.equal(store.listPlans().length, 1); assert.equal(store.reservedTargets().size, 1);
}));
test('case-equivalent names rename safely; overwrite never aliases two episodes', () => fixture(async ({ path, planner, input }) => {
  await writeFile(join(path, 'same TITLE.m4a'), 'keep');
  const plan = await planner.prepare({ ...input, episodeIds: ['2'] }); assert.equal(plan.entries[0].relativePath, 'Same title (2).m4a');
  await assert.rejects(planner.prepare({ ...input, duplicatePolicy: 'overwrite' }), /case|Unicode/);
  await rm(join(path, 'same TITLE.m4a')); await assert.rejects(planner.prepare({ ...input, duplicatePolicy: 'overwrite' }), /Two planned/);
}));
test('v1 schema migrates through current playback schema and preserves saved channels', () => fixture(async ({ root, store }) => {
  store.save({ id: '1', title: 'Saved', author: '', description: '', artworkUrl: null, episodeCount: null }); store.close();
  const db = new DatabaseSync(join(root, 'library.sqlite')); db.exec('DROP TABLE playback_state; DROP TABLE playback_queue; DROP TABLE transfer_jobs; DROP TABLE transfer_runs; DROP TABLE file_reservations; DROP TABLE file_plans; PRAGMA user_version=1'); db.close();
  assert.equal(store.read().savedChannels[0].channel.title, 'Saved'); assert.deepEqual(store.listPlans(), []);
}));
test('a reserved filename cannot become a parent folder in another plan', () => fixture(async ({ planner, input }) => {
  const first = await planner.prepare({ ...input, episodeIds: ['2'], filenamePattern: 'folder' });
  const nested = await planner.prepare({ ...input, episodeIds: ['3'], filenamePattern: 'folder.m4a/{eid}' });
  // Returned previews are copies; tampering cannot change the main-owned plan.
  first.entries[0].relativePath = '../tampered';
  const committed = await planner.commit({ planId: first.id });
  assert.equal(committed.entries[0].relativePath, 'folder.m4a');
  await assert.rejects(planner.commit({ planId: nested.id }), /another plan/);
  await assert.rejects(planner.prepare({ ...input, filenamePattern: 'folder.m4a/{eid}' }), /parent or child/);
}));

test('known sizes exceeding free space are rejected without creating files', () => fixture(async ({ path }) => {
  await assert.rejects(checkSpace(path, Number.MAX_SAFE_INTEGER), /Not enough available disk space/);
  assert.deepEqual(await readdir(path), []);
}));
