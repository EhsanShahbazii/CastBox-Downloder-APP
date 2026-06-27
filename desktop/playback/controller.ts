import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { lstat, open } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { z } from 'zod';
import { join } from 'node:path';
import { playbackJobId, progressInput, queueInput, type PlaybackSnapshot, type PlaybackTrack } from '../../shared/playback';
import { LibraryStore } from '../library/store';
import type { TransferRecord } from '../downloads/records';
import { sameNode } from '../downloads/files';

const audioTypes: Record<string, string> = { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.aac': 'audio/aac', '.ogg': 'audio/ogg', '.opus': 'audio/ogg', '.wav': 'audio/wav', '.flac': 'audio/flac' };
const suffix = (path: string) => path.slice(path.lastIndexOf('.')).toLowerCase();

export class PlaybackController {
  private grants = new Map<string, { jobId: string; expires: number }>();
  constructor(private store: LibraryStore) {}
  private jobs(): TransferRecord[] { return this.store.transferJobs(); }
  private track(job: TransferRecord): PlaybackTrack {
    const progress = this.store.playbackPosition(job.id);
    return { jobId: job.id, episodeId: job.episodeId, title: job.title, channelTitle: job.channelTitle, artworkUrl: job.artworkUrl,
      durationSeconds: (progress?.durationMs ?? job.durationMs) === null ? null : (progress?.durationMs ?? job.durationMs)! / 1000, positionMs: progress?.positionMs ?? 0, completed: progress?.completed ?? false };
  }
  snapshot(): PlaybackSnapshot {
    const jobs = this.jobs().filter(job => job.status === 'completed' && !job.dismissed);
    const byId = new Map(jobs.map(job => [job.id, job]));
    const queue = this.store.queueJobIds().map(id => byId.get(id)).filter((job): job is TransferRecord => Boolean(job)).map(job => this.track(job));
    const recentId = this.store.latestPlaybackJobId(); const recent = recentId ? byId.get(recentId) : undefined;
    const recentlyPlayed = this.store.playbackHistory().flatMap(({ jobId, updatedAt }) => {
      const job = byId.get(jobId);
      return job ? [{ ...this.track(job), updatedAt }] : [];
    });
    return { queue, lastTrack: recent ? this.track(recent) : null, recentlyPlayed };
  }
  async source(input: unknown): Promise<string> {
    const { jobId } = z.object({ jobId: playbackJobId }).strict().parse(input); const job = this.jobs().find(item => item.id === jobId && item.status === 'completed' && !item.dismissed);
    if (!job || !job.partial || !job.total || !audioTypes[suffix(job.relativePath)]) throw new Error('This completed audio file is unavailable.');
    const path = join(job.destination, ...job.relativePath.split('/')); let info: Awaited<ReturnType<typeof lstat>>;
    try { info = await lstat(path); } catch { throw new Error('The downloaded audio file is missing or changed.'); }
    if (!info.isFile() || info.isSymbolicLink() || info.size !== job.bytes || !sameNode(info, job.partial)) throw new Error('The downloaded audio file is missing or changed.');
    const token = randomUUID(); this.grants.set(token, { jobId, expires: Date.now() + 12 * 60 * 60 * 1000 });
    if (this.grants.size > 5000) for (const [key, grant] of this.grants) if (grant.expires < Date.now()) this.grants.delete(key);
    return `castbox-media://local/${token}`;
  }
  saveProgress(input: unknown): void { const data = progressInput.parse(input); if (!this.jobs().some(job => job.id === data.jobId && job.status === 'completed' && !job.dismissed)) throw new Error('Playback item is unavailable.'); this.store.savePlaybackPosition(data.jobId, data.positionMs, data.completed, data.durationMs ?? null); }
  replaceQueue(input: unknown): PlaybackSnapshot {
    const { jobIds } = queueInput.parse(input); const jobs = new Set(this.jobs().filter(job => job.status === 'completed' && !job.dismissed).map(job => job.id));
    if (jobIds.some(id => !jobs.has(id))) throw new Error('Queue items must be completed local downloads.');
    this.store.replaceQueueJobIds(jobIds); return this.snapshot();
  }
  async serve(request: Request): Promise<Response> {
    const token = new URL(request.url).pathname.slice(1); const grant = this.grants.get(token);
    if (!grant || grant.expires < Date.now()) return new Response('Not found', { status: 404 });
    const job = this.jobs().find(item => item.id === grant.jobId && item.status === 'completed' && !item.dismissed);
    if (!job || !job.partial) return new Response('Not found', { status: 404 });
    const path = join(job.destination, ...job.relativePath.split('/')); let handle;
    try { handle = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0)); const stat = await handle.stat();
      if (!stat.isFile() || stat.size !== job.bytes || !sameNode(stat, job.partial)) { await handle.close(); return new Response('Not found', { status: 404 }); }
      const range = request.headers.get('range'); let start = 0, end = stat.size - 1, status = 200;
      if (range) { const match = /^bytes=(\d*)-(\d*)$/.exec(range); if (!match || (!match[1] && !match[2])) { await handle.close(); return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } }); }
        if (!match[1]) { const tail = Number(match[2]); start = Math.max(0, stat.size - tail); } else { start = Number(match[1]); if (match[2]) end = Math.min(end, Number(match[2])); }
        if (!Number.isSafeInteger(start) || start > end || start >= stat.size) { await handle.close(); return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${stat.size}` } }); } status = 206;
      }
      const length = end - start + 1; const stream = handle.createReadStream({ autoClose: true, start, end }); handle = undefined;
      const headers = new Headers({ 'Content-Type': audioTypes[suffix(job.relativePath)], 'Accept-Ranges': 'bytes', 'Content-Length': String(length), 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      if (status === 206) headers.set('Content-Range', `bytes ${start}-${end}/${stat.size}`);
      return new Response(Readable.toWeb(stream) as ReadableStream, { status, headers });
    } catch { await handle?.close().catch(() => {}); return new Response('Not found', { status: 404 }); }
  }
}
