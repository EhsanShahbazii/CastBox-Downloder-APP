import { z } from 'zod';
import { catalogId } from '../../shared/catalog';
const identity = z.object({ dev: z.number(), ino: z.number() });
const target = identity.extend({ size: z.number(), mtimeMs: z.number(), ctimeMs: z.number() });
export const transferRecord = z.object({
  id: z.string().uuid(), planId: z.string().uuid(), episodeId: catalogId, channelId: catalogId.nullable(), title: z.string(), channelTitle: z.string(), artworkUrl: z.string().nullable(), durationMs: z.number().nonnegative().nullable().default(null),
  destination: z.string(), relativePath: z.string(), status: z.enum(['queued','downloading','paused','failed','finalizing','completed','cancelled']),
  bytes: z.number().int().nonnegative().safe(), total: z.number().int().nonnegative().safe().nullable(), error: z.string().nullable(), completedAt: z.string().nullable(),
  validator: z.string().nullable(), sourceKey: z.string().nullable(), resourceKey: z.string().nullable().default(null), digest: z.string().nullable(), partial: identity.nullable(),
  target: target.nullable(), parents: z.array(z.object({ path: z.string(), dev: z.number(), ino: z.number() })),
  replace: z.boolean(), dismissed: z.boolean(), finalizing: z.boolean(),
});
export type TransferRecord = z.infer<typeof transferRecord>;
