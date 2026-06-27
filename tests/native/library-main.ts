import { app, BrowserWindow } from 'electron';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { registerLibraryIpc } from '../../desktop/library/ipc';
import { LibraryStore } from '../../desktop/library/store';
import { CatalogClient } from '../../desktop/catalog/client';

const directory = process.env.CASTBOX_TEST_DIRECTORY!;
app.setPath('userData', join(directory, 'profile'));
const page = pathToFileURL(join(directory, 'index.html')).href;
const timer = setTimeout(() => { console.error('Native library test timed out'); app.exit(1); }, 30000);
app.whenReady().then(async () => {
  let trusted: BrowserWindow | null = null;
  const store = new LibraryStore(join(directory, 'library.sqlite'));
  class TestCatalog extends CatalogClient {
    override async channel() { return { id: '123', title: 'Native IPC test channel', author: 'Test', description: '', artworkUrl: null, episodeCount: 0 }; }
  }
  registerLibraryIpc(() => trusted, page, store, new TestCatalog());
  async function verify(stage: 'initial' | 'reopen' | 'untrusted') {
    const window = new BrowserWindow({ show: false, webPreferences: { preload: process.env.CASTBOX_TEST_PRELOAD, contextIsolation: true, sandbox: true, nodeIntegration: false } });
    if (stage !== 'untrusted') trusted = window;
    try {
      await new Promise<void>((resolve, reject) => {
        window.webContents.on('console-message', event => {
          if (!event.message.startsWith('LIBRARY_TEST:')) return;
          const result = JSON.parse(event.message.slice('LIBRARY_TEST:'.length));
          if (!result.ok) { reject(new Error(result.error)); return; }
          if (stage !== 'untrusted' && result.initialSavedCount !== (stage === 'initial' ? 0 : 1)) { reject(new Error('Native reopen lost saved records')); return; }
          console.log(JSON.stringify({ nativeLibrary: stage, ...result })); resolve();
        });
        window.webContents.on('render-process-gone', () => reject(new Error('Test renderer exited')));
        void window.loadURL(page + (stage === 'untrusted' ? '?untrusted' : '')).catch(reject);
      });
    } finally { if (stage !== 'reopen') window.destroy(); }
  }
  try { await verify('initial'); store.close(); await verify('reopen'); await verify('untrusted'); store.close(); clearTimeout(timer); app.exit(0); }
  catch (error) { console.error(error instanceof Error ? error.message : 'Native test failed'); store.close(); clearTimeout(timer); app.exit(1); }
});
app.on('window-all-closed', () => {});
