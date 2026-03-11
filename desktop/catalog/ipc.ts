import { ArtworkLoader } from './artwork';
import { ipcMain, type BrowserWindow } from 'electron';
import { CatalogClient, catalogResult } from './client';
import { isTrustedSender } from '../security';

export function registerCatalogIpc(getWindow: () => BrowserWindow | null, page: string, catalog = new CatalogClient()) {
  const artwork = new ArtworkLoader();
  const handlers: Record<string, (input: unknown) => Promise<unknown>> = {
    'catalog:artwork': input => artwork.load(input),
    'catalog:search': input => catalog.search(input),
    'catalog:channel': input => catalog.channel(input),
    'catalog:episodes': input => catalog.episodes(input),
    'catalog:suggestions': input => catalog.suggestions(input),
    'catalog:episode': input => catalog.episode(input),
    'catalog:episode-index': input => catalog.episodeIndex(input),
  };
  for (const [name, handler] of Object.entries(handlers)) {
    ipcMain.handle(name, (event, input: unknown) => {
      const window = getWindow();
      if (!window || event.sender !== window.webContents || !isTrustedSender(event.senderFrame?.url, page, event.senderFrame === window.webContents.mainFrame)) {
        return { ok: false, code: 'INVALID_INPUT', error: 'Request denied.' };
      }
      return catalogResult(() => handler(input));
    });
  }
  return () => Object.keys(handlers).forEach(name => ipcMain.removeHandler(name));
}
