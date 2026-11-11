import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { createZstdCompress, zstdCompressSync, constants as zlibConstants } from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { resolve, join, extname } from 'node:path';

import { chromium } from 'playwright';
import { build } from '../src/build-cli.mjs';
import { tokens, matchQuery } from '../src/analyzer.mjs';
import { catalogProvider, validatePreparedManifest } from '../src/panel.mjs';

async function fixtures(dir) {
  const bg = join(dir, 'bg'); await mkdir(bg);
  const rows = {
    'subject.jsonlines': [
      { id: 1, type: 1, name: '葬送のフリーレン', name_cn: '葬送的芙莉莲', summary: null, infobox: '{{Infobox\n|别名={ [芙莉莲] }\n|作者= 山田鐘人\n}}', tags: [{ name: '漫画' }], series: true },
      { id: 2, type: 1, name: '葬送のフリーレン 第1巻', series: false, infobox: '{{Infobox\n|ISBN= 9780000000000\n}}' },
      { id: 3, type: 2, name: '葬送のフリーレン アニメ', series: true }
    ],
    'person.jsonlines': [{ id: 9, name: '山田鐘人', infobox: '{{Infobox Crt\n|简体中文名=山田钟人\n}}' }],
    'subject-persons.jsonlines': [{ subject_id: 1, person_id: 9, position: 1 }],
    'subject-relations.jsonlines': [{ subject_id: 1, related_subject_id: 2, relation_type: 1003 }]
  };
  for (const [name, values] of Object.entries(rows)) await writeFile(join(bg, name), values.map(v => JSON.stringify(v)).join('\n') + '\n');
  execFileSync('zip', ['-q', '-j', join(dir, 'bg.zip'), ...Object.keys(rows).map(n => join(bg, n))]);
  const eh = new DatabaseSync(join(dir, 'eh.db'));
  eh.exec(`CREATE TABLE gallery(gid INTEGER PRIMARY KEY,token TEXT,title TEXT,title_jpn TEXT,category TEXT,thumb TEXT,posted INTEGER,expunged INTEGER,removed INTEGER);
  CREATE TABLE gid_tid(gid INTEGER,tid INTEGER); CREATE TABLE tag(id INTEGER PRIMARY KEY,name TEXT);
  INSERT INTO gallery VALUES(42,'abcdef1234','English title','日本語作品','Manga','https://example.org/a.jpg',0,0,0);
  INSERT INTO tag VALUES(1,'artist:藤本タツキ'),(2,'female:猫耳'); INSERT INTO gid_tid VALUES(42,1),(42,2);`);
  eh.close();
  await pipeline(createReadStream(join(dir, 'eh.db')), createZstdCompress({ params: { [zlibConstants.ZSTD_c_checksumFlag]: 1 } }), createWriteStream(join(dir, 'eh.db.zstd')));
  const mb = new DatabaseSync(join(dir, 'manga.sqlite'));
  mb.exec(`CREATE TABLE series(id INTEGER PRIMARY KEY,canonical_url TEXT,description TEXT,titles TEXT,authors TEXT,artists TEXT,publishers TEXT,tags_v2 TEXT,links_v2 TEXT,status TEXT,original_language TEXT,cover_raw_url TEXT);
  CREATE TABLE tags(id INTEGER PRIMARY KEY,name TEXT,name_path TEXT,is_genre INTEGER); CREATE TABLE series_tags(series_id INTEGER,tag_id INTEGER,weight TEXT);
  INSERT INTO series VALUES(77,'https://mangabaka.org/77','summary','[{"language":"ja","title":"日本語漫画"}]','["藤本タツキ"]','[]','[]','[{"name":"冒険"}]','[]','completed','ja',NULL);
  INSERT INTO tags VALUES(5,'Drama','/Drama',1); INSERT INTO series_tags VALUES(77,5,'CORE');`);
  mb.close();
  execFileSync('tar', ['-czf', join(dir, 'manga.sqlite.tar.gz'), '-C', dir, 'manga.sqlite']);
  const bw = new DatabaseSync(join(dir, 'bw.sqlite'));
  bw.exec(`CREATE TABLE series(id TEXT PRIMARY KEY,title TEXT,alt_titles TEXT,display_title TEXT,description TEXT,image_id TEXT,listed_at TEXT);
  CREATE TABLE images(id TEXT PRIMARY KEY,name TEXT); CREATE TABLE tags(id TEXT PRIMARY KEY,name TEXT);
  CREATE TABLE series_tags(series_id TEXT,tag_id TEXT); CREATE TABLE products(id TEXT PRIMARY KEY,content_id TEXT,series_id TEXT,level INTEGER,title TEXT,alt_titles TEXT,display_title TEXT,description TEXT,image_id TEXT,display_order REAL,on_sale_at TEXT);
  CREATE TABLE product_external_ids(id TEXT,product_id TEXT,type INTEGER,external_id TEXT);
  CREATE TABLE product_contributors(product_id TEXT,contributor_id TEXT,role INTEGER,name_override TEXT); CREATE TABLE contributors(id TEXT,name TEXT,name_alt TEXT);
  INSERT INTO series VALUES('CNT_1','ワンパンマン','["一拳超人"]','ワンパンマン','あらすじ','IMG_000001',NULL);
  INSERT INTO images VALUES('IMG_000001','cover'); INSERT INTO tags VALUES('t','冒険'); INSERT INTO series_tags VALUES('CNT_1','t');
  INSERT INTO products VALUES('CNT_2','CNT_2','CNT_1',2,'ワンパンマン 1','[]','第1巻',NULL,'IMG_000001',1,'2024-01-01');
  INSERT INTO product_external_ids VALUES('x','CNT_2',3,'9780000000000');
  INSERT INTO contributors VALUES('a','村田雄介',NULL); INSERT INTO product_contributors VALUES('CNT_2','a',2,NULL);`);
  bw.close();
  await pipeline(createReadStream(join(dir, 'bw.sqlite')), createZstdCompress({ params: { [zlibConstants.ZSTD_c_checksumFlag]: 1 } }), createWriteStream(join(dir, 'bw.sqlite.zst')));
  return { bangumi: join(dir, 'bg.zip'), ehentai: join(dir, 'eh.db.zstd'), mangabaka: join(dir, 'manga.sqlite.tar.gz'), bookwalker: join(dir, 'bw.sqlite.zst') };
}
async function server(base = resolve('dist'), firstPort = 18820, lastPort = 18829) {
  const http = createServer(async (req, res) => {
    res.setHeader('access-control-allow-origin', '*');
    if (req.url === '/') { res.setHeader('content-type', 'text/html'); res.end('<input type="file" id="file">'); return; }
    const path = resolve(base, '.' + decodeURIComponent(req.url.split('?')[0]));
    if (!path.startsWith(base + '/')) { res.writeHead(403).end(); return; }
    try {
      res.setHeader('content-type', extname(path) === '.wasm' ? 'application/wasm' : 'text/javascript');
      res.end(await readFile(path));
    } catch { res.writeHead(404).end(); }
  });
  for (let port = firstPort; port <= lastPort; port++) {
    try {
      await new Promise((ok, fail) => { http.once('error', fail); http.listen(port, '127.0.0.1', ok); });
      return { http, origin: `http://127.0.0.1:${port}` };
    } catch (e) { if (e.code !== 'EADDRINUSE') throw e; }
  }
  throw new Error('No free catalog test port');
}

