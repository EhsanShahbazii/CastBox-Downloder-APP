import React from 'react';
import { Search, X } from 'lucide-react';

interface SearchBarProps {
  query: string;
  onChangeQuery: (newQuery: string) => void;
  onSubmitSearch: (searchQuery?: string) => void;
  onClearQuery: () => void;
  isLoading?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  query,
  onChangeQuery,
  onSubmitSearch,
  onClearQuery,
  isLoading = false,
}) => {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitSearch();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full flex items-center gap-3">
      {/* Input container */}
      <div className="relative flex-1 flex items-center">
        <div className="absolute left-4.5 pointer-events-none flex items-center justify-center">
          <Search className="w-5 h-5 text-[var(--app-text-muted)] stroke-[1.9]" />
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => onChangeQuery(e.target.value)}
          placeholder="Search for a channel or paste a Castbox link..."
          className="w-full h-13 pl-12 pr-11 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] text-[var(--app-text-primary)] placeholder-[var(--app-text-muted)] rounded-xl text-base outline-none focus:border-[var(--app-accent)] focus:ring-1 focus:ring-[var(--app-accent)]/30 transition-all font-sans"
        />

        {query.length > 0 && (
          <button
            type="button"
            onClick={onClearQuery}
            className="absolute right-4 p-1 rounded-md text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
            aria-label="Clear search input"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        )}
      </div>

      {/* Primary Action Search Button */}
      <button
        type="submit"
        disabled={isLoading}
        className="h-13 px-6 bg-[var(--app-accent)] hover:bg-[#A94516] active:scale-[0.98] text-white font-medium text-base rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm shrink-0 disabled:opacity-70"
      >
        <Search className="w-4 h-4 stroke-[2.2]" />
        <span>{isLoading ? 'Searching...' : 'Search'}</span>
      </button>
    </form>
  );
};
