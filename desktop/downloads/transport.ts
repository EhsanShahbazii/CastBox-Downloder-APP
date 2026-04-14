import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { request as httpRequest, type IncomingMessage } from 'node:http';
import { request as httpsRequest } from 'node:https';

export class TransferError extends Error {}
// Conservative global-address policy; also excludes IPv4-mapped/tunnel IPv6.
export function publicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [a,b,c] = address.split('.').map(Number);
    return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99) || (b === 31 && c === 196) || (b === 52 && c === 193) || (b === 175 && c === 48))) || (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) || (a === 203 && b === 0 && c === 113));
  }
  if (isIP(address) === 6) return /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(?:0:|db8:|[12][0-9a-f]:)/i.test(address) && !/^2002:/i.test(address) && !/^3fff:/i.test(address);
  return false;
}
export function mediaUrl(raw: string): URL {
  let url: URL; try { url = new URL(raw); } catch { throw new TransferError('Invalid media address.'); }
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.href.length > 8192 || (url.port && !['80','443'].includes(url.port))) throw new TransferError('Unsafe media address.');
  return url;
}
export interface MediaResponse { body: IncomingMessage; status: number; headers: IncomingMessage['headers']; finalUrl: string }
export type MediaTransport = (url: string, headers: Record<string,string>, signal: AbortSignal) => Promise<MediaResponse>;
export const mediaTransport: MediaTransport = async (raw, headers, signal) => {
  let url = mediaUrl(raw);
  for (let redirects = 0; redirects <= 5; redirects++) {
    signal.throwIfAborted();
    const hostname = url.hostname.replace(/^\[|\]$/g, '');
    const addresses = isIP(hostname) ? [{ address: hostname, family: isIP(hostname) }] : await resolveAddresses(hostname, signal);
    signal.throwIfAborted();
    if (!addresses.length || addresses.some(item => !publicAddress(item.address))) throw new TransferError('Media host resolves to a private or reserved address.');
    const pinned = addresses[0];
    const body = await new Promise<IncomingMessage>((resolve, reject) => {
      const request = (url.protocol === 'https:' ? httpsRequest : httpRequest)(url, {
        method: 'GET', agent: false, signal, headers: { Accept: 'audio/*,application/octet-stream', 'Accept-Encoding': 'identity', 'User-Agent': 'CastboxDesktop/0.1', ...headers },
        lookup: (_host, options, callback) => {
          if (options.all) callback(null, [pinned] as never); else callback(null, pinned.address, pinned.family);
        },
      }, resolve);
      request.setTimeout(30000, () => request.destroy(new TransferError('Media connection timed out. Retry when your connection is ready.')));
      request.on('error', reject); request.end();
    });
    const status = body.statusCode ?? 0;
    if ([301,302,303,307,308].includes(status)) {
      body.destroy();
      if (!body.headers.location || redirects === 5) throw new TransferError('Media redirected too many times.');
      const next = mediaUrl(new URL(body.headers.location, url).href);
      if (url.protocol === 'https:' && next.protocol !== 'https:') throw new TransferError('Insecure media redirect was refused.');
      url = next; continue;
    }
    return { body, status, headers: body.headers, finalUrl: url.href };
  }
  throw new TransferError('Media redirect failed.');
};
export function responseValidator(headers: IncomingMessage['headers']): string | null {
  const etag = headers.etag;
  // Only strong entity tags permit byte reuse; timestamps alone are insufficient.
  return typeof etag === 'string' && /^"[^"\r\n]*"$/.test(etag) ? etag : null;
}
export const MAX_MEDIA_BYTES = 8 * 1024 * 1024 * 1024;
export function responseLength(value: string | undefined): number | null {
  if (value === undefined) return null;
  const n = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(n) || n < 0 || n > MAX_MEDIA_BYTES) throw new TransferError('Media size is invalid or exceeds the 8 GiB limit.');
  return n;
}

async function resolveAddresses(host: string, signal: AbortSignal) {
  return new Promise<Array<{ address: string; family: number }>>((resolve, reject) => {
    const timer = setTimeout(() => { cleanup(); reject(new TransferError('Media DNS lookup timed out.')); }, 15000);
    const abort = () => { cleanup(); reject(new TransferError('Media request cancelled.')); };
    const cleanup = () => { clearTimeout(timer); signal.removeEventListener('abort', abort); };
    signal.addEventListener('abort', abort, { once: true });
    lookup(host, { all: true }).then(value => { cleanup(); resolve(value); }, () => { cleanup(); reject(new TransferError('Unable to resolve the media host.')); });
  });
}
