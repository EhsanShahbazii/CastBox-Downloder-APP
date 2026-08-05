import React, { useEffect, useRef, useState } from 'react';
import { Folder, Download, X } from 'lucide-react';
import type { AppSettings } from '../../types';
import type { DirectoryGrant, FilePlan, SavedFilePlan } from '../../../../shared/downloads';
import { ArtworkImage } from '../artwork/ArtworkImage';

const field = 'min-w-0 w-full px-3 py-2 rounded-lg bg-[var(--app-input-bg)] border border-[var(--app-border)] text-sm';
const secondary = 'shrink-0 px-4 py-2 rounded-xl border border-[var(--app-border)] text-sm cursor-pointer disabled:opacity-50';
export function NativeDownloadReview({ channelId, episodeIds, settings, initialGrant, onClose, onSaved, onGrantChange }: {
  channelId: string; episodeIds: string[]; settings: AppSettings; initialGrant: DirectoryGrant | null; onClose: () => void; onSaved: (plan: SavedFilePlan) => void; onGrantChange?: (grant: DirectoryGrant) => Promise<void> | void;
}) {
  const [grant, setGrant] = useState(initialGrant);
  const [pattern, setPattern] = useState(settings.filenamePattern);
  const [group, setGroup] = useState(settings.groupEpisodesByChannel);
  const [policy, setPolicy] = useState(settings.duplicateHandling);
  const [concurrency, setConcurrency] = useState(settings.downloadConcurrency);
  const [plan, setPlan] = useState<FilePlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const ref = useRef<HTMLDivElement>(null);
  const locked = useRef(false);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => { document.body.style.overflow = overflow; previous?.focus(); };
  }, []);
  const invalidate = () => { setPlan(null); setError(''); setPage(1); };
  const work = async (action: () => Promise<void>) => {
    if (locked.current) return; locked.current = true; setBusy(true); setError('');
    try { await action(); } catch (error) { setError(error instanceof Error ? error.message : 'Unable to prepare this plan.'); }
    finally { locked.current = false; setBusy(false); }
  };
  const choose = () => work(async () => {
    const response = await window.castboxDesktop!.downloads.chooseDirectory(); if (!response.ok) throw new Error(response.error);
    if (response.value) { await onGrantChange?.(response.value); setGrant(response.value); invalidate(); }
  });
  const prepare = () => work(async () => {
    setPlan(null); setPage(1);
    if (!grant) throw new Error('Choose a destination folder first.');
    const response = await window.castboxDesktop!.downloads.prepare({ channelId, episodeIds, grantId: grant.id, filenamePattern: pattern, groupByChannel: group, duplicatePolicy: policy, concurrency });
    if (!response.ok) throw new Error(response.error); setPlan(response.value);
  });
  const commit = () => work(async () => {
    if (!plan) return;
    const response = await window.castboxDesktop!.downloads.commit({ planId: plan.id });
    if (!response.ok) throw new Error(response.error);
    const started = await window.castboxDesktop!.transfers.start({ planId: response.value.id, grantId: grant!.id });
    if (!started.ok) throw new Error(started.error); onSaved(response.value);
  });
  const canCommit = plan && !plan.entries.some(item => item.disposition === 'blocked') && plan.entries.some(item => ['create', 'replace'].includes(item.disposition));
  return <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-6">
    <div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="native-review-title" className="bg-[var(--app-bg)] border border-[var(--app-border)] rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-7 text-[var(--app-text-primary)]" onKeyDown={event => {
      if (event.key === 'Escape') { event.stopPropagation(); if (!locked.current) onClose(); }
      if (event.key === 'Tab') {
        const items = Array.from(ref.current!.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)')).filter(item => item.getClientRects().length);
        if (!items.length) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement === items[0] || document.activeElement === ref.current)) { event.preventDefault(); items.at(-1)!.focus(); }
        else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
      }
    }}>
      <div className="flex justify-between items-start gap-4"><div><h2 id="native-review-title" className="font-serif text-3xl font-bold">Review downloads</h2><p className="text-sm text-[var(--app-text-secondary)] mt-2">{episodeIds.length} episodes selected{plan ? ` · ${plan.channelTitle}` : ''}</p></div><button aria-label="Close review" className={secondary} disabled={busy} onClick={onClose}><X className="w-5 h-5" /></button></div>
      <p className="text-xs text-[var(--app-text-secondary)] mt-4">Review filenames before downloading. Existing files are replaced only when you explicitly select that option.</p>
      {plan && <div className="mt-5 border-y border-[var(--app-border)] divide-y divide-[var(--app-border)]">
        {plan.entries.slice((page - 1) * 5, page * 5).map(item => <div key={item.episodeId} className="py-3 flex gap-3 items-center"><div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden"><ArtworkImage live artworkKey="unavailable" artworkUrl={item.artworkUrl} alt={item.title} /></div><div className="min-w-0 flex-1"><p className="font-medium text-sm truncate">{item.title}</p><p className="text-xs text-[var(--app-text-secondary)] break-all mt-1">{item.relativePath ?? item.reason}</p><p className="text-xs text-[var(--app-accent)] mt-1">{item.disposition === 'replace' ? 'Replace existing file' : item.disposition}{item.reason && item.relativePath ? ` · ${item.reason}` : ''}</p></div><span className="text-xs shrink-0">{item.sizeBytes === null ? 'Size unknown' : `${(item.sizeBytes / 1048576).toFixed(1)} MB`}</span></div>)}
        <div className="py-3 flex justify-between items-center text-xs"><span>{plan.entries.filter(item => ['create','replace'].includes(item.disposition)).length} files planned · {(plan.knownBytes / 1048576).toFixed(1)} MB known{plan.unknownSizeCount ? ` + ${plan.unknownSizeCount} unknown sizes` : ''}</span><div className="flex gap-2"><button className={secondary} disabled={busy || page === 1} onClick={() => setPage(page - 1)}>Prev</button><span className="self-center">{page} / {Math.ceil(plan.entries.length / 5)}</span><button className={secondary} disabled={busy || page * 5 >= plan.entries.length} onClick={() => setPage(page + 1)}>Next</button></div></div>
      </div>}
      {plan?.entries.some(item => item.disposition === 'blocked') && <p role="alert" className="text-sm mt-4 border border-[var(--app-border)] rounded-lg p-3">{plan.entries.filter(item => item.disposition === 'blocked').length} episode(s) have no downloadable audio source. Close this review, deselect those episodes, and try again.</p>}
      {plan && !plan.entries.some(item => ['create', 'replace'].includes(item.disposition)) && !plan.entries.some(item => item.disposition === 'blocked') && <p role="status" className="text-sm mt-4 border border-[var(--app-border)] rounded-lg p-3">There are no new files to download. The selected episodes may already exist in this folder.</p>}
      <fieldset disabled={busy} className="mt-5 space-y-4 disabled:opacity-60">
        <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4"><span className="text-sm">Destination</span><div className="min-w-0 flex gap-2 items-center"><div className={`${field} min-w-0 flex items-center gap-2`}><Folder className="w-4 h-4 shrink-0" /><span className="truncate" title={grant?.path ?? settings.downloadDestination}>{grant?.path ?? 'Choose a folder to authorize this plan'}</span></div><button className={secondary} onClick={() => { void choose(); }}>Change</button></div></div>
        <label className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4 text-sm">Filename format<input className={field} value={pattern} onChange={event => { setPattern(event.target.value); invalidate(); }} /></label>
        <p className="text-xs text-[var(--app-text-secondary)] ml-[166px]">Tokens: {'{channel}, {title}, {date}, {eid}'}. The source audio extension is retained; no conversion.</p>
        <label className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4 text-sm">Duplicates<select className={field} value={policy} onChange={event => { setPolicy(event.target.value as typeof policy); invalidate(); }}><option value="skip">Skip existing files</option><option value="rename">Rename duplicates</option><option value="overwrite">Replace existing files</option></select></label>
        <label className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4 text-sm">Workers<select className={field} value={concurrency} onChange={event => { setConcurrency(Number(event.target.value)); invalidate(); }}>{[1,2,3,4,5].map(n => <option key={n} value={n}>{n === 1 ? '1 · sequential' : `${n} workers`}</option>)}</select></label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={group} onChange={event => { setGroup(event.target.checked); invalidate(); }} />Group in a channel folder</label>
      </fieldset>
      {error && <p role="alert" className="text-sm mt-4 border border-[var(--app-accent)] rounded-lg p-3">{error}</p>}
      {busy && <p role="status" className="text-sm mt-4">Checking your selection and destination…</p>}
      <div className="flex justify-end gap-3 border-t border-[var(--app-border)] pt-5 mt-5"><button className={secondary} disabled={busy} onClick={onClose}>Cancel</button><button className={`px-5 py-2.5 rounded-xl text-sm cursor-pointer disabled:opacity-50 ${canCommit ? secondary : 'bg-[var(--app-accent)] text-white'}`} disabled={busy || !grant} onClick={() => { void prepare(); }}>{plan ? 'Review again' : 'Review filenames'}</button><button className={`px-5 py-2.5 rounded-xl flex items-center gap-2 text-sm cursor-pointer disabled:opacity-50 ${canCommit ? 'bg-[var(--app-accent)] text-white' : 'border border-[var(--app-border)] text-[var(--app-text-secondary)]'}`} disabled={busy || !canCommit} onClick={() => { void commit(); }}><Download className="w-4 h-4" />{canCommit ? `Queue ${plan.entries.filter(item => ['create', 'replace'].includes(item.disposition)).length} downloads` : 'Queue downloads after review'}</button></div>
    </div>
  </div>;
}
