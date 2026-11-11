import { CatalogClient } from './client.mjs';
// One independent paged reader per provider; replacement validates before retiring it.
export class CatalogCollection {
  constructor(workerUrl, options = {}) { this.generation = 0; this.workerUrl = workerUrl; this.options = options; this.clients = new Map(); this.current = undefined; this.probe = undefined; this.restoring = undefined; }
  get file() { return this.current?.selectedFile; }
  get selectedFile() { return this.file; }
  get hasFile() { return this.clients.size > 0; }
  hasProvider(id) { return this.clients.has(id); }
  fileFor(id) { return this.clients.get(id)?.selectedFile; }
  async open(file, verification) {
    if (this.probe) throw new Error('另一个数据库正在加载');
    const generation = this.generation;
    const next = new CatalogClient(this.workerUrl, this.options); this.probe = next;
    try {
      const manifest = await next.open(file, verification);
      if (generation !== this.generation) throw new DOMException('已取消加载','AbortError');
      if (!['bangumi','ehentai','mangabaka','bookwalker'].includes(manifest.provider)) throw new Error('不支持的目录来源');
      const previous = this.clients.get(manifest.provider);
      this.clients.set(manifest.provider, next); this.current = next; previous?.dispose();
      return manifest;
    } catch (error) { next.dispose(); throw error; }
    finally { if (this.probe === next) this.probe = undefined; }
  }
  async search(query, provider, limit) { await this.restoring; return this.clients.get(provider)?.search(query, provider, limit) ?? []; }
  async get(provider, id) { await this.restoring; const client = this.clients.get(provider); if (!client) throw new Error('此来源尚未加载本地数据库'); return client.get(provider, id); }
  manifest() { if (!this.current) throw new Error('尚未加载数据库'); return this.current.manifest(); }
  stats() { if (!this.current) throw new Error('尚未加载数据库'); return this.current.stats(); }
  cancel() { this.generation++; this.probe?.cancel(); for (const client of this.clients.values()) client.cancel(); }
  async close() { this.dispose(); }
  dispose() { this.generation++; this.probe?.dispose(); for (const client of this.clients.values()) client.dispose(); this.clients.clear(); this.current = undefined; }
}
