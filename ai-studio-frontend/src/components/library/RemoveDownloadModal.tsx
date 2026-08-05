import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { DownloadedItem } from '../../types';

interface RemoveDownloadModalProps {
  item: DownloadedItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirmRemove: (item: DownloadedItem) => void;
}

export const RemoveDownloadModal: React.FC<RemoveDownloadModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirmRemove,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-download-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-2xl p-6 text-[var(--app-text-primary)] animate-in zoom-in-95 duration-150"
      >
        {/* Header Icon + Close */}
        <div className="flex items-start justify-between gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertTriangle className="w-6 h-6 stroke-[2]" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4">
          <h3
            id="remove-download-title"
            className="font-serif text-xl font-bold text-[var(--app-text-primary)]"
          >
            Remove episode from library?
          </h3>
          <p className="mt-2 text-sm text-[var(--app-text-secondary)] leading-relaxed">
            Are you sure you want to hide <strong className="text-[var(--app-text-primary)] font-medium">"{item.title}"</strong> from your app library? The audio file will remain in its folder.
          </p>

          <div className="mt-3.5 p-3 rounded-xl bg-black/5 dark:bg-white/5 border border-[var(--app-border)] text-xs text-[var(--app-text-secondary)] space-y-1">
            <div className="flex items-center justify-between">
              <span>File size:</span>
              <span className="font-mono text-[var(--app-text-primary)]">{item.fileSizeFormatted}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Channel:</span>
              <span className="text-[var(--app-text-primary)] truncate max-w-[200px]">{item.channelTitle}</span>
            </div>
            <p className="pt-1.5 border-t border-[var(--app-border)]/50 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
              ✓ The audio file, listening progress and saved channel will be preserved.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-[var(--app-border)] text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onConfirmRemove(item)}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition-colors cursor-pointer flex items-center gap-2 shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Remove from library</span>
          </button>
        </div>
      </div>
    </div>
  );
};
