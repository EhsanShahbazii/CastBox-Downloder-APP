import { ipcMain, shell, type BrowserWindow } from 'electron';
import { z } from 'zod';
import { isTrustedSender } from '../security';
import { TransferEngine } from './engine';
export function registerTransferIpc(getWindow: () => BrowserWindow | null, page: string, engine: TransferEngine) {
  const empty = (input: unknown) => { if (input !== undefined) throw new Error('Unexpected transfer input.'); };
  const handlers: Record<string, (input: unknown) => unknown> = {
    'transfers:snapshot': input => { empty(input); return engine.snapshot(); },
    'transfers:start': input => engine.start(input),
    'transfers:action': input => engine.action(input),
    'transfers:pause-all': input => { empty(input); return engine.pauseAll(); },
    'transfers:concurrency': input => engine.setConcurrency(input),
    'transfers:discard-plan': input => engine.discardPlan(input),
    'transfers:reveal': async input => { const { jobId } = z.object({ jobId: z.string().uuid() }).strict().parse(input); shell.showItemInFolder(await engine.revealPath(jobId)); },
  };
  for (const [name, handler] of Object.entries(handlers)) ipcMain.handle(name, async (event, input: unknown) => {
    const window = getWindow();
    if (!window || window.isDestroyed() || event.sender !== window.webContents || !isTrustedSender(event.senderFrame?.url, page, event.senderFrame === window.webContents.mainFrame)) return { ok: false, error: 'Request denied.' };
    try { return { ok: true, value: await handler(input) }; }
    catch (error) { return { ok: false, error: error instanceof Error && !('issues' in error) ? error.message : 'Invalid download request.' }; }
  });
  return () => Object.keys(handlers).forEach(name => ipcMain.removeHandler(name));
}
