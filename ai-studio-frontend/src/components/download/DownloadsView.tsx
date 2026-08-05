import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Pause,
  Play,
  X,
  RotateCw,
  Folder,
  ChevronDown,
  Check,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Wifi,
  WifiOff,
  Trash2,
  ExternalLink,
  ArrowDownToLine,
  ListMusic,
} from 'lucide-react';
import { DownloadJob, DownloadFilter, DownloadStatus } from '../../types';
import { ArtworkImage } from '../artwork/ArtworkImage';

interface DownloadsViewProps {
  native?: boolean;
  jobs: DownloadJob[];
  concurrency: number;
  onChangeConcurrency: (val: number) => void;
  onPauseJob: (jobId: string) => void;
  onResumeJob: (jobId: string) => void;
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onPauseAll: () => void;
  onResumeAll: () => void;
  onRemoveCompleted: () => void;
  onChooseDestination?: () => void;
  destinationPath: string;
  onChangeDestination: (newPath: string) => void;
  isNetworkOffline: boolean;
  onToggleNetworkOffline: () => void;
  onNavigateToFind: () => void;
  onShowInFolder?: (job: DownloadJob) => void;
  onPlayCompleted?: (job: DownloadJob) => void;
  onAddCompletedToQueue?: (job: DownloadJob) => void;
}

