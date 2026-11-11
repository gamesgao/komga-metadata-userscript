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
const oldPng = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', deflateSync(Buffer.from([0, 0, 0, 255, 255]))), chunk('IEND', Buffer.alloc(0))]);
let server: Server, base: string, artifact: string;
let patches: { path: string; body: Record<string, unknown> }[];
let uploaded: string[];
let series: { id: string; oneshot: boolean; metadata: Record<string, unknown> };
let book: { id: string; seriesId: string; metadata: Record<string, unknown> };
let covers: { id: string; selected: boolean; type: string }[];
let seriesCovers: typeof covers;
let coverFails: boolean;
let uploadFails: boolean, coverCorrupt: boolean, coverDownloads: number;
test.beforeAll(async () => {
  artifact = await readFile('dist/komga-metadata.user.js', 'utf8');
  server = createServer(async (req, res) => {
    const url = new URL(req.url!, base);
    const json = (value: unknown) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(value)); };
    if (url.pathname.startsWith('/reader/api/v1/')) {
      const activeCovers = url.pathname.includes('/series/') ? seriesCovers : covers;
      if (req.method === 'GET' && url.pathname.endsWith('/series/s-real')) return json(series);
      if (req.method === 'GET' && url.pathname.endsWith('/series/s-real/books')) return json({ content: [book], last: true });
      if (req.method === 'GET' && url.pathname.endsWith('/books/book-actual')) return json(book);
      if (req.method === 'GET' && url.pathname.endsWith('/thumbnail')) {
        const selected = (series.oneshot ? covers : activeCovers).find(c=>c.selected);
        if (!selected) { res.statusCode = 404; return json({}); }
        res.setHeader('Content-Type','image/png'); return res.end(selected.id === 'original-user' ? oldPng : png);
      }
      if (req.method === 'PATCH') {
        const buffers: Buffer[] = []; for await (const chunk of req) buffers.push(Buffer.from(chunk));
        const body = JSON.parse(Buffer.concat(buffers).toString());
        patches.push({ path: url.pathname, body });
        Object.assign(url.pathname.includes('/books/') ? book.metadata : series.metadata, body);
        return json({});
      }
      if (url.pathname.endsWith('/thumbnails')) {
        if (req.method === 'GET') return json(activeCovers);
        if (req.method === 'POST') {
          if (series.oneshot && url.pathname.includes('/series/')) { res.statusCode = 400; return json({}); }
          if (uploadFails) { res.statusCode = 503; return json({}); }
          const buffers: Buffer[] = []; for await (const chunk of req) buffers.push(Buffer.from(chunk));
          const body = Buffer.concat(buffers);
          if (!req.headers['content-type']?.includes('multipart/form-data') || !body.includes(png)) { res.statusCode = 400; return json({}); }
          uploaded.push(url.pathname);
          activeCovers.push({ id: 'uploaded-own', selected: false, type: 'USER_UPLOADED' }); return json(activeCovers.at(-1));
        }
      }
      const match = url.pathname.match(/\/thumbnails\/([\w-]+)(\/selected)?$/);
      if (match) {
        if (req.method === 'PUT') { activeCovers.forEach(c => c.selected = c.id === match[1]); return json({}); }
        if (req.method === 'DELETE') { activeCovers.splice(0, activeCovers.length, ...activeCovers.filter(c => c.id !== match[1])); return json({}); }
        res.setHeader('Content-Type', 'image/png'); return res.end(match[1] === 'original-user' ? oldPng : png);
      }
      res.statusCode = 404; return json({});
    }
    if (url.pathname === '/fixture-cover.png') {
      coverDownloads++;
      if (coverFails) { res.statusCode = 404; return res.end('missing'); }
      if (coverCorrupt) { res.setHeader('Content-Type', 'text/html'); return res.end('<html>Not an image</html>'); }
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
  patches = []; uploaded = []; coverFails = false; uploadFails = false; coverCorrupt = false; coverDownloads = 0;
  series = { id: 's-real', oneshot: true, metadata: { title: '原始标题', titleLock: false, tags: ['old'], tagsLock: false, summary: 'old summary', summaryLock: true, links: [], alternateTitles: [] } };
  book = { id: 'book-actual', seriesId: 's-real', metadata: { title: 'Original Book', number: '1', authors: [], authorsLock: false, tags: [], links: [], summary: 'locked original', summaryLock: true } };
  covers = [{ id: 'original-user', selected: true, type: 'USER_UPLOADED' }];
  seriesCovers = structuredClone(covers);
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
      fixtureDownloadMode: 'success',
      GM_download: (o: { url: string; name: string; onload(): void; onerror(error: { error: string }): void; ontimeout(): void }) => {
        calls.push(`download:${o.name}`);
        const mode = (window as unknown as { fixtureDownloadMode: string }).fixtureDownloadMode;
        const timer = window.setTimeout(() => {
          if (mode === 'success') o.onload();
          else if (mode === 'error') o.onerror({ error: 'fixture failure' });
        }, 100);
        return { abort: () => { window.clearTimeout(timer); o.onerror({ error: 'cancelled' }); } };
      },
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
async function readAndPreview(page: Page, cover = false, ready = true) {
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  await expect(page.locator('#komga-metadata-panel p[data-state]')).toHaveText('当前：原始标题');
  await expect(page.getByRole('textbox', { name: '搜索词' })).toHaveValue('原始标题');
  await page.getByText('通过链接或 ID 读取', { exact: true }).click();
  await page.getByRole('textbox', { name: '来源链接或 ID' }).fill('https://bgm.tv/subject/1');
  await page.getByRole('button', { name: '读取', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'bangumi · 日本語候选' })).toBeVisible();
  if (cover) await page.getByLabel('使用哪张封面', { exact: true }).selectOption('0');
  await page.getByRole('button', { name: '生成预览' }).click();
  if (ready) await expect(page.getByRole('heading', { name: '确认更改' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: '撤销最近写入' })).toBeDisabled();
  await page.waitForFunction(() => {
    const dialog = document.querySelector('#komga-metadata-panel')?.shadowRoot?.querySelector('dialog');
    const opacity = dialog ? Number(getComputedStyle(dialog).opacity) : 1;
    return opacity > 0 && opacity < 1;
  });
  await expect(page.locator('#komga-metadata-panel')).toHaveCount(0);
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  await expect(page.getByRole('button', { name: '撤销最近写入' })).toBeEnabled();
  await page.getByRole('button', { name: '撤销最近写入' }).click();
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toHaveCSS('opacity', '1');
  expect(series.metadata.tags).toEqual(['old']); expect(book.metadata.authors).toEqual([]);
  expect(covers).toEqual([{ id: 'original-user', selected: true, type: 'USER_UPLOADED' }]);
  expect(seriesCovers).toEqual([{ id: 'original-user', selected: true, type: 'USER_UPLOADED' }]);
});
test('fixture browser: upload failure remains actionable partial and undo conflict does not overwrite', async ({ page }) => {
  await install(page); await readAndPreview(page, true); uploadFails = true;
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.getByText(/部分完成：.*Komga HTTP 503/)).toBeVisible();
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
test('catalog UI: four preset downloads on HTTP, completion/error/cancel, no URL or primary prebuilt import', async ({ page }) => {
  await install(page);
  await page.evaluate(() => { Object.defineProperty(window,'isSecureContext',{value:false,configurable:true}); Object.defineProperty(window,'webkitRequestFileSystem',{value:undefined,configurable:true}); });
  await page.route('https://raw.githubusercontent.com/bangumi/Archive/master/aux/latest.json',route=>route.fulfill({json:{browser_download_url:'https://github.com/bangumi/Archive/releases/download/archive/source.zip'},headers:{'Access-Control-Allow-Origin':'*'}}));
  await page.getByRole('button',{name:'元数据',exact:true}).click();await page.getByRole('tab',{name:'本地数据库'}).click();
  const area=page.locator('section[data-km-catalog]'),status=area.locator('[role=status]');
  await expect(area.getByPlaceholder('预制数据库或清单 URL')).toHaveCount(0);
  await expect(area.getByLabel('本地数据库文件')).not.toBeVisible();
  await expect(area.getByText(/当前浏览器不支持本地构建存储/)).toBeVisible();
  for(const name of ['Bangumi','E-Hentai','MangaBaka','BookWalker']) {
    await area.getByRole('button',{name:name+' · 下载原始数据',exact:true}).click();
    await expect(status).toContainText('原始数据已下载');
  }
  await page.evaluate(()=>{(window as unknown as {fixtureDownloadMode:string}).fixtureDownloadMode='error'});
  await area.getByRole('button',{name:'BookWalker · 下载原始数据',exact:true}).click();await expect(status).toContainText('fixture failure');
  await page.evaluate(()=>{(window as unknown as {fixtureDownloadMode:string}).fixtureDownloadMode='hold'});
  await area.getByRole('button',{name:'BookWalker · 下载原始数据',exact:true}).click();await area.getByRole('button',{name:'取消当前任务'}).click();await expect(status).toContainText('已取消');
});
test('file picker cancellation bubbles without closing dialog or losing input; dialog Escape still closes',async({page})=>{
  await install(page);await page.getByRole('button',{name:'元数据',exact:true}).click();await page.getByRole('textbox',{name:'搜索词'}).fill('keep this query');
  await page.getByRole('tab',{name:'本地数据库'}).click();
  for(const input of await page.locator('section[data-km-catalog] input[type=file]').all())await input.dispatchEvent('cancel',{bubbles:true});
  await expect(page.getByRole('dialog')).toBeVisible();await page.getByRole('tab',{name:'元数据',exact:true}).click();await expect(page.getByRole('textbox',{name:'搜索词'})).toHaveValue('keep this query');
  await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('fixture browser: one failed source keeps candidate visible; editable/unselected preview fields obey selection', async ({ page }) => {
  await install(page);
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '搜索词' })).toHaveValue('原始标题');
  for (const id of ['mangabaka', 'anilist', 'mangaupdates']) await page.getByRole('checkbox', { name: id, exact: true }).uncheck();
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
  await page.getByText('通过链接或 ID 读取', { exact: true }).click();
  await page.getByRole('textbox', { name: '来源链接或 ID' }).fill('1');
  await page.getByRole('button', { name: '读取', exact: true }).click();
  await expect(page.getByRole('button', { name: '读取', exact: true })).toBeDisabled();
  expect(await page.locator('.status[data-state=busy]').evaluate(e => getComputedStyle(e, '::before').animationName)).toBe('km-spin');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('#komga-metadata-panel p[data-state="error"]')).toContainText('已取消');
  expect(patches).toEqual([]);
  await expect(page.getByRole('button', { name: '读取', exact: true })).toBeEnabled();
});

