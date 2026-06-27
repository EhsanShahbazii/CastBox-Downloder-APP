import { app, BrowserWindow } from 'electron';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer, request } from 'node:http';
import assert from 'node:assert/strict';
import { registerPlanningIpc } from '../../desktop/downloads/ipc';
import { registerTransferIpc } from '../../desktop/downloads/transfer-ipc';
import { DownloadPlanner } from '../../desktop/downloads/planner';
import { TransferEngine } from '../../desktop/downloads/engine';
import { DirectoryGrants } from '../../desktop/downloads/paths';
import { LibraryStore } from '../../desktop/library/store';
import { CatalogClient } from '../../desktop/catalog/client';
import type { MediaTransport } from '../../desktop/downloads/transport';
const directory = process.env.CASTBOX_TEST_DIRECTORY!;
app.setPath('userData', join(directory, 'profile'));
const page = pathToFileURL(join(directory, 'index.html')).href;
const timer = setTimeout(() => { console.error('Native transfer test timed out'); app.exit(1); }, 30000);
app.whenReady().then(async () => {
  const audio = Buffer.concat([Buffer.from('ID3'),Buffer.alloc(1024*1024,42)]);
  const server = createServer((req,res) => {
    const offset = Number(req.headers.range?.match(/bytes=(\d+)-/)?.[1] ?? 0);
    res.writeHead(offset ? 206 : 200, { 'content-type':'audio/mpeg', 'content-length':audio.length-offset, etag:'"native"', ...(offset ? { 'content-range':`bytes ${offset}-${audio.length-1}/${audio.length}` } : {}) });
    let position=offset; const timer=setInterval(() => { const end=Math.min(position+16384,audio.length); res.write(audio.subarray(position,end)); position=end; if(position===audio.length) res.end(); },10); res.on('close',()=>clearInterval(timer));
  });
  await new Promise<void>(resolve => server.listen(0,'127.0.0.1',resolve));
  const url=`http://127.0.0.1:${(server.address() as {port:number}).port}/audio.mp3`;
  const transport: MediaTransport = (url,headers,signal) => new Promise((resolve,reject) => { const req=request(url,{headers,signal},body=>resolve({body,status:body.statusCode!,headers:body.headers,finalUrl:url})); req.on('error',reject); req.end(); });
  const source=new CatalogClient();
  const episode={id:'456',channelId:'123',title:'Native transfer',author:'',description:'',artworkUrl:null,publishedAt:null,durationMs:null,sizeBytes:audio.length,hasMediaSource:true,channel:null};
  source.channel=async()=>({id:'123',title:'Native test',author:'',description:'',artworkUrl:null,episodeCount:1});
  source.planningEpisodes=async()=>[{extension:'.mp3',episode}]; source.mediaSource=async()=>({episode,url});
  const store=new LibraryStore(join(directory,'library.sqlite')); const grants=new DirectoryGrants();
  let engine=new TransferEngine(store,grants,source,transport); const planner=new DownloadPlanner(grants,store,source);
  const destination=join(directory,'destination'); await mkdir(destination);
  let trusted: BrowserWindow | null=null;
  registerPlanningIpc(()=>trusted,page,planner,()=>grants.issue(destination));
  let unregister=registerTransferIpc(()=>trusted,page,engine);
  const verify=async(stage:string)=>{
    const window=new BrowserWindow({show:false,webPreferences:{preload:process.env.CASTBOX_TEST_PRELOAD,contextIsolation:true,sandbox:true,nodeIntegration:false}});
    if(stage!=='untrusted') trusted=window;
    await new Promise<void>((resolve,reject)=>{
      window.webContents.on('console-message',event=>{
        if(!event.message.startsWith('TRANSFER_TEST:'))return;
        const result=JSON.parse(event.message.slice('TRANSFER_TEST:'.length));
        if(!result.ok){reject(new Error(result.error));return;}
        if(stage!=='untrusted' && result.initialCount!==(stage==='initial'?0:1)){reject(new Error('Native transfer recovery failed'));return;}
        console.log(JSON.stringify({nativeTransfers:stage,...result}));resolve();
      });
      void window.loadURL(page+(stage==='untrusted'?'?untrusted':'')).catch(reject);
    });
    if(stage!=='reopen')window.destroy();
  };
  try {
    await verify('initial'); await engine.suspend(); unregister(); store.close(); grants.revokeAll();
    engine=new TransferEngine(store,grants,source,transport); unregister=registerTransferIpc(()=>trusted,page,engine);
    await verify('reopen'); await verify('untrusted');
    assert.deepEqual(await readFile(join(destination,'Native transfer.mp3')),audio);
    console.log('Native output bytes verified'); await engine.suspend(); store.close(); server.closeAllConnections(); server.close(); clearTimeout(timer); app.exit(0);
  } catch(error) { console.error(error instanceof Error?error.message:'Native test failed'); clearTimeout(timer); app.exit(1); }
});
app.on('window-all-closed',()=>{});
