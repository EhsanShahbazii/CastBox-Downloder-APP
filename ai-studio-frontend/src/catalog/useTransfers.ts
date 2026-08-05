import { useEffect, useRef, useState } from 'react';
import type { Result } from '../../../shared/desktop';
import type { TransferJob, TransferSnapshot } from '../../../shared/transfers';
import type { DownloadJob } from '../types';
const api = () => window.castboxDesktop!.transfers;
export function useTransfers(notify: (message: string) => void) {
  const [state, setState] = useState<TransferSnapshot>({ jobs: [], startedPlanIds: [], concurrency: 3 });
  const [error, setError] = useState('');
  const epoch = useRef(0);
  useEffect(() => {
    let stopped = false; let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      const current = epoch.current;
      try { const result = await api().snapshot(); if (!result.ok) throw new Error(result.error); if (!stopped && current === epoch.current) { setState(result.value); setError(''); } }
      catch (error) { if (!stopped) setError(error instanceof Error ? error.message : 'Unable to read downloads.'); }
      if (!stopped) timer = setTimeout(poll, 500);
    };
    void poll(); return () => { stopped = true; clearTimeout(timer); };
  }, []);
  const run = async <T,>(work: () => Promise<Result<T>>) => {
    epoch.current++;
    try { const result = await work(); if (!result.ok) throw new Error(result.error); return result.value; }
    catch (error) { notify(error instanceof Error ? error.message : 'Download operation failed.'); return null; }
    finally { epoch.current++; }
  };
  const grants = useRef(new Map<string,string>());
  const getGrant = async (destination: string) => {
    const result = await window.castboxDesktop!.downloads.chooseDirectory(); if (!result.ok) throw new Error(result.error);
    if (!result.value) return null;
    if (result.value.path !== destination) throw new Error('Choose the original destination folder shown for this download.');
    grants.current.set(destination, result.value.id); return result.value.id;
  };
  const action = async (job: TransferJob, action: 'pause' | 'resume' | 'cancel') => run(async () => {
    let grantId: string | undefined;
    if (action !== 'pause' && job.status !== 'completed' && job.needsGrant) {
      grantId = grants.current.get(job.destination) ?? await getGrant(job.destination) ?? undefined;
      if (!grantId) return { ok: true as const, value: state };
    }
    const result = await api().action({ jobId: job.id, action, grantId });
    if (result.ok) setState(result.value); else if (grantId) grants.current.delete(job.destination);
    return result;
  });
  const start = async (planId: string, destination: string) => run(async () => {
    const grantId = await getGrant(destination); if (!grantId) return { ok: true as const, value: state };
    const result = await api().start({ planId, grantId }); if (result.ok) setState(result.value); return result;
  });
  const jobs: DownloadJob[] = state.jobs.map(job => ({ id: job.id, episodeId: job.episodeId, title: job.title, channelTitle: job.channelTitle,
    date: 'Castbox', artworkKey: 'unavailable', source: 'castbox', artworkUrl: job.artworkUrl, durationMs: job.durationMs, status: job.status,
    progressPercent: job.status === 'completed' ? 100 : job.total ? Math.min(99,job.bytes / job.total * 100) : 0,
    downloadedMB: job.bytes / 1048576, totalMB: (job.total ?? 0) / 1048576, totalUnknown: job.total === null,
    speedMBs: job.speed / 1048576, errorMessage: job.error ?? undefined, completedAt: job.completedAt ? new Date(job.completedAt).toLocaleString() : undefined,
    destinationPath: job.destination, needsGrant: job.needsGrant,
  }));
  return { state, jobs, error, action, start, run };
}
