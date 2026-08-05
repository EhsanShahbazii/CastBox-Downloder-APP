export type ThemeMode = 'light' | 'dark' | 'system';

export type ArtworkKey =
  | 'unavailable'
  | 'just-coffee'
  | 'almost-episode'
  | 'just-coffee-cup'
  | 'late-night-drive'
  | 'somewhere-somehow'
  | 'little-more-time'
  | 'blue-hour'
  | 'slow-sundays'
  | 'coffee-break'
  | 'morning-brew'
  | 'spanish'
  | 'daily-notes';

export interface Episode {
  source?: 'castbox';
  artworkUrl?: string | null;
  id: string;
  episodeNumber: number;
  title: string;
  artist: string;
  date: string;
  durationSeconds: number;
  durationFormatted: string;
  fileSizeFormatted: string;
  artworkKey: ArtworkKey;
  synopsis?: string;
  extendedDescription?: string;
  isDownloaded?: boolean;
  isSourceUnavailable?: boolean;
}

export interface Channel {
  source?: 'castbox';
  artworkUrl?: string | null;
  episodeCountUnknown?: boolean;
  id: string;
  title: string;
  author: string;
  tagline?: string;
  description: string;
  episodesCount: number;
  artworkKey: ArtworkKey;
  isSaved?: boolean;
  sampleTrack?: {
    title: string;
    artist: string;
    durationSeconds: number;
  };
  episodes?: Episode[];
}

export type PlaybackSpeed = 0.5 | 0.75 | 1 | 1.25 | 1.5 | 1.75 | 2;

export type SleepTimerOption = 'off' | '15' | '30' | '60' | 'end-of-episode';

export interface SleepTimerState {
  option: SleepTimerOption;
  remainingSeconds: number | null;
  active: boolean;
}

export interface QueueItem {
  id: string;
  episodeId?: string;
  title: string;
  subtitle: string;
  artist?: string;
  channelTitle?: string;
  durationFormatted?: string;
  durationSeconds?: number;
  artworkKey?: ArtworkKey;
  artworkUrl?: string | null;
}

export interface PlaybackState {
  currentTrackTitle: string;
  currentArtist: string;
  currentChannelTitle: string;
  artworkKey: ArtworkKey;
  isPlaying: boolean;
  currentTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0 to 1
  isMuted: boolean;
  playbackSpeed: PlaybackSpeed;
  currentArtworkUrl?: string | null;
}

export type DownloadStatus = 'queued' | 'downloading' | 'paused' | 'completed' | 'failed';

export interface DownloadJob {
  source?: 'castbox';
  artworkUrl?: string | null;
  durationMs?: number | null;
  totalUnknown?: boolean;
  needsGrant?: boolean;
  id: string;
  episodeId?: string;
  title: string;
  channelTitle: string;
  episodeNumber?: number;
  date: string;
  artworkKey: ArtworkKey;
  status: DownloadStatus;
  progressPercent: number; // 0 to 100
  downloadedMB: number;
  totalMB: number;
  speedMBs: number;
  completedAt?: string;
  errorMessage?: string;
  destinationPath?: string;
}

export type DownloadFilter = 'all' | 'active' | 'queued' | 'completed' | 'failed';

export type LibraryTab = 'downloaded' | 'saved-channels' | 'recently-played';

export interface DownloadedItem {
  id: string;
  episodeId?: string;
  title: string;
  artworkUrl?: string | null;
  channelTitle: string;
  episodeNumber?: number;
  artist?: string;
  date: string;
  durationFormatted: string;
  durationSeconds: number;
  fileSizeFormatted: string;
  fileSizeBytes?: number;
  filePath: string;
  artworkKey: ArtworkKey;
  completedAt: string;
  isMissingFile?: boolean;
}

export interface RecentlyPlayedItem {
  id: string;
  episodeId?: string;
  title: string;
  artworkUrl?: string | null;
  channelTitle: string;
  artist: string;
  artworkKey: ArtworkKey;
  durationSeconds: number;
  durationFormatted: string;
  playedSeconds: number;
  lastPlayedText: string;
  completed: boolean;
}

export type DuplicateHandling = 'skip' | 'overwrite' | 'rename';

export interface AppSettings {
  downloadConcurrency: number;
  downloadDestination: string;
  groupEpisodesByChannel: boolean;
  duplicateHandling: DuplicateHandling;
  filenamePattern: string;
  defaultPlaybackSpeed: PlaybackSpeed;
  skipForwardSeconds: number;
  skipBackwardSeconds: number;
  autoPlayNextInQueue: boolean;
  continuousPlayback: boolean;
  userToken?: string;
  userTokenSecret?: string;
}
