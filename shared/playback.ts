import { z } from 'zod';
import type { Result } from './desktop';

export const playbackJobId = z.string().uuid();
export const progressInput = z.object({ jobId: playbackJobId, positionMs: z.number().int().nonnegative().max(8_640_000_000), durationMs: z.number().int().nonnegative().max(8_640_000_000).nullable().optional(), completed: z.boolean() }).strict();
export const queueInput = z.object({ jobIds: z.array(playbackJobId).max(5000).refine(ids => new Set(ids).size === ids.length) }).strict();
export interface PlaybackTrack { jobId: string; episodeId: string; title: string; channelTitle: string; artworkUrl: string | null; durationSeconds: number | null; positionMs: number; completed: boolean }
export interface PlaybackSnapshot { queue: PlaybackTrack[]; lastTrack: PlaybackTrack | null; recentlyPlayed: Array<PlaybackTrack & { updatedAt: string }> }
export interface PlaybackBridge {
  snapshot(): Promise<Result<PlaybackSnapshot>>;
  clearHistory(): Promise<Result<void>>;
  source(input: { jobId: string }): Promise<Result<string>>;
  saveProgress(input: z.infer<typeof progressInput>): Promise<Result<void>>;
  replaceQueue(input: z.infer<typeof queueInput>): Promise<Result<PlaybackSnapshot>>;
}
