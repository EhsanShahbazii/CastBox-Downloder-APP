import type { TransferBridge } from './transfers';
import { z } from 'zod';
import { filenameTemplate } from './downloads';
import type { DirectoryGrant, DownloadPlanningBridge } from './downloads';
import type { LibraryBridge } from './library';
import type { CatalogBridge } from './catalog';
import type { PlaybackBridge } from './playback';
import type { AppSettings } from '../ai-studio-frontend/src/types';

export const settingsSchema = z.object({
  downloadConcurrency: z.number().int().min(1).max(5),
  downloadDestination: z.string().min(1).max(4096),
  groupEpisodesByChannel: z.boolean(),
  duplicateHandling: z.enum(['skip', 'overwrite', 'rename']),
  filenamePattern: filenameTemplate,
  defaultPlaybackSpeed: z.union([z.literal(0.5), z.literal(0.75), z.literal(1), z.literal(1.25), z.literal(1.5), z.literal(1.75), z.literal(2)]),
  skipForwardSeconds: z.number().int().min(5).max(120),
  skipBackwardSeconds: z.number().int().min(5).max(120),
  autoPlayNextInQueue: z.boolean(),
  continuousPlayback: z.boolean(),
  userToken: z.string().max(4096).optional(),
  userTokenSecret: z.string().max(4096).optional(),
}).strict();

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export interface StorageSnapshot {
  destination: string;
  downloadedBytes: number;
  cacheBytes: number;
  volumeTotalBytes: number | null;
  volumeAvailableBytes: number | null;
}
export interface DesktopBridge {
  transfers: TransferBridge;
  catalog: CatalogBridge;
  library: LibraryBridge;
  downloads: DownloadPlanningBridge;
  playback: PlaybackBridge;
  storage: {
    read(): Promise<Result<StorageSnapshot>>;
    clearCache(): Promise<Result<StorageSnapshot>>;
  };
  getInfo(): Promise<Result<{ version: string; platform: string; mode: 'live-catalog' }>>;
  readSettings(): Promise<Result<AppSettings>>;
  saveSettings(settings: AppSettings): Promise<Result<AppSettings>>;
  chooseDownloadDirectory(): Promise<Result<DirectoryGrant | null>>;
  loginWeb?(): Promise<Result<{ userToken: string; userTokenSecret?: string } | null>>;
}

export function defaultSettings(downloadDestination: string): AppSettings {
  return { downloadConcurrency: 3, downloadDestination, groupEpisodesByChannel: true,
    duplicateHandling: 'skip', filenamePattern: '{date} - {title}.mp3',
    defaultPlaybackSpeed: 1, skipForwardSeconds: 30, skipBackwardSeconds: 15,
    autoPlayNextInQueue: true, continuousPlayback: false,
    userToken: '', userTokenSecret: '' };
}
