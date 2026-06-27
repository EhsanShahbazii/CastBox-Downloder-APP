import type { DesktopBridge } from '../../shared/desktop';
declare global { interface Window { castboxDesktop?: DesktopBridge } }
async function run() {
  const api = window.castboxDesktop?.downloads;
  if (!api || 'require' in window || 'process' in window) throw new Error('Bridge or isolation failed');
  if (location.search) {
    const results = [await api.list(), await api.chooseDirectory(), await api.commit({ planId: 'bad' })];
    for (const result of results) if (result.ok || result.error !== 'Request denied.') throw new Error('Untrusted planning allowed');
    return { checks: ['untrusted-list-denied', 'untrusted-chooser-denied', 'untrusted-commit-denied'] };
  }
  const initial = await api.list(); if (!initial.ok) throw new Error(initial.error);
  const grant = await api.chooseDirectory(); if (!grant.ok || !grant.value) throw new Error('No native grant');
  const input = { channelId: '123', episodeIds: ['456'], grantId: grant.value.id, filenamePattern: '{title}', groupByChannel: false, duplicatePolicy: 'rename' as const, concurrency: 1 };
  const invalid = await api.prepare({ ...input, filenamePattern: '../escape' }); if (invalid.ok) throw new Error('Traversal allowed');
  if (!initial.value.length) {
    const preview = await api.prepare(input); if (!preview.ok) throw new Error(preview.error);
    if (preview.value.entries[0].relativePath !== 'Native plan.mp3') throw new Error('Incorrect filename');
    const saved = await api.commit({ planId: preview.value.id }); if (!saved.ok) throw new Error(saved.error);
    const repeat = await api.commit({ planId: preview.value.id }); if (!repeat.ok || repeat.value.committedAt !== saved.value.committedAt) throw new Error('Commit not idempotent');
  } else {
    const replay = await api.commit({ planId: initial.value[0].id });
    if (!replay.ok || replay.value.committedAt !== initial.value[0].committedAt) throw new Error('Restart replay not idempotent');
  }
  const final = await api.list(); if (!final.ok || final.value.length !== 1 || final.value[0].status !== 'planned') throw new Error('Plan missing');
  return { initialPlanCount: initial.value.length, checks: ['grant', 'traversal-rejected', 'preview-and-persistence', 'idempotent-commit', 'node-isolation'] };
}
run().then(result => console.log('PLANNING_TEST:' + JSON.stringify({ ok: true, ...result }))).catch(error => console.log('PLANNING_TEST:' + JSON.stringify({ ok: false, error: error instanceof Error ? error.message : 'Native failure' })));