test('modern UI: modal focus, keyboard tabs, theme persistence and responsive layout', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ colorScheme: 'light' });
  await install(page);
  const launcher = page.getByRole('button', { name: '元数据', exact: true });
  await launcher.click();
  const dialog = page.getByRole('dialog', { name: '元数据' });
  await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(e => e.matches(':modal'))).toBe(true);
  await expect(page.getByRole('textbox', { name: '搜索词' })).toHaveValue('原始标题');
  await page.getByRole('button', { name: '切换深浅色' }).focus();
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('checkbox', { name: '将作者同步到系列内所有书籍', exact: true })).toBeFocused();
  const metadataTab = page.getByRole('tab', { name: '元数据', exact: true });
  await metadataTab.focus(); await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tabpanel', { name: '本地数据库' })).toBeVisible();
  await expect(page.getByRole('tabpanel', { name: '元数据', exact: true })).toBeHidden();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: '设置', exact: true })).toBeFocused();
  await expect(page.getByLabel('ComicVine API Key')).toHaveAttribute('type', 'password');
  await page.keyboard.press('Home');
  await expect(metadataTab).toBeFocused();
  const light = await dialog.evaluate(e => getComputedStyle(e).backgroundColor);
  await page.getByRole('button', { name: '切换深浅色' }).click();
  await expect(page.locator('#komga-metadata-panel')).toHaveAttribute('data-theme', 'dark');
  expect(await dialog.evaluate(e => getComputedStyle(e).backgroundColor)).not.toBe(light);
  for (const width of [1280, 768, 390]) {
    await page.setViewportSize({ width, height: 800 });
    const box = await dialog.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(await page.locator('.viewport').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
    await expect(page.getByRole('button', { name: '关闭', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: '应用', exact: true })).toBeInViewport();
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0); await expect(launcher).toBeFocused();
  await launcher.click();
  await expect(page.locator('#komga-metadata-panel')).toHaveAttribute('data-theme', 'dark');
  expect(patches).toEqual([]);
});

