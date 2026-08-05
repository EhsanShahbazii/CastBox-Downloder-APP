import React, { useState, useId, useEffect, useRef } from 'react';
import {
  X,
  Folder,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Check,
  Download,
  AlertCircle,
} from 'lucide-react';
import { Channel, Episode } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface BulkDownloadReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedEpisodes: Episode[];
  channel: Channel;
  onConfirmQueue: (config: {
    episodes: Episode[];
    destinationPath: string;
    filenameFormat: string;
    concurrency: number;
    skipDuplicates: boolean;
  }) => void;
}

const SUPPORTED_TOKENS = ['{channel}', '{title}', '{date}', '{eid}'];

function formatDateToIso(dateStr: string): string {
  // 'Oct 6, 2026' -> '2026-10-06'
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
  };
  const parts = dateStr.replace(',', '').split(' ');
  if (parts.length === 3 && months[parts[0]]) {
    const month = months[parts[0]];
    const day = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${year}-${month}-${day}`;
  }
  return '2026-10-06';
}

export const BulkDownloadReviewModal: React.FC<BulkDownloadReviewModalProps> = ({
  isOpen,
  onClose,
  selectedEpisodes,
  channel,
  onConfirmQueue,
}) => {
  const [destinationPath, setDestinationPath] = useState('Downloads / Castbox / ' + channel.title);
  const [filenameFormat, setFilenameFormat] = useState('{date} - {title}');
  const [concurrency, setConcurrency] = useState<number>(3);
  const [isConcurrencyOpen, setIsConcurrencyOpen] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [isEditingDestination, setIsEditingDestination] = useState(false);
  const [tempDestination, setTempDestination] = useState(destinationPath);

  // Pagination for selected episodes (max 5 per page)
  const ITEMS_PER_PAGE = 5;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [isOpen, selectedEpisodes.length]);

  const totalPages = Math.max(1, Math.ceil(selectedEpisodes.length / ITEMS_PER_PAGE));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = Math.min(startIndex + ITEMS_PER_PAGE, selectedEpisodes.length);
  const paginatedEpisodes = selectedEpisodes.slice(startIndex, endIndex);

  const modalRef = useRef<HTMLDivElement>(null);
  const concurrencyDropdownRef = useRef<HTMLDivElement>(null);
  const destinationEditRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Focus management & Escape key handling
  useEffect(() => {
    if (!isOpen) return;

    previousActiveElementRef.current = document.activeElement as HTMLElement | null;

    // Focus the modal or first focusable element
    const timer = setTimeout(() => {
      modalRef.current?.focus();
    }, 50);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditingDestination) {
          setIsEditingDestination(false);
          return;
        }
        if (isConcurrencyOpen) {
          setIsConcurrencyOpen(false);
          return;
        }
        onClose();
        return;
      }

      // Tab key trap inside modal
      if (e.key === 'Tab' && modalRef.current) {
        const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      previousActiveElementRef.current?.focus();
    };
  }, [isOpen, onClose, isEditingDestination, isConcurrencyOpen]);

  // Click outside concurrency dropdown & destination edit
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        concurrencyDropdownRef.current &&
        !concurrencyDropdownRef.current.contains(e.target as Node)
      ) {
        setIsConcurrencyOpen(false);
      }
      if (
        destinationEditRef.current &&
        !destinationEditRef.current.contains(e.target as Node)
      ) {
        setIsEditingDestination(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Validate filename template tokens
  const tokenRegex = /\{([^}]+)\}/g;
  const foundTokens = filenameFormat.match(tokenRegex) || [];
  const invalidTokens = foundTokens.filter(
    (token) => !SUPPORTED_TOKENS.includes(token.toLowerCase())
  );
  const hasTokenError = invalidTokens.length > 0;

  // Compute live preview based on first selected episode
  const previewSample = selectedEpisodes[0] || {
    title: 'Almost',
    date: 'Oct 6, 2026',
    episodeNumber: 280,
  };

  const computePreviewFilename = () => {
    if (hasTokenError) return '';
    let name = filenameFormat;
    name = name.replace(/\{channel\}/gi, channel.title);
    name = name.replace(/\{title\}/gi, previewSample.title);
    name = name.replace(/\{date\}/gi, formatDateToIso(previewSample.date));
    name = name.replace(/\{eid\}/gi, previewSample.episodeNumber.toString());
    return `${name.trim() || 'episode'}.mp3`;
  };

  // Calculate total size
  const totalSizeMB = selectedEpisodes
    .reduce((sum, ep) => {
      const match = ep.fileSizeFormatted.match(/([\d.]+)/);
      return sum + (match ? parseFloat(match[1]) : 8.0);
    }, 0)
    .toFixed(1);

  const handleQueueSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasTokenError) return;
    onConfirmQueue({
      episodes: selectedEpisodes,
      destinationPath,
      filenameFormat,
      concurrency,
      skipDuplicates,
    });
  };

  const handleOpenEditDestination = () => {
    setTempDestination(destinationPath);
    setIsEditingDestination(true);
  };

  const handleSaveDestination = () => {
    if (tempDestination.trim()) {
      setDestinationPath(tempDestination.trim());
    }
    setIsEditingDestination(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-review-title"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[760px] -translate-y-5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-2xl p-6 sm:p-7 relative animate-in zoom-in-95 duration-150 select-none max-h-[92vh] flex flex-col"
      >
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 rounded-lg text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5 stroke-[1.8]" />
        </button>

        {/* Dialog Header */}
        <div className="pr-8">
          <h2
            id="bulk-review-title"
            className="font-serif font-bold text-2xl sm:text-[28px] text-[var(--app-text-primary)] leading-tight"
          >
            Review downloads
          </h2>
          <div className="text-xs sm:text-[13px] text-[var(--app-text-secondary)] mt-1 font-normal flex items-center gap-1.5">
            <span>{selectedEpisodes.length} episodes selected</span>
            <span aria-hidden="true">·</span>
            <span>{channel.title}</span>
          </div>
        </div>

        {/* Scrollable Container */}
        <div className="overflow-y-auto mt-4 pr-1 flex-1 flex flex-col gap-3">
          {/* Configuration Form Controls (Moved Up) */}
          <form onSubmit={handleQueueSubmit} className="order-2 space-y-3.5 pt-1">
            {/* Field: Destination */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4 relative" ref={destinationEditRef}>
              <label className="text-sm font-normal text-[var(--app-text-primary)] w-40 shrink-0 pt-2 sm:pt-2.5">
                Destination
              </label>
              <div className="flex-1 min-w-0">
                {!isEditingDestination ? (
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-10 px-3 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] rounded-lg flex items-center gap-2.5 text-xs text-[var(--app-text-primary)] min-w-0">
                      <Folder className="w-4 h-4 text-[var(--app-text-secondary)] shrink-0" />
                      <span className="truncate">{destinationPath}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleOpenEditDestination}
                      className="h-10 px-3.5 border border-[#C05322]/40 text-[var(--app-accent)] hover:border-[var(--app-accent)] hover:bg-[var(--app-accent)]/5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="p-3 bg-[var(--app-input-bg)] border border-[var(--app-accent)] rounded-xl space-y-2.5 animate-in fade-in duration-100">
                    <div className="text-xs font-semibold text-[var(--app-text-primary)]">
                      Download folder
                    </div>
                    <input
                      type="text"
                      value={tempDestination}
                      onChange={(e) => setTempDestination(e.target.value)}
                      className="w-full h-9 px-3 bg-[var(--app-bg)] border border-[var(--app-input-border)] rounded-lg text-xs text-[var(--app-text-primary)] outline-none focus:border-[var(--app-accent)] font-mono"
                      placeholder="Folder path..."
                      autoFocus
                    />
                    <div className="flex flex-wrap gap-1.5 pt-0.5">
                      {[
                        `Downloads / Castbox / ${channel.title}`,
                        `Music / Podcasts / ${channel.title}`,
                        `Media / Podcasts / ${channel.title}`,
                      ].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setTempDestination(preset)}
                          className="text-[11px] px-2 py-1 bg-black/5 dark:bg-white/5 hover:bg-[var(--app-accent)]/10 text-[var(--app-text-secondary)] hover:text-[var(--app-accent)] rounded transition-colors cursor-pointer"
                        >
                          {preset.split(' / ')[0]}
                        </button>
                      ))}
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingDestination(false)}
                        className="px-2.5 py-1 text-xs text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveDestination}
                        className="px-3 py-1 bg-[var(--app-accent)] text-white text-xs font-medium rounded-lg hover:bg-[#A94516] cursor-pointer"
                      >
                        Set path
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Field: Filename Format */}
            <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4">
              <label className="text-sm font-normal text-[var(--app-text-primary)] w-40 shrink-0 pt-2">
                Filename format
              </label>
              <div className="flex-1">
                <input
                  type="text"
                  value={filenameFormat}
                  onChange={(e) => setFilenameFormat(e.target.value)}
                  placeholder="{date} - {title}"
                  className={`w-full h-10 px-3 bg-[var(--app-input-bg)] border ${
                    hasTokenError
                      ? 'border-red-500 focus:ring-red-400'
                      : 'border-[var(--app-input-border)] focus:border-[var(--app-accent)]'
                  } rounded-lg text-sm text-[var(--app-text-primary)] outline-none font-mono text-xs transition-colors`}
                />

                {/* Inline Error or Live Preview */}
                {hasTokenError ? (
                  <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5 font-sans">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Unknown token {invalidTokens.join(', ')}. Supported:{' '}
                      {SUPPORTED_TOKENS.join(', ')}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-[var(--app-text-secondary)] mt-1.5 font-normal">
                    Preview: <span className="font-mono text-[var(--app-text-primary)]">{computePreviewFilename()}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Field: Concurrent Downloads */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 relative" ref={concurrencyDropdownRef}>
              <label className="text-sm font-normal text-[var(--app-text-primary)] w-40 shrink-0">
                Workers
              </label>
              <div className="flex-1 relative">
                <button
                  type="button"
                  onClick={() => setIsConcurrencyOpen(!isConcurrencyOpen)}
                  className="h-10 px-3.5 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] hover:border-[var(--app-accent)] rounded-lg text-xs sm:text-sm text-[var(--app-text-primary)] flex items-center justify-between w-44 transition-colors cursor-pointer"
                  aria-haspopup="listbox"
                  aria-expanded={isConcurrencyOpen}
                >
                  <span>
                    {concurrency === 1 ? '1 worker · sequential' : `${concurrency} workers`}
                  </span>
                  <ChevronDown className="w-4 h-4 opacity-70" />
                </button>

                {/* Concurrency Dropdown Menu */}
                {isConcurrencyOpen && (
                  <div className="absolute left-0 bottom-full mb-1 w-48 py-1 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-50">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => {
                          setConcurrency(num);
                          setIsConcurrencyOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                          concurrency === num
                            ? 'text-[var(--app-accent)] bg-black/5 dark:bg-white/5 font-semibold'
                            : 'text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        <span>{num === 1 ? '1 worker · sequential' : `${num} workers`}</span>
                        {concurrency === num && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Field: Skip Already Downloaded Option */}
            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-4.5 h-4.5 rounded-md flex items-center justify-center transition-colors shrink-0 mt-0.5 ${
                    skipDuplicates
                      ? 'bg-[var(--app-accent)] text-white'
                      : 'border border-[var(--app-border)] bg-transparent'
                  }`}
                >
                  {skipDuplicates && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
                <div>
                  <div className="text-sm font-normal text-[var(--app-text-primary)] leading-tight">
                    Skip episodes already downloaded
                  </div>
                  <div className="text-xs text-[var(--app-text-secondary)] mt-0.5 font-normal">
                    You can keep listening while these download.
                  </div>
                </div>
              </label>
            </div>
          </form>

          {/* Download Count & Estimated Size Summary */}
          <div className="order-3 border-t border-[var(--app-border)] pt-3 pb-1">
            <div className="font-semibold text-sm text-[var(--app-text-primary)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span>{selectedEpisodes.length} new downloads</span>
                <span aria-hidden="true">·</span>
                <span>{totalSizeMB} MB</span>
              </div>
              {selectedEpisodes.length > 5 && (
                <div className="text-xs font-normal text-[var(--app-text-secondary)]">
                  Page {safeCurrentPage} of {totalPages}
                </div>
              )}
            </div>
          </div>

          {/* Selected Episodes Section (Moved Down with 5-Item Pagination) */}
          <div className="order-1 border-t border-[var(--app-border)] pt-2 space-y-2">
            <div className="flex items-center justify-between text-xs text-[var(--app-text-secondary)] font-medium">
              <span>Selected episodes ({selectedEpisodes.length})</span>
              <span>Showing max 5 per page</span>
            </div>

            {/* Episode Items List (Max 5 items) */}
            <div className="divide-y divide-[var(--app-border)] border border-[var(--app-border)]/70 rounded-xl overflow-hidden bg-[var(--app-input-bg)]/30">
              {paginatedEpisodes.map((ep) => (
                <div
                  key={ep.id}
                  className="p-3 flex items-center justify-between gap-3 text-xs sm:text-sm hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-[80px] h-[76px] rounded-lg overflow-hidden shrink-0 border border-[var(--app-border)]/40 shadow-xs">
                      <ArtworkImage artworkKey={ep.artworkKey} alt={ep.title} />
                    </div>
                    <div className="min-w-0 pr-2">
                      <h4 className="font-semibold text-sm text-[var(--app-text-primary)] truncate">
                        {ep.title}
                      </h4>
                      <div className="text-xs text-[var(--app-text-secondary)] mt-0.5 flex items-center gap-1.5">
                        <span>#{ep.episodeNumber}</span>
                        <span aria-hidden="true" className="opacity-60">·</span>
                        <span>{ep.date}</span>
                      </div>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-[var(--app-text-secondary)] tabular-nums shrink-0">
                    {ep.fileSizeFormatted}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 ? (
              <div className="flex items-center justify-between pt-2 pb-1 text-xs text-[var(--app-text-secondary)] select-none">
                <span>
                  Showing <span className="font-medium text-[var(--app-text-primary)]">{startIndex + 1}–{endIndex}</span> of <span className="font-medium text-[var(--app-text-primary)]">{selectedEpisodes.length}</span> episodes
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={safeCurrentPage === 1}
                    className="px-2.5 py-1 rounded-lg border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>Prev</span>
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
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
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safeCurrentPage === totalPages}
                    className="px-2.5 py-1 rounded-lg border border-[var(--app-border)] text-xs font-medium text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer flex items-center gap-1"
                    aria-label="Next page"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="hidden text-[11px] text-[var(--app-text-secondary)] text-right pt-1">
                Showing all {selectedEpisodes.length} selected {selectedEpisodes.length === 1 ? 'episode' : 'episodes'}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions Row */}
        <div className="flex items-center justify-end gap-3 pt-5 mt-3 border-t border-[var(--app-border)]">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-[var(--app-border)] text-sm font-medium text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleQueueSubmit}
            disabled={hasTokenError || selectedEpisodes.length === 0}
            className="px-5 py-2.5 rounded-xl bg-[var(--app-accent)] hover:bg-[#A94516] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.2]" />
            <span>
              Queue {selectedEpisodes.length} {selectedEpisodes.length === 1 ? 'download' : 'downloads'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
