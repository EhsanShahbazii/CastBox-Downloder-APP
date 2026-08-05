import React from 'react';
import { Bookmark } from 'lucide-react';
import { Channel } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface ChannelSidebarProps {
  savePending?: boolean;
  saveDisabled?: boolean;
  channel: Channel;
  isSaved: boolean;
  onToggleSave: () => void;
  onBackToFind?: () => void;
}

export const ChannelSidebar: React.FC<ChannelSidebarProps> = ({
  channel, savePending = false, saveDisabled = false,
  isSaved,
  onToggleSave,
  onBackToFind,
}) => {
  return (
    <aside className="w-full lg:w-[380px] shrink-0">
      {/* Optional subtle back affordance */}
      {/* The sticky app navigation retains access to Find; reserve this area for the channel artwork. */}

      {/* Large Featured Channel Artwork */}
      <div className="w-full aspect-square max-w-[380px] rounded-2xl overflow-hidden shadow-sm border border-[var(--app-border)]/50">
        <ArtworkImage artworkKey={channel.artworkKey} live={channel.source === 'castbox'} artworkUrl={channel.artworkUrl} alt={channel.title} />
      </div>

      {/* Channel Meta Information */}
      <div className="mt-6">
        <h1 className="font-serif font-bold text-3xl sm:text-[40px] text-[var(--app-text-primary)] tracking-tight leading-[1.1]">
          {channel.title}
        </h1>
        <div className="text-base text-[var(--app-text-secondary)] mt-1 font-normal">
          {channel.episodeCountUnknown ? '—' : channel.episodesCount} episodes
        </div>

        {/* Save Channel Action Button */}
        <div className="mt-4">
          <button
            onClick={onToggleSave}
            disabled={savePending || saveDisabled}
            aria-busy={savePending}
            className={`inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--app-accent)] rounded-lg text-base font-medium transition-all cursor-pointer ${
              isSaved
                ? 'bg-[var(--app-accent)] text-white'
                : 'text-[var(--app-accent)] bg-transparent hover:bg-[var(--app-accent)]/5'
            }`}
          >
            <Bookmark
              className={`w-4 h-4 ${isSaved ? 'fill-white stroke-none' : 'text-[var(--app-accent)]'}`}
            />
            <span>{savePending ? 'Updating…' : isSaved ? 'Saved' : 'Save channel'}</span>
          </button>
        </div>

        {/* Tagline */}
        {channel.tagline && (
          <p className="font-serif italic text-base text-[var(--app-text-secondary)] mt-5">
            {channel.tagline}
          </p>
        )}

        {/* Channel Prose Description */}
        <p className="text-sm sm:text-base text-[var(--app-text-secondary)] leading-relaxed mt-3 max-w-sm break-words">
          {channel.description}
        </p>
      </div>
    </aside>
  );
};
