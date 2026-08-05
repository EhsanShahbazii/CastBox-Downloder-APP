import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Folder,
  Trash2,
  MoreHorizontal,
  ListPlus,
  ListMusic,
  WifiOff,
  AlertTriangle,
  Bookmark,
  BookmarkCheck,
  Clock,
  ArrowDownToLine,
  Compass,
  Check,
  X,
  RefreshCw,
  Headphones,
} from 'lucide-react';
import {
  LibraryTab,
  DownloadedItem,
  RecentlyPlayedItem,
  Channel,
  Episode,
  PlaybackState,
} from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';
import { RemoveDownloadModal } from './RemoveDownloadModal';
import { LocateFileModal } from './LocateFileModal';
import { sortByDateAdded } from './sorting';

interface LibraryViewProps {
  native?: boolean;
  isOffline?: boolean;
  downloadedItems: DownloadedItem[];
  savedChannels: Channel[];
  initialTab?: LibraryTab;
  savingChannel?: boolean;
  recentlyPlayed: RecentlyPlayedItem[];
  playback: PlaybackState;
  onPlayDownloadedItem: (item: DownloadedItem) => void;
  onPlayChannelLatest: (channel: Channel) => void;
  onResumeRecentlyPlayed: (item: RecentlyPlayedItem) => void;
  onPlayNext: (track: {
    title: string;
    subtitle: string;
    artworkKey?: any;
    durationFormatted?: string;
    durationSeconds?: number;
    artist?: string;
    channelTitle?: string;
  }) => void;
  onAddToQueue: (track: {
    title: string;
    subtitle: string;
    artworkKey?: any;
    durationFormatted?: string;
    durationSeconds?: number;
    artist?: string;
    channelTitle?: string;
  }) => void;
  onSelectEpisodeDetails: (episode: Episode) => void;
  onSelectChannel: (channel: Channel) => void;
  onRemoveDownload: (item: DownloadedItem) => void;
  onShowInFolder: (item: DownloadedItem) => void;
  onUnsaveChannel: (channelId: string) => void;
  onLocateMissingFile: (item: DownloadedItem, newPath: string) => void;
  onReDownloadItem: (item: DownloadedItem) => void;
  onClearHistory: () => void;
  onNavigateToFind: () => void;
  onShowDiscreetToast: (msg: string) => void;
}

type DownloadSortOption = 'date-desc' | 'date-asc' | 'title-asc' | 'duration-desc' | 'size-desc';
type ChannelSortOption = 'name-asc' | 'episodes-desc' | 'author-asc';
type HistorySortOption = 'recent' | 'title-asc';

