import type { CatalogChannel, CatalogEpisode, CatalogResult } from '../../../shared/catalog';
import type { Channel, Episode } from '../types';

export function value<T>(result: CatalogResult<T>): T {
  if (!result.ok) throw new Error(`${result.error} (${result.code})`);
  return result.value;
}
export function plainText(text: string): string {
  const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return text.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, ' ').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, key: string) => {
      if (!key.startsWith('#')) return entities[key.toLowerCase()] ?? match;
      const code = key[1].toLowerCase() === 'x' ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
    }).replace(/\s+/g, ' ').trim();
}
export function channelModel(item: CatalogChannel): Channel {
  return { id: item.id, title: plainText(item.title), author: plainText(item.author), description: plainText(item.description),
    episodesCount: item.episodeCount ?? 0, episodeCountUnknown: item.episodeCount === null, artworkKey: 'unavailable', artworkUrl: item.artworkUrl, source: 'castbox' };
}
export function episodeModel(item: CatalogEpisode, channel?: Channel): Episode {
  const seconds = item.durationMs === null ? null : Math.floor(item.durationMs / 1000);
  const description = plainText(item.description);
  return { id: item.id, episodeNumber: 0, title: plainText(item.title), artist: plainText(item.author) || channel?.author || '',
    date: item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }) : 'Date unavailable',
    durationSeconds: seconds ?? 0, durationFormatted: seconds === null ? '—' : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
    fileSizeFormatted: item.sizeBytes === null ? '—' : `${(item.sizeBytes / 1048576).toFixed(1)} MB`,
    artworkKey: 'unavailable', artworkUrl: item.artworkUrl ?? channel?.artworkUrl, source: 'castbox', synopsis: description.slice(0, 500),
    extendedDescription: description.length > 500 ? description.slice(500) : undefined, isSourceUnavailable: !item.hasMediaSource };
}
export function parseQuery(text: string): { kind: 'search'; keyword: string } | { kind: 'channel'; id: string } | { kind: 'episode'; id: string } {
  const query = text.trim();
  if (!query) throw new Error('Enter a channel name or Castbox link.');
  if (/^(https?:\/\/|www\.|castbox\.fm)/i.test(query)) {
    let url: URL;
    try { url = new URL(query.startsWith('http') ? query : `https://${query}`); } catch { throw new Error('This link is invalid.'); }
    if (!['castbox.fm', 'www.castbox.fm'].includes(url.hostname) || url.username || url.password || url.port) throw new Error('Use a channel or episode link from castbox.fm.');
    const match = url.pathname.match(/^\/(channel|episode)\/[^/]*?-id([1-9]\d{0,19})(?:-id([1-9]\d{0,19}))?\/?$/);
    if (!match || (match[1] === 'episode' && !match[3])) throw new Error('Use the full Castbox channel or episode page link. Short links are not supported yet.');
    return { kind: match[1] as 'channel' | 'episode', id: match[3] ?? match[2] };
  }
  if (query.length > 200) throw new Error('Keep searches under 200 characters.');
  return { kind: 'search', keyword: query };
}
// Logical cancellation: an older response can never overwrite newer navigation.
export class LatestRequest {
  private version = 0;
  begin() { const version = ++this.version; return () => version === this.version; }
  cancel() { this.version++; }
}
export function pageIds(index: Array<{ id: string; publishedAt: string | null }>, page: number, oldest = false): string[] {
  const sorted = [...index].sort((a, b) => (Date.parse(b.publishedAt ?? '') || 0) - (Date.parse(a.publishedAt ?? '') || 0));
  if (oldest) sorted.reverse();
  return sorted.slice((page - 1) * 10, page * 10).map(item => item.id);
}
