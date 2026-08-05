import { NativeApp } from './NativeApp';
import React, { useState, useEffect, useMemo } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { HeaderNav } from './components/layout/HeaderNav';
import { SearchBar } from './components/search/SearchBar';
import { RecentSearches } from './components/search/RecentSearches';
import { ChannelCard } from './components/search/ChannelCard';
import { EmptyState } from './components/search/EmptyState';
import { LoadingState } from './components/search/LoadingState';
import { BottomPlayer } from './components/player/BottomPlayer';
import { ExpandedNowPlayingView } from './components/player/ExpandedNowPlayingView';
import { ChannelDetailsView } from './components/channel/ChannelDetailsView';
import { EpisodeDetailsView } from './components/episode/EpisodeDetailsView';
import { BulkDownloadReviewModal } from './components/download/BulkDownloadReviewModal';
import { DownloadsView } from './components/download/DownloadsView';
import { LibraryView } from './components/library/LibraryView';
import { ListeningQueueView } from './components/queue/ListeningQueueView';
import { SettingsView } from './components/settings/SettingsView';
import {
  MOCK_CHANNELS,
  JUST_COFFEE_EPISODES,
  INITIAL_RECENT_SEARCHES,
  INITIAL_DOWNLOAD_JOBS,
  INITIAL_DOWNLOADED_ITEMS,
  INITIAL_RECENTLY_PLAYED,
  INITIAL_LISTENING_QUEUE,
  DEFAULT_SETTINGS,
} from './data/mockData';
import {
  Channel,
  Episode,
  PlaybackState,
  PlaybackSpeed,
  SleepTimerOption,
  SleepTimerState,
  DownloadJob,
  DownloadedItem,
  RecentlyPlayedItem,
  QueueItem,
  AppSettings,
} from './types';

