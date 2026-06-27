import { app, BrowserWindow } from 'electron';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { registerCatalogIpc } from '../../desktop/catalog/ipc';

const directory = process.env.CASTBOX_TEST_DIRECTORY!;
app.setPath('userData', join(directory, 'profile'));
const page = pathToFileURL(join(directory, 'index.html')).href;
const timer = setTimeout(() => { console.error('Native catalog test timed out'); app.exit(1); }, 100_000);
app.whenReady().then(async () => {
  let trusted: BrowserWindow | null = null;
  registerCatalogIpc(() => trusted, page);
  async function verify(untrusted: boolean) {
    const window = new BrowserWindow({ show: false, webPreferences: { preload: process.env.CASTBOX_TEST_PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false } });
    if (!untrusted) trusted = window;
    try {
      await new Promise<void>((resolve, reject) => {
        window.webContents.on('console-message', event => {
          const message = event.message;
          if (!message.startsWith('CASTBOX_TEST:')) return;
          const result = JSON.parse(message.slice('CASTBOX_TEST:'.length));
          if (!result.ok) { reject(new Error(result.error)); return; }
          console.log(JSON.stringify({ native: untrusted ? 'untrusted' : 'trusted', ...result })); resolve();
        });
        window.webContents.on('render-process-gone', () => reject(new Error('Test renderer exited')));
        void window.loadURL(page + (untrusted ? '?untrusted' : '')).catch(reject);
      });
    } finally { if (untrusted) window.destroy(); }
  }
  try { await verify(false); await verify(true); clearTimeout(timer); app.exit(0); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Native test failed'); clearTimeout(timer); app.exit(1); }
});
app.on('window-all-closed', () => {});
