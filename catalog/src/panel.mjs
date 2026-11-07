import { SCHEMA_VERSION, ANALYZER_VERSION } from './analyzer.mjs';
import { BrowserCatalogBuilder, browserBuildCapability } from './browser-builder.mjs';

function url(value) {
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password)
    throw new Error('仅支持无凭据的 HTTP(S) 地址');
  return parsed.href;
}
export function validatePreparedManifest(manifest) {
  if (!manifest || manifest.schema_version !== SCHEMA_VERSION ||
      manifest.analyzer_version !== ANALYZER_VERSION || !Array.isArray(manifest.catalogs))
    throw new Error('预制目录清单版本或格式错误');
  return manifest.catalogs.map(item => {
    if (!item || typeof item.provider !== 'string' || typeof item.source_version !== 'string' ||
        typeof item.url !== 'string') throw new Error('预制目录清单条目错误');
    return { provider: item.provider, source_version: item.source_version, url: url(item.url) };
  });
}
export function mountCatalogPanel(container, client, options = {}) {
  const root = document.createElement('section');
  const heading = document.createElement('h3'); heading.textContent = '本地目录';
  const status = document.createElement('p'); status.textContent = '选择预制 SQLite 文件';
  status.setAttribute('role', 'status');
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.sqlite,.db';
  file.addEventListener('change', async () => {
    if (!file.files?.[0]) return;
    status.textContent = '正在打开…';
    try {
      const m = await client.open(file.files[0]);
      status.textContent = `${m.provider} · ${m.source_version}`;
    } catch (error) { status.textContent = `打开失败：${error.message}`; }
  });
  const details = document.createElement('details');
  const summary = document.createElement('summary'); summary.textContent = '下载与高级操作';
  const explanation = document.createElement('p');
  explanation.textContent = '暂无内置预制目录。可输入预制数据库地址下载，或使用本地 CLI 构建。下载后需手动选择文件。';
  const address = document.createElement('input'); address.type = 'url'; address.placeholder = '预制数据库或清单 URL';
  const download = document.createElement('button'); download.type = 'button'; download.textContent = '下载数据库';
  download.addEventListener('click', async () => {
    try {
      if (!options.download) throw new Error('未配置 GM_download');
      const href = url(address.value);
      status.textContent = '下载中…';
      await options.download(href, 'catalog.sqlite');
      status.textContent = '下载完成，请选择文件';
    } catch (error) { status.textContent = `下载失败：${error.message}`; }
  });
  const loadManifest = document.createElement('button'); loadManifest.type = 'button'; loadManifest.textContent = '读取清单';
  const choices = document.createElement('select');
  const manifestDownload = document.createElement('button'); manifestDownload.type = 'button'; manifestDownload.textContent = '下载所选目录';
  loadManifest.addEventListener('click', async () => {
    try {
      choices.replaceChildren();
      if (!options.fetchManifest) throw new Error('未配置跨域清单读取');
      const catalogs = validatePreparedManifest(await options.fetchManifest(url(address.value)));
      for (const item of catalogs) {
        const opt = document.createElement('option');
        opt.value = item.url; opt.textContent = `${item.provider} · ${item.source_version}`; choices.append(opt);
      }
      status.textContent = catalogs.length ? '选择预制目录' : '清单没有预制目录；请使用 CLI 构建';
    } catch (error) { status.textContent = `清单读取失败：${error.message}`; }
  });
  manifestDownload.addEventListener('click', async () => {
    try {
      if (!choices.value) throw new Error('没有可下载的目录');
      if (!options.download) throw new Error('未配置 GM_download');
      status.textContent = '下载中…';
      await options.download(url(choices.value), 'catalog.sqlite');
      status.textContent = '下载完成，请选择文件';
    } catch (error) { status.textContent = `下载失败：${error.message}`; }
  });
  const advanced = document.createElement('div');
  const capability = document.createElement('p');
  const detected = browserBuildCapability();
  capability.textContent = options.buildWorkerUrl ? detected.reason : '未配置构建 Worker；请使用原生 CLI。';
  advanced.append(capability);
  let builder;
  if (options.buildWorkerUrl && detected.available) {
    builder = new BrowserCatalogBuilder(options.buildWorkerUrl);
    const source = document.createElement('select');
    for (const id of ['bangumi', 'ehentai', 'mangabaka', 'bookwalker']) {
      const option = document.createElement('option'); option.value = id; option.textContent = id; source.append(option);
    }
    const archive = document.createElement('input'); archive.type = 'file';
    const version = document.createElement('input'); version.placeholder = '来源版本（可选）';
    const build = document.createElement('button'); build.type = 'button'; build.textContent = '构建本地目录';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消构建或导出';
    const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.textContent = '分块导出';
    const openButton = document.createElement('button'); openButton.type = 'button'; openButton.textContent = '打开构建结果';
    build.addEventListener('click', async () => {
      try {
        if (!archive.files?.[0]) throw new Error('请选择来源档案');
        status.textContent = '正在构建…'; build.disabled = true;
        const result = await builder.build(archive.files[0], source.value, version.value);
        status.textContent = `构建完成：${result.provider} · ${result.count} 条；可打开或导出`;
      } catch (error) { status.textContent = `构建失败：${error.message}`; }
      finally { build.disabled = false; }
    });
    cancel.addEventListener('click', () => { builder.cancel(); status.textContent = '已取消'; });
    openButton.addEventListener('click', async () => {
      try {
        const manifest = await client.open(await builder.file());
        status.textContent = `${manifest.provider} · ${manifest.source_version}`;
      } catch (error) { status.textContent = `打开失败：${error.message}`; }
    });
    exportButton.addEventListener('click', async () => {
      try {
        if (typeof globalThis.showSaveFilePicker !== 'function')
          throw new Error('浏览器不支持文件保存 API；可在面板直接打开结果，或使用原生 CLI');
        if (!builder.ready) throw new Error('没有已完成的目录');
        const handle = await globalThis.showSaveFilePicker({ suggestedName: 'catalog.sqlite' });
        status.textContent = '正在导出…';
        await builder.exportTo(await handle.createWritable());
        status.textContent = '导出完成';
      } catch (error) { status.textContent = `导出失败：${error.message}`; }
    });
    advanced.append(source, archive, version, build, cancel, openButton, exportButton);
  }
  details.append(summary, explanation, address, download, loadManifest, choices, manifestDownload, advanced);
  root.append(heading, file, status, details); container.append(root);
  return async () => { if (builder) await builder.dispose(); root.remove(); };
}

