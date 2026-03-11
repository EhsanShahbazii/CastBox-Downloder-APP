import { z } from 'zod';
import { CatalogError } from './client';

// Only observed, trusted public image CDNs. Never follow a redirect to another host.
const hosts = new Set(['assets.pippa.io', 's3.castbox.fm', 'is1-ssl.mzstatic.com', 'is2-ssl.mzstatic.com', 'is3-ssl.mzstatic.com', 'is4-ssl.mzstatic.com', 'is5-ssl.mzstatic.com']);
export function artworkUrl(input: unknown): URL {
  const parsed = z.object({ url: z.string().url().max(2048) }).strict().safeParse(input);
  if (!parsed.success) throw new CatalogError('INVALID_INPUT', 'Invalid artwork request.');
  const url = new URL(parsed.data.url);
  if (url.protocol !== 'https:' || !hosts.has(url.hostname) || url.port || url.username || url.password)
    throw new CatalogError('INVALID_INPUT', 'Artwork host is not supported.');
  return url;
}
export class ArtworkLoader {
  private active = 0;
  constructor(private transport: typeof fetch = fetch) {}
  async load(input: unknown): Promise<string> {
    const url = artworkUrl(input);
    if (this.active >= 8) throw new CatalogError('BUSY', 'Artwork is busy.');
    this.active++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await this.transport(url, { redirect: 'error', credentials: 'omit', signal: controller.signal });
      const mime = response.headers.get('content-type')?.split(';')[0];
      if (!response.ok || !mime || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mime)) {
        await response.body?.cancel();
        throw new CatalogError('INVALID_RESPONSE', 'Artwork unavailable.');
      }
      const reader = response.body?.getReader();
      if (!reader) throw new CatalogError('INVALID_RESPONSE', 'Artwork unavailable.');
      const chunks: Uint8Array[] = []; let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read(); if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 1024 * 1024) throw new CatalogError('INVALID_RESPONSE', 'Artwork exceeds size limit.');
          chunks.push(chunk.value);
        }
      } finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      return `data:${mime};base64,${Buffer.concat(chunks).toString('base64')}`;
    } finally { clearTimeout(timer); this.active--; }
  }
}
