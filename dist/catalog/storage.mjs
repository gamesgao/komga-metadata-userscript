// Prefer OPFS. Chromium's legacy, origin-scoped filesystem also works on plain HTTP.
// This adapter is intentionally limited to the operations used by catalog building.
export function storageBackend() {
  if (globalThis.isSecureContext && globalThis.navigator?.storage?.getDirectory) return 'opfs';
  if (typeof globalThis.webkitRequestFileSystem === 'function') return 'legacy';
  return undefined;
}
export function uniqueId() {
  if (globalThis.crypto.randomUUID) return globalThis.crypto.randomUUID();
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), x => x.toString(16).padStart(2, '0')).join('');
}
const invoke = (object, method, ...args) => new Promise((resolve, reject) => object[method](...args, resolve, reject));
const legacyFS = () => invoke(globalThis, 'webkitRequestFileSystem', 0, 0);
export async function catalogDirectory(name, create = true) {
  if (!/^komga-catalog-[a-z-]+$/.test(name)) throw new Error('Invalid catalog storage directory');
  if (storageBackend() === 'opfs') return (await navigator.storage.getDirectory()).getDirectoryHandle(name, { create });
  if (storageBackend() === 'legacy') return new LegacyDirectory(await invoke((await legacyFS()).root, 'getDirectory', name, { create }));
  throw new Error('当前浏览器不支持本地构建存储；请使用支持的 Chromium 浏览器、HTTPS 或导入已有数据库');
}
export function transferDirectory(directory) {
  return directory instanceof LegacyDirectory ? { legacyCatalogPath: directory.entry.fullPath } : directory;
}
export async function receiveDirectory(directory) {
  if (!directory?.legacyCatalogPath) return directory;
  if (!/^\/komga-catalog-[a-z-]+$/.test(directory.legacyCatalogPath)) throw new Error('Invalid catalog storage path');
  return new LegacyDirectory(await invoke((await legacyFS()).root, 'getDirectory', directory.legacyCatalogPath, { create: false }));
}
class LegacyDirectory {
  constructor(entry) { this.entry = entry; }
  async getFileHandle(name, options = {}) {
    if (!name || name.includes('/') || name.includes('\\')) throw new Error('Invalid catalog filename');
    return new LegacyFile(await invoke(this.entry, 'getFile', name, { create: Boolean(options.create) }));
  }
  async removeEntry(name) {
    let missing;
    try { const file = await this.getFileHandle(name); await invoke(file.entry, 'remove'); }
    catch (error) { if (error.name !== 'NotFoundError') throw error; missing = error; }
    // A terminated Worker cannot abort its own legacy FileWriter. Remove only
    // temporary siblings belonging to this uniquely named build/download file.
    const reader = this.entry.createReader();
    while (true) {
      const entries = await invoke(reader, 'readEntries'); if (!entries.length) break;
      for (const entry of entries) if (entry.isFile && entry.name.startsWith(`.pending-${name}-`)) await invoke(entry, 'remove');
    }
    if (missing) throw missing;
  }
}
class LegacyFile {
  constructor(entry) { this.entry = entry; }
  getFile() { return invoke(this.entry, 'file'); }
  async createWritable() {
    // Write a sibling first: abort must never truncate the previous active index.
    const parent = await invoke(this.entry, 'getParent');
    const temporary = await invoke(parent, 'getFile', `.pending-${this.entry.name}-${uniqueId()}`, { create: true, exclusive: true });
    let writer;
    try { writer = await invoke(temporary, 'createWriter'); }
    catch (error) { await invoke(temporary, 'remove').catch(() => {}); throw error; }
    let position = 0, closed = false, rejectPending;
    const write = data => new Promise((resolve, reject) => {
      if (closed) { reject(new Error('Writer is closed')); return; }
      rejectPending = reject;
      const blob = data instanceof Blob ? data : new Blob([data]);
      writer.onerror = () => reject(writer.error);
      writer.onwriteend = () => { rejectPending = undefined; if (!writer.error) { position += blob.size; resolve(); } };
      try { writer.seek(position); writer.write(blob); } catch (error) { reject(error); }
    });
    return {
      write,
      close: async () => {
        if (closed) throw new Error('Writer is closed');
        await invoke(temporary, 'moveTo', parent, this.entry.name); closed = true;
      },
      abort: async () => {
        if (closed) return;
        closed = true;
        rejectPending?.(new DOMException('Write cancelled', 'AbortError')); rejectPending = undefined;
        if (writer.readyState === 1) {
          await new Promise(resolve => { writer.onwriteend = resolve; writer.onerror = resolve; writer.abort(); });
        }
        await invoke(temporary, 'remove').catch(error => { if (error.name !== 'NotFoundError') throw error; });
      }
    };
  }
  async createSyncAccessHandle() {
    if (typeof globalThis.webkitRequestFileSystemSync !== 'function') throw new Error('HTTP 本地构建需要 Chromium Worker 文件系统支持');
    const fs = globalThis.webkitRequestFileSystemSync(0, 0);
    const entry = fs.root.getFile(this.entry.fullPath, { create: false });
    const writer = entry.createWriter(), reader = new FileReaderSync();
    let snapshot;
    return {
      read(buffer, { at = 0 } = {}) {
        snapshot ??= entry.file();
        const bytes = new Uint8Array(reader.readAsArrayBuffer(snapshot.slice(at, at + buffer.byteLength)));
        new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).set(bytes); return bytes.byteLength;
      },
      write(buffer, { at = 0 } = {}) {
        snapshot = undefined;
        // Legacy seek clamps to EOF; SQLite requires sparse writes at the exact offset.
        if (buffer.byteLength && at > writer.length) writer.truncate(at);
        writer.seek(at); writer.write(new Blob([buffer])); return buffer.byteLength;
      },
      truncate(size) { snapshot = undefined; writer.truncate(size); },
      getSize() { return writer.length; },
      // Legacy FileWriterSync completes writes synchronously but exposes no fsync.
      // Only fully built, integrity-checked immutable snapshots are published.
      flush() {},
      close() { snapshot = undefined; }
    };
  }
}
