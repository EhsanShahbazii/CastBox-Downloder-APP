import test, { mock } from 'node:test';
import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm, symlink, stat, open, link, rename, appendFile, unlink, realpath } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { DirectoryGrants } from '../desktop/downloads/paths';
import { DownloadPlanner } from '../desktop/downloads/planner';
import { TransferEngine } from '../desktop/downloads/engine';
import { LibraryStore } from '../desktop/library/store';
import { CatalogClient } from '../desktop/catalog/client';
import { mediaTransport, mediaUrl, publicAddress, type MediaTransport } from '../desktop/downloads/transport';
import { partialPath, finalPath } from '../desktop/downloads/files';

const audio = Buffer.concat([Buffer.from('ID3'), Buffer.alloc(512 * 1024, 42)]);
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(check: () => boolean, message = 'condition', timeout = 6000) {
  const deadline = Date.now() + timeout;
  while (!check()) { if (Date.now() > deadline) throw new Error(`Timed out: ${message}`); await sleep(5); }
}
const localTransport: MediaTransport = (url, headers, signal) => new Promise((resolve,reject) => {
  const req = request(url, { headers, signal }, body => resolve({ body, status: body.statusCode!, headers: body.headers, finalUrl: url })); req.on('error',reject); req.end();
});
type Mode = 'range' | 'ignore' | 'bad-range' | 'changed' | 'unknown' | 'html' | 'truncated' | '416' | 'no-etag' | 'resource';
async function fixture(work: (ctx: { engine: TransferEngine; planner: DownloadPlanner; store: LibraryStore; grants: DirectoryGrants; grantId: string; destination: string; root: string; source: CatalogClient; requests: Array<Record<string,unknown>>; mode: (next: Mode) => void; start: (ids?: string[], concurrency?: number) => Promise<void>; peak: () => number }) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(),'castbox-transfers-')); const destination = join(root,'audio'); await mkdir(destination);
  let mode: Mode = 'range', active = 0, peak = 0; const requests: Array<Record<string,unknown>> = [];
  const server = createServer((req,res) => {
    active++; peak = Math.max(peak,active); res.on('close', () => { active--; });
    const offset = Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1] ?? 0); requests.push({ offset, ifRange: req.headers['if-range'] });
    if (mode === 'html') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<html>login</html>'); return; }
    if (mode === '416' && offset) { res.writeHead(416); res.end(); return; }
    const useRange = offset && !['ignore','changed'].includes(mode);
    const start = useRange ? offset : 0;
    const headers: Record<string,string> = { 'content-type':'audio/mpeg', etag: mode === 'changed' ? '"v2"' : '"v1"' };
    if (mode === 'no-etag') delete headers.etag;
    if (mode !== 'unknown') headers['content-length'] = String(audio.length - start);
    if (useRange) headers['content-range'] = `bytes ${mode === 'bad-range' ? start + 1 : start}-${audio.length - 1}/${audio.length}`;
    res.writeHead(useRange ? 206 : 200, headers); let position = start;
    const timer = setInterval(() => {
      if (mode === 'truncated' && position >= 64 * 1024) { res.destroy(); return; }
      const end = Math.min(position + 16 * 1024, audio.length); res.write(audio.subarray(position,end)); position = end;
      if (position === audio.length) res.end();
    }, 5);
    res.on('close', () => clearInterval(timer));
  });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const url = `http://127.0.0.1:${(server.address() as { port: number }).port}/audio.mp3`;
  // Explicit controlled catalog and transport; production has no localhost bypass.
  const source = new CatalogClient();
  const episode = (id: string) => ({ id, channelId:'1', title:`Episode ${id}`, author:'', description:'', artworkUrl:null, publishedAt:null, durationMs:null, sizeBytes:audio.length, hasMediaSource:true, channel:null });
  source.channel = async () => ({ id:'1', title:'Test channel', author:'', description:'', artworkUrl:null, episodeCount:3 });
  source.planningEpisodes = async input => (input as {episodeIds:string[]}).episodeIds.map(id => ({ episode:episode(id),extension:'.mp3' }));
  source.mediaSource = async id => ({ episode:episode(id),url });
  const store = new LibraryStore(join(root,'library.sqlite')); const grants = new DirectoryGrants(); const grantId = (await grants.issue(destination)).id;
  const planner = new DownloadPlanner(grants,store,source);
  const transport: MediaTransport = async (url,headers,signal) => { const response=await localTransport(url,headers,signal); if (mode==='resource') response.finalUrl += '?new-resource'; return response; };
  const engine = new TransferEngine(store,grants,source,transport);
  const start = async (ids = ['2'], concurrency = 1) => {
    const plan = await planner.prepare({ grantId, channelId:'1', episodeIds:ids, filenamePattern:'{title}', groupByChannel:false, duplicatePolicy:'rename', concurrency });
    await planner.commit({ planId:plan.id }); await engine.start({ planId:plan.id,grantId });
  };
  try { await work({ engine,planner,store,grants,grantId,destination,root,source,requests,mode: next => { mode=next; },start,peak: () => peak }); }
  finally { await engine.suspend(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); store.close(); await rm(root,{recursive:true,force:true}); }
}

