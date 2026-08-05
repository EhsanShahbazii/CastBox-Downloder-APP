import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, Folder, RefreshCw, X, Check } from 'lucide-react';
import { DownloadedItem } from '../../types';

interface LocateFileModalProps {
  item: DownloadedItem;
  isOpen: boolean;
  native?: boolean;
  onClose: () => void;
  onLocateSuccess: (item: DownloadedItem, newPath: string) => void;
  onReDownload: (item: DownloadedItem) => void;
}

export const LocateFileModal: React.FC<LocateFileModalProps> = ({
  item,
  isOpen,
  native = false,
  onClose,
  onLocateSuccess,
  onReDownload,
}) => {
  const [selectedPath, setSelectedPath] = useState(
    `~/Downloads/Castbox/${item.channelTitle}/${item.title}.mp3`
  );
  const dialogRef = useRef<HTMLDivElement>(null);

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
      aria-labelledby="locate-file-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-2xl p-6 text-[var(--app-text-primary)] animate-in zoom-in-95 duration-150"
      >
        {/* Header Icon + Close */}
        <div className="flex items-start justify-between gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/20">
            <AlertCircle className="w-6 h-6 stroke-[2]" />
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
            id="locate-file-title"
            className="font-serif text-xl font-bold text-[var(--app-text-primary)]"
          >
            Locate Missing Audio File
          </h3>
          <p className="mt-2 text-sm text-[var(--app-text-secondary)] leading-relaxed">
            The audio file for <strong className="text-[var(--app-text-primary)] font-medium">"{item.title}"</strong> could not be found at its recorded path:
          </p>

          <div className="mt-3 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 font-mono text-xs text-red-600 dark:text-red-400 break-all">
            {item.filePath}
          </div>

          {native ? (
            <p className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-sm text-[var(--app-text-secondary)]">
              This build can detect missing files, but cannot relink an existing file. Re-download this episode to restore it to your library.
            </p>
          ) : <div className="mt-4 space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--app-text-muted)]">
              Specify New Local File Path
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={selectedPath}
                onChange={(e) => setSelectedPath(e.target.value)}
                className="flex-1 px-3 py-2 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] rounded-xl text-sm font-mono text-[var(--app-text-primary)] focus:outline-hidden focus:border-[var(--app-accent)] transition-colors"
                placeholder="/path/to/downloaded/file.mp3"
              />
              <button
                type="button"
                onClick={() =>
                  setSelectedPath(
                    `/Users/listener/Music/Castbox/${item.channelTitle}/${item.title}.mp3`
                  )
                }
                className="px-3 py-2 border border-[var(--app-border)] rounded-xl text-xs font-medium hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 shrink-0 cursor-pointer"
                title="Simulate browsing for file"
              >
                <Folder className="w-3.5 h-3.5 text-[var(--app-text-secondary)]" />
                <span>Browse...</span>
              </button>
            </div>
          </div>}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[var(--app-border)]">
          <button
            type="button"
            onClick={() => {
              onReDownload(item);
              onClose();
            }}
            className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-medium border border-[var(--app-border)] hover:border-[var(--app-accent)] text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[var(--app-accent)]" />
            <span>Re-download Episode</span>
          </button>

          <div className="w-full sm:w-auto flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium border border-[var(--app-border)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {!native && <button
              type="button"
              onClick={() => {
                onLocateSuccess(item, selectedPath);
                onClose();
              }}
              className="px-4 py-2 rounded-xl text-xs font-medium bg-[var(--app-accent)] hover:bg-[var(--color-brand-orange-hover)] text-white transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs"
            >
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Link File</span>
            </button>}
          </div>
        </div>
      </div>
    </div>
  );
};
