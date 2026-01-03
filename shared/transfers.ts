import { z } from 'zod';
import type { Result } from './desktop';
export const startTransferInput = z.object({ planId: z.string().uuid(), grantId: z.string().uuid() }).strict();
export const transferActionInput = z.object({ jobId: z.string().uuid(), action: z.enum(['pause', 'resume', 'cancel']), grantId: z.string().uuid().optional() }).strict();
export const transferConcurrencyInput = z.object({ concurrency: z.number().int().min(1).max(5) }).strict();
export interface TransferJob {
  id: string; planId: string; episodeId: string; title: string; channelTitle: string; artworkUrl: string | null;
  durationMs?: number | null;
  destination: string; relativePath: string; status: 'queued' | 'downloading' | 'paused' | 'failed' | 'completed';
  bytes: number; total: number | null; speed: number; error: string | null; completedAt: string | null; needsGrant: boolean;
}
export interface TransferSnapshot { jobs: TransferJob[]; startedPlanIds: string[]; concurrency: number }
export interface TransferBridge {
  pauseAll(): Promise<Result<TransferSnapshot>>;
  snapshot(): Promise<Result<TransferSnapshot>>;
  start(input: z.infer<typeof startTransferInput>): Promise<Result<TransferSnapshot>>;
  action(input: z.infer<typeof transferActionInput>): Promise<Result<TransferSnapshot>>;
  setConcurrency(input: z.infer<typeof transferConcurrencyInput>): Promise<Result<TransferSnapshot>>;
  discardPlan(input: { planId: string }): Promise<Result<void>>;
  reveal(input: { jobId: string }): Promise<Result<void>>;
}