test('modern UI: preview back navigation preserves options without writing', async ({ page }) => {
  await install(page); await readAndPreview(page);
  await expect(page.getByRole('button', { name: '应用', exact: true })).toBeEnabled();
  await expect(page.getByRole('textbox', { name: '搜索词' })).toBeHidden();
  await page.getByRole('button', { name: '返回选项' }).click();
  await expect(page.getByRole('textbox', { name: '搜索词' })).toBeVisible();
  await expect(page.getByRole('button', { name: '应用', exact: true })).toBeDisabled();
  await page.getByRole('checkbox', { name: '标签', exact: true }).uncheck();
  await page.getByRole('button', { name: '生成预览' }).click();
  await expect(page.getByRole('heading', { name: '确认更改' })).toBeVisible();
  await expect(page.locator('textarea[data-field=tags]')).toHaveCount(0);
  expect(patches).toEqual([]);
});

test('modern UI: plain-text preview edits, narrow diffs and reduced motion', async ({ page }) => {
  series.metadata.summaryLock = false;
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await install(page); await readAndPreview(page);
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.locator('.viewport').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  await expect(page.getByRole('dialog')).toHaveCSS('transition-duration', '0s');
  const summary = page.locator('textarea[data-field=summary][data-edit="0"]');
  await expect(summary).toHaveAttribute('data-format', 'text');
  await summary.fill('第一行\n第二行，不需要 JSON 转义');
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toBeVisible();
  expect(series.metadata.summary).toBe('第一行\n第二行，不需要 JSON 转义');
  expect(book.metadata.summary).toBe('locked original');
});

