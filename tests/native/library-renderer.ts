import type { DesktopBridge } from '../../shared/desktop';
declare global { interface Window { castboxDesktop?: DesktopBridge } }
async function run() {
  const api = window.castboxDesktop?.library;
  if (!api || 'require' in window || 'process' in window) throw new Error('Bridge or isolation failed');
  if (location.search) {
    for (const result of [await api.read(), await api.setSaved({ channelId: '123', saved: false })]) if (result.ok || result.error !== 'Request denied.') throw new Error('Untrusted library access allowed');
    return { checks: ['untrusted-read-denied', 'untrusted-write-denied'] };
  }
  const initial = await api.read(); if (!initial.ok) throw new Error(initial.error);
  const invalid = await api.setSaved({ channelId: '../bad', saved: true }); if (invalid.ok) throw new Error('Invalid write accepted');
  const requests = await Promise.all([api.setSaved({ channelId: '123', saved: true }), api.setSaved({ channelId: '123', saved: false }), api.setSaved({ channelId: '123', saved: true })]);
  if (requests.some(result => !result.ok)) throw new Error('Mutation failed');
  const final = await api.read(); if (!final.ok || final.value.savedChannels.length !== 1 || final.value.savedChannels[0].channel.id !== '123') throw new Error('Save ordering failed');
  const duplicate = await api.setSaved({ channelId: '123', saved: true }); if (!duplicate.ok || duplicate.value.savedChannels[0].savedAt !== final.value.savedChannels[0].savedAt) throw new Error('Duplicate changed saved timestamp');
  return { initialSavedCount: initial.value.savedChannels.length, checks: ['library-read', 'invalid-write-rejected', 'save-unsave-order', 'idempotent-save', 'node-isolation'] };
}
run().then(result => console.log('LIBRARY_TEST:' + JSON.stringify({ ok: true, ...result }))).catch(error => console.log('LIBRARY_TEST:' + JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Native failure' })));
