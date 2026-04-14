import { lstat, realpath, readdir, access, statfs } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { randomUUID } from 'node:crypto';
import { filenameTemplate, type DirectoryGrant } from '../../shared/downloads';

export const foldedPath = (value: string) => value.normalize('NFC').toLowerCase();
export function safeSegment(value: string): string {
  let safe = value.normalize('NFC').replace(/[<>:"/\\|?*\p{Cc}\p{Cf}]/gu, '_').replace(/[. ]+$/g, '').trim();
  if (!safe || /^\.+$/.test(safe)) safe = '_';
  if (/^(con|prn|aux|nul|com[0-9¹²³]|lpt[0-9¹²³])(?:\.|$)/i.test(safe)) safe = '_' + safe;
  while (Buffer.byteLength(safe, 'utf8') > 120) safe = Array.from(safe).slice(0, -1).join('');
  return safe.replace(/[. ]+$/g, '') || '_';
}
export function filename(pattern: string, tokens: Record<'channel' | 'title' | 'date' | 'eid', string>, extension: string, group: boolean): string {
  filenameTemplate.parse(pattern);
  if (!/^\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i.test(extension)) throw new Error('Source audio format is not known.');
  const parts = pattern.split('/').map(part => safeSegment(part.replace(/\{(channel|title|date|eid)\}/g, (_m, key: keyof typeof tokens) => safeSegment(tokens[key]))));
  const last = parts.pop()!.replace(/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i, '');
  parts.push(safeSegment(last) + extension.toLowerCase());
  if (group && foldedPath(parts[0]) !== foldedPath(safeSegment(tokens.channel))) parts.unshift(safeSegment(tokens.channel));
  const result = parts.join('/');
  if (Buffer.byteLength(result) > 220) throw new Error('Filename is too long. Shorten the filename template.');
  return result;
}
export interface Identity { dev: number; ino: number; size: number; mtimeMs: number; ctimeMs: number }
export interface Inspection { target: Identity | null; parents: Array<{ path: string; dev: number; ino: number }> }
interface Grant extends DirectoryGrant { dev: number; ino: number }
export class DirectoryGrants {
  private grants = new Map<string, Grant>();
  async issue(path: string): Promise<DirectoryGrant> {
    const canonical = await realpath(path); const info = await lstat(canonical);
    if (!info.isDirectory() || info.isSymbolicLink()) throw new Error('Choose a real directory.');
    await access(canonical, constants.W_OK | constants.X_OK);
    const grant = { id: randomUUID(), path: canonical, dev: info.dev, ino: info.ino };
    if (this.grants.size >= 64) this.grants.delete(this.grants.keys().next().value!);
    this.grants.set(grant.id, grant); return { id: grant.id, path: grant.path };
  }
  async get(id: string): Promise<Grant> {
    const grant = this.grants.get(id); if (!grant) throw new Error('Choose the destination folder again. Its permission has expired.');
    const info = await lstat(grant.path);
    if (!info.isDirectory() || info.isSymbolicLink() || info.dev !== grant.dev || info.ino !== grant.ino || await realpath(grant.path) !== grant.path) throw new Error('Destination changed. Choose the folder again.');
    await access(grant.path, constants.W_OK | constants.X_OK); return grant;
  }
  revokeAll() { this.grants.clear(); }
}
export class CaseCollision extends Error {}
export async function inspectPath(root: string, path: string): Promise<Inspection> {
  if (Buffer.byteLength(path) > 220) throw new Error('Filename is too long. Shorten the filename template.');
  if (isAbsolute(path) || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..')) throw new Error('Unsafe relative filename.');
  const target = resolve(root, ...path.split('/')); const rel = relative(root, target);
  if (!rel || rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) throw new Error('Filename escapes the chosen folder.');
  let current = root; const parents: Inspection['parents'] = [];
  const parts = path.split('/');
  for (let i = 0; i < parts.length; i++) {
    const entries = await readdir(current);
    const aliases = entries.filter(name => foldedPath(name) === foldedPath(parts[i]));
    if (aliases.length && (aliases.length !== 1 || aliases[0] !== parts[i])) {
      if (i === parts.length - 1) throw new CaseCollision('A filename differs only by case or Unicode spelling. Choose Rename duplicates.');
      throw new Error('A folder differs only by case or Unicode spelling. Choose a matching template.');
    }
    current = join(current, parts[i]);
    let info;
    try { info = await lstat(current); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { target: null, parents }; throw error; }
    if (info.isSymbolicLink()) throw new Error('A destination component is a symbolic link. Choose another path.');
    if (i < parts.length - 1) {
      if (!info.isDirectory()) throw new Error('A destination folder is occupied by a file.');
      parents.push({ path: current, dev: info.dev, ino: info.ino });
    } else {
      if (!info.isFile() || info.nlink !== 1) throw new Error('The destination is not a regular, unlinked file.');
      return { target: { dev: info.dev, ino: info.ino, size: info.size, mtimeMs: info.mtimeMs, ctimeMs: info.ctimeMs }, parents };
    }
  }
  return { target: null, parents };
}
export async function checkSpace(root: string, bytes: number) {
  const space = await statfs(root); if (space.bavail * space.bsize < bytes) throw new Error('Not enough available disk space for the known episode sizes.');
}
