import React from 'react';
import { Check, Download } from 'lucide-react';

interface BulkSelectionBarProps {
  onClearSelection?: () => void;
  selectedCount: number;
  totalVisibleCount: number;
  totalChannelCount: number;
  isAllVisibleSelected: boolean;
  onToggleSelectVisible: () => void;
  onSelectThisPage: () => void;
  onSelectAllEpisodes: () => void;
  onDownloadSelected: () => void;
}

export const BulkSelectionBar: React.FC<BulkSelectionBarProps> = ({
  selectedCount, onClearSelection,
  totalChannelCount,
  isAllVisibleSelected,
  onToggleSelectVisible,
  onSelectThisPage,
  onSelectAllEpisodes,
  onDownloadSelected,
}) => {
  return (
    <div className="sticky bottom-[96px] sm:bottom-[100px] z-30 w-full bg-[var(--app-input-bg)]/95 backdrop-blur-md border border-[var(--app-border)] rounded-2xl p-3 sm:px-5 sm:py-3.5 flex flex-wrap items-center justify-between gap-4 mt-6 shadow-lg shadow-black/5 dark:shadow-black/25 select-none transition-all">
      {/* Left Selection Controls */}
      <div className="flex items-center flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
        {/* Master Checkbox */}
        <button
          type="button"
          onClick={onToggleSelectVisible}
          className={`w-5 h-5 rounded-md flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            selectedCount > 0
              ? 'bg-[var(--app-accent)] border border-[var(--app-accent)] text-white shadow-xs'
              : 'border border-[var(--app-border)] bg-transparent hover:border-[var(--app-accent)]'
          }`}
          aria-label="Toggle visible selection"
          aria-checked={isAllVisibleSelected}
          role="checkbox"
        >
          {selectedCount > 0 && <Check className="w-3.5 h-3.5 stroke-[3]" />}
        </button>

        {/* Selected Count Indicator */}
        <span className="font-semibold text-[var(--app-text-primary)]">
          {selectedCount} selected
        </span>

        {/* Vertical Hairline Divider */}
        <span className="text-[var(--app-border)] font-light" aria-hidden="true">
          |
        </span>

        {/* Select this page action */}
        <button
          type="button"
          onClick={onSelectThisPage}
          className="text-xs font-medium text-[var(--app-accent)] hover:opacity-80 underline underline-offset-2 transition-opacity cursor-pointer"
        >
          Select this page
        </button>

        {onClearSelection && selectedCount > 0 && <button type="button" onClick={onClearSelection} className="text-xs text-[var(--app-text-secondary)] hover:underline cursor-pointer">Clear selection</button>}
        {/* Select all episodes action */}
        <button
          type="button"
          onClick={onSelectAllEpisodes}
          className="text-xs font-normal text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:underline transition-colors cursor-pointer"
        >
          Select all {totalChannelCount} episodes
        </button>
      </div>

      {/* Right Primary Bulk Download Action */}
      <button
        type="button"
        onClick={onDownloadSelected}
        disabled={selectedCount === 0}
        className="px-5 py-2.5 bg-[var(--app-accent)] hover:bg-[#A94516] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm shrink-0"
      >
        <Download className="w-4 h-4 stroke-[2.2]" />
        <span>
          Download {selectedCount} {selectedCount === 1 ? 'episode' : 'episodes'}
        </span>
      </button>
    </div>
  );
};