test('cover UI: source groups fold, image cards persist after selection and blob URLs are released', async ({ page }) => {
  await page.addInitScript(() => {
    const created: string[] = [], revoked: string[] = [];
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    URL.createObjectURL = blob => { const url = create(blob); created.push(url); return url; };
    URL.revokeObjectURL = url => { revoked.push(url); revoke(url); };
    Object.assign(window, { imageUrls: { created, revoked } });
  });
  await install(page);
  await page.route('https://next.bgm.tv/p1/search/**', route => route.fulfill({ json: { data: [
    { id: 1, name: '日本語候选', images: { common: `${base}/fixture-cover.png` } },
    { id: 2, name: '第二候选', images: { common: `${base}/fixture-cover.png` } }
  ] }, headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.route('https://graphql.anilist.co', route => route.fulfill({ json: { data: { Page: { media: [
    { id: 3, title: { native: '別来源作品' }, siteUrl: 'https://anilist.co/manga/3', coverImage: { large: `${base}/fixture-cover.png` } }
  ] } } }, headers: { 'Access-Control-Allow-Origin': '*' } }));
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  for (const id of ['mangabaka', 'mangaupdates']) await page.getByRole('checkbox', { name: id, exact: true }).uncheck();
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const bg = page.locator('.result-group[data-provider=bangumi]'), ani = page.locator('.result-group[data-provider=anilist]');
  await expect(bg.locator('.cover-thumb[data-state=ready]')).toHaveCount(2);
  expect(await bg.locator('img').evaluateAll(imgs => imgs.every(i => (i as HTMLImageElement).naturalWidth > 0 && (i as HTMLImageElement).src.startsWith('blob:')))).toBe(true);
  await bg.locator('summary').click(); await expect(bg).toHaveJSProperty('open', false);
  await expect(bg.locator('.candidate').first()).toBeHidden(); await expect(ani.locator('summary')).toBeInViewport();
  await expect(ani.locator('.cover-thumb[data-state=ready]')).toHaveCount(1);
  await bg.locator('summary').focus(); await page.keyboard.press('Enter');
  await expect(bg).toHaveJSProperty('open', true);
  await bg.getByRole('button', { name: '日本語候选', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'bangumi · 日本語候选' })).toBeVisible();
  await expect(bg.locator('.candidate')).toHaveCount(2); await expect(ani).toBeVisible();
  await expect(bg.getByRole('button', { name: '日本語候选', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(coverDownloads).toBe(1); // shared candidate thumbnail, not duplicate downloads
  await page.keyboard.press('Escape');
  await expect(page.locator('#komga-metadata-panel')).toHaveCount(0);
  expect(await page.evaluate(() => {
    const { created, revoked } = (window as unknown as { imageUrls: { created: string[]; revoked: string[] } }).imageUrls;
    return created.length > 0 && created.every(url => revoked.includes(url));
  })).toBe(true);
});

test('cover UI: decoded current/new comparison and apply reuse the previewed download', async ({ page }) => {
  await install(page); await readAndPreview(page, true);
  await expect(page.locator('.cover-preview')).toHaveCount(1);
  const before = page.getByRole('img', { name: '当前封面', exact: true }).first(), after = page.getByRole('img', { name: '替换为', exact: true }).first();
  for (const image of await page.locator('.cover-preview img').all()) {
    await expect(image).toBeVisible(); expect(await image.evaluate(e => (e as HTMLImageElement).naturalWidth)).toBe(1);
  }
  const pixel = (image: typeof before) => image.evaluate(e => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
    const c = canvas.getContext('2d')!; c.drawImage(e as HTMLImageElement, 0, 0);
    return [...c.getImageData(0, 0, 1, 1).data];
  });
  expect(await pixel(before)).toEqual([0, 0, 255, 255]); expect(await pixel(after)).toEqual([255, 0, 0, 255]);
  await expect(page.getByText('包含下载失败风险', { exact: false })).toHaveCount(0);
  expect(patches).toEqual([]); expect(uploaded).toEqual([]); expect(coverDownloads).toBe(1);
  await page.setViewportSize({ width: 390, height: 800 });
  expect(await page.locator('.viewport').evaluate(e => e.scrollWidth <= e.clientWidth + 1)).toBe(true);
  coverFails = true; // source disappears AFTER preview: upload must use viewed bytes
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toBeVisible();
  expect(coverDownloads).toBe(1); expect(uploaded).toHaveLength(1);
});

for (const failure of ['missing', 'html']) test(`cover UI: ${failure} source blocks preview/apply before all writes and allows retry`, async ({ page }) => {
  coverFails = failure === 'missing'; coverCorrupt = failure === 'html';
  await install(page); await readAndPreview(page, true, false);
  await expect(page.locator('.status[data-state=error]')).toContainText(failure === 'missing' ? '404' : '有效图片');
  await expect(page.getByRole('button', { name: '应用', exact: true })).toBeDisabled();
  expect(patches).toEqual([]); expect(uploaded).toEqual([]);
  coverFails = coverCorrupt = false;
  await page.getByRole('button', { name: '生成预览' }).click();
  await expect(page.getByRole('img', { name: '替换为', exact: true })).toHaveCount(1);
  await expect(page.getByRole('button', { name: '应用', exact: true })).toBeEnabled();
});

test('preview retry cannot lose a book field lock guard after an invalid edit', async ({ page }) => {
  await install(page); await readAndPreview(page);
  const tag = page.locator('.preview input[data-edit="1"][data-field="tags"]');
  const links = page.locator('.preview textarea[data-edit="1"][data-field="links"]');
  const valid = await links.inputValue(); await tag.uncheck(); await links.fill('not-json');
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.locator('.status[data-state=error]')).toContainText('JSON'); expect(patches).toEqual([]);
  book.metadata.tagsLock = true;
  await tag.check(); await links.fill(valid);
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.locator('.status[data-state=error]')).toContainText('tagsLock');
  expect(patches).toEqual([]); expect(book.metadata.tags).toEqual([]);
});

async function ehFixture(page: import('@playwright/test').Page) {
  await install(page);
  await page.route('https://api.e-hentai.org/api.php', route => route.fulfill({ json:{gmetadata:[{gid:1,token:'aaaaaaaaaa',title:'Japanese gallery',title_jpn:'日本語の資料',tags:['female:glasses','male:glasses','parody:test','other:unlisted']}]},headers:{'Access-Control-Allow-Origin':'*'} }));
  await page.getByRole('button',{name:'元数据',exact:true}).click(); await page.getByText('通过链接或 ID 读取',{exact:true}).click();
  await page.getByLabel('来源',{exact:true}).selectOption('ehentai'); await page.getByRole('textbox',{name:'来源链接或 ID'}).fill('1:aaaaaaaaaa'); await page.getByRole('button',{name:'读取',exact:true}).click();
  await expect(page.getByRole('heading',{name:'ehentai · 日本語の資料'})).toBeVisible();
  for(const field of await page.locator('.field-grid input:not([data-language])').all()) await field.setChecked(await field.getAttribute('aria-label')==='标签');
}
const ehDictionary={version:7,head:{sha:'fixture'},data:[{namespace:'female',data:{glasses:{name:'眼镜👓'}}},{namespace:'male',data:{glasses:{name:'眼镜👓'}}},{namespace:'parody',data:{test:{name:'作品'}}}]};
test('EH Chinese preference: fixed simple tags, no formatting controls, cached dictionary, writes and locked book',async({page})=>{
  series.metadata.tags=['female:glasses','manual'];book.metadata.tagsLock=true;
  await ehFixture(page);let downloads=0;
  await page.route('https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json',route=>{downloads++;return route.fulfill({json:ehDictionary,headers:{'Access-Control-Allow-Origin':'*'}})});
  await page.getByText('接受的资料语言',{exact:true}).click();for(const box of await page.locator('.language-options input').all())await box.setChecked(['ja','zh'].includes((await box.getAttribute('data-language'))!));
  await page.getByRole('button',{name:'生成预览'}).click();await expect(page.getByRole('heading',{name:'确认更改'})).toBeVisible();
  expect(JSON.parse(await page.getByRole('textbox',{name:'标签写入值',exact:true}).inputValue())).toEqual(['眼镜','manual','parody:作品','other:unlisted']);
  await page.getByRole('button',{name:'返回选项'}).click();
  await expect(page.getByLabel('标签前缀',{exact:true})).toHaveCount(0);
  await expect(page.getByText('EH 标签格式',{exact:true})).toHaveCount(0);
  await expect(page.getByRole('link',{name:'EhTagTranslation · CC BY-NC-SA 3.0'})).toHaveCount(0);
  await page.getByRole('button',{name:'生成预览'}).click();await expect(page.getByRole('heading',{name:'确认更改'})).toBeVisible();
  expect(JSON.parse(await page.getByRole('textbox',{name:'标签写入值',exact:true}).inputValue())).toEqual(['眼镜','manual','parody:作品','other:unlisted']);expect(downloads).toBe(1);
  await page.getByRole('button',{name:'应用',exact:true}).click();await expect(page.getByText('✓ 已读回确认',{exact:true})).toBeVisible();
  expect(series.metadata.tags).toEqual(['眼镜','manual','parody:作品','other:unlisted']);expect(book.metadata.tags).toEqual([]);
});
test('EH missing dictionary blocks all writes; removing Chinese restores raw tags without downloading',async({page})=>{
  await ehFixture(page);let downloads=0;await page.route('https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json',route=>{downloads++;return route.fulfill({status:502,body:'bad',headers:{'Access-Control-Allow-Origin':'*'}})});
  await page.getByRole('button',{name:'生成预览'}).click();await expect(page.locator('.status[role=status]')).toContainText('中文标签词库不可用');
  expect(patches).toEqual([]);await expect(page.getByRole('button',{name:'应用',exact:true})).toBeDisabled();
  await page.getByText('接受的资料语言',{exact:true}).click();await page.locator('.language-options input[data-language=zh]').uncheck();
  await page.getByRole('button',{name:'生成预览'}).click();await expect(page.getByRole('heading',{name:'确认更改'})).toBeVisible();expect(downloads).toBe(1);
  for(const box of await page.getByRole('textbox',{name:'标签写入值',exact:true}).all()) expect(JSON.parse(await box.inputValue())).toContain('female:glasses');
});

test('EH English/Japanese never download a dictionary; Chinese on/off rebuilds preview without stale translated tags',async({page})=>{
  await ehFixture(page);let downloads=0;
  await page.route('https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json',route=>{downloads++;return route.fulfill({json:ehDictionary,headers:{'Access-Control-Allow-Origin':'*'}})});
  await expect(page.getByLabel('将 EH 标签译为中文并写入',{exact:true})).toHaveCount(0);
  await page.getByText('接受的资料语言',{exact:true}).click();
  for(const languages of [['en'],['ja'],['zh','en'],['en']]) {
    for(const box of await page.locator('.language-options input').all())await box.setChecked(languages.includes((await box.getAttribute('data-language'))!));
    await page.getByRole('button',{name:'生成预览'}).click();await expect(page.getByRole('heading',{name:'确认更改'})).toBeVisible();
    await expect(page.getByText('查看标签翻译对照',{exact:true})).toHaveCount(0);
    await expect(page.getByText(/EH 中文标签：.*命中/)).toHaveCount(0);
    for(const field of await page.getByRole('textbox',{name:'标签写入值',exact:true}).all()) {
      const tags=JSON.parse(await field.inputValue());
      expect(tags).toContain(languages.includes('zh')?'眼镜':'female:glasses');expect(tags).not.toContain(languages.includes('zh')?'female:glasses':'眼镜');
    }
    if(languages[0]==='ja')expect(downloads).toBe(0);
    await page.getByRole('button',{name:'返回选项'}).click();
  }
  expect(downloads).toBe(1);
  await page.getByRole('button',{name:'生成预览'}).click();await page.getByRole('button',{name:'应用',exact:true}).click();await expect(page.getByText('✓ 已读回确认',{exact:true})).toBeVisible();
  expect(series.metadata.tags).toContain('female:glasses');expect(book.metadata.tags).toContain('female:glasses');expect(series.metadata.tags).not.toContain('眼镜');
});

test('same-provider multi-select and per-column preview single/merge semantics', async ({ page }) => {
  series.metadata.summaryLock = false; series.metadata.summary = '第一简介'; book.metadata.summaryLock = false;
  await install(page);
  await page.route('https://next.bgm.tv/p1/subjects/**', route => {
    const u = route.request().url(), id = Number(u.match(/subjects\/(\d+)/)?.[1]);
    const body = u.includes('staffs/persons') ? { data: [], total: 0 } : { id, name: id === 1 ? '日本語候选' : '日本語候选別名', summary: id === 1 ? '第一简介' : '第二简介', tags: [{name:'shared'},{name:id===1?'first':'second'}], series: false, infobox: [] };
    return route.fulfill({ json: body, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await readAndPreview(page); await page.getByRole('button', { name:'返回选项' }).click();
  await page.getByRole('textbox', { name:'来源链接或 ID' }).fill('2'); await page.getByRole('button', { name:'读取', exact:true }).click();
  await expect(page.getByRole('heading', { name:'已选 2 个条目' })).toBeVisible();
  await expect(page.getByLabel('主要来源', { exact:true })).toHaveCount(0);
  for (const id of ['mangadex','webtoons','yenpress']) await expect(page.locator(`.source-toggles input[aria-label=${id}]`)).toHaveCount(0);
  await page.getByRole('checkbox', { name:'这些条目是同一作品／同一卷和版本' }).check();
  await page.getByRole('button', { name:'生成预览' }).click();
  const summary = page.locator('.row:has(input[data-edit="0"][data-field="summary"])');
  await expect(summary.getByLabel('简介处理方式')).toHaveValue('single');
  await expect(summary.locator('input[data-field=summary]')).not.toBeChecked(); // unchanged default still offers alternate source
  await summary.getByLabel('简介处理方式').selectOption('merge');
  await expect(summary.getByRole('textbox')).toHaveValue('第一简介\n\n第二简介');
  await summary.getByLabel('简介处理方式').selectOption('single'); await summary.getByLabel('简介来源').selectOption('bangumi:2');
  const tags = page.locator('.row:has(input[data-edit="0"][data-field="tags"])');
  await expect(tags.getByLabel('标签处理方式')).toHaveValue('merge');
  expect(JSON.parse(await tags.getByRole('textbox').inputValue())).toEqual(['old','shared','first','second']);
  await tags.getByLabel('标签处理方式').selectOption('single'); await tags.getByLabel('标签来源').selectOption('bangumi:2');
  for (const check of await page.locator('.preview input[data-edit][data-field]').all()) await check.uncheck();
  await expect(page.getByRole('button', { name:'应用', exact:true })).toBeDisabled();
  for (const check of await page.locator('.preview input[data-field=summary],.preview input[data-field=tags]').all()) await check.check();
  await expect(page.getByRole('button', { name:'应用', exact:true })).toBeEnabled();
  await page.getByRole('button', { name:'应用', exact:true }).click(); await expect(page.getByText('✓ 已读回确认', {exact:true})).toBeVisible();
  expect(series.metadata.summary).toBe('第二简介'); expect(book.metadata.summary).toBe('第一简介');
  expect(series.metadata.tags).toEqual(['shared','second']); expect(book.metadata.tags).toEqual(['shared','first','second']);
});

test('accepted languages select real English/romaji title variants and persist without translation', async ({ page }) => {
  await install(page);
  await page.route('https://graphql.anilist.co', route => route.fulfill({json:{data:{Media:{id:2,siteUrl:'https://anilist.co/manga/2',countryOfOrigin:'JP',title:{native:'日本語の作品',english:'English title',romaji:'Nihongo no Sakuhin'},coverImage:{},startDate:{},genres:[],staff:{edges:[],pageInfo:{hasNextPage:false}}}}},headers:{'Access-Control-Allow-Origin':'*'}}));
  await page.getByRole('button', {name:'元数据',exact:true}).click();
  await page.getByText('接受的资料语言',{exact:true}).click();
  for (const i of await page.locator('.language-options input').all()) await i.setChecked(await i.getAttribute('data-language') === 'en');
  await page.getByText('通过链接或 ID 读取',{exact:true}).click(); await page.getByRole('combobox',{name:'来源',exact:true}).selectOption('anilist');
  await page.getByRole('textbox',{name:'来源链接或 ID'}).fill('2'); await page.getByRole('button',{name:'读取',exact:true}).click();
  await expect(page.getByRole('heading',{name:'anilist · 日本語の作品'})).toBeVisible();
  await page.getByRole('checkbox',{name:'标题（默认不改）',exact:true}).check(); await page.getByRole('button',{name:'生成预览'}).click();
  for (const t of await page.getByRole('textbox',{name:'标题（默认不改）写入值',exact:true}).all()) await expect(t).toHaveValue('English title');
  await page.getByRole('button',{name:'返回选项'}).click();
  for (const i of await page.locator('.language-options input').all()) await i.setChecked(await i.getAttribute('data-language') === 'romaji');
  await page.getByRole('button',{name:'生成预览'}).click();
  for (const t of await page.getByRole('textbox',{name:'标题（默认不改）写入值',exact:true}).all()) await expect(t).toHaveValue('Nihongo no Sakuhin');
  await page.getByRole('button',{name:'应用',exact:true}).click(); await expect(page.getByText('✓ 已读回确认',{exact:true})).toBeVisible();
  expect(series.metadata.title).toBe('Nihongo no Sakuhin');expect(book.metadata.title).toBe('Nihongo no Sakuhin');
  await expect(page.locator('#komga-metadata-panel')).toHaveCount(0); await page.getByRole('button',{name:'元数据',exact:true}).click();
  await page.getByText('接受的资料语言',{exact:true}).click(); await expect(page.getByLabel('罗马字 Romaji',{exact:true})).toBeChecked(); await expect(page.getByLabel('英文 EN',{exact:true})).not.toBeChecked();
});

test('multi-source UI: parallel incremental progress, primary/field merge, confirmation, locked book and single apply', async ({ page }) => {
  series.metadata.summaryLock = false;
  let release!: () => void;
  const gate = new Promise<void>(r => { release = r; });
  let releaseFirst!: () => void, firstStarted = false, secondStarted = false;
  const firstGate = new Promise<void>(r => { releaseFirst = r; });
  const second = { id: 2, siteUrl: 'https://anilist.co/manga/2', title: { native: '第二来源作品' }, description: 'Second source summary', genres: ['Fantasy'], startDate: {}, staff: { edges: [{ role: 'Story', node: { name: { native: '山田鐘人' } } }], pageInfo: { hasNextPage: false } }, coverImage: { large: `${base}/fixture-cover.png` } };
  await install(page);
  await page.route('https://next.bgm.tv/p1/search/**', async route => {
    firstStarted = true; await firstGate;
    await route.fulfill({ json: { data: [{ id: 1, name: '日本語候选' }] }, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.route('https://graphql.anilist.co', async route => {
    const search = JSON.parse(route.request().postData()!).query.includes('Page(');
    if (search) { secondStarted = true; await gate; }
    await route.fulfill({ json: { data: search ? { Page: { media: [second] } } : { Media: second } }, headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  await page.getByRole('button', { name: '元数据', exact: true }).click();
  for (const id of ['mangabaka', 'mangaupdates']) await page.getByRole('checkbox', { name: id, exact: true }).uncheck();
  await page.getByRole('button', { name: '搜索', exact: true }).click();
  const bg = page.locator('.result-group[data-provider=bangumi]'), ani = page.locator('.result-group[data-provider=anilist]');
  try {
    await expect.poll(() => firstStarted && secondStarted).toBe(true);
    await expect(page.getByRole('progressbar', { name: '搜索进度' })).toHaveJSProperty('value', 0);
    releaseFirst();
    await expect(bg).toHaveAttribute('data-state', 'ready'); await expect(ani).toHaveAttribute('data-state', 'pending');
    await expect(page.getByRole('progressbar', { name: '搜索进度' })).toHaveJSProperty('value', 1);
    await expect(bg.locator('.candidate')).toHaveCount(1);
  } finally { releaseFirst(); release(); }
  await expect(ani).toHaveAttribute('data-state', 'ready');
  await expect(page.getByRole('progressbar', { name: '搜索进度' })).toHaveJSProperty('value', 2);
  await bg.locator('.candidate').click(); await ani.locator('.candidate').click();
  await expect(page.getByRole('heading', { name: '已选 2 个条目' })).toBeVisible();
  await expect(bg.locator('.candidate')).toHaveAttribute('aria-pressed', 'true'); await expect(ani.locator('.candidate')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('使用哪张封面', { exact: true })).toHaveValue('');
  await expect(page.getByText('系列状态未知', { exact: false })).toHaveCount(0);
  await expect(page.getByText('保留已锁定字段；作者仅写入未锁定书籍。')).toHaveCount(0);
  await page.getByRole('button', { name: '生成预览' }).click();
  await expect(page.locator('.status[data-state=error]')).toContainText('先确认'); expect(patches).toEqual([]);
  await page.getByRole('checkbox', { name: '这些条目是同一作品／同一卷和版本' }).check();
  await page.getByRole('button', { name: '生成预览' }).click();
  await page.getByLabel('简介来源', { exact: true }).selectOption('anilist:2');
  await expect(page.getByRole('textbox', { name: '简介写入值', exact: true })).toHaveValue('Second source summary');
  await expect(page.getByText('写入值 · anilist', { exact: true }).first()).toBeVisible();
  await page.getByRole('button', { name: '应用', exact: true }).click();
  await expect(page.getByText('✓ 已读回确认', { exact: true })).toBeVisible();
  expect(series.metadata.summary).toBe('Second source summary'); expect(book.metadata.summary).toBe('locked original');
  expect(series.metadata.tags).toEqual(expect.arrayContaining(['old', 'female:glasses'])); expect(series.metadata.genres).toEqual(['fantasy']);
  expect(book.metadata.authors).toEqual([{ name: '山田鐘人', role: 'writer' }]);
  expect(series.metadata.title).toBe('原始标题'); expect(uploaded).toEqual([]);
});
