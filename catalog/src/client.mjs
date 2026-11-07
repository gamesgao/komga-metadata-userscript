export class CatalogClient {
  constructor(workerUrl) {
    if (!workerUrl) throw new Error('Catalog worker URL is required');
    this.workerUrl = workerUrl;
    this.pending = new Map();
    this.nextId = 0;
    this.file = undefined;
    this.worker = undefined;
    this.isOpen = false;
    this.reopening = undefined;
    this.generation = 0;
  }
  start() {
    if (this.worker) return;
    const worker = new Worker(this.workerUrl, { type: 'module' });
    this.worker = worker;
    worker.onmessage = ({ data }) => {
      const pending = this.pending.get(data.id);
      if (!pending) return;
      this.pending.delete(data.id);
      if (data.error) pending.reject(new Error(data.error));
      else pending.resolve(data.result);
    };
    worker.onerror = event => {
      event.preventDefault();
      this.failAll(new Error(`Catalog worker failed: ${event.message}`));
      worker.terminate();
      if (this.worker === worker) { this.worker = undefined; this.isOpen = false; }
    };
  }
  failAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
  request(method, ...args) {
    this.start();
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, method, args });
    });
  }
  async open(file) {
    if (!(file instanceof File)) throw new Error('Select a catalog file');
    const result = await this.request('open', file);
    this.file = file;
    this.isOpen = true;
    return result;
  }
  async ensureOpen() {
    if (this.isOpen) return;
    if (!this.file) throw new Error('No catalog is open');
    if (!this.reopening) {
      const promise = this.request('open', this.file).then(() => { this.isOpen = true; });
      this.reopening = promise;
      promise.finally(() => { if (this.reopening === promise) this.reopening = undefined; }).catch(() => {});
    }
    await this.reopening;
  }
  async operation(method, ...args) {
    const generation = this.generation;
    await this.ensureOpen();
    if (generation !== this.generation) throw new DOMException('Catalog operation cancelled', 'AbortError');
    return this.request(method, ...args);
  }
  search(query, provider, limit) { return this.operation('search', query, provider, limit); }
  get(provider, id) { return this.operation('get', provider, id); }
  manifest() { return this.operation('manifest'); }
  stats() { return this.operation('stats'); }
  async close() {
    if (this.worker) await this.request('close');
    this.file = undefined;
    this.isOpen = false;
  }
  cancel() {
    this.generation++;
    if (this.worker) this.worker.terminate();
    this.worker = undefined;
    this.failAll(new DOMException('Catalog operation cancelled', 'AbortError'));
    this.isOpen = false;
    this.reopening = undefined;
  }
  dispose() { this.cancel(); this.file = undefined; }
}
