import React from 'react';
import { Check, Play, Pause, Download, MoreHorizontal, ListPlus } from 'lucide-react';
import { Episode } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface EpisodeRowProps {
  episode: Episode;
  isSelected: boolean;
  isPlaying: boolean;
  onToggleSelect: (episodeId: string) => void;
  onPlay: (episode: Episode) => void;
  onDownload: (episode: Episode) => void;
  onOpenDetails: (episode: Episode) => void;
  onAddToQueue?: (episode: Episode) => void;
}

export const EpisodeRow: React.FC<EpisodeRowProps> = ({
  episode,
  isSelected,
  isPlaying,
  onToggleSelect,
  onPlay,
  onDownload,
  onOpenDetails,
  onAddToQueue,
}) => {
  return (
    <div className="group flex items-center justify-between py-2 border-b border-[var(--app-border)] hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors px-2 -mx-2 rounded-lg">
      {/* Left: Checkbox + Thumbnail + Title/Date */}
      <div className="flex items-center gap-5 min-w-0 pr-4 flex-1">
        {/* Selection Checkbox */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(episode.id);
          }}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isSelected
              ? 'bg-[var(--app-accent)] border border-[var(--app-accent)] text-white shadow-xs'
              : 'border border-[var(--app-border)] bg-transparent hover:border-[var(--app-accent)]'
          }`}
          aria-label={`Select ${episode.title}`}
          aria-checked={isSelected}
          role="checkbox"
        >
          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Clickable thumbnail & title area navigating to Episode Details screen */}
        <div
          role="button" tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenDetails(episode); } }}
          onClick={() => onOpenDetails(episode)}
          className="flex items-center gap-3.5 min-w-0 cursor-pointer flex-1"
        >
          {/* Episode Artwork Thumbnail */}
          <div className="w-20 h-20 rounded-lg overflow-hidden shrink-0 shadow-xs border border-[var(--app-border)]/40 hover:opacity-90 transition-opacity">
            <ArtworkImage artworkKey={episode.artworkKey} live={episode.source === 'castbox'} artworkUrl={episode.artworkUrl} alt={episode.title} />
          </div>

          {/* Title and Episode Details */}
          <div className="min-w-0">
            <h4 className="font-semibold text-base sm:text-lg text-[var(--app-text-primary)] group-hover:text-[var(--app-accent)] transition-colors truncate">
              {episode.title}
            </h4>
            <div className="text-sm text-[var(--app-text-secondary)] mt-1 font-normal flex items-center gap-1.5">
              {episode.source !== 'castbox' && <span>#{episode.episodeNumber}</span>}
              {episode.source !== 'castbox' && <span aria-hidden="true" className="opacity-60">·</span>}
              <span>{episode.date}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Duration, Size, and Interactive Actions */}
      <div className="flex items-center gap-4 sm:gap-6 shrink-0 text-right">
        {/* Duration & File Size */}
        <div className="hidden sm:flex items-center gap-4 font-mono text-xs tabular-nums text-[var(--app-text-secondary)]">
          <span className="w-10 text-right">{episode.durationFormatted}</span>
          <span className="w-14 text-right text-[var(--app-text-muted)]">
            {episode.fileSizeFormatted}
          </span>
        </div>

        {/* Action Buttons: Play, Download, Details */}
        <div className="flex items-center gap-2.5">
          {/* Play/Pause Button */}
          <button
            onClick={() => onPlay(episode)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all cursor-pointer ${
              isPlaying
                ? 'bg-[var(--app-accent)] text-white shadow-sm'
                : 'bg-black/5 dark:bg-white/5 text-[var(--app-text-primary)] hover:bg-[var(--app-accent)] hover:text-white'
            }`}
            title={isPlaying ? 'Pause episode' : 'Play episode'}
            aria-label={isPlaying ? 'Pause episode' : 'Play episode'}
          >
            {isPlaying ? (
              <Pause className="w-3.5 h-3.5 fill-current stroke-none" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current stroke-none ml-0.5" />
            )}
          </button>

          {/* Download Action */}
          <button
            onClick={() => onDownload(episode)}
            className="p-1.5 text-[var(--app-text-secondary)] hover:text-[var(--app-accent)] transition-colors cursor-pointer rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            title="Download episode"
            aria-label={`Download ${episode.title}`}
          >
            <Download className="w-4 h-4 stroke-[1.8]" />
          </button>

          {/* Add to listening queue */}
          {onAddToQueue && (
            <button
              onClick={() => onAddToQueue(episode)}
              className="p-1.5 text-[var(--app-text-secondary)] hover:text-[var(--app-accent)] transition-colors cursor-pointer rounded-md hover:bg-black/5 dark:hover:bg-white/5"
              title="Add to listening queue"
              aria-label={`Add ${episode.title} to listening queue`}
            >
              <ListPlus className="w-4 h-4 stroke-[1.8]" />
            </button>
          )}

          {/* More / Details Action */}
          <button
            onClick={() => onOpenDetails(episode)}
            className="p-1.5 text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            title="Episode details"
            aria-label={`Details for ${episode.title}`}
          >
            <MoreHorizontal className="w-4 h-4 stroke-[1.8]" />
          </button>
        </div>
      </div>
    </div>
  );
};
