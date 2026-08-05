import React, { useEffect, useRef, useState } from 'react';
import type { CatalogBridge } from '../../../shared/catalog';
import type { Channel, Episode } from '../types';
import { SearchBar } from '../components/search/SearchBar';
import { ChannelCard } from '../components/search/ChannelCard';
import { RecentSearches } from '../components/search/RecentSearches';
import { LoadingState } from '../components/search/LoadingState';
import { ChannelDetailsView } from '../components/channel/ChannelDetailsView';
import { EpisodeDetailsView } from '../components/episode/EpisodeDetailsView';
import { LatestRequest, channelModel, episodeModel, pageIds, parseQuery, value } from './model';

type ChannelPage = { channel: Channel; index: Array<{ id: string; publishedAt: string | null }>; page: number; oldest: boolean };
const button = 'px-4 py-2 border border-[var(--app-border)] rounded-lg text-sm hover:text-[var(--app-accent)] cursor-pointer';
export function LiveCatalog({ api, reset, notify, active, savedIds, savePending, libraryReady, onToggleSaved, openRequest, openEpisodeRequest, onPlanDownloads, onPlayEpisode, onAddToQueue }: { onPlanDownloads: (channelId: string, episodeIds: string[]) => void; onPlayEpisode?: (episodeId: string) => void; onAddToQueue?: (episodeId: string) => void; savedIds: Set<string>; savePending: boolean; libraryReady: boolean; onToggleSaved: (channel: Channel) => void; openRequest: { id: string; key: number } | null; openEpisodeRequest?: { id: string; key: number } | null; active: boolean; api: CatalogBridge; reset: number; notify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [searched, setSearched] = useState('');
  const [results, setResults] = useState<Channel[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [recent, setRecent] = useState<string[]>([]);
  const [channel, setChannel] = useState<ChannelPage | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [selected, setSelected] = useState(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const gate = useRef(new LatestRequest());
  const retry = useRef<() => void>(() => {});
  function back() { gate.current.cancel(); setBusy(false); setError(''); setNotice(''); setEpisode(null); setChannel(null); }
  useEffect(() => { back(); }, [reset]);
  useEffect(() => () => gate.current.cancel(), []);
  useEffect(() => { if (openRequest) void openChannel(openRequest.id); }, [openRequest]);
  useEffect(() => { if (openEpisodeRequest) void openEpisode(openEpisodeRequest.id); }, [openEpisodeRequest]);
  useEffect(() => { if (!active) { gate.current.cancel(); setBusy(false); setError(''); } }, [active]);
  async function run(work: (current: () => boolean) => Promise<void>, again: () => void) {
    const current = gate.current.begin(); retry.current = again; setError(''); setNotice(''); setBusy(true);
    try { await work(current); }
    catch (cause) { if (current()) setError(cause instanceof Error ? cause.message : 'Unable to load catalog data. Please retry.'); }
    finally { if (current()) setBusy(false); }
  }
  async function loadPage(base: ChannelPage, page = 1, oldest = false) {
    return run(async current => {
      const ids = pageIds(base.index, page, oldest);
      const batch = ids.length ? value(await api.episodes({ channelId: base.channel.id, episodeIds: ids })) : { episodes: [], missingIds: [] };
      if (!current()) return;
      setEpisode(null); setChannel({ ...base, page, oldest, channel: { ...base.channel, episodes: batch.episodes.map(item => episodeModel(item, base.channel)) } });
      if (batch.missingIds.length) setNotice(`${batch.missingIds.length} episode(s) on this page are no longer available.`);
    }, () => { void loadPage(base, page, oldest); });
  }
  async function openChannel(id: string) {
    return run(async current => {
      const metadata = value(await api.channel({ channelId: id }));
      if (!current()) return;
      const index = value(await api.episodeIndex({ channelId: id }));
      if (!current()) return;
      const model = { ...channelModel(metadata), episodesCount: index.length, episodeCountUnknown: false };
      const ids = pageIds(index, 1);
      const batch = ids.length ? value(await api.episodes({ channelId: id, episodeIds: ids })) : { episodes: [], missingIds: [] };
      if (!current()) return;
      setSelected(new Set()); setEpisode(null);
      setChannel({ channel: { ...model, episodes: batch.episodes.map(item => episodeModel(item, model)) }, index, page: 1, oldest: false });
      if (batch.missingIds.length) setNotice(`${batch.missingIds.length} episode(s) on this page are no longer available.`);
      window.scrollTo(0, 0);
    }, () => { void openChannel(id); });
  }
  async function openEpisode(id: string) {
    return run(async current => {
      const detail = value(await api.episode({ episodeId: id }));
      if (!current()) return;
      let parent = channel;
      if (!parent || parent.channel.id !== detail.channelId) {
        const metadata = value(await api.channel({ channelId: detail.channelId }));
        if (!current()) return;
        parent = { channel: channelModel(metadata), index: [], page: 1, oldest: false };
        setSelected(new Set());
      }
      setChannel(parent); setEpisode(episodeModel(detail, parent.channel)); window.scrollTo(0, 0);
    }, () => { void openEpisode(id); });
  }
  async function search(text = query, offset = 0) {
    let target: ReturnType<typeof parseQuery>;
    try { target = parseQuery(text); } catch (cause) { gate.current.cancel(); setBusy(false); setError((cause as Error).message); retry.current = () => { void search(text); }; return; }
    setQuery(text);
    if (target.kind === 'channel') return openChannel(target.id);
    if (target.kind === 'episode') return openEpisode(target.id);
    const keyword = target.keyword;
    return run(async current => {
      const response = value(await api.search({ keyword, offset, limit: 20 }));
      if (!current()) return;
      setChannel(null); setEpisode(null); setSearched(keyword);
      setResults(previous => [...new Map([...(offset ? previous : []), ...response.channels.map(channelModel)].map(item => [item.id, item])).values()]);
      setNext(response.nextOffset !== null && response.nextOffset <= 10000 ? response.nextOffset : null);
      setRecent(previous => [keyword, ...previous.filter(item => item !== keyword)].slice(0, 6));
    }, () => { void search(text, offset); });
  }
  const unavailable = () => notify('Playback, downloads and listening queues will connect in later phases.');
  const status = <>
    {busy && <div role="status" aria-label="Loading catalog"><LoadingState /></div>}
    {error && <div role="alert" className="my-5 p-4 rounded-xl border border-[var(--app-border)] text-sm"><p>{error}</p><button className={`${button} mt-3`} onClick={() => retry.current()}>Retry</button></div>}
    {notice && <p role="status" className="text-sm my-4">{notice}</p>}
  </>;
  if (channel && (busy || error)) return <div className="max-w-[1400px] mx-auto px-6 pt-7 pb-36"><button className={button} onClick={back}>Back to Find</button><h1 className="font-serif text-3xl font-bold mt-6">{channel.channel.title}</h1>{status}</div>;
  if (channel && !busy && !error) return <>
    {notice && <div className="max-w-[1400px] mx-auto px-6">{status}</div>}
    {episode ? <EpisodeDetailsView key={episode.id} episode={episode} channel={channel.channel} isPlayingThisEpisode={false}
      onTogglePlayEpisode={item => onPlayEpisode ? onPlayEpisode(item.id) : unavailable()} onDownloadEpisode={item => onPlanDownloads(channel.channel.id, [item.id])} onAddToQueue={item => onAddToQueue ? onAddToQueue(item.id) : unavailable()} onNavigateToFind={back}
      onNavigateToChannel={() => { if (channel.channel.episodes) { setEpisode(null); } else void openChannel(channel.channel.id); }} /> :
      <ChannelDetailsView key={`${channel.channel.id}-${channel.page}-${channel.oldest}`} channel={channel.channel} isSaved={savedIds.has(channel.channel.id)} savePending={savePending} saveDisabled={!libraryReady}
        remote={{ page: channel.page, total: channel.index.length, allIds: channel.index.map(item => item.id), oldest: channel.oldest, onPage: (page, oldest) => { void loadPage(channel, page, oldest); } }}
        onToggleSave={() => onToggleSaved(channel.channel)} selectedEpisodeIds={selected}
        onToggleEpisodeSelect={id => setSelected(previous => { const next = new Set(previous); next.has(id) ? next.delete(id) : next.add(id); return next; })}
        onSelectThisPage={ids => setSelected(previous => new Set([...previous, ...ids]))} onSelectAllEpisodes={ids => setSelected(new Set(ids))}
        onClearSelection={() => setSelected(new Set())} onPlayEpisode={item => onPlayEpisode ? onPlayEpisode(item.id) : unavailable()} onDownloadEpisode={item => onPlanDownloads(channel.channel.id, [item.id])} onDownloadSelected={() => onPlanDownloads(channel.channel.id, [...selected])}
        onAddToQueue={item => onAddToQueue ? onAddToQueue(item.id) : unavailable()} onSelectEpisodeDetails={item => { void openEpisode(item.id); }} onBackToFind={back} />}
  </>;
  return <div className="max-w-[1320px] mx-auto px-6 pt-9 pb-36">
    {channel && <button className={`${button} mb-5`} onClick={back}>Back to Find</button>}
    <div className="mb-6"><h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight">Find your next listen</h1>
      <p className="text-sm sm:text-base text-[var(--app-text-secondary)] mt-1.5">Search for a channel or paste a Castbox link.</p></div>
    <div className="mb-8"><SearchBar query={query} onChangeQuery={setQuery} onSubmitSearch={() => { void search(); }} onClearQuery={() => { back(); setQuery(''); setSearched(''); setResults([]); setNext(null); }} isLoading={busy} /></div>
    {status}
    {!busy && !error && <><div className="flex items-baseline gap-2.5 mb-2"><h2 className="font-serif text-xl font-bold">Channels</h2><span className="text-xs text-[var(--app-text-secondary)]">{results.length} results{next !== null ? ' loaded' : ''}</span></div>
      {results.map(item => <ChannelCard key={item.id} channel={item} onSelectChannel={() => { void openChannel(item.id); }} />)}
      {!results.length && <p role="status" className="py-12 text-sm text-[var(--app-text-secondary)]">{searched ? `No channels found for “${searched}”. Try another search.` : 'Search the live Castbox catalog to get started.'}</p>}
      {next !== null && <button className={`${button} mt-5`} onClick={() => { void search(searched, next); }}>Load more channels</button>}
    </>}
    <RecentSearches searches={recent} onSelectSearch={text => { void search(text); }} onClearAll={() => setRecent([])} />
  </div>;
}
