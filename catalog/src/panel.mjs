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
    if (!item || !['bangumi', 'ehentai', 'mangabaka', 'bookwalker'].includes(item.provider) ||
        typeof item.source_version !== 'string' ||
        typeof item.url !== 'string') throw new Error('预制目录清单条目错误');
    if (item.schema_version !== undefined && item.schema_version !== SCHEMA_VERSION)
      throw new Error('清单目录 schema 版本不兼容');
    if (item.analyzer_version !== undefined && item.analyzer_version !== ANALYZER_VERSION)
      throw new Error('清单目录 analyzer 版本不兼容');
    if (item.size_bytes !== undefined && (!Number.isSafeInteger(item.size_bytes) || item.size_bytes < 1))
      throw new Error('清单文件大小格式错误');
    if (item.sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(item.sha256))
      throw new Error('清单 SHA-256 格式错误');
    return {
      provider: item.provider, source_version: item.source_version, url: url(item.url),
      size_bytes: item.size_bytes, sha256: item.sha256?.toLowerCase(),
      schema_version: item.schema_version, analyzer_version: item.analyzer_version
    };
  });
}
export function mountCatalogPanel(container, client, options = {}) {
  const root = document.createElement('section');
  root.dataset.kmCatalog = '1';
  const spinnerStyle = document.createElement('style');
  spinnerStyle.textContent = 'section[data-km-catalog] p[role=status]:empty::before{content:"";display:inline-block;width:12px;height:12px;border:2px solid #bbb;border-right-color:#444;border-radius:50%;animation:kmdb-spin .7s linear infinite}@keyframes kmdb-spin{to{transform:rotate(360deg)}}';
  root.append(spinnerStyle);
  const panelController = new AbortController();
  const heading = document.createElement('h3'); heading.textContent = '本地目录';
  const status = document.createElement('p'); status.textContent = '选择预制 SQLite';
  status.setAttribute('role', 'status');
  const file = document.createElement('input'); file.type = 'file'; file.accept = '.sqlite,.db';
  file.setAttribute('aria-label', '本地数据库文件');
  let selectionGeneration = 0;
  let expectedCatalog;
  const checkManifestCompatibility = (manifest, selectedFile) => {
    if (!expectedCatalog) return;
    if (manifest.provider !== expectedCatalog.provider ||
        manifest.source_version !== expectedCatalog.source_version ||
        (expectedCatalog.schema_version !== undefined && manifest.schema_version !== expectedCatalog.schema_version) ||
        (expectedCatalog.analyzer_version !== undefined && manifest.analyzer_version !== expectedCatalog.analyzer_version) ||
        (expectedCatalog.size_bytes !== undefined && selectedFile.size !== expectedCatalog.size_bytes))
      throw new Error('所选文件与清单版本或大小不符');
  };
  file.addEventListener('change', async () => {
    if (!file.files?.[0]) return;
    const generation = ++selectionGeneration;
    const previousFile = client.selectedFile;
    status.textContent = '';
    try {
      const selectedFile = file.files[0];
      const m = await client.open(selectedFile, { sha256: expectedCatalog?.sha256 });
      checkManifestCompatibility(m, selectedFile);
      if (generation === selectionGeneration) status.textContent = `${m.provider} · ${m.source_version}`;
    } catch (error) {
      if (client.selectedFile !== previousFile) {
        try {
          if (previousFile) await client.open(previousFile);
          else await client.close();
        }
        catch (restoreError) {
          if (generation === selectionGeneration)
            status.textContent = `打开失败：${error.message}；恢复失败：${restoreError.message}`;
          return;
        }
      }
      if (generation === selectionGeneration) status.textContent = `打开失败：${error.message}`;
    }
  });
  if (client.hasFile) {
    const generation = ++selectionGeneration;
    status.textContent = '';
    void client.manifest().then(m => {
      if (generation === selectionGeneration) status.textContent = `${m.provider} · ${m.source_version}`;
    }, error => {
      if (generation === selectionGeneration) status.textContent = `恢复失败：${error.message}`;
    });
  }
  const details = document.createElement('details');
  const summary = document.createElement('summary'); summary.textContent = '下载与高级操作';
  const explanation = document.createElement('p');
  explanation.textContent = '预制库可直接选择；原始档案需构建。提供校验值时，按块核验 SHA-256。';
  const archiveLinks = document.createElement('div');
  const archives = [
    ['Bangumi · 最新原始 JSONL ZIP', 'https://github.com/bangumi/Archive/releases/tag/archive'],
    ['E-Hentai · RAW SQLite Zstandard', 'https://github.com/URenko/e-hentai-db/releases/download/nightly/e-hentai.db.zstd'],
    ['MangaBaka · RAW SQLite gzip-tar', 'https://api.mangabaka.org/v1/database/series.sqlite.tar.gz'],
    ['BookWalker · RAW SQLite Zstandard', 'https://static.bookwalker.com/data/bkwk-db.sqlite.zst']
  ];
  for (const [label, href] of archives) {
    const link = document.createElement('a'); link.textContent = label; link.href = href;
    link.target = '_blank'; link.rel = 'noopener noreferrer';
    if (label.startsWith('Bangumi')) link.addEventListener('click', async event => {
      event.preventDefault(); status.textContent = '';
      try {
        if (!options.fetchManifest) throw new Error('缺少跨域请求权限');
        const latest = await options.fetchManifest('https://raw.githubusercontent.com/bangumi/Archive/master/aux/latest.json', panelController.signal);
        const href = url(latest.browser_download_url);
        if (!href.startsWith('https://github.com/bangumi/Archive/releases/download/')) throw new Error('来源地址不符');
        await startDownload(href, 'bangumi-source.zip'); status.textContent = '原始档案已下载';
      } catch (error) { status.textContent = `下载失败：${error.message}`; }
    });
    archiveLinks.append(link, document.createTextNode(' · '));
  }
  const address = document.createElement('input'); address.type = 'url'; address.placeholder = '预制数据库或清单 URL';
  address.addEventListener('input', () => { expectedCatalog = undefined; });
  const download = document.createElement('button'); download.type = 'button'; download.textContent = '下载数据库';
  const cancelDownload = document.createElement('button'); cancelDownload.type = 'button'; cancelDownload.textContent = '取消下载'; cancelDownload.disabled = true;
  let downloadController;
  const startDownload = async (href, filename) => {
    if (!options.download) throw new Error('未配置 GM_download');
    downloadController?.abort();
    downloadController = new AbortController();
    cancelDownload.disabled = false;
    try { await options.download(href, filename, downloadController.signal); }
    finally { cancelDownload.disabled = true; downloadController = undefined; }
  };
  cancelDownload.addEventListener('click', () => downloadController?.abort());
  download.addEventListener('click', async () => {
    try {
      const href = url(address.value);
      status.textContent = '';
      await startDownload(href, 'catalog.sqlite');
      status.textContent = '下载完成，请选择文件';
    } catch (error) { status.textContent = `下载失败：${error.message}`; }
  });
  const loadManifest = document.createElement('button'); loadManifest.type = 'button'; loadManifest.textContent = '读取清单';
  const choices = document.createElement('select');
  choices.setAttribute('aria-label', '预制目录');
  const manifestDownload = document.createElement('button'); manifestDownload.type = 'button'; manifestDownload.textContent = '下载所选目录';
  loadManifest.addEventListener('click', async () => {
    try {
      choices.replaceChildren();
      if (!options.fetchManifest) throw new Error('未配置跨域清单读取');
      const catalogs = validatePreparedManifest(await options.fetchManifest(url(address.value), panelController.signal));
      for (const item of catalogs) {
        const opt = document.createElement('option');
        opt.value = item.url;
        const info = [item.provider, item.source_version,
          item.size_bytes ? `${(item.size_bytes / 1024 / 1024).toFixed(1)} MiB` : '',
          item.sha256 ? `清单 SHA-256 ${item.sha256.slice(0, 12)}…` : '',
          `schema ${item.schema_version ?? SCHEMA_VERSION}`,
          `analyzer ${item.analyzer_version ?? ANALYZER_VERSION}`].filter(Boolean).join(' · ');
        opt.textContent = info; opt.dataset.filename = `${item.provider}.sqlite`; choices.append(opt);
        opt.dataset.provider = item.provider;
        opt.dataset.sourceVersion = item.source_version;
        if (item.sha256 !== undefined) opt.dataset.sha256 = item.sha256;
        if (item.size_bytes !== undefined) opt.dataset.sizeBytes = String(item.size_bytes);
        if (item.schema_version !== undefined) opt.dataset.schemaVersion = String(item.schema_version);
        if (item.analyzer_version !== undefined) opt.dataset.analyzerVersion = String(item.analyzer_version);
      }
      status.textContent = catalogs.length ? '选择预制目录' : '清单没有预制目录；请使用 CLI 构建';
    } catch (error) { status.textContent = `清单读取失败：${error.message}`; }
  });
  manifestDownload.addEventListener('click', async () => {
    try {
      if (!choices.value) throw new Error('没有可下载的目录');
      status.textContent = '';
      const selected = choices.selectedOptions[0];
      await startDownload(url(choices.value), selected?.dataset.filename || 'catalog.sqlite');
      expectedCatalog = selected ? {
        provider: selected.dataset.provider,
        source_version: selected.dataset.sourceVersion,
        sha256: selected.dataset.sha256,
        size_bytes: selected.dataset.sizeBytes === undefined ? undefined : Number(selected.dataset.sizeBytes),
        schema_version: selected.dataset.schemaVersion === undefined ? undefined : Number(selected.dataset.schemaVersion),
        analyzer_version: selected.dataset.analyzerVersion === undefined ? undefined : Number(selected.dataset.analyzerVersion)
      } : undefined;
      status.textContent = '下载完成，请选择文件';
    } catch (error) { status.textContent = `下载失败：${error.message}`; }
  });
  const advanced = document.createElement('div');
  const capability = document.createElement('p');
  const detected = browserBuildCapability();
  const buildConfigured = Boolean(options.buildWorkerUrl || options.buildWorkerFactory || options.builder);
  capability.textContent = buildConfigured ? detected.reason : '未配置构建 Worker；请使用原生 CLI。';
  advanced.append(capability);
  let builder = options.builder;
  const ownsBuilder = !builder;
  if ((options.buildWorkerUrl || options.buildWorkerFactory || builder) && detected.available) {
    builder ??= new BrowserCatalogBuilder(options.buildWorkerUrl, {
      workerFactory: options.buildWorkerFactory, initOptions: options.buildInitOptions
    });
    const source = document.createElement('select');
    source.setAttribute('aria-label', '构建来源');
    for (const id of ['bangumi', 'ehentai', 'mangabaka', 'bookwalker']) {
      const option = document.createElement('option'); option.value = id; option.textContent = id; source.append(option);
    }
    const archive = document.createElement('input'); archive.type = 'file';
    archive.setAttribute('aria-label', '来源档案');
    const version = document.createElement('input'); version.placeholder = '来源版本（可选）';
    const build = document.createElement('button'); build.type = 'button'; build.textContent = '构建本地目录';
    const cancel = document.createElement('button'); cancel.type = 'button'; cancel.textContent = '取消构建或导出';
    const exportButton = document.createElement('button'); exportButton.type = 'button'; exportButton.textContent = '分块导出';
    const openButton = document.createElement('button'); openButton.type = 'button'; openButton.textContent = '打开构建结果';
    build.addEventListener('click', async () => {
      try {
        if (!archive.files?.[0]) throw new Error('请选择来源档案');
        status.textContent = ''; build.disabled = true;
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
        if (!builder.ready) throw new Error('没有已完成的目录');
        if (typeof globalThis.showSaveFilePicker === 'function') {
          const handle = await globalThis.showSaveFilePicker({ suggestedName: 'catalog.sqlite' });
          status.textContent = '';
          await builder.exportTo(await handle.createWritable());
          status.textContent = '导出完成';
        } else {
          const exportFile = await builder.file();
          const objectUrl = URL.createObjectURL(exportFile);
          exportUrls.add(objectUrl);
          const anchor = document.createElement('a'); anchor.href = objectUrl;
          anchor.download = 'catalog.sqlite'; anchor.hidden = true; root.append(anchor); anchor.click(); anchor.remove();
          exportedFiles.push(exportFile);
          status.textContent = '已开始下载';
        }
      } catch (error) { status.textContent = `导出失败：${error.message}`; }
    });
    advanced.append(source, archive, version, build, cancel, openButton, exportButton);
  }
  details.append(summary, explanation, archiveLinks, address, download, cancelDownload, loadManifest, choices, manifestDownload, advanced);
  root.append(heading, file, status, details); container.append(root);
  const exportUrls = new Set();
  const exportedFiles = [];
  return async () => {
    panelController.abort();
    downloadController?.abort();
    if (ownsBuilder && builder) await builder.dispose();
    else builder?.cancel();
    for (const objectUrl of exportUrls) URL.revokeObjectURL(objectUrl);
    exportedFiles.length = 0;
    root.remove();
  };
}

export function catalogProvider(client, provider) {
  if (!['bangumi', 'ehentai', 'mangabaka', 'bookwalker'].includes(provider))
    throw new Error(`不支持的本地目录来源：${provider}`);
  return {
    id: provider, capabilities: { series: provider !== 'ehentai', volumes: ['bangumi','bookwalker'].includes(provider), volumeMetadata: ['bangumi','bookwalker'].includes(provider), gallery: provider === 'ehentai', offline: true },
    available: () => Boolean(client.file),
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
      if (provider === 'bookwalker' && /^(?:CNT|PRD)_[\w-]+$/.test(input)) return input;
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
