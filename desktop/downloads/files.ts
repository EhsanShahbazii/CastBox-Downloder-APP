import { constants } from 'node:fs';
import { open, mkdir, lstat, unlink, link, rename, realpath, type FileHandle } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { createHash } from 'node:crypto';
import { inspectPath, DirectoryGrants, type Inspection } from './paths';
import type { TransferRecord } from './records';
import { TransferError } from './transport';

export const sameNode = (a: { dev: number; ino: number }, b: { dev: number; ino: number }) => a.dev === b.dev && a.ino === b.ino;
export const partialPath = (job: TransferRecord) => join(job.destination, dirname(job.relativePath), `.castbox-${job.id}.part`);
export const finalPath = (job: TransferRecord) => join(job.destination, ...job.relativePath.split('/'));
export async function validateDestination(job: TransferRecord, grants: DirectoryGrants, grantId: string, create = false): Promise<Inspection> {
  const grant = await grants.get(grantId);
  if (grant.path !== job.destination) throw new TransferError('Choose the original destination folder for this download.');
  let inspection = await inspectPath(grant.path, job.relativePath);
  for (const parent of job.parents) {
    if (!inspection.parents.some(current => current.path === parent.path && sameNode(current, parent))) throw new TransferError('A destination folder changed. Create a new file plan.');
  }
  if (create) {
    const parts = job.relativePath.split('/').slice(0, -1); let path = grant.path;
    for (const part of parts) {
      path = join(path, part);
      try { await mkdir(path, { mode: 0o700 }); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error; }
      const stat = await lstat(path);
      if (!stat.isDirectory() || stat.isSymbolicLink() || await realpath(path) !== path) throw new TransferError('Destination folder is unsafe.');
      await grants.get(grantId);
    }
    inspection = await inspectPath(grant.path, job.relativePath);
    job.parents = inspection.parents;
  }
  return inspection;
}
export async function openPartial(job: TransferRecord): Promise<FileHandle> {
  const path = partialPath(job);
  if (!job.partial) {
    const fd = await open(path, constants.O_CREAT | constants.O_EXCL | constants.O_RDWR | (constants.O_NOFOLLOW ?? 0), 0o600);
    const info = await fd.stat(); job.partial = { dev: info.dev, ino: info.ino }; return fd;
  }
  const info = await lstat(path);
  if (!info.isFile() || info.nlink !== 1 || !sameNode(info, job.partial)) throw new TransferError('The partial file changed. It has been preserved. Cancel and create a new plan.');
  const fd = await open(path, constants.O_RDWR | (constants.O_NOFOLLOW ?? 0));
  const actual = await fd.stat();
  if (!actual.isFile() || actual.nlink !== 1 || !sameNode(actual, job.partial)) { await fd.close(); throw new TransferError('The partial file changed.'); }
  return fd;
}
export async function hashPrefix(fd: FileHandle, length: number) {
  const hash = createHash('sha256'); const buffer = Buffer.alloc(64 * 1024); let offset = 0;
  while (offset < length) {
    const { bytesRead } = await fd.read(buffer, 0, Math.min(buffer.length, length - offset), offset);
    if (!bytesRead) throw new TransferError('The partial file is shorter than its saved checkpoint.');
    hash.update(buffer.subarray(0, bytesRead)); offset += bytesRead;
  }
  return hash;
}
export async function verifyPartial(job: TransferRecord, fd: FileHandle) {
  const hash = await hashPrefix(fd, job.bytes);
  if (job.bytes && hash.copy().digest('hex') !== job.digest) throw new TransferError('The partial file contents changed. It has been preserved.');
  await fd.truncate(job.bytes); return hash;
}
export async function removePartial(job: TransferRecord) {
  if (!job.partial) return;
  try {
    const info = await lstat(partialPath(job));
    if (!info.isFile() || info.nlink !== 1 || !sameNode(info, job.partial)) throw new TransferError('The partial file changed; it was not deleted.');
    await unlink(partialPath(job)); job.partial = null;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; job.partial = null; }
}
export async function syncParent(job: TransferRecord) {
  // Windows does not support opening directories for fsync through this API.
  if (process.platform === 'win32') return;
  const directory = await open(dirname(finalPath(job)), constants.O_RDONLY);
  try { await directory.sync(); } finally { await directory.close(); }
}
export async function finalize(job: TransferRecord, grants: DirectoryGrants, grantId: string) {
  const current = await validateDestination(job, grants, grantId);
  const part = await lstat(partialPath(job));
  if (!job.partial || !part.isFile() || part.nlink !== 1 || !sameNode(part, job.partial)) throw new TransferError('The partial file changed before completion.');
  if (job.replace) {
    if (JSON.stringify(current.target) !== JSON.stringify(job.target)) throw new TransferError('The file selected for replacement changed. It was not replaced.');
    // Replacement uses one atomic rename only after the reviewed target is unchanged.
    await rename(partialPath(job), finalPath(job));
  } else {
    if (current.target) throw new TransferError('Another file now occupies this filename. It was not overwritten.');
    // link is atomic and fails on an existing target, unlike rename.
    await link(partialPath(job), finalPath(job));
    await unlink(partialPath(job));
  }
  await syncParent(job);
}
export async function recoverFinal(job: TransferRecord, grants: DirectoryGrants, grantId: string): Promise<boolean> {
  // Finalizing may have crashed between atomic placement and the database commit.
  await grants.get(grantId);
  const path = finalPath(job);
  let stat;
  try { stat = await lstat(path); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error; }
  if (!job.partial || !stat.isFile() || !sameNode(stat, job.partial) || stat.size !== job.bytes) return false;
  // inspectPath rejects the transient two-link state; verify folders independently.
  const probe = await inspectPath(job.destination, join(dirname(job.relativePath), `.castbox-${job.id}.probe`).split('\\').join('/'));
  if (job.parents.some(parent => !probe.parents.some(current => current.path === parent.path && sameNode(parent,current)))) throw new TransferError('Destination folders changed during recovery.');
  const fd = await open(path, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  try {
    if (!sameNode(await fd.stat(), job.partial) || (await hashPrefix(fd, job.bytes)).digest('hex') !== job.digest) throw new TransferError('Completed file did not match its saved checksum.');
  } finally { await fd.close(); }
  try {
    const part = await lstat(partialPath(job));
    if (sameNode(part, stat) && part.isFile()) await unlink(partialPath(job));
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  await syncParent(job); return true;
}
export async function checkAudio(fd: FileHandle, extension: string) {
  const b = Buffer.alloc(16); const { bytesRead } = await fd.read(b, 0, 16, 0);
  const text = b.toString('ascii');
  const valid = bytesRead >= 4 && (extension === '.mp3' ? text.startsWith('ID3') || (b[0] === 255 && (b[1] & 224) === 224) : extension === '.m4a' ? text.slice(4,8) === 'ftyp' : extension === '.wav' ? text.startsWith('RIFF') && text.slice(8,12) === 'WAVE' : extension === '.flac' ? text.startsWith('fLaC') : ['.ogg','.opus'].includes(extension) ? text.startsWith('OggS') : extension === '.aac' ? (b[0] === 255 && (b[1] & 246) === 240) || text.startsWith('ADIF') : false);
  if (!valid) throw new TransferError('The response is not a recognized audio file for this extension.');
}
