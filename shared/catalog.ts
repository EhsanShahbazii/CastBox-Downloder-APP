import { z } from 'zod';

export const catalogId = z.string().regex(/^[1-9]\d{0,19}$/);
export const suggestionInput = z.object({ keyword: z.string().trim().min(1).max(200), limit: z.number().int().min(1).max(20).default(5) }).strict();
export const episodeInput = z.object({ episodeId: catalogId }).strict();
export const indexInput = z.object({ channelId: catalogId }).strict();
export const searchInput = z.object({ keyword: z.string().trim().min(1).max(200), country: z.string().regex(/^[a-z]{2}$/).default('us'), offset: z.number().int().min(0).max(10000).default(0), limit: z.number().int().min(1).max(50).default(20) }).strict();
export const batchInput = z.object({ channelId: catalogId, episodeIds: z.array(catalogId).min(1).max(50) }).strict();
export interface CatalogChannel {
  id: string; title: string; author: string; description: string; artworkUrl: string | null;
  episodeCount: number | null;
}
export interface CatalogEpisode {
  id: string; channelId: string; title: string; author: string;
  description: string; artworkUrl: string | null; publishedAt: string | null;
  durationMs: number | null; sizeBytes: number | null; hasMediaSource: boolean;
  channel: { id: string; title: string; author: string; artworkUrl: string | null } | null;
}
export type CatalogErrorCode = 'INVALID_INPUT' | 'ACCESS_REQUIRED' | 'RATE_LIMITED' | 'NOT_FOUND' | 'NETWORK' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'SERVICE_ERROR' | 'BUSY';
export type CatalogResult<T> = { ok: true; value: T } | { ok: false; code: CatalogErrorCode; error: string };
export interface CatalogBridge {
  artwork(input: { url: string }): Promise<CatalogResult<string>>;
  search(input: z.input<typeof searchInput>): Promise<CatalogResult<{ channels: CatalogChannel[]; nextOffset: number | null }>>;
  channel(input: z.input<typeof indexInput>): Promise<CatalogResult<CatalogChannel>>;
  episodes(input: z.input<typeof batchInput>): Promise<CatalogResult<{ episodes: CatalogEpisode[]; missingIds: string[] }>>;
  suggestions(input: z.input<typeof suggestionInput>): Promise<CatalogResult<Array<{ keyword: string; channelId: string }>>>;
  episode(input: z.input<typeof episodeInput>): Promise<CatalogResult<CatalogEpisode>>;
  episodeIndex(input: z.input<typeof indexInput>): Promise<CatalogResult<Array<{ id: string; publishedAt: string | null }>>>;
}
