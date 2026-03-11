import { z } from 'zod';
import { webQuery } from './web-query';
import { catalogId, searchInput, batchInput, type CatalogChannel, episodeInput, indexInput, suggestionInput, type CatalogEpisode, type CatalogErrorCode, type CatalogResult } from '../../shared/catalog';

export class CatalogError extends Error {
  constructor(public code: CatalogErrorCode, message: string) { super(message); }
}
function inputValue<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new CatalogError('INVALID_INPUT', 'Check the search text or Castbox item ID.');
  return result.data;
}
const id = z.union([catalogId, z.number().int().positive().safe().transform(String)]);
const optionalText = z.string().nullish();
const nullableNumber = z.number().finite().nonnegative().nullish();
const channelSchema = z.object({ cid: id, title: z.string(), author: optionalText, cover_url: optionalText, https_cover_url: optionalText, big_cover_url: optionalText, description: optionalText, episode_count: z.number().int().nonnegative().nullish() });
const episodeSchema = z.object({
  eid: id, cid: id, title: z.string(), author: optionalText, description: optionalText,
  cover_url: optionalText, release_date: optionalText, duration: nullableNumber, size: nullableNumber,
  url: optionalText, private: z.boolean().optional(), channel: channelSchema.nullish(),
});
function httpUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null; }
  catch { return null; }
}
function date(value: string | null | undefined): string | null {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
}

function normalizeChannel(data: z.infer<typeof channelSchema>): CatalogChannel {
  return { id: data.cid, title: data.title, author: data.author ?? '', description: data.description ?? '',
    artworkUrl: httpUrl(data.https_cover_url) ?? httpUrl(data.cover_url) ?? httpUrl(data.big_cover_url), episodeCount: data.episode_count ?? null };
}
function normalizeEpisode(data: z.infer<typeof episodeSchema>): CatalogEpisode {
  return { id: data.eid, channelId: data.cid, title: data.title, author: data.author ?? '', description: data.description ?? '',
      artworkUrl: httpUrl(data.cover_url), publishedAt: date(data.release_date), durationMs: data.duration ?? null,
      sizeBytes: data.size ?? null, hasMediaSource: !data.private && httpUrl(data.url) !== null,
      channel: data.channel ? { id: data.channel.cid, title: data.channel.title, author: data.channel.author ?? '', artworkUrl: httpUrl(data.channel.cover_url) } : null };
}

export type TokenProvider = () => { token?: string; secret?: string } | undefined;

export class CatalogClient {
  private active = 0;
  constructor(private transport: typeof fetch = fetch, private timeoutMs = 10_000, private tokenProvider?: TokenProvider) {}