export function catalogProvider(client, provider) {
  if (!['bangumi', 'ehentai', 'mangabaka', 'bookwalker'].includes(provider))
    throw new Error(`不支持的本地目录来源：${provider}`);
  return {
    id: provider, capabilities: { series: provider !== 'ehentai', volumes: provider !== 'mangabaka', offline: true },
    async search(query, context) {
      if (context.signal.aborted) throw new DOMException('已取消', 'AbortError');
      const abort = () => client.cancel();
      context.signal.addEventListener('abort', abort, { once: true });
      try { return await client.search(query, provider); }
      finally { context.signal.removeEventListener('abort', abort); }
    },
    async get(id, context) {
      if (context.signal.aborted) throw new DOMException('已取消', 'AbortError');
      const abort = () => client.cancel();
      context.signal.addEventListener('abort', abort, { once: true });
      try { return await client.get(provider, id); }
      finally { context.signal.removeEventListener('abort', abort); }
    },
    async resolveLink(input, context) {
      if (context?.signal.aborted) throw new DOMException('已取消', 'AbortError');
      if (provider === 'bookwalker' && /^CNT_[\w-]+$/.test(input)) return input;
      if (['bangumi', 'mangabaka'].includes(provider) && /^\d+$/.test(input)) return input;
      if (provider === 'ehentai' && /^[1-9]\d*:[a-f0-9]{10}$/i.test(input)) return input.toLowerCase();
      const u = new URL(input);
      const path = u.pathname.split('/').filter(Boolean);
      if (provider === 'bangumi' && ['bgm.tv', 'bangumi.tv', 'chii.in'].includes(u.hostname) && path[0] === 'subject' && /^\d+$/.test(path[1] ?? '')) return path[1];
      if (provider === 'ehentai' && ['e-hentai.org', 'exhentai.org'].includes(u.hostname) && path[0] === 'g' &&
          /^[1-9]\d*$/.test(path[1] ?? '') && /^[a-f0-9]{10}$/i.test(path[2] ?? '')) return `${path[1]}:${path[2].toLowerCase()}`;
      if (provider === 'mangabaka' && ['mangabaka.org', 'www.mangabaka.org'].includes(u.hostname) && ['manga', 'series'].includes(path[0]) && /^\d+$/.test(path[1] ?? '')) return path[1];
      if (provider === 'bookwalker' && ['bookwalker.com', 'www.bookwalker.com'].includes(u.hostname) && path[0] === 'series' && /^[\w-]+$/.test(path[1] ?? ''))
        return path[1].startsWith('CNT_') ? path[1] : `CNT_${path[1]}`;
      throw new Error('该来源的链接无法解析，请使用目录 ID');
    }
  };
}
