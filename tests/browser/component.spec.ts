import { test, expect, type Page } from '@playwright/test';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { deflateSync } from 'node:zlib';
function chunk(name: string, bytes: Buffer): Buffer {
  const data = Buffer.concat([Buffer.from(name), bytes]);
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  const size = Buffer.alloc(4), checksum = Buffer.alloc(4);
  size.writeUInt32BE(bytes.length); checksum.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
  return Buffer.concat([size, data, checksum]);
}
const header = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]);
const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([0, 255, 0, 0, 255]))), chunk('IEND', Buffer.alloc(0))]);
let server: Server, base: string, artifact: string;
let patches: { path: string; body: Record<string, unknown> }[];
let uploaded: string[];
let series: { id: string; oneshot: boolean; metadata: Record<string, unknown> };
let book: { id: string; seriesId: string; metadata: Record<string, unknown> };
let covers: { id: string; selected: boolean; type: string }[];
let coverFails: boolean;
test.beforeAll(async () => {
  artifact = await readFile('dist/komga-metadata.user.js', 'utf8');
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, base);
    const json = (value: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    if (url.pathname.startsWith('/reader/api/v1/')) {
      if (req.method === 'GET' && url.pathname.endsWith('/series/s-real')) return json(series);
      if (req.method === 'GET' && url.pathname.endsWith('/series/s-real/books')) return json({ content: [book], last: true });
      if (req.method === 'GET' && url.pathname.endsWith('/books/book-actual')) return json(book);
      if (req.method === 'PATCH') {
        const buffers: Buffer[] = []; for await (const chunk of req) buffers.push(Buffer.from(chunk));
        const body = JSON.parse(Buffer.concat(buffers).toString());
        patches.push({ path: url.pathname, body });
        Object.assign(url.pathname.includes('/books/') ? book.metadata : series.metadata, body);
        return json({});
      }
      if (url.pathname.endsWith('/thumbnails')) {
        if (req.method === 'GET') return json(covers);
        if (req.method === 'POST') {
          const buffers: Buffer[] = []; for await (const chunk of req) buffers.push(Buffer.from(chunk));
          const body = Buffer.concat(buffers);
          if (!req.headers['content-type']?.includes('multipart/form-data') || !body.includes(png)) { res.statusCode = 400; return json({}); }
          uploaded.push(url.pathname);
          covers.push({ id: 'uploaded-own', selected: false, type: 'USER_UPLOADED' }); return json(covers.at(-1));
        }
      }
      const match = url.pathname.match(/\/thumbnails\/([\w-]+)(\/selected)?$/);
      if (match) {
        if (req.method === 'PUT') { covers.forEach(c => c.selected = c.id === match[1]); return json({}); }
        if (req.method === 'DELETE') { covers = covers.filter(c => c.id !== match[1]); return json({}); }
        res.setHeader('Content-Type', 'image/png'); return res.end(png);
      }
      res.statusCode = 404; return json({});
    }
    if (url.pathname === '/fixture-cover.png') {
      if (coverFails) { res.statusCode = 404; return res.end('missing'); }
      res.setHeader('Content-Type', 'image/png'); return res.end(png);
    }
    if (url.pathname === '/reader/assets/app.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(''); }
    res.setHeader('Content-Type', 'text/html');
    if (url.pathname === '/unrelated') return res.end('<title>Ordinary Shop</title><div id="app"></div><script src="/reader/assets/app.js"></script>');
    res.end('<title>Komga</title><div id="app"><main><h1>Fixture One-shot</h1></main></div><script src="/reader/assets/app.js"></script>');
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
test.afterAll(async () => { await new Promise<void>((resolve, reject) => server.close(e => e ? reject(e) : resolve())); });
test.beforeEach(() => {
  patches = []; uploaded = []; coverFails = false;
  series = { id: 's-real', oneshot: true, metadata: { title: '原始标题', titleLock: false, tags: ['old'], tagsLock: false, summary: 'old summary', summaryLock: true, links: [], alternateTitles: [] } };
  book = { id: 'book-actual', seriesId: 's-real', metadata: { title: 'Original Book', number: '1', authors: [], authorsLock: false, tags: [], links: [], summary: 'locked original', summaryLock: true } };
  covers = [{ id: 'original-user', selected: true, type: 'USER_UPLOADED' }];
});
async function install(page: Page, path = '/reader/oneshot/s-real') {
  await page.addInitScript(() => {
    const values: Record<string, unknown> = {};
    const calls: string[] = [];
    Object.assign(window, {
      fixtureCalls: calls,
      GM_getValue: (k: string, fallback: unknown) => { calls.push('storage-get'); return values[k] ?? fallback; },
      GM_setValue: (k: string, value: unknown) => { calls.push('storage-set'); values[k] = value; },
      GM_registerMenuCommand: (_name: string, action: () => void) => { calls.push('menu'); Object.assign(window, { fixtureMenu: action }); },
      GM_xmlhttpRequest: (o: { url: string; method: string; headers: Record<string, string>; data?: string; responseType: string; onload(r: unknown): void; onerror(): void; onabort(): void }) => {
        calls.push('network');
        const c = new AbortController();
        fetch(o.url, { method: o.method, headers: o.headers, body: o.data, signal: c.signal })
          .then(async r => o.onload({ status: r.status, responseHeaders: [...r.headers].map(([k, v]) => `${k}: ${v}`).join('\r\n'), responseText: o.responseType === 'blob' ? '' : await r.text(), response: o.responseType === 'blob' ? await r.blob() : '', finalUrl: r.url }))
          .catch(() => c.signal.aborted ? o.onabort() : o.onerror());
        return { abort: () => c.abort() };
      }
    });
  });
  await page.route('https://next.bgm.tv/**', route => {
    const url = route.request().url();
    const body = url.includes('search/subjects') ? { data: [{ id: 1, name: '日本語候选' }] }
      : url.includes('staffs/persons') ? { data: [{ staff: { name: '山田鐘人', nameCN: 'Wrong display fallback' }, positions: [{ type: { id: 2001 } }] }], total: 1 }
      : { id: 1, name: '日本語候选', nameCN: '中文候选', summary: '<img src=x onerror=alert(1)>新简介<script>window.remoteExecuted=true</script>', tags: [{ name: 'female:glasses' }], series: false, images: { large: `${base}/fixture-cover.png` }, infobox: [] };
    return route.fulfill({ json: body, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.goto(base + path);
  await page.addScriptTag({ content: artifact });
}
async function readAndPreview(page: Page, cover = false) {
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  await expect(page.locator('#komga-metadata-panel p[data-state]')).toHaveText('当前：原始标题');
  await expect(page.getByRole('textbox', { name: '搜索词' })).toHaveValue('原始标题');
  await page.getByRole('textbox', { name: '来源链接或 ID' }).fill('https://bgm.tv/subject/1');
  await page.getByRole('button', { name: '读取', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'bangumi · 日本語候选' })).toBeVisible();
  if (cover) await page.getByLabel('封面', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: '生成预览' }).click();
  await expect(page.getByRole('heading', { name: '预览：勾选写入，可编辑 JSON 新值' })).toBeVisible();
}
test('fixture browser: bundled UI, safe native rendering, locks, One-shot cover write/readback/undo', async ({ page }) => {
  await install(page); await readAndPreview(page, true);
  expect(await page.evaluate(() => 'remoteExecuted' in window)).toBe(false);
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.locator('#komga-metadata-panel p[data-state]')).toHaveText('✓ 已读回确认');
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toBeVisible();
  expect(series.metadata.title).toBe('原始标题'); expect(book.metadata.title).toBe('Original Book');
  expect(series.metadata.summary).toBe('old summary'); expect(book.metadata.summary).toBe('locked original');
  expect(series.metadata.tags).toEqual(['old', 'female:glasses']);
  expect(book.metadata.authors).toEqual([{ name: '山田鐘人', role: 'writer' }]);
  expect(uploaded).toEqual(['/reader/api/v1/books/book-actual/thumbnails']);
  expect(patches.filter(p => p.path.includes('/series/')).every(p => !('authors' in p.body))).toBe(true);
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toHaveCSS('opacity', '0', { timeout: 4000 });
  await page.getByRole('button', { name: '撤销最近写入' }).click();
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toHaveCSS('opacity', '1');
  expect(series.metadata.tags).toEqual(['old']); expect(book.metadata.authors).toEqual([]);
  expect(covers).toEqual([{ id: 'original-user', selected: true, type: 'USER_UPLOADED' }]);
});
test('fixture browser: missing cover remains actionable partial and undo conflict does not overwrite', async ({ page }) => {
  await install(page); await readAndPreview(page, true); coverFails = true;
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.getByText(/部分完成：.*封面下载失败 HTTP 404/)).toBeVisible();
  await expect(page.getByText(/部分完成：/)).toHaveCSS('opacity', '1');
  expect(uploaded).toEqual([]);
  series.metadata.tags = ['concurrent'];
  await page.getByRole('button', { name: '撤销最近写入' }).click();
  await expect(page.getByText(/部分完成：.*tags 已变化/)).toBeVisible();
  expect(series.metadata.tags).toEqual(['concurrent']);
  expect(book.metadata.authors).toEqual([]);
});
test('fixture browser: no UI/menu/storage/network outside detected Komga; menu survives launcher removal', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', r => { if (r.url().includes('/api/') || r.url().includes('bgm.tv')) apiRequests.push(r.url()); });
  await install(page, '/unrelated');
  await expect(page.locator('#komga-metadata-launcher')).toHaveCount(0);
  expect(await page.evaluate(() => 'fixtureMenu' in window)).toBe(false);
  expect(await page.evaluate(() => (window as unknown as { fixtureCalls: string[] }).fixtureCalls)).toEqual([]);
  expect(apiRequests).toEqual([]);
  await page.goto(`${base}/reader/series/s-real`);
  await page.addScriptTag({ content: artifact });
  await page.locator('#komga-metadata-launcher').evaluate(e => e.remove());
  await page.evaluate(() => { const w = window as unknown as { fixtureMenu: () => void }; w.fixtureMenu(); });
  await expect(page.locator('#komga-metadata-panel')).toBeVisible();
});
test('fixture browser: one failed source keeps candidate visible; editable/unselected preview fields obey selection', async ({ page }) => {
  await install(page);
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '搜索词' })).toHaveValue('原始标题');
  for (const id of ['mangabaka', 'mangadex', 'anilist', 'mangaupdates']) await page.getByRole('checkbox', { name: id, exact: true }).uncheck();
  await page.getByRole('checkbox', { name: 'mal', exact: true }).check();
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  await expect(page.getByText('MAL 需要自行填写 Client ID', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '日本語候选', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'bangumi · 日本語候选' })).toBeVisible();
  await page.getByRole('button', { name: '生成预览' }).click();
  await expect(page.locator('textarea[data-field="tags"][data-edit="0"]')).toBeVisible();
  await page.locator('textarea[data-field="tags"][data-edit="0"]').fill('["old","female:glasses","用户编辑"]');
  await page.locator('input[data-field="links"][data-edit="0"]').uncheck();
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toBeVisible();
  expect(series.metadata.tags).toEqual(['old', 'female:glasses', '用户编辑']);
  expect(series.metadata.links).toEqual([]);
  expect(patches.filter(p => p.path.includes('/series/')).every(p => !('links' in p.body))).toBe(true);
});
test('fixture browser: cancel source request produces persistent actionable failure and no writes', async ({ page }) => {
  await install(page);
  await page.route('https://next.bgm.tv/p1/subjects/1', async route => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await route.fulfill({ json: { id: 1, name: 'Too late' }, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '搜索词' })).toHaveValue('原始标题');
  await page.getByRole('textbox', { name: '来源链接或 ID' }).fill('1');
  await page.getByRole('button', { name: '读取', exact: true }).click();
  await expect(page.getByRole('button', { name: '读取', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('#komga-metadata-panel p[data-state="error"]')).toContainText('已取消');
  expect(patches).toEqual([]);
  await expect(page.getByRole('button', { name: '读取', exact: true })).toBeEnabled();
});
