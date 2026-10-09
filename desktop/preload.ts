import { contextBridge, ipcRenderer } from 'electron';
import type { DesktopBridge } from '../shared/desktop';

const bridge: DesktopBridge = {
  transfers: Object.freeze<DesktopBridge['transfers']>({
    snapshot: () => ipcRenderer.invoke('transfers:snapshot'),
    start: input => ipcRenderer.invoke('transfers:start', input),
    action: input => ipcRenderer.invoke('transfers:action', input),
    pauseAll: () => ipcRenderer.invoke('transfers:pause-all'),
    setConcurrency: input => ipcRenderer.invoke('transfers:concurrency', input),
    discardPlan: input => ipcRenderer.invoke('transfers:discard-plan', input),
    reveal: input => ipcRenderer.invoke('transfers:reveal', input),
  }),
  downloads: Object.freeze<DesktopBridge['downloads']>({
    chooseDirectory: () => ipcRenderer.invoke('downloads:choose-directory'),
    prepare: input => ipcRenderer.invoke('downloads:prepare', input),
    commit: input => ipcRenderer.invoke('downloads:commit', input),
    list: () => ipcRenderer.invoke('downloads:list-plans'),
  }),
  library: Object.freeze<DesktopBridge['library']>({
    read: () => ipcRenderer.invoke('library:read'),
    setSaved: input => ipcRenderer.invoke('library:set-saved', input),
  }),
  playback: Object.freeze<DesktopBridge['playback']>({
    snapshot: () => ipcRenderer.invoke('playback:snapshot'),
    clearHistory: () => ipcRenderer.invoke('playback:clear-history'),
    source: input => ipcRenderer.invoke('playback:source', input),
    saveProgress: input => ipcRenderer.invoke('playback:progress', input),
    replaceQueue: input => ipcRenderer.invoke('playback:queue', input),
  }),
  storage: Object.freeze<DesktopBridge['storage']>({
    read: () => ipcRenderer.invoke('storage:read'),
    clearCache: () => ipcRenderer.invoke('storage:clear-cache'),
  }),
  catalog: Object.freeze<DesktopBridge["catalog"]>({
    artwork: input => ipcRenderer.invoke('catalog:artwork', input),
    search: input => ipcRenderer.invoke('catalog:search', input),
    channel: input => ipcRenderer.invoke('catalog:channel', input),
    episodes: input => ipcRenderer.invoke('catalog:episodes', input),
    suggestions: input => ipcRenderer.invoke('catalog:suggestions', input),
    episode: input => ipcRenderer.invoke('catalog:episode', input),
    episodeIndex: input => ipcRenderer.invoke('catalog:episode-index', input),
  }),
  getInfo: () => ipcRenderer.invoke('app:info'),
  readSettings: () => ipcRenderer.invoke('settings:read'),
  saveSettings: settings => ipcRenderer.invoke('settings:save', settings),
  chooseDownloadDirectory: () => ipcRenderer.invoke('settings:choose-directory'),
  loginWeb: () => ipcRenderer.invoke('auth:login-web'),
};
contextBridge.exposeInMainWorld('castboxDesktop', Object.freeze(bridge));