export const LibraryView: React.FC<LibraryViewProps> = ({
  native = false,
  isOffline = false,
  downloadedItems,
  savedChannels, initialTab = 'downloaded', savingChannel = false,
  recentlyPlayed,
  playback,
  onPlayDownloadedItem,
  onPlayChannelLatest,
  onResumeRecentlyPlayed,
  onPlayNext,
  onAddToQueue,
  onSelectEpisodeDetails,
  onSelectChannel,
  onRemoveDownload,
  onShowInFolder,
  onUnsaveChannel,
  onLocateMissingFile,
  onReDownloadItem,
  onClearHistory,
  onNavigateToFind,
  onShowDiscreetToast,
}) => {
  // Tabs State
  const [activeTab, setActiveTab] = useState<LibraryTab>(initialTab);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadSort, setDownloadSort] = useState<DownloadSortOption>('date-desc');
  const [channelSort, setChannelSort] = useState<ChannelSortOption>('name-asc');
  const [historySort, setHistorySort] = useState<HistorySortOption>('recent');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [filterMissingOnly, setFilterMissingOnly] = useState(false);

  // File Menu State
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Modals State
  const [itemToRemove, setItemToRemove] = useState<DownloadedItem | null>(null);
  const [itemToLocate, setItemToLocate] = useState<DownloadedItem | null>(null);

  const sortDropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(e.target as Node)
      ) {
        setIsSortDropdownOpen(false);
      }
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node)
      ) {
        setActiveMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered & Sorted Downloaded Items
  const filteredDownloadedItems = useMemo(() => {
    let result = [...downloadedItems];

    if (filterMissingOnly) {
      result = result.filter((item) => item.isMissingFile);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.channelTitle.toLowerCase().includes(q) ||
          (item.artist && item.artist.toLowerCase().includes(q))
      );
    }

    if (downloadSort === 'date-desc') return sortByDateAdded(result, 'newest');
    if (downloadSort === 'date-asc') return sortByDateAdded(result, 'oldest');

    result.sort((a, b) => {
      switch (downloadSort) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'duration-desc':
          return b.durationSeconds - a.durationSeconds;
        case 'size-desc':
          return (b.fileSizeBytes || 0) - (a.fileSizeBytes || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [downloadedItems, searchQuery, downloadSort, filterMissingOnly]);

  // Filtered & Sorted Saved Channels
  const filteredSavedChannels = useMemo(() => {
    let result = [...savedChannels];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.author.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      switch (channelSort) {
        case 'episodes-desc':
          return b.episodesCount - a.episodesCount;
        case 'author-asc':
          return a.author.localeCompare(b.author);
        case 'name-asc':
        default:
          return a.title.localeCompare(b.title);
      }
    });

    return result;
  }, [savedChannels, searchQuery, channelSort]);

  // Filtered & Sorted Recently Played
  const filteredRecentlyPlayed = useMemo(() => {
    let result = [...recentlyPlayed];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.title.toLowerCase().includes(q) ||
          item.channelTitle.toLowerCase().includes(q) ||
          item.artist.toLowerCase().includes(q)
      );
    }

    if (historySort === 'title-asc') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [recentlyPlayed, searchQuery, historySort]);

  // Total downloaded size
  const totalDownloadedMB = useMemo(() => {
    return downloadedItems
      .reduce((acc, cur) => {
        const num = parseFloat(cur.fileSizeFormatted.replace(' MB', '')) || 0;
        return acc + num;
      }, 0)
      .toFixed(1);
  }, [downloadedItems]);

  const missingFilesCount = useMemo(() => {
    return downloadedItems.filter((i) => i.isMissingFile).length;
  }, [downloadedItems]);

  // Pagination State (max 10 items per page across all parts)
  const ITEMS_PER_PAGE = 10;
  const [pageDownloaded, setPageDownloaded] = useState(1);
  const [pageSavedChannels, setPageSavedChannels] = useState(1);
  const [pageRecentlyPlayed, setPageRecentlyPlayed] = useState(1);

  // Reset page when searching, sorting or filtering
  useEffect(() => {
    setPageDownloaded(1);
  }, [searchQuery, downloadSort, filterMissingOnly]);

  useEffect(() => {
    setPageSavedChannels(1);
  }, [searchQuery, channelSort]);

  useEffect(() => {
    setPageRecentlyPlayed(1);
  }, [searchQuery, historySort]);

  // Paginated Slices & Safe Pages
  const totalDownloadedPages = Math.max(1, Math.ceil(filteredDownloadedItems.length / ITEMS_PER_PAGE));
  const safePageDownloaded = Math.min(Math.max(1, pageDownloaded), totalDownloadedPages);
  const paginatedDownloadedItems = useMemo(() => {
    const start = (safePageDownloaded - 1) * ITEMS_PER_PAGE;
    return filteredDownloadedItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredDownloadedItems, safePageDownloaded]);

  const totalSavedChannelsPages = Math.max(1, Math.ceil(filteredSavedChannels.length / ITEMS_PER_PAGE));
  const safePageSavedChannels = Math.min(Math.max(1, pageSavedChannels), totalSavedChannelsPages);
  const paginatedSavedChannels = useMemo(() => {
    const start = (safePageSavedChannels - 1) * ITEMS_PER_PAGE;
    return filteredSavedChannels.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSavedChannels, safePageSavedChannels]);

  const totalRecentlyPlayedPages = Math.max(1, Math.ceil(filteredRecentlyPlayed.length / ITEMS_PER_PAGE));
  const safePageRecentlyPlayed = Math.min(Math.max(1, pageRecentlyPlayed), totalRecentlyPlayedPages);
  const paginatedRecentlyPlayed = useMemo(() => {
    const start = (safePageRecentlyPlayed - 1) * ITEMS_PER_PAGE;
    return filteredRecentlyPlayed.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecentlyPlayed, safePageRecentlyPlayed]);

  // Reusable Pagination Controls Renderer
  const renderPagination = (
    currentPage: number,
    totalPages: number,
    totalItems: number,
    itemLabel: string,
    onPageChange: (newPage: number) => void
  ) => {
    if (totalItems === 0 || totalPages <= 1) return null;

    const startItem = (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalItems);

    return (
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-5 mt-6 border-t border-[var(--app-border)]/80 text-xs text-[var(--app-text-secondary)]">
        <span className="font-normal">
          Showing <span className="font-semibold text-[var(--app-text-primary)]">{startItem}–{endItem}</span> of{' '}
          <span className="font-semibold text-[var(--app-text-primary)]">{totalItems}</span> {itemLabel}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            aria-label={`Previous ${itemLabel} page`}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Prev</span>
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                type="button"
                onClick={() => onPageChange(pageNum)}
                className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer flex items-center justify-center ${
                  currentPage === pageNum
                    ? 'bg-[var(--app-accent)] text-white shadow-xs font-semibold'
                    : 'border border-[var(--app-border)] text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={currentPage === pageNum ? 'page' : undefined}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-2.5 py-1.5 rounded-lg border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
            aria-label={`Next ${itemLabel} page`}
          >
            <span>Next</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 pt-9 pb-36 select-none animate-in fade-in duration-150">
      {/* Editorial Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-[var(--app-text-primary)]">
            Your library
          </h1>
        </div>

        {/* Missing File Indicator Pill (Demo toggle) */}
        {missingFilesCount > 0 && activeTab === 'downloaded' && (
          <button
            type="button"
            onClick={() => setFilterMissingOnly((prev) => !prev)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer self-start sm:self-auto ${
              filterMissingOnly
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 font-semibold'
                : 'bg-amber-500/10 border-amber-500/25 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Filter by missing local files"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {filterMissingOnly
                ? `Showing ${missingFilesCount} missing file(s)`
                : `${missingFilesCount} missing file(s) on disk`}
            </span>
          </button>
        )}
      </div>

      {/* Tabs & Search Toolbar */}
      <div className="flex flex-col justify-between gap-4 mb-6">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-8 border-b border-[var(--app-border)] overflow-x-auto">
          <button
            type="button"
            onClick={() => {
              setActiveTab('downloaded');
              setSearchQuery('');
            }}
            className={`px-2 py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'downloaded'
                ? 'border-[var(--app-accent)] text-[var(--app-accent)]'
                : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'
            }`}
          >
            <span>Downloaded</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('saved-channels');
              setSearchQuery('');
            }}
            className={`px-2 py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'saved-channels'
                ? 'border-[var(--app-accent)] text-[var(--app-accent)]'
                : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'
            }`}
          >
            <span>Saved channels</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('recently-played');
              setSearchQuery('');
            }}
            className={`px-2 py-3 border-b-2 text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${
              activeTab === 'recently-played'
                ? 'border-[var(--app-accent)] text-[var(--app-accent)]'
                : 'border-transparent text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)]'
            }`}
          >
            <span>Recently played</span>
          </button>
        </div>

        {/* Right Controls: Search & Sort */}
        <div className="flex w-full items-center gap-4">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[var(--app-text-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={activeTab === 'downloaded' ? 'Search your library...' : `Search ${activeTab.replace('-', ' ')}...`}
              className="w-full pl-11 pr-8 py-3 rounded-lg text-sm bg-[var(--app-input-bg)] border border-[var(--app-input-border)] text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] focus:outline-hidden focus:border-[var(--app-accent)] transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative" ref={sortDropdownRef}>
            <button
              type="button"
              onClick={() => setIsSortDropdownOpen((prev) => !prev)}
              className="h-12 px-4 rounded-lg border border-[var(--app-border)] hover:border-[var(--app-accent)] text-sm font-medium text-[var(--app-text-primary)] flex items-center gap-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <span className="text-[var(--app-text-secondary)] hidden sm:inline">Sort by</span>
              <span>
                {activeTab === 'downloaded' &&
                  (downloadSort === 'date-desc'
                    ? 'Recently added'
                    : downloadSort === 'title-asc'
                    ? 'Title A–Z'
                    : downloadSort === 'duration-desc'
                    ? 'Duration'
                    : downloadSort === 'size-desc'
                    ? 'File size'
                    : 'Oldest first')}
                {activeTab === 'saved-channels' &&
                  (channelSort === 'name-asc'
                    ? 'Channel name'
                    : channelSort === 'episodes-desc'
                    ? 'Most episodes'
                    : 'Author')}
                {activeTab === 'recently-played' &&
                  (historySort === 'recent' ? 'Recently played' : 'Title A–Z')}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[var(--app-text-secondary)]" />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 py-1 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-30 animate-in fade-in-50 zoom-in-95 duration-100">
                {activeTab === 'downloaded' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadSort('date-desc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Recently added</span>
                      {downloadSort === 'date-desc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadSort('date-asc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Date added (oldest)</span>
                      {downloadSort === 'date-asc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadSort('title-asc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Title (A–Z)</span>
                      {downloadSort === 'title-asc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadSort('duration-desc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Duration (longest)</span>
                      {downloadSort === 'duration-desc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadSort('size-desc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>File size (largest)</span>
                      {downloadSort === 'size-desc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                  </>
                )}

                {activeTab === 'saved-channels' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setChannelSort('name-asc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Channel name (A–Z)</span>
                      {channelSort === 'name-asc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChannelSort('episodes-desc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Most episodes</span>
                      {channelSort === 'episodes-desc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setChannelSort('author-asc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Author (A–Z)</span>
                      {channelSort === 'author-asc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                  </>
                )}

                {activeTab === 'recently-played' && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySort('recent');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Recently played</span>
                      {historySort === 'recent' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setHistorySort('title-asc');
                        setIsSortDropdownOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center justify-between text-[var(--app-text-primary)] cursor-pointer"
                    >
                      <span>Title (A–Z)</span>
                      {historySort === 'title-asc' && <Check className="w-3.5 h-3.5 text-[var(--app-accent)]" />}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {isOffline && activeTab === 'downloaded' && (
        <div className="flex items-center gap-3 px-6 py-4 mb-4 rounded-xl bg-[var(--app-input-bg)] text-sm text-[var(--app-text-secondary)]" role="status">
          <WifiOff className="w-5 h-5 shrink-0" aria-hidden="true" />
          <span>You're offline. Your downloads are ready to play.</span>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: DOWNLOADED EPISODES */}
      {/* ============================================================== */}
      {activeTab === 'downloaded' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Downloaded List */}
          {filteredDownloadedItems.length > 0 ? (
            <div>
              <div className="border-y border-[var(--app-border)] overflow-visible divide-y divide-[var(--app-border)]">
            {paginatedDownloadedItems.map((item) => {
                  const isPlayingThisItem =
                    playback.currentTrackTitle === item.title && playback.isPlaying;

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between py-2 gap-3.5 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors ${
                      item.isMissingFile ? 'bg-amber-500/5' : ''
                    }`}
                  >
                    {/* Left: Thumbnail & Episode Info */}
                    <div className="flex items-start sm:items-center gap-3.5 min-w-0 flex-1">
                      {/* Artwork Thumbnail */}
                      <div className="w-[84px] h-[80px] rounded-lg overflow-hidden shrink-0 border border-[var(--app-border)]/40 shadow-xs relative">
                        <ArtworkImage artworkKey={item.artworkKey} live={Boolean(item.artworkUrl)} artworkUrl={item.artworkUrl} alt={item.title} />
                        {item.isMissingFile && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-amber-400">
                            <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                          </div>
                        )}
                      </div>

                      {/* Title & Metadata */}
                      <div className="min-w-0 pr-2 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => {
                              onSelectEpisodeDetails({
                                id: item.episodeId || item.id,
                                episodeNumber: item.episodeNumber || 1,
                                title: item.title,
                                artist: item.artist || item.channelTitle,
                                date: item.date,
                                durationSeconds: item.durationSeconds,
                                durationFormatted: item.durationFormatted,
                                fileSizeFormatted: item.fileSizeFormatted,
                                artworkKey: item.artworkKey,
                                isDownloaded: true,
                              });
                            }}
                            className="font-semibold text-base sm:text-lg text-[var(--app-text-primary)] hover:text-[var(--app-accent)] transition-colors truncate text-left cursor-pointer"
                          >
                            {item.title === 'Almost' && item.artist ? `${item.title} — ${item.artist}` : item.title}
                          </button>
                        </div>

                        {/* Metadata row */}
                        <div className="text-xs text-[var(--app-text-secondary)] mt-0.5 sm:mt-1 flex items-center gap-1.5 flex-wrap truncate font-normal">
                          <span>{item.channelTitle}</span>
                          {item.episodeNumber !== undefined && (
                            <>
                              <span aria-hidden="true" className="opacity-50">·</span>
                              <span>#{item.episodeNumber}</span>
                            </>
                          )}
                          <span aria-hidden="true" className="opacity-50">·</span>
                          <span>{item.date}</span>
                        </div>

                        {isPlayingThisItem && playback.currentTime > 0 && (
                          <div className="mt-2 flex items-center gap-3 max-w-[520px]">
                            <div className="h-1 flex-1 rounded-full bg-[var(--app-rail)] overflow-hidden"><div className="h-full bg-[var(--app-accent)]" style={{ width: `${Math.min(100, playback.currentTime / playback.duration * 100)}%` }} /></div>
                            <span className="text-xs text-[var(--app-accent)] whitespace-nowrap">{(() => { const seconds = Math.max(0, Math.floor(playback.duration - playback.currentTime)); return `Continue · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')} left`; })()}</span>
                          </div>
                        )}

                        {/* Missing File Indicator / Warning */}
                        {item.isMissingFile ? (
                          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span className="font-medium">File missing from disk</span>
                            <span className="text-[var(--app-text-muted)] hidden md:inline truncate max-w-xs">
                              ({item.filePath})
                            </span>
                            <button
                              type="button"
                              onClick={() => setItemToLocate(item)}
                              className="ml-1 text-[var(--app-accent)] underline hover:text-[var(--color-brand-orange-hover)] font-medium cursor-pointer"
                            >
                              Locate file
                            </button>
                            <span aria-hidden="true" className="opacity-40">·</span>
                            <button
                              type="button"
                              onClick={() => onReDownloadItem(item)}
                              className="text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] underline cursor-pointer"
                            >
                              Re-download
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Right: duration, downloaded status and actions */}
                    <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                      <div className="hidden sm:flex flex-col w-16 text-left text-sm text-[var(--app-text-primary)]">
                        <span>{item.durationFormatted}</span>
                        <span className="text-[var(--app-text-secondary)]">{item.fileSizeFormatted}</span>
                      </div>
                      <span className="w-8 h-8 rounded-full bg-[var(--app-accent)] text-white flex items-center justify-center" aria-label="Downloaded"><Check className="w-4 h-4 stroke-[2.5]" /></span>
                      {/* Play / Pause Button */}
                      <button
                        type="button"
                        onClick={() => onPlayDownloadedItem(item)}
                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer bg-black/5 dark:bg-white/10 text-[var(--app-text-primary)] hover:bg-[var(--app-accent)] hover:text-white"
                        title="Play track"
                        aria-label={`Play ${item.title}`}
                      >
                        <Play className="w-4 h-4 fill-current stroke-none ml-0.5" />
                      </button>

                      {/* Interactive File Menu (Illustrated Action Menu) */}
                      <div className="relative" ref={activeMenuId === item.id ? menuRef : null}>
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuId(activeMenuId === item.id ? null : item.id)
                          }
                          className="w-9 h-9 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
                          title="File actions menu"
                          aria-label={`File menu for ${item.title}`}
                        >
                          <MoreHorizontal className="w-4.5 h-4.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuId === item.id && (
                          <div className="absolute right-0 top-full mt-1.5 w-56 py-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-30 animate-in fade-in-50 zoom-in-95 duration-100 divide-y divide-[var(--app-border)]">
                            <div className="py-1">
                              {/* Play next */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onPlayNext({
                                    title: item.title,
                                    subtitle: `${item.channelTitle} · ${item.durationFormatted}`,
                                    artist: item.artist || item.channelTitle,
                                    channelTitle: item.channelTitle,
                                    artworkKey: item.artworkKey,
                                    durationFormatted: item.durationFormatted,
                                    durationSeconds: item.durationSeconds,
                                  });
                                  onShowDiscreetToast(`"${item.title}" will play next`);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 text-[var(--app-text-primary)] cursor-pointer"
                              >
                                <ListPlus className="w-3.5 h-3.5 text-[var(--app-text-secondary)]" />
                                <span>Play next</span>
                              </button>

                              {/* Add to queue */}
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onAddToQueue({
                                    title: item.title,
                                    subtitle: `${item.channelTitle} · ${item.durationFormatted}`,
                                    artist: item.artist || item.channelTitle,
                                    channelTitle: item.channelTitle,
                                    artworkKey: item.artworkKey,
                                    durationFormatted: item.durationFormatted,
                                    durationSeconds: item.durationSeconds,
                                  });
                                  onShowDiscreetToast(`Added "${item.title}" to queue`);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 text-[var(--app-text-primary)] cursor-pointer"
                              >
                                <ListMusic className="w-3.5 h-3.5 text-[var(--app-text-secondary)]" />
                                <span>Add to listening queue</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  onShowInFolder(item);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2.5 text-[var(--app-text-primary)] cursor-pointer"
                              >
                                <Folder className="w-3.5 h-3.5 text-[var(--app-text-secondary)]" />
                                <span>Show in folder</span>
                              </button>

                            </div>

                            {/* Remove Download */}
                            <div className="py-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setItemToRemove(item);
                                }}
                                className="w-full text-left px-3.5 py-1.5 text-xs hover:bg-red-500/10 flex items-center gap-2.5 text-red-600 dark:text-red-400 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Remove from library...</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
              );
            })}
            </div>
            <div className="pt-4 text-sm text-[var(--app-text-secondary)]">
              {filteredDownloadedItems.length} episodes · {totalDownloadedMB} MB on this device
            </div>
            {renderPagination(
              safePageDownloaded,
              totalDownloadedPages,
              filteredDownloadedItems.length,
              'episodes',
              setPageDownloaded
            )}
          </div>
          ) : (
            /* Empty State */
            <div className="text-center py-16 px-4 border border-dashed border-[var(--app-border)] rounded-2xl bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 mx-auto flex items-center justify-center text-[var(--app-text-secondary)] mb-4">
                <ArrowDownToLine className="w-7 h-7 stroke-[1.7]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[var(--app-text-primary)]">
                {searchQuery ? 'No matching downloads' : 'No downloaded episodes yet'}
              </h3>
              <p className="text-sm text-[var(--app-text-secondary)] max-w-sm mx-auto mt-1.5">
                {searchQuery
                  ? `No downloaded episodes match "${searchQuery}". Clear your search to view all.`
                  : 'Episodes you download from channels will appear here ready for offline listening.'}
              </p>
              <div className="mt-6 flex items-center justify-center gap-3">
                {searchQuery ? (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="px-4 py-2 rounded-xl text-xs font-medium border border-[var(--app-border)] text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    Clear Search
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onNavigateToFind}
                    className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--app-accent)] hover:bg-[var(--color-brand-orange-hover)] text-white transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
                  >
                    <Compass className="w-3.5 h-3.5" />
                    <span>Browse Channels to Download</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: SAVED CHANNELS */}
      {/* ============================================================== */}
      {activeTab === 'saved-channels' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Metadata Bar */}
          {savedChannels.length > 0 && (
            <div className="flex items-center justify-between text-xs text-[var(--app-text-secondary)] mb-3 pb-2 border-b border-[var(--app-border)]/60">
              <div className="flex items-center gap-2">
                <span>
                  {filteredSavedChannels.length}{' '}
                  {filteredSavedChannels.length === 1 ? 'channel saved' : 'channels saved'}
                </span>
                {totalSavedChannelsPages > 1 && (
                  <>
                    <span aria-hidden="true" className="opacity-40">·</span>
                    <span className="font-mono text-[var(--app-text-muted)]">
                      Page {safePageSavedChannels} of {totalSavedChannelsPages}
                    </span>
                  </>
                )}
              </div>
              <div className="text-[11px] text-[var(--app-text-muted)]">
                Removing a saved channel preserves its downloaded episodes
              </div>
            </div>
          )}

          {filteredSavedChannels.length > 0 ? (
            <div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedSavedChannels.map((channel) => (
                <div
                  key={channel.id}
                  className="p-4 rounded-2xl border border-[var(--app-border)] bg-[var(--app-card-bg,var(--app-bg))] hover:border-[var(--app-accent)]/40 transition-all flex flex-col justify-between gap-4 group"
                >
                  <div className="flex items-start gap-4">
                    {/* Artwork */}
                    <div
                      onClick={() => onSelectChannel(channel)}
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden shrink-0 border border-[var(--app-border)]/40 shadow-xs cursor-pointer group-hover:opacity-95 transition-opacity"
                    >
                      <ArtworkImage artworkKey={channel.artworkKey} live={channel.source === 'castbox'} artworkUrl={channel.artworkUrl} alt={channel.title} />
                    </div>

                    {/* Channel Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectChannel(channel)}
                          className="font-serif font-bold text-base sm:text-lg text-[var(--app-text-primary)] hover:text-[var(--app-accent)] transition-colors truncate text-left cursor-pointer"
                        >
                          {channel.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            onUnsaveChannel(channel.id);
                            if (channel.source !== 'castbox') onShowDiscreetToast(`Removed "${channel.title}" from saved channels (downloads preserved)`);
                          }}
                          className="p-1 text-[var(--app-accent)] hover:text-red-500 transition-colors cursor-pointer"
                          disabled={savingChannel}
                          aria-busy={savingChannel}
                          title="Unsave channel (preserves downloads)"
                          aria-label={`Unsave ${channel.title}`}
                        >
                          <BookmarkCheck className="w-4.5 h-4.5" />
                        </button>
                      </div>

                      <div className="text-xs text-[var(--app-text-secondary)] mt-0.5 font-normal">
                        {channel.author}
                      </div>

                      <p className="text-xs text-[var(--app-text-muted)] line-clamp-2 mt-1.5 leading-relaxed font-normal">
                        {channel.description}
                      </p>
                    </div>
                  </div>

                  {/* Channel Footer Actions */}
                  <div className="pt-3 border-t border-[var(--app-border)]/60 flex items-center justify-between text-xs text-[var(--app-text-secondary)]">
                    <span className="font-mono">{channel.episodeCountUnknown ? '—' : channel.episodesCount} episodes</span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onPlayChannelLatest(channel)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-black/5 dark:bg-white/10 hover:bg-[var(--app-accent)] hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                        title="Play latest episode"
                      >
                        <Play className="w-3 h-3 fill-current stroke-none" />
                        <span>Play</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSelectChannel(channel)}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium border border-[var(--app-border)] hover:border-[var(--app-accent)] text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                      >
                        View Channel
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {renderPagination(
              safePageSavedChannels,
              totalSavedChannelsPages,
              filteredSavedChannels.length,
              'channels',
              setPageSavedChannels
            )}
          </div>
          ) : (
            /* Empty Saved Channels */
            <div className="text-center py-16 px-4 border border-dashed border-[var(--app-border)] rounded-2xl bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 mx-auto flex items-center justify-center text-[var(--app-text-secondary)] mb-4">
                <Bookmark className="w-7 h-7 stroke-[1.7]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[var(--app-text-primary)]">
                {searchQuery ? 'No matching saved channels' : 'No saved channels yet'}
              </h3>
              <p className="text-sm text-[var(--app-text-secondary)] max-w-sm mx-auto mt-1.5">
                {searchQuery
                  ? `No saved channels match "${searchQuery}".`
                  : 'Bookmark your favorite podcasts so you can easily return to their latest episodes.'}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={onNavigateToFind}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--app-accent)] hover:bg-[var(--color-brand-orange-hover)] text-white transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Discover Channels</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: RECENTLY PLAYED */}
      {/* ============================================================== */}
      {activeTab === 'recently-played' && (
        <div className="space-y-4 animate-in fade-in duration-150">
          {/* Metadata Bar */}
          {recentlyPlayed.length > 0 && (
            <div className="flex items-center justify-between text-xs text-[var(--app-text-secondary)] mb-3 pb-2 border-b border-[var(--app-border)]/60">
              <div className="flex items-center gap-2">
                <span>
                  {filteredRecentlyPlayed.length}{' '}
                  {filteredRecentlyPlayed.length === 1 ? 'item in history' : 'items in history'}
                </span>
                {totalRecentlyPlayedPages > 1 && (
                  <>
                    <span aria-hidden="true" className="opacity-40">·</span>
                    <span className="font-mono text-[var(--app-text-muted)]">
                      Page {safePageRecentlyPlayed} of {totalRecentlyPlayedPages}
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={onClearHistory}
                className="text-[var(--app-text-muted)] hover:text-red-500 transition-colors cursor-pointer text-xs"
              >
                Clear History
              </button>
            </div>
          )}

          {filteredRecentlyPlayed.length > 0 ? (
            <div>
              <div className="border border-[var(--app-border)] rounded-2xl overflow-hidden bg-[var(--app-card-bg,var(--app-bg))] divide-y divide-[var(--app-border)]">
                {paginatedRecentlyPlayed.map((item) => {
                  const isPlayingThisItem =
                    playback.currentTrackTitle === item.title && playback.isPlaying;

                const percent = Math.min(
                  100,
                  Math.round((item.playedSeconds / (item.durationSeconds || 1)) * 100)
                );

                return (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 gap-3.5 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
                  >
                    {/* Left: Thumbnail & Track Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-[var(--app-border)]/40 shadow-xs">
                        <ArtworkImage artworkKey={item.artworkKey} live={Boolean(item.artworkUrl)} artworkUrl={item.artworkUrl} alt={item.title} />
                      </div>

                      <div className="min-w-0 pr-2 flex-1">
                        <h4 className="font-semibold text-sm sm:text-base text-[var(--app-text-primary)] truncate">
                          {item.title}
                        </h4>
                        <div className="text-xs text-[var(--app-text-secondary)] mt-0.5 flex items-center gap-1.5 flex-wrap font-normal">
                          <span>{item.channelTitle}</span>
                          <span aria-hidden="true" className="opacity-50">·</span>
                          <span>{item.artist}</span>
                          <span aria-hidden="true" className="opacity-50">·</span>
                          <span className="text-[var(--app-text-muted)]">{item.lastPlayedText}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="mt-2 flex items-center gap-2 max-w-xs">
                          <div className="h-1 flex-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[var(--app-accent)] rounded-full"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-mono text-[var(--app-text-muted)] shrink-0">
                            {item.completed
                              ? 'Finished'
                                : `${Math.floor(item.playedSeconds / 60)}:${Math.floor(
                                  item.playedSeconds % 60
                                )
                                  .toString()
                                  .padStart(2, '0')} / ${item.durationFormatted}`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Resume/Play Action */}
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => onResumeRecentlyPlayed(item)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                          isPlayingThisItem
                            ? 'bg-[var(--app-accent)] text-white shadow-sm'
                            : 'bg-black/5 dark:bg-white/10 text-[var(--app-text-primary)] hover:bg-[var(--app-accent)] hover:text-white'
                        }`}
                        title={isPlayingThisItem ? 'Pause playback' : 'Resume playback'}
                      >
                        {isPlayingThisItem ? (
                          <>
                            <Pause className="w-3.5 h-3.5 fill-current stroke-none" />
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current stroke-none" />
                            <span>{item.completed ? 'Replay' : 'Resume'}</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onPlayNext({
                            title: item.title,
                            subtitle: `${item.channelTitle} · ${item.durationFormatted}`,
                            artist: item.artist,
                            channelTitle: item.channelTitle,
                            artworkKey: item.artworkKey,
                            durationFormatted: item.durationFormatted,
                            durationSeconds: item.durationSeconds,
                          });
                          onShowDiscreetToast(`"${item.title}" will play next`);
                        }}
                        className="p-2 rounded-xl text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Play next"
                        aria-label={`Play next: ${item.title}`}
                      >
                        <ListPlus className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          onAddToQueue({
                            title: item.title,
                            subtitle: `${item.channelTitle} · ${item.durationFormatted}`,
                            artist: item.artist,
                            channelTitle: item.channelTitle,
                            artworkKey: item.artworkKey,
                            durationFormatted: item.durationFormatted,
                            durationSeconds: item.durationSeconds,
                          });
                          onShowDiscreetToast(`Added "${item.title}" to queue`);
                        }}
                        className="p-2 rounded-xl text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                        title="Add to queue"
                        aria-label={`Add to queue: ${item.title}`}
                      >
                        <ListMusic className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {renderPagination(
              safePageRecentlyPlayed,
              totalRecentlyPlayedPages,
              filteredRecentlyPlayed.length,
              'items',
              setPageRecentlyPlayed
            )}
          </div>
          ) : (
            /* Empty Recently Played */
            <div className="text-center py-16 px-4 border border-dashed border-[var(--app-border)] rounded-2xl bg-black/[0.01] dark:bg-white/[0.01]">
              <div className="w-14 h-14 rounded-2xl bg-black/5 dark:bg-white/5 mx-auto flex items-center justify-center text-[var(--app-text-secondary)] mb-4">
                <Headphones className="w-7 h-7 stroke-[1.7]" />
              </div>
              <h3 className="font-serif text-xl font-bold text-[var(--app-text-primary)]">
                {searchQuery ? 'No matching history' : 'No listening history yet'}
              </h3>
              <p className="text-sm text-[var(--app-text-secondary)] max-w-sm mx-auto mt-1.5">
                Episodes you play will automatically appear here so you can pick up right where you left off.
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  onClick={onNavigateToFind}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--app-accent)] hover:bg-[var(--color-brand-orange-hover)] text-white transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Start Listening</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal for Removing Download */}
      {itemToRemove && (
        <RemoveDownloadModal
          item={itemToRemove}
          isOpen={Boolean(itemToRemove)}
          onClose={() => setItemToRemove(null)}
          onConfirmRemove={(item) => {
            onRemoveDownload(item);
            setItemToRemove(null);
            onShowDiscreetToast(`Removed "${item.title}" from downloaded files`);
          }}
        />
      )}

      {/* Locate Missing File Modal */}
      {itemToLocate && (
        <LocateFileModal
          item={itemToLocate}
          isOpen={Boolean(itemToLocate)}
          native={native}
          onClose={() => setItemToLocate(null)}
          onLocateSuccess={(item, newPath) => {
            onLocateMissingFile(item, newPath);
            onShowDiscreetToast(`Linked "${item.title}" to local path: ${newPath}`);
          }}
          onReDownload={(item) => {
            onReDownloadItem(item);
            onShowDiscreetToast(native ? `Opening episode details for "${item.title}".` : `Re-downloading "${item.title}"...`);
          }}
        />
      )}
    </div>
  );
};
