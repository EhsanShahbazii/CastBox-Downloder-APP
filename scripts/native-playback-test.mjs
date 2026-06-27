import { build } from 'esbuild';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const directory = await mkdtemp(join(tmpdir(), 'castbox-native-playback-'));
try {
  await build({ entryPoints: ['tests/native/playback-main.ts'], outfile: join(directory, 'main.cjs'), bundle: true, platform: 'node', format: 'cjs', external: ['electron'] });
  await build({ entryPoints: ['tests/native/playback-renderer.ts'], outfile: join(directory, 'renderer.js'), bundle: true, platform: 'browser' });
  await writeFile(join(directory, 'index.html'), '<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\'; media-src castbox-media:"><script src="renderer.js"></script>');
  const result = await new Promise((resolveCode, reject) => { const child = spawn(require('electron'), [join(directory, 'main.cjs')], { stdio: 'inherit', env: { ...process.env, CASTBOX_TEST_DIRECTORY: directory, CASTBOX_TEST_PRELOAD: resolve('dist-desktop/preload.cjs') } }); child.on('error', reject); child.on('exit', code => resolveCode(code ?? 1)); }); process.exitCode = result;
} finally { await rm(directory, { recursive: true, force: true }); }