test('real streams use bounded concurrency and atomic output, with no duplicate start', () => fixture(async ({ engine,start,store,grantId,destination,peak }) => {
  await start(['2','3','4'],2);
  const planId = engine.snapshot().startedPlanIds[0]; await engine.start({ planId,grantId });
  await until(() => engine.snapshot().jobs.every(job => job.status === 'completed'), 'complete batch');
  assert.equal(engine.snapshot().jobs.length,3); assert.ok(peak() <= 2);
  assert.deepEqual(await readFile(join(destination,'Episode 2.mp3')),audio);
  assert.equal((await readdir(destination)).filter(name => name.endsWith('.part')).length,0);
  assert.equal(store.reservedTargets().size,0);
}));
test('revealing a completed file detects missing or replaced files', () => fixture(async ({ engine,start,destination }) => {
  await start(); await until(() => engine.snapshot().jobs[0].status === 'completed');
  const job = engine.snapshot().jobs[0];
  assert.equal(await engine.revealPath(job.id), await realpath(join(destination, 'Episode 2.mp3')));
  await unlink(join(destination, 'Episode 2.mp3'));
  await assert.rejects(engine.revealPath(job.id), /downloaded file is missing or changed/);
}));
test('pause checkpoints exact bytes and strong-ETag resume appends the validated range', () => fixture(async ({ engine,start,requests,destination }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes > 32000);
  const id = engine.snapshot().jobs[0].id; await engine.action({ jobId:id,action:'pause' });
  const paused = engine.snapshot().jobs[0]; assert.equal(paused.status,'paused');
  assert.ok(paused.bytes > 0 && paused.bytes < audio.length); assert.equal((await readdir(destination)).filter(name => name.endsWith('.mp3')).length,0);
  await engine.action({ jobId:id,action:'resume' }); await until(() => engine.snapshot().jobs[0].status === 'completed');
  assert.equal(requests[1].offset,paused.bytes); assert.equal(requests[1].ifRange,'"v1"');
  assert.deepEqual(await readFile(join(destination,'Episode 2.mp3')),audio);
}));
for (const mode of ['ignore','changed','416'] as const) test(`${mode} on resume restarts without concatenating bytes`, () => fixture(async ({ engine,start,mode:setMode,destination }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes > 32000);
  const id = engine.snapshot().jobs[0].id; await engine.action({ jobId:id,action:'pause' }); setMode(mode);
  await engine.action({ jobId:id,action:'resume' }); await until(() => engine.snapshot().jobs[0].status === 'completed');
  assert.deepEqual(await readFile(join(destination,'Episode 2.mp3')),audio);
}));
test('inconsistent Content-Range fails without publishing a corrupt file', () => fixture(async ({ engine,start,mode,destination }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes > 32000);
  const id = engine.snapshot().jobs[0].id; await engine.action({ jobId:id,action:'pause' }); mode('bad-range');
  await engine.action({ jobId:id,action:'resume' }); await until(() => engine.snapshot().jobs[0].status === 'failed');
  assert.match(engine.snapshot().jobs[0].error!,/resume range/); assert.equal((await readdir(destination)).filter(name => name.endsWith('.mp3')).length,0);
}));
test('unknown length is shown as unknown until the stream completes', () => fixture(async ({ engine,start,mode,destination }) => {
  mode('unknown'); await start(); await until(() => engine.snapshot().jobs[0].bytes > 32000);
  assert.equal(engine.snapshot().jobs[0].total,null); await until(() => engine.snapshot().jobs[0].status === 'completed');
  assert.equal(engine.snapshot().jobs[0].total,audio.length); assert.deepEqual(await readFile(join(destination,'Episode 2.mp3')),audio);
}));
for (const mode of ['html','truncated'] as const) test(`${mode} response fails honestly and preserves destination`, () => fixture(async ({ engine,start,mode:setMode,destination }) => {
  setMode(mode); await start(); await until(() => engine.snapshot().jobs[0].status === 'failed');
  assert.equal((await readdir(destination)).filter(name => name.endsWith('.mp3')).length,0);
  assert.ok(engine.snapshot().jobs[0].error);
}));
test('restart requires a fresh grant and verifies partial checksums before resume', () => fixture(async ({ engine,start,store,grants,source,grantId,destination,requests }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes > 32000); await engine.suspend(); store.close(); grants.revokeAll();
  const restarted = new TransferEngine(store,grants,source,localTransport); const job = restarted.snapshot().jobs[0]; assert.equal(job.status,'paused'); assert.equal(job.needsGrant,true);
  await assert.rejects(restarted.action({ jobId:job.id,action:'resume',grantId }),/expired/);
  const fresh = await grants.issue(destination); await restarted.action({ jobId:job.id,action:'resume',grantId:fresh.id });
  await until(() => restarted.snapshot().jobs[0].status === 'completed'); assert.equal(requests[1].offset,job.bytes); await restarted.suspend();
}));
test('tampered partial file is preserved and never resumed', () => fixture(async ({ engine,start,store }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes > 32000); const id=engine.snapshot().jobs[0].id;
  await engine.action({jobId:id,action:'pause'}); const path=partialPath(store.transferJobs()[0]);
  const fd=await open(path,'r+'); await fd.write(Buffer.from('BAD'),0,3,0); await fd.close();
  await engine.action({jobId:id,action:'resume'}); await until(() => engine.snapshot().jobs[0].status==='failed');
  assert.match(engine.snapshot().jobs[0].error!,/contents changed/); assert.equal((await readFile(path)).subarray(0,3).toString(),'BAD');
}));
test('cancel removes only the owned partial, releases its reservation, and never deletes completed audio', () => fixture(async ({ engine,start,store,destination }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes>32000);
  await engine.action({jobId:engine.snapshot().jobs[0].id,action:'cancel'});
  assert.equal(engine.snapshot().jobs.length,0); assert.deepEqual(await readdir(destination),[]); assert.equal(store.reservedTargets().size,0);
  await start(); await until(() => engine.snapshot().jobs[0].status==='completed');
  await engine.action({jobId:engine.snapshot().jobs[0].id,action:'cancel'});
  assert.equal(engine.snapshot().jobs.length,0); assert.deepEqual(await readFile(join(destination,'Episode 2.mp3')),audio);
}));
test('a target created during transfer is never overwritten', () => fixture(async ({ engine,start,destination }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes>32000);
  await writeFile(join(destination,'Episode 2.mp3'),'keep'); await until(() => engine.snapshot().jobs[0].status==='failed');
  assert.equal(await readFile(join(destination,'Episode 2.mp3'),'utf8'),'keep');
}));
test('production media requests reject local, mapped, reserved and credentialed addresses', async () => {
  for (const value of ['127.0.0.1','10.0.0.1','169.254.169.254','192.168.1.1','::1','::ffff:127.0.0.1','2001:db8::1','2002:7f00:1::']) assert.equal(publicAddress(value),false,value);
  assert.equal(publicAddress('8.8.8.8'),true); assert.equal(publicAddress('2606:4700:4700::1111'),true);
  for (const value of ['file:///etc/passwd','https://u:p@example.com/a.mp3','http://example.com:1234/a.mp3']) assert.throws(() => mediaUrl(value));
  await assert.rejects(mediaTransport('http://127.0.0.1/audio.mp3',{},new AbortController().signal),/private or reserved/);
});

