import { storageBackend, catalogDirectory, transferDirectory, uniqueId } from './storage.mjs';
export function browserBuildCapability() {
  if (!storageBackend()) return { available: false, reason: '当前浏览器不支持本地构建存储；可使用 Chrome/Edge、HTTPS 或导入已有数据库。' };
  if (typeof Worker !== 'function') return { available: false, reason: '浏览器不支持 Worker；请使用原生 CLI' };
  return { available: true, reason: '支持四种本地来源档案；浏览器资源不足时请使用原生 CLI' };
}
export class BrowserCatalogBuilder {
  constructor(workerUrl, options = {}) {
    if (!workerUrl && !options.workerFactory) throw new Error('Build worker URL or factory is required');
    this.workerUrl = workerUrl;
    this.workerFactory = options.workerFactory;
    this.initOptions = options.initOptions;
    this.current = undefined;
    this.completed = undefined;
    this.generation = 0;
    this.busy = false;
  }
  async build(file, provider, sourceVersion, onProgress) {
    if (this.busy) throw new Error('已有构建任务');
    const capability = browserBuildCapability();
    if (!capability.available) throw new Error(capability.reason);
    if (!(file instanceof File)) throw new Error('请选择本地来源文件');
    const generation = this.generation;
    this.busy = true;
    try {
      const directory = await catalogDirectory('komga-catalog-build');
      if (generation !== this.generation) throw new DOMException('Build cancelled', 'AbortError');
      const nonce = uniqueId();
      const outputName = `output-${nonce}.sqlite`, sourceName = `source-${nonce}.sqlite`;
      const created = this.workerFactory
        ? await this.workerFactory()
        : new Worker(this.workerUrl, { type: 'module' });
      const worker = created?.worker ?? created;
      const initOptions = created?.initOptions ?? this.initOptions;
      if (!worker || typeof worker.postMessage !== 'function') throw new Error('Build worker factory returned no Worker');
      const task = { worker, directory, sourceName, outputName, reject: undefined };
      this.current = task;
      try {
        const result = await new Promise((resolve, reject) => {
          let settled = false;
          const fail = error => { if (!settled) { settled = true; reject(error); } };
          task.reject = fail;
          worker.onmessage = ({ data }) => {
            if (data.type === 'ready') {
              const payload = { file, directory: transferDirectory(directory), sourceName, outputName, provider, sourceVersion };
              worker.postMessage(initOptions ? { type: 'build', payload } : payload);
            } else if (data.type === 'progress') onProgress?.(data);
            else if (data.type === 'init-error') fail(new Error(data.error));
            else if (data.error) fail(new Error(data.error));
            else if (!settled) { settled = true; resolve(data.result); }
          };
          worker.onerror = event => {
            event.preventDefault();
            fail(new Error(`Build worker failed: ${event.message || 'startup error'} (Blob Worker may be blocked by browser CSP)`));
          };
          if (initOptions) {
            const payload = { ...initOptions };
            const transfer = payload.wasmBinary instanceof ArrayBuffer ? [payload.wasmBinary] : [];
            worker.postMessage({ type: 'init', payload }, transfer);
          } else {
            const payload = { file, directory: transferDirectory(directory), sourceName, outputName, provider, sourceVersion };
            worker.postMessage(payload);
          }
        });
        if (generation !== this.generation) throw new DOMException('Build cancelled', 'AbortError');
        const handle = await directory.getFileHandle(outputName);
        if (generation !== this.generation) throw new DOMException('Build cancelled', 'AbortError');
        const previous = this.completed;
        if (previous) await previous.directory.removeEntry(previous.name);
        this.completed = { directory, handle, name: outputName, provider, result };
        return result;
      } finally {
        worker.terminate();
        if (this.current === task) this.current = undefined;
        await directory.removeEntry(sourceName).catch(error => { if (error.name !== 'NotFoundError') throw error; });
        if (this.completed?.name !== outputName)
          await directory.removeEntry(outputName).catch(error => { if (error.name !== 'NotFoundError') throw error; });
      }
    } finally { this.busy = false; }
  }
  async file() {
    if (!this.completed) throw new Error('没有已完成的目录');
    return this.completed.handle.getFile();
  }
  async persist() {
    if (!this.completed) throw new Error('没有已完成的目录');
    const saved = this.completed;
    this.completed = undefined; // Already validated/loaded: retain even if saving its index fails.
    const index = await saved.directory.getFileHandle(`active-${saved.provider}.json`, { create: true });
    let previous;
    try { previous = JSON.parse(await (await index.getFile()).text()); } catch { /* first commit */ }
    const writable = await index.createWritable();
    try { await writable.write(JSON.stringify({ name: saved.name, ...saved.result })); await writable.close(); }
    catch (error) { await writable.abort().catch(() => {}); this.completed = undefined; throw error; }
    this.completed = undefined; // Persisted outputs are not temporary builder-owned files.
    if (previous?.name !== saved.name && /^output-[\w-]+\.sqlite$/.test(previous?.name ?? ''))
      await saved.directory.removeEntry(previous.name).catch(() => {});
  }
  get ready() { return Boolean(this.completed); }
  async exportTo(writable, chunkSize = 1024 * 1024) {
    try {
      if (!Number.isInteger(chunkSize) || chunkSize < 4096 || chunkSize > 8 * 1024 * 1024)
        throw new Error('Invalid export chunk size');
      const generation = this.generation;
      const file = await this.file();
      for (let offset = 0; offset < file.size; offset += chunkSize) {
        if (generation !== this.generation) throw new DOMException('Export cancelled', 'AbortError');
        await writable.write(await file.slice(offset, offset + chunkSize).arrayBuffer());
      }
      if (generation !== this.generation) throw new DOMException('Export cancelled', 'AbortError');
      await writable.close();
      return file.size;
    } catch (error) {
      try { await writable.abort(error); }
      catch (abortError) { throw new AggregateError([error, abortError], 'Export and abort both failed'); }
      throw error;
    }
  }
  cancel() {
    this.generation++;
    if (this.current) {
      this.current.worker.terminate();
      this.current.reject?.(new DOMException('Build cancelled', 'AbortError'));
    }
  }
  async dispose() {
    this.cancel();
    if (this.completed) {
      await this.completed.directory.removeEntry(this.completed.name);
      this.completed = undefined;
    }
  }
}