function MainFindApp({ nativeSettings }: { nativeSettings?: AppSettings }) {
  const isVisualCapture = new URLSearchParams(window.location.search).has('visual-capture');
  // Navigation State - defaults to 'library' to showcase the new Library screen
  const [activeNavTab, setActiveNavTab] = useState<string>('library');

  // Active Channel - defaults to 'Just Coffee & Me'
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(MOCK_CHANNELS[0]);

  // Active Episode Details Screen
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);

  // Listening Queue State (Shared across episode, library, and player actions)
  const [queue, setQueue] = useState<QueueItem[]>(() => INITIAL_LISTENING_QUEUE);

  // Last view state prior to entering Queue (for breadcrumb/back navigation)
  const [lastViewBeforeQueue, setLastViewBeforeQueue] = useState<{
    tab: string;
    episode: Episode | null;
    channel: Channel | null;
  }>({ tab: 'library', episode: null, channel: MOCK_CHANNELS[0] });

  // Saved channels set (persists locally)
  const [savedChannelIds, setSavedChannelIds] = useState<Set<string>>(() => {
    const defaultIds = [
      'coffee-break-stories',
      'the-morning-brew',
      'slow-sundays',
      'coffee-break-languages',
      'daily-notes-journal',
      'focus-study-lounge',
      'midnight-reflections',
      'tea-and-tales',
      'the-nordic-acoustic',
      'morning-meditation',
      'bookstore-ambience',
    ];
    try {
      const saved = localStorage.getItem('castbox-saved-channels');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 10) {
          return new Set(parsed);
        }
      }
      return new Set(defaultIds);
    } catch {
      return new Set(defaultIds);
    }
  });

  // Library Downloaded Items State (shared with download jobs and completed downloads)
  const [downloadedItems, setDownloadedItems] = useState<DownloadedItem[]>(INITIAL_DOWNLOADED_ITEMS);

  // Library Recently Played State
  const [recentlyPlayed, setRecentlyPlayed] = useState<RecentlyPlayedItem[]>(INITIAL_RECENTLY_PLAYED);

  // Shared bulk selected episodes set - initialized with #280, #278, #277 matching reference mockups
  const [selectedEpisodeIds, setSelectedEpisodeIds] = useState<Set<string>>(
    new Set(['ep-280', 'ep-278', 'ep-277'])
  );

  // Settings State (persisted to localStorage)
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (nativeSettings) return nativeSettings;
    try {
      const saved = localStorage.getItem('castbox-app-settings');
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      // fallback
    }
    return DEFAULT_SETTINGS;
  });

  // Download Jobs State matching references (3 downloading, 1 queued, 1 completed, 1 failed)
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>(INITIAL_DOWNLOAD_JOBS);
  const [downloadConcurrency, setDownloadConcurrency] = useState<number>(settings.downloadConcurrency);
  const [isNetworkOffline, setIsNetworkOffline] = useState<boolean>(isVisualCapture);
  const [downloadDestination, setDownloadDestination] = useState<string>(settings.downloadDestination);

  // Bulk Download Review Modal State
  const [isBulkReviewModalOpen, setIsBulkReviewModalOpen] = useState<boolean>(false);
  const [frozenEpisodesForReview, setFrozenEpisodesForReview] = useState<Episode[]>([]);

  // Search State for Find Page
  const [searchQuery, setSearchQuery] = useState<string>('coffee');
  const [recentSearches, setRecentSearches] = useState<string[]>(INITIAL_RECENT_SEARCHES);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filteredChannels, setFilteredChannels] = useState<Channel[]>(MOCK_CHANNELS.slice(0, 4));

  // Toast / simulated notification state (discreet, bottom-right)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showDiscreetToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2800);
  };

  // Expanded Now Playing View state (opened by clicking BottomPlayer title/artwork)
  const [isExpandedNowPlaying, setIsExpandedNowPlaying] = useState<boolean>(false);

  // Sleep Timer State (Off, 15m, 30m, 60m, End of episode)
  const [sleepTimer, setSleepTimer] = useState<SleepTimerState>({
    option: 'off',
    remainingSeconds: null,
    active: false,
  });

  // Keep the prototype's current track aligned with the canonical player and settings references.
  const [playback, setPlayback] = useState<PlaybackState>({
    currentTrackTitle: 'Almost',
    currentArtist: 'Beren Olivia',
    currentChannelTitle: 'Just Coffee & Me',
    artworkKey: 'almost-episode',
    isPlaying: true, // Matches active Pause icon in 16-episode-desktop-light.png & 17-episode-desktop-dark.png
    currentTime: 56, // 0:56
    duration: 222, // 3:42
    volume: 0.8,
    isMuted: false,
    playbackSpeed: 1,
  });

  // Playback timer simulation (supports playback speed and end-of-episode sleep timer)
  useEffect(() => {
    if (!playback.isPlaying || isVisualCapture) return;

    const speed = playback.playbackSpeed || 1;
    const interval = setInterval(() => {
      setPlayback((prev) => {
        if (prev.currentTime >= prev.duration) {
          // If sleep timer was set to end-of-episode, handle it
          if (sleepTimer.active && sleepTimer.option === 'end-of-episode') {
            setSleepTimer({ option: 'off', remainingSeconds: null, active: false });
            showDiscreetToast('Sleep timer reached end of episode: Playback paused');
          }
          return { ...prev, currentTime: 0, isPlaying: false };
        }
        return { ...prev, currentTime: prev.currentTime + 1 };
      });
    }, 1000 / speed);

    return () => clearInterval(interval);
  }, [playback.isPlaying, playback.playbackSpeed, sleepTimer.active, sleepTimer.option, isVisualCapture]);

  // Sleep timer countdown simulation (for 15, 30, 60 min)
  useEffect(() => {
    if (isVisualCapture || !sleepTimer.active || sleepTimer.option === 'off' || sleepTimer.option === 'end-of-episode') return;
    if (!playback.isPlaying) return;

    const interval = setInterval(() => {
      setSleepTimer((prev) => {
        if (!prev.active || prev.remainingSeconds === null) return prev;
        if (prev.remainingSeconds <= 1) {
          setPlayback((p) => ({ ...p, isPlaying: false }));
          showDiscreetToast('Sleep timer finished: Playback paused');
          return { option: 'off', remainingSeconds: null, active: false };
        }
        return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimer.active, sleepTimer.option, playback.isPlaying, isVisualCapture]);

  const handleChangeSpeed = (speed: PlaybackSpeed) => {
    setPlayback((prev) => ({ ...prev, playbackSpeed: speed }));
  };

  const handleSetSleepTimer = (option: SleepTimerOption) => {
    if (option === 'off') {
      setSleepTimer({ option: 'off', remainingSeconds: null, active: false });
      return;
    }
    if (option === 'end-of-episode') {
      setSleepTimer({
        option: 'end-of-episode',
        remainingSeconds: Math.max(0, playback.duration - playback.currentTime),
        active: true,
      });
      return;
    }
    const minutes = parseInt(option, 10);
    setSleepTimer({
      option,
      remainingSeconds: minutes * 60,
      active: true,
    });
  };

  const handleCancelSleepTimer = () => {
    setSleepTimer({ option: 'off', remainingSeconds: null, active: false });
  };

  // Active downloading jobs count for badge in HeaderNav (matching the badge "3" in 03-downloads-dark.png)
  const activeDownloadingCount = useMemo(() => {
    return downloadJobs.filter((j) => j.status === 'downloading').length;
  }, [downloadJobs]);

  // Simulation timer for active downloading jobs (explicit, frontend-only)
  useEffect(() => {
    if (isNetworkOffline || isVisualCapture) return;

    const interval = setInterval(() => {
      setDownloadJobs((prevJobs) => {
        let hasChanges = false;
        const currentActive = prevJobs.filter((j) => j.status === 'downloading');
        if (currentActive.length === 0 && !prevJobs.some((j) => j.status === 'queued')) {
          return prevJobs;
        }

        let updated = prevJobs.map((job) => {
          if (job.status !== 'downloading') return job;

          hasChanges = true;
          const nextPercent = Math.min(100, job.progressPercent + (Math.random() * 2 + 2)); // +2% to +4%
          const isDone = nextPercent >= 100;

          if (isDone) {
            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            });
            const timeStr = now.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            });

            // Automatically sync completed download to shared Library state
            setDownloadedItems((prevDl) => {
              if (prevDl.some((d) => d.title === job.title)) return prevDl;
              return [
                {
                  id: `dl-${Date.now()}-${job.id}`,
                  episodeId: job.episodeId,
                  title: job.title,
                  channelTitle: job.channelTitle,
                  episodeNumber: job.episodeNumber,
                  date: job.date,
                  durationFormatted: '3:42',
                  durationSeconds: 222,
                  fileSizeFormatted: `${job.totalMB.toFixed(1)} MB`,
                  fileSizeBytes: Math.round(job.totalMB * 1024 * 1024),
                  filePath: `${job.destinationPath || downloadDestination}/${job.title}.mp3`,
                  artworkKey: job.artworkKey,
                  completedAt: `${dateStr}, ${timeStr}`,
                  isMissingFile: false,
                },
                ...prevDl,
              ];
            });

            return {
              ...job,
              status: 'completed' as const,
              progressPercent: 100,
              downloadedMB: job.totalMB,
              speedMBs: 0,
              completedAt: `${dateStr}, ${timeStr}`,
            };
          }

          const downloaded = Number(((nextPercent / 100) * job.totalMB).toFixed(1));
          return {
            ...job,
            progressPercent: Number(nextPercent.toFixed(1)),
            downloadedMB: downloaded,
            speedMBs: Number((1.0 + Math.random() * 0.3).toFixed(1)),
          };
        });

        // Promote queued jobs if concurrency slots are available
        const currentDownloading = updated.filter((j) => j.status === 'downloading').length;
        if (currentDownloading < downloadConcurrency) {
          const slotsAvailable = downloadConcurrency - currentDownloading;
          let slotsFilled = 0;
          updated = updated.map((job) => {
            if (job.status === 'queued' && slotsFilled < slotsAvailable) {
              slotsFilled++;
              hasChanges = true;
              return {
                ...job,
                status: 'downloading' as const,
                speedMBs: 1.1,
              };
            }
            return job;
          });
        }

        return hasChanges ? updated : prevJobs;
      });
    }, 1500);

    return () => clearInterval(interval);
  }, [isNetworkOffline, downloadConcurrency, isVisualCapture]);

  // Execute Search Filter
  const executeSearch = (queryToSearch?: string) => {
    const term = (queryToSearch !== undefined ? queryToSearch : searchQuery).trim();
    setIsLoading(true);

    setTimeout(() => {
      if (!term) {
        setFilteredChannels(MOCK_CHANNELS.slice(0, 4));
      } else {
        const lower = term.toLowerCase();
        const results = MOCK_CHANNELS.filter(
          (c) =>
            c.title.toLowerCase().includes(lower) ||
            c.author.toLowerCase().includes(lower) ||
            c.description.toLowerCase().includes(lower)
        );
        setFilteredChannels(results);

        if (!recentSearches.includes(term.toLowerCase())) {
          setRecentSearches((prev) => [term.toLowerCase(), ...prev].slice(0, 5));
        }
      }
      setIsLoading(false);
    }, 240);
  };

  const handleClearQuery = () => {
    setSearchQuery('');
    setFilteredChannels(MOCK_CHANNELS.slice(0, 4));
  };

  const handleSelectRecentSearch = (term: string) => {
    setSearchQuery(term);
    setSelectedEpisode(null);
    setSelectedChannel(null);
    executeSearch(term);
  };

  const handleClearRecentSearches = () => {
    setRecentSearches([]);
    showDiscreetToast('Cleared recent searches');
  };

  const handleSelectNavTab = (tab: string) => {
    setActiveNavTab(tab);
    setIsExpandedNowPlaying(false);
    if (tab === 'find') {
      // If user clicks Find in header, return to the Find search list
      setSelectedEpisode(null);
      setSelectedChannel(null);
    } else if (tab === 'library') {
      setSelectedEpisode(null);
      setSelectedChannel(null);
    } else if (tab === 'downloads') {
      setSelectedEpisode(null);
      setSelectedChannel(null);
    } else if (tab === 'queue') {
      // Direct navigation to queue
      setSelectedEpisode(null);
    } else if (tab === 'settings') {
      setSelectedEpisode(null);
      setSelectedChannel(null);
    } else {
      showDiscreetToast(`Navigated to ${tab.charAt(0).toUpperCase() + tab.slice(1)} (Simulated view)`);
    }
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
    let savedSettings = newSettings;
    if (window.castboxDesktop) {
      const result = await window.castboxDesktop.saveSettings(newSettings);
      if (!result.ok) throw new Error(result.error);
      savedSettings = result.value;
    } else {
      localStorage.setItem('castbox-app-settings', JSON.stringify(newSettings));
    }
    setSettings(savedSettings);
    setDownloadConcurrency(savedSettings.downloadConcurrency);
    setDownloadDestination(savedSettings.downloadDestination);
    setPlayback((prev) => ({ ...prev, playbackSpeed: savedSettings.defaultPlaybackSpeed }));
  };

  const handleOpenListeningQueue = () => {
    setLastViewBeforeQueue({
      tab: activeNavTab,
      episode: selectedEpisode,
      channel: selectedChannel,
    });
    setActiveNavTab('queue');
    setIsExpandedNowPlaying(false);
  };

  const handleBackFromQueue = () => {
    setActiveNavTab(lastViewBeforeQueue.tab === 'queue' ? 'library' : lastViewBeforeQueue.tab);
    setSelectedEpisode(lastViewBeforeQueue.episode);
    setSelectedChannel(lastViewBeforeQueue.channel);
  };

  const queueBackLabel = useMemo(() => {
    return 'player';
  }, []);

  const previousViewLabel = useMemo(() => {
    if (selectedEpisode) return selectedEpisode.title;
    if (selectedChannel) return selectedChannel.title;
    if (activeNavTab === 'library') return 'Library';
    if (activeNavTab === 'downloads') return 'Downloads';
    if (activeNavTab === 'queue') return 'Queue';
    return 'Find';
  }, [selectedEpisode, selectedChannel, activeNavTab]);

  // Saved Channels List Memo
  const savedChannelsList = useMemo(() => {
    return MOCK_CHANNELS.filter((c) => savedChannelIds.has(c.id));
  }, [savedChannelIds]);

  // Channel & Saved Handlers
  const handleSelectChannel = (channel: Channel) => {
    setSelectedChannel(channel);
    setSelectedEpisode(null);
  };

  const handleToggleSaveChannel = () => {
    if (!selectedChannel) return;
    setSavedChannelIds((prev) => {
      const next = new Set(prev);
      const isSaved = next.has(selectedChannel.id);
      if (isSaved) {
        next.delete(selectedChannel.id);
        showDiscreetToast(`Removed "${selectedChannel.title}" from saved channels`);
      } else {
        next.add(selectedChannel.id);
        showDiscreetToast(`Saved "${selectedChannel.title}" to library`);
      }
      try {
        localStorage.setItem('castbox-saved-channels', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
  };

  // Library-specific handlers
  const handleUnsaveChannel = (channelId: string) => {
    setSavedChannelIds((prev) => {
      const next = new Set(prev);
      next.delete(channelId);
      try {
        localStorage.setItem('castbox-saved-channels', JSON.stringify(Array.from(next)));
      } catch {}
      return next;
    });
    // Critical: Removing a saved channel must NOT remove its downloads!
  };

  const handleRemoveDownload = (item: DownloadedItem) => {
    setDownloadedItems((prev) => prev.filter((d) => d.id !== item.id));
    // Critical: Removing a download preserves listening progress!
  };

  const handleLocateMissingFile = (item: DownloadedItem, newPath: string) => {
    setDownloadedItems((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, filePath: newPath, isMissingFile: false } : d))
    );
  };

  const handleReDownloadItem = (item: DownloadedItem) => {
    const sizeMB = parseFloat(item.fileSizeFormatted.replace(' MB', '')) || 8.5;
    const canStartNow =
      downloadJobs.filter((j) => j.status === 'downloading').length < downloadConcurrency &&
      !isNetworkOffline;

    const newJob: DownloadJob = {
      id: `job-${Date.now()}-${item.id}`,
      episodeId: item.episodeId,
      title: item.title,
      channelTitle: item.channelTitle,
      episodeNumber: item.episodeNumber,
      date: item.date,
      artworkKey: item.artworkKey,
      status: canStartNow ? 'downloading' : 'queued',
      progressPercent: 0,
      downloadedMB: 0,
      totalMB: sizeMB,
      speedMBs: canStartNow ? 1.2 : 0,
      destinationPath: `${downloadDestination}/${item.channelTitle}`,
    };

    setDownloadJobs((prev) => [newJob, ...prev]);
    setDownloadedItems((prev) =>
      prev.map((d) => (d.id === item.id ? { ...d, isMissingFile: false } : d))
    );
  };

  const handleToggleMissingFileDemo = (itemId: string) => {
    setDownloadedItems((prev) =>
      prev.map((d) => (d.id === itemId ? { ...d, isMissingFile: !d.isMissingFile } : d))
    );
  };

  const handlePlayDownloadedItem = (item: DownloadedItem) => {
    if (playback.currentTrackTitle === item.title) {
      if (!playback.isPlaying) setPlayback((prev) => ({ ...prev, isPlaying: true }));
    } else {
      setPlayback((prev) => ({
        ...prev,
        currentTrackTitle: item.title,
        currentArtist: item.artist || item.channelTitle,
        currentChannelTitle: item.channelTitle,
        artworkKey: item.artworkKey,
        currentTime: 0,
        duration: item.durationSeconds,
        isPlaying: true,
      }));

      // Update recently played
      setRecentlyPlayed((prev) => {
        const remaining = prev.filter((p) => p.title !== item.title);
        return [
          {
            id: `hist-${Date.now()}`,
            episodeId: item.episodeId,
            title: item.title,
            channelTitle: item.channelTitle,
            artist: item.artist || item.channelTitle,
            artworkKey: item.artworkKey,
            durationSeconds: item.durationSeconds,
            durationFormatted: item.durationFormatted,
            playedSeconds: 0,
            lastPlayedText: 'Listening now',
            completed: false,
          },
          ...remaining,
        ];
      });
      showDiscreetToast(`Playing: ${item.title}`);
    }
  };

  const handlePlayChannelLatest = (channel: Channel) => {
    if (channel.sampleTrack) {
      setPlayback((prev) => ({
        ...prev,
        currentTrackTitle: channel.sampleTrack!.title,
        currentArtist: channel.sampleTrack!.artist,
        currentChannelTitle: channel.title,
        artworkKey: channel.artworkKey,
        currentTime: 0,
        duration: channel.sampleTrack!.durationSeconds,
        isPlaying: true,
      }));
      showDiscreetToast(`Playing latest: ${channel.sampleTrack.title}`);
    } else if (channel.episodes && channel.episodes.length > 0) {
      handlePlayEpisode(channel.episodes[0]);
    }
  };

  const handleResumeRecentlyPlayed = (item: RecentlyPlayedItem) => {
    if (playback.currentTrackTitle === item.title) {
      setPlayback((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    } else {
      setPlayback((prev) => ({
        ...prev,
        currentTrackTitle: item.title,
        currentArtist: item.artist,
        currentChannelTitle: item.channelTitle,
        artworkKey: item.artworkKey,
        currentTime: item.playedSeconds,
        duration: item.durationSeconds,
        isPlaying: true,
      }));
      showDiscreetToast(`Resumed: ${item.title}`);
    }
  };

  const handlePlayNext = (track: {
    title: string;
    subtitle: string;
    artist?: string;
    channelTitle?: string;
    artworkKey?: any;
    durationFormatted?: string;
    durationSeconds?: number;
  }) => {
    const newItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: track.title,
      subtitle: track.subtitle,
      artist: track.artist || track.subtitle.split('·')[1]?.trim() || 'Beren Olivia',
      channelTitle: track.channelTitle || track.subtitle.split('·')[0]?.trim() || 'Just Coffee & Me',
      durationFormatted: track.durationFormatted || '3:45',
      durationSeconds: track.durationSeconds || 225,
      artworkKey: track.artworkKey || 'just-coffee',
    };
    setQueue((prev) => [newItem, ...prev]);
    showDiscreetToast(`"${track.title}" will play next`);
  };

  const handleAddToQueueTrack = (track: {
    title: string;
    subtitle: string;
    artist?: string;
    channelTitle?: string;
    artworkKey?: any;
    durationFormatted?: string;
    durationSeconds?: number;
  }) => {
    const newItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: track.title,
      subtitle: track.subtitle,
      artist: track.artist || track.subtitle.split('·')[1]?.trim() || 'Beren Olivia',
      channelTitle: track.channelTitle || track.subtitle.split('·')[0]?.trim() || 'Just Coffee & Me',
      durationFormatted: track.durationFormatted || '3:45',
      durationSeconds: track.durationSeconds || 225,
      artworkKey: track.artworkKey || 'just-coffee',
    };
    setQueue((prev) => [...prev, newItem]);
    showDiscreetToast(`Added "${track.title}" to listening queue`);
  };

  // Listening Queue screen actions
  const handlePlayNowQueueItem = (item: QueueItem) => {
    setPlayback((prev) => ({
      ...prev,
      currentTrackTitle: item.title,
      currentArtist: item.artist || item.subtitle.split('·')[1]?.trim() || 'Beren Olivia',
      currentChannelTitle: item.channelTitle || item.subtitle.split('·')[0]?.trim() || 'Just Coffee & Me',
      artworkKey: item.artworkKey || 'just-coffee',
      currentTime: 0,
      duration: item.durationSeconds || 217,
      isPlaying: true,
    }));
    setQueue((prev) => prev.filter((q) => q.id !== item.id));
    showDiscreetToast(`Playing "${item.title}"`);
  };

  const handleReorderQueue = (newQueue: QueueItem[]) => {
    setQueue(newQueue);
  };

  const handleRemoveQueueItem = (id: string) => {
    setQueue((prev) => prev.filter((q) => q.id !== id));
  };

  const handleRestoreQueueItem = (item: QueueItem, index: number) => {
    setQueue((prev) => {
      const copy = [...prev];
      copy.splice(Math.min(index, copy.length), 0, item);
      return copy;
    });
    showDiscreetToast(`Restored "${item.title}" to queue`);
  };

  const handleClearUpcomingQueue = () => {
    setQueue([]);
    showDiscreetToast('Cleared upcoming listening queue');
  };

  // Selection Handlers (Shared State)
  const handleToggleEpisodeSelect = (episodeId: string) => {
    setSelectedEpisodeIds((prev) => {
      const next = new Set(prev);
      if (next.has(episodeId)) {
        next.delete(episodeId);
      } else {
        next.add(episodeId);
      }
      return next;
    });
  };

  const handleSelectThisPage = (visibleIds: string[]) => {
    setSelectedEpisodeIds((prev) => {
      const next = new Set(prev);
      visibleIds.forEach((id) => next.add(id));
      showDiscreetToast(`Selected ${visibleIds.length} visible episodes`);
      return next;
    });
  };

  const handleSelectAllEpisodes = (allIds: string[]) => {
    setSelectedEpisodeIds((prev) => {
      const next = new Set(prev);
      allIds.forEach((id) => next.add(id));
      showDiscreetToast(`Selected all ${allIds.length} episodes`);
      return next;
    });
  };

  const handleClearSelection = () => {
    setSelectedEpisodeIds(new Set());
  };

  // Play episode
  const handlePlayEpisode = (episode: Episode) => {
    setPlayback((prev) => ({
      ...prev,
      currentTrackTitle: episode.title,
      currentArtist: episode.artist,
      currentChannelTitle: selectedChannel?.title || 'Just Coffee & Me',
      artworkKey: episode.artworkKey,
      isPlaying: true,
      currentTime: 0,
      duration: episode.durationSeconds,
    }));
    showDiscreetToast(`Now playing: ${episode.title}`);
  };

  // Toggle play/pause from Episode Details View
  const handleTogglePlayFromEpisodeView = (episode: Episode) => {
    if (playback.currentTrackTitle === episode.title) {
      setPlayback((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
    } else {
      handlePlayEpisode(episode);
    }
  };

  // Concurrency selection: Lowering concurrency must not cancel active jobs.
  const handleChangeConcurrency = (newLimit: number) => {
    const oldLimit = downloadConcurrency;
    setDownloadConcurrency(newLimit);

    if (newLimit > oldLimit && !isNetworkOffline) {
      // Raising concurrency: start queued jobs up to new limit
      setDownloadJobs((prev) => {
        const activeCount = prev.filter((j) => j.status === 'downloading').length;
        const slotsAvailable = newLimit - activeCount;
        if (slotsAvailable <= 0) return prev;
        let filled = 0;
        return prev.map((job) => {
          if (job.status === 'queued' && filled < slotsAvailable) {
            filled++;
            return {
              ...job,
              status: 'downloading' as const,
              speedMBs: 1.1,
            };
          }
          return job;
        });
      });
    }
    // Lowering concurrency does NOT cancel or pause active jobs!
  };

  // Individual Pause
  const handlePauseJob = (jobId: string) => {
    setDownloadJobs((prev) => {
      let freedSlot = false;
      const updated = prev.map((j) => {
        if (j.id === jobId && j.status === 'downloading') {
          freedSlot = true;
          return { ...j, status: 'paused' as const, speedMBs: 0 };
        }
        return j;
      });

      if (freedSlot && !isNetworkOffline) {
        // Promote next queued job if slot opened
        let promoted = false;
        return updated.map((j) => {
          if (!promoted && j.status === 'queued') {
            promoted = true;
            return { ...j, status: 'downloading' as const, speedMBs: 1.1 };
          }
          return j;
        });
      }
      return updated;
    });
  };

  // Individual Resume
  const handleResumeJob = (jobId: string) => {
    setDownloadJobs((prev) => {
      const activeCount = prev.filter((j) => j.status === 'downloading').length;
      const canStartNow = activeCount < downloadConcurrency && !isNetworkOffline;

      return prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            status: canStartNow ? ('downloading' as const) : ('queued' as const),
            speedMBs: canStartNow ? 1.1 : 0,
          };
        }
        return j;
      });
    });
  };

  // Individual Cancel
  const handleCancelJob = (jobId: string) => {
    setDownloadJobs((prev) => {
      const target = prev.find((j) => j.id === jobId);
      const wasDownloading = target?.status === 'downloading';
      const remaining = prev.filter((j) => j.id !== jobId);

      if (wasDownloading && !isNetworkOffline) {
        let promoted = false;
        return remaining.map((j) => {
          if (!promoted && j.status === 'queued') {
            promoted = true;
            return { ...j, status: 'downloading' as const, speedMBs: 1.1 };
          }
          return j;
        });
      }
      return remaining;
    });
    showDiscreetToast('Download cancelled');
  };

  // Individual Retry
  const handleRetryJob = (jobId: string) => {
    setDownloadJobs((prev) => {
      const activeCount = prev.filter((j) => j.status === 'downloading').length;
      const canStartNow = activeCount < downloadConcurrency && !isNetworkOffline;

      return prev.map((j) => {
        if (j.id === jobId) {
          return {
            ...j,
            status: canStartNow ? ('downloading' as const) : ('queued' as const),
            progressPercent: 0,
            downloadedMB: 0,
            speedMBs: canStartNow ? 1.1 : 0,
            errorMessage: undefined,
          };
        }
        return j;
      });
    });
    showDiscreetToast('Retrying download...');
  };

  // Pause All
  const handlePauseAll = () => {
    setDownloadJobs((prev) =>
      prev.map((j) =>
        j.status === 'downloading'
          ? { ...j, status: 'paused' as const, speedMBs: 0 }
          : j
      )
    );
    showDiscreetToast('Paused all active downloads');
  };

  // Resume All
  const handleResumeAll = () => {
    setDownloadJobs((prev) => {
      let activeCount = 0;
      return prev.map((j) => {
        if (j.status === 'paused') {
          if (activeCount < downloadConcurrency && !isNetworkOffline) {
            activeCount++;
            return { ...j, status: 'downloading' as const, speedMBs: 1.1 };
          } else {
            return { ...j, status: 'queued' as const, speedMBs: 0 };
          }
        }
        return j;
      });
    });
    showDiscreetToast('Resumed downloads');
  };

  // Remove Completed
  const handleRemoveCompleted = () => {
    setDownloadJobs((prev) => prev.filter((j) => j.status !== 'completed'));
    showDiscreetToast('Cleared completed downloads');
  };

  // Single download from episode view
  const handleDownloadEpisode = (episode: Episode) => {
    const sizeMB = parseFloat(episode.fileSizeFormatted.replace(' MB', '')) || 8.5;

    setDownloadJobs((prev) => {
      const activeCount = prev.filter((j) => j.status === 'downloading').length;
      const canStartNow = activeCount < downloadConcurrency && !isNetworkOffline;

      const newJob: DownloadJob = {
        id: `job-${Date.now()}-${episode.id}`,
        episodeId: episode.id,
        title: episode.title,
        channelTitle: selectedChannel?.title || 'Just Coffee & Me',
        episodeNumber: episode.episodeNumber,
        date: episode.date,
        artworkKey: episode.artworkKey,
        status: canStartNow ? 'downloading' : 'queued',
        progressPercent: 0,
        downloadedMB: 0,
        totalMB: sizeMB,
        speedMBs: canStartNow ? 1.2 : 0,
        destinationPath: downloadDestination,
      };

      return [newJob, ...prev];
    });

    showDiscreetToast(`Queued "${episode.title}" for download`);
  };

  // Add to listening queue
  const handleAddToQueue = (episode: Episode) => {
    const newItem: QueueItem = {
      id: `queue-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      episodeId: episode.id,
      title: episode.title,
      subtitle: `${selectedChannel?.title || 'Just Coffee & Me'} · ${episode.artist}`,
      artist: episode.artist,
      channelTitle: selectedChannel?.title || 'Just Coffee & Me',
      durationFormatted: episode.durationFormatted,
      durationSeconds: episode.durationSeconds,
      artworkKey: episode.artworkKey,
    };
    setQueue((prev) => [...prev, newItem]);
    showDiscreetToast(`Added "${episode.title}" to listening queue`);
  };

  // Bulk download - Opens Review dialog with frozen snapshot of selected episodes
  const handleDownloadSelected = (episodesToDownload: Episode[]) => {
    if (episodesToDownload.length === 0) {
      showDiscreetToast('No episodes selected to download');
      return;
    }
    setFrozenEpisodesForReview([...episodesToDownload]);
    setIsBulkReviewModalOpen(true);
  };

  const handleConfirmBulkQueue = (config: {
    episodes: Episode[];
    destinationPath: string;
    filenameFormat: string;
    concurrency: number;
    skipDuplicates: boolean;
  }) => {
    setDownloadConcurrency(config.concurrency);
    setDownloadDestination(config.destinationPath);

    setDownloadJobs((prev) => {
      let activeCount = prev.filter((j) => j.status === 'downloading').length;
      const newJobs: DownloadJob[] = [];

      config.episodes.forEach((ep) => {
        // If skip duplicates is enabled and episode is already completed, skip
        if (
          config.skipDuplicates &&
          prev.some((j) => j.episodeId === ep.id && j.status === 'completed')
        ) {
          return;
        }

        const sizeMB = parseFloat(ep.fileSizeFormatted.replace(' MB', '')) || 8.5;
        const canStartNow = activeCount < config.concurrency && !isNetworkOffline;
        if (canStartNow) {
          activeCount++;
        }

        newJobs.push({
          id: `job-${Date.now()}-${ep.id}`,
          episodeId: ep.id,
          title: ep.title,
          channelTitle: selectedChannel?.title || 'Just Coffee & Me',
          episodeNumber: ep.episodeNumber,
          date: ep.date,
          artworkKey: ep.artworkKey,
          status: canStartNow ? 'downloading' : 'queued',
          progressPercent: 0,
          downloadedMB: 0,
          totalMB: sizeMB,
          speedMBs: canStartNow ? 1.2 : 0,
          destinationPath: config.destinationPath,
        });
      });

      return [...newJobs, ...prev];
    });

    setIsBulkReviewModalOpen(false);
    showDiscreetToast(
      `Queued ${config.episodes.length} episodes (${config.concurrency === 1 ? 'sequential' : `${config.concurrency} concurrent`})`
    );
  };

  // Player Handlers
  const handleTogglePlay = () => {
    setPlayback((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleSeek = (newTimeSeconds: number) => {
    setPlayback((prev) => ({ ...prev, currentTime: Math.round(newTimeSeconds) }));
  };

  const handleVolumeChange = (newVolume: number) => {
    setPlayback((prev) => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }));
  };

  const handleToggleMute = () => {
    setPlayback((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const handleSkipSeconds = (delta: number) => {
    setPlayback((prev) => {
      const nextTime = Math.max(0, Math.min(prev.duration, prev.currentTime + delta));
      return { ...prev, currentTime: nextTime };
    });
  };

  const handlePrevTrack = () => {
    setPlayback((prev) => ({ ...prev, currentTime: 0 }));
    showDiscreetToast('Restarted track');
  };

  const handleNextTrack = () => {
    if (queue.length > 0) {
      const [nextItem, ...remaining] = queue;
      setQueue(remaining);
      setPlayback((prev) => ({
        ...prev,
        currentTrackTitle: nextItem.title,
        currentArtist: nextItem.artist || nextItem.subtitle.split('·')[1]?.trim() || 'Beren Olivia',
        currentChannelTitle: nextItem.channelTitle || nextItem.subtitle.split('·')[0]?.trim() || 'Just Coffee & Me',
        artworkKey: nextItem.artworkKey || 'just-coffee',
        currentTime: 0,
        duration: nextItem.durationSeconds || 217,
        isPlaying: true,
      }));
      showDiscreetToast(`Playing from queue: "${nextItem.title}"`);
      return;
    }

    if (selectedChannel?.episodes && selectedChannel.episodes.length > 0) {
      const currentIndex = selectedChannel.episodes.findIndex(
        (ep) => ep.title === playback.currentTrackTitle
      );
      const nextIndex = (currentIndex + 1) % selectedChannel.episodes.length;
      handlePlayEpisode(selectedChannel.episodes[nextIndex]);
    } else {
      const currentIndex = MOCK_CHANNELS.findIndex(
        (c) => c.title === playback.currentChannelTitle
      );
      const nextIndex = (currentIndex + 1) % MOCK_CHANNELS.length;
      const nextChannel = MOCK_CHANNELS[nextIndex];
      if (nextChannel?.sampleTrack) {
        setPlayback((prev) => ({
          ...prev,
          currentTrackTitle: nextChannel.sampleTrack!.title,
          currentArtist: nextChannel.sampleTrack!.artist,
          currentChannelTitle: nextChannel.title,
          artworkKey: nextChannel.artworkKey,
          currentTime: 0,
          duration: nextChannel.sampleTrack!.durationSeconds,
          isPlaying: true,
        }));
        showDiscreetToast(`Next track: ${nextChannel.sampleTrack.title}`);
      }
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--app-bg)] text-[var(--app-text-primary)] transition-colors selection:bg-[var(--app-accent)]/20 selection:text-[var(--app-accent)] font-sans antialiased">
      {/* Top Navigation Bar */}
      <HeaderNav
        activeNavTab={activeNavTab}
        onSelectNavTab={handleSelectNavTab}
        downloadsCount={activeDownloadingCount}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full">
        {isExpandedNowPlaying ? (
          /* Expanded Desktop Now Playing Screen */
          <ExpandedNowPlayingView
            playback={playback}
            trackMetadata={(() => {
              const item = downloadedItems.find(candidate => candidate.title === playback.currentTrackTitle && candidate.channelTitle === playback.currentChannelTitle);
              return item ? { status: 'Downloaded · Playing from device', details: `#${item.episodeNumber} · ${item.completedAt.split(',').slice(0, 2).join(',')}` } : undefined;
            })()}
            queue={queue}
            sleepTimer={sleepTimer}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onToggleMute={handleToggleMute}
            onSkipSeconds={handleSkipSeconds}
            onPrevTrack={handlePrevTrack}
            onNextTrack={handleNextTrack}
            onChangeSpeed={handleChangeSpeed}
            onSetSleepTimer={handleSetSleepTimer}
            onCancelSleepTimer={handleCancelSleepTimer}
            onClose={() => setIsExpandedNowPlaying(false)}
            onNavigateToChannel={(channelTitle) => {
              const ch = MOCK_CHANNELS.find(
                (c) => c.title.toLowerCase() === channelTitle.toLowerCase()
              );
              if (ch) {
                setSelectedChannel(ch);
                setSelectedEpisode(null);
                setIsExpandedNowPlaying(false);
              } else {
                showDiscreetToast(`Channel: ${channelTitle}`);
              }
            }}
            onShowDiscreetToast={showDiscreetToast}
            onOpenListeningQueue={handleOpenListeningQueue}
            onOpenEpisode={() => {
              const channel = MOCK_CHANNELS.find(candidate => candidate.title === playback.currentChannelTitle);
              const episode = channel?.episodes?.find(candidate => candidate.title === playback.currentTrackTitle);
              if (channel && episode) {
                setSelectedChannel(channel);
                setSelectedEpisode(episode);
                setIsExpandedNowPlaying(false);
              }
            }}
            previousViewName={previousViewLabel}
          />
        ) : activeNavTab === 'queue' ? (
          /* Listening Queue Screen */
          <ListeningQueueView
            playback={playback}
            queue={queue}
            previousViewLabel={queueBackLabel}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onPlayNow={handlePlayNowQueueItem}
            onReorderQueue={handleReorderQueue}
            onRemoveItem={handleRemoveQueueItem}
            onRestoreItem={handleRestoreQueueItem}
            onClearUpcoming={handleClearUpcomingQueue}
            onNavigateToFind={() => {
              setActiveNavTab('find');
              setSelectedEpisode(null);
              setSelectedChannel(null);
            }}
            onBack={handleBackFromQueue}
          />
        ) : activeNavTab === 'settings' ? (
          /* Settings View (matching light/dark references) */
          <SettingsView
            initialSettings={settings}
            onSaveSettings={handleSaveSettings}
            onNavigateToTab={(tab) => {
              setActiveNavTab(tab);
              setSelectedEpisode(null);
              setSelectedChannel(null);
            }}
            onShowDiscreetToast={showDiscreetToast}
          />
        ) : activeNavTab === 'downloads' ? (
          /* Downloads View (matching 03-downloads-dark.png and 12-downloads-light.png) */
          <DownloadsView
            jobs={downloadJobs}
            concurrency={downloadConcurrency}
            onChangeConcurrency={handleChangeConcurrency}
            onPauseJob={handlePauseJob}
            onResumeJob={handleResumeJob}
            onCancelJob={handleCancelJob}
            onRetryJob={handleRetryJob}
            onPauseAll={handlePauseAll}
            onResumeAll={handleResumeAll}
            onRemoveCompleted={handleRemoveCompleted}
            destinationPath={downloadDestination}
            onChangeDestination={(path) => {
              setDownloadDestination(path);
              showDiscreetToast(`Download location updated: ${path}`);
            }}
            isNetworkOffline={isNetworkOffline}
            onToggleNetworkOffline={() => {
              setIsNetworkOffline((prev) => {
                const next = !prev;
                showDiscreetToast(next ? 'Simulated offline: Network paused' : 'Simulated online: Network restored');
                return next;
              });
            }}
            onNavigateToFind={() => {
              setActiveNavTab('find');
              setSelectedEpisode(null);
              setSelectedChannel(null);
            }}
            onShowInFolder={(job) => {
              showDiscreetToast(`File location: ${downloadDestination}/${job.title}.mp3`);
            }}
          />
        ) : activeNavTab === 'library' ? (
          /* Library View */
          <LibraryView
            isOffline={isNetworkOffline}
            downloadedItems={downloadedItems}
            savedChannels={savedChannelsList}
            recentlyPlayed={recentlyPlayed}
            playback={playback}
            onPlayDownloadedItem={handlePlayDownloadedItem}
            onPlayChannelLatest={handlePlayChannelLatest}
            onResumeRecentlyPlayed={handleResumeRecentlyPlayed}
            onPlayNext={handlePlayNext}
            onAddToQueue={handleAddToQueueTrack}
            onSelectEpisodeDetails={(ep) => setSelectedEpisode(ep)}
            onSelectChannel={(ch) => {
              setSelectedChannel(ch);
              setSelectedEpisode(null);
            }}
            onRemoveDownload={handleRemoveDownload}
            onShowInFolder={(item) => showDiscreetToast(`File location: ${item.filePath}`)}
            onUnsaveChannel={handleUnsaveChannel}
            onLocateMissingFile={handleLocateMissingFile}
            onReDownloadItem={handleReDownloadItem}
            onClearHistory={() => {
              setRecentlyPlayed([]);
              showDiscreetToast('Cleared listening history');
            }}
            onNavigateToFind={() => {
              setActiveNavTab('find');
              setSelectedEpisode(null);
              setSelectedChannel(null);
            }}
            onShowDiscreetToast={showDiscreetToast}
          />
        ) : selectedEpisode ? (
          /* Episode Details View (matching 16-episode-desktop-light.png & 17-episode-desktop-dark.png) */
          <EpisodeDetailsView
            episode={selectedEpisode}
            channel={selectedChannel || MOCK_CHANNELS[0]}
            isPlayingThisEpisode={playback.currentTrackTitle === selectedEpisode.title && playback.isPlaying}
            onTogglePlayEpisode={handleTogglePlayFromEpisodeView}
            onDownloadEpisode={handleDownloadEpisode}
            onAddToQueue={handleAddToQueue}
            onNavigateToChannel={(channel) => {
              setSelectedEpisode(null);
              setSelectedChannel(channel);
            }}
            onNavigateToFind={() => {
              setSelectedEpisode(null);
              setSelectedChannel(null);
            }}
          />
        ) : selectedChannel ? (
          /* Channel Details View (matching 01-channel-light.png and 10-channel-dark.png) */
          <ChannelDetailsView
            channel={selectedChannel}
            isSaved={savedChannelIds.has(selectedChannel.id)}
            onToggleSave={handleToggleSaveChannel}
            selectedEpisodeIds={selectedEpisodeIds}
            onToggleEpisodeSelect={handleToggleEpisodeSelect}
            onSelectThisPage={handleSelectThisPage}
            onSelectAllEpisodes={handleSelectAllEpisodes}
            onClearSelection={handleClearSelection}
            currentPlayingTrackTitle={playback.currentTrackTitle}
            isPlaying={playback.isPlaying}
            onPlayEpisode={handlePlayEpisode}
            onDownloadEpisode={handleDownloadEpisode}
            onDownloadSelected={handleDownloadSelected}
            onAddToQueue={handleAddToQueue}
            onSelectEpisodeDetails={(ep) => setSelectedEpisode(ep)}
            onBackToFind={() => setSelectedChannel(null)}
          />
        ) : (
          /* Find Search Results View (matching 02-find-light.png and 11-find-dark.png) */
          <div className="max-w-[1320px] mx-auto px-6 pt-9 pb-36">
            {/* Editorial Heading */}
            <div className="mb-6">
              <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--app-text-primary)]">
                Find your next listen
              </h1>
              <p className="text-sm sm:text-base text-[var(--app-text-secondary)] mt-1.5 font-normal">
                Search for a channel or paste a Castbox link.
              </p>
            </div>

            {/* Search Bar Input & Action */}
            <div className="mb-8">
              <SearchBar
                query={searchQuery}
                onChangeQuery={setSearchQuery}
                onSubmitSearch={() => executeSearch()}
                onClearQuery={handleClearQuery}
                isLoading={isLoading}
              />
            </div>

            {/* Channels Section Header */}
            <div className="flex items-baseline gap-2.5 mb-2">
              <h2 className="font-serif text-xl font-bold text-[var(--app-text-primary)]">
                Channels
              </h2>
              <span className="text-xs text-[var(--app-text-secondary)] font-normal">
                {filteredChannels.length} {filteredChannels.length === 1 ? 'result' : 'results'}
              </span>
            </div>

            {/* Results List */}
            {isLoading ? (
              <LoadingState />
            ) : filteredChannels.length > 0 ? (
              <div className="divide-y divide-[var(--app-border)] border-t border-[var(--app-border)]">
                {filteredChannels.map((channel) => (
                  <ChannelCard
                    key={channel.id}
                    channel={channel}
                    onSelectChannel={handleSelectChannel}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                query={searchQuery}
                onResetToDefault={() => {
                  setSearchQuery('coffee');
                  executeSearch('coffee');
                }}
              />
            )}

            {/* Recent Searches Row */}
            <RecentSearches
              searches={recentSearches}
              onSelectSearch={handleSelectRecentSearch}
              onClearAll={handleClearRecentSearches}
            />
          </div>
        )}
      </main>

      {/* Persistent Bottom Audio Player - Hidden when expanded Now Playing screen is open */}
      {!isExpandedNowPlaying && (
        <BottomPlayer
          playback={playback}
          queue={queue}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onToggleMute={handleToggleMute}
          onSkipSeconds={handleSkipSeconds}
          onPrevTrack={handlePrevTrack}
          onNextTrack={handleNextTrack}
          onOpenExpandedPlayer={() => setIsExpandedNowPlaying(true)}
          onOpenQueue={handleOpenListeningQueue}
        />
      )}

      {/* Discreet Toast Notification for Simulated Behaviors */}
      {toastMessage && (
        <div className="fixed bottom-26 right-6 z-50 px-3.5 py-2 bg-[var(--app-input-bg)] border border-[var(--app-border)] rounded-lg text-xs font-medium text-[var(--app-text-primary)] shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--app-accent)]" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Bulk Download Review Modal */}
      <BulkDownloadReviewModal
        isOpen={isBulkReviewModalOpen}
        onClose={() => setIsBulkReviewModalOpen(false)}
        selectedEpisodes={frozenEpisodesForReview}
        channel={selectedChannel || MOCK_CHANNELS[0]}
        onConfirmQueue={handleConfirmBulkQueue}
      />
    </div>
  );
}

export default function App({ nativeSettings }: { nativeSettings?: AppSettings }) {
  return (
    <ThemeProvider>
      <>{nativeSettings && window.castboxDesktop ? <NativeApp initialSettings={nativeSettings} /> : <MainFindApp />}</>
    </ThemeProvider>
  );
}