test('fixture archives, atomic failure, and browser file-backed FTS', async () => {
  await mkdir('.runtime', { recursive: true });
  const dir = await mkdtemp(resolve('.runtime/catalog-test-'));
  let browser, http, assetsHttp;
  try {
    const inputs = await fixtures(dir);
    const catalogs = {};
    for (const [provider, input] of Object.entries(inputs)) {
      const output = join(dir, provider + '.sqlite');
      const result = await build({ input, output, provider, sourceVersion: 'fixture-1' });
      assert.equal(result.count, provider === 'bangumi' ? 2 : 1);
      catalogs[provider] = output;
    }
    for (const [provider, input] of [['ehentai', 'eh.db'], ['mangabaka', 'manga.sqlite'], ['bookwalker', 'bw.sqlite']]) {
      const result = await build({ input: join(dir, input), output: join(dir, `raw-${provider}.sqlite`), provider });
      assert.equal(result.count, 1);
    }
    const cliResult = JSON.parse(execFileSync(process.execPath, [
      'src/build-cli.mjs', '--provider', 'bangumi', '--input', inputs.bangumi,
      '--output', join(dir, 'cli.sqlite'), '--source-version', 'cli-fixture'
    ], { encoding: 'utf8' }));
    assert.equal(cliResult.count, 2);
    assert.equal(cliResult.sourceVersion, 'cli-fixture');
    const padded = new DatabaseSync(catalogs.ehentai);
    padded.exec('CREATE TABLE padding(value BLOB); INSERT INTO padding VALUES(zeroblob(16777216));');
    padded.close();
    const wrongVersion = new DatabaseSync(join(dir, 'wrong-version.db'));
    wrongVersion.exec('CREATE TABLE manifest(schema_version,analyzer_version,provider,source_version); INSERT INTO manifest VALUES(999,1,\'x\',\'1\');');
    wrongVersion.close();
    const before = await readFile(catalogs.bangumi);
    await writeFile(join(dir, 'broken.zip'), 'invalid zip');
    await writeFile(join(dir, 'broken.zst'), 'invalid zstd');
    await writeFile(join(dir, 'huge-window.zst'), Buffer.from([0x28, 0xb5, 0x2f, 0xfd, 0, 0x88]));
    const rawEh = await readFile(join(dir, 'eh.db'));
    const midpoint = Math.floor(rawEh.length / 2);
    const checksumOptions = { params: { [zlibConstants.ZSTD_c_checksumFlag]: 1 } };
    await writeFile(join(dir, 'multiframe.zst'), Buffer.concat([
      zstdCompressSync(rawEh.subarray(0, midpoint), checksumOptions),
      zstdCompressSync(rawEh.subarray(midpoint), checksumOptions)
    ]));
    const checksumCorrupted = await readFile(inputs.ehentai);
    checksumCorrupted[checksumCorrupted.length - 1] ^= 1;
    await writeFile(join(dir, 'bad-checksum.zst'), checksumCorrupted);
    await assert.rejects(build({ input: join(dir, 'bad-checksum.zst'), output: catalogs.ehentai, provider: 'ehentai' }));
    await assert.rejects(build({ input: join(dir, 'broken.zip'), output: catalogs.bangumi, provider: 'bangumi' }));
    assert.deepEqual(await readFile(catalogs.bangumi), before);
    assert.ok(tokens('葬送のフリーレン').includes('フリ'));
    assert.ok(matchQuery('葬送').includes('葬送'));
    assert.throws(() => validatePreparedManifest({ schema_version: 99, analyzer_version: 1, catalogs: [] }));
    assert.throws(() => validatePreparedManifest({ schema_version: 1, analyzer_version: 1, catalogs: [{provider: 'x', source_version: '1', url: 'javascript:alert(1)'}] }));
    assert.equal(await catalogProvider({}, 'ehentai').resolveLink('https://e-hentai.org/g/42/abcdef1234/'), '42:abcdef1234');
    assert.equal(await catalogProvider({}, 'mangabaka').resolveLink('https://mangabaka.org/manga/77'), '77');
    assert.equal(await catalogProvider({}, 'bookwalker').resolveLink('https://bookwalker.com/series/1'), 'CNT_1');
    assert.throws(() => catalogProvider({}, 'mangadex'));

    ({ http, origin: globalThis.testOrigin } = await server());
    ({ http: assetsHttp, origin: globalThis.catalogAssetsOrigin } = await server(resolve('dist'), 18840, 18849));
    browser = await chromium.launch({
      // Playwright resolves the OS, locked browser revision, and PLAYWRIGHT_BROWSERS_PATH.
      headless: true,
      args: ['--host-resolver-rules=MAP catalog.test 127.0.0.1', '--no-proxy-server']
    });
    const page = await browser.newPage();
    await page.goto(globalThis.testOrigin);
    await page.evaluate(async () => {
      const { CatalogClient } = await import('/client.mjs');
      window.client = new CatalogClient('/worker.mjs');
    });
    await page.locator('#file').setInputFiles(inputs.mangabaka);
    const built = await page.evaluate(async () => {
      const { BrowserCatalogBuilder, browserBuildCapability } = await import('/browser-builder.mjs');
      const builder = new BrowserCatalogBuilder('/build-worker.mjs');
      window.builder = builder;
      const capability = browserBuildCapability();
      const result = await builder.build(document.querySelector('#file').files[0], 'mangabaka', 'browser-fixture');
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle('catalog-fixture-export.sqlite', { create: true });
      const stream = await handle.createWritable();
      let chunks = 0, maximum = 0;
      const target = {
        async write(data) { chunks++; maximum = Math.max(maximum, data.byteLength); await stream.write(data); },
        async close() { await stream.close(); },
        async abort(error) { await stream.abort(error); }
      };
      const bytes = await builder.exportTo(target, 4096);
      await window.client.open(await handle.getFile());
      const hits = await window.client.search('日本語漫画', 'mangabaka');
      const record = await window.client.get('mangabaka', '77');
      await root.removeEntry('catalog-fixture-export.sqlite');
      return { capability, result, bytes, chunks, maximum, hits, record };
    });
    assert.equal(built.capability.available, true);
    assert.equal(built.result.count, 1);
    assert.ok(built.chunks > 1);
    assert.ok(built.maximum <= 4096);
    assert.ok(built.bytes > 4096);
    assert.equal(built.hits[0].id, '77');
    assert.equal(built.record.authors[0].name, '藤本タツキ');
    assert.ok(built.record.genres.includes('/Drama'));
    await page.locator('#file').setInputFiles(join(dir, 'multiframe.zst'));
    const multiFrame = await page.evaluate(async () => {
      const result = await window.builder.build(document.querySelector('#file').files[0], 'ehentai');
      await window.client.open(await window.builder.file());
      return { result, record: await window.client.get('ehentai', '42:abcdef1234') };
    });
    assert.equal(multiFrame.result.count, 1);
    assert.ok(multiFrame.record.tags.includes('female:猫耳'));
    await page.locator('#file').setInputFiles(join(dir, 'huge-window.zst'));
    const hugeWindow = await page.evaluate(async () => {
      try { await window.builder.build(document.querySelector('#file').files[0], 'ehentai'); return 'unexpected'; }
      catch (error) { return error.message; }
    });
    assert.match(hugeWindow, /64 MiB/);
    const bulkPath = join(dir, 'bulk.sqlite');
    const bulkDb = new DatabaseSync(bulkPath);
    bulkDb.exec('CREATE TABLE series(id INTEGER PRIMARY KEY, titles TEXT, authors TEXT, original_language TEXT); BEGIN');
    const bulkInsert = bulkDb.prepare('INSERT INTO series VALUES(?,?,?,?)');
    for (let id = 1; id <= 2001; id++)
      bulkInsert.run(id, JSON.stringify([{ language: 'ja', title: `試験作品${id}` }]), 'null', 'ja');
    bulkDb.exec('COMMIT'); bulkDb.close();
    const bulkNative = await build({ input: bulkPath, output: join(dir, 'bulk-output.sqlite'), provider: 'mangabaka' });
    assert.equal(bulkNative.count, 2001);
    await page.locator('#file').setInputFiles(bulkPath);
    const bulkBrowser = await page.evaluate(async () => {
      const result = await window.builder.build(document.querySelector('#file').files[0], 'mangabaka');
      await window.client.open(await window.builder.file());
      const record = await window.client.get('mangabaka', '2001');
      return { result, record };
    });
    assert.equal(bulkBrowser.result.count, 2001);
    assert.equal(bulkBrowser.record.titles[0].text, '試験作品2001');
    for (const [provider, input] of Object.entries(inputs)) {
      await page.locator('#file').setInputFiles(input);
      const browserOutput = await page.evaluate(async ({ provider }) => {
        const result = await window.builder.build(document.querySelector('#file').files[0], provider, 'compare');
        await window.client.open(await window.builder.file());
        const manifest = await window.client.manifest();
        return { result, manifest };
      }, { provider });
      assert.equal(browserOutput.result.count, provider === 'bangumi' ? 2 : 1);
      assert.equal(browserOutput.manifest.provider, provider);
      const nativeDb = new DatabaseSync(catalogs[provider], { readOnly: true });
      const nativeRows = nativeDb.prepare('SELECT provider,source_id,record FROM entries ORDER BY source_id').all();
      nativeDb.close();
      for (const native of nativeRows) {
        const actual = await page.evaluate(({ provider, id }) => window.client.get(provider, id),
          { provider, id: native.source_id });
        assert.deepEqual(actual, JSON.parse(native.record), `native and browser ${provider}/${native.source_id}`);
      }
      if (provider === 'bookwalker') {
        const volume = await page.evaluate(() => window.client.get('bookwalker', 'CNT_2'));
        assert.equal(volume.volume, 1);
        assert.equal(volume.authors[0].name, '村田雄介');
      }
    }
    for (const [provider, input] of [['ehentai', 'eh.db'], ['mangabaka', 'manga.sqlite'], ['bookwalker', 'bw.sqlite']]) {
      await page.locator('#file').setInputFiles(join(dir, input));
      const count = await page.evaluate(async provider =>
        (await window.builder.build(document.querySelector('#file').files[0], provider, 'raw')).count, provider);
      assert.equal(count, 1);
    }
    await page.locator('#file').setInputFiles(join(dir, 'broken.zst'));
    const brokenZstd = await page.evaluate(async () => {
      try { await window.builder.build(document.querySelector('#file').files[0], 'ehentai'); return false; }
      catch { return true; }
    });
    assert.equal(brokenZstd, true);
    await page.locator('#file').setInputFiles(join(dir, 'bad-checksum.zst'));
    const badChecksum = await page.evaluate(async () => {
      try { await window.builder.build(document.querySelector('#file').files[0], 'ehentai'); return 'unexpected'; }
      catch (error) { return error.message; }
    });
    assert.match(badChecksum, /checksum mismatch/);
    await page.locator('#file').setInputFiles(join(dir, 'broken.zip'));
    const failedBuild = await page.evaluate(async () => {
      try { await window.builder.build(document.querySelector('#file').files[0], 'bangumi'); return false; }
      catch { return true; }
    });
    assert.equal(failedBuild, true);
    const cancellation = await page.evaluate(async () => {
      await window.client.open(await window.builder.file());
      if ((await window.client.manifest()).provider !== 'bookwalker') throw new Error('Failed build replaced previous output');
      const pending = window.builder.build(document.querySelector('#file').files[0], 'bangumi');
      window.builder.cancel();
      const buildCancelled = await pending.then(() => false, error => error.name === 'AbortError');
      let abortCalled = false, chunks = 0;
      const target = {
        async write() { chunks++; window.builder.cancel(); },
        async close() { throw new Error('Cancelled export was committed'); },
        async abort() { abortCalled = true; }
      };
      const exportCancelled = await window.builder.exportTo(target, 4096).then(() => false, error => error.name === 'AbortError');
      await window.client.open(await window.builder.file());
      const provider = (await window.client.manifest()).provider;
      return { buildCancelled, exportCancelled, abortCalled, chunks, provider };
    });
    assert.deepEqual(cancellation, { buildCancelled: true, exportCancelled: true, abortCalled: true, chunks: 1, provider: 'bookwalker' });
    await page.locator('#file').setInputFiles(join(dir, 'eh.db'));
    const activeCancel = await page.evaluate(async () => {
      const promise = window.builder.build(document.querySelector('#file').files[0], 'ehentai');
      const result = promise.then(() => 'success', error => error.name);
      while (!window.builder.current) await new Promise(resolve => setTimeout(resolve, 0));
      window.builder.cancel();
      const state = await result;
      await window.client.open(await window.builder.file());
      return { state, provider: (await window.client.manifest()).provider };
    });
    assert.deepEqual(activeCancel, { state: 'AbortError', provider: 'bookwalker' });
    await page.evaluate(async () => {
      await window.builder.dispose();
    });
    await page.evaluate(async () => {
      const { mountCatalogPanel } = await import('/panel.mjs');
      const container = document.createElement('div');
      container.id = 'panel'; document.body.append(container);
      window.unmount = mountCatalogPanel(container, window.client, { buildWorkerUrl: '/build-worker.mjs' });
    });
    await page.locator('#panel details').evaluateAll(elements => elements.forEach(el => { el.open = true; }));
    await page.getByLabel('构建来源').selectOption('mangabaka');
    await page.locator('#panel input[type=file]').nth(1).setInputFiles(inputs.mangabaka);
    await page.getByRole('button', { name: '构建并加载' }).click();
    await page.getByRole('status').filter({ hasText: /^mangabaka · 已构建并加载/ }).waitFor();
    assert.equal((await page.evaluate(() => window.client.manifest())).provider, 'mangabaka');
    await page.evaluate(() => {
      window.showSaveFilePicker = async () => {
        const root = await navigator.storage.getDirectory();
        return root.getFileHandle('panel-export.sqlite', { create: true });
      };
    });
    await page.getByRole('button', { name: '导出数据库', exact: true }).click();
    await page.getByRole('status').filter({ hasText: /数据库已保存$/ }).waitFor();
    assert.equal(await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const handle = await root.getFileHandle('panel-export.sqlite');
      await window.client.open(await handle.getFile());
      const provider = (await window.client.manifest()).provider;
      await root.removeEntry('panel-export.sqlite');
      return provider;
    }), 'mangabaka');
    await page.evaluate(() => window.unmount());
    const examples = {
      // Same fixture catalogs will also be opened simultaneously in the collection.
      bangumi: ['フリーレン', '1'], ehentai: ['日本語', '42:abcdef1234'],
      mangabaka: ['日本語漫画', '77'], bookwalker: ['ワンパンマン', 'CNT_1']
    };
    await page.evaluate(async () => {
      const { CatalogCollection } = await import('/collection.mjs');
      const { mountCatalogPanel } = await import('/panel.mjs');
      window.collection = new CatalogCollection('/worker.mjs');
      window.unmount = mountCatalogPanel(document.querySelector('#panel'), window.collection, { buildWorkerUrl: '/build-worker.mjs' });
    });
    await page.getByRole('status').filter({ hasText: /^mangabaka · 已加载$/ }).waitFor();
    assert.equal((await page.evaluate(() => window.collection.get('mangabaka', '77'))).id, '77');
    await page.evaluate(() => window.unmount());
    for (const [provider, [query, id]] of Object.entries(examples)) {
      await page.locator('#file').setInputFiles(catalogs[provider]);
      const result = await page.evaluate(async ({ provider, query, id }) => {
        const client = window.client;
        const manifest = await client.open(document.querySelector('#file').files[0]);
        const hits = await client.search(query, provider);
        const record = await client.get(provider, id);
        const stats = await client.stats();
        return { manifest, hits, record, stats };
      }, { provider, query, id });
      assert.equal(result.manifest.source_version, 'fixture-1');
      assert.ok(result.hits.some(hit => hit.provider === provider && hit.id === id));
      assert.equal(result.record.provider, provider);
      assert.ok(result.stats.reads > 0);
      assert.ok(result.stats.largestRead <= 65536);
      if (provider === 'ehentai') {
        assert.ok(result.record.tags.includes('artist:藤本タツキ'));
        assert.equal(result.record.authors[0].name, '藤本タツキ');
        assert.ok(result.stats.bytesRead < result.stats.fileSize / 4);
      }
      if (provider === 'bangumi') {
        assert.equal(result.record.books[0].id, '2');
        assert.equal(result.record.books[0].volume, 1);
        assert.equal(result.record.books[0].isbn, '9780000000000');
        assert.equal(result.record.raw.subject.summary, null);
        assert.equal(Object.hasOwn(result.record.raw.subject, 'unknown_field'), false);
        const filtered = await page.evaluate(() => window.client.search('フリーレン', 'ehentai'));
        assert.deepEqual(filtered, []);
      }
      if (provider === 'mangabaka') {
        assert.ok(result.record.genres.includes('/Drama'));
        assert.equal(result.record.status, 'ENDED');
      }
      if (provider === 'bookwalker') {
        assert.equal(result.record.books[0].volume, 1);
        assert.equal(result.record.books[0].authors[0].name, '村田雄介');
        assert.equal(result.record.books[0].isbn, '9780000000000');
        const volume = await page.evaluate(() => window.client.get('bookwalker', 'CNT_2'));
        assert.equal(volume.id, 'CNT_2');
        assert.equal(volume.volume, 1);
      }
      await page.evaluate(() => window.collection.open(document.querySelector('#file').files[0]));
    }
    assert.deepEqual(await page.evaluate(async () => ({
      sources:['bangumi','ehentai','mangabaka','bookwalker'].map(p=>window.collection.hasProvider(p)),
      ids:await Promise.all([['bangumi','1'],['ehentai','42:abcdef1234'],['mangabaka','77'],['bookwalker','CNT_1']].map(async([p,id])=>(await window.collection.get(p,id)).id))
    })),{sources:[true,true,true,true],ids:['1','42:abcdef1234','77','CNT_1']});
    await page.evaluate(()=>window.collection.dispose());
    await writeFile(join(dir, 'wrong.db'), 'not sqlite');
    await page.locator('#file').setInputFiles(join(dir, 'wrong.db'));
    const invalid = await page.evaluate(async () => {
      try { await window.client.open(document.querySelector('#file').files[0]); return 'unexpected'; }
      catch (e) { return e.message; }
    });
    assert.match(invalid, /Invalid catalog/);
    assert.equal((await page.evaluate(() => window.client.manifest())).provider, 'bookwalker');
    await page.locator('#file').setInputFiles(join(dir, 'wrong-version.db'));
    const wrong = await page.evaluate(async () => {
      try { await window.client.open(document.querySelector('#file').files[0]); return 'unexpected'; }
      catch (e) { return e.message; }
    });
    assert.match(wrong, /version/);
    assert.equal((await page.evaluate(() => window.client.manifest())).provider, 'bookwalker');
    const afterCancel = await page.evaluate(async () => {
      const pending = window.client.search('ワンパンマン', 'bookwalker');
      window.client.cancel();
      const cancelled = await pending.then(() => false, e => e.name === 'AbortError');
      const manifest = await window.client.manifest();
      return { cancelled, manifest };
    });
    assert.equal(afterCancel.cancelled, true);
    assert.equal(afterCancel.manifest.provider, 'bookwalker');
    await page.evaluate(() => window.client.dispose());
    const blobPage = await browser.newPage();
    await blobPage.goto(globalThis.testOrigin);
    await blobPage.locator('#file').setInputFiles(catalogs.mangabaka);
    await blobPage.evaluate(async ({ assetOrigin }) => {
      const { CatalogClient } = await import('/client.mjs');
      const makeWorker = async name => {
        const [script, wasmBinary] = await Promise.all([
          fetch(`${assetOrigin}/${name}`).then(response => {
            if (!response.ok) throw new Error(`worker asset HTTP ${response.status}`);
            return response.text();
          }),
          fetch(`${assetOrigin}/sqlite/sqlite3.wasm`).then(response => {
            if (!response.ok) throw new Error(`WASM HTTP ${response.status}`);
            return response.arrayBuffer();
          })
        ]);
        const objectUrl = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
        const worker = new Worker(objectUrl, { type: 'module' });
        URL.revokeObjectURL(objectUrl);
        return { worker, initOptions: { wasmBinary } };
      };
      window.blobClient = new CatalogClient(undefined, { workerFactory: () => makeWorker('catalog-worker.js') });
      window.blobBuilderFactory = () => makeWorker('catalog-build-worker.js');
    }, { assetOrigin: globalThis.catalogAssetsOrigin });
    const blobOpened = await blobPage.evaluate(async () => {
      const result = await window.blobClient.open(document.querySelector('#file').files[0]);
      return { result, hits: await window.blobClient.search('日本語漫画', 'mangabaka') };
    });
    assert.equal(blobOpened.result.provider, 'mangabaka');
    assert.equal(blobOpened.hits[0].id, '77');
    await blobPage.locator('#file').setInputFiles(inputs.mangabaka);
    const blobPanelReady = await blobPage.evaluate(async () => {
      const { BrowserCatalogBuilder } = await import('/browser-builder.mjs');
      const { mountCatalogPanel } = await import('/panel.mjs');
      window.blobBuilder = new BrowserCatalogBuilder(undefined, { workerFactory: window.blobBuilderFactory });
      await window.blobBuilder.build(document.querySelector('#file').files[0], 'mangabaka', 'blob-fixture');
      const container = document.createElement('div');
      container.id = 'blob-panel'; document.body.append(container);
      window.blobUnmount = mountCatalogPanel(container, window.blobClient, {
        builder: window.blobBuilder,
        download: async (_url, _name, signal) => {
          if (signal.aborted) throw new DOMException('cancelled', 'AbortError');
        }
      });
      return window.blobBuilder.ready;
    });
    assert.equal(blobPanelReady, true);
    await blobPage.locator('#blob-panel details').first().evaluate(element => { element.open = true; });
    await blobPage.locator('#blob-panel input[type=file]').first().setInputFiles(catalogs.mangabaka);
    await blobPage.getByRole('status').filter({ hasText: /^mangabaka · 已加载$/ }).waitFor();
    await blobPage.locator('#blob-panel input[type=file]').first().setInputFiles(join(dir, 'wrong.db'));
    await blobPage.getByRole('status').filter({ hasText: /^失败/ }).waitFor({ timeout: 5000 });
    assert.equal((await blobPage.evaluate(() => window.blobClient.manifest())).source_version, 'fixture-1');
    await blobPage.evaluate(() => Object.defineProperty(window, 'showSaveFilePicker', {
      value: undefined, configurable: true
    }));
    const browserDownload = blobPage.waitForEvent('download', { timeout: 5000 }).catch(() => undefined);
    await blobPage.getByRole('button', { name: '导出数据库', exact: true }).click();
    const exported = await browserDownload;
    assert.ok(exported, await blobPage.getByRole('status').textContent());
    const exportedPath = join(dir, 'blob-export.sqlite');
    await exported.saveAs(exportedPath);
    await blobPage.locator('#file').setInputFiles(exportedPath);
    const reopenedExport = await blobPage.evaluate(async () => {
      const manifest = await window.blobClient.open(document.querySelector('#file').files[0]);
      const hits = await window.blobClient.search('日本語漫画', 'mangabaka');
      await window.blobUnmount();
      const reopened = await window.blobClient.manifest();
      return { manifest, hits, reopened };
    });
    assert.equal(reopenedExport.manifest.provider, 'mangabaka');
    assert.equal(reopenedExport.hits[0].id, '77');
    assert.equal(reopenedExport.reopened.provider, 'mangabaka');
    await blobPage.evaluate(() => window.blobClient.dispose());
    await blobPage.close();
    const insecure = await browser.newPage();
    await insecure.route('http://catalog.test:**/*', async route => {
      const target = route.request().url().replace('catalog.test', '127.0.0.1');
      await route.fulfill({ response: await route.fetch({ url: target }) });
    });
    const response = await insecure.goto(globalThis.testOrigin.replace('127.0.0.1', 'catalog.test'));
    assert.equal(response.status(), 200, await insecure.locator('body').textContent());
    await insecure.locator('#file').setInputFiles(catalogs.bangumi);
    const insecureResult = await insecure.evaluate(async () => {
      const { CatalogClient } = await import('/client.mjs');
      const { browserBuildCapability } = await import('/browser-builder.mjs');
      const client = new CatalogClient('/worker.mjs');
      await client.open(document.querySelector('#file').files[0]);
      const hits = await client.search('フリーレン', 'bangumi');
      client.dispose();
      return { secure: isSecureContext, hits, capability: browserBuildCapability() };
    });
    assert.equal(insecureResult.secure, false);
    assert.equal(insecureResult.capability.available, true);
    assert.ok(insecureResult.hits.some(hit => hit.id === '1'));
    // Real insecure-origin build, not a mock isSecureContext override.
    for (const [provider, input] of Object.entries(inputs)) {
      await insecure.locator('#file').setInputFiles(input);
      const built = await insecure.evaluate(async provider => {
        const { BrowserCatalogBuilder } = await import('/browser-builder.mjs');
        const { CatalogClient } = await import('/client.mjs');
        const builder = new BrowserCatalogBuilder('/build-worker.mjs');
        const result = await builder.build(document.querySelector('#file').files[0], provider, 'plain-http');
        const reader = new CatalogClient('/worker.mjs'); await reader.open(await builder.file());
        const manifest = await reader.manifest(); reader.dispose(); await builder.persist(); await builder.dispose();
        return { result, manifest };
      }, provider);
      assert.equal(built.manifest.provider, provider); assert.ok(built.result.count > 0);
    }
    const atomic = await insecure.evaluate(async()=>{
      const { catalogDirectory } = await import('/storage.mjs');
      const directory = await catalogDirectory('komga-catalog-storage-test');
      const file = await directory.getFileHandle('index.json', {create:true});
      let out = await file.createWritable(); await out.write('old'); await out.close();
      out = await file.createWritable(); await out.write('not committed'); await out.abort();
      const afterAbort = await (await file.getFile()).text();
      out = await file.createWritable(); await out.write('new'); await out.close();
      const afterClose=await(await file.getFile()).text();
      out=await file.createWritable();const pendingWrite=out.write(new Uint8Array(2*1024*1024)).catch(e=>e.name);await out.abort();await pendingWrite;
      const afterInterrupted=await(await file.getFile()).text();
      const abandoned=await directory.getFileHandle('abandoned.bin',{create:true});
      const abandonedWriter=await abandoned.createWritable();await abandonedWriter.write('partial');await directory.removeEntry('abandoned.bin');await abandonedWriter.abort();
      const names=await new Promise((ok,no)=>directory.entry.createReader().readEntries(entries=>ok(entries.map(e=>e.name)),no));
      return { afterAbort, afterClose, afterInterrupted, names };
    });
    assert.deepEqual(atomic, {afterAbort:'old',afterClose:'new',afterInterrupted:'new',names:['index.json']});
    const sparse = await insecure.evaluate(async()=>{
      const moduleUrl=new URL('/storage.mjs',location.href).href;
      const code=`import {catalogDirectory} from ${JSON.stringify(moduleUrl)};
        const d=await catalogDirectory('komga-catalog-sparse-test');const f=await d.getFileHandle('sparse.bin',{create:true});const h=await f.createSyncAccessHandle();
        h.truncate(0);h.write(new Uint8Array([7]),{at:8192});const bytes=new Uint8Array(8193);const count=h.read(bytes,{at:0});postMessage({size:h.getSize(),count,first:bytes[0],last:bytes[8192]});h.close();await d.removeEntry('sparse.bin');`;
      const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));const w=new Worker(url,{type:'module'});
      try{return await new Promise((ok,no)=>{w.onmessage=e=>ok(e.data);w.onerror=e=>no(Error(e.message))});}finally{w.terminate();URL.revokeObjectURL(url)}
    });
    assert.deepEqual(sparse,{size:8193,count:8193,first:0,last:7});
    const startupCancel=await insecure.evaluate(async()=>{
      const {BrowserCatalogBuilder}=await import('/browser-builder.mjs');
      let entered,release,posts=0,terminated=0;
      const ready=new Promise(r=>entered=r);
      const builder=new BrowserCatalogBuilder(undefined,{workerFactory:()=>{entered();return new Promise(r=>release=r)}});
      const pending=builder.build(new File(['x'],'source.zip'),'bangumi').catch(e=>e.name);
      await ready;builder.cancel();release({postMessage(){posts++},terminate(){terminated++}});
      return {error:await pending,posts,terminated,busy:builder.busy};
    });
    assert.deepEqual(startupCancel,{error:'AbortError',posts:0,terminated:1,busy:false});
    await insecure.reload();
    const restored = await insecure.evaluate(async()=>{
      const { CatalogCollection }=await import('/collection.mjs');
      const { mountCatalogPanel }=await import('/panel.mjs');
      const client=new CatalogCollection('/worker.mjs');
      const unmount=mountCatalogPanel(document.body,client,{buildWorkerUrl:'/build-worker.mjs'});
      await client.restoring;
      const sources=['bangumi','ehentai','mangabaka','bookwalker'].map(p=>client.hasProvider(p));
      const hits=await client.search('フリーレン','bangumi');window.httpCatalog={client,unmount};return {sources,hits};
    });
    assert.deepEqual(restored.sources,[true,true,true,true]); assert.ok(restored.hits.some(hit=>hit.id==='1'));
    const httpDownload=insecure.waitForEvent('download');await insecure.getByRole('button',{name:'导出数据库',exact:true}).nth(3).click();
    const exportPath=join(dir,'http-bookwalker-export.sqlite');await(await httpDownload).saveAs(exportPath);
    const exportedDb=new DatabaseSync(exportPath,{readOnly:true});
    try {assert.equal(exportedDb.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.equal(exportedDb.prepare('SELECT provider FROM entries LIMIT 1').get().provider,'bookwalker');}finally{exportedDb.close()}
    await insecure.evaluate(async()=>{await window.httpCatalog.unmount();window.httpCatalog.client.dispose()});
    // Submit all sources. Downloads overlap, builds are bounded, and detaching the view
    // does not cancel work. Completed downloads survive failure/cancel and a real reload.
    for (const [id,input] of Object.entries(inputs)) {
      await insecure.locator('#file').setInputFiles(input);
      await insecure.evaluate(id=>{window.rawFiles??={};window.rawFiles[id]=document.querySelector('#file').files[0];},id);
    }
    await insecure.evaluate(async()=>{
      const {mountCatalogPanel}=await import('/panel.mjs');const {CatalogCollection}=await import('/collection.mjs');
      const {BrowserCatalogBuilder}=await import('/browser-builder.mjs');const {ArchiveCache}=await import('/archive-cache.mjs');
      const {catalogDirectory,uniqueId}=await import('/storage.mjs');
      window.taskClient=new CatalogCollection('/worker.mjs');window.taskCache=new ArchiveCache();
      const builder=new BrowserCatalogBuilder('/build-worker.mjs'),original=builder.build.bind(builder);
      window.taskStats={downloads:0,activeDownloads:0,peakDownloads:0,builds:[],activeBuilds:0,peakBuilds:0};window.downloadWaiters=[];
      window.firstBuildStarted=new Promise(r=>window.markFirstBuild=r);
      builder.build=async(...args)=>{const s=window.taskStats;s.builds.push(args[1]);s.peakBuilds=Math.max(s.peakBuilds,++s.activeBuilds);
        try{if(args[1]==='bangumi'){window.markFirstBuild();await new Promise(r=>window.releaseBuild=r);throw Error('injected build failure');}return await original(...args);}finally{s.activeBuilds--;}};
      window.taskHost=document.createElement('div');document.body.append(window.taskHost);
      const downloadArchive=async(url,name,signal,progress)=>{
        progress(3,10);
        const s=window.taskStats;s.downloads++;s.peakDownloads=Math.max(s.peakDownloads,++s.activeDownloads);
        if(!window.downloadReady)await new Promise(r=>window.downloadWaiters.push(r));
        const id=name.includes('bangumi')?'bangumi':name.includes('e-hentai')?'ehentai':name.includes('series.sqlite')?'mangabaka':'bookwalker';
        if(id!=='bangumi')await window.firstBuildStarted;
        const directory=await catalogDirectory('komga-catalog-download');const storageName=uniqueId()+'-'+name;
        const handle=await directory.getFileHandle(storageName,{create:true}),out=await handle.createWritable();await out.write(window.rawFiles[id]);await out.close();s.activeDownloads--;
        return {file:await handle.getFile(),storageName,cleanup:()=>directory.removeEntry(storageName)};
      };
      window.taskUnmount=mountCatalogPanel(window.taskHost,window.taskClient,{builder,downloadArchive,fetchManifest:async()=>({browser_download_url:'https://github.com/bangumi/Archive/releases/download/fixture/test.zip'})});
      await window.taskClient.restoring;
    });
    for(const name of ['Bangumi','E-Hentai','MangaBaka','BookWalker']) await insecure.getByRole('button',{name:name+' · 下载并构建',exact:true}).click();
    await insecure.waitForFunction(()=>window.taskStats.downloads===2);
    const downloadBar=insecure.locator('[data-provider=bangumi] progress');
    assert.equal(await downloadBar.evaluate(e=>e.value),3);assert.equal(await downloadBar.evaluate(e=>e.max),10);
    assert.ok((await downloadBar.boundingBox()).height>=8);
    await insecure.evaluate(()=>{window.taskHost.remove();window.downloadReady=true;window.downloadWaiters.forEach(r=>r())});
    await insecure.waitForFunction(async()=>window.taskStats.downloads===4&&window.releaseBuild&&Boolean(await window.taskCache.get('bookwalker')));
    await insecure.evaluate(()=>document.body.append(window.taskHost));
    await insecure.locator('[data-provider=ehentai]').getByRole('button',{name:'取消任务',exact:true}).click();
    await insecure.evaluate(()=>window.releaseBuild());
    await insecure.locator('[data-provider=bookwalker]').getByText(/已构建并加载/).waitFor();
    await insecure.locator('[data-provider=mangabaka]').getByText(/已构建并加载/).waitFor();
    assert.deepEqual(await insecure.evaluate(()=>window.taskStats.builds.slice().sort()),['bangumi','bookwalker','mangabaka']);
    assert.deepEqual(await insecure.evaluate(()=>[window.taskStats.peakDownloads,window.taskStats.peakBuilds]),[2,1]);
    assert.deepEqual(await insecure.evaluate(async()=>Promise.all(['bangumi','ehentai','mangabaka','bookwalker'].map(async id=>Boolean(await window.taskCache.get(id))))),[true,true,false,false]);
    await insecure.reload();
    await insecure.evaluate(async()=>{
      const {mountCatalogPanel}=await import('/panel.mjs');const {CatalogCollection}=await import('/collection.mjs');const {ArchiveCache}=await import('/archive-cache.mjs');
      window.taskClient=new CatalogCollection('/worker.mjs');window.taskCache=new ArchiveCache();window.unexpectedDownloads=0;
      const {BrowserCatalogBuilder}=await import('/browser-builder.mjs');const builder=new BrowserCatalogBuilder('/build-worker.mjs'),persist=builder.persist.bind(builder);
      builder.persist=async()=>{if(!window.failedPersist){window.failedPersist=true;throw Error('fixture save failure')}return persist()};
      window.taskUnmount=mountCatalogPanel(document.body,window.taskClient,{builder,downloadArchive:async()=>{window.unexpectedDownloads++;throw Error('must reuse complete archive')}});
      await window.taskClient.restoring;window.previousBangumi=window.taskClient.fileFor('bangumi').name;
    });
    await insecure.getByRole('button',{name:'Bangumi · 继续构建',exact:true}).click();
    await insecure.locator('[data-provider=bangumi]').getByText(/fixture save failure/).waitFor();
    assert.equal(await insecure.evaluate(()=>window.taskClient.fileFor('bangumi').name===window.previousBangumi),true);
    assert.equal(await insecure.evaluate(async()=>(await window.taskClient.fileFor('bangumi').slice(0,15).text())), 'SQLite format 3');
    assert.equal(await insecure.evaluate(async()=>Boolean(await window.taskCache.get('bangumi'))),true);
    await insecure.getByRole('button',{name:'Bangumi · 继续构建',exact:true}).click();
    await insecure.locator('[data-provider=bangumi]').getByText(/已构建并加载/).waitFor();
    assert.equal(await insecure.evaluate(()=>window.unexpectedDownloads),0);
    assert.equal(await insecure.evaluate(async()=>Boolean(await window.taskCache.get('bangumi'))),false);
    const beforeClear=await insecure.evaluate(async()=>(await(await import('/archive-cache.mjs')).storageUsage()).owned);
    insecure.on('dialog',dialog=>dialog.accept());
    await insecure.locator('[data-provider=ehentai]').getByRole('button',{name:'清除原始档案',exact:true}).click();
    await insecure.locator('[data-provider=ehentai]').getByText('已清除原始档案，已有数据库不变',{exact:true}).waitFor();
    assert.equal(await insecure.evaluate(()=>window.taskClient.hasProvider('ehentai')),true);
    await insecure.locator('[data-provider=bookwalker]').getByRole('button',{name:'移除数据库',exact:true}).click();
    await insecure.locator('[data-provider=bookwalker]').getByText('已移除浏览器数据库',{exact:true}).waitFor();
    assert.equal(await insecure.evaluate(()=>window.taskClient.hasProvider('bookwalker')),false);
    const afterClear=await insecure.evaluate(async()=>(await(await import('/archive-cache.mjs')).storageUsage()).owned);
    assert.ok(afterClear<beforeClear);assert.ok((await insecure.locator('[data-storage]').textContent()).includes('本工具文件占用'));
    assert.ok(!(await insecure.locator('[data-storage]').textContent()).includes('配额'));
    await insecure.evaluate(async()=>{await window.taskUnmount();window.taskClient.dispose()});
  } finally {
    if (browser) await browser.close();
    if (http) await new Promise(ok => http.close(ok));
    if (assetsHttp) await new Promise(ok => assetsHttp.close(ok));
    await rm(dir, { recursive: true, force: true });
  }
});
