import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { LibraryStore } from '../desktop/library/store';
import { savedChannelInput } from '../shared/library';
import type { CatalogChannel, CatalogEpisode } from '../shared/catalog';

const channel: CatalogChannel = { id: '1', title: "Coffee ' & Tea", author: 'Author', description: '<p>Notes</p>', artworkUrl: null, episodeCount: 2 };
const episode: CatalogEpisode = { id: '10', channelId: '1', title: 'First', author: 'Author', description: '', artworkUrl: null, publishedAt: null, durationMs: 10000, sizeBytes: null, hasMediaSource: true, channel: null };
async function fixture(work: (path: string) => Promise<void> | void) {
  const dir = await mkdtemp(join(tmpdir(), 'castbox-library-'));
  try { await work(join(dir, 'library.sqlite')); } finally { await rm(dir, { recursive: true, force: true }); }
}
test('saved channels survive reopen, duplicate saves retain timestamp, unsave preserves metadata', () => fixture(path => {
  const store = new LibraryStore(path);
  assert.deepEqual(store.read(), { savedChannels: [] });
  const saved = store.save(channel); const again = store.save({ ...channel, title: 'Updated' });
  assert.equal(again.savedChannels.length, 1); assert.equal(saved.savedChannels[0].savedAt, again.savedChannels[0].savedAt);
  store.close();
  const reopened = new LibraryStore(path);
  assert.equal(reopened.read().savedChannels[0].channel.title, 'Updated');
  assert.equal(reopened.unsave('1').savedChannels.length, 0); assert.equal(reopened.unsave('1').savedChannels.length, 0);
  reopened.close();
  const db = new DatabaseSync(path); assert.equal(db.prepare('SELECT count(*) n FROM channels').get()!.n, 1); assert.equal(db.prepare('PRAGMA user_version').get()!.user_version, 5); db.close();
}));
test('episode/progress and separate listening/download queues survive reopen and unsave', () => fixture(path => {
  const store = new LibraryStore(path); store.save(channel); store.rememberEpisode(channel, episode);
  store.setProgress('10', 2500, false); store.replaceListeningQueue(['10']); store.planDownload('10'); store.planDownload('10');
  store.unsave('1'); store.close();
  const db = new DatabaseSync(path);
  assert.equal(db.prepare('SELECT position_ms FROM playback_progress').get()!.position_ms, 2500);
  assert.equal(db.prepare('SELECT count(*) n FROM episodes').get()!.n, 1);
  assert.equal(db.prepare('SELECT episode_id FROM listening_queue').get()!.episode_id, '10');
  assert.equal(db.prepare('SELECT count(*) n FROM download_queue').get()!.n, 1);
  assert.equal(db.prepare('SELECT status FROM download_queue').get()!.status, 'planned'); db.close();
}));
test('Phase 6 queue and progress survive reopening independently of the legacy episode queue', () => fixture(path => {
  const store = new LibraryStore(path); const ids = ['00000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000002'];
  store.replaceQueueJobIds(ids); store.savePlaybackPosition(ids[0], 24500, false); store.close();
  const reopened = new LibraryStore(path); assert.deepEqual(reopened.queueJobIds(), ids); assert.deepEqual(reopened.playbackPosition(ids[0]), { positionMs: 24500, durationMs: null, completed: false });
  reopened.savePlaybackPosition(ids[0], 25000, false, 90000); assert.deepEqual(reopened.playbackPosition(ids[0]), { positionMs: 25000, durationMs: 90000, completed: false });
  assert.throws(() => reopened.replaceQueueJobIds([ids[0], ids[0]])); assert.throws(() => reopened.savePlaybackPosition(ids[0], -1, false));
  assert.deepEqual(reopened.queueJobIds(), ids); reopened.close();
}));
test('failed queue replacement rolls back deletion and preserves independent download records', () => fixture(path => {
  const store = new LibraryStore(path); store.rememberEpisode(channel, episode); store.replaceListeningQueue(['10']); store.planDownload('10');
  assert.throws(() => store.replaceListeningQueue(['999']));
  assert.throws(() => store.replaceListeningQueue(['10', '10']));
  assert.throws(() => store.setProgress('10', -1, false));
  assert.throws(() => store.rememberEpisode(channel, { ...episode, channelId: '2' }));
  store.close(); const db = new DatabaseSync(path);
  assert.equal(db.prepare('SELECT episode_id FROM listening_queue').get()!.episode_id, '10');
  assert.equal(db.prepare('SELECT episode_id FROM download_queue').get()!.episode_id, '10'); db.close();
}));
test('corrupt, unknown and newer-version databases are preserved and not reset', () => fixture(async path => {
  const bytes = Buffer.from('a damaged database, preserve me'); await writeFile(path, bytes);
  const corrupt = new LibraryStore(path); assert.throws(() => corrupt.read()); corrupt.close(); assert.deepEqual(await readFile(path), bytes);
  await rm(path); let db = new DatabaseSync(path); db.exec('CREATE TABLE future_data (value TEXT); INSERT INTO future_data VALUES (\'keep\'); PRAGMA user_version=99;'); db.close();
  const future = new LibraryStore(path); assert.throws(() => future.read(), /newer/); future.close();
  db = new DatabaseSync(path); assert.equal(db.prepare('PRAGMA user_version').get()!.user_version, 99); assert.equal(db.prepare('SELECT value FROM future_data').get()!.value, 'keep'); db.exec('PRAGMA user_version=0'); db.close();
  const unknown = new LibraryStore(path); assert.throws(() => unknown.read(), /Unrecognized/); unknown.close();
  db = new DatabaseSync(path); assert.equal(db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table'").get()!.n, 1); db.close();
}));
test('write failure does not report save success and later retry succeeds', () => fixture(path => {
  const store = new LibraryStore(path); store.read();
  const db = new DatabaseSync(path); db.exec("CREATE TRIGGER fail_save BEFORE INSERT ON saved_channels BEGIN SELECT RAISE(ABORT, 'disk test failure'); END;");
  assert.throws(() => store.save(channel)); assert.equal(store.read().savedChannels.length, 0);
  assert.equal(db.prepare('SELECT count(*) n FROM channels').get()!.n, 0);
  db.exec('DROP TRIGGER fail_save'); assert.equal(store.save(channel).savedChannels.length, 1);
  store.close(); db.close();
}));
test('renderer library writes accept only numeric IDs and explicit saved intent', () => {
  for (const input of [{ channelId: '../1', saved: true }, { channelId: '1', saved: 'true' }, { channelId: '1', saved: true, title: 'fake' }, { channelId: '1' }]) assert.equal(savedChannelInput.safeParse(input).success, false);
  assert.equal(savedChannelInput.safeParse({ channelId: '1', saved: false }).success, true);
});
test('a failed migration rolls back every table and the version marker', () => fixture(path => {
  const db = new DatabaseSync(path);
  // Conflict late in migration, after channels and episodes would be created.
  db.exec('CREATE VIEW saved_channels AS SELECT 1 AS preserved'); db.close();
  const store = new LibraryStore(path); assert.throws(() => store.read()); store.close();
  const inspect = new DatabaseSync(path);
  assert.equal(inspect.prepare('PRAGMA user_version').get()!.user_version, 0);
  assert.equal(inspect.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table'").get()!.n, 0);
  assert.equal(inspect.prepare('SELECT preserved FROM saved_channels').get()!.preserved, 1); inspect.close();
}));
