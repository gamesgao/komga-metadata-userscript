import { CatalogCollection } from '../catalog/src/collection.mjs';
import { downloadArchive } from './catalog-download';
import { BrowserCatalogBuilder } from '../catalog/src/browser-builder.mjs';
import { catalogProvider, mountCatalogPanel } from '../catalog/src/panel.mjs';
import type { CatalogExtension } from './model';
import { workerAssetBase } from './model';

interface GMResponse { status: number; response?: ArrayBuffer | string; responseText?: string }
interface GMFailure { error?: string; details?: string; status?: number }
interface GMRequest {
  url: string; method: 'GET'; responseType?: 'arraybuffer' | 'text'; timeout?: number;
  onload(response: GMResponse): void; onerror(error?: GMFailure): void; ontimeout(): void;
}
interface GMDownloadRequest {
  url: string; name: string; onload(): void;
  onerror(error?: GMFailure): void; ontimeout(): void;
}
declare function GM_xmlhttpRequest(request: GMRequest): { abort(): void };
declare function GM_download(request: GMDownloadRequest): { abort(): void };

const providers = ['bangumi', 'ehentai', 'mangabaka', 'bookwalker'] as const;
const base = workerAssetBase || 'https://raw.githubusercontent.com/gamesgao/komga-metadata-userscript/main/dist/catalog/';
let wasmRequest: Promise<ArrayBuffer> | undefined;
const sourceCache = new Map<string, Promise<string>>();

function request(url: string, responseType: 'arraybuffer' | 'text', signal?: AbortSignal): Promise<ArrayBuffer | string> {
  return new Promise((resolve, reject) => {
    let handle: { abort(): void } | undefined;
    let settled = false;
    const finish = (action: () => void) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abort);
      action();
    };
    const abort = () => {
      finish(() => reject(new DOMException('Catalog asset request cancelled', 'AbortError')));
      handle?.abort();
    };
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    try { handle = GM_xmlhttpRequest({
      url, method: 'GET', responseType, timeout: 30_000,
      onload: response => {
        if (response.status < 200 || response.status >= 300) {
          finish(() => reject(new Error(`Catalog asset HTTP ${response.status}`))); return;
        }
        const result = responseType === 'arraybuffer' ? response.response : response.responseText ?? response.response;
        if (responseType === 'arraybuffer' && !(result instanceof ArrayBuffer)) {
          finish(() => reject(new Error('Catalog asset response was not binary'))); return;
        }
        if (responseType === 'text' && typeof result !== 'string') {
          finish(() => reject(new Error('Catalog worker response was not text'))); return;
        }
        finish(() => resolve(result!));
      },
      onerror: error => finish(() => reject(new Error(`Catalog asset request failed: ${error?.error ?? error?.details ?? 'network error'}`))),
      ontimeout: () => finish(() => reject(new Error('Catalog asset request timed out')))
    }); } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error(String(error))));
    }
  });
}

function wasm(signal: AbortSignal): Promise<ArrayBuffer> {
  if (!wasmRequest) {
    wasmRequest = request(new URL('sqlite/sqlite3.wasm', base).href, 'arraybuffer', signal)
      .then(result => result as ArrayBuffer)
      .catch(error => { wasmRequest = undefined; throw error; });
  }
  return wasmRequest;
}

async function worker(name: string, signal: AbortSignal): Promise<{ worker: Worker; initOptions: { wasmBinary: ArrayBuffer } }> {
  let scriptPromise = sourceCache.get(name);
  if (!scriptPromise) {
    scriptPromise = request(new URL(name, base).href, 'text', signal).then(result => result as string);
    sourceCache.set(name, scriptPromise);
    scriptPromise.catch(() => { if (sourceCache.get(name) === scriptPromise) sourceCache.delete(name); });
  }
  const [script, binary] = await Promise.all([scriptPromise, wasm(signal)]);
  const objectUrl = URL.createObjectURL(new Blob([script], { type: 'text/javascript' }));
  try {
    const instance = new Worker(objectUrl, { type: 'module' });
    URL.revokeObjectURL(objectUrl);
    return { worker: instance, initOptions: { wasmBinary: binary.slice(0) } };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw new Error(`Blob Worker blocked by browser CSP: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function download(url: string, name: string, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let handle: { abort(): void } | undefined;
    let finished = false;
    const finish = (error?: Error) => {
      if (finished) return;
      finished = true;
      signal.removeEventListener('abort', abort);
      if (error) reject(error); else resolve();
    };
    const abort = () => {
      finish(new DOMException('已取消下载', 'AbortError'));
      handle?.abort();
    };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, { once: true });
    try {
      handle = GM_download({
        url, name, onload: () => finish(),
        onerror: error => finish(new Error(`下载失败：${error?.error ?? error?.details ?? `HTTP ${error?.status ?? '网络错误'}`}`)),
        ontimeout: () => finish(new Error('下载超时'))
      });
      if (signal.aborted) abort();
    } catch (error) {
      finish(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

function fetchManifest(url: string, signal: AbortSignal): Promise<unknown> {
  return request(url, 'text', signal).then(text => {
    try { return JSON.parse(text as string); }
    catch (error) { throw new Error(`清单 JSON 错误：${error instanceof Error ? error.message : String(error)}`); }
  });
}

export function createCatalogExtension(): CatalogExtension {
  let assetController: AbortController | undefined;
  const loadWorker = (name: string) => {
    if (!assetController) throw new Error('离线资源请求已关闭');
    return worker(name, assetController.signal);
  };
  const client = new CatalogCollection(undefined, { workerFactory: () => loadWorker('catalog-worker.js') });
  const builder = new BrowserCatalogBuilder(undefined, {
    workerFactory: () => loadWorker('catalog-build-worker.js')
  });
  let mounted = false;
  return {
    providers: providers.map(provider => catalogProvider(client, provider)),
    mount(container) {
      if (mounted) throw new Error('离线目录面板已挂载');
      mounted = true;
      assetController = new AbortController();
      const unmount = mountCatalogPanel(container, client, {
        download, downloadArchive, fetchManifest, builder
      });
      return async () => {
        assetController?.abort();
        try { await unmount(); }
        finally { assetController = undefined; mounted = false; client.cancel(); }
      };
    },
    async dispose() {
      assetController?.abort();
      client.dispose();
      await builder.dispose();
      mounted = false;
    }
  };
}
