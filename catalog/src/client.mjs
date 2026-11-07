export class CatalogClient {
  constructor(workerUrl, options = {}) {
    if (!workerUrl && !options.workerFactory) throw new Error('Catalog worker URL or factory is required');
    this.workerUrl = workerUrl;
    this.workerFactory = options.workerFactory;
    this.initOptions = options.initOptions;
    this.pending = new Map();
    this.nextId = 0;
    this.file = undefined;
    this.worker = undefined;
    this.starting = undefined;
    this.cancelStarting = undefined;
    this.isOpen = false;
    this.reopening = undefined;
    this.generation = 0;
  }
  async start() {
    if (this.worker) return;
    if (this.starting) return this.starting;
    this.starting = (async () => {
      const created = this.workerFactory
        ? await this.workerFactory()
        : new Worker(this.workerUrl, { type: 'module' });
      const worker = created?.worker ?? created;
      const initOptions = created?.initOptions ?? this.initOptions;
      if (!worker || typeof worker.postMessage !== 'function') throw new Error('Catalog worker factory returned no Worker');
      this.worker = worker;
      let resolveReady;
      let rejectReady;
      const cancelStarting = () => rejectReady?.(new DOMException('Catalog operation cancelled', 'AbortError'));
      const ready = initOptions ? new Promise((resolve, reject) => {
        resolveReady = resolve; rejectReady = reject;
      }) : Promise.resolve();
      this.cancelStarting = cancelStarting;
      worker.onmessage = ({ data }) => {
        if (data.type === 'ready') { this.cancelStarting = undefined; resolveReady?.(); return; }
        if (data.type === 'init-error') { rejectReady?.(new Error(data.error)); return; }
        const pending = this.pending.get(data.id);
        if (!pending) return;
        this.pending.delete(data.id);
        if (data.error) pending.reject(new Error(data.error));
        else pending.resolve(data.result);
      };
      worker.onerror = event => {
        event.preventDefault();
        const error = new Error(`Catalog worker failed: ${event.message || 'startup error'} (Blob Worker may be blocked by browser CSP)`);
        rejectReady?.(error);
        this.failAll(error);
        worker.terminate();
        if (this.worker === worker) { this.worker = undefined; this.isOpen = false; }
      };
      if (initOptions) {
        const payload = { ...initOptions };
        const transfer = payload.wasmBinary instanceof ArrayBuffer ? [payload.wasmBinary] : [];
        worker.postMessage({ type: 'init', payload }, transfer);
      }
      await ready;
    })();
    try { await this.starting; }
    catch (error) {
      this.worker?.terminate();
      this.worker = undefined;
      throw error;
    } finally { this.starting = undefined; this.cancelStarting = undefined; }
  }
  failAll(error) {
    for (const pending of this.pending.values()) pending.reject(error);
    this.pending.clear();
  }
  async request(method, ...args) {
    await this.start();
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ id, method, args });
    });
  }
  async open(file, verification) {
    if (!(file instanceof File)) throw new Error('Select a catalog file');
    const result = await this.request('open', file, verification);
    this.verification = verification;
    this.file = file;
    this.isOpen = true;
    return result;
  }
  async ensureOpen() {
    if (this.isOpen) return;
    if (!this.file) throw new Error('No catalog is open');
    if (!this.reopening) {
      const promise = this.request('open', this.file, this.verification).then(() => { this.isOpen = true; });
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
  get hasFile() { return this.file instanceof File; }
  get selectedFile() { return this.file; }
  async close() {
    if (this.worker) await this.request('close');
    this.file = undefined;
    this.isOpen = false;
  }
  cancel() {
    this.generation++;
    this.cancelStarting?.();
    this.cancelStarting = undefined;
    if (this.worker) this.worker.terminate();
    this.worker = undefined;
    this.starting = undefined;
    this.failAll(new DOMException('Catalog operation cancelled', 'AbortError'));
    this.isOpen = false;
    this.reopening = undefined;
  }
  dispose() { this.cancel(); this.file = undefined; }
}
