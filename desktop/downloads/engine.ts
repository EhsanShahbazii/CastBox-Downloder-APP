import { randomUUID, createHash } from 'node:crypto';
import { extname, join } from 'node:path';
import type { FileHandle } from 'node:fs/promises';
import { CatalogClient } from '../catalog/client';
import { LibraryStore } from '../library/store';
import { DirectoryGrants, inspectPath, foldedPath, checkSpace } from './paths';
import { startTransferInput, transferActionInput, transferConcurrencyInput, type TransferSnapshot } from '../../shared/transfers';
import { commitPlanInput } from '../../shared/downloads';
import type { TransferRecord } from './records';
import { TransferError, mediaTransport, responseValidator, responseLength, MAX_MEDIA_BYTES, type MediaTransport, type MediaResponse } from './transport';
import { validateDestination, openPartial, verifyPartial, removePartial, finalize, recoverFinal, checkAudio, finalPath, hashPrefix } from './files';

type Running = { controller: AbortController; promise: Promise<void>; intent: 'pause' | 'cancel' | null; speed: number };
export class TransferEngine {
  private jobs = new Map<string, TransferRecord>();
  private active = new Map<string, Running>();
  private grantsByRoot = new Map<string,string>();
  private initialized = false;
  private stopping = false;
  private commands: Promise<unknown> = Promise.resolve();
  private concurrency = 3;
  constructor(private store: LibraryStore, private grants: DirectoryGrants, private catalog = new CatalogClient(), private transport: MediaTransport = mediaTransport) {}
  private init() {
    if (this.initialized) return;
    const records = this.store.transferJobs();
    for (const job of records) {
      if (['queued','downloading','finalizing'].includes(job.status)) { job.status = 'paused'; job.error = 'Interrupted. Choose the original folder to resume.'; this.store.saveTransfer(job); }
      this.jobs.set(job.id, job);
    }
    this.initialized = true;
  }
  private serialized<T>(work: () => Promise<T>): Promise<T> {
    const next = this.commands.then(work); this.commands = next.catch(() => {}); return next;
  }
  snapshot(): TransferSnapshot {
    this.init();
    return { concurrency: this.concurrency, startedPlanIds: this.store.transferPlans(), jobs: [...this.jobs.values()].filter(job => !job.dismissed && job.status !== 'cancelled').map(job => ({
      id: job.id, planId: job.planId, episodeId: job.episodeId, title: job.title, channelTitle: job.channelTitle, artworkUrl: job.artworkUrl, durationMs: job.durationMs,
      destination: job.destination, relativePath: job.relativePath, status: job.status === 'finalizing' ? 'downloading' : job.status as 'queued',
      bytes: job.bytes, total: job.total, speed: this.active.get(job.id)?.speed ?? 0, error: job.error, completedAt: job.completedAt, needsGrant: !this.grantsByRoot.has(job.destination),
    })) };
  }
  async completedFilesBytes(): Promise<number> {
    this.init();
    let total = 0;
    for (const job of this.jobs.values()) {
      if (job.status !== 'completed') continue;
      try {
        const inspected = await inspectPath(job.destination, job.relativePath);
        if (inspected.target) total += inspected.target.size;
      } catch {
        // Missing or unsafe files are not counted as currently stored media.
      }
    }
    return total;
  }
  start(input: unknown): Promise<TransferSnapshot> { return this.serialized(async () => {
    this.init(); if (this.stopping) throw new TransferError('Downloads are stopping. Retry shortly.');
    const { planId, grantId } = startTransferInput.parse(input);
    const plan = this.store.readPlan(planId); if (!plan) throw new TransferError('File plan not found. Review the selection again.');
    const grant = await this.grants.get(grantId);
    if (grant.path !== plan.destination) throw new TransferError('Choose the original folder shown in the file plan.');
    if (this.store.transferPlans().includes(planId)) return this.snapshot();
    const jobs: TransferRecord[] = [];
    if (plan.entries.some(entry => entry.disposition === 'blocked')) throw new TransferError('This plan contains unavailable episodes.');
    for (const entry of plan.entries) {
      if (entry.disposition === 'skip') continue;
      if (!entry.relativePath || !/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i.test(entry.relativePath)) throw new TransferError('Invalid planned filename.');
      const inspection = await inspectPath(grant.path, entry.relativePath);
      if (entry.disposition === 'create' && inspection.target) throw new TransferError('A planned filename is now occupied. Create a new plan.');
      if (entry.disposition === 'replace' && (!entry.existingFile || JSON.stringify(entry.existingFile) !== JSON.stringify(inspection.target))) throw new TransferError('Replacement needs a fresh file review. The existing file was preserved.');
      jobs.push({ id: randomUUID(), planId, episodeId: entry.episodeId, channelId: plan.channelId ?? null, title: entry.title, channelTitle: plan.channelTitle, artworkUrl: entry.artworkUrl, durationMs: entry.durationMs ?? null,
        destination: grant.path, relativePath: entry.relativePath, status: 'queued', bytes: 0, total: null, error: null, completedAt: null, validator: null, sourceKey: null, resourceKey: null, digest: null, partial: null,
        target: inspection.target, parents: inspection.parents, replace: entry.disposition === 'replace', dismissed: false, finalizing: false });
    }
    if (!jobs.length) throw new TransferError('This plan has no files to download.');
    await checkSpace(grant.path, plan.knownBytes); await this.grants.get(grantId);
    this.store.createTransfers(planId, jobs);
    for (const job of jobs) this.jobs.set(job.id, job);
    this.grantsByRoot.set(grant.path, grantId); this.concurrency = plan.concurrency; this.pump(); return this.snapshot();
  }); }
  action(input: unknown): Promise<TransferSnapshot> { return this.serialized(async () => {
    this.init(); const { jobId, action, grantId } = transferActionInput.parse(input);
    const job = this.jobs.get(jobId); if (!job) throw new TransferError('Download not found.');
    if (action === 'resume') {
      if (this.stopping) throw new TransferError('Downloads are stopping.');
      if (!['paused','failed'].includes(job.status)) return this.snapshot();
      const selected = grantId ?? this.grantsByRoot.get(job.destination);
      if (!selected) throw new TransferError('Choose the original destination folder to resume.');
      const grant = await this.grants.get(selected);
      if (grant.path !== job.destination) throw new TransferError('Choose the original destination folder to resume.');
      this.grantsByRoot.set(job.destination, selected);
      const updated = { ...job, status: 'queued' as const, error: null }; this.store.saveTransfer(updated); Object.assign(job, updated); this.pump();
    } else {
      const running = this.active.get(jobId);
      if (running) { running.intent = action; running.controller.abort(); await running.promise; }
      if (action === 'pause') {
        if (job.status === 'queued') { const updated = { ...job, status: 'paused' as const, error: null }; this.store.saveTransfer(updated); Object.assign(job, updated); }
      } else if (job.status === 'completed') {
        const updated = { ...job, dismissed: true }; this.store.saveTransfer(updated); Object.assign(job, updated); // Remove history only; never delete completed audio.
      } else if (job.status !== 'cancelled') {
        const selected = grantId ?? this.grantsByRoot.get(job.destination);
        if (job.partial) {
          if (!selected) throw new TransferError('Choose the original folder to remove the partial file.');
          await validateDestination(job, this.grants, selected); await removePartial(job);
        }
        const updated = { ...job, status: 'cancelled' as const, error: null, dismissed: true }; this.store.finishTransfer(updated, foldedPath(finalPath(job))); Object.assign(job, updated);
      }
    }
    return this.snapshot();
  }); }
  pauseAll(): Promise<TransferSnapshot> { return this.serialized(async () => {
    this.init();
    for (const job of this.jobs.values()) if (job.status === 'queued') { job.status = 'paused'; this.store.saveTransfer(job); }
    const running = [...this.active.values()];
    running.forEach(item => { item.intent = 'pause'; item.controller.abort(); });
    await Promise.all(running.map(item => item.promise)); return this.snapshot();
  }); }
  setConcurrency(input: unknown): TransferSnapshot {
    this.init(); this.concurrency = transferConcurrencyInput.parse(input).concurrency; this.pump(); return this.snapshot();
  }
  discardPlan(input: unknown): Promise<void> { return this.serialized(async () => { this.init(); this.store.discardPlan(commitPlanInput.parse(input).planId); }); }
  async revealPath(id: string): Promise<string> {
    this.init(); const job = this.jobs.get(id);
    if (!job || job.status !== 'completed') throw new TransferError('This download is not complete.');
    const inspected = await inspectPath(job.destination, job.relativePath);
    if (!inspected.target || inspected.target.size !== job.bytes) throw new TransferError('The downloaded file is missing or changed.');
    return finalPath(job);
  }
  async suspend() {
    this.stopping = true;
    await this.pauseAll(); this.grantsByRoot.clear(); this.stopping = false;
  }
  private pump() {
    if (this.stopping) return;
    for (const job of this.jobs.values()) {
      if (this.active.size >= this.concurrency) break;
      if (job.status !== 'queued' || this.active.has(job.id)) continue;
      const running: Running = { controller: new AbortController(), promise: Promise.resolve(), intent: null, speed: 0 };
      this.active.set(job.id, running);
      running.promise = this.run(job, running).finally(() => { this.active.delete(job.id); this.pump(); });
    }
  }
  private async run(job: TransferRecord, running: Running) {
    const signal = running.controller.signal; let fd: FileHandle | null = null; let response: MediaResponse | null = null;
    let hash = createHash('sha256'); let checkpointAllowed = false; let durable = structuredClone(job);
    const checkpoint = async () => {
      if (!fd || !checkpointAllowed) return;
      await fd.sync(); job.digest = hash.copy().digest('hex'); this.store.saveTransfer(job); durable = structuredClone(job);
    };
    try {
      const grantId = this.grantsByRoot.get(job.destination);
      if (!grantId) throw new TransferError('Choose the original destination folder to resume.');
      try { await this.grants.get(grantId); } catch { this.grantsByRoot.delete(job.destination); throw new TransferError('Destination permission expired. Choose the folder again.'); }
      if (job.finalizing && await recoverFinal(job, this.grants, grantId)) { this.completed(job); return; }
      job.status = 'downloading'; job.error = null; this.store.saveTransfer(job);
      await validateDestination(job, this.grants, grantId, true); signal.throwIfAborted();
      fd = await openPartial(job);
      hash = await verifyPartial(job, fd); checkpointAllowed = true; await checkpoint();
      if (job.finalizing) {
        await checkAudio(fd, extname(job.relativePath).toLowerCase()); await fd.close(); fd = null;
        await finalize(job, this.grants, grantId); this.completed(job); return;
      }
      const source = await this.catalog.mediaSource(job.episodeId); signal.throwIfAborted();
      if ((job.channelId && source.episode.channelId !== job.channelId) || !source.episode.hasMediaSource || new URL(source.url).pathname.match(/\.[^.\/]+$/)?.[0].toLowerCase() !== extname(job.relativePath).toLowerCase()) throw new TransferError('The episode source changed. Review a new file plan.');
      job.channelId = source.episode.channelId;
      const sourceKey = createHash('sha256').update(source.url).digest('hex');
      let offset = job.bytes && job.validator && sourceKey === job.sourceKey ? job.bytes : 0;
      if (!offset) { await fd.truncate(0); job.bytes = 0; hash = createHash('sha256'); }
      const headers: Record<string,string> = offset ? { Range: `bytes=${offset}-`, 'If-Range': job.validator! } : {};
      response = await this.transport(source.url, headers, signal);
      const changedResource = offset && response.status === 206 && job.resourceKey !== createHash('sha256').update(response.finalUrl).digest('hex');
      if ((response.status === 416 || changedResource) && offset) {
        response.body.destroy(); await fd.truncate(0); job.bytes = 0; offset = 0; hash = createHash('sha256');
        response = await this.transport(source.url, {}, signal);
      }
      if (![200,206].includes(response.status)) throw new TransferError(response.status === 401 || response.status === 403 ? 'The media server requires access that is not available.' : response.status === 429 ? 'The media server is limiting requests. Retry later.' : `Media server returned HTTP ${response.status}. Retry later.`);
      const contentType = String(response.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase();
      if (!contentType.startsWith('audio/') && !['application/octet-stream','binary/octet-stream','application/ogg','video/mp4'].includes(contentType)) throw new TransferError('The media server returned a non-audio response.');
      if (response.headers['content-encoding'] && response.headers['content-encoding'] !== 'identity') throw new TransferError('Encoded media responses cannot be resumed safely.');
      const length = responseLength(response.headers['content-length']);
      const validator = responseValidator(response.headers);
      if (response.status === 206) {
        const match = /^bytes (\d+)-(\d+)\/(\d+)$/.exec(String(response.headers['content-range'] ?? ''));
        if (!offset || !match || Number(match[1]) !== offset || !validator || validator !== job.validator || Number(match[2]) < offset || Number(match[2]) + 1 !== Number(match[3]) || (length !== null && Number(match[2]) - offset + 1 !== length)) throw new TransferError('The server returned an inconsistent resume range. Retry with a new plan.');
        job.total = responseLength(match[3]);
        if (job.total === null || job.total <= offset) throw new TransferError('Invalid resume size.');
      } else {
        if (offset) { await fd.truncate(0); job.bytes = 0; offset = 0; hash = createHash('sha256'); }
        job.total = length;
      }
      job.validator = validator; job.sourceKey = sourceKey; job.resourceKey = createHash('sha256').update(response.finalUrl).digest('hex');
      await checkSpace(job.destination, Math.max(0, (job.total ?? 0) - job.bytes)); await checkpoint();
      let lastSaved = Date.now(), lastSpeed = Date.now(), lastBytes = job.bytes;
      for await (const raw of response.body) {
        signal.throwIfAborted(); const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
        if (job.bytes + chunk.length > MAX_MEDIA_BYTES || (job.total !== null && job.bytes + chunk.length > job.total)) throw new TransferError('Media exceeded its declared size or the 8 GiB limit.');
        const partialInfo = await fd.stat();
        if (!partialInfo.isFile() || partialInfo.nlink !== 1) throw new TransferError('The partial file acquired another link. Download stopped.');
        let written = 0;
        while (written < chunk.length) {
          const result = await fd.write(chunk, written, chunk.length - written, job.bytes);
          if (!result.bytesWritten) throw new TransferError('Unable to write audio to disk.');
          hash.update(chunk.subarray(written, written + result.bytesWritten)); written += result.bytesWritten; job.bytes += result.bytesWritten;
        }
        const now = Date.now();
        if (now - lastSpeed >= 250) { running.speed = (job.bytes - lastBytes) * 1000 / (now - lastSpeed); lastSpeed = now; lastBytes = job.bytes; }
        if (now - lastSaved >= 1000) { await checkpoint(); await validateDestination(job, this.grants, grantId); lastSaved = now; }
      }
      signal.throwIfAborted();
      if (!job.bytes || (job.total !== null && job.bytes !== job.total) || !response.body.complete) throw new TransferError('Media transfer ended before the complete file arrived.');
      await checkAudio(fd, extname(job.relativePath).toLowerCase());
      const finalInfo = await fd.stat();
      if (finalInfo.nlink !== 1 || finalInfo.size !== job.bytes || (await hashPrefix(fd, job.bytes)).digest('hex') !== hash.copy().digest('hex')) throw new TransferError('The partial file changed during transfer. It was preserved.');
      job.total = job.bytes; job.finalizing = true; job.status = 'finalizing'; await checkpoint();
      await fd.close(); fd = null;
      await finalize(job, this.grants, grantId); this.completed(job);
    } catch (error) {
      response?.body.destroy();
      // Only verified bytes from this open handle become a new checkpoint.
      try { if (fd && checkpointAllowed) await checkpoint(); } catch { Object.assign(job, durable); }
      job.status = running.intent ? 'paused' : 'failed';
      job.error = running.intent ? null : error instanceof TransferError ? error.message : (error as NodeJS.ErrnoException)?.code === 'ENOSPC' ? 'Disk full. Free space, then retry.' : 'Download interrupted or could not be saved. Check the connection and folder, then retry.';
      try { this.store.saveTransfer(job); } catch { job.error = 'The download database could not be updated. Close the app and preserve the library for recovery.'; }
    } finally { response?.body.destroy(); await fd?.close().catch(() => {}); running.speed = 0; }
  }
  private completed(job: TransferRecord) { job.status = 'completed'; job.finalizing = false; job.error = null; job.completedAt = new Date().toISOString(); try { this.store.finishTransfer(job, foldedPath(finalPath(job))); } catch (error) { job.finalizing = true; throw error; } }
}
