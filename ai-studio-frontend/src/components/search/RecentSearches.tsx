import React from 'react';
import { Clock } from 'lucide-react';

interface RecentSearchesProps {
  searches: string[];
  onSelectSearch: (term: string) => void;
  onClearAll: () => void;
}

export const RecentSearches: React.FC<RecentSearchesProps> = ({
  searches,
  onSelectSearch,
  onClearAll,
}) => {
  if (searches.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-2.5 pt-3">
      <span className="text-sm font-semibold text-[var(--app-text-primary)] mr-1">
        Recent searches
      </span>

      {searches.map((term) => (
        <button
          key={term}
          onClick={() => onSelectSearch(term)}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-normal border border-[var(--app-border)] bg-[var(--app-input-bg)]/40 hover:bg-[var(--app-input-bg)] text-[var(--app-text-primary)] transition-all cursor-pointer"
        >
          <Clock className="w-3.5 h-3.5 text-[var(--app-text-muted)]" />
          <span>{term}</span>
        </button>
      ))}

      <button
        onClick={onClearAll}
        className="text-xs font-medium text-[var(--app-accent)] hover:underline ml-1 px-1 py-1 transition-colors cursor-pointer"
      >
        Clear
      </button>
    </div>
  );
};
