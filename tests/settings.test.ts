import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SettingsStore } from '../desktop/settings-store';
import { defaultSettings, settingsSchema } from '../shared/desktop';
import { isTrustedSender } from '../desktop/security';

test('settings persist across service restart and concurrent saves remain valid', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'castbox-settings-'));
  try {
    const file = join(directory, 'nested', 'settings.json');
    const defaults = defaultSettings(join(directory, 'downloads'));
    const store = new SettingsStore(file, defaults);
    assert.deepEqual(await store.read(), defaults);
    await Promise.all([store.save({ ...defaults, downloadConcurrency: 1 }), store.save({ ...defaults, downloadConcurrency: 5 })]);
    assert.equal((await new SettingsStore(file, defaults).read()).downloadConcurrency, 5);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('invalid writes leave saved preferences intact; later valid saves still succeed', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'castbox-settings-'));
  try {
    const file = join(directory, 'settings.json');
    const defaults = defaultSettings(directory);
    const store = new SettingsStore(file, defaults);
    await store.save(defaults);
    await assert.rejects(store.save({ ...defaults, downloadConcurrency: 99 }));
    assert.deepEqual(await store.read(), defaults);
    await store.save({ ...defaults, downloadConcurrency: 2 });
    assert.equal((await store.read()).downloadConcurrency, 2);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('corrupt settings are preserved rather than silently reset or overwritten', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'castbox-settings-'));
  try {
    const file = join(directory, 'settings.json');
    await writeFile(file, '{broken');
    const store = new SettingsStore(file, defaultSettings(directory));
    await assert.rejects(store.read(), /preserved/);
    await assert.rejects(store.save(defaultSettings(directory)), /preserved/);
    assert.equal(await readFile(file, 'utf8'), '{broken');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('settings reject unexpected fields, traversal, unsupported tokens and malformed braces', () => {
  const defaults = defaultSettings('/example');
  for (const filenamePattern of ['../audio.mp3', '/audio.mp3', '{secret}.mp3', '{title', 'folder\\audio.mp3', 'C:/audio.mp3']) {
    assert.equal(settingsSchema.safeParse({ ...defaults, filenamePattern }).success, false);
  }
  assert.equal(settingsSchema.safeParse({ ...defaults, execute: 'anything' }).success, false);
  assert.equal(settingsSchema.safeParse(defaults).success, true);
});

test('IPC sender validation rejects sibling files, remote origins, queries and child frames', () => {
  const expected = 'file:///app/dist/index.html';
  assert.equal(isTrustedSender(expected + '#settings', expected, true), true);
  for (const url of [undefined, 'file:///app/dist/other.html', expected + '?injected=1', 'https://example.com', 'invalid']) {
    assert.equal(isTrustedSender(url, expected, true), false);
  }
  assert.equal(isTrustedSender(expected, expected, false), false);
});
