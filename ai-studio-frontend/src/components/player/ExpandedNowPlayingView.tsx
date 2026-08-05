import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  ChevronDown,
  ArrowLeft,
  Moon,
  Gauge,
  ListMusic,
  Check,
  Clock,
  Sparkles,
  Info,
  X,
  CornerDownRight,
  ChevronRight,
  Ban,
  Flag,
} from 'lucide-react';
import { PlaybackState, PlaybackSpeed, SleepTimerOption, SleepTimerState } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface ExpandedNowPlayingViewProps {
  playback: PlaybackState;
  trackMetadata?: { status: string; details?: string };
  queue?: { title: string; subtitle: string }[];
  sleepTimer: SleepTimerState;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onSkipSeconds: (delta: number) => void;
  skipBackwardSeconds?: number;
  skipForwardSeconds?: number;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onChangeSpeed: (speed: PlaybackSpeed) => void;
  onSetSleepTimer: (option: SleepTimerOption) => void;
  onCancelSleepTimer: () => void;
  onClose: () => void;
  onNavigateToChannel?: (channelTitle: string) => void;
  onShowDiscreetToast: (msg: string) => void;
  onOpenListeningQueue?: () => void;
  onOpenEpisode?: () => void;
  previousViewName?: string;
}

const SPEED_OPTIONS: PlaybackSpeed[] = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const playerToolButton = 'w-[150px] min-w-[150px] h-[66px] inline-flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-xl border border-transparent text-base font-medium text-[var(--app-text-primary)] transition-colors cursor-pointer hover:text-[var(--app-accent)] hover:bg-[var(--app-input-bg)] hover:border-[var(--app-border)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--app-accent)]';