export const DownloadsView: React.FC<DownloadsViewProps> = ({
  jobs,
  concurrency,
  onChangeConcurrency,
  onPauseJob,
  onResumeJob,
  onCancelJob,
  onRetryJob,
  onPauseAll,
  onResumeAll,
  onRemoveCompleted,
  destinationPath, onChooseDestination,
  onChangeDestination,
  native = false,
  isNetworkOffline,
  onToggleNetworkOffline,
  onNavigateToFind,
  onShowInFolder,
  onPlayCompleted,
  onAddCompletedToQueue,
}) => {
  const [activeFilter, setActiveFilter] = useState<DownloadFilter>('all');
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(
    new Set((native ? [] : jobs).filter(job => ['job-1', 'job-2', 'job-3'].includes(job.id)).map(job => job.id)) // Initial checked rows matching 03-downloads-dark.png & 12-downloads-light.png
  );
  const [selectionWasChanged, setSelectionWasChanged] = useState(false);
  const [isConcurrencyOpen, setIsConcurrencyOpen] = useState(false);
  const [activeMenuJobId, setActiveMenuJobId] = useState<string | null>(null);
  const [isChangingFolder, setIsChangingFolder] = useState(false);
  const [tempFolderInput, setTempFolderInput] = useState(destinationPath);

  const concurrencyDropdownRef = useRef<HTMLDivElement>(null);
  const folderDialogRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        concurrencyDropdownRef.current &&
        !concurrencyDropdownRef.current.contains(e.target as Node)
      ) {
        setIsConcurrencyOpen(false);
      }
      if (
        folderDialogRef.current &&
        !folderDialogRef.current.contains(e.target as Node)
      ) {
        setIsChangingFolder(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setSelectedJobIds(previous => new Set([...previous].filter(id => jobs.some(job => job.id === id)))); }, [jobs]);

  // Filter counts
  const counts = useMemo(() => {
    const active = jobs.filter((j) => j.status === 'downloading' || j.status === 'paused').length;
    const queued = jobs.filter((j) => j.status === 'queued').length;
    const completed = jobs.filter((j) => j.status === 'completed').length;
    const failed = jobs.filter((j) => j.status === 'failed').length;
    return {
      all: jobs.length,
      active,
      queued,
      completed,
      failed,
    };
  }, [jobs]);

  // Filtered jobs
  const filteredJobs = useMemo(() => {
    switch (activeFilter) {
      case 'active':
        return jobs.filter((j) => j.status === 'downloading' || j.status === 'paused');
      case 'queued':
        return jobs.filter((j) => j.status === 'queued');
      case 'completed':
        return jobs.filter((j) => j.status === 'completed');
      case 'failed':
        return jobs.filter((j) => j.status === 'failed');
      case 'all':
      default:
        return jobs;
    }
  }, [jobs, activeFilter]);

  // Check if all active jobs are currently paused
  const activeDownloadingCount = useMemo(
    () => jobs.filter((j) => j.status === 'downloading').length,
    [jobs]
  );
  const pausedCount = useMemo(
    () => jobs.filter((j) => j.status === 'paused').length,
    [jobs]
  );

  const isAllPaused = activeDownloadingCount === 0 && pausedCount > 0;

  // Toggle selection of a row
  const handleToggleSelectRow = (id: string) => {
    setSelectionWasChanged(true);
    setSelectedJobIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all or deselect all
  const handleSelectAllVisible = () => {
    setSelectionWasChanged(true);
    if (selectedJobIds.size === filteredJobs.length && filteredJobs.length > 0) {
      setSelectedJobIds(new Set());
    } else {
      setSelectedJobIds(new Set(filteredJobs.map((j) => j.id)));
    }
  };

  // Bulk actions on selected rows
  const handleCancelSelected = () => {
    selectedJobIds.forEach((id) => onCancelJob(id));
    setSelectedJobIds(new Set());
  };

  const handlePauseSelected = () => {
    selectedJobIds.forEach((id) => {
      const job = jobs.find((j) => j.id === id);
      if (job && job.status === 'downloading') {
        onPauseJob(id);
      }
    });
  };

  const handleResumeSelected = () => {
    selectedJobIds.forEach((id) => {
      const job = jobs.find((j) => j.id === id);
      if (job && (job.status === 'paused' || job.status === 'failed')) {
        onResumeJob(id);
      }
    });
  };

  const handleSaveNewFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempFolderInput.trim()) {
      onChangeDestination(tempFolderInput.trim());
    }
    setIsChangingFolder(false);
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-6 pt-9 pb-36 select-none animate-in fade-in duration-150">
      {/* Top Editorial Heading (matching 03-downloads-dark.png & 12-downloads-light.png) */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-[var(--app-text-primary)]">
            Downloads
          </h1>
          <p className="text-sm sm:text-base text-[var(--app-text-secondary)] mt-1.5 font-normal">
            Your listening, ready to go.
          </p>
        </div>

        {/* Network State Simulator Pill */}
        <button
          type="button"
          hidden={native || !isNetworkOffline}
          onClick={onToggleNetworkOffline}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors cursor-pointer self-start sm:self-auto ${
            isNetworkOffline
              ? 'bg-amber-500/10 border-amber-500/40 text-amber-600 dark:text-amber-400'
              : 'border-[var(--app-border)] text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
          }`}
          title={native ? 'Transfer connectivity is reported per download' : 'Toggle network connectivity simulation to test waiting-for-network state'}
        >
          {isNetworkOffline ? (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>Offline (Simulated)</span>
            </>
          ) : (
            <>
              <Wifi className="w-3.5 h-3.5 text-emerald-500" />
              <span>Online</span>
            </>
          )}
        </button>
      </div>

      {/* Waiting for Network Banner */}
      {isNetworkOffline && (
        <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs sm:text-sm text-amber-700 dark:text-amber-300 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2.5">
            <WifiOff className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span className="font-medium">
              Waiting for network connection... Active downloads are paused.
            </span>
          </div>
          <button
            type="button"
            hidden={native}
          onClick={onToggleNetworkOffline}
            className="px-3 py-1 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 transition-colors shrink-0 cursor-pointer"
          >
            Reconnect
          </button>
        </div>
      )}

      {/* Filters & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Left Filter Pill Tabs */}
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          {(
            [
              { key: 'all', label: `All (${counts.all})` },
              { key: 'active', label: `Active (${counts.active})` },
              { key: 'queued', label: `Queued (${counts.queued})` },
              { key: 'completed', label: `Completed (${counts.completed})` },
              { key: 'failed', label: `Failed (${counts.failed})` },
            ] as const
          ).map((tab) => {
            const isActive = activeFilter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveFilter(tab.key)}
                className={`px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-black/10 dark:bg-white/10 text-[var(--app-text-primary)] font-semibold shadow-2xs'
                    : 'text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Right Action Controls: Concurrency & Pause All */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {/* Concurrency Dropdown */}
          <div className="relative" ref={concurrencyDropdownRef}>
            <button
              type="button"
              onClick={() => setIsConcurrencyOpen(!isConcurrencyOpen)}
              className="h-10 px-3.5 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] hover:border-[var(--app-accent)] rounded-xl text-xs sm:text-sm text-[var(--app-text-primary)] font-medium flex items-center justify-between gap-2.5 transition-colors cursor-pointer"
              aria-haspopup="listbox"
              aria-expanded={isConcurrencyOpen}
              title="Download workers"
            >
              <span>{concurrency} {concurrency === 1 ? 'worker' : 'workers'}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>

            {/* Dropdown Options */}
            {isConcurrencyOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 py-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-30 animate-in fade-in-50 zoom-in-95 duration-100">
                <div className="px-3 py-1 text-[11px] font-semibold text-[var(--app-text-muted)] uppercase tracking-wider">
                  Workers
                </div>
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => {
                      onChangeConcurrency(num);
                      setIsConcurrencyOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs font-medium text-left transition-colors cursor-pointer ${
                      concurrency === num
                        ? 'text-[var(--app-accent)] bg-black/5 dark:bg-white/5 font-semibold'
                        : 'text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    <span>
                      {num === 1 ? '1 worker · sequential' : `${num} workers`}
                    </span>
                    {concurrency === num && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Pause All / Resume All Button */}
          <button
            type="button"
            onClick={isAllPaused ? onResumeAll : onPauseAll}
            disabled={!jobs.some(job => ['queued','downloading','paused'].includes(job.status))}
            className="h-10 px-4 bg-[var(--app-accent)] hover:bg-[#A94516] active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium rounded-xl flex items-center gap-2 shadow-xs transition-all cursor-pointer"
          >
            {isAllPaused ? (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Resume all</span>
              </>
            ) : (
              <>
                <Pause className="w-4 h-4 fill-white" />
                <span>Pause all</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Bulk Row Selection Bar (if any rows selected) */}
      {selectionWasChanged && selectedJobIds.size > 0 && (
        <div className="mb-4 px-4 py-2.5 bg-[var(--app-input-bg)] border border-[var(--app-border)] rounded-xl flex items-center justify-between gap-3 text-xs animate-in fade-in duration-100">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-[var(--app-text-primary)]">
              {selectedJobIds.size} selected
            </span>
            <span className="text-[var(--app-text-muted)]">·</span>
            <button
              type="button"
              onClick={handleSelectAllVisible}
              className="text-[var(--app-accent)] hover:underline cursor-pointer"
            >
              {selectedJobIds.size === filteredJobs.length ? 'Deselect all' : 'Select all visible'}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePauseSelected}
              className="px-2.5 py-1 rounded-lg border border-[var(--app-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--app-text-primary)] transition-colors cursor-pointer"
            >
              Pause
            </button>
            <button
              type="button"
              onClick={handleResumeSelected}
              className="px-2.5 py-1 rounded-lg border border-[var(--app-border)] hover:bg-black/5 dark:hover:bg-white/5 text-[var(--app-text-primary)] transition-colors cursor-pointer"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={handleCancelSelected}
              className="px-2.5 py-1 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Transfer Rows List */}
      {filteredJobs.length > 0 ? (
        <div className="border-t border-b border-[var(--app-border)] divide-y divide-[var(--app-border)]">
          {filteredJobs.map((job) => {
            const isSelected = selectedJobIds.has(job.id);
            const isDownloading = job.status === 'downloading' && !isNetworkOffline;
            const isPaused = job.status === 'paused' || (job.status === 'downloading' && isNetworkOffline);
            const isQueued = job.status === 'queued';
            const isCompleted = job.status === 'completed';
            const isFailed = job.status === 'failed';

            return (
              <div
                key={job.id}
                className="py-3.5 sm:py-4 flex items-center justify-between gap-3 sm:gap-6 hover:bg-black/[0.015] dark:hover:bg-white/[0.015] transition-colors"
              >
                {/* Left Area: Checkbox + Artwork + Meta */}
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  {/* Row Checkbox */}
                  <button
                    type="button"
                    onClick={() => handleToggleSelectRow(job.id)}
                    className="p-1 -m-1 cursor-pointer shrink-0"
                    aria-label={`Select ${job.title}`}
                  >
                    <div
                      className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                        isSelected
                          ? 'bg-[var(--app-accent)] text-white shadow-2xs'
                          : 'border border-[var(--app-border)] bg-transparent hover:border-[var(--app-accent)]'
                      }`}
                    >
                      {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </button>

                  {/* Artwork Thumbnail */}
                  <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-xl overflow-hidden shrink-0 border border-[var(--app-border)]/40 shadow-xs">
                    <ArtworkImage artworkKey={job.artworkKey} artworkUrl={job.artworkUrl} live={job.source === 'castbox'} alt={job.title} />
                  </div>

                  {/* Title and Metadata */}
                  <div className="min-w-0 pr-2">
                    <h3 className="font-semibold text-sm sm:text-base text-[var(--app-text-primary)] truncate">
                      {job.title}
                    </h3>
                    <div className="text-xs text-[var(--app-text-secondary)] mt-0.5 sm:mt-1 flex items-center gap-1.5 flex-wrap truncate font-normal">
                      <span>{job.channelTitle}</span>
                      {job.episodeNumber !== undefined && (
                        <>
                          <span aria-hidden="true" className="opacity-50">·</span>
                          <span>#{job.episodeNumber}</span>
                        </>
                      )}
                      <span aria-hidden="true" className="opacity-50">·</span>
                      <span>{job.date}</span>
                    </div>
                  </div>
                </div>

                {/* Middle Area: Progress / Status Indicator */}
                <div className="w-48 sm:w-64 md:w-80 shrink-0 px-2">
                  {/* 1. Downloading State */}
                  {isDownloading && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-[var(--app-text-primary)] font-normal mb-1">
                        <span>Downloading</span>
                        <span className="font-medium text-[var(--app-text-primary)]">
                          {job.totalUnknown ? 'Size unknown' : `${Math.round(job.progressPercent)}%`}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--app-accent)] rounded-full transition-all duration-300"
                          style={{ width: `${job.progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-[var(--app-text-secondary)] mt-1 flex items-center justify-between font-normal">
                        <span>
                          {job.downloadedMB.toFixed(1)} / {job.totalUnknown ? '?' : job.totalMB.toFixed(1)} MB
                        </span>
                        <span>{job.speedMBs.toFixed(1)} MB/s</span>
                      </div>
                    </div>
                  )}

                  {/* 2. Paused State / Waiting for Network State */}
                  {isPaused && (
                    <div>
                      <div className="flex items-center justify-between text-xs text-[var(--app-text-secondary)] font-normal mb-1">
                        <span>{job.needsGrant ? 'Paused · choose folder to resume' : isNetworkOffline ? 'Waiting for network...' : 'Paused'}</span>
                        <span className="font-medium">{job.totalUnknown ? 'Size unknown' : `${Math.round(job.progressPercent)}%`}</span>
                      </div>
                      <div className="h-1.5 w-full bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--app-accent)]/50 rounded-full transition-all duration-300"
                          style={{ width: `${job.progressPercent}%` }}
                        />
                      </div>
                      <div className="text-[11px] text-[var(--app-text-secondary)] mt-1 flex items-center justify-between font-normal">
                        <span>
                          {job.downloadedMB.toFixed(1)} / {job.totalUnknown ? '?' : job.totalMB.toFixed(1)} MB
                        </span>
                        <span>{isNetworkOffline ? 'Paused' : 'Paused'}</span>
                      </div>
                    </div>
                  )}

                  {/* 3. Queued State (Corrected: uses neutral clock icon, never checkmark) */}
                  {isQueued && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center text-[var(--app-text-secondary)]">
                        <Clock className="w-4 h-4 stroke-[2]" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-[var(--app-text-primary)]">
                          Queued
                        </div>
                        <div className="text-[11px] text-[var(--app-text-secondary)] font-normal">
                          Waiting to download...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 4. Completed State (Success checkmark) */}
                  {isCompleted && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-500">
                          Completed
                        </div>
                        <div className="text-[11px] text-[var(--app-text-secondary)] font-normal">
                          {job.totalMB.toFixed(1)} MB · {job.completedAt || 'Oct 7, 2026, 9:14 AM'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 5. Failed State */}
                  {isFailed && (
                    <div className="flex items-center gap-2.5">
                      <div className="w-5 h-5 rounded-full bg-red-600 flex items-center justify-center text-white shrink-0">
                        <AlertCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                      <div>
                        <div className="text-xs sm:text-sm font-semibold text-red-600 dark:text-red-500">
                          Failed
                        </div>
                        <div className="text-[11px] text-[var(--app-text-secondary)] font-normal">
                          {job.errorMessage || 'Connection interrupted'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  {/* Right Area: Action Placement matching references */}
                  <div className="flex items-center gap-2 shrink-0">
                  {isCompleted && onPlayCompleted && <button type="button" onClick={() => onPlayCompleted(job)} className="w-9 h-9 rounded-full bg-[var(--app-accent)] text-white flex items-center justify-center hover:opacity-90 cursor-pointer" title="Play downloaded episode" aria-label={`Play ${job.title}`}><Play className="w-4 h-4 fill-current ml-0.5" /></button>}
                  {/* Downloading Action Buttons: Pause & Cancel */}
                  {isDownloading && (
                    <>
                      <button
                        type="button"
                        onClick={() => onPauseJob(job.id)}
                        className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-[var(--app-text-primary)] transition-colors cursor-pointer"
                        title="Pause download"
                        aria-label={`Pause ${job.title}`}
                      >
                        <Pause className="w-4 h-4 fill-current" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelJob(job.id)}
                        className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
                        title="Cancel download"
                        aria-label={`Cancel ${job.title}`}
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </>
                  )}

                  {/* Paused Action Buttons: Resume & Cancel */}
                  {isPaused && (
                    <>
                      <button
                        type="button"
                        onClick={() => onResumeJob(job.id)}
                        className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 flex items-center justify-center text-[var(--app-text-primary)] transition-colors cursor-pointer"
                        title="Resume download"
                        aria-label={`Resume ${job.title}`}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelJob(job.id)}
                        className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
                        title="Cancel download"
                        aria-label={`Cancel ${job.title}`}
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </>
                  )}

                  {/* Queued Action Buttons: Clock indicator & Cancel */}
                  {isQueued && (
                    <>
                      <div className="w-9 h-9 flex items-center justify-center text-[var(--app-text-secondary)]">
                        <Clock className="w-4.5 h-4.5" />
                      </div>
                      <button
                        type="button"
                        onClick={() => onCancelJob(job.id)}
                        className="w-9 h-9 rounded-full hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
                        title="Cancel queued download"
                        aria-label={`Cancel ${job.title}`}
                      >
                        <X className="w-4.5 h-4.5" />
                      </button>
                    </>
                  )}

                  {/* Completed Action Buttons: "Show in folder" & Menu */}
                  {isCompleted && (
                    <div className="flex items-center gap-2 relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (onShowInFolder) {
                            onShowInFolder(job);
                          }
                        }}
                        className="h-9 px-3.5 rounded-xl border border-[var(--app-border)] hover:border-[var(--app-accent)] text-xs font-medium text-[var(--app-text-primary)] flex items-center gap-2 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        title="Show in downloaded folder"
                      >
                        <Folder className="w-4 h-4 text-[var(--app-text-secondary)]" />
                        <span className="hidden sm:inline">Show in folder</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuJobId(activeMenuJobId === job.id ? null : job.id)
                        }
                        className="w-9 h-9 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
                        title="More options"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="w-4.5 h-4.5" />
                      </button>

                      {/* Dropdown Menu for Completed */}
                      {activeMenuJobId === job.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 py-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-30 animate-in fade-in-50 zoom-in-95 duration-100">
                          {native && onAddCompletedToQueue && <button type="button" onClick={() => { onAddCompletedToQueue(job); setActiveMenuJobId(null); }} className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"><ListMusic className="w-3.5 h-3.5" /><span>Add to listening queue</span></button>}
                          <button
                            hidden={native}
                            type="button"
                            onClick={() => {
                              onRetryJob(job.id);
                              setActiveMenuJobId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-[var(--app-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                            <span>Redownload</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              onCancelJob(job.id);
                              setActiveMenuJobId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove from list</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Failed Action Buttons: "Retry" & Menu */}
                  {isFailed && (
                    <div className="flex items-center gap-2 relative">
                      <button
                        type="button"
                        onClick={() => onRetryJob(job.id)}
                        className="h-9 px-4 rounded-xl border border-[var(--app-accent)] text-[var(--app-accent)] hover:bg-[var(--app-accent)]/10 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer"
                        title="Retry download"
                      >
                        <RotateCw className="w-3.5 h-3.5 stroke-[2.2]" />
                        <span>Retry</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setActiveMenuJobId(activeMenuJobId === job.id ? null : job.id)
                        }
                        className="w-9 h-9 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] transition-colors cursor-pointer"
                        title="More options"
                        aria-label="More options"
                      >
                        <MoreHorizontal className="w-4.5 h-4.5" />
                      </button>

                      {/* Dropdown Menu for Failed */}
                      {activeMenuJobId === job.id && (
                        <div className="absolute right-0 top-full mt-1 w-44 py-1.5 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-xl shadow-xl z-30 animate-in fade-in-50 zoom-in-95 duration-100">
                          <button
                            type="button"
                            onClick={() => {
                              onCancelJob(job.id);
                              setActiveMenuJobId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3.5 py-2 text-xs text-red-500 hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Dismiss error</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 text-center border-t border-b border-[var(--app-border)]">
          <div className="w-12 h-12 rounded-2xl bg-[var(--app-input-bg)] border border-[var(--app-border)] flex items-center justify-center mx-auto mb-3.5 text-[var(--app-text-muted)]">
            <ArrowDownToLine className="w-6 h-6 stroke-[1.8]" />
          </div>
          <h3 className="font-serif font-bold text-lg text-[var(--app-text-primary)]">
            {activeFilter === 'all'
              ? 'No downloads yet'
              : `No ${activeFilter} downloads`}
          </h3>
          <p className="text-xs sm:text-sm text-[var(--app-text-secondary)] max-w-sm mx-auto mt-1 mb-5">
            {activeFilter === 'all'
              ? 'Search for podcast channels or episodes and queue them for offline listening.'
              : `There are currently no items in the "${activeFilter}" transfer queue.`}
          </p>
          <button
            type="button"
            onClick={onNavigateToFind}
            className="px-4 py-2 bg-[var(--app-accent)] text-white rounded-xl text-xs sm:text-sm font-medium hover:bg-[#A94516] transition-colors cursor-pointer"
          >
            Find episodes to download
          </button>
        </div>
      )}

      {/* Bottom Destination Location Row (matching 03-downloads-dark.png & 12-downloads-light.png) */}
      <div className="flex items-center gap-2 sm:gap-3 pt-6 text-xs text-[var(--app-text-secondary)] font-normal relative">
        <Folder className="w-4 h-4 text-[var(--app-text-secondary)] shrink-0" />
        <span className="truncate">{native ? 'Default folder: ' : 'Save to '}{destinationPath}</span>
        <span className="opacity-40" aria-hidden="true">
          |
        </span>
        <button
          type="button"
          onClick={() => {
            if (onChooseDestination) { onChooseDestination(); return; }
            setTempFolderInput(destinationPath);
            setIsChangingFolder(true);
          }}
          className="text-[var(--app-accent)] hover:underline hover:text-[#A94516] transition-colors cursor-pointer shrink-0 font-medium"
        >
          Change location...
        </button>

        {/* Change Destination Inline Dialog */}
        {isChangingFolder && (
          <div
            ref={folderDialogRef}
            className="absolute left-0 bottom-full mb-2 w-full max-w-md p-4 bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-2xl z-40 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-[var(--app-text-primary)]">
                Default Download Directory
              </span>
              <button
                type="button"
                onClick={() => setIsChangingFolder(false)}
                className="p-1 text-[var(--app-text-muted)] hover:text-[var(--app-text-primary)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveNewFolder} className="space-y-3">
              <input
                type="text"
                value={tempFolderInput}
                onChange={(e) => setTempFolderInput(e.target.value)}
                placeholder="Folder path..."
                className="w-full h-9 px-3 bg-[var(--app-input-bg)] border border-[var(--app-input-border)] focus:border-[var(--app-accent)] rounded-lg text-xs font-mono text-[var(--app-text-primary)] outline-none"
                autoFocus
              />
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Downloads / Castbox',
                  'Music / Podcasts',
                  'Media / Podcasts',
                  'Documents / Audio',
                ].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTempFolderInput(preset)}
                    className="text-[11px] px-2 py-0.5 rounded bg-black/5 dark:bg-white/5 text-[var(--app-text-secondary)] hover:text-[var(--app-accent)] cursor-pointer"
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsChangingFolder(false)}
                  className="px-3 py-1.5 text-xs text-[var(--app-text-secondary)] hover:text-[var(--app-text-primary)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNewFolder}
                  className="px-3.5 py-1.5 bg-[var(--app-accent)] text-white text-xs font-medium rounded-lg hover:bg-[#A94516] cursor-pointer"
                >
                  Update path
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
