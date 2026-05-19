import { statfs } from 'node:fs/promises';
import { dirname } from 'node:path';
import type { StorageSnapshot } from '../shared/desktop';

export async function readStorageSnapshot(destination: string, downloadedBytes: number, cacheBytes: number): Promise<StorageSnapshot> {
  let volumeTotalBytes: number | null = null;
  let volumeAvailableBytes: number | null = null;
  let probe = destination;
  while (true) {
    try {
      const volume = await statfs(probe);
      volumeTotalBytes = Number(volume.blocks) * Number(volume.bsize);
      volumeAvailableBytes = Number(volume.bavail) * Number(volume.bsize);
      break;
    } catch {
      const parent = dirname(probe);
      if (parent === probe) break;
      probe = parent;
    }
  }
  return {
    destination,
    downloadedBytes: Math.max(0, Math.floor(downloadedBytes)),
    cacheBytes: Math.max(0, Math.floor(cacheBytes)),
    volumeTotalBytes: Number.isFinite(volumeTotalBytes) ? volumeTotalBytes : null,
    volumeAvailableBytes: Number.isFinite(volumeAvailableBytes) ? volumeAvailableBytes : null,
  };
}
