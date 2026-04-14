import { ipcMain, type BrowserWindow } from 'electron';
import { isTrustedSender } from '../security';
import { DownloadPlanner } from './planner';
import type { DirectoryGrant } from '../../shared/downloads';

export function registerPlanningIpc(getWindow: () => BrowserWindow | null, page: string, planner: DownloadPlanner, choose: () => Promise<DirectoryGrant | null>) {
  const handlers: Record<string, (input: unknown) => unknown> = {
    'downloads:choose-directory': input => { if (input !== undefined) throw new Error('Invalid folder request.'); return choose(); },
    'downloads:prepare': input => planner.prepare(input),
    'downloads:commit': input => planner.commit(input),
    'downloads:list-plans': input => { if (input !== undefined) throw new Error('Invalid plan request.'); return planner.list(); },
  };
  for (const [name, handler] of Object.entries(handlers)) ipcMain.handle(name, async (event, input: unknown) => {
    const window = getWindow();
    if (!window || window.isDestroyed() || event.sender !== window.webContents || !isTrustedSender(event.senderFrame?.url, page, event.senderFrame === window.webContents.mainFrame)) return { ok: false, error: 'Request denied.' };
    try { return { ok: true, value: await handler(input) }; }
    catch (error) { return { ok: false, error: error instanceof Error && !('issues' in error) ? error.message : 'Unable to prepare file plans. Check your options and destination.' }; }
  });
  return () => Object.keys(handlers).forEach(name => ipcMain.removeHandler(name));
}
