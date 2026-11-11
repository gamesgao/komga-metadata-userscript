import { SCHEMA_VERSION, ANALYZER_VERSION } from './analyzer.mjs';
import { BrowserCatalogBuilder, browserBuildCapability } from './browser-builder.mjs';
function url(value) {
  const parsed = new URL(value);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('仅支持无凭据的 HTTP(S) 地址');
  return parsed.href;
}
export function validatePreparedManifest(manifest) {
  if (!manifest || manifest.schema_version !== SCHEMA_VERSION || manifest.analyzer_version !== ANALYZER_VERSION || !Array.isArray(manifest.catalogs)) throw new Error('预制目录清单版本或格式错误');
  return manifest.catalogs.map(item => {
    if (!item || !['bangumi','ehentai','mangabaka','bookwalker'].includes(item.provider) || typeof item.source_version !== 'string' || typeof item.url !== 'string') throw new Error('预制目录清单条目错误');
    if (item.schema_version !== undefined && item.schema_version !== SCHEMA_VERSION) throw new Error('清单目录 schema 版本不兼容');
    if (item.analyzer_version !== undefined && item.analyzer_version !== ANALYZER_VERSION) throw new Error('清单目录 analyzer 版本不兼容');
    if (item.size_bytes !== undefined && (!Number.isSafeInteger(item.size_bytes) || item.size_bytes < 1)) throw new Error('清单文件大小格式错误');
    if (item.sha256 !== undefined && !/^[a-f0-9]{64}$/i.test(item.sha256)) throw new Error('清单 SHA-256 格式错误');
    return { ...item, url: url(item.url), sha256: item.sha256?.toLowerCase() };
  });
}
export const catalogSources = [
  { id: 'bangumi', name: 'Bangumi', filename: 'bangumi-source.zip' },
  { id: 'ehentai', name: 'E-Hentai', filename: 'e-hentai.db.zstd', url: 'https://github.com/URenko/e-hentai-db/releases/download/nightly/e-hentai.db.zstd' },
  { id: 'mangabaka', name: 'MangaBaka', filename: 'series.sqlite.tar.gz', url: 'https://api.mangabaka.org/v1/database/series.sqlite.tar.gz' },
  { id: 'bookwalker', name: 'BookWalker', filename: 'bkwk-db.sqlite.zst', url: 'https://static.bookwalker.com/data/bkwk-db.sqlite.zst' }
];
export async function resolveArchive(source, fetchManifest, signal) {
  if (source.url) return source.url;
  if (!fetchManifest) throw new Error('缺少跨域请求权限');
  const latest = await fetchManifest('https://raw.githubusercontent.com/bangumi/Archive/master/aux/latest.json', signal);
  const href = url(latest.browser_download_url);
  if (!href.startsWith('https://github.com/bangumi/Archive/releases/download/')) throw new Error('来源地址不符');
  return href;
}
function el(tag, text) { const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e; }
function button(text, fn) { const b = el('button', text); b.type = 'button'; b.onclick = fn; return b; }
export function mountCatalogPanel(container, client, options = {}) {
  const root = el('section'); root.dataset.kmCatalog = '1';
  const style = el('style', 'section[data-km-catalog] .catalog-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}section[data-km-catalog] .catalog-source{border:1px solid var(--km-border,#dce0e7);border-radius:10px;padding:14px;display:grid;gap:8px;align-content:start}section[data-km-catalog] progress{width:100%}section[data-km-catalog] .catalog-source h4{margin:0}section[data-km-catalog] .catalog-source button{width:100%}@media(max-width:600px){section[data-km-catalog] .catalog-sources{grid-template-columns:1fr}}');
  const status = el('p', '选择来源，下载并新建数据库'); status.setAttribute('role','status');
  const progress = el('progress'); progress.hidden = true;
  const cards = el('div'); cards.className = 'catalog-sources';
  const capability = browserBuildCapability();
  const builder = options.builder ?? (options.buildWorkerUrl || options.buildWorkerFactory ? new BrowserCatalogBuilder(options.buildWorkerUrl, { workerFactory: options.buildWorkerFactory, initOptions: options.buildInitOptions }) : undefined);
  const canBuild = capability.available && Boolean(builder);
  const canAuto = canBuild && Boolean(options.downloadArchive);
  let busy = false, disposed = false, controller, activeTask;
  const exports = new Set(), states = new Map(), exportButtons = new Map();
  const loadedFile = id => client.fileFor ? client.fileFor(id) : (states.get(id)?.loaded ? client.selectedFile : undefined);
  const refresh = () => {
    for (const [id, state] of states) {
      if (client.hasProvider?.(id)) state.loaded = true;
      if (!busy) state.label.textContent = state.loaded ? '已加载，可用于搜索' : '未加载';
      exportButtons.get(id).disabled = busy || !loadedFile(id);
      exportButtons.get(id).hidden = !loadedFile(id);
    }
    for (const control of root.querySelectorAll('button,input,select')) if (!exportButtonsHas(control) && control !== cancel) control.disabled = busy || (control.dataset.needsBuild === '1' && !canBuild);
    cancel.disabled = !busy;
    cancel.hidden = !busy;
  };
  const exportButtonsHas = control => [...exportButtons.values()].includes(control);
  const cancel = button('取消当前任务', () => { controller?.abort(); builder?.cancel(); client.cancel(); }); cancel.disabled = true;
  const cancelled = () => { if (disposed || controller?.signal.aborted) throw new DOMException('已取消','AbortError'); };
  const run = fn => {
    if (busy || disposed) return;
    controller = new AbortController(); busy = true; refresh(); progress.hidden = false; progress.removeAttribute('value');
    activeTask = (async () => {
      try { await fn(controller.signal); }
      catch (error) { if (!disposed) status.textContent = error.name === 'AbortError' ? '已取消，已有数据库不变' : `失败：${error.message}`; }
      finally { busy = false; progress.hidden = true; if (!disposed) refresh(); }
    })();
    return activeTask;
  };
  const load = async file => {
    cancelled();
    const previous = client.selectedFile;
    let manifest;
    try { manifest = await client.open(file); }
    catch (error) { if (previous && !disposed && !client.hasFile) await client.open(previous); throw error; }
    cancelled();
    if (!client.hasProvider) for (const state of states.values()) state.loaded = false;
    const state = states.get(manifest.provider); if (state) state.loaded = true;
    status.textContent = `${manifest.provider} · 已加载`;
    return manifest;
  };
  const buildFile = async (file, id) => {
    if (!canBuild) throw new Error(capability.reason);
    cancelled(); status.textContent = '正在新建数据库…';
    const result = await builder.build(file, id, file.name, data => {
      status.textContent = `${data.phase}${data.count === undefined ? '' : ` · ${data.count} / ${data.total}`}`;
      if (data.total > 0) { progress.max = data.total; progress.value = data.count; } else progress.removeAttribute('value');
    });
    cancelled(); status.textContent = '正在加载数据库…';
    cancel.disabled = true; // Commit point: do not present a cancellable completed build.
    const built = await builder.file(); await load(built);
    // The builder validates SQLite before this point. Only activate a complete output.
    if (builder.persist) {
      try { await builder.persist(); }
      catch (error) { status.textContent = `已加载，但自动保存失败：${error.message}；请导出数据库`; return; }
    }
    status.textContent = `${id} · 已构建并加载 ${result.count} 条`;
  };
  const save = id => run(async () => {
    const file = loadedFile(id); if (!file) throw new Error('尚未加载此来源');
    if (typeof globalThis.showSaveFilePicker === 'function') {
      let handle;
      try { handle = await globalThis.showSaveFilePicker({ suggestedName: `${id}.sqlite` }); }
      catch (error) { if (error.name === 'AbortError') { status.textContent = '已取消保存'; return; } throw error; }
      const writable = await handle.createWritable();
      try {
        for (let offset = 0; offset < file.size; offset += 1024 * 1024) { cancelled(); await writable.write(await file.slice(offset, offset + 1024 * 1024).arrayBuffer()); }
        cancelled(); await writable.close(); status.textContent = '数据库已保存';
      } catch (error) { await writable.abort(); throw error; }
    } else {
      const href = URL.createObjectURL(file); exports.add(href);
      const a = el('a'); a.href = href; a.download = `${id}.sqlite`; a.hidden = true; root.append(a); a.click(); a.remove();
      status.textContent = '已开始导出数据库';
    }
  });
  for (const source of catalogSources) {
    const card = el('div'); card.className = 'catalog-source'; card.dataset.provider = source.id;
    const label = el('span', '未加载'); states.set(source.id, { label, loaded: Boolean(client.hasProvider?.(source.id)) });
    const start = button(`${source.name} · ${canAuto ? '下载并构建' : '下载原始数据'}`, () => run(async signal => {
      status.textContent = `正在获取 ${source.name} 下载地址…`;
      const href = await resolveArchive(source, options.fetchManifest, signal); cancelled();
      if (!canAuto) {
        if (!options.download) throw new Error('缺少下载权限');
        await options.download(href, source.filename, signal);
        status.textContent = canBuild ? '原始数据已下载，请在「已有文件」中选择它来构建' : `原始数据已下载。${capability.reason}`;
        return;
      }
      label.textContent = '正在下载';
      let archive;
      try { archive = await options.downloadArchive(href, source.filename, signal, (bytes, total) => {
        status.textContent = `${source.name} · 已下载 ${(bytes/1024/1024).toFixed(1)} MiB${total ? ` / ${(total/1024/1024).toFixed(1)} MiB` : ''}`;
        if (total && total >= bytes) { progress.max = total; progress.value = bytes; } else progress.removeAttribute('value');
      }); } catch (error) { if (error.name !== 'AbortError') fallback.hidden = false; throw error; }
      try { cancelled(); label.textContent = '正在构建'; await buildFile(archive.file, source.id); }
      catch (error) { if (error.name !== 'AbortError') fallback.hidden = false; throw error; }
      finally { await archive.cleanup(); }
    }));
    start.setAttribute('aria-label', start.textContent);
    start.textContent = canAuto ? '下载并构建' : '下载原始数据';
    const fallback = button('仅下载原始数据', () => run(async signal => {
      const href = await resolveArchive(source, options.fetchManifest, signal);
      if (!options.download) throw new Error('缺少下载权限');
      await options.download(href, source.filename, signal);
      status.textContent = '原始数据已下载，请在「已有文件」中选择它来构建';
    })); fallback.hidden = true;
    const exportButton = button('导出数据库', () => save(source.id)); exportButtons.set(source.id, exportButton);
    card.append(el('h4', source.name), label, start, fallback, exportButton); cards.append(card);
  }
  const existing = el('details'); existing.append(el('summary', '已有文件'));
  const fileLabel = el('label', '加载已构建数据库'), file = el('input'); file.type = 'file'; file.accept = '.sqlite,.db'; file.setAttribute('aria-label','本地数据库文件'); fileLabel.append(file);
  file.onchange = () => { if (file.files?.[0]) { const selected = file.files[0]; void run(() => load(selected)); } };
  const rawDetails = el('details'); rawDetails.append(el('summary','从已下载的原始数据构建'));
  const source = el('select'); source.setAttribute('aria-label','构建来源');
  for (const item of catalogSources) { const option = el('option', item.name); option.value = item.id; source.append(option); }
  const archive = el('input'); archive.type = 'file'; archive.setAttribute('aria-label','来源档案');
  const build = button('构建并加载', () => run(async () => { if (!archive.files?.[0]) throw new Error('请选择原始数据文件'); await buildFile(archive.files[0], source.value); }));
  build.dataset.needsBuild = '1';
  rawDetails.append(source, archive, build); existing.append(fileLabel, rawDetails);
  root.append(style, el('h3','下载并建立本地数据库'), el('p','选择来源后自动下载、构建并加载，无需预先创建文件。在此构建的库保存在当前浏览器，也可以导出备份。'));
  if (!canBuild) root.append(el('p', capability.reason));
  root.append(cards,status,progress,cancel,existing); container.append(root); refresh();
  // Restore persisted build outputs. Manual imports retain their File within this page.
  const restore = async () => {
    if (!canBuild) return;
    let directory;
    try { directory = await (await navigator.storage.getDirectory()).getDirectoryHandle('komga-catalog-build'); }
    catch (error) { if (error.name !== 'NotFoundError') status.textContent = `恢复失败：${error.message}`; return; }
    for (const source of catalogSources) {
      if (disposed || client.hasProvider?.(source.id)) continue;
      try {
        const info = JSON.parse(await (await (await directory.getFileHandle(`active-${source.id}.json`)).getFile()).text());
        if (info.provider !== source.id || !/^output-[\w-]+\.sqlite$/.test(info.name)) throw new Error('保存记录无效');
        if (disposed) return;
        await load(await (await directory.getFileHandle(info.name)).getFile());
      } catch (error) { if (error.name !== 'NotFoundError' && !disposed) status.textContent = `${source.name} 恢复失败：${error.message}`; }
    }
    if (!disposed) refresh();
  };
  busy = true; refresh();
  client.restoring = restore().finally(() => { client.restoring = undefined; busy = false; if (!disposed) refresh(); });
  return async () => {
    disposed = true; controller?.abort(); builder?.cancel(); client.cancel();
    await client.restoring; await activeTask;
    if (!options.builder) await builder?.dispose();
    for (const href of exports) URL.revokeObjectURL(href);
    root.remove();
  };
}
export function catalogProvider(client, provider) {
  if (!['bangumi','ehentai','mangabaka','bookwalker'].includes(provider)) throw new Error(`不支持的本地目录来源：${provider}`);
  return {
    id: provider, capabilities: { series: provider !== 'ehentai', volumes: ['bangumi','bookwalker'].includes(provider), volumeMetadata: ['bangumi','bookwalker'].includes(provider), gallery: provider === 'ehentai', offline: true },
    available: () => Boolean(client.restoring || (client.hasProvider ? client.hasProvider(provider) : client.file)),
    async search(query, context) {
      if (context.signal.aborted) throw new DOMException('已取消','AbortError');
      const abort = () => client.cancel(); context.signal.addEventListener('abort',abort,{once:true});
      try { return await client.search(query,provider); } finally { context.signal.removeEventListener('abort',abort); }
    },
    async get(id, context) {
      if (context.signal.aborted) throw new DOMException('已取消','AbortError');
      const abort = () => client.cancel(); context.signal.addEventListener('abort',abort,{once:true});
      try { return await client.get(provider,id); } finally { context.signal.removeEventListener('abort',abort); }
    },
    async resolveLink(input, context) {
      if (context?.signal.aborted) throw new DOMException('已取消','AbortError');
      if (provider === 'bookwalker' && /^(?:CNT|PRD)_[\w-]+$/.test(input)) return input;
      if (['bangumi','mangabaka'].includes(provider) && /^\d+$/.test(input)) return input;
      if (provider === 'ehentai' && /^[1-9]\d*:[a-f0-9]{10}$/i.test(input)) return input.toLowerCase();
      const u = new URL(input), path = u.pathname.split('/').filter(Boolean);
      if (provider === 'bangumi' && ['bgm.tv','bangumi.tv','chii.in'].includes(u.hostname) && path[0] === 'subject' && /^\d+$/.test(path[1] ?? '')) return path[1];
      if (provider === 'ehentai' && ['e-hentai.org','exhentai.org'].includes(u.hostname) && path[0] === 'g' && /^[1-9]\d*$/.test(path[1] ?? '') && /^[a-f0-9]{10}$/i.test(path[2] ?? '')) return `${path[1]}:${path[2].toLowerCase()}`;
      if (provider === 'mangabaka' && ['mangabaka.org','www.mangabaka.org'].includes(u.hostname) && ['manga','series'].includes(path[0]) && /^\d+$/.test(path[1] ?? '')) return path[1];
      if (provider === 'bookwalker' && ['bookwalker.com','www.bookwalker.com'].includes(u.hostname) && path[0] === 'series' && /^[\w-]+$/.test(path[1] ?? '')) return path[1].startsWith('CNT_') ? path[1] : `CNT_${path[1]}`;
      throw new Error('该来源的链接无法解析，请使用目录 ID');
    }
  };
}
