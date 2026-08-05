import { useTransfers } from './catalog/useTransfers';
import React, { useEffect, useRef, useState } from 'react';
import { NativeDownloadReview } from './components/download/NativeDownloadReview';
import type { DirectoryGrant, SavedFilePlan } from '../../shared/downloads';
import type { LibrarySnapshot } from '../../shared/library';
import { channelModel } from './catalog/model';
import type { AppSettings, Channel, PlaybackState, QueueItem, SleepTimerOption, SleepTimerState, PlaybackSpeed, DownloadedItem, RecentlyPlayedItem } from './types';
import { HeaderNav } from './components/layout/HeaderNav';
import { BottomPlayer } from './components/player/BottomPlayer';
import { SettingsView } from './components/settings/SettingsView';
import { LibraryView } from './components/library/LibraryView';
import { DownloadsView } from './components/download/DownloadsView';
import { ListeningQueueView } from './components/queue/ListeningQueueView';
import { LiveCatalog } from './catalog/LiveCatalog';
import { ExpandedNowPlayingView } from './components/player/ExpandedNowPlayingView';
import type { PlaybackTrack } from '../../shared/playback';
import type { PlaybackSnapshot } from '../../shared/playback';

const idle: PlaybackState = { currentTrackTitle: 'Nothing playing', currentArtist: '', currentChannelTitle: '', artworkKey: 'unavailable', isPlaying: false, currentTime: 0, duration: 0, volume: 0.8, isMuted: false, playbackSpeed: 1 };
const formatDuration = (seconds: number) => seconds > 0 ? `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60).toString().padStart(2, '0')}` : '—';
const relativePlayedAt = (value: string) => {
  const days = Math.floor((Date.now() - Date.parse(value)) / 86_400_000);
  if (!Number.isFinite(days) || days < 1) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};
