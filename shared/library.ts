import { z } from 'zod';
import { catalogId, type CatalogChannel } from './catalog';
import type { Result } from './desktop';

export const savedChannelInput = z.object({ channelId: catalogId, saved: z.boolean() }).strict();
export interface SavedChannel { channel: CatalogChannel; savedAt: string }
export interface LibrarySnapshot { savedChannels: SavedChannel[] }
export interface LibraryBridge {
  read(): Promise<Result<LibrarySnapshot>>;
  setSaved(input: z.infer<typeof savedChannelInput>): Promise<Result<LibrarySnapshot>>;
}
