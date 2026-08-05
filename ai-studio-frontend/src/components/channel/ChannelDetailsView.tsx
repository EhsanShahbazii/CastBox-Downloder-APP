import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ChevronDown, ChevronLeft, ChevronRight, Check, X, Download, Play, Calendar, Clock, HardDrive } from 'lucide-react';
import { Channel, Episode } from '../../types';
import { ChannelSidebar } from './ChannelSidebar';
import { EpisodeRow } from './EpisodeRow';
import { BulkSelectionBar } from './BulkSelectionBar';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface ChannelDetailsViewProps {
  remote?: { page: number; total: number; allIds: string[]; oldest: boolean; onPage: (page: number, oldest: boolean) => void };
  savePending?: boolean;
  saveDisabled?: boolean;
  channel: Channel;
  isSaved: boolean;
  onToggleSave: () => void;
  selectedEpisodeIds: Set<string>;
  onToggleEpisodeSelect: (episodeId: string) => void;
  onSelectThisPage: (episodeIds: string[]) => void;
  onSelectAllEpisodes: (allEpisodeIds: string[]) => void;
  onClearSelection: () => void;
  currentPlayingTrackTitle?: string;
  isPlaying?: boolean;
  onPlayEpisode: (episode: Episode) => void;
  onDownloadEpisode: (episode: Episode) => void;
  onDownloadSelected: (selectedEpisodes: Episode[]) => void;
  onSelectEpisodeDetails?: (episode: Episode) => void;
  onAddToQueue?: (episode: Episode) => void;
  onBackToFind: () => void;
}

type SortOption = 'newest' | 'oldest' | 'duration' | 'title';

