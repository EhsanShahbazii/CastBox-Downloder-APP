import { build } from 'esbuild';
await build({ entryPoints: { main: 'desktop/main.ts', preload: 'desktop/preload.ts' },
  bundle: true, platform: 'node', format: 'cjs', target: 'node22', external: ['electron'],
  outdir: 'dist-desktop', outExtension: { '.js': '.cjs' } });
