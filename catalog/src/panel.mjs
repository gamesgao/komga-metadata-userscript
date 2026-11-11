import { SCHEMA_VERSION, ANALYZER_VERSION } from './analyzer.mjs';
import { BrowserCatalogBuilder, browserBuildCapability } from './browser-builder.mjs';
import { catalogDirectory } from './storage.mjs';
import { TaskQueue } from './task-queue.mjs';
import { ArchiveCache, removeSavedCatalog, storageUsage } from './archive-cache.mjs';
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
  const style = el('style', 'section[data-km-catalog] .catalog-sources{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:16px 0}section[data-km-catalog] .catalog-source{border:1px solid var(--km-border,#dce0e7);border-radius:10px;padding:14px;display:grid;gap:8px;align-content:start}section[data-km-catalog] progress{display:block;width:100%;height:10px;min-height:10px;border:0;border-radius:5px;overflow:hidden;appearance:none;accent-color:var(--accent,#4f46e5)}section[data-km-catalog] progress::-webkit-progress-bar{background:var(--line,#e4e7ed)}section[data-km-catalog] progress::-webkit-progress-value{background:var(--accent,#4f46e5)}section[data-km-catalog] progress:not([value])::-webkit-progress-bar{background:repeating-linear-gradient(110deg,var(--line,#e4e7ed) 0 12px,var(--accent,#4f46e5) 12px 24px);background-size:48px 100%;animation:catalog-working 1.4s linear infinite}@keyframes catalog-working{to{background-position:48px 0}}@media(prefers-reduced-motion:reduce){section[data-km-catalog] progress:not([value])::-webkit-progress-bar{animation:none}}section[data-km-catalog] .catalog-source h4{margin:0}section[data-km-catalog] .catalog-source button{width:100%}@media(max-width:600px){section[data-km-catalog] .catalog-sources{grid-template-columns:1fr}}');

  const cards = el('div'); cards.className = 'catalog-sources';
  const capability = browserBuildCapability();
  const builder = options.builder ?? (options.buildWorkerUrl || options.buildWorkerFactory ? new BrowserCatalogBuilder(options.buildWorkerUrl, { workerFactory: options.buildWorkerFactory, initOptions: options.buildInitOptions }) : undefined);
  const canBuild = capability.available && Boolean(builder), canAuto = canBuild && Boolean(options.downloadArchive);
  const downloads = new TaskQueue(2), builds = new TaskQueue(1), loads = new TaskQueue(1);
  const cache = options.archiveCache ?? new ArchiveCache();
  const exports = new Set(), states = new Map(), activeTasks = new Set();
  let disposed = false, restoring = true, importedBusy = false;
  const size = value => value >= 1024 ** 3 ? `${(value / 1024 ** 3).toFixed(2)} GiB` : `${(value / 1024 ** 2).toFixed(1)} MiB`;
  const loadedFile = id => client.fileFor ? client.fileFor(id) : (states.get(id)?.loaded ? client.selectedFile : undefined);
  const check = signal => { if (disposed || signal?.aborted) throw new DOMException('已取消','AbortError'); };
  const storageText = el('p', '正在读取存储用量…'); storageText.dataset.storage = '1';
  const updateStorage = async () => {
    if (!capability.available) { storageText.textContent = '此浏览器无法读取本地构建存储用量'; return; }
    try {
      const info = await (options.storageUsage ?? storageUsage)();
      if (!disposed) storageText.textContent = `本工具文件占用 ${size(info.owned)}`;
    } catch (e) { if (!disposed) storageText.textContent = `暂时无法读取存储用量：${e.message}`; }
  };
  const update = () => {
    for (const [id, s] of states) {
      const ready = Boolean(s.archive), loaded = Boolean(loadedFile(id));
      const action = ready ? '继续构建' : canAuto ? '下载并构建' : '下载原始数据';
      s.start.textContent = action; s.start.setAttribute('aria-label', `${s.name} · ${action}`);
      s.start.disabled = restoring || s.active;
      s.fallback.disabled = restoring || s.active;
      s.cancel.hidden = !s.active; s.cancel.disabled = s.committing;
      s.clearRaw.hidden = !ready; s.clearRaw.disabled = restoring || s.active;
      s.clearDb.hidden = !loaded; s.clearDb.disabled = restoring || s.active || importedBusy;
      s.exportButton.hidden = !loaded; s.exportButton.disabled = restoring || s.active;
      s.bar.hidden = !s.active;
    }
    file.disabled = restoring || importedBusy || [...states.values()].some(s => s.active);
    build.disabled = restoring || !canBuild || Boolean(states.get(source.value)?.active);
  };
  const say = (s, text, count, total) => {
    s.label.textContent = text;
    s.bar.setAttribute('aria-label', `${s.name} 当前阶段进度`); s.bar.setAttribute('aria-valuetext', text);
    if (total > 0) { s.bar.max = total; s.bar.value = count; } else s.bar.removeAttribute('value');
  };
  const run = (id, work) => {
    const s = states.get(id); if (restoring || disposed || s.active) return;
    s.active = true; s.committing = false; s.fallback.hidden = true; s.controller = new AbortController(); update();
    const promise = Promise.resolve().then(async () => {
      try { await work(s, s.controller.signal); }
      catch (e) {
        if (!disposed) {
          say(s, e.name === 'AbortError' ? `已取消，已有数据库不变${s.archive ? '；完整档案已保留，可继续构建' : ''}` : `失败：${e.message}${s.archive ? '；完整档案已保留，可重试构建' : ''}`);
          s.fallback.hidden = e.name === 'AbortError';
        }
      } finally { s.active = false; s.committing = false; activeTasks.delete(promise); if (!disposed) { update(); void updateStorage(); } }
    });
    activeTasks.add(promise); return promise;
  };
  const load = (selected, signal) => loads.run(async () => {
    check(signal); const previous = client.selectedFile;
    let manifest;
    try { manifest = await client.open(selected); }
    catch (e) { if (previous && !disposed && !client.hasFile) await client.open(previous); throw e; }
    if (!client.hasProvider) for (const s of states.values()) s.loaded = false;
    const s = states.get(manifest.provider); if (s) { s.loaded = true; if (!s.active && !s.archive) s.label.textContent = '已加载，可用于搜索'; }

    return manifest;
  }, signal);
  const buildFile = async (s, selected, signal) => {
    if (!canBuild) throw new Error(capability.reason);
    say(s, '等待构建（一次一个，降低内存占用）');
    await builds.run(async () => {
      check(signal); say(s, '正在新建数据库…');
      const abort = () => builder.cancel(); signal.addEventListener('abort', abort, { once:true });
      try {
        const result = await builder.build(selected, s.id, selected.name, data => say(s, `${data.phase}${data.count === undefined ? '' : data.unit === 'bytes' ? ` · ${size(data.count)} / ${size(data.total)}` : ` · ${data.count} / ${data.total}`}`, data.count, data.total));
        check(signal); s.committing = true; update(); say(s, '正在加载数据库…');
        const previous = loadedFile(s.id);
        const built = await builder.file(); await load(built);
        if (builder.persist) {
          try { await builder.persist(); }
          catch (e) {
            if (builder.completed) {
              // Do not leave a reader referencing scratch output that the next provider's
              // build would delete. A failed index write preserves the previous saved file.
              if (previous) await load(previous);
              else if (client.remove) client.remove(s.id);
              else { await client.close(); s.loaded = false; }
              await builder.dispose(); throw e;
            }
            // Index was committed; only old-file cleanup failed. The new reader is valid.
            say(s, `已构建并加载 ${result.count} 条；旧文件清理失败：${e.message}`); return;
          }
        }
        if (s.archive) {
          try { await cache.discard(s.id); s.archive = undefined; }
          catch(e) { say(s, `已构建并加载 ${result.count} 条；原始档案清理失败：${e.message}`); return; }
        }
        say(s, `已构建并加载 ${result.count} 条`);
      } finally { signal.removeEventListener('abort', abort); }
    }, signal);
  };
  const save = id => run(id, async (s, signal) => {
    const selected = loadedFile(id); if (!selected) throw new Error('尚未加载此来源');
    if (typeof globalThis.showSaveFilePicker === 'function') {
      let handle;
      try { handle = await globalThis.showSaveFilePicker({ suggestedName: `${id}.sqlite` }); }
      catch (e) { if (e.name === 'AbortError') { say(s, '已取消保存'); return; } throw e; }
      const out = await handle.createWritable();
      try { for (let at=0; at<selected.size; at+=1024*1024) { check(signal); await out.write(await selected.slice(at,at+1024*1024).arrayBuffer()); } check(signal); await out.close(); say(s,'数据库已保存'); }
      catch (e) { await out.abort(); throw e; }
    } else {
      const href = URL.createObjectURL(selected); exports.add(href);
      const a = el('a'); a.href=href; a.download=`${id}.sqlite`; a.hidden=true; root.append(a); a.click(); a.remove(); say(s,'已开始导出数据库');
    }
  });
  for (const item of catalogSources) {
    const s = { ...item, active:false, loaded:Boolean(client.hasProvider?.(item.id)), label:el('span','未加载'), bar:el('progress') }; states.set(item.id,s);
    s.label.setAttribute('role','status');
    const card=el('div'); card.className='catalog-source'; card.dataset.provider=item.id;
    s.start=button('',()=>run(item.id,async (s,signal)=>{
      if (s.archive) { await buildFile(s,s.archive.file,signal); return; }
      say(s,'等待下载');
      await downloads.run(async()=>{
        check(signal); say(s,'正在获取下载地址…');
        const href=await resolveArchive(item,options.fetchManifest,signal); check(signal);
        if (!canAuto) {
          if (!options.download) throw new Error('缺少下载权限');
          await options.download(href,item.filename,signal); say(s,canBuild?'原始数据已下载，请在「已有文件」中选择它来构建':`原始数据已下载。${capability.reason}`);return;
        }
        const archive=await options.downloadArchive(href,item.filename,signal,(bytes,total)=>say(s,`已下载 ${size(bytes)}${total?` / ${size(total)}`:'（总大小未知）'}`,bytes,total));
        // Commit a complete archive before reacting to cancellation. No partial data is resumable.
        try { s.archive=await cache.save(item.id,archive,href); }
        catch(e) { await archive.cleanup(); throw e; }
        say(s,'完整档案已保存'); void updateStorage();
      },signal);
      if(canAuto) { check(signal); await buildFile(s,s.archive.file,signal); }
    }));
    s.cancel=button('取消任务',()=>{ if(!s.committing)s.controller?.abort(); });
    s.fallback=button('仅下载原始数据',()=>run(item.id,async(s,signal)=>{
      await downloads.run(async()=>{ const href=await resolveArchive(item,options.fetchManifest,signal);check(signal);if(!options.download)throw Error('缺少下载权限');await options.download(href,item.filename,signal);say(s,'原始数据已下载，请在「已有文件」中选择它来构建'); },signal);
    }));s.fallback.hidden=true;
    s.exportButton=button('导出数据库',()=>save(item.id));
    s.clearRaw=button('清除原始档案',()=>{ if(confirm(`清除 ${item.name} 已下载的原始档案？已有数据库不变。`)) void run(item.id,async s=>{await cache.discard(item.id);s.archive=undefined;say(s,'已清除原始档案，已有数据库不变');}); });
    s.clearDb=button('移除数据库',()=>{ if(confirm(`移除浏览器中的 ${item.name} 数据库？不会修改 Komga 元数据或外部文件。`)) void run(item.id,async(s,signal)=>{await loads.run(async()=>{await removeSavedCatalog(item.id);client.remove?.(item.id);s.loaded=false;},signal);say(s,'已移除浏览器数据库');}); });
    card.append(el('h4',item.name),s.label,s.bar,s.start,s.cancel,s.fallback,s.exportButton,s.clearRaw,s.clearDb);cards.append(card);
  }
  const existing=el('details');existing.append(el('summary','已有文件'));
  const fileLabel=el('label','加载已构建数据库'),file=el('input');file.type='file';file.accept='.sqlite,.db';file.setAttribute('aria-label','本地数据库文件');fileLabel.append(file);
  const importError=el('p');importError.setAttribute('role','alert');importError.hidden=true;
  file.onchange=()=>{
    if(!file.files?.[0]||importedBusy||restoring)return;
    const selected=file.files[0];importError.hidden=true;importError.textContent='';importedBusy=true;update();
    const task=load(selected).catch(e=>{importError.textContent=`加载失败：${e.message}`;importError.hidden=false;}).finally(()=>{importedBusy=false;activeTasks.delete(task);if(!disposed)update();});activeTasks.add(task);
  };
  const rawDetails=el('details');rawDetails.append(el('summary','从已下载的原始数据构建'));
  const source=el('select');source.setAttribute('aria-label','构建来源');
  for(const item of catalogSources){const o=el('option',item.name);o.value=item.id;source.append(o);}source.onchange=update;
  const archive=el('input');archive.type='file';archive.setAttribute('aria-label','来源档案');
  const build=button('构建并加载',()=>{const selected=archive.files?.[0];return run(source.value,async(s,signal)=>{if(!selected)throw Error('请选择原始数据文件');await buildFile(s,selected,signal);});});
  rawDetails.append(source,archive,build);existing.append(fileLabel,importError,rawDetails);
  root.append(style,el('h3','本地数据库'));
  if(!canBuild)root.append(el('p',capability.reason));
  root.append(cards,storageText,button('刷新存储用量',()=>{void updateStorage();}),existing);container.append(root);update();
  const restore=async()=>{
    if(!canBuild)return;
    for(const item of catalogSources){
      if(disposed)return;const s=states.get(item.id);
      try {s.archive=await cache.get(item.id);if(s.archive)s.label.textContent=`完整档案 ${size(s.archive.file.size)}，可继续构建`;} catch(e){say(s,`档案恢复失败：${e.message}`);}
      if(client.hasProvider?.(item.id))continue;
      try {
        const directory=await catalogDirectory('komga-catalog-build',false);
        const info=JSON.parse(await(await(await directory.getFileHandle(`active-${item.id}.json`)).getFile()).text());
        if(info.provider!==item.id||!/^output-[\w-]+\.sqlite$/.test(info.name))throw Error('保存记录无效');
        check();await load(await(await directory.getFileHandle(info.name)).getFile());
        if(!s.archive)s.label.textContent='已加载，可用于搜索';
      }catch(e){if(e.name!=='NotFoundError'&&!disposed)say(s,`恢复失败：${e.message}`);}
    }
  };
  client.restoring=restore().finally(()=>{client.restoring=undefined;restoring=false;if(!disposed){update();void updateStorage();}});
  return async()=>{
    disposed=true;for(const s of states.values())if(!s.committing)s.controller?.abort();
    client.cancel();await client.restoring;await Promise.allSettled([...activeTasks]);
    if(!options.builder)await builder?.dispose();for(const href of exports)URL.revokeObjectURL(href);root.remove();
  };
}
export function catalogProvider(client, provider) {
  if (!['bangumi','ehentai','mangabaka','bookwalker'].includes(provider)) throw new Error(`不支持的本地目录来源：${provider}`);
  return {
    id: provider, capabilities: { series: provider !== 'ehentai', volumes: ['bangumi','bookwalker'].includes(provider), volumeMetadata: ['bangumi','bookwalker'].includes(provider), gallery: provider === 'ehentai', offline: true },
    available: () => Boolean(client.restoring || (client.hasProvider ? client.hasProvider(provider) : client.file)),
    async search(query, context) {
      if (context.signal.aborted) throw new DOMException('已取消','AbortError');
      const abort = () => client.cancelQueries ? client.cancelQueries() : client.cancel(); context.signal.addEventListener('abort',abort,{once:true});
      try { return await client.search(query,provider); } finally { context.signal.removeEventListener('abort',abort); }
    },
    async get(id, context) {
      if (context.signal.aborted) throw new DOMException('已取消','AbortError');
      const abort = () => client.cancelQueries ? client.cancelQueries() : client.cancel(); context.signal.addEventListener('abort',abort,{once:true});
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