export const ChannelDetailsView: React.FC<ChannelDetailsViewProps> = ({
  channel, remote, savePending, saveDisabled,
  isSaved,
  onToggleSave,
  selectedEpisodeIds,
  onToggleEpisodeSelect,
  onSelectThisPage,
  onSelectAllEpisodes, onClearSelection,
  currentPlayingTrackTitle,
  isPlaying = false,
  onPlayEpisode,
  onDownloadEpisode,
  onDownloadSelected,
  onSelectEpisodeDetails,
  onAddToQueue,
  onBackToFind,
}) => {
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>(remote?.oldest ? 'oldest' : 'newest');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [activeDetailsEpisode, setActiveDetailsEpisode] = useState<Episode | null>(null);

  const sortDropdownRef = useRef<HTMLDivElement>(null);

  // Close sort dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) {
        setIsSortDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allEpisodes = useMemo(() => channel.episodes || [], [channel.episodes]);

  // Filter episodes by search query (without affecting selectedEpisodeIds!)
  const filteredAndSortedEpisodes = useMemo(() => {
    let result = [...allEpisodes];

    if (episodeSearch.trim()) {
      const q = episodeSearch.toLowerCase().trim();
      result = result.filter(
        (ep) =>
          ep.title.toLowerCase().includes(q) ||
          ep.synopsis?.toLowerCase().includes(q) ||
          ep.episodeNumber.toString().includes(q)
      );
    }

    switch (sortBy) {
      case 'newest':
        if (!remote) result.sort((a, b) => b.episodeNumber - a.episodeNumber);
        break;
      case 'oldest':
        if (!remote) result.sort((a, b) => a.episodeNumber - b.episodeNumber);
        break;
      case 'duration':
        result.sort((a, b) => b.durationSeconds - a.durationSeconds);
        break;
      case 'title':
        result.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    return result;
  }, [allEpisodes, episodeSearch, sortBy]);

  // Pagination for Channel Episodes (Max 10 per page)
  const EPISODES_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Reset page when search or sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [episodeSearch, sortBy]);

  const totalPages = Math.max(1, Math.ceil((remote?.total ?? filteredAndSortedEpisodes.length) / EPISODES_PER_PAGE));
  const safeCurrentPage = Math.min(remote?.page ?? currentPage, totalPages);

  const paginatedEpisodes = useMemo(() => {
    if (remote) return filteredAndSortedEpisodes;
    const start = (safeCurrentPage - 1) * EPISODES_PER_PAGE;
    return filteredAndSortedEpisodes.slice(start, start + EPISODES_PER_PAGE);
  }, [filteredAndSortedEpisodes, safeCurrentPage, remote]);

  // Visible episode IDs corresponds to current page
  const visibleEpisodeIds = useMemo(
    () => paginatedEpisodes.map((ep) => ep.id),
    [paginatedEpisodes]
  );

  const isAllVisibleSelected =
    visibleEpisodeIds.length > 0 &&
    visibleEpisodeIds.every((id) => selectedEpisodeIds.has(id));

  const handleToggleSelectVisible = () => {
    if (isAllVisibleSelected) {
      // Unselect only the visible ones
      visibleEpisodeIds.forEach((id) => {
        if (selectedEpisodeIds.has(id)) {
          onToggleEpisodeSelect(id);
        }
      });
    } else {
      onSelectThisPage(visibleEpisodeIds);
    }
  };

  const sortLabels: Record<SortOption, string> = {
    newest: 'Newest',
    oldest: 'Oldest',
    duration: 'Duration',
    title: 'Title',
  };

  return (
    <div className="w-full max-w-[1375px] mx-auto px-6 pt-9 pb-36">
      {/* 2-Column Desktop Grid Layout */}
      <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">
        {/* Left Column: Channel Artwork & Meta */}
        <ChannelSidebar
          savePending={savePending}
          saveDisabled={saveDisabled}
          channel={channel}
          isSaved={isSaved}
          onToggleSave={onToggleSave}
          onBackToFind={onBackToFind}
        />

        {/* Right Column: Episodes Section */}
        <section className="flex-1 min-w-0 lg:pt-4">
          {/* Header Title */}
          <div className="mb-[22px]">
            <h2 className="font-serif font-bold text-2xl sm:text-3xl text-[var(--app-text-primary)]">
              Episodes
            </h2>
          </div>

          {/* Search & Sort Toolbar */}
          <div className="flex items-center gap-3 sm:gap-4 mb-5 flex-wrap sm:flex-nowrap">
            {/* Episode Search Field */}
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--app-text-muted)]">
                <Search className="w-4 h-4 stroke-[2]" />
              </div>
              <input
                type="text"
                value={episodeSearch}
                onChange={(e) => setEpisodeSearch(e.target.value)}
                placeholder={remote ? "Filter this page..." : "Search episodes in this channel..."}
                className="w-full h-12 pl-10 pr-9 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] text-sm text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] rounded-xl outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/30 transition-all font-sans"
              />
              {episodeSearch && (
                <button
                  type="button"
                  onClick={() => setEpisodeSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)]"
                  aria-label="Clear episode search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex items-center gap-2 shrink-0" ref={sortDropdownRef}>
              <span className="text-xs text-[var(--app-text-secondary)] whitespace-nowrap hidden sm:inline">
                Sort by
              </span>
              <button
                type="button"
                onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                className="h-10.5 px-3.5 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] hover:border-[var(--app-accent)] rounded-xl text-xs sm:text-sm font-medium text-[var(--app-text-primary)] flex items-center gap-2 transition-colors cursor-pointer"
                aria-haspopup="listbox"
                aria-expanded={isSortDropdownOpen}
              >
                <span>{sortLabels[sortBy]}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>

              {/* Sort Menu Popover */}
              {isSortDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-36 py-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-lg z-30">
                  {((remote ? ['newest', 'oldest'] : ['newest', 'oldest', 'duration', 'title']) as SortOption[]).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => {
                        setSortBy(opt);
                        if (remote && (opt === 'newest' || opt === 'oldest')) remote.onPage(1, opt === 'oldest');
                        setIsSortDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-1.5 text-xs font-medium text-left transition-colors cursor-pointer ${
                        sortBy === opt
                          ? 'text-[var(--app-accent)] bg-black/5 dark:bg-white/5 font-semibold'
                          : 'text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                    >
                      <span>{sortLabels[opt]}</span>
                      {sortBy === opt && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {remote && <p className="sr-only">Filtering applies to this page. Newest or oldest sorts the whole channel.</p>}
          {remote && filteredAndSortedEpisodes.length === 0 && <p role="status" className="py-6 text-sm">{remote.total === 0 ? 'This channel has no episodes yet.' : 'No available episodes on this page match your filter.'}</p>}
          {/* Episode List */}
          {(remote || filteredAndSortedEpisodes.length > 0) ? (
            <div>
              <div className="border-t border-[var(--app-border)] divide-y divide-[var(--app-border)]">
                {paginatedEpisodes.map((episode) => (
                  <EpisodeRow
                    key={episode.id}
                    episode={episode}
                    isSelected={selectedEpisodeIds.has(episode.id)}
                    isPlaying={isPlaying && currentPlayingTrackTitle === episode.title}
                    onToggleSelect={onToggleEpisodeSelect}
                    onPlay={onPlayEpisode}
                    onDownload={onDownloadEpisode}
                    onAddToQueue={onAddToQueue}
                    onOpenDetails={(ep) => {
                      if (onSelectEpisodeDetails) {
                        onSelectEpisodeDetails(ep);
                      } else {
                        setActiveDetailsEpisode(ep);
                      }
                    }}
                  />
                ))}
              </div>

              {/* Pagination Controls for Channel Episodes */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between py-4 px-1 text-xs text-[var(--app-text-secondary)] select-none border-t border-[var(--app-border)]">
                  <span>
                    Showing <span className="font-medium text-[var(--app-text-primary)]">{(safeCurrentPage - 1) * EPISODES_PER_PAGE + 1}–{Math.min(safeCurrentPage * EPISODES_PER_PAGE, remote?.total ?? filteredAndSortedEpisodes.length)}</span> of <span className="font-medium text-[var(--app-text-primary)]">{remote?.total ?? filteredAndSortedEpisodes.length}</span> episodes
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => remote ? remote.onPage(safeCurrentPage - 1, remote.oldest) : setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safeCurrentPage === 1}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                      aria-label="Previous page"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Prev</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => Math.max(1, Math.min(safeCurrentPage - 2, totalPages - 4)) + i).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          onClick={() => remote ? remote.onPage(pageNum, remote.oldest) : setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
                            safeCurrentPage === pageNum
                              ? 'bg-[var(--app-accent)] text-white shadow-xs font-semibold'
                              : 'border border-[var(--app-border)] text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                          }`}
                          aria-label={`Page ${pageNum}`}
                          aria-current={safeCurrentPage === pageNum ? 'page' : undefined}
                        >
                          {pageNum}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => remote ? remote.onPage(safeCurrentPage + 1, remote.oldest) : setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safeCurrentPage === totalPages}
                      className="px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                      aria-label="Next page"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="py-16 text-center text-xs text-[var(--app-text-secondary)]">
              No episodes found matching &ldquo;{episodeSearch}&rdquo;.
            </div>
          )}

          {/* Bulk Selection Bar */}
          <BulkSelectionBar
            onClearSelection={remote ? onClearSelection : undefined}
            selectedCount={selectedEpisodeIds.size}
            totalVisibleCount={visibleEpisodeIds.length}
            totalChannelCount={channel.episodesCount}
            isAllVisibleSelected={isAllVisibleSelected}
            onToggleSelectVisible={handleToggleSelectVisible}
            onSelectThisPage={() => onSelectThisPage(visibleEpisodeIds)}
            onSelectAllEpisodes={() =>
              onSelectAllEpisodes(remote?.allIds ?? allEpisodes.map((e) => e.id))
            }
            onDownloadSelected={() => {
              const selectedList = allEpisodes.filter((e) =>
                selectedEpisodeIds.has(e.id)
              );
              onDownloadSelected(selectedList);
            }}
          />
        </section>
      </div>

      {/* Episode Details Dialog Modal */}
      {activeDetailsEpisode && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative">
            <button
              onClick={() => setActiveDetailsEpisode(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-4.5 h-4.5" />
            </button>

            <div className="flex gap-4 items-start">
              <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-[var(--app-border)]/50">
                <ArtworkImage artworkKey={activeDetailsEpisode.artworkKey} alt={activeDetailsEpisode.title} />
              </div>
              <div className="min-w-0 pr-6">
                <span className="text-[11px] font-semibold text-[var(--app-accent)] uppercase tracking-wider">
                  Episode #{activeDetailsEpisode.episodeNumber}
                </span>
                <h3 className="font-serif font-bold text-lg text-[var(--app-text-primary)] leading-snug mt-0.5">
                  {activeDetailsEpisode.title}
                </h3>
                <p className="text-xs text-[var(--app-text-secondary)] mt-1">
                  {activeDetailsEpisode.artist}
                </p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[var(--app-border)] text-xs text-[var(--app-text-secondary)] leading-relaxed">
              <p>{activeDetailsEpisode.synopsis || 'No extended synopsis available for this episode.'}</p>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-[var(--app-border)] text-center text-xs">
              <div className="p-2 rounded-lg bg-[var(--app-input-bg)]">
                <Calendar className="w-3.5 h-3.5 mx-auto text-[var(--app-text-muted)] mb-1" />
                <span className="text-[11px] font-medium text-[var(--app-text-primary)]">
                  {activeDetailsEpisode.date}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--app-input-bg)]">
                <Clock className="w-3.5 h-3.5 mx-auto text-[var(--app-text-muted)] mb-1" />
                <span className="text-[11px] font-medium text-[var(--app-text-primary)]">
                  {activeDetailsEpisode.durationFormatted}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-[var(--app-input-bg)]">
                <HardDrive className="w-3.5 h-3.5 mx-auto text-[var(--app-text-muted)] mb-1" />
                <span className="text-[11px] font-medium text-[var(--app-text-primary)]">
                  {activeDetailsEpisode.fileSizeFormatted}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  onPlayEpisode(activeDetailsEpisode);
                  setActiveDetailsEpisode(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-[var(--app-accent)] hover:bg-[#A94516] text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Episode</span>
              </button>
              <button
                onClick={() => {
                  onDownloadEpisode(activeDetailsEpisode);
                  setActiveDetailsEpisode(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-[var(--app-border)] hover:border-[var(--app-accent)] text-[var(--app-text-primary)] text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
