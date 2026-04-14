import { randomUUID } from 'node:crypto';
import { join, extname, sep } from 'node:path';
import { preparePlanInput, commitPlanInput, type FilePlan, type FilePlanEntry } from '../../shared/downloads';
import { CatalogClient } from '../catalog/client';
import { LibraryStore } from '../library/store';
import { CaseCollision, DirectoryGrants, filename, foldedPath, inspectPath, checkSpace, type Inspection } from './paths';

export class DownloadPlanner {
  private drafts = new Map<string, { plan: FilePlan; grantId: string; checks: Map<string, Inspection> }>();
  private busy = false;
  constructor(readonly grants: DirectoryGrants, private store: LibraryStore, private catalog = new CatalogClient(), private now = () => Date.now()) {}
  revoke() { this.grants.revokeAll(); this.drafts.clear(); }
  async prepare(input: unknown): Promise<FilePlan> {
    const parsed = preparePlanInput.safeParse(input); if (!parsed.success) throw new Error('Check the filename template, selection (1–1000 unique episodes), and download options.');
    if (this.busy) throw new Error('A file plan is being prepared. Try again shortly.');
    this.busy = true;
    try {
      const config = parsed.data; const grant = await this.grants.get(config.grantId);
      const channel = await this.catalog.channel({ channelId: config.channelId });
      const records = new Map<string, Awaited<ReturnType<CatalogClient['planningEpisodes']>>[number]>();
      for (let i = 0; i < config.episodeIds.length; i += 50) {
        for (const item of await this.catalog.planningEpisodes({ channelId: config.channelId, episodeIds: config.episodeIds.slice(i, i + 50) })) records.set(item.episode.id, item);
      }
      const reserved = this.store.reservedTargets(); const used = new Set<string>();
      const entries: FilePlanEntry[] = []; const checks = new Map<string, Inspection>();
      for (const id of config.episodeIds) {
        const record = records.get(id); const episode = record?.episode;
        const entry: FilePlanEntry = { episodeId: id, title: episode?.title ?? `Episode ${id}`, artworkUrl: episode?.artworkUrl ?? channel.artworkUrl, durationMs: episode?.durationMs ?? null, relativePath: null, disposition: 'blocked', sizeBytes: episode?.sizeBytes ?? null };
        entries.push(entry);
        if (!episode || !episode.hasMediaSource || !record?.extension) { entry.reason = 'Episode unavailable or source audio extension unknown.'; continue; }
        const original = filename(config.filenamePattern, { channel: channel.title, title: episode.title, date: episode.publishedAt?.slice(0, 10) ?? 'undated', eid: id }, record.extension, config.groupByChannel);
        let candidate = original; let inspection: Inspection; let key: string;
        for (let suffix = 1; ; suffix++) {
          key = foldedPath(join(grant.path, ...candidate.split('/')));
          if ([...reserved, ...used].some(other => other.startsWith(key + sep) || key.startsWith(other + sep))) throw new Error('A file plan reserves a parent or child of this destination. Choose another folder or template.');
          let casingCollision = false;
          try { inspection = await inspectPath(grant.path, candidate); } catch (error) {
            if (!(error instanceof CaseCollision) || config.duplicatePolicy === 'overwrite') throw error;
            casingCollision = true; inspection = { target: null, parents: [] };
          }
          const duplicate = casingCollision || used.has(key) || reserved.has(key) || inspection.target !== null;
          if (!duplicate) { entry.disposition = 'create'; break; }
          if (config.duplicatePolicy === 'skip') { entry.disposition = 'skip'; entry.reason = 'Existing file or another planned destination.'; break; }
          if (config.duplicatePolicy === 'overwrite') {
            if (used.has(key) || reserved.has(key)) throw new Error('Two planned episodes target the same filename. Use {eid} or Rename duplicates.');
            entry.disposition = 'replace'; break;
          }
          if (suffix >= 999) throw new Error('Too many filename collisions. Choose a different filename template.');
          const extension = extname(original); candidate = original.slice(0, -extension.length) + ` (${suffix + 1})` + extension;
        }
        entry.relativePath = candidate;
        if (entry.disposition === 'replace' && inspection!.target) entry.existingFile = { ...inspection!.target };
        if (entry.disposition !== 'skip') { used.add(key!); checks.set(id, inspection!); }
      }
      const writable = entries.filter(entry => ['create', 'replace'].includes(entry.disposition));
      const knownBytes = writable.reduce((sum, entry) => sum + (entry.sizeBytes ?? 0), 0);
      await this.grants.get(config.grantId); await checkSpace(grant.path, knownBytes);
      const plan: FilePlan = { channelId: config.channelId, id: randomUUID(), destination: grant.path, channelTitle: channel.title, createdAt: new Date(this.now()).toISOString(), expiresAt: new Date(this.now() + 15 * 60_000).toISOString(), entries, knownBytes, unknownSizeCount: writable.filter(entry => entry.sizeBytes === null).length, concurrency: config.concurrency };
      for (const [id, draft] of this.drafts) if (Date.parse(draft.plan.expiresAt) <= this.now()) this.drafts.delete(id);
      if (this.drafts.size >= 20) this.drafts.delete(this.drafts.keys().next().value!);
      this.drafts.set(plan.id, { plan, grantId: grant.id, checks }); return structuredClone(plan);
    } finally { this.busy = false; }
  }
  async commit(input: unknown) {
    const parsed = commitPlanInput.safeParse(input); if (!parsed.success) throw new Error('Invalid file plan.');
    const existing = this.store.readPlan(parsed.data.planId); if (existing) return existing;
    const draft = this.drafts.get(parsed.data.planId);
    if (!draft || Date.parse(draft.plan.expiresAt) <= this.now()) throw new Error('This plan has expired. Review the files again.');
    if (draft.plan.entries.some(entry => entry.disposition === 'blocked')) throw new Error('Remove unavailable episodes before saving this plan.');
    const grant = await this.grants.get(draft.grantId); const targets: string[] = [];
    for (const entry of draft.plan.entries) {
      if (entry.disposition === 'skip') continue;
      const current = await inspectPath(grant.path, entry.relativePath!);
      if (JSON.stringify(current) !== JSON.stringify(draft.checks.get(entry.episodeId))) throw new Error('Destination contents changed since review. Review the files again.');
      targets.push(foldedPath(join(grant.path, ...entry.relativePath!.split('/'))));
    }
    if (!targets.length) throw new Error('There are no new files to plan.');
    await this.grants.get(draft.grantId); await checkSpace(grant.path, draft.plan.knownBytes);
    // Transactional unique reservations reject plans committed concurrently.
    try { return this.store.commitPlan(draft.plan, targets); }
    catch { throw new Error('The plan could not be saved, or another plan reserved these filenames. Review again. No files were changed.'); }
  }
  list() { return this.store.listPlans(); }
}
