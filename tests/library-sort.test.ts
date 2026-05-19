import test from 'node:test';
import assert from 'node:assert/strict';
import { sortByDateAdded } from '../ai-studio-frontend/src/components/library/sorting';

test('library date-added sort compares calendar timestamps instead of month-name text', () => {
  const items = [
    { id: 'sep', completedAt: 'Sep 25, 2026, 11:30 AM' },
    { id: 'oct-6', completedAt: 'Oct 6, 2026, 4:22 PM' },
    { id: 'oct-7', completedAt: 'Oct 7, 2026, 9:14 AM' },
  ];

  assert.deepEqual(sortByDateAdded(items).map(item => item.id), ['oct-7', 'oct-6', 'sep']);
  assert.deepEqual(sortByDateAdded(items, 'oldest').map(item => item.id), ['sep', 'oct-6', 'oct-7']);
  assert.deepEqual(items.map(item => item.id), ['sep', 'oct-6', 'oct-7']);
});

test('unparseable completion dates sort as unknown instead of crashing', () => {
  const items = [
    { id: 'valid', completedAt: '2026-10-07T09:14:00Z' },
    { id: 'unknown', completedAt: 'date unavailable' },
  ];

  assert.deepEqual(sortByDateAdded(items).map(item => item.id), ['valid', 'unknown']);
});
