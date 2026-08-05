import React from 'react';

export const LoadingState: React.FC = () => {
  return (
    <div className="space-y-4 py-2 animate-pulse" aria-label="Loading search results">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between py-4.5 border-b border-[var(--app-border)]"
        >
          <div className="flex items-center gap-5 flex-1">
            <div className="w-23 h-23 sm:w-[92px] sm:h-[92px] rounded-lg bg-[var(--app-border)]/50 shrink-0" />
            <div className="space-y-2.5 flex-1 max-w-lg">
              <div className="h-5 bg-[var(--app-border)]/60 rounded w-1/3" />
              <div className="h-3 bg-[var(--app-border)]/40 rounded w-1/4" />
              <div className="h-3 bg-[var(--app-border)]/30 rounded w-3/4" />
            </div>
          </div>
          <div className="h-4 bg-[var(--app-border)]/40 rounded w-16" />
        </div>
      ))}
    </div>
  );
};
