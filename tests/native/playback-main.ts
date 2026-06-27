import { app, BrowserWindow, protocol, ipcMain, session } from 'electron';
import { mkdir, writeFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { LibraryStore } from '../../desktop/library/store';
import { PlaybackController } from '../../desktop/playback/controller';

protocol.registerSchemesAsPrivileged([{ scheme: 'castbox-media', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }]);
const root = process.env.CASTBOX_TEST_DIRECTORY!; const jobId = '00000000-0000-4000-8000-000000000123';
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
function wav() { const rate = 44100, samples = rate, bytes = Buffer.alloc(44 + samples * 2); bytes.write('RIFF', 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write('WAVEfmt ', 8); bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22); bytes.writeUInt32LE(rate, 24); bytes.writeUInt32LE(rate * 2, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34); bytes.write('data', 36); bytes.writeUInt32LE(samples * 2, 40); return bytes; }
app.whenReady().then(async () => {
  const destination = join(root, 'audio'); await mkdir(destination); const path = join(destination, 'test.wav'); const data = wav(); await writeFile(path, data); const info = await stat(path);
  const store = new LibraryStore(join(root, 'library.sqlite')); const planId = randomUUID();
  store.commitPlan({ id: planId, channelId: '77', destination, channelTitle: 'Native test', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now()+60000).toISOString(), entries: [], knownBytes: 0, unknownSizeCount: 0, concurrency: 1 }, []);
  store.createTransfers(planId, [{ id: jobId, planId, episodeId: '88', channelId: '77', title: 'Local audio', channelTitle: 'Native test', artworkUrl: null, durationMs: 1000, destination, relativePath: 'test.wav', status: 'completed', bytes: data.length, total: data.length, error: null, completedAt: new Date().toISOString(), validator: null, sourceKey: null, resourceKey: null, digest: null, partial: { dev: info.dev, ino: info.ino }, target: null, parents: [], replace: false, dismissed: false, finalizing: false }]);
  const playback = new PlaybackController(store); session.defaultSession.protocol.handle('castbox-media', request => playback.serve(request));
  ipcMain.handle('playback:source', async event => event.senderFrame?.url.startsWith('file:') ? { ok: true, value: await playback.source({ jobId }) } : { ok: false, error: 'denied' });
  ipcMain.handle('playback:progress', event => event.senderFrame?.url.startsWith('file:') ? { ok: true, value: playback.saveProgress({ jobId, positionMs: 425, completed: false }) } : { ok: false, error: 'denied' });
  ipcMain.handle('playback:queue', event => event.senderFrame?.url.startsWith('file:') ? { ok: true, value: playback.replaceQueue({ jobIds: [jobId] }) } : { ok: false, error: 'denied' });
  const window = new BrowserWindow({ width: 700, height: 500, webPreferences: { preload: process.env.CASTBOX_TEST_PRELOAD!, contextIsolation: true, sandbox: true, nodeIntegration: false } });
  window.webContents.on('did-finish-load', () => { void window.webContents.executeJavaScript(`(async()=>{try{const r=await window.castboxDesktop.playback.source({jobId:'${jobId}'});if(!r.ok)throw Error(r.error);const a=new Audio();a.src=r.value;await new Promise((resolve,reject)=>{a.oncanplay=resolve;a.onerror=()=>reject(Error('Audio element failed to decode local media'));setTimeout(()=>reject(Error('Audio readiness timeout')),5000)});if(Math.abs(a.duration-1)>0.1)throw Error('Incorrect local media duration');a.currentTime=.45;await new Promise((resolve,reject)=>{a.onseeked=resolve;setTimeout(()=>reject(Error('Local media seek timeout')),3000)});const playing=new Promise((resolve,reject)=>{a.onplaying=resolve;setTimeout(()=>reject(Error('Local playback timeout state '+a.readyState+'/'+a.currentTime+'/'+a.paused+'/'+(a.error?.code??0))),3000)});await a.play();await playing;if(a.paused)throw Error('Audio paused before playback verification');a.pause();const q=await window.castboxDesktop.playback.replaceQueue({jobIds:['${jobId}']});if(!q.ok||q.value.queue.length!==1)throw Error('Queue persistence failed');const p=await window.castboxDesktop.playback.saveProgress({jobId:'${jobId}',positionMs:425,completed:false});if(!p.ok)throw Error('Playback progress failed');document.documentElement.dataset.result='PASS';}catch(e){document.documentElement.dataset.result='FAIL: '+String(e)}})()`); });
  await window.loadFile(join(root, 'index.html'));
  const interval = setInterval(() => { void window.webContents.executeJavaScript("document.documentElement.dataset.result || ''").then((result: string) => { if (!result) return; clearInterval(interval); console.log('NATIVE_PLAYBACK_RESULT=' + result); store.close(); app.exit(result === 'PASS' ? 0 : 1); }); }, 100);
});