  private async request(route: string, parameters: Record<string, string>): Promise<unknown> {
    if (this.active >= 3) throw new CatalogError('BUSY', 'Too many catalog requests. Try again shortly.');
    this.active++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const url = new URL(`https://everest.castbox.fm/data/${route}`);
      url.search = webQuery(parameters).toString();
      const headers: Record<string, string> = { Accept: 'application/json', 'X-Web': 'true' };
      const auth = this.tokenProvider?.();
      if (auth?.token && auth.token.trim()) {
        headers['x-access-token'] = auth.token.trim();
        if (auth.secret && auth.secret.trim()) {
          headers['x-access-token-secret'] = auth.secret.trim();
        }
      }
      const response = await this.transport(url, { signal: controller.signal, redirect: 'error', credentials: 'omit', headers });
      if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) await response.body?.cancel().catch(() => {});
      if (response.status === 401 || response.status === 403) throw new CatalogError('ACCESS_REQUIRED', 'Castbox did not allow access to this operation. Check your user token.');
      if (response.status === 429) throw new CatalogError('RATE_LIMITED', 'Castbox is limiting requests. Try again later.');
      if (response.status === 404) throw new CatalogError('NOT_FOUND', 'This Castbox item was not found.');
      if (!response.ok) throw new CatalogError('SERVICE_ERROR', 'Castbox is temporarily unavailable.');
      if (!response.headers.get('content-type')?.includes('application/json')) throw new CatalogError('INVALID_RESPONSE', 'Castbox returned an unexpected response.');
      const reader = response.body?.getReader();
      if (!reader) throw new CatalogError('INVALID_RESPONSE', 'Castbox returned an empty response.');
      const chunks: Uint8Array[] = []; let size = 0;
      try {
        while (true) {
          const item = await reader.read(); if (item.done) break;
          size += item.value.byteLength;
          if (size > 4 * 1024 * 1024) throw new CatalogError('INVALID_RESPONSE', 'Castbox response exceeded the safe size limit.');
          chunks.push(item.value);
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      let body;
      try { body = z.object({ code: z.number(), data: z.unknown() }).parse(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { throw new CatalogError('INVALID_RESPONSE', 'Castbox returned invalid data.'); }
      if (body.code !== 0) throw new CatalogError('SERVICE_ERROR', 'Castbox could not complete this request.');
      return body.data;
    } catch (error) {
      if (error instanceof CatalogError) throw error;
      if (controller.signal.aborted) throw new CatalogError('TIMEOUT', 'Castbox took too long to respond.');
      throw new CatalogError('NETWORK', 'Unable to reach Castbox. Check your connection.');
    } finally { clearTimeout(timer); this.active--; }
  }

  async suggestions(input: unknown) {
    const query = inputValue(suggestionInput, input);
    const data = z.array(z.object({ keyword: z.string(), cid: id })).parse(await this.request('keywords/suggestion', { keyword: query.keyword, limit: String(query.limit) }));
    const seen = new Set<string>();
    return data.filter(item => { if (seen.has(item.cid)) return false; seen.add(item.cid); return true; })
      .slice(0, query.limit).map(item => ({ keyword: item.keyword, channelId: item.cid }));
  }

  async episode(input: unknown): Promise<CatalogEpisode> {
    const { episodeId } = inputValue(episodeInput, input);
    const data = episodeSchema.parse(await this.request('episode/v4', { eid: episodeId, raw: 'true' }));
    if (data.eid !== episodeId || (data.channel && data.channel.cid !== data.cid)) throw new CatalogError('INVALID_RESPONSE', 'Castbox returned an unexpected item.');
    return normalizeEpisode(data);
  }

  async search(input: unknown) {
    const query = inputValue(searchInput, input);
    const data = z.object({ channel_list: z.array(channelSchema) }).parse(await this.request('search_channel/v2', {
      keyword: query.keyword, country: query.country, skip: String(query.offset), limit: String(query.limit), order: 'relevance', suggest_open: '1',
    }));
    const channels = [...new Map(data.channel_list.slice(0, query.limit).map(item => [item.cid, normalizeChannel(item)])).values()];
    return { channels, nextOffset: data.channel_list.length >= query.limit ? query.offset + query.limit : null };
  }

  async channel(input: unknown): Promise<CatalogChannel> {
    const { channelId } = inputValue(indexInput, input);
    const data = channelSchema.parse(await this.request('channel/v3', { cid: channelId, raw: '1' }));
    if (data.cid !== channelId) throw new CatalogError('INVALID_RESPONSE', 'Castbox returned an unexpected channel.');
    return normalizeChannel(data);
  }

  async episodes(input: unknown) {
    const { channelId, episodeIds } = inputValue(batchInput, input);
    const requested = [...new Set(episodeIds)];
    const data = z.object({ cid: id, episode_list: z.array(episodeSchema) }).parse(await this.request('episode_list/v2', { cid: channelId, eids: requested.join(','), raw: '1' }));
    if (data.cid !== channelId || data.episode_list.some(item => item.cid !== channelId || !requested.includes(item.eid))) throw new CatalogError('INVALID_RESPONSE', 'Castbox returned unexpected episodes.');
    const records = new Map(data.episode_list.map(item => [item.eid, normalizeEpisode(item)]));
    return { episodes: requested.flatMap(id => records.has(id) ? [records.get(id)!] : []), missingIds: requested.filter(id => !records.has(id)) };
  }

  // Planning uses the source extension only. Raw media URLs never cross IPC.
  async planningEpisodes(input: unknown) {
    const { channelId, episodeIds } = inputValue(batchInput, input);
    const requested = [...new Set(episodeIds)];
    const data = z.object({ cid: id, episode_list: z.array(episodeSchema) }).parse(await this.request('episode_list/v2', { cid: channelId, eids: requested.join(','), raw: '1' }));
    if (data.cid !== channelId || data.episode_list.some(item => item.cid !== channelId || !requested.includes(item.eid))) throw new CatalogError('INVALID_RESPONSE', 'Castbox returned unexpected episodes.');
    return data.episode_list.map(item => {
      let extension: string | null = null;
      const url = httpUrl(item.url);
      if (url) extension = new URL(url).pathname.match(/\.(mp3|m4a|aac|ogg|opus|wav|flac)$/i)?.[0].toLowerCase() ?? null;
      return { episode: normalizeEpisode(item), extension };
    });
  }

  // Main-process only. Never expose media URLs or signed queries through IPC.
  async mediaSource(episodeId: string) {
    inputValue(episodeInput, { episodeId });
    const data = episodeSchema.parse(await this.request('episode/v4', { eid: episodeId, raw: 'true' }));
    const url = httpUrl(data.url);
    if (data.eid !== episodeId || data.private || !url || (data.channel && data.channel.cid !== data.cid)) throw new Error('The episode source is unavailable.');
    return { episode: normalizeEpisode(data), url };
  }

  async episodeIndex(input: unknown) {
    const { channelId } = inputValue(indexInput, input);
    const data = z.array(z.object({ cid: id.optional(), episode_list: z.array(z.object({ eid: id, release_date: optionalText })) })).max(1)
      .parse(await this.request('episodes/overview', { cids: channelId }));
    if (data[0]?.cid && data[0].cid !== channelId) throw new CatalogError('INVALID_RESPONSE', 'Castbox returned an unexpected channel.');
    const seen = new Set<string>();
    return (data[0]?.episode_list ?? []).filter(item => { if (seen.has(item.eid)) return false; seen.add(item.eid); return true; })
      .map(item => ({ id: item.eid, publishedAt: date(item.release_date) }));
  }
}

export async function catalogResult<T>(work: () => Promise<T>): Promise<CatalogResult<T>> {
  try { return { ok: true, value: await work() }; }
  catch (error) {
    if (error instanceof CatalogError) return { ok: false, code: error.code, error: error.message };
    if (error instanceof z.ZodError) return { ok: false, code: 'INVALID_RESPONSE', error: 'Catalog data did not match the expected format.' };
    return { ok: false, code: 'SERVICE_ERROR', error: 'Catalog request failed.' };
  }
}
