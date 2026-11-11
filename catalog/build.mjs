import { cp, mkdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
await mkdir('dist/sqlite', { recursive: true });
for (const name of ['storage.mjs', 'storage.d.mts', 'analyzer.mjs', 'worker.mjs', 'client.mjs', 'client.d.mts', 'collection.mjs', 'collection.d.mts', 'panel.mjs', 'panel.d.mts', 'browser-builder.mjs', 'browser-builder.d.mts']) {
  await cp(`src/${name}`, `dist/${name}`);
}
await build({ entryPoints: ['src/worker.mjs'], outfile: 'dist/worker.mjs', bundle: true,
  format: 'esm', platform: 'browser', external: ['./sqlite/index.mjs'] });
await build({ entryPoints: ['src/build-worker.mjs'], outfile: 'dist/build-worker.mjs', bundle: true,
  format: 'esm', platform: 'browser', external: ['./sqlite/index.mjs'] });
for (const name of ['index.mjs', 'sqlite3.wasm']) {
  await cp(`node_modules/@sqlite.org/sqlite-wasm/dist/${name}`, `dist/sqlite/${name}`);
}
await build({
  entryPoints: ['dist/worker.mjs'], outfile: 'dist/catalog-worker.js', bundle: true,
  format: 'esm', platform: 'browser', target: 'es2022', legalComments: 'inline'
});
await build({
  entryPoints: ['dist/build-worker.mjs'], outfile: 'dist/catalog-build-worker.js', bundle: true,
  format: 'esm', platform: 'browser', target: 'es2022', legalComments: 'inline'
});
await mkdir('dist/licenses', { recursive: true });
for (const [source, target] of [
  ['node_modules/@zip.js/zip.js/LICENSE', 'dist/licenses/zip.js.txt'],
  ['node_modules/fzstd/LICENSE', 'dist/licenses/fzstd.txt'],
  ['node_modules/@noble/hashes/LICENSE', 'dist/licenses/noble-hashes.txt'],
  ['node_modules/xxhash-wasm/LICENSE.md', 'dist/licenses/xxhash-wasm.txt']
]) await cp(source, target);
await writeFile('dist/licenses/NOTICE.txt',
  'Runtime components: @sqlite.org/sqlite-wasm 3.54.1 (Apache-2.0; SQLite engine is public domain), ' +
  '@zip.js/zip.js (BSD-3-Clause), fzstd (MIT), @noble/hashes (MIT), and xxhash-wasm (MIT). ' +
  'The SQLite and bundled source licensing notices are retained in the worker bundles.\n');
