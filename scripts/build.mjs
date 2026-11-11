import { build } from 'esbuild';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { validateVersion, assetBase, latestBase, userFilename, metaFilename } from './release-config.mjs';
const version = validateVersion(JSON.parse(await readFile('package.json', 'utf8')).version);
const base = process.env.KOMGA_METADATA_ASSET_BASE ||
  assetBase(version, process.env.KOMGA_METADATA_RELEASE === '1');
if (base && !/^https?:\/\/[^?#]+\/$/.test(base)) throw new Error('Asset base must be an HTTP(S) directory URL ending in /');
execFileSync(process.execPath, ['build.mjs'], { cwd: 'catalog', stdio: 'inherit' });
await mkdir('dist/catalog', { recursive: true });
await cp('catalog/dist', 'dist/catalog', { recursive: true });
const header = `// ==UserScript==
// @name         Komga 元数据
// @namespace    https://github.com/gamesgao/komga-metadata-userscript
// @version      ${version}
// @description  桌面 Komga 多源元数据、离线目录、预览与读回验证
// @downloadURL  ${latestBase}${userFilename}
// @updateURL    ${latestBase}${metaFilename}
// @license      MIT
// @match        http://*/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      api.bgm.tv
// @connect      next.bgm.tv
// @connect      api.mangaupdates.com
// @connect      api.mangabaka.dev
// @connect      api.mangadex.org
// @connect      uploads.mangadex.org
// @connect      graphql.anilist.co
// @connect      e-hentai.org
// @connect      api.e-hentai.org
// @connect      exhentai.org
// @connect      api.myanimelist.net
// @connect      comicvine.gamespot.com
// @connect      yenpress.com
// @connect      viz.com
// @connect      www.viz.com
// @connect      webtoons.com
// @connect      www.webtoons.com
// @connect      raw.githubusercontent.com
// @connect      github.com
// @connect      api.github.com
// @connect      release-assets.githubusercontent.com
// @connect      objects.githubusercontent.com
// @connect      lain.bgm.tv
// @connect      cdn.mangaupdates.com
// @connect      s4.anilist.co
// @connect      ehgt.org
// @connect      hath.network
// @connect      static.bookwalker.com
// @connect      api.mangabaka.org
// @connect      mangabaka.dev
// @connect      mangabaka.org
// @connect      *
${base && new URL(base).hostname === '127.0.0.1' ? '// @connect      127.0.0.1\n' : ''}// @run-at       document-idle
// ==/UserScript==`;
const license = await readFile('LICENSE', 'utf8');
await writeFile(`dist/${metaFilename}`, `${header}\n`);
const notices = `Provider adaptations: Copyright (c) 2022 Snd-R; Copyright (c) 2023 eeezae; Copyright (c) 2025 ramu; Copyright (c) 2025 dyphire.\nSee THIRD_PARTY.md for provenance.\nOptional runtime dictionary: EhTagTranslation/Database, copyright its contributors, CC BY-NC-SA 3.0 (separate from code MIT).\nSource: https://github.com/EhTagTranslation/Database\nData license: https://github.com/EhTagTranslation/Database/blob/master/LICENSE.md\n${license}`;
await build({
  entryPoints: ['src/entry.ts'], bundle: true, format: 'iife', target: 'es2022',
  outfile: 'dist/komga-metadata.user.js', banner: { js: `${header}\n/*!\n${notices}*/` },
  define: { __ASSET_BASE__: JSON.stringify(base) }, legalComments: 'inline'
});
