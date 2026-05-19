import { ipcMain, type BrowserWindow } from 'electron';
import { savedChannelInput } from '../../shared/library';
import { CatalogClient } from '../catalog/client';
import { isTrustedSender } from '../security';
import { LIBRARY_ERROR, LibraryStore } from './store';

export function registerLibraryIpc(getWindow: () => BrowserWindow | null, page: string, store: LibraryStore, catalog = new CatalogClient()) {
  // Serialize mutations including metadata fetch, so rapid save/unsave requests
  // finish in arrival order and each snapshot represents a committed transaction.
  let pending: Promise<unknown> = Promise.resolve();
  const enqueue = (work: () => Promise<unknown>) => {
    const result = pending.then(work); pending = result.catch(() => {}); return result;
  };
  const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
    'library:read': async input => {
      if (input !== undefined) throw new Error('Invalid library request.');
      return store.read();
    },
    'library:set-saved': async input => {
      const result = savedChannelInput.safeParse(input);
      if (!result.success) throw new Error('Invalid channel request.');
      if (!result.data.saved) return store.unsave(result.data.channelId);
      if (store.isSaved(result.data.channelId)) return store.read();
      const channel = await catalog.channel({ channelId: result.data.channelId });
      return store.save(channel);
    },
  };
  for (const [name, handler] of Object.entries(handlers)) ipcMain.handle(name, (event, input: unknown) => {
    const window = getWindow();
    if (!window || window.isDestroyed() || event.sender !== window.webContents || !isTrustedSender(event.senderFrame?.url, page, event.senderFrame === window.webContents.mainFrame)) return { ok: false, error: 'Request denied.' };
    return enqueue(async () => {
      try { return { ok: true, value: await handler(input) }; }
      catch (error) {
        const message = error instanceof Error ? error.message : '';
        return { ok: false, error: message === 'Invalid channel request.' || message === 'Invalid library request.' || (error instanceof Error && 'code' in error && ['NETWORK', 'TIMEOUT', 'ACCESS_REQUIRED', 'RATE_LIMITED', 'NOT_FOUND'].includes(String(error.code))) ? message : LIBRARY_ERROR };
      }
    });
  });
  return () => Object.keys(handlers).forEach(name => ipcMain.removeHandler(name));
}