test('pause-all stops queued jobs as well as active jobs', () => fixture(async ({ engine,start,requests }) => {
  await start(['2','3','4'],1); await until(() => engine.snapshot().jobs[0].bytes>32000);
  await engine.pauseAll(); const count = requests.length; await sleep(50);
  assert.ok(engine.snapshot().jobs.every(job => job.status === 'paused')); assert.equal(requests.length,count);
}));
test('a partial symlink cannot write or delete its target', () => fixture(async ({ engine,start,store,root }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes>32000); const id=engine.snapshot().jobs[0].id;
  await engine.action({jobId:id,action:'pause'}); const path=partialPath(store.transferJobs()[0]);
  await rename(path,path+'.preserved'); const outside=join(root,'outside'); await writeFile(outside,'keep'); await symlink(outside,path);
  await engine.action({jobId:id,action:'resume'}); await until(() => engine.snapshot().jobs[0].status==='failed');
  await assert.rejects(engine.action({jobId:id,action:'cancel'}),/changed/); assert.equal(await readFile(outside,'utf8'),'keep');
}));
test('crash recovery truncates uncheckpointed bytes and resumes only the verified prefix', () => fixture(async ({ engine,start,store,grants,source,destination,requests }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes>32000); await engine.suspend();
  const saved=store.transferJobs()[0]; saved.status='downloading'; store.saveTransfer(saved);
  await appendFile(partialPath(saved),Buffer.from('uncheckpointed')); store.close(); grants.revokeAll();
  const restarted=new TransferEngine(store,grants,source,localTransport); assert.equal(restarted.snapshot().jobs[0].status,'paused');
  const grant=await grants.issue(destination); await restarted.action({jobId:saved.id,action:'resume',grantId:grant.id});
  await until(() => restarted.snapshot().jobs[0].status==='completed'); assert.equal(requests[1].offset,saved.bytes);
  assert.deepEqual(await readFile(finalPath(saved)),audio); await restarted.suspend();
}));
test('recovery recognizes an atomically published file after a crash before database completion', () => fixture(async ({ engine,start,store,grants,source,destination }) => {
  await start(); await until(() => engine.snapshot().jobs[0].bytes>32000); await engine.suspend();
  const saved=store.transferJobs()[0]; await writeFile(partialPath(saved),audio);
  saved.bytes=audio.length; saved.total=audio.length; saved.digest=createHash('sha256').update(audio).digest('hex'); saved.finalizing=true; saved.status='finalizing';
  store.saveTransfer(saved); await link(partialPath(saved),finalPath(saved)); store.close(); grants.revokeAll();
  const restarted=new TransferEngine(store,grants,source,localTransport); const grant=await grants.issue(destination);
  await restarted.action({jobId:saved.id,action:'resume',grantId:grant.id}); await until(() => restarted.snapshot().jobs[0].status==='completed');
  assert.deepEqual(await readdir(destination),['Episode 2.mp3']); assert.equal((await stat(finalPath(saved))).nlink,1); await restarted.suspend();
}));
test('failed disk writes are reported and never publish a completed file', () => fixture(async ({ engine,start,destination,root }) => {
  const handle=await open(join(root,'probe'),'w'); const proto=Object.getPrototypeOf(handle); await handle.close();
  const stub=mock.method(proto,'write',async () => { throw Object.assign(new Error('disk full'),{code:'ENOSPC'}); });
  try {
    await start(); await until(() => engine.snapshot().jobs[0].status==='failed');
    assert.match(engine.snapshot().jobs[0].error!,/Disk full/); assert.equal((await readdir(destination)).filter(name => name.endsWith('.mp3')).length,0);
  } finally { stub.mock.restore(); }
}));
test('replacement requires the reviewed target and preserves changes made after review', () => fixture(async ({ engine,planner,grantId,destination }) => {
  const target=join(destination,'Episode 2.mp3'); await writeFile(target,'original');
  const plan=await planner.prepare({grantId,channelId:'1',episodeIds:['2'],filenamePattern:'{title}',groupByChannel:false,duplicatePolicy:'overwrite',concurrency:1});
  await planner.commit({planId:plan.id}); await writeFile(target,'changed');
  await assert.rejects(engine.start({planId:plan.id,grantId}),/fresh file review/); assert.equal(await readFile(target,'utf8'),'changed');
}));
test('replacement publishes complete bytes without modifying the old file during transfer', () => fixture(async ({ engine,planner,grantId,destination }) => {
  const target=join(destination,'Episode 2.mp3'); await writeFile(target,'original');
  const plan=await planner.prepare({grantId,channelId:'1',episodeIds:['2'],filenamePattern:'{title}',groupByChannel:false,duplicatePolicy:'overwrite',concurrency:1});
  await planner.commit({planId:plan.id}); await engine.start({planId:plan.id,grantId});
  await until(() => engine.snapshot().jobs[0].bytes>32000); assert.equal(await readFile(target,'utf8'),'original');
  await until(() => engine.snapshot().jobs[0].status==='completed'); assert.deepEqual(await readFile(target),audio);
}));

test('sources without strong ETags restart rather than reusing partial bytes', () => fixture(async ({engine,start,mode,requests,destination}) => {
  mode('no-etag'); await start(); await until(()=>engine.snapshot().jobs[0].bytes>32000);
  const id=engine.snapshot().jobs[0].id; await engine.action({jobId:id,action:'pause'}); await engine.action({jobId:id,action:'resume'});
  await until(()=>engine.snapshot().jobs[0].status==='completed'); assert.equal(requests[1].offset,0); assert.deepEqual(await readFile(join(destination,'Episode 2.mp3')),audio);
}));
test('a changed redirect destination discards the range response and restarts', () => fixture(async ({engine,start,mode,requests,destination}) => {
  await start(); await until(()=>engine.snapshot().jobs[0].bytes>32000);
  const id=engine.snapshot().jobs[0].id; await engine.action({jobId:id,action:'pause'}); mode('resource'); await engine.action({jobId:id,action:'resume'});
  await until(()=>engine.snapshot().jobs[0].status==='completed'); assert.ok(Number(requests[1].offset)>0); assert.equal(requests[2].offset,0); assert.deepEqual(await readFile(join(destination,'Episode 2.mp3')),audio);
}));