export function NativeApp({ initialSettings }: { initialSettings: AppSettings }) {
  const [review, setReview] = useState<{ channelId: string; episodeIds: string[] } | null>(null);
  const [destinationGrant, setDestinationGrant] = useState<DirectoryGrant | null>(null);
  const [plans, setPlans] = useState<SavedFilePlan[]>([]);
  const [plansError, setPlansError] = useState('');
  const [library, setLibrary] = useState<LibrarySnapshot | null>(null);
  const [libraryError, setLibraryError] = useState('');
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const mutation = useRef(false);
  const libraryEpoch = useRef(0);
  const [openRequest, setOpenRequest] = useState<{ id: string; key: number } | null>(null);
  const [openEpisodeRequest, setOpenEpisodeRequest] = useState<{ id: string; key: number } | null>(null);
  const [tab, setTab] = useState('find');
  const [reset, setReset] = useState(0);
  const [settings, setSettings] = useState(initialSettings);
  const [missingJobIds, setMissingJobIds] = useState<Set<string>>(() => new Set());
  const [toast, setToast] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => { document.title = 'Castbox Downloader — Live catalog'; return () => clearTimeout(timer.current); }, []);
  const notify = (message: string) => { clearTimeout(timer.current); setToast(message); timer.current = setTimeout(() => setToast(''), 4000); };
  const transfers = useTransfers(notify);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [currentTrack, setCurrentTrack] = useState<PlaybackTrack | null>(null);
  const [playback, setPlayback] = useState<PlaybackState>(() => ({ ...idle, playbackSpeed: initialSettings.defaultPlaybackSpeed }));
  const [queueTracks, setQueueTracks] = useState<PlaybackTrack[]>([]);
  const [playbackSnapshot, setPlaybackSnapshot] = useState<PlaybackSnapshot>({ queue: [], lastTrack: null, recentlyPlayed: [] });
  const [expanded, setExpanded] = useState(false);
  const [sleepTimer, setSleepTimer] = useState<SleepTimerState>({ option: 'off', remainingSeconds: null, active: false });
  const progressTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const sleepInterval = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const queueItems: QueueItem[] = queueTracks.map(item => ({ id: item.jobId, episodeId: item.episodeId, title: item.title, subtitle: item.channelTitle, channelTitle: item.channelTitle, durationSeconds: item.durationSeconds ?? undefined, artworkKey: 'unavailable', artworkUrl: item.artworkUrl }));
  const rememberQueue = async (next: PlaybackTrack[]) => {
    const result = await window.castboxDesktop!.playback.replaceQueue({ jobIds: next.map(item => item.jobId) });
    if (!result.ok) throw new Error(result.error);
    setQueueTracks(result.value.queue);
  };
  const playJob = async (jobId: string, autoplay = true) => {
    const job = transfers.state.jobs.find(item => item.id === jobId && item.status === 'completed');
    if (!job) { notify('Only completed downloads can play offline.'); return; }
    try {
      const source = await window.castboxDesktop!.playback.source({ jobId }); if (!source.ok) throw new Error(source.error);
      const snapshot = await window.castboxDesktop!.playback.snapshot(); if (!snapshot.ok) throw new Error(snapshot.error);
      const track = [...snapshot.value.queue, ...snapshot.value.recentlyPlayed, ...(snapshot.value.lastTrack ? [snapshot.value.lastTrack] : [])].find(item => item.jobId === jobId)
        ?? { jobId, episodeId: job.episodeId, title: job.title, channelTitle: job.channelTitle, artworkUrl: job.artworkUrl, durationSeconds: null, positionMs: 0, completed: false };
      setCurrentTrack(track); setPlayback(previous => ({ ...previous, currentTrackTitle: track.title, currentChannelTitle: track.channelTitle, currentArtist: '', currentArtworkUrl: track.artworkUrl, artworkKey: 'unavailable', currentTime: track.positionMs / 1000, duration: track.durationSeconds ?? 0, isPlaying: autoplay }));
      const audio = audioRef.current!; audio.src = source.value; audio.playbackRate = playback.playbackSpeed; audio.currentTime = track.positionMs / 1000;
      if (autoplay) await audio.play();
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to play this download.'); }
  };
  const togglePlay = () => { const audio = audioRef.current; if (!audio || !currentTrack) { const next = queueTracks[0]; if (next) void playJob(next.jobId); return; } if (audio.paused) void audio.play().catch(() => notify('Audio playback could not start.')); else audio.pause(); };
  const enqueueDownloadedEpisode = (episodeId: string) => {
    const job = transfers.state.jobs.find(item => item.episodeId === episodeId && item.status === 'completed');
    if (!job) { notify('Download this episode before adding it to your listening queue.'); return; }
    void (async () => { const snap = await window.castboxDesktop!.playback.snapshot(); if (!snap.ok) throw new Error(snap.error); const existing = snap.value.queue.filter(item => item.jobId !== job.id); await rememberQueue([...existing, { jobId: job.id, episodeId: job.episodeId, title: job.title, channelTitle: job.channelTitle, artworkUrl: job.artworkUrl, durationSeconds: null, positionMs: 0, completed: false }]); notify('Added to listening queue.'); })().catch(error => notify(error instanceof Error ? error.message : 'Unable to update the listening queue.'));
  };
  const refreshPlaybackSnapshot = async () => {
    const result = await window.castboxDesktop!.playback.snapshot();
    if (!result.ok) throw new Error(result.error);
    setPlaybackSnapshot(result.value);
    setQueueTracks(result.value.queue);
    return result.value;
  };
  useEffect(() => { void refreshPlaybackSnapshot().catch(error => notify(error instanceof Error ? error.message : 'Unable to load playback history.')); }, []);
  useEffect(() => {
    if (tab !== 'library') return;
    const interval = setInterval(() => { void refreshPlaybackSnapshot().catch(() => {}); }, 2500);
    return () => clearInterval(interval);
  }, [tab]);
  useEffect(() => {
    const audio = audioRef.current; if (!audio) return;
    const update = () => setPlayback(previous => ({ ...previous, currentTime: audio.currentTime || 0, duration: Number.isFinite(audio.duration) ? audio.duration : 0, isPlaying: !audio.paused }));
    const onMetadata = () => { update(); if (currentTrack && Number.isFinite(audio.duration)) { const durationMs = Math.round(audio.duration * 1000); void window.castboxDesktop!.playback.saveProgress({ jobId: currentTrack.jobId, positionMs: Math.floor(audio.currentTime * 1000), durationMs, completed: false }); setQueueTracks(items => items.map(item => item.jobId === currentTrack.jobId ? { ...item, durationSeconds: audio.duration } : item)); } };
    const onPause = () => { update(); if (currentTrack) void window.castboxDesktop!.playback.saveProgress({ jobId: currentTrack.jobId, positionMs: Math.floor(audio.currentTime * 1000), durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null, completed: false }); };
    const onEnded = () => { update(); if (currentTrack) void window.castboxDesktop!.playback.saveProgress({ jobId: currentTrack.jobId, positionMs: 0, durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null, completed: true }); if (sleepTimer.active && sleepTimer.option === 'end-of-episode') { setSleepTimer({ option: 'off', remainingSeconds: null, active: false }); return; } if (settings.autoPlayNextInQueue && queueTracks[0]) { const next = queueTracks[0]; void rememberQueue(queueTracks.slice(1)).then(() => playJob(next.jobId)); } };
    audio.addEventListener('timeupdate', update); audio.addEventListener('loadedmetadata', onMetadata); audio.addEventListener('play', update); audio.addEventListener('pause', onPause); audio.addEventListener('ended', onEnded);
    return () => { audio.removeEventListener('timeupdate', update); audio.removeEventListener('loadedmetadata', onMetadata); audio.removeEventListener('play', update); audio.removeEventListener('pause', onPause); audio.removeEventListener('ended', onEnded); };
  }, [currentTrack, queueTracks, sleepTimer, settings.autoPlayNextInQueue]);
  useEffect(() => { if (!currentTrack) return; progressTimer.current = setInterval(() => { const audio = audioRef.current; if (audio && !audio.paused) void window.castboxDesktop!.playback.saveProgress({ jobId: currentTrack.jobId, positionMs: Math.floor(audio.currentTime * 1000), durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null, completed: false }); }, 5000); return () => clearInterval(progressTimer.current); }, [currentTrack]);
  useEffect(() => { const save = () => { const audio = audioRef.current; if (audio && currentTrack) void window.castboxDesktop!.playback.saveProgress({ jobId: currentTrack.jobId, positionMs: Math.floor(audio.currentTime * 1000), durationMs: Number.isFinite(audio.duration) ? Math.round(audio.duration * 1000) : null, completed: false }); }; window.addEventListener('beforeunload', save); return () => window.removeEventListener('beforeunload', save); }, [currentTrack]);
  useEffect(() => { if (!sleepTimer.active || !playback.isPlaying || sleepTimer.option === 'off' || sleepTimer.option === 'end-of-episode') return; sleepInterval.current = setInterval(() => setSleepTimer(state => { const remainingSeconds = Math.max(0, (state.remainingSeconds ?? 1) - 1); if (!remainingSeconds) { audioRef.current?.pause(); return { option: 'off', remainingSeconds: null, active: false }; } return { ...state, remainingSeconds }; }), 1000); return () => clearInterval(sleepInterval.current); }, [sleepTimer.active, sleepTimer.option, playback.isPlaying]);
  useEffect(() => { if (audioRef.current) audioRef.current.volume = playback.volume; }, []);
  useEffect(() => { if (currentTrack && sleepTimer.active && sleepTimer.option === 'end-of-episode' && playback.duration > 0 && playback.currentTime >= playback.duration) audioRef.current?.pause(); }, [currentTrack, sleepTimer, playback.currentTime, playback.duration]);
  const transferAction = (id: string, action: 'pause' | 'resume' | 'cancel') => { const job = transfers.state.jobs.find(job => job.id === id); if (job) void transfers.action(job, action); };
  const readLibrary = async () => {
    const epoch = ++libraryEpoch.current; setLibraryLoading(true); setLibraryError('');
    try {
      const result = await window.castboxDesktop!.library.read();
      if (!result.ok) throw new Error(result.error);
      if (libraryEpoch.current === epoch) setLibrary(result.value);
    } catch (error) { if (libraryEpoch.current === epoch) setLibraryError(error instanceof Error ? error.message : 'Unable to load your library.'); }
    finally { if (libraryEpoch.current === epoch) setLibraryLoading(false); }
  };
  useEffect(() => { void readLibrary(); return () => { libraryEpoch.current++; }; }, []);
  const setSaved = async (channelId: string, saved: boolean) => {
    if (mutation.current || !library || libraryLoading) return;
    mutation.current = true; setSaving(true); setLibraryError(''); const epoch = ++libraryEpoch.current;
    try {
      const result = await window.castboxDesktop!.library.setSaved({ channelId, saved });
      if (!result.ok) throw new Error(result.error);
      if (libraryEpoch.current === epoch) { setLibrary(result.value); notify(saved ? 'Channel saved to your library.' : 'Channel removed from saved channels. Downloads are preserved.'); }
    } catch (error) { if (libraryEpoch.current === epoch) setLibraryError(error instanceof Error ? error.message : 'Unable to update your library.'); }
    finally { mutation.current = false; setSaving(false); }
  };
  const savedIds = new Set(library?.savedChannels.map(item => item.channel.id) ?? []);
  const downloadedItems: DownloadedItem[] = transfers.state.jobs.filter(job => job.status === 'completed' && job.completedAt).map(job => {
    const durationSeconds = (job.durationMs ?? 0) / 1000;
    return { id: job.id, episodeId: job.episodeId, title: job.title, artworkUrl: job.artworkUrl, channelTitle: job.channelTitle, artist: job.channelTitle,
      date: new Date(job.completedAt!).toLocaleDateString(), durationSeconds, durationFormatted: formatDuration(durationSeconds),
      fileSizeBytes: job.bytes, fileSizeFormatted: `${(job.bytes / 1_048_576).toFixed(1)} MB`,
      filePath: `${job.destination}${job.destination.includes('\\') ? '\\' : '/'}${job.relativePath.replaceAll('/', job.destination.includes('\\') ? '\\' : '/')}`, artworkKey: 'unavailable', completedAt: job.completedAt!, isMissingFile: missingJobIds.has(job.id) };
  });
  const recentlyPlayed: RecentlyPlayedItem[] = playbackSnapshot.recentlyPlayed.map(track => {
    const durationSeconds = track.durationSeconds ?? 0;
    return { id: track.jobId, episodeId: track.episodeId, title: track.title, artworkUrl: track.artworkUrl, channelTitle: track.channelTitle, artist: track.channelTitle,
      artworkKey: 'unavailable', durationSeconds, durationFormatted: formatDuration(durationSeconds), playedSeconds: track.positionMs / 1000,
      lastPlayedText: relativePlayedAt(track.updatedAt), completed: track.completed };
  });
  const trackJob = (title: string, channelTitle: string) => transfers.state.jobs.find(job => job.status === 'completed' && job.title === title && job.channelTitle === channelTitle);
  const addLibraryTrack = async (title: string, channelTitle: string, playNext = false) => {
    const job = trackJob(title, channelTitle);
    if (!job) { notify('Only downloaded episodes can be added to the listening queue.'); return; }
    try {
      const snapshot = await refreshPlaybackSnapshot();
      const track = snapshot.queue.find(item => item.jobId === job.id) ?? { jobId: job.id, episodeId: job.episodeId, title: job.title,
        channelTitle: job.channelTitle, artworkUrl: job.artworkUrl, durationSeconds: job.durationMs ? job.durationMs / 1000 : null,
        positionMs: 0, completed: false };
      await rememberQueue([...snapshot.queue.filter(item => item.jobId !== job.id), track].sort((a, b) => playNext ? Number(b.jobId === job.id) - Number(a.jobId === job.id) : 0));
      notify(playNext ? 'Added to play next.' : 'Added to listening queue.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to update the listening queue.'); }
  };
  const openSavedChannel = (channel: Channel) => { setTab('find'); setOpenRequest(previous => ({ id: channel.id, key: (previous?.key ?? 0) + 1 })); window.scrollTo(0, 0); };
  const readPlans = async () => {
    try { const response = await window.castboxDesktop!.downloads.list(); if (!response.ok) throw new Error(response.error); setPlans(response.value); setPlansError(''); }
    catch (error) { setPlansError(error instanceof Error ? error.message : 'Unable to read file plans.'); }
  };
  useEffect(() => { void readPlans(); }, []);
  const chooseDestination = async () => {
    try {
      const response = await window.castboxDesktop!.downloads.chooseDirectory(); if (!response.ok) throw new Error(response.error);
      if (!response.value) return;
      const updated = await window.castboxDesktop!.saveSettings({ ...settings, downloadDestination: response.value.path });
      if (!updated.ok) throw new Error(updated.error);
      setSettings(updated.value); setDestinationGrant(response.value); notify('Download destination updated.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to choose destination.'); }
  };
  const ensureDestinationGrant = async (): Promise<DirectoryGrant | null> => {
    if (destinationGrant?.path === settings.downloadDestination) return destinationGrant;
    const response = await window.castboxDesktop!.downloads.chooseDirectory();
    if (!response.ok) throw new Error(response.error);
    if (!response.value) return null;
    const updated = await window.castboxDesktop!.saveSettings({ ...settings, downloadDestination: response.value.path });
    if (!updated.ok) throw new Error(updated.error);
    setSettings(updated.value);
    setDestinationGrant(response.value);
    return response.value;
  };
  const requestDownloads = async (channelId: string, episodeIds: string[]) => {
    try {
      const grant = await ensureDestinationGrant();
      if (!grant) return;
      if (episodeIds.length > 1) {
        setReview({ channelId, episodeIds: [...episodeIds] });
        return;
      }
      const prepared = await window.castboxDesktop!.downloads.prepare({
        channelId,
        episodeIds,
        grantId: grant.id,
        filenamePattern: settings.filenamePattern,
        groupByChannel: settings.groupEpisodesByChannel,
        duplicatePolicy: settings.duplicateHandling,
        concurrency: settings.downloadConcurrency,
      });
      if (!prepared.ok) throw new Error(prepared.error);
      const blocked = prepared.value.entries.find(entry => entry.disposition === 'blocked');
      if (blocked) { notify(`${blocked.title}: ${blocked.reason ?? 'This episode is unavailable for download.'}`); return; }
      const writable = prepared.value.entries.some(entry => ['create', 'replace'].includes(entry.disposition));
      if (!writable) { notify('This episode is already in the destination folder.'); return; }
      const committed = await window.castboxDesktop!.downloads.commit({ planId: prepared.value.id });
      if (!committed.ok) throw new Error(committed.error);
      const started = await transfers.run(() => window.castboxDesktop!.transfers.start({ planId: committed.value.id, grantId: grant.id }));
      if (!started) return;
      setTab('downloads');
      window.scrollTo(0, 0);
      void readPlans();
      notify('Download started.');
    } catch (error) { notify(error instanceof Error ? error.message : 'Unable to start this download.'); }
  };
  const unavailable = () => notify('This action is not available for this item.');
  const seek = (seconds: number) => { const audio = audioRef.current; if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.max(0, Math.min(audio.duration, seconds)); };
  const setVolume = (volume: number) => { if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volume)); setPlayback(previous => ({ ...previous, volume, isMuted: volume === 0 })); };
  const changeSleepTimer = (option: SleepTimerOption) => setSleepTimer({ option, active: option !== 'off', remainingSeconds: option === '15' ? 900 : option === '30' ? 1800 : option === '60' ? 3600 : null });
  const navigate = (next: string) => { setTab(next); if (next === 'find') setReset(value => value + 1); window.scrollTo(0, 0); };
  const find = () => navigate('find');
  return <div className="min-h-screen flex flex-col bg-[var(--app-bg)] text-[var(--app-text-primary)] transition-colors font-sans antialiased">
    <HeaderNav activeNavTab={tab} onSelectNavTab={navigate} downloadsCount={transfers.state.jobs.filter(job => ['queued','downloading'].includes(job.status)).length} />
    <main className="flex-1 w-full">
      {!expanded && <>
      {libraryError && <div role="alert" className="max-w-[1400px] mx-auto mt-5 px-6 text-sm"><div className="p-4 border border-[var(--app-border)] rounded-xl"><p>{libraryError}</p><button disabled={saving || libraryLoading} className="mt-3 text-[var(--app-accent)] underline cursor-pointer" onClick={() => { void readLibrary(); }}>Reload library</button></div></div>}
      {tab === 'library' && libraryLoading && <p role="status" className="max-w-[1400px] mx-auto px-6 py-8">Loading your library…</p>}
      <div hidden={tab !== 'find'}><LiveCatalog onPlanDownloads={(channelId, episodeIds) => { void requestDownloads(channelId, episodeIds); }} onPlayEpisode={episodeId => { const job = transfers.state.jobs.find(item => item.episodeId === episodeId && item.status === 'completed'); if (job) void playJob(job.id); else notify('Download this episode before playing it offline.'); }} onAddToQueue={enqueueDownloadedEpisode} savedIds={savedIds} savePending={saving} libraryReady={library !== null && !libraryLoading && !libraryError} onToggleSaved={channel => { void setSaved(channel.id, !savedIds.has(channel.id)); }} openRequest={openRequest} openEpisodeRequest={openEpisodeRequest} active={tab === 'find'} api={window.castboxDesktop!.catalog} reset={reset} notify={notify} /></div>
      {tab === 'settings' && <SettingsView initialSettings={settings} onSaveSettings={async next => {
        const result = await window.castboxDesktop!.saveSettings(next); if (!result.ok) throw new Error(result.error);
        setSettings(result.value);
        if (destinationGrant && destinationGrant.path !== result.value.downloadDestination) setDestinationGrant(null);
      }} onDestinationGrant={setDestinationGrant} onNavigateToTab={navigate} onShowDiscreetToast={notify} />}
      {tab === 'library' && library && !libraryLoading && <LibraryView native initialTab="downloaded" savingChannel={saving || Boolean(libraryError)} downloadedItems={downloadedItems} savedChannels={library.savedChannels.map(item => channelModel(item.channel))} recentlyPlayed={recentlyPlayed} playback={playback}
        onPlayDownloadedItem={item => { if (currentTrack?.jobId === item.id && !audioRef.current?.paused) return; void playJob(item.id); }}
        onPlayChannelLatest={channel => { const job = transfers.state.jobs.find(item => item.status === 'completed' && item.channelTitle === channel.title); if (job) void playJob(job.id); else notify('No downloaded episodes are available for this channel yet.'); }}
        onResumeRecentlyPlayed={item => { const job = transfers.state.jobs.find(candidate => candidate.id === item.id && candidate.status === 'completed'); if (job) void playJob(job.id); else notify('This downloaded episode is no longer available.'); }}
        onPlayNext={track => { void addLibraryTrack(track.title, track.channelTitle ?? '', true); }}
        onAddToQueue={track => { void addLibraryTrack(track.title, track.channelTitle ?? ''); }}
        onSelectEpisodeDetails={episode => { setTab('find'); setOpenEpisodeRequest(previous => ({ id: episode.id, key: (previous?.key ?? 0) + 1 })); window.scrollTo(0, 0); }}
        onSelectChannel={openSavedChannel}
        onRemoveDownload={item => { const job = transfers.state.jobs.find(candidate => candidate.id === item.id); if (job) void transfers.action(job, 'cancel'); }}
        onShowInFolder={item => { void window.castboxDesktop!.transfers.reveal({ jobId: item.id }).then(result => {
          if (result.ok) return;
          if (/missing or changed/i.test(result.error)) {
            setMissingJobIds(previous => new Set(previous).add(item.id));
            notify('Downloaded file is missing or changed. You can re-download this episode.');
          } else notify(result.error);
        }); }}
        onUnsaveChannel={id => { void setSaved(id, false); }}
        onLocateMissingFile={() => notify('Relinking existing files is not available in this build.')} onReDownloadItem={item => {
          setTab('find'); setOpenEpisodeRequest(previous => ({ id: item.episodeId || item.id, key: (previous?.key ?? 0) + 1 })); window.scrollTo(0, 0);
        }}
        onClearHistory={() => { void window.castboxDesktop!.playback.clearHistory().then(result => { if (!result.ok) throw new Error(result.error); return refreshPlaybackSnapshot(); }).then(() => notify('Listening history cleared.')).catch(error => notify(error instanceof Error ? error.message : 'Unable to clear listening history.')); }}
        onNavigateToFind={find} onShowDiscreetToast={notify} />}
      {tab === 'downloads' && (plansError || plans.some(plan => !transfers.state.startedPlanIds.includes(plan.id))) && <div className="max-w-[1400px] mx-auto px-6 pt-6"><h2 className="font-serif text-xl font-bold">Saved file plans</h2><p className="text-xs text-[var(--app-text-secondary)] mt-1">Previously saved plans. Choose their original folder to start downloading.</p>{plansError && <p role="alert">{plansError} <button className="underline" onClick={() => { void readPlans(); }}>Retry</button></p>}{plans.filter(plan => !transfers.state.startedPlanIds.includes(plan.id)).map(plan => <details key={plan.id} className="mt-3 p-3 border border-[var(--app-border)] rounded-xl text-sm"><summary className="cursor-pointer">{plan.channelTitle} · {plan.entries.filter(item => ['create','replace'].includes(item.disposition)).length} files · Planned</summary><p className="text-xs break-all mt-2">{plan.destination}</p><p className="text-xs mt-1">Choose the original folder to authorize these downloads.</p><ul className="mt-2 text-xs max-h-44 overflow-auto">{plan.entries.map(item => <li className="py-1 break-all" key={item.episodeId}>{item.disposition} · {item.relativePath ?? item.title}</li>)}</ul><div className="flex gap-4 mt-3"><button className="text-[var(--app-accent)] underline" onClick={() => { void transfers.start(plan.id, plan.destination); }}>Choose folder &amp; start</button><button className="underline" onClick={() => { void transfers.run(() => window.castboxDesktop!.transfers.discardPlan({ planId: plan.id })).then(readPlans); }}>Discard plan</button></div></details>)}</div>}
      {transfers.error && <p role="alert" className="max-w-[1400px] mx-auto px-6 py-4">{transfers.error}</p>}
      {tab === 'downloads' && <DownloadsView native onChooseDestination={() => { void chooseDestination(); }} jobs={transfers.jobs} concurrency={transfers.state.concurrency} onChangeConcurrency={value => { void transfers.run(async () => { const result = await window.castboxDesktop!.transfers.setConcurrency({ concurrency: value }); if (result.ok) { const saved = await window.castboxDesktop!.saveSettings({ ...settings, downloadConcurrency: value }); if (!saved.ok) throw new Error(saved.error); setSettings(saved.value); } return result; }); }}
        onPauseJob={id => transferAction(id, 'pause')} onResumeJob={id => transferAction(id, 'resume')} onCancelJob={id => transferAction(id, 'cancel')} onRetryJob={id => transferAction(id, 'resume')} onPauseAll={() => { void transfers.run(() => window.castboxDesktop!.transfers.pauseAll()); }}
        onResumeAll={() => { void (async () => { for (const job of transfers.state.jobs.filter(job => job.status === 'paused')) await transfers.action(job, 'resume'); })(); }} onRemoveCompleted={() => { transfers.state.jobs.filter(job => job.status === 'completed').forEach(job => { void transfers.action(job, 'cancel'); }); }} destinationPath={settings.downloadDestination} onChangeDestination={unavailable}
        isNetworkOffline={false} onToggleNetworkOffline={unavailable} onNavigateToFind={find} onShowInFolder={job => { void transfers.run(() => window.castboxDesktop!.transfers.reveal({ jobId: job.id })); }} onPlayCompleted={job => { void playJob(job.id); }} onAddCompletedToQueue={job => { void (async () => { const snap = await window.castboxDesktop!.playback.snapshot(); if (!snap.ok) throw new Error(snap.error); await rememberQueue([...snap.value.queue.filter(item => item.jobId !== job.id), { jobId: job.id, episodeId: job.episodeId!, title: job.title, channelTitle: job.channelTitle, artworkUrl: job.artworkUrl ?? null, durationSeconds: job.durationMs ? job.durationMs / 1000 : null, positionMs: 0, completed: false }]); notify('Added to listening queue.'); })().catch(error => notify(error instanceof Error ? error.message : 'Unable to add to listening queue.')); }} />}
      {tab === 'queue' && <ListeningQueueView playback={playback} queue={queueItems} previousViewLabel="Find" onTogglePlay={togglePlay} onSeek={seek}
        onPlayNow={item => { void rememberQueue(queueTracks.filter(track => track.jobId !== item.id)).then(() => playJob(item.id)); }}
        onReorderQueue={items => { const ordered = items.map(item => queueTracks.find(track => track.jobId === item.id)).filter((item): item is PlaybackTrack => Boolean(item)); void rememberQueue(ordered).catch(error => notify(error instanceof Error ? error.message : 'Unable to reorder queue.')); }}
        onRemoveItem={id => { void rememberQueue(queueTracks.filter(item => item.jobId !== id)).catch(error => notify(error instanceof Error ? error.message : 'Unable to remove queue item.')); }}
        onRestoreItem={(item, index) => { const match = transfers.state.jobs.find(job => job.id === item.id && job.status === 'completed'); if (!match) return; const restored = [...queueTracks]; restored.splice(Math.max(0, Math.min(index, restored.length)), 0, { jobId: match.id, episodeId: match.episodeId, title: match.title, channelTitle: match.channelTitle, artworkUrl: match.artworkUrl, durationSeconds: null, positionMs: 0, completed: false }); void rememberQueue(restored); }}
        onClearUpcoming={() => { void rememberQueue([]).catch(error => notify(error instanceof Error ? error.message : 'Unable to clear queue.')); }}
        onNavigateToFind={find} onBack={find} />}
      </>}
      {expanded && currentTrack && <ExpandedNowPlayingView playback={playback} trackMetadata={(() => { const job = transfers.state.jobs.find(item => item.id === currentTrack.jobId && item.status === 'completed'); return job?.completedAt ? { status: 'Downloaded · Playing from device', details: `Saved ${new Date(job.completedAt).toLocaleDateString()}` } : undefined; })()} queue={queueItems} sleepTimer={sleepTimer}
        skipBackwardSeconds={settings.skipBackwardSeconds} skipForwardSeconds={settings.skipForwardSeconds}
        onTogglePlay={togglePlay} onSeek={seek} onVolumeChange={setVolume} onToggleMute={() => { const audio = audioRef.current; if (audio) audio.muted = !audio.muted; setPlayback(previous => ({ ...previous, isMuted: !previous.isMuted })); }}
        onSkipSeconds={delta => seek((audioRef.current?.currentTime ?? 0) + delta)} onPrevTrack={() => { if (audioRef.current) audioRef.current.currentTime = 0; }} onNextTrack={() => { if (queueTracks[0]) { const next = queueTracks[0]; void rememberQueue(queueTracks.slice(1)).then(() => playJob(next.jobId)); } }}
        onChangeSpeed={(speed: PlaybackSpeed) => { if (audioRef.current) audioRef.current.playbackRate = speed; setPlayback(previous => ({ ...previous, playbackSpeed: speed })); }}
        onSetSleepTimer={changeSleepTimer} onCancelSleepTimer={() => changeSleepTimer('off')} onClose={() => setExpanded(false)} onShowDiscreetToast={notify} onOpenListeningQueue={() => { setExpanded(false); navigate('queue'); }} onOpenEpisode={() => { setExpanded(false); setTab('find'); setOpenEpisodeRequest(previous => ({ id: currentTrack.episodeId, key: (previous?.key ?? 0) + 1 })); }} />}
    </main>
    {review && <NativeDownloadReview {...review} settings={settings} initialGrant={destinationGrant} onGrantChange={async grant => {
      const updated = await window.castboxDesktop!.saveSettings({ ...settings, downloadDestination: grant.path });
      if (!updated.ok) throw new Error(updated.error);
      setSettings(updated.value); setDestinationGrant(grant);
    }} onClose={() => { setReview(null); void readPlans(); }} onSaved={() => { setReview(null); void readPlans(); setTab('downloads'); notify('Downloads queued.'); }} />}
    <audio ref={audioRef} hidden preload="metadata" onError={() => { setPlayback(previous => ({ ...previous, isPlaying: false })); notify('This downloaded audio could not be decoded or opened.'); }} />
    {!expanded && <BottomPlayer playback={playback} idle={!currentTrack} queue={queueItems} skipBackwardSeconds={settings.skipBackwardSeconds} skipForwardSeconds={settings.skipForwardSeconds} onTogglePlay={togglePlay} onSeek={seek} onVolumeChange={setVolume} onToggleMute={() => { const audio = audioRef.current; if (audio) audio.muted = !audio.muted; setPlayback(previous => ({ ...previous, isMuted: !previous.isMuted })); }}
      onSkipSeconds={delta => seek((audioRef.current?.currentTime ?? 0) + delta)} onPrevTrack={() => { if (audioRef.current) audioRef.current.currentTime = 0; }} onNextTrack={() => { if (queueTracks[0]) { const next = queueTracks[0]; void rememberQueue(queueTracks.slice(1)).then(() => playJob(next.jobId)); } }} onOpenExpandedPlayer={() => { if (currentTrack) setExpanded(true); }} onOpenQueue={() => navigate('queue')} />
    }
    {toast && <div role="status" className="fixed bottom-26 right-6 z-50 max-w-md px-3.5 py-2 bg-[var(--app-input-bg)] border border-[var(--app-border)] rounded-lg text-xs font-medium shadow-lg">{toast}</div>}
  </div>;
}
