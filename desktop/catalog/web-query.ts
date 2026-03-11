import { createHash } from 'node:crypto';

// Public Castbox web client, module 337 (see docs/API_FEASIBILITY.md).
// These daily query parameters are not account credentials. Never persist/replay them.
const permutation = [24,13,4,19,6,0,8,21,25,7,28,1,15,31,10,9,17,18,22,11,27,23,2,26,12,5,29,14,20,30,16,3];
export function webQuery(parameters: Record<string, string>, now = new Date()): URLSearchParams {
  const values = { ...parameters, web: '1', r: '1' };
  const day = now.toISOString().slice(0, 10).replaceAll('-', '');
  const canonical = Object.keys(values).sort().map(key => `${key}=${values[key as keyof typeof values]}`).join('&');
  const digest = createHash('md5').update(`${canonical}evst${day}`).digest('hex');
  return new URLSearchParams({ ...values, m: day, n: permutation.map(index => digest[index]).join('') });
}
