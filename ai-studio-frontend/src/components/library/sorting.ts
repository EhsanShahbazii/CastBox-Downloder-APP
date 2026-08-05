export type DateAddedOrder = 'newest' | 'oldest';

export function sortByDateAdded<T extends { completedAt: string }>(
  items: readonly T[],
  order: DateAddedOrder = 'newest',
): T[] {
  const multiplier = order === 'newest' ? -1 : 1;
  return [...items].sort((left, right) => {
    const leftDate = Date.parse(left.completedAt);
    const rightDate = Date.parse(right.completedAt);
    const leftTimestamp = Number.isFinite(leftDate) ? leftDate : 0;
    const rightTimestamp = Number.isFinite(rightDate) ? rightDate : 0;
    return (leftTimestamp - rightTimestamp) * multiplier;
  });
}
