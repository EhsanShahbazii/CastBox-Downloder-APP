import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, stat, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LibraryStore } from '../desktop/library/store';
import { PlaybackController } from '../desktop/playback/controller';

test('only completed local files receive range-capable opaque sources and playback state persists', async () => {
  const root = await mkdtemp(join(tmpdir(), 'castbox-playback-')); const destination = join(root, 'downloads');
  const file = join(destination, 'episode.mp3'); const bytes = Buffer.from('verified-local-audio-bytes');
  try {
    await (await import('node:fs/promises')).mkdir(destination); await writeFile(file, bytes); const info = await stat(file);
    const store = new LibraryStore(join(root, 'library.sqlite')); const planId = randomUUID(); const jobId = randomUUID();
    store.commitPlan({ id: planId, channelId: '77', destination, channelTitle: 'Local show', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), entries: [], knownBytes: 0, unknownSizeCount: 0, concurrency: 1 }, []);
    store.createTransfers(planId, [{ id: jobId, planId, episodeId: '88', channelId: '77', title: 'Episode', channelTitle: 'Local show', artworkUrl: null,
      destination, relativePath: 'episode.mp3', durationMs: 1000, status: 'completed', bytes: bytes.length, total: bytes.length, error: null, completedAt: new Date().toISOString(), validator: null, sourceKey: null,
      resourceKey: null, digest: null, partial: { dev: info.dev, ino: info.ino }, target: null, parents: [], replace: false, dismissed: false, finalizing: false }]);
    const playback = new PlaybackController(store); const source = await playback.source({ jobId });
    assert.match(source, /^castbox-media:\/\/local\/[0-9a-f-]+$/);
    const ranged = await playback.serve(new Request(source, { headers: { Range: 'bytes=8-14' } }));
    assert.equal(ranged.status, 206); assert.equal(ranged.headers.get('Content-Range'), `bytes 8-14/${bytes.length}`); assert.deepEqual(Buffer.from(await ranged.arrayBuffer()), bytes.subarray(8, 15));
    const denied = await playback.serve(new Request(`${source}/forged`)); assert.equal(denied.status, 404);
    playback.saveProgress({ jobId, positionMs: 12345, completed: false }); playback.replaceQueue({ jobIds: [jobId] }); store.close();
    const reopened = new LibraryStore(join(root, 'library.sqlite')); const restored = new PlaybackController(reopened).snapshot();
    assert.deepEqual(restored.queue.map(track => [track.jobId, track.positionMs]), [[jobId, 12345]]);
    assert.deepEqual(restored.recentlyPlayed.map(track => [track.jobId, track.positionMs, track.completed]), [[jobId, 12345, false]]);
    reopened.clearPlaybackHistory(); const cleared = new PlaybackController(reopened).snapshot();
    assert.equal(cleared.recentlyPlayed.length, 0); assert.equal(cleared.queue.length, 1);
    await unlink(file); await assert.rejects(() => new PlaybackController(reopened).source({ jobId }), /downloaded audio file is missing or changed/);
    reopened.close();
  } finally { await rm(root, { recursive: true, force: true }); }
});
