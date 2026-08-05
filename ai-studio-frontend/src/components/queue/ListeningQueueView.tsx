import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  GripVertical,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  ArrowUpToLine,
  Trash2,
  ArrowLeft,
  RotateCcw,
  ListMusic,
  Compass,
  AlertTriangle,
  X,
  Volume2,
} from 'lucide-react';
import { PlaybackState, QueueItem } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface ListeningQueueViewProps {
  playback: PlaybackState;
  queue: QueueItem[];
  previousViewLabel?: string;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onPlayNow: (item: QueueItem) => void;
  onReorderQueue: (newQueue: QueueItem[]) => void;
  onRemoveItem: (id: string) => void;
  onRestoreItem: (item: QueueItem, index: number) => void;
  onClearUpcoming: () => void;
  onNavigateToFind: () => void;
  onBack: () => void;
}

export const ListeningQueueView: React.FC<ListeningQueueViewProps> = ({
  playback,
  queue,
  previousViewLabel = 'player',
  onTogglePlay,
  onSeek,
  onPlayNow,
  onReorderQueue,
  onRemoveItem,
  onRestoreItem,
  onClearUpcoming,
  onNavigateToFind,
  onBack,
}) => {
  // Interactive open menu state (storing active row id)
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Clear confirmation modal state
  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Undo removal notification state
  const [undoItem, setUndoItem] = useState<{
    item: QueueItem;
    index: number;
    timeoutId: NodeJS.Timeout;
  } | null>(null);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Close interactive dropdown on outside click or Escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(event.target as Node)
      ) {
        setActiveMenuId(null);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (isConfirmClearOpen) {
          setIsConfirmClearOpen(false);
        } else if (activeMenuId !== null) {
          setActiveMenuId(null);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeMenuId, isConfirmClearOpen]);

  // Format seconds into m:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Calculate total upcoming queue duration in minutes
  const totalUpcomingSeconds = queue.reduce(
    (acc, item) => acc + (item.durationSeconds || 210),
    0
  );
  const totalUpcomingMinutes = Math.ceil(totalUpcomingSeconds / 60);

  // Handle reorder menu actions: Move Up, Move Down, Move to Top
  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...queue];
    const [moved] = updated.splice(index, 1);
    updated.splice(index - 1, 0, moved);
    onReorderQueue(updated);
    setActiveMenuId(null);
  };

  const handleMoveDown = (index: number) => {
    if (index >= queue.length - 1) return;
    const updated = [...queue];
    const [moved] = updated.splice(index, 1);
    updated.splice(index + 1, 0, moved);
    onReorderQueue(updated);
    setActiveMenuId(null);
  };

  const handleMoveToTop = (index: number) => {
    if (index <= 0) return;
    const updated = [...queue];
    const [moved] = updated.splice(index, 1);
    updated.unshift(moved);
    onReorderQueue(updated);
    setActiveMenuId(null);
  };

  // Handle item removal with undo banner
  const handleRemoveWithUndo = (item: QueueItem, index: number) => {
    // Clear previous undo timeout if one was already active
    if (undoItem) {
      clearTimeout(undoItem.timeoutId);
    }

    onRemoveItem(item.id);
    setActiveMenuId(null);

    const timeoutId = setTimeout(() => {
      setUndoItem(null);
    }, 6000);

    setUndoItem({
      item,
      index,
      timeoutId,
    });
  };

  const handleExecuteUndo = () => {
    if (!undoItem) return;
    clearTimeout(undoItem.timeoutId);
    onRestoreItem(undoItem.item, undoItem.index);
    setUndoItem(null);
  };

  const handleDismissUndo = () => {
    if (undoItem) {
      clearTimeout(undoItem.timeoutId);
      setUndoItem(null);
    }
  };

  // Drag and Drop reordering handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverIndex !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    // leave callback
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...queue];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    onReorderQueue(updated);
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Timeline scrubber click
  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(Math.round(ratio * playback.duration));
  };

  const progressPercent = playback.duration > 0
    ? Math.min(100, Math.max(0, (playback.currentTime / playback.duration) * 100))
    : 0;

  return (
    <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-36">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors p-1.5 -ml-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
            title={`Back to ${previousViewLabel}`}
            aria-label={`Back to ${previousViewLabel}`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to {previousViewLabel === 'player' ? 'player' : previousViewLabel}</span>
          </button>
        </div>

        {queue.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsConfirmClearOpen(true)}
              className="text-sm font-medium text-[var(--app-accent)] hover:text-red-500 transition-colors px-3 py-1.5 cursor-pointer"
              title="Clear all upcoming episodes"
            >
              Clear queue
            </button>
          </div>
        )}
      </div>

      {/* Screen Title & Subtitle */}
      <div className="mb-5">
        <h1 className="text-4xl sm:text-[48px] font-serif font-bold text-[var(--app-text-primary)] tracking-tight">
          Listening Queue
        </h1>
      </div>

      {/* CURRENTLY PLAYING SECTION */}
      <section className="mb-8" aria-label="Currently Playing">
        <div className="bg-[var(--app-card-bg)] rounded-xl px-5 py-3 border border-[var(--app-border)]/50 transition-colors">
          <div className="flex items-center gap-5">
            {/* Artwork + Title info */}
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="w-[104px] h-[104px] rounded-lg overflow-hidden shrink-0 shadow-sm border border-[var(--app-border)]/50">
                <ArtworkImage
                  live={Boolean(playback.currentArtworkUrl)}
                  artworkUrl={playback.currentArtworkUrl}
                  artworkKey={playback.artworkKey}
                  alt={playback.currentTrackTitle}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-xl font-semibold text-[var(--app-text-primary)] truncate leading-snug">
                  {playback.currentTrackTitle}
                </h3>
                <div className="text-sm text-[var(--app-text-secondary)] mt-1 truncate">
                  {playback.currentChannelTitle}<span className="mx-2 opacity-50">·</span>{playback.currentArtist}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-1 min-w-0">
              <span className="text-sm font-mono text-[var(--app-text-secondary)]">{formatTime(playback.currentTime)}</span>
              <div
                onClick={handleTimelineClick}
                className="relative flex-1 h-3 flex items-center cursor-pointer group"
                role="slider"
                aria-valuenow={playback.currentTime}
                aria-valuemin={0}
                aria-valuemax={playback.duration}
                aria-label="Seek time"
              >
                <div className="w-full h-1.5 bg-[var(--app-rail)] rounded-full overflow-hidden"><div className="h-full bg-[var(--app-accent)] rounded-full" style={{ width: `${progressPercent}%` }} /></div>
                <div className="absolute w-3.5 h-3.5 rounded-full bg-[var(--app-accent)] shadow-sm -ml-1.5" style={{ left: `${progressPercent}%` }} />
              </div>
              <span className="text-sm font-mono text-[var(--app-text-secondary)]">{formatTime(playback.duration)}</span>
              <button
                onClick={onTogglePlay}
                className="w-16 h-16 rounded-full bg-[var(--app-accent)] text-white flex items-center justify-center hover:opacity-95 active:scale-95 transition-all shadow-sm cursor-pointer shrink-0"
                title={playback.isPlaying ? 'Pause' : 'Play'}
                aria-label={playback.isPlaying ? 'Pause' : 'Play'}
              >
                {playback.isPlaying ? (
                  <Pause className="w-6 h-6 fill-current stroke-none" />
                ) : (
                  <Play className="w-6 h-6 fill-current stroke-none ml-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* UPCOMING ROWS SECTION */}
      <section aria-label="Upcoming Queue">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-serif text-3xl font-bold text-[var(--app-text-primary)]">
            Up next
          </h2>
          <span className="text-sm text-[var(--app-text-secondary)]">
            {queue.length} episodes <span className="mx-1.5">·</span> {totalUpcomingMinutes} min
          </span>
        </div>

        {/* Empty State */}
        {queue.length === 0 ? (
          <div className="bg-[var(--app-card-bg)] border border-dashed border-[var(--app-border)] rounded-2xl p-8 sm:p-12 text-center flex flex-col items-center justify-center">
            <div className="w-14 h-14 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-[var(--app-text-muted)] mb-4">
              <ListMusic className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="font-serif text-lg font-bold text-[var(--app-text-primary)]">
              Your listening queue is empty
            </h3>
            <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] max-w-sm mt-1 mb-5">
              Add episodes from Find or your Library to keep unhurried listening going without interruption.
            </p>
            <button
              onClick={onNavigateToFind}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--app-accent)] text-white text-xs font-semibold hover:opacity-90 active:scale-95 transition-all shadow-xs cursor-pointer"
            >
              <Compass className="w-4 h-4" />
              <span>Explore episodes in Find</span>
            </button>
          </div>
        ) : (
          /* Upcoming rows list with Drag & Drop */
          <div
            ref={menuContainerRef}
            className="bg-transparent border-y border-[var(--app-border)] divide-y divide-[var(--app-border)] overflow-visible"
          >
            {queue.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === queue.length - 1;
              const isBeingDragged = draggedIndex === index;
              const isDragOver = dragOverIndex === index && draggedIndex !== index;
              const isMenuOpen = activeMenuId === item.id;

              return (
                <div
                  key={item.id}
                  draggable={true}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`group flex items-center justify-between px-3 py-2 transition-all relative ${
                    isBeingDragged ? 'opacity-40 bg-black/5 dark:bg-white/5' : ''
                  } ${
                    isDragOver
                      ? 'border-t-2 border-[var(--app-accent)] bg-[var(--app-accent)]/5'
                      : 'hover:bg-black/[0.015] dark:hover:bg-white/[0.015]'
                  }`}
                >
                  {/* Left: Drag handle + Index + Artwork + Title info */}
                  <div className="flex items-center gap-3 sm:gap-3.5 min-w-0 flex-1 pr-3">
                    {/* Drag Grip Handle */}
                    <div
                      className="text-[var(--app-text-muted)] group-hover:text-[var(--app-text-secondary)] cursor-grab active:cursor-grabbing p-1 -ml-1 rounded transition-colors touch-none"
                      title="Drag to reorder"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4 stroke-[2]" />
                    </div>

                    {/* Numerical Position */}
                    <span className="text-xs font-mono tabular-nums text-[var(--app-text-muted)] w-4 text-center select-none hidden sm:inline">
                      {index + 1}
                    </span>

                    {/* Artwork thumbnail */}
                    <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 border border-[var(--app-border)]/40 shadow-2xs">
                      <ArtworkImage
                        live={Boolean(item.artworkUrl)}
                        artworkUrl={item.artworkUrl}
                        artworkKey={item.artworkKey || 'just-coffee'}
                        alt={item.title}
                      />
                    </div>

                    {/* Episode Title & Details */}
                    <div className="min-w-0 flex-1">
                      <h4 className="text-base font-semibold text-[var(--app-text-primary)] truncate group-hover:text-[var(--app-accent)] transition-colors">
                        {item.title}
                      </h4>
                      <div className="text-xs text-[var(--app-text-secondary)] truncate mt-0.5">
                        <span>{item.artist || item.channelTitle || item.subtitle}</span>
                        {item.channelTitle && item.artist && item.channelTitle !== item.artist && (
                          <>
                            <span className="mx-1 opacity-50">·</span>
                            <span className="text-[var(--app-text-muted)]">{item.channelTitle}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Duration + Play Now + Interactive Reorder Menu */}
                  <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                    {/* Formatted Duration */}
                    <span className="text-xs font-mono tabular-nums text-[var(--app-text-secondary)] w-10 text-right hidden sm:inline">
                      {item.durationFormatted || '3:45'}
                    </span>

                    <GripVertical className="w-5 h-5 text-[var(--app-text-muted)]" aria-label="Reorder item" />

                    {/* Interactive Reorder Menu Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : item.id);
                        }}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          isMenuOpen
                            ? 'text-[var(--app-accent)] bg-black/5 dark:bg-white/10'
                            : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                        title="Reorder & options"
                        aria-label={`Options for ${item.title}`}
                        aria-expanded={isMenuOpen}
                      >
                        <MoreVertical className="w-4 h-4 stroke-[1.8]" />
                      </button>

                      {/* Interactive Dropdown Menu */}
                      {isMenuOpen && (
                        <div
                          className="absolute right-0 top-full mt-1 w-48 py-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-30 text-xs animate-in fade-in zoom-in-95 duration-100"
                          role="menu"
                        >
                          <button
                            type="button"
                            onClick={() => { onPlayNow(item); setActiveMenuId(null); }}
                            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                            role="menuitem"
                          >
                            <Play className="w-3.5 h-3.5 fill-current stroke-none" />
                            <span>Play now</span>
                          </button>

                          <div className="my-1 border-t border-[var(--app-border)]" />

                          {/* Move Up Action - boundary disabled */}
                          <button
                            type="button"
                            disabled={isFirst}
                            onClick={() => handleMoveUp(index)}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                              isFirst
                                ? 'opacity-35 cursor-not-allowed text-[var(--app-text-muted)]'
                                : 'text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                            role="menuitem"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                            <span>Move up</span>
                          </button>

                          {/* Move Down Action - boundary disabled */}
                          <button
                            type="button"
                            disabled={isLast}
                            onClick={() => handleMoveDown(index)}
                            className={`w-full px-3 py-2 text-left flex items-center gap-2.5 transition-colors cursor-pointer ${
                              isLast
                                ? 'opacity-35 cursor-not-allowed text-[var(--app-text-muted)]'
                                : 'text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                            role="menuitem"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                            <span>Move down</span>
                          </button>

                          {/* Move to Top */}
                          {!isFirst && (
                            <button
                              type="button"
                              onClick={() => handleMoveToTop(index)}
                              className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                              role="menuitem"
                            >
                              <ArrowUpToLine className="w-3.5 h-3.5" />
                              <span>Move to top</span>
                            </button>
                          )}

                          <div className="my-1 border-t border-[var(--app-border)]" />

                          {/* Remove with Undo */}
                          <button
                            type="button"
                            onClick={() => handleRemoveWithUndo(item, index)}
                            className="w-full px-3 py-2 text-left flex items-center gap-2.5 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
                            role="menuitem"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove from queue</span>
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="mt-2 flex items-center gap-2 text-sm text-[var(--app-text-secondary)]">
        <AlertTriangle className="w-4 h-4" />
        <span>This changes playback order, not your downloads.</span>
      </div>
      <button
        type="button"
        onClick={onNavigateToFind}
        className="mt-3 w-full h-12 border border-[var(--app-accent)] rounded-lg text-[var(--app-accent)] font-medium flex items-center justify-center gap-2 hover:bg-[var(--app-accent)]/5 transition-colors cursor-pointer"
      >
        <Compass className="w-4 h-4" />
        <span>Find more episodes</span>
      </button>

      {/* Floating Undo Removal Toast */}
      {undoItem && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--app-card-bg)] border border-[var(--app-border)] shadow-2xl text-xs text-[var(--app-text-primary)] animate-in fade-in slide-in-from-bottom-3 duration-200"
        >
          <span>
            Removed <strong>&ldquo;{undoItem.item.title}&rdquo;</strong> from queue
          </span>
          <button
            onClick={handleExecuteUndo}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[var(--app-accent)] text-white font-medium hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Undo</span>
          </button>
          <button
            onClick={handleDismissUndo}
            className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] rounded cursor-pointer"
            title="Dismiss"
            aria-label="Dismiss undo notification"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Clear Upcoming Confirmation Modal */}
      {isConfirmClearOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-md bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-queue-title"
          >
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6 stroke-[2]" />
            </div>

            <h3
              id="clear-queue-title"
              className="text-lg font-serif font-bold text-[var(--app-text-primary)]"
            >
              Clear upcoming episodes?
            </h3>
            <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] mt-2 leading-relaxed">
              This will remove all {queue.length} upcoming episodes from your queue.
              The currently playing episode ({playback.currentTrackTitle}) will continue playing.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmClearOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearUpcoming();
                  setIsConfirmClearOpen(false);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer shadow-xs"
              >
                Clear upcoming
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
