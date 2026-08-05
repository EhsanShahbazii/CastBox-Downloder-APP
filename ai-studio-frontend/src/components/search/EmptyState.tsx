import React from 'react';
import { Compass } from 'lucide-react';

interface EmptyStateProps {
  query: string;
  onResetToDefault: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  query,
  onResetToDefault,
}) => {
  return (
    <div className="py-16 text-center max-w-md mx-auto">
      <div className="w-12 h-12 rounded-full bg-[var(--app-input-bg)] border border-[var(--app-border)] mx-auto flex items-center justify-center text-[var(--app-text-muted)] mb-4">
        <Compass className="w-6 h-6 stroke-[1.8]" />
      </div>
      <h3 className="font-serif font-bold text-xl text-[var(--app-text-primary)]">
        No channels found
      </h3>
      <p className="text-xs text-[var(--app-text-secondary)] mt-2 leading-relaxed">
        We couldn&apos;t find any podcasts matching &ldquo;{query}&rdquo;. Check the spelling or search for popular topics like <button onClick={onResetToDefault} className="text-[var(--app-accent)] underline underline-offset-2 hover:opacity-80">coffee</button>.
      </p>
    </div>
  );
};
