import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Channel } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface ChannelCardProps {
  channel: Channel;
  isCurrentlyPlaying?: boolean;
  onSelectChannel: (channel: Channel) => void;
  onPlayChannel?: (channel: Channel, e: React.MouseEvent) => void;
}

export const ChannelCard: React.FC<ChannelCardProps> = ({
  channel,
  onSelectChannel,
}) => {
  return (
    <div
      role="button" tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectChannel(channel); } }}
      onClick={() => onSelectChannel(channel)}
      className="group relative flex items-center justify-between py-4.5 border-b border-[var(--app-border)] hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors cursor-pointer rounded-lg px-2 -mx-2"
    >
      {/* Left content: Thumbnail Artwork + Details */}
      <div className="flex items-center gap-5 min-w-0 pr-4">
        {/* Artwork Thumbnail - clean presentation matching the visual references */}
        <div className="relative w-23 h-23 sm:w-[92px] sm:h-[92px] shrink-0 rounded-lg overflow-hidden shadow-xs border border-[var(--app-border)]/40">
          <ArtworkImage artworkKey={channel.artworkKey} live={channel.source === 'castbox'} artworkUrl={channel.artworkUrl} alt={channel.title} />
        </div>

        {/* Text information */}
        <div className="min-w-0">
          <h3 className="font-serif font-bold text-lg sm:text-[19px] leading-snug text-[var(--app-text-primary)] group-hover:text-[var(--app-accent)] transition-colors truncate">
            {channel.title}
          </h3>
          <div className="text-xs sm:text-[13px] text-[var(--app-text-secondary)] mt-0.5 font-normal">
            {channel.author}
          </div>
          <p className="text-xs sm:text-[13px] text-[var(--app-text-secondary)] leading-relaxed mt-1.5 line-clamp-2 max-w-2xl font-normal">
            {channel.description}
          </p>
        </div>
      </div>

      {/* Right meta: Episode Count & Chevron */}
      <div className="flex items-center gap-4 shrink-0 text-right pl-2">
        <span className="text-xs text-[var(--app-text-secondary)] whitespace-nowrap">
          {channel.episodeCountUnknown ? '—' : channel.episodesCount} episodes
        </span>
        <ChevronRight className="w-4 h-4 text-[var(--app-text-muted)] group-hover:text-[var(--app-text-primary)] group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
};
