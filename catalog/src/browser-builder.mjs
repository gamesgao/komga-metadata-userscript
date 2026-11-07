export function browserBuildCapability() {
  if (!globalThis.isSecureContext) return { available: false, reason: '浏览器构建需要安全上下文；请使用原生 CLI' };
  if (!navigator.storage?.getDirectory) return { available: false, reason: '浏览器不支持 OPFS；请使用原生 CLI' };
  if (typeof Worker !== 'function') return { available: false, reason: '浏览器不支持 Worker；请使用原生 CLI' };
  return { available: true, reason: '支持四种本地来源档案；浏览器资源不足时请使用原生 CLI' };
}
export class BrowserCatalogBuilder {
  constructor(workerUrl) {
    if (!workerUrl) throw new Error('Build worker URL is required');
    this.workerUrl = workerUrl;
    this.current = undefined;
    this.completed = undefined;
    this.generation = 0;
    this.busy = false;
  }
  async build(file, provider, sourceVersion) {
    if (this.busy) throw new Error('已有构建任务');
    const capability = browserBuildCapability();
    if (!capability.available) throw new Error(capability.reason);
    if (!(file instanceof File)) throw new Error('请选择本地来源文件');
    const generation = this.generation;
    this.busy = true;
    try {
      const root = await navigator.storage.getDirectory();
      const directory = await root.getDirectoryHandle('komga-catalog-build', { create: true });
      if (generation !== this.generation) throw new DOMException('Build cancelled', 'AbortError');
      const nonce = crypto.randomUUID();
      const outputName = `output-${nonce}.sqlite`, sourceName = `source-${nonce}.sqlite`;
      const worker = new Worker(this.workerUrl, { type: 'module' });
      const task = { worker, directory, sourceName, outputName, reject: undefined };
      this.current = task;
      try {
        const result = await new Promise((resolve, reject) => {
          task.reject = reject;
          worker.onmessage = ({ data }) => data.error ? reject(new Error(data.error)) : resolve(data.result);
          worker.onerror = event => { event.preventDefault(); reject(new Error(`Build worker failed: ${event.message}`)); };
          worker.postMessage({ file, directory, sourceName, outputName, provider, sourceVersion });
        });
        if (generation !== this.generation) throw new DOMException('Build cancelled', 'AbortError');
        const handle = await directory.getFileHandle(outputName);
        if (generation !== this.generation) throw new DOMException('Build cancelled', 'AbortError');
        const previous = this.completed;
        if (previous) await previous.directory.removeEntry(previous.name);
        this.completed = { directory, handle, name: outputName };
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
