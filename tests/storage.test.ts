import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readStorageSnapshot } from '../desktop/storage';

test('storage snapshot reports actual destination capacity and completed local media only', async () => {
  const root = await mkdtemp(join(tmpdir(), 'castbox-storage-'));
  try {
    const result = await readStorageSnapshot(root, 1024, 4096);
    assert.equal(result.destination, root);
    assert.equal(result.downloadedBytes, 1024);
    assert.equal(result.cacheBytes, 4096);
    assert.ok((result.volumeTotalBytes ?? 0) > 0);
    assert.ok((result.volumeAvailableBytes ?? 0) > 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('storage snapshot uses the nearest existing parent volume for a new destination', async () => {
  const result = await readStorageSnapshot(join(tmpdir(), 'castbox-storage-missing', 'nested'), 0, 0);
  assert.ok((result.volumeTotalBytes ?? 0) > 0);
  assert.ok((result.volumeAvailableBytes ?? 0) > 0);
  assert.equal(result.downloadedBytes, 0);
  assert.equal(result.cacheBytes, 0);
});
