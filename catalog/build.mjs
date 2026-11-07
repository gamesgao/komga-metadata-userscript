import { cp, mkdir } from 'node:fs/promises';
import { build } from 'esbuild';
await mkdir('dist/sqlite', { recursive: true });
for (const name of ['analyzer.mjs', 'worker.mjs', 'client.mjs', 'client.d.mts', 'panel.mjs', 'panel.d.mts', 'browser-builder.mjs', 'browser-builder.d.mts']) {
  await cp(`src/${name}`, `dist/${name}`);
}
await build({ entryPoints: ['src/build-worker.mjs'], outfile: 'dist/build-worker.mjs', bundle: true,
  format: 'esm', platform: 'browser', external: ['./sqlite/index.mjs'] });
for (const name of ['index.mjs', 'sqlite3.wasm']) {
  await cp(`node_modules/@sqlite.org/sqlite-wasm/dist/${name}`, `dist/sqlite/${name}`);
}
