import React, { useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  ListMusic,
  Check,
  Maximize2,
} from 'lucide-react';
import { PlaybackState } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface BottomPlayerProps {
  idle?: boolean;
  playback: PlaybackState;
  queue?: { title: string; subtitle: string; artworkKey?: any }[];
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onSkipSeconds: (delta: number) => void;
  skipBackwardSeconds?: number;
  skipForwardSeconds?: number;
  onPrevTrack: () => void;
  onNextTrack: () => void;
  onOpenExpandedPlayer?: () => void;
  onOpenQueue?: () => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const BottomPlayer: React.FC<BottomPlayerProps> = ({
  playback, idle = false,
  queue = [],
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onSkipSeconds,
  skipBackwardSeconds = 15,
  skipForwardSeconds = 30,
  onPrevTrack,
  onNextTrack,
  onOpenExpandedPlayer,
  onOpenQueue,
}) => {
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const progressPercent = playback.duration > 0
    ? Math.min(100, Math.max(0, (playback.currentTime / playback.duration) * 100))
    : 0;

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

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--app-bg)] border-t border-[var(--app-border)] select-none transition-colors">
      <div className="max-w-[1400px] mx-auto px-6 h-[88px] sm:h-[92px] flex items-center justify-between gap-4">
        {/* Left Zone: Now Playing Info (Thumbnail, Track, Channel) - Clickable to open expanded screen */}
        <div
          onClick={onOpenExpandedPlayer}
          className="flex items-center gap-3.5 min-w-0 w-1/4 cursor-pointer group rounded-xl p-1.5 -ml-1.5 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-all"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpenExpandedPlayer?.();
            }
          }}
          title="Click artwork or title to expand Now Playing screen"
          aria-label={`Now playing: ${playback.currentTrackTitle}. Click to expand player.`}
        >
          <div className="relative w-[52px] h-[52px] sm:w-[56px] sm:h-[56px] rounded-lg overflow-hidden shrink-0 shadow-xs border border-[var(--app-border)]/50 group-hover:ring-2 group-hover:ring-[var(--app-accent)] transition-all">
            <ArtworkImage live={Boolean(playback.currentArtworkUrl)} artworkUrl={playback.currentArtworkUrl} artworkKey={playback.artworkKey} alt={playback.currentTrackTitle} />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-4 h-4 text-white drop-shadow-sm" />
            </div>
          </div>
          <div className="min-w-0 pr-2">
            <div className="text-sm font-semibold text-[var(--app-text-primary)] group-hover:text-[var(--app-accent)] transition-colors truncate leading-tight">
              {playback.currentTrackTitle}
            </div>
            <div className="text-xs text-[var(--app-text-secondary)] truncate mt-1">
              {playback.currentChannelTitle}
            </div>
          </div>
        </div>

        {/* Center Zone: Playback Controls & Progress Scrubber */}
        <div className="flex-1 max-w-xl flex flex-col items-center justify-center">
          {/* Controls Row */}
          <div className="flex items-center gap-6 sm:gap-7 mb-2">
            {/* Rewind 15s */}
            <button
              onClick={() => onSkipSeconds(-skipBackwardSeconds)}
              className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] transition-colors p-1 cursor-pointer flex items-center justify-center"
              title={`Rewind ${skipBackwardSeconds} seconds`}
              aria-label={`Rewind ${skipBackwardSeconds} seconds`}
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-none stroke-current stroke-[1.9]" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 13a9 9 0 1 0 2.6-6.4L2 10" />
                <polyline points="2 4 2 10 8 10" />
                <text x="12" y="15" fontSize="7" fill="currentColor" stroke="none" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">{skipBackwardSeconds}</text>
              </svg>
            </button>

            {/* Previous Track */}
            <button
              onClick={onPrevTrack}
              className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] transition-colors p-1 cursor-pointer flex items-center justify-center"
              title="Previous track"
              aria-label="Previous track"
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-current">
                <rect x="3" y="4.5" width="2.8" height="15" rx="0.8" />
                <polygon points="20.5,4.5 8.5,12 20.5,19.5" />
              </svg>
            </button>

            {/* Play / Pause Circular Button */}
            <button
              onClick={onTogglePlay}
              className="w-12 h-12 rounded-full bg-[var(--app-accent)] hover:bg-[#A94516] active:scale-95 text-white flex items-center justify-center shadow-md transition-all cursor-pointer shrink-0"
              title={playback.isPlaying ? 'Pause' : 'Play'}
              aria-label={playback.isPlaying ? 'Pause' : 'Play'}
            >
              {playback.isPlaying ? (
                <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-white" aria-hidden="true">
                  <rect x="5.5" y="4" width="3.8" height="16" rx="1.5" fill="white" />
                  <rect x="14.7" y="4" width="3.8" height="16" rx="1.5" fill="white" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-white ml-0.5" aria-hidden="true">
                  <polygon points="6,4 20,12 6,20" fill="white" />
                </svg>
              )}
            </button>

            {/* Next Track */}
            <button
              onClick={onNextTrack}
              className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] transition-colors p-1 cursor-pointer flex items-center justify-center"
              title="Next track"
              aria-label="Next track"
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-current">
                <polygon points="3.5,4.5 15.5,12 3.5,19.5" />
                <rect x="18.2" y="4.5" width="2.8" height="15" rx="0.8" />
              </svg>
            </button>

            {/* Forward 30s */}
            <button
              onClick={() => onSkipSeconds(skipForwardSeconds)}
              className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] transition-colors p-1 cursor-pointer flex items-center justify-center"
              title={`Forward ${skipForwardSeconds} seconds`}
              aria-label={`Forward ${skipForwardSeconds} seconds`}
            >
              <svg viewBox="0 0 24 24" className="w-5.5 h-5.5 fill-none stroke-current stroke-[1.9]" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.5 13a9 9 0 1 1-2.6-6.4L22 10" />
                <polyline points="22 4 22 10 16 10" />
                <text x="12" y="15" fontSize="7" fill="currentColor" stroke="none" fontWeight="700" textAnchor="middle" fontFamily="sans-serif">{skipForwardSeconds}</text>
              </svg>
            </button>
          </div>

          {/* Progress Timeline Row */}
          <div className="w-full flex items-center gap-3">
            <span className="text-xs text-[var(--app-text-secondary)] font-mono tabular-nums w-8 text-right select-none">
              {formatTime(playback.currentTime)}
            </span>

            {/* Interactive Timeline Track */}
            <div
              onClick={handleTimelineClick}
              className="relative flex-1 h-3 flex items-center cursor-pointer group"
              role="slider"
              aria-valuenow={playback.currentTime}
              aria-valuemin={0}
              aria-valuemax={playback.duration}
              aria-label="Playback scrubber"
            >
              <div className="w-full h-1 bg-[var(--app-rail)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--app-accent)] rounded-full transition-[width] duration-75"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Scrubber Knob */}
              <div
                className="absolute w-3 h-3 rounded-full bg-[var(--app-accent)] shadow-sm -ml-1.5 transition-transform group-hover:scale-125"
                style={{ left: `${progressPercent}%` }}
              />
            </div>

            <span className="text-xs text-[var(--app-text-secondary)] font-mono tabular-nums w-8 text-left select-none">
              {formatTime(playback.duration)}
            </span>
          </div>
        </div>

        {/* Right Zone: Volume & Queue */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          {/* Mute / Unmute Button */}
          <button
            onClick={onToggleMute}
            className="text-[var(--app-text-primary)] hover:text-[var(--app-accent)] transition-colors p-1 cursor-pointer"
            title={playback.isMuted ? 'Unmute' : 'Mute'}
            aria-label={playback.isMuted ? 'Unmute' : 'Mute'}
          >
            {playback.isMuted || playback.volume === 0 ? (
              <VolumeX className="w-5 h-5 stroke-[1.8]" />
            ) : (
              <Volume2 className="w-5 h-5 stroke-[1.8]" />
            )}
          </button>

          {/* Volume Slider */}
          <div
            onClick={handleVolumeClick}
            className="relative w-28 h-3 flex items-center cursor-pointer group"
            role="slider"
            aria-valuenow={Math.round(playback.volume * 100)}
            aria-label="Volume level"
          >
            <div className="w-full h-1 bg-[var(--app-rail)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[var(--app-accent)] rounded-full"
                style={{ width: `${volumePercent}%` }}
              />
            </div>
            <div
              className="absolute w-3 h-3 rounded-full bg-[var(--app-accent)] shadow-sm -ml-1.5 transition-transform group-hover:scale-125"
              style={{ left: `${volumePercent}%` }}
            />
          </div>

          {/* Queue / Playlist Drawer Button */}
          <div className="relative">
            <button
              onClick={() => {
                if (onOpenQueue) {
                  onOpenQueue();
                } else {
                  setIsQueueOpen(!isQueueOpen);
                }
              }}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ml-1 ${
                isQueueOpen
                  ? 'text-[var(--app-accent)] bg-black/5 dark:bg-white/5'
                  : 'text-[var(--app-text-primary)] hover:text-[var(--app-accent)]'
              }`}
              title="Listening Queue"
              aria-label="Open listening queue"
              aria-expanded={isQueueOpen}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-current stroke-[2]" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <circle cx="3.5" cy="6" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="3.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="3.5" cy="18" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>

            {/* Queue Popover */}
            {isQueueOpen && (
              <div className="absolute right-0 bottom-12 w-72 p-3 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-[var(--app-border)]">
                  <span className="text-xs font-semibold text-[var(--app-text-primary)]">
                    Now Playing Queue
                  </span>
                  <span className="text-[11px] text-[var(--app-text-secondary)]">
                    {1 + queue.length} items
                  </span>
                </div>
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  <div className="flex items-center gap-2 p-1.5 rounded-lg bg-[var(--app-accent)]/10 text-xs">
                    <Check className="w-3.5 h-3.5 text-[var(--app-accent)] shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-[var(--app-text-primary)] truncate">
                        {playback.currentTrackTitle}
                      </div>
                      <div className="text-[11px] text-[var(--app-text-secondary)]">
                        {playback.currentChannelTitle}
                      </div>
                    </div>
                  </div>
                  {queue.map((item, idx) => (
                    <div key={idx} className="p-1.5 rounded-lg text-xs opacity-80 hover:opacity-100 transition-opacity">
                      <div className="font-medium text-[var(--app-text-primary)] truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] text-[var(--app-text-secondary)]">
                        {item.subtitle}
                      </div>
                    </div>
                  ))}
                  {queue.length === 0 && (
                    <div className="p-1.5 rounded-lg text-xs opacity-60 italic text-[var(--app-text-muted)]">
                      Queue empty. Click &ldquo;Add to listening queue&rdquo; on an episode.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};
