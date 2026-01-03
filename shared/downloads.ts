import { z } from 'zod';
import { catalogId } from './catalog';
import type { Result } from './desktop';

export const filenameTemplate = z.string().trim().min(1).max(240).refine(value => {
  const rest = value.replace(/\{(channel|title|date|eid)\}/g, 'item');
  return !/[{}\\<>:"|?*\x00-\x1f\x7f]/.test(rest) && rest.split('/').every(part => part.length > 0 && part !== '.' && part !== '..') && rest.split('/').length <= 5;
}, 'Use {channel}, {title}, {date}, {eid} and relative folders without dot segments or reserved characters.');
export const preparePlanInput = z.object({ grantId: z.string().uuid(), channelId: catalogId, episodeIds: z.array(catalogId).min(1).max(1000).refine(ids => new Set(ids).size === ids.length), filenamePattern: filenameTemplate, groupByChannel: z.boolean(), duplicatePolicy: z.enum(['skip', 'rename', 'overwrite']), concurrency: z.number().int().min(1).max(5) }).strict();
export const commitPlanInput = z.object({ planId: z.string().uuid() }).strict();
export type PlanInput = z.infer<typeof preparePlanInput>;
export interface DirectoryGrant { id: string; path: string }
export interface FilePlanEntry { existingFile?: { dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number }; episodeId: string; title: string; artworkUrl: string | null; durationMs?: number | null; relativePath: string | null; disposition: 'create' | 'replace' | 'skip' | 'blocked'; reason?: string; sizeBytes: number | null }
export interface FilePlan { channelId?: string; id: string; destination: string; channelTitle: string; createdAt: string; expiresAt: string; entries: FilePlanEntry[]; knownBytes: number; unknownSizeCount: number; concurrency: number }
export interface SavedFilePlan extends FilePlan { status: 'planned'; committedAt: string }
export interface DownloadPlanningBridge {
  chooseDirectory(): Promise<Result<DirectoryGrant | null>>;
  prepare(input: PlanInput): Promise<Result<FilePlan>>;
  commit(input: { planId: string }): Promise<Result<SavedFilePlan>>;
  list(): Promise<Result<SavedFilePlan[]>>;
}
