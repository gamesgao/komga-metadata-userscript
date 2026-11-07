import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.runtime', { recursive: true });
await build({ entryPoints: ['tests/live/probe.ts'], platform: 'node', format: 'esm', bundle: true, packages: 'external', outfile: '.runtime/component-live.mjs' });
const result = spawnSync(process.execPath, ['.runtime/component-live.mjs'], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
