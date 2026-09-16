import { mkdir, readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { settingsSchema } from '../shared/desktop';
import type { AppSettings } from '../ai-studio-frontend/src/types';

export class SettingsStore {
  private pending: Promise<unknown> = Promise.resolve();
  private current: AppSettings;
  constructor(private file: string, private defaults: AppSettings) {
    this.current = { ...defaults };
  }

  get currentSettings(): AppSettings {
    return this.current;
  }

  async read(): Promise<AppSettings> {
    let text: string;
    try { text = await readFile(this.file, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.current = { ...this.defaults };
        return { ...this.defaults };
      }
      throw new Error('Settings could not be read. Check access to the application data folder.');
    }
    try {
      const data = JSON.parse(text);
      if (data.version !== 1) throw new Error();
      this.current = settingsSchema.parse(data.settings);
      return this.current;
    } catch { throw new Error('Saved settings are invalid. The original file has been preserved.'); }
  }

  save(input: unknown): Promise<AppSettings> {
    const run = this.pending.then(async () => {
      const settings = settingsSchema.parse(input);
      await this.read(); // Do not silently overwrite corrupt/unsupported data.
      await mkdir(dirname(this.file), { recursive: true });
      const temporary = `${this.file}.${randomUUID()}.tmp`;
      try {
        await writeFile(temporary, JSON.stringify({ version: 1, settings }, null, 2), { mode: 0o600, flag: 'wx', flush: true });
        await rename(temporary, this.file);
        this.current = settings;
      } catch {
        await unlink(temporary).catch(() => {});
        throw new Error('Settings could not be saved. Check disk space and folder permissions.');
      }
      return settings;
    });
    this.pending = run.catch(() => {});
    return run;
  }
}
