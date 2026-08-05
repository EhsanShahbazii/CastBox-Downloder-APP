import React, { useState } from 'react';
import {
  Play,
  Pause,
  Download,
  Check,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ListPlus,
  Layers,
  AlertCircle,
} from 'lucide-react';
import { Channel, Episode } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface EpisodeDetailsViewProps {
  episode: Episode;
  channel: Channel;
  isPlayingThisEpisode: boolean;
  onTogglePlayEpisode: (episode: Episode) => void;
  onDownloadEpisode: (episode: Episode) => void;
  onAddToQueue: (episode: Episode) => void;
  onNavigateToChannel: (channel: Channel) => void;
  onNavigateToFind: () => void;
}

export const EpisodeDetailsView: React.FC<EpisodeDetailsViewProps> = ({
  episode,
  channel,
  isPlayingThisEpisode,
  onTogglePlayEpisode,
  onDownloadEpisode,
  onAddToQueue,
  onNavigateToChannel,
  onNavigateToFind,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(episode.isDownloaded || false);
  const [isSourceUnavailable, setIsSourceUnavailable] = useState(episode.isSourceUnavailable || false);
  const [isAddedToQueue, setIsAddedToQueue] = useState(false);

  const handleDownloadClick = () => {
    if (isSourceUnavailable) return;
    if (episode.source !== 'castbox') setIsDownloaded(true);
    onDownloadEpisode(episode);
  };

  const handleQueueClick = () => {
    if (episode.source !== 'castbox') setIsAddedToQueue(true);
    onAddToQueue(episode);
    setTimeout(() => setIsAddedToQueue(false), 2400);
  };

  return (
    <div className="w-full max-w-[1375px] mx-auto pt-8 pb-36">
      {/* Breadcrumb Navigation matching reference */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-[var(--app-text-secondary)] mb-[42px] select-none">
        <button
          onClick={onNavigateToFind}
          className="hover:text-[var(--app-accent)] transition-colors cursor-pointer"
        >
          Find
        </button>
        <span className="opacity-40">/</span>
        <button
          onClick={() => onNavigateToChannel(channel)}
          className="hover:text-[var(--app-accent)] transition-colors cursor-pointer"
        >
          {channel.title}
        </button>
        <span className="opacity-40">/</span>
        <span className="text-[var(--app-text-primary)] font-medium truncate max-w-xs sm:max-w-md">
          {episode.title}
        </span>
      </nav>

      {/* Main 2-Column Episode Layout */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-11 items-start">
        {/* Left Column: Large Featured Artwork */}
        <div className="w-full max-w-[460px] lg:max-w-[640px] aspect-square shrink-0 rounded-2xl overflow-hidden shadow-sm border border-[var(--app-border)]/50">
          <ArtworkImage artworkKey={episode.source === 'castbox' ? episode.artworkKey : channel.artworkKey} live={episode.source === 'castbox'} artworkUrl={episode.artworkUrl} alt={episode.title} />
        </div>

        {/* Right Column: Episode Title Hierarchy & Actions */}
        <div className="flex-1 min-w-0">
          {/* Top Kicker Label */}
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--app-text-muted)]">
            Episode
          </span>

          {/* Massive Editorial Serif Title */}
          <h1 className="font-serif font-bold text-4xl sm:text-[64px] text-[var(--app-text-primary)] tracking-tight leading-[1.08] mt-1.5 break-words">
            {episode.title}
          </h1>

          {/* Artist Byline */}
          <div className="text-xl font-medium text-[var(--app-text-primary)] mt-1.5">
            {episode.artist}
          </div>

          {/* Channel Link */}
          <button
            onClick={() => onNavigateToChannel(channel)}
            className="inline-flex items-center gap-1.5 text-base font-medium text-[var(--app-accent)] hover:underline mt-2 cursor-pointer transition-colors"
          >
            <span>{channel.title}</span>
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Unboxed Metadata Line */}
          <div className="flex items-center gap-2 text-sm text-[var(--app-text-secondary)] mt-4 font-normal">
            <span>{episode.date}</span>
            <span aria-hidden="true" className="opacity-50">·</span>
            <span>{episode.durationFormatted}</span>
            <span aria-hidden="true" className="opacity-50">·</span>
            <span>{episode.fileSizeFormatted}</span>
          </div>

          {/* Action Buttons Row */}
          <div className="flex items-center flex-wrap gap-3.5 sm:gap-4 mt-6">
            {/* Play / Pause Primary Action */}
            <button
              onClick={() => onTogglePlayEpisode(episode)}
              disabled={isSourceUnavailable}
              className={`h-[66px] px-8 rounded-xl font-medium text-lg flex items-center justify-center gap-3 transition-all cursor-pointer shadow-sm shrink-0 active:scale-98 ${
                isSourceUnavailable
                  ? 'bg-[var(--app-input-bg)] text-[var(--app-text-muted)] cursor-not-allowed border border-[var(--app-border)]'
                  : 'bg-[var(--app-accent)] hover:bg-[#A94516] text-white'
              }`}
            >
              {isPlayingThisEpisode ? (
                <>
                  <Pause className="w-4 h-4 fill-white stroke-none" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white stroke-none ml-0.5" />
                  <span>Play</span>
                </>
              )}
            </button>

            {/* Download Secondary Action (Supports already-downloaded and unavailable states) */}
            {isSourceUnavailable ? (
              <button
                disabled
                className="h-[66px] px-7 border border-[var(--app-border)] bg-[var(--app-input-bg)] text-[var(--app-text-muted)] rounded-xl font-medium text-lg flex items-center gap-2 cursor-not-allowed"
                title="Episode audio source is currently unavailable"
              >
                <AlertCircle className="w-4 h-4" />
                <span>Unavailable</span>
              </button>
            ) : isDownloaded ? (
              <button
                onClick={() => setIsDownloaded(false)}
                className="h-[66px] px-7 border border-[var(--app-accent)] text-[var(--app-accent)] bg-[var(--app-accent)]/10 rounded-xl font-medium text-lg flex items-center gap-2 cursor-pointer transition-colors"
                title="Already downloaded. Click to simulate removing"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Downloaded</span>
              </button>
            ) : (
              <button
                onClick={handleDownloadClick}
                className="h-[66px] px-7 border border-[var(--app-accent)] text-[var(--app-accent)] hover:bg-[var(--app-accent)]/5 rounded-xl font-medium text-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2]" />
                <span>Download</span>
              </button>
            )}

            {/* Hairline Separator */}
            <span className="hidden sm:inline text-[var(--app-border)] font-light px-0.5" aria-hidden="true">
              |
            </span>

            {/* Add to listening queue */}
            <button
              onClick={handleQueueClick}
              className="h-[66px] px-3 text-base font-medium text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] flex items-center gap-2 transition-colors cursor-pointer"
            >
              {isAddedToQueue ? (
                <>
                  <Check className="w-4 h-4 text-[var(--app-accent)] stroke-[2.5]" />
                  <span className="text-[var(--app-accent)]">Added to queue</span>
                </>
              ) : (
                <>
                  <ListPlus className="w-4.5 h-4.5 stroke-[1.8]" />
                  <span>Add to listening queue</span>
                </>
              )}
            </button>
          </div>

          {/* Hairline Divider */}
          <div className="w-full border-t border-[var(--app-border)] my-7" />

          {/* Section: About this episode */}
          <div className="max-w-2xl">
            <h2 className="font-serif font-bold text-xl sm:text-2xl text-[var(--app-text-primary)]">
              About this episode
            </h2>

            {/* Main Synopsis Paragraph */}
            <p className="text-base text-[var(--app-text-secondary)] leading-relaxed mt-2.5 font-normal break-words">
              {episode.synopsis || (episode.source === 'castbox' ? 'No description available.' :
                'A quiet soundtrack for coffee breaks and the little moments in between. A gentle mix of acoustic textures, lo-fi beats and warm ambience to help you slow down, breathe and enjoy the present moment.')}
            </p>

            {/* Expandable Liner Notes / Extended Description */}
            {isDescriptionExpanded && (
              <div className="mt-3 text-sm text-[var(--app-text-secondary)] leading-relaxed break-words space-y-2 pt-2 border-t border-[var(--app-border)]/50 animate-in fade-in duration-150">
                <p>
                  {episode.extendedDescription || (episode.source === 'castbox' ? 'No additional notes available.' :
                    'Recorded with vintage ribbon microphones in a sunlit home studio. Featuring delicate fingerpicked nylon strings, warm analog tape saturation, and subtle field recordings of soft morning rain. Mastered specifically for low-volume listening during morning rituals and deep focus sessions.')}
                </p>
                <div className="text-xs text-[var(--app-text-muted)] pt-1 flex items-center gap-3">
                  <span>Track ID: {episode.id}</span>
                  <span>·</span>
                  {episode.source !== 'castbox' && <span>Audio Format: 320kbps MP3</span>}
                  <span>·</span>
                  {episode.source !== 'castbox' && <span>Stereo Mastered</span>}
                </div>
              </div>
            )}

            {/* Show more / Show less toggle */}
            <button
              onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--app-accent)] hover:opacity-80 transition-opacity mt-2.5 cursor-pointer"
            >
              <span>{isDescriptionExpanded ? 'Show less' : 'Show more'}</span>
              {isDescriptionExpanded ? (
                <ChevronUp className="w-4 h-4 stroke-[2]" />
              ) : (
                <ChevronDown className="w-4 h-4 stroke-[2]" />
              )}
            </button>
          </div>

          {/* View Channel Bottom Action */}
          <div className="mt-7 pt-4">
            <button
              onClick={() => onNavigateToChannel(channel)}
              className="inline-flex items-center gap-2 text-sm font-medium text-[var(--app-accent)] hover:underline transition-colors cursor-pointer"
            >
              <Layers className="w-4.5 h-4.5 stroke-[1.8]" />
              <span>View channel</span>
              <ChevronRight className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
