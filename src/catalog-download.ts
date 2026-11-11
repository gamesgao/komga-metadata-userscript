import { catalogDirectory, uniqueId, type CatalogWritable } from '../catalog/src/storage.mjs';
// Streaming GM response -> origin-local storage; never buffer a complete archive.
interface StreamResponse { status: number; response?: ReadableStream<Uint8Array>; responseHeaders?: string }
function responseLength(response: StreamResponse): number | undefined {
  if (/content-encoding:\s*(?!identity\b)\S+/i.test(response.responseHeaders ?? '')) return undefined;
  const length = Number(response.responseHeaders?.match(/^content-length:\s*(\d+)/im)?.[1]);
  return length > 0 ? length : undefined;
}
declare function GM_xmlhttpRequest(options: { url: string; method: 'GET' | 'HEAD'; responseType: 'stream' | 'text'; anonymous: true; fetch?: true; timeout?: number; onreadystatechange?(r: StreamResponse): void; onloadstart?(r: StreamResponse): void; onload(r: StreamResponse): void; onerror?(): void; onabort?(): void; ontimeout?(): void }): { abort(): void };
export async function downloadArchive(url: string, name: string, signal: AbortSignal, progress: (bytes: number, total?: number) => void) {
  const directory = await catalogDirectory('komga-catalog-download');
  const filename = `${uniqueId()}-${name}`;
  const handle = await directory.getFileHandle(filename, { create: true });
  let writable: CatalogWritable | undefined;
  let knownTotal: number | undefined;
  const headers = (response: StreamResponse) => {
    if (signal.aborted) return;
    if (response.status && (response.status < 200 || response.status >= 300)) return;
    const length = responseLength(response);
    if (length) knownTotal = length;
  };
  let request: { abort(): void } | undefined, headRequest: { abort(): void } | undefined, reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cleanup = async () => { await directory.removeEntry(filename).catch(error => { if (error.name !== 'NotFoundError') throw error; }); };
  try {
    writable = await handle.createWritable();
    // GM fetch-stream callbacks can expose headers only at completion. A bounded,
    // concurrent HEAD probe supplies a real total without buffering or delaying GET.
    try { headRequest = GM_xmlhttpRequest({url,method:'HEAD',responseType:'text',anonymous:true,timeout:10000,onload:headers,onerror:()=>{},ontimeout:()=>{}}); } catch { /* Total stays unknown. */ }
    let lastProgress = 0;
    await new Promise<void>((resolve, reject) => {
      let started = false, settled = false;
      let downloaded = 0, streamDone = false, finalResponse: StreamResponse | undefined;
      const finish = (error?: unknown) => { if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort); error ? reject(error) : resolve(); };
      const abort = () => { finish(new DOMException('已取消下载', 'AbortError')); request?.abort(); headRequest?.abort(); void reader?.cancel().catch(() => {}); };
      const timer = setTimeout(() => { finish(new Error('下载连接超时')); request?.abort(); }, 60000);
      if (signal.aborted) { abort(); return; }
      signal.addEventListener('abort', abort, { once: true });
      const complete = () => {
        if (!streamDone || !finalResponse) return;
        if (finalResponse.status < 200 || finalResponse.status >= 300) { finish(new Error(`下载 HTTP ${finalResponse.status}`)); return; }
        const total = responseLength(finalResponse);
        if (total && downloaded !== total) { finish(new Error('下载文件长度不符')); return; }
        progress(downloaded, total ?? downloaded); finish();
      };
      const consume = async (response: StreamResponse) => {
        if (started || settled) return; started = true; clearTimeout(timer);
        try {
          // Tampermonkey may expose status=0 at onloadstart, before headers arrive.
          if (response.status && (response.status < 200 || response.status >= 300)) throw new Error(`下载 HTTP ${response.status}`);
          if (!response.response || typeof response.response.getReader !== 'function') throw new Error('当前脚本管理器不支持流式下载；可先下载原始数据，再选择文件构建');
          headers(response);
          reader = response.response.getReader(); let received = 0;
          while (true) {
            if (signal.aborted) throw new DOMException('已取消下载', 'AbortError');
            const { done, value } = await reader.read(); if (done) break;
            // Some managers send unusually large chunks. Keep each filesystem write bounded.
            for (let offset = 0; offset < value.byteLength; offset += 1024 * 1024)
              await writable!.write(value.slice(offset, offset + 1024 * 1024) as Uint8Array<ArrayBuffer>);
            received += value.byteLength;
            if (knownTotal && received > knownTotal) knownTotal = undefined;
            if (Date.now() - lastProgress > 150) { progress(received, knownTotal); lastProgress = Date.now(); }
          }
          if (signal.aborted) throw new DOMException('已取消下载', 'AbortError');
          if (!received) throw new Error('下载内容为空');
          downloaded = received; streamDone = true; complete();
        } catch (error) { finish(error); request?.abort(); }
      };
      try {
        request = GM_xmlhttpRequest({url,method:'GET',responseType:'stream',anonymous:true,fetch:true,
          onreadystatechange: headers,
          onloadstart: r => { void consume(r); },
          onload: r => { finalResponse = r; if (!started) void consume(r); complete(); },
          onerror: () => finish(new Error('下载请求失败')),
          onabort: () => finish(new DOMException('已取消下载','AbortError'))});
      } catch (error) { finish(error); }
    });
    await writable.close(); writable = undefined;
    return { file: await handle.getFile(), storageName: filename, cleanup };
  } catch (error) {
    request?.abort(); await reader?.cancel().catch(() => {}); await writable?.abort().catch(() => {}); await cleanup(); throw error;
  } finally { headRequest?.abort(); }
}
