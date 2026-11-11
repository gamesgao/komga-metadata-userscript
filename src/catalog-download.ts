import { catalogDirectory, uniqueId, type CatalogWritable } from '../catalog/src/storage.mjs';
// Streaming GM response -> origin-local storage; never buffer a complete archive.
interface StreamResponse { status: number; response?: ReadableStream<Uint8Array>; responseHeaders?: string }
declare function GM_xmlhttpRequest(options: { url: string; method: 'GET'; responseType: 'stream'; anonymous: true; fetch: true; onloadstart(r: StreamResponse): void; onload(r: StreamResponse): void; onerror(): void; onabort(): void }): { abort(): void };
export async function downloadArchive(url: string, name: string, signal: AbortSignal, progress: (bytes: number, total?: number) => void) {
  const directory = await catalogDirectory('komga-catalog-download');
  const filename = `${uniqueId()}-${name}`;
  const handle = await directory.getFileHandle(filename, { create: true });
  let writable: CatalogWritable | undefined;
  let request: { abort(): void } | undefined, reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  const cleanup = async () => { await directory.removeEntry(filename).catch(error => { if (error.name !== 'NotFoundError') throw error; }); };
  try {
    writable = await handle.createWritable();
    let lastProgress = 0;
    await new Promise<void>((resolve, reject) => {
      let started = false, settled = false;
      let downloaded = 0, streamDone = false, finalResponse: StreamResponse | undefined;
      const finish = (error?: unknown) => { if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener('abort', abort); error ? reject(error) : resolve(); };
      const abort = () => { finish(new DOMException('已取消下载', 'AbortError')); request?.abort(); void reader?.cancel().catch(() => {}); };
      const timer = setTimeout(() => { finish(new Error('下载连接超时')); request?.abort(); }, 60000);
      if (signal.aborted) { abort(); return; }
      signal.addEventListener('abort', abort, { once: true });
      const complete = () => {
        if (!streamDone || !finalResponse) return;
        if (finalResponse.status < 200 || finalResponse.status >= 300) { finish(new Error(`下载 HTTP ${finalResponse.status}`)); return; }
        const total = Number(finalResponse.responseHeaders?.match(/^content-length:\s*(\d+)/im)?.[1]) || undefined;
        if (total && downloaded !== total) { finish(new Error('下载文件长度不符')); return; }
        progress(downloaded, total); finish();
      };
      const consume = async (response: StreamResponse) => {
        if (started || settled) return; started = true; clearTimeout(timer);
        try {
          // Tampermonkey may expose status=0 at onloadstart, before headers arrive.
          if (response.status && (response.status < 200 || response.status >= 300)) throw new Error(`下载 HTTP ${response.status}`);
          if (!response.response || typeof response.response.getReader !== 'function') throw new Error('当前脚本管理器不支持流式下载；可先下载原始数据，再选择文件构建');
          const length = Number(response.responseHeaders?.match(/^content-length:\s*(\d+)/im)?.[1]);
          const total = length > 0 ? length : undefined;
          reader = response.response.getReader(); let received = 0;
          while (true) {
            if (signal.aborted) throw new DOMException('已取消下载', 'AbortError');
            const { done, value } = await reader.read(); if (done) break;
            // Some managers send unusually large chunks. Keep each filesystem write bounded.
            for (let offset = 0; offset < value.byteLength; offset += 1024 * 1024)
              await writable!.write(value.slice(offset, offset + 1024 * 1024) as Uint8Array<ArrayBuffer>);
            received += value.byteLength;
            if (Date.now() - lastProgress > 150) { progress(received, total); lastProgress = Date.now(); }
          }
          if (signal.aborted) throw new DOMException('已取消下载', 'AbortError');
          if (!received) throw new Error('下载内容为空');
          downloaded = received; streamDone = true; complete();
        } catch (error) { finish(error); request?.abort(); }
      };
      try {
        request = GM_xmlhttpRequest({url,method:'GET',responseType:'stream',anonymous:true,fetch:true,
          onloadstart: r => { void consume(r); },
          onload: r => { finalResponse = r; if (!started) void consume(r); complete(); },
          onerror: () => finish(new Error('下载请求失败')),
          onabort: () => finish(new DOMException('已取消下载','AbortError'))});
      } catch (error) { finish(error); }
    });
    await writable.close(); writable = undefined;
    return { file: await handle.getFile(), cleanup };
  } catch (error) {
    request?.abort(); await reader?.cancel().catch(() => {}); await writable?.abort().catch(() => {}); await cleanup(); throw error;
  }
}
