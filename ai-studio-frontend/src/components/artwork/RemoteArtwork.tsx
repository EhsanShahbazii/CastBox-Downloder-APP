import React, { useEffect, useState } from 'react';

const cache = new Map<string, Promise<string | null>>();
let tail = Promise.resolve();
function load(url: string): Promise<string | null> {
  const known = cache.get(url); if (known) return known;
  // Serialize artwork so it cannot exhaust native IPC concurrency or delay metadata.
  const result = tail.then(async () => {
    try { const response = await window.castboxDesktop?.catalog.artwork({ url }); return response?.ok ? response.value : null; }
    catch { return null; }
  });
  tail = result.then(() => {});
  if (cache.size >= 40) cache.delete(cache.keys().next().value!);
  cache.set(url, result);
  return result;
}
export function RemoteArtwork({ url, alt, className, fallback }: { url?: string | null; alt: string; className: string; fallback?: React.ReactNode }) {
  const [image, setImage] = useState<string | null>(null);
  useEffect(() => {
    let current = true; setImage(null);
    if (url) void load(url).then(value => { if (current) setImage(value); });
    return () => { current = false; };
  }, [url]);
  return image ? <img src={image} alt={alt} className={className} onError={() => setImage(null)} /> :
    fallback ?? <div role="img" aria-label={`${alt}: artwork unavailable`} className={`${className} bg-[var(--app-input-bg)]`} />;
}
