import { transferRecord, type TransferRecord } from '../downloads/records';
import type { FilePlan, SavedFilePlan } from '../../shared/downloads';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname, sep } from 'node:path';
import { z } from 'zod';
import { catalogId, type CatalogChannel, type CatalogEpisode } from '../../shared/catalog';
import type { LibrarySnapshot } from '../../shared/library';

const text = z.string().max(1_000_000);
const image = z.string().max(2048).nullable();
const channelSchema = z.object({ id: catalogId, title: text, author: text, description: text, artworkUrl: image, episodeCount: z.number().int().nonnegative().nullable() }).strict();
const episodeSchema = z.object({ id: catalogId, channelId: catalogId, title: text, author: text, description: text, artworkUrl: image, publishedAt: z.string().datetime().nullable(), durationMs: z.number().nonnegative().nullable(), sizeBytes: z.number().nonnegative().nullable(), hasMediaSource: z.boolean(), channel: z.object({ id: catalogId, title: text, author: text, artworkUrl: image }).strict().nullable() }).strict();

export const LIBRARY_ERROR = 'The local library could not be opened or updated. Your database has not been reset. Close other app windows and retry; if the problem persists, preserve library.sqlite and its -wal/-shm files for recovery.';

export class LibraryStore {
  private db: DatabaseSync | null = null;
  constructor(private path: string) {}
  private open(): DatabaseSync {
    if (this.db) return this.db;
    mkdirSync(dirname(this.path), { recursive: true });
    const db = new DatabaseSync(this.path);
    try {
      const version = Number(db.prepare('PRAGMA user_version').get()!.user_version);
      if (version > 5) throw new Error('This library needs a newer app version.');
      const integrity = db.prepare('PRAGMA quick_check').all();
      if (integrity.length !== 1 || Object.values(integrity[0])[0] !== 'ok') throw new Error('Library integrity check failed.');
      db.exec('PRAGMA foreign_keys=ON; PRAGMA busy_timeout=1500;');
      if (version === 0) {
        if (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all().length) throw new Error('Unrecognized library schema.');
        db.exec('BEGIN IMMEDIATE');
        try {
          db.exec(`
            CREATE TABLE channels (id TEXT PRIMARY KEY, metadata TEXT NOT NULL CHECK(json_valid(metadata)), updated_at TEXT NOT NULL) STRICT;
            CREATE TABLE episodes (id TEXT PRIMARY KEY, channel_id TEXT NOT NULL REFERENCES channels(id), metadata TEXT NOT NULL CHECK(json_valid(metadata)), updated_at TEXT NOT NULL) STRICT;
            CREATE TABLE saved_channels (channel_id TEXT PRIMARY KEY REFERENCES channels(id), saved_at TEXT NOT NULL) STRICT;
            CREATE TABLE playback_progress (episode_id TEXT PRIMARY KEY REFERENCES episodes(id), position_ms INTEGER NOT NULL CHECK(position_ms >= 0), completed INTEGER NOT NULL CHECK(completed IN (0,1)), updated_at TEXT NOT NULL) STRICT;
            CREATE TABLE listening_queue (episode_id TEXT PRIMARY KEY REFERENCES episodes(id), position INTEGER NOT NULL CHECK(position >= 0)) STRICT;
            CREATE TABLE download_queue (episode_id TEXT PRIMARY KEY REFERENCES episodes(id), status TEXT NOT NULL CHECK(status IN ('planned','queued','downloading','paused','completed','failed')), updated_at TEXT NOT NULL) STRICT;
            PRAGMA user_version=1;
          `);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      for (const query of ['SELECT metadata FROM channels', 'SELECT metadata, channel_id FROM episodes', 'SELECT saved_at FROM saved_channels', 'SELECT position_ms, completed FROM playback_progress', 'SELECT position FROM listening_queue', 'SELECT status FROM download_queue']) db.prepare(query + ' LIMIT 0');
      if (version < 2) {
        db.exec('BEGIN IMMEDIATE');
        try {
          db.exec(`CREATE TABLE file_plans (id TEXT PRIMARY KEY, body TEXT NOT NULL CHECK(json_valid(body)), committed_at TEXT NOT NULL) STRICT;
            CREATE TABLE file_reservations (target_key TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES file_plans(id)) STRICT;
            PRAGMA user_version=2;`);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      db.prepare('SELECT target_key, plan_id FROM file_reservations LIMIT 0');
      db.prepare('SELECT id, body, committed_at FROM file_plans LIMIT 0');
      if (version < 3) {
        db.exec('BEGIN IMMEDIATE');
        try {
          db.exec(`CREATE TABLE transfer_runs (plan_id TEXT PRIMARY KEY REFERENCES file_plans(id)) STRICT;
            CREATE TABLE transfer_jobs (id TEXT PRIMARY KEY, plan_id TEXT NOT NULL REFERENCES transfer_runs(plan_id), body TEXT NOT NULL CHECK(json_valid(body))) STRICT;
            PRAGMA user_version=3;`);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      db.prepare('SELECT id, plan_id, body FROM transfer_jobs LIMIT 0');
      db.prepare('SELECT plan_id FROM transfer_runs LIMIT 0');
      if (version < 4) {
        db.exec('BEGIN IMMEDIATE');
        try {
          db.exec(`CREATE TABLE playback_queue (job_id TEXT PRIMARY KEY, position INTEGER NOT NULL UNIQUE CHECK(position >= 0)) STRICT;
            CREATE TABLE playback_state (job_id TEXT PRIMARY KEY, position_ms INTEGER NOT NULL CHECK(position_ms >= 0), completed INTEGER NOT NULL CHECK(completed IN (0,1)), updated_at TEXT NOT NULL) STRICT;
            PRAGMA user_version=4;`);
          db.exec('COMMIT');
        } catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      db.prepare('SELECT job_id, position FROM playback_queue LIMIT 0');
      db.prepare('SELECT job_id, position_ms, completed FROM playback_state LIMIT 0');
      if (version < 5) {
        db.exec('BEGIN IMMEDIATE');
        try { db.exec(`ALTER TABLE playback_state ADD COLUMN duration_ms INTEGER CHECK(duration_ms IS NULL OR duration_ms >= 0); PRAGMA user_version=5;`); db.exec('COMMIT'); }
        catch (error) { db.exec('ROLLBACK'); throw error; }
      }
      db.prepare('SELECT job_id, position_ms, duration_ms, completed FROM playback_state LIMIT 0');
      // Validate schema before enabling WAL or exposing any operations.
      for (const query of ['SELECT metadata FROM channels', 'SELECT metadata, channel_id FROM episodes', 'SELECT saved_at FROM saved_channels', 'SELECT position_ms, completed FROM playback_progress', 'SELECT position FROM listening_queue', 'SELECT status FROM download_queue']) db.prepare(query + ' LIMIT 0');
      db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL;');
      this.db = db;
      return db;
    } catch (error) { db.close(); throw error; }
  }
  private transaction<T>(work: (db: DatabaseSync) => T): T {
    const db = this.open(); db.exec('BEGIN IMMEDIATE');
    try { const result = work(db); db.exec('COMMIT'); return result; }
    catch (error) { db.exec('ROLLBACK'); throw error; }
  }
  private putChannel(db: DatabaseSync, channel: CatalogChannel) {
    const item = channelSchema.parse(channel);
    db.prepare('INSERT INTO channels VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET metadata=excluded.metadata, updated_at=excluded.updated_at').run(item.id, JSON.stringify(item), new Date().toISOString());
  }
  read(): LibrarySnapshot {
    return { savedChannels: this.open().prepare('SELECT c.metadata, s.saved_at FROM saved_channels s JOIN channels c ON c.id=s.channel_id ORDER BY s.saved_at DESC, c.id').all().map(row => ({ channel: channelSchema.parse(JSON.parse(String(row.metadata))), savedAt: String(row.saved_at) })) };
  }
  isSaved(id: string): boolean { return Boolean(this.open().prepare('SELECT 1 FROM saved_channels WHERE channel_id=?').get(catalogId.parse(id))); }
  save(channel: CatalogChannel): LibrarySnapshot {
    return this.transaction(db => {
      if (!this.isSaved(channel.id) && Number(db.prepare('SELECT count(*) AS n FROM saved_channels').get()!.n) >= 5000) throw new Error('Saved channel limit reached.');
      this.putChannel(db, channel);
      db.prepare('INSERT INTO saved_channels VALUES (?, ?) ON CONFLICT(channel_id) DO NOTHING').run(channel.id, new Date().toISOString());
      return this.read();
    });
  }
  unsave(id: string): LibrarySnapshot {
    return this.transaction(db => {
      db.prepare('DELETE FROM saved_channels WHERE channel_id=?').run(catalogId.parse(id));
      return this.read();
    });
  }
  // Internal foundation for upcoming playback/transfer services. No renderer write
  // access to progress or job states before those services can verify real work.
  rememberEpisode(channel: CatalogChannel, episode: CatalogEpisode): void {
    const item = episodeSchema.parse(episode);
    if (channel.id !== item.channelId || (item.channel && item.channel.id !== item.channelId)) throw new Error('Episode/channel mismatch.');
    this.transaction(db => {
      this.putChannel(db, channel);
      db.prepare('INSERT INTO episodes VALUES (?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET channel_id=excluded.channel_id, metadata=excluded.metadata, updated_at=excluded.updated_at').run(item.id, item.channelId, JSON.stringify(item), new Date().toISOString());
    });
  }
  setProgress(id: string, positionMs: number, completed: boolean): void {
    catalogId.parse(id); z.number().int().nonnegative().safe().parse(positionMs); z.boolean().parse(completed);
    this.open().prepare('INSERT INTO playback_progress VALUES (?, ?, ?, ?) ON CONFLICT(episode_id) DO UPDATE SET position_ms=excluded.position_ms, completed=excluded.completed, updated_at=excluded.updated_at').run(id, positionMs, Number(completed), new Date().toISOString());
  }
  replaceListeningQueue(ids: string[]): void {
    z.array(catalogId).max(5000).refine(items => new Set(items).size === items.length).parse(ids);
    this.transaction(db => {
      db.exec('DELETE FROM listening_queue');
      const insert = db.prepare('INSERT INTO listening_queue VALUES (?, ?)');
      ids.forEach((id, position) => insert.run(id, position));
    });
  }
  planDownload(id: string): void {
    this.open().prepare("INSERT INTO download_queue VALUES (?, 'planned', ?) ON CONFLICT(episode_id) DO NOTHING").run(catalogId.parse(id), new Date().toISOString());
  }
  readPlan(id: string): SavedFilePlan | null {
    const row = this.open().prepare('SELECT body FROM file_plans WHERE id=?').get(id);
    return row ? JSON.parse(String(row.body)) as SavedFilePlan : null;
  }
  listPlans(): SavedFilePlan[] {
    return this.open().prepare('SELECT body FROM file_plans ORDER BY committed_at DESC, id LIMIT 100').all().map(row => JSON.parse(String(row.body)) as SavedFilePlan);
  }
  reservedTargets(): Set<string> {
    return new Set(this.open().prepare('SELECT target_key FROM file_reservations').all().map(row => String(row.target_key)));
  }
  commitPlan(plan: FilePlan, targets: string[]): SavedFilePlan {
    return this.transaction(db => {
      const existing = this.readPlan(plan.id); if (existing) return existing;
      const reserved = [...this.reservedTargets()];
      for (const target of targets) {
        if (reserved.some(other => other === target || other.startsWith(target + sep) || target.startsWith(other + sep))) throw new Error('Destination already reserved.');
        reserved.push(target);
      }
      const saved: SavedFilePlan = { ...plan, status: 'planned', committedAt: new Date().toISOString() };
      db.prepare('INSERT INTO file_plans VALUES (?, ?, ?)').run(plan.id, JSON.stringify(saved), saved.committedAt);
      const reserve = db.prepare('INSERT INTO file_reservations VALUES (?, ?)');
      targets.forEach(target => reserve.run(target, plan.id));
      return saved;
    });
  }
  transferJobs(): TransferRecord[] { return this.open().prepare('SELECT body FROM transfer_jobs ORDER BY rowid').all().map(row => transferRecord.parse(JSON.parse(String(row.body)))); }
  transferPlans(): string[] { return this.open().prepare('SELECT plan_id FROM transfer_runs').all().map(row => String(row.plan_id)); }
  queueJobIds(): string[] { return this.open().prepare('SELECT job_id FROM playback_queue ORDER BY position').all().map(row => String(row.job_id)); }
  replaceQueueJobIds(ids: string[]): void {
    z.array(z.string().uuid()).max(5000).refine(items => new Set(items).size === items.length).parse(ids);
    this.transaction(db => { db.exec('DELETE FROM playback_queue'); const insert = db.prepare('INSERT INTO playback_queue VALUES (?, ?)'); ids.forEach((id, position) => insert.run(id, position)); });
  }
  playbackPosition(jobId: string): { positionMs: number; durationMs: number | null; completed: boolean } | null {
    const row = this.open().prepare('SELECT position_ms, duration_ms, completed FROM playback_state WHERE job_id=?').get(z.string().uuid().parse(jobId));
    return row ? { positionMs: Number(row.position_ms), durationMs: row.duration_ms === null ? null : Number(row.duration_ms), completed: Boolean(row.completed) } : null;
  }
  latestPlaybackJobId(): string | null {
    const row = this.open().prepare('SELECT job_id FROM playback_state ORDER BY updated_at DESC, job_id LIMIT 1').get();
    return row ? String(row.job_id) : null;
  }
  playbackHistory(): Array<{ jobId: string; updatedAt: string }> {
    return this.open().prepare('SELECT job_id, updated_at FROM playback_state ORDER BY updated_at DESC, job_id').all()
      .map(row => ({ jobId: String(row.job_id), updatedAt: String(row.updated_at) }));
  }
  clearPlaybackHistory(): void { this.open().exec('DELETE FROM playback_state'); }
  savePlaybackPosition(jobId: string, positionMs: number, completed: boolean, durationMs: number | null = null): void {
    z.string().uuid().parse(jobId); z.number().int().nonnegative().max(8_640_000_000).parse(positionMs); z.boolean().parse(completed); z.number().int().nonnegative().max(8_640_000_000).nullable().parse(durationMs);
    this.open().prepare('INSERT INTO playback_state (job_id, position_ms, completed, updated_at, duration_ms) VALUES (?, ?, ?, ?, ?) ON CONFLICT(job_id) DO UPDATE SET position_ms=excluded.position_ms, duration_ms=COALESCE(excluded.duration_ms, playback_state.duration_ms), completed=excluded.completed, updated_at=excluded.updated_at').run(jobId, positionMs, Number(completed), new Date().toISOString(), durationMs);
  }
  createTransfers(planId: string, jobs: TransferRecord[]): void {
    this.transaction(db => {
      if (db.prepare('SELECT 1 FROM transfer_runs WHERE plan_id=?').get(planId)) return;
      if (this.transferJobs().filter(job => !job.dismissed).length + jobs.length > 5000) throw new Error('Download history limit reached. Remove completed rows first.');
      db.prepare('INSERT INTO transfer_runs VALUES (?)').run(planId);
      const insert = db.prepare('INSERT INTO transfer_jobs VALUES (?, ?, ?)');
      jobs.forEach(job => insert.run(job.id, planId, JSON.stringify(transferRecord.parse(job))));
    });
  }
  saveTransfer(job: TransferRecord): void {
    const parsed = transferRecord.parse(job);
    this.open().prepare('UPDATE transfer_jobs SET body=? WHERE id=?').run(JSON.stringify(parsed), job.id);
  }
  finishTransfer(job: TransferRecord, target: string): void {
    this.transaction(db => { this.saveTransfer(job); db.prepare('DELETE FROM file_reservations WHERE plan_id=? AND target_key=?').run(job.planId, target); });
  }
  releaseTransferTarget(planId: string, target: string): void {
    this.open().prepare('DELETE FROM file_reservations WHERE plan_id=? AND target_key=?').run(planId, target);
  }
  discardPlan(id: string): void {
    this.transaction(db => {
      if (db.prepare('SELECT 1 FROM transfer_runs WHERE plan_id=?').get(id)) throw new Error('This plan has downloads. Cancel individual downloads instead.');
      db.prepare('DELETE FROM file_reservations WHERE plan_id=?').run(id);
      db.prepare('DELETE FROM file_plans WHERE id=?').run(id);
    });
  }
  close(): void { this.db?.close(); this.db = null; }
}
