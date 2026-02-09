export function isTrustedSender(actual: string | undefined, expected: string, isMainFrame: boolean): boolean {
  if (!actual || !isMainFrame) return false;
  try {
    const source = new URL(actual);
    const target = new URL(expected);
    source.hash = ''; target.hash = '';
    return source.href === target.href;
  } catch { return false; }
}