const SLEEP_OPTIONS: { id: SleepTimerOption; label: string; desc?: string }[] = [
  { id: 'off', label: 'Off' },
  { id: '15', label: '15 minutes' },
  { id: '30', label: '30 minutes' },
  { id: '60', label: '60 minutes' },
  { id: 'end-of-episode', label: 'End of episode' },
];

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const ExpandedNowPlayingView: React.FC<ExpandedNowPlayingViewProps> = ({
  playback,
  trackMetadata,
  queue = [],
  sleepTimer,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onSkipSeconds,
  skipBackwardSeconds = 15,
  skipForwardSeconds = 30,
  onPrevTrack,
  onNextTrack,
  onChangeSpeed,
  onSetSleepTimer,
  onCancelSleepTimer,
  onClose,
  onNavigateToChannel,
  onShowDiscreetToast,
  onOpenListeningQueue,
  onOpenEpisode,
  previousViewName = 'Library',
}) => {
  const [isSpeedMenuOpen, setIsSpeedMenuOpen] = useState(false);
  const [isTimerMenuOpen, setIsTimerMenuOpen] = useState(false);
  const [isQueueOpen, setIsQueueOpen] = useState(false);
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);

  const speedMenuRef = useRef<HTMLDivElement>(null);
  const timerMenuRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // Close menus on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (speedMenuRef.current && !speedMenuRef.current.contains(e.target as Node)) {
        setIsSpeedMenuOpen(false);
      }
      if (timerMenuRef.current && !timerMenuRef.current.contains(e.target as Node)) {
        setIsTimerMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          onTogglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          onSkipSeconds(-skipBackwardSeconds);
          break;
        case 'ArrowRight':
          e.preventDefault();
          onSkipSeconds(skipForwardSeconds);
          break;
        case 'ArrowUp':
          e.preventDefault();
          onVolumeChange(Math.min(1, Math.round((playback.volume + 0.05) * 100) / 100));
          break;
        case 'ArrowDown':
          e.preventDefault();
          onVolumeChange(Math.max(0, Math.round((playback.volume - 0.05) * 100) / 100));
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          onToggleMute();
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
        case '?':
          e.preventDefault();
          setShowKeyboardHelp((prev) => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playback.volume, onTogglePlay, onSkipSeconds, skipBackwardSeconds, skipForwardSeconds, onVolumeChange, onToggleMute, onClose]);

  const progressPercent = playback.duration > 0
    ? Math.min(100, Math.max(0, (playback.currentTime / playback.duration) * 100))
    : 0;

  const remainingSeconds = Math.max(0, playback.duration - playback.currentTime);
  const volumePercent = playback.isMuted ? 0 : playback.volume * 100;

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(ratio * playback.duration);
  };

  const handleVolumeClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onVolumeChange(ratio);
  };

  // Sleep timer display string
  const getTimerCountdownText = (): string => {
    if (!sleepTimer.active || sleepTimer.option === 'off') return '';
    if (sleepTimer.option === 'end-of-episode') {
      return `Ends in ${formatTime(remainingSeconds)}`;
    }
    if (sleepTimer.remainingSeconds !== null) {
      return `Pauses in ${formatTime(sleepTimer.remainingSeconds)}`;
    }
    return 'Active';
  };

  return (
    <div className="w-full min-h-[calc(100vh-68px)] flex flex-col py-6 px-4 sm:px-8 max-w-[1487px] mx-auto animate-in fade-in duration-200">
      {/* Top Header / Bar */}
      <div className="flex items-center justify-between min-h-[54px] pb-3">
        {/* Back / Minimize button */}
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer group"
          title="Minimize player and return"
          aria-label="Minimize Now Playing"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to browsing</span>
        </button>
      </div>

      {/* Main Content: Responsive Layout */}
      <div className="py-3 lg:py-3">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-between gap-8 lg:gap-8 xl:gap-[60px] max-w-[1375px] mx-auto">
          {/* Left Column: Large Hero Artwork with subtle ambient shadow */}
          <div className="relative group shrink-0">
            <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[420px] lg:h-[420px] xl:w-[635px] xl:h-[610px] rounded-3xl overflow-hidden shadow-2xl border border-[var(--app-border)]/70 bg-black/5 dark:bg-white/5 transition-transform duration-300">
              <ArtworkImage live={Boolean(playback.currentArtworkUrl)} artworkUrl={playback.currentArtworkUrl} artworkKey={playback.artworkKey} alt={playback.currentTrackTitle} />
            </div>

            {/* Subtle Playing Status Badge */}
            <div className="absolute bottom-4 left-4 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium flex items-center gap-2 shadow-md">
              <span className={`w-2 h-2 rounded-full ${playback.isPlaying ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`} />
              <span>{trackMetadata ? 'Downloaded Audio' : playback.isPlaying ? 'Streaming Audio' : 'Paused'}</span>
            </div>
          </div>

          {/* Right Column: Track Details, Timeline, Transport, Secondary Controls */}
          <div className="flex-1 w-full max-w-[680px] flex flex-col justify-center pt-0 lg:pt-1">
            {/* Title & Channel Header */}
            <div className="text-center lg:text-left">
              <span className="text-sm font-semibold uppercase tracking-wider text-[var(--app-text-secondary)]">
                Now Playing
              </span>

              <h1 className="font-serif font-bold text-3xl sm:text-4xl lg:text-5xl xl:text-[64px] text-[var(--app-text-primary)] tracking-tight leading-tight mt-1.5">
                {playback.currentTrackTitle}
              </h1>

              <div className="mt-1 text-3xl xl:text-4xl font-serif font-bold text-[var(--app-text-primary)]">
                <span>{playback.currentArtist}</span>
              </div>
              {onNavigateToChannel && <button type="button" onClick={() => onNavigateToChannel(playback.currentChannelTitle)} className="mt-1 inline-flex items-center gap-1.5 text-xl xl:text-2xl text-[var(--app-accent)] hover:underline cursor-pointer"><span>{playback.currentChannelTitle}</span><ChevronRight className="w-5 h-5" /></button>}
            </div>

            {trackMetadata && (
              <div className="mt-8 min-h-10 space-y-1 text-sm text-[var(--app-text-secondary)]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[var(--app-accent)]" />
                  <span>{trackMetadata.status}</span>
                </div>
                {trackMetadata.details && <div className="pl-6 text-xs">{trackMetadata.details}</div>}
              </div>
            )}

            {/* Timeline Progress Scrubber */}
            <div className={trackMetadata ? 'mt-12' : 'mt-8'}>
              <div
                ref={timelineRef}
                onClick={handleTimelineClick}
                className="relative w-full h-5 flex items-center cursor-pointer group"
                role="slider"
                aria-valuenow={playback.currentTime}
                aria-valuemin={0}
                aria-valuemax={playback.duration}
                aria-label="Seek timeline"
              >
                {/* Background Rail */}
                <div className="w-full h-1.5 group-hover:h-2 bg-[var(--app-rail)] rounded-full overflow-hidden transition-all">
                  <div
                    className="h-full bg-[var(--app-accent)] rounded-full transition-[width] duration-75"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                {/* Scrubber Knob */}
                <div
                  className="absolute w-4 h-4 rounded-full bg-[var(--app-accent)] shadow-md -ml-2 transition-transform scale-90 group-hover:scale-125 border-2 border-white dark:border-[#1B1613]"
                  style={{ left: `${progressPercent}%` }}
                />
              </div>

              {/* Time Indicators */}
              <div className="flex items-center justify-between text-base font-mono text-[var(--app-text-secondary)] mt-1 select-none tabular-nums">
                <span>{formatTime(playback.currentTime)}</span>
                <span>{formatTime(playback.duration)}</span>
              </div>
            </div>

            {/* Standardized Primary Transport Controls (NO shuffle/repeat) */}
            <div className="flex items-center justify-center gap-6 sm:gap-10 xl:gap-14 mt-4">
              {/* Previous Track */}
              <button
                type="button"
                onClick={onPrevTrack}
                className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all p-2.5 rounded-2xl cursor-pointer flex items-center justify-center"
                title="Previous episode"
                aria-label="Previous episode"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                  <rect x="3" y="4.5" width="2.8" height="15" rx="0.8" />
                  <polygon points="20.5,4.5 8.5,12 20.5,19.5" />
                </svg>
              </button>

              {/* Back 15 Seconds */}
              <button
                type="button"
                onClick={() => onSkipSeconds(-skipBackwardSeconds)}
                className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all p-2.5 rounded-2xl cursor-pointer flex items-center justify-center"
                title={`Rewind ${skipBackwardSeconds} seconds`}
                aria-label={`Rewind ${skipBackwardSeconds} seconds`}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-[1.9]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 13a9 9 0 1 0 2.6-6.4L2 10" />
                  <polyline points="2 4 2 10 8 10" />
                  <text x="12" y="15" fontSize="7" fill="currentColor" stroke="none" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">{skipBackwardSeconds}</text>
                </svg>
              </button>

              {/* Main Play / Pause Circular Button */}
              <button
                type="button"
                onClick={onTogglePlay}
                className="w-[76px] h-[76px] xl:w-[100px] xl:h-[100px] rounded-full bg-[var(--app-accent)] hover:bg-[#A94516] active:scale-95 text-white flex items-center justify-center shadow-lg hover:shadow-xl transition-all cursor-pointer shrink-0"
                title={playback.isPlaying ? 'Pause' : 'Play'}
                aria-label={playback.isPlaying ? 'Pause' : 'Play'}
              >
                {playback.isPlaying ? (
                  <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white" aria-hidden="true">
                    <rect x="5.5" y="4" width="4" height="16" rx="1.5" fill="white" />
                    <rect x="14.5" y="4" width="4" height="16" rx="1.5" fill="white" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white ml-0.5" aria-hidden="true">
                    <polygon points="6,4 20,12 6,20" fill="white" />
                  </svg>
                )}
              </button>

              {/* Forward 30 Seconds */}
              <button
                type="button"
                onClick={() => onSkipSeconds(skipForwardSeconds)}
                className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all p-2.5 rounded-2xl cursor-pointer flex items-center justify-center"
                title={`Forward ${skipForwardSeconds} seconds`}
                aria-label={`Forward ${skipForwardSeconds} seconds`}
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-none stroke-current stroke-[1.9]" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.5 13a9 9 0 1 1-2.6-6.4L22 10" />
                  <polyline points="22 4 22 10 16 10" />
                  <text x="12" y="15" fontSize="7" fill="currentColor" stroke="none" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">{skipForwardSeconds}</text>
                </svg>
              </button>

              {/* Next Track */}
              <button
                type="button"
                onClick={onNextTrack}
                className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] hover:bg-black/5 dark:hover:bg-white/5 active:scale-95 transition-all p-2.5 rounded-2xl cursor-pointer flex items-center justify-center"
                title="Next episode"
                aria-label="Next episode"
              >
                <svg viewBox="0 0 24 24" className="w-8 h-8 fill-current">
                  <polygon points="3.5,4.5 15.5,12 3.5,19.5" />
                  <rect x="18.2" y="4.5" width="2.8" height="15" rx="0.8" />
                </svg>
              </button>
            </div>

            {/* Volume control remains separate from playback actions for clear scanning. */}
            <div className="flex items-center gap-3 mt-4" aria-label="Volume controls">
              <button
                type="button"
                onClick={onToggleMute}
                className="p-1.5 rounded-lg text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                title={playback.isMuted ? 'Unmute' : 'Mute'}
                aria-label={playback.isMuted ? 'Unmute' : 'Mute'}
              >
                {playback.isMuted || playback.volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </button>
              <div
                onClick={handleVolumeClick}
                className="relative flex-1 h-4 flex items-center cursor-pointer group"
                role="slider"
                aria-valuenow={Math.round(playback.volume * 100)}
                aria-label="Volume level"
              >
                <div className="w-full h-1.5 bg-[var(--app-rail)] rounded-full overflow-hidden">
                  <div className="h-full bg-[var(--app-accent)] rounded-full" style={{ width: `${volumePercent}%` }} />
                </div>
                <div className="absolute w-4 h-4 rounded-full bg-[var(--app-accent)] shadow-sm -ml-2" style={{ left: `${volumePercent}%` }} />
              </div>
            </div>

            {/* Secondary Toolbar: Speeds, Sleep Timer, Volume, Queue */}
            <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-[var(--app-border)]/60 flex-wrap sm:flex-nowrap">
              {/* Left Secondary: Speed Selector & Sleep Timer Menu */}
              <div className="flex items-center gap-2">
                {/* Speed Dropdown Menu */}
                <div className="relative" ref={speedMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSpeedMenuOpen(!isSpeedMenuOpen);
                      setIsTimerMenuOpen(false);
                    }}
                    className={`${playerToolButton} ${
                      playback.playbackSpeed !== 1
                        ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                        : ''
                    }`}
                    title="Playback speed"
                    aria-expanded={isSpeedMenuOpen}
                    aria-haspopup="menu"
                  >
                    <Gauge className="w-7 h-7" />
                    <span>Speed</span>
                    <span className="text-[var(--app-text-muted)]">{playback.playbackSpeed}×</span>
                  </button>

                  {/* Speed Popover Menu */}
                  {isSpeedMenuOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-11 w-44 p-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)] border-b border-[var(--app-border)]/50 mb-1">
                        Playback Speed
                      </div>
                      <div className="space-y-0.5">
                        {SPEED_OPTIONS.map((spd) => {
                          const isSelected = playback.playbackSpeed === spd;
                          return (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => {
                                onChangeSpeed(spd);
                                setIsSpeedMenuOpen(false);
                                onShowDiscreetToast(`Playback speed set to ${spd}×`);
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--app-accent)] text-white font-semibold'
                                  : 'text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span>{spd}×</span>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Sleep Timer Menu */}
                <div className="relative" ref={timerMenuRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setIsTimerMenuOpen(!isTimerMenuOpen);
                      setIsSpeedMenuOpen(false);
                    }}
                    className={`${playerToolButton} ${
                      sleepTimer.active && sleepTimer.option !== 'off'
                        ? 'bg-[var(--app-accent)]/10 text-[var(--app-accent)]'
                        : ''
                    }`}
                    title="Sleep timer options"
                    aria-expanded={isTimerMenuOpen}
                    aria-haspopup="menu"
                  >
                    <Moon className="w-7 h-7 text-[var(--app-accent)]" />
                    <span>Sleep Timer</span>
                    {sleepTimer.active && sleepTimer.option !== 'off' && <span className="text-[var(--app-text-muted)]">{sleepTimer.option === 'end-of-episode' ? 'End of episode' : `${Math.ceil((sleepTimer.remainingSeconds || 0) / 60)} min left`}</span>}
                  </button>

                  {/* Sleep Timer Popover Menu */}
                  {isTimerMenuOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full mt-1 w-60 p-2 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-top-2 duration-150"
                    >
                      <div className="px-2 py-1 flex items-center justify-between border-b border-[var(--app-border)]/50 pb-2 mb-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
                          Sleep Timer
                        </span>
                        {sleepTimer.active && (
                          <span className="text-[10px] font-mono text-[var(--app-accent)] font-semibold">
                            {getTimerCountdownText()}
                          </span>
                        )}
                      </div>

                      {/* Options List */}
                      <div className="space-y-0.5">
                        {SLEEP_OPTIONS.map((opt) => {
                          const isSelected = sleepTimer.option === opt.id;
                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => {
                                onSetSleepTimer(opt.id);
                                setIsTimerMenuOpen(false);
                                onShowDiscreetToast(
                                  opt.id === 'off'
                                    ? 'Sleep timer turned off'
                                    : opt.id === 'end-of-episode'
                                    ? 'Sleep timer set to end of episode'
                                    : `Sleep timer set for ${opt.label}`
                                );
                              }}
                              className={`w-full px-3 py-2 rounded-lg text-sm flex items-center justify-between font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[var(--app-accent)]/10 text-[var(--app-text-primary)] font-semibold'
                                  : 'text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                              }`}
                            >
                              <span className="flex items-center gap-2.5">
                                {opt.id === 'off' ? <Ban className={`w-4 h-4 ${isSelected ? 'text-[var(--app-accent)]' : 'text-[var(--app-text-secondary)]'}`} /> : opt.id === 'end-of-episode' ? <Flag className="w-4 h-4 text-[var(--app-text-secondary)]" /> : <Clock className="w-4 h-4 text-[var(--app-text-secondary)]" />}
                                {opt.label}
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[2.5] text-[var(--app-accent)]" />}
                            </button>
                          );
                        })}
                      </div>

                      {/* Cancel Button if running */}
                      {sleepTimer.active && sleepTimer.option !== 'off' && (
                        <div className="mt-2 pt-2 border-t border-[var(--app-border)]/50">
                          <button
                            type="button"
                            onClick={() => {
                              onCancelSleepTimer();
                              setIsTimerMenuOpen(false);
                              onShowDiscreetToast('Sleep timer cancelled');
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer text-center"
                          >
                            Cancel Sleep Timer
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Full queue and episode details remain one click away. */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => onOpenListeningQueue ? onOpenListeningQueue() : setIsQueueOpen(!isQueueOpen)}
                  className={playerToolButton}
                  title="Open listening queue"
                  aria-label="Open listening queue"
                >
                  <ListMusic className="w-7 h-7" />
                  <span>Listening queue</span>
                </button>
                {onOpenEpisode && <button type="button" onClick={onOpenEpisode} className={playerToolButton}><Info className="w-7 h-7" /><span>Episode details</span></button>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible Up Next / Queue Drawer Bottom Section */}
      {isQueueOpen && (
        <div className="w-full max-w-4xl mx-auto mt-4 p-4 border border-[var(--app-border)] rounded-2xl bg-[var(--app-card-bg,var(--app-bg))] shadow-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
            <div className="flex items-center gap-2">
              <ListMusic className="w-4 h-4 text-[var(--app-accent)]" />
              <h3 className="font-semibold text-sm text-[var(--app-text-primary)]">
                Up Next Queue
              </h3>
              <span className="text-xs text-[var(--app-text-secondary)] font-mono">
                ({1 + queue.length} items)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {onOpenListeningQueue && (
                <button
                  type="button"
                  onClick={onOpenListeningQueue}
                  className="text-xs text-[var(--app-accent)] hover:underline font-medium px-2 py-0.5 rounded cursor-pointer"
                >
                  Full queue screen →
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsQueueOpen(false)}
                className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="divide-y divide-[var(--app-border)]/60 max-h-56 overflow-y-auto mt-2">
            {/* Currently Playing Track */}
            <div className="py-2 px-2 flex items-center justify-between bg-[var(--app-accent)]/10 rounded-xl text-xs">
              <div className="flex items-center gap-2.5 truncate">
                <span className="w-2 h-2 rounded-full bg-[var(--app-accent)] shrink-0 animate-ping" />
                <div className="truncate">
                  <div className="font-semibold text-[var(--app-text-primary)] truncate">
                    {playback.currentTrackTitle}
                  </div>
                  <div className="text-[11px] text-[var(--app-text-secondary)] truncate">
                    {playback.currentArtist} · {playback.currentChannelTitle}
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-[var(--app-accent)] text-white text-[10px] font-bold shrink-0">
                Playing Now
              </span>
            </div>

            {/* Queued tracks */}
            {queue.map((item, idx) => (
              <div key={idx} className="py-2 px-2 flex items-center justify-between text-xs hover:bg-black/5 dark:hover:bg-white/5 rounded-xl transition-colors">
                <div className="flex items-center gap-2.5 truncate">
                  <span className="text-[var(--app-text-muted)] font-mono text-[11px] w-4">{idx + 1}</span>
                  <div className="truncate">
                    <div className="font-medium text-[var(--app-text-primary)] truncate">
                      {item.title}
                    </div>
                    <div className="text-[11px] text-[var(--app-text-secondary)] truncate">
                      {item.subtitle}
                    </div>
                  </div>
                </div>
                <CornerDownRight className="w-3.5 h-3.5 text-[var(--app-text-muted)] shrink-0" />
              </div>
            ))}

            {queue.length === 0 && (
              <div className="py-4 text-center text-xs text-[var(--app-text-muted)] italic">
                Queue is empty. Use &ldquo;Play Next&rdquo; on any episode in Library or Channel to add tracks here.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Overlay Modal */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--app-border)]">
              <h3 className="font-serif font-bold text-lg text-[var(--app-text-primary)]">
                Keyboard Controls
              </h3>
              <button
                type="button"
                onClick={() => setShowKeyboardHelp(false)}
                className="p-1 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 py-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[var(--app-text-secondary)]">Play / Pause</span>
                <kbd className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 font-mono font-bold">Space</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--app-text-secondary)]">Rewind {skipBackwardSeconds} seconds</span>
                <kbd className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 font-mono font-bold">←</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--app-text-secondary)]">Forward {skipForwardSeconds} seconds</span>
                <kbd className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 font-mono font-bold">→</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--app-text-secondary)]">Volume Up / Down</span>
                <kbd className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 font-mono font-bold">↑ / ↓</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--app-text-secondary)]">Mute / Unmute</span>
                <kbd className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 font-mono font-bold">M</kbd>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[var(--app-text-secondary)]">Minimize Player</span>
                <kbd className="px-2 py-1 rounded bg-black/5 dark:bg-white/10 font-mono font-bold">Esc</kbd>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowKeyboardHelp(false)}
              className="w-full mt-2 py-2 rounded-xl bg-[var(--app-accent)] text-white text-xs font-semibold cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
