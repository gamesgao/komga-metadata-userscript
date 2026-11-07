import { cancelled, MetadataError } from './model';
export interface Request { url: string; method?: 'GET' | 'POST'; headers?: Record<string, string>; body?: string; responseType?: 'text' | 'blob'; cookie?: string }
export interface Response { status: number; headers: Record<string, string>; text: string; blob?: Blob; finalUrl: string }
export interface Transport { request(request: Request, signal: AbortSignal): Promise<Response> }
interface GMResponse { status: number; responseHeaders: string; responseText?: string; response: unknown; finalUrl: string }
interface GMOptions {
  url: string; method: string; headers?: Record<string, string>; data?: string; responseType: 'text' | 'blob';
  timeout: number; anonymous: boolean; cookie?: string;
  onload(response: GMResponse): void; onerror(): void; ontimeout(): void; onabort(): void;
}
declare function GM_xmlhttpRequest(options: GMOptions): { abort(): void };
declare function GM_getValue<T>(key: string, fallback: T): T;
declare function GM_setValue<T>(key: string, value: T): void;
export const storage = {
  get<T>(key: string, fallback: T): T { return GM_getValue(key, fallback); },
  set<T>(key: string, value: T): void { GM_setValue(key, value); }
};
export function safeUrl(input: string): string {
  let url: URL;
  try { url = new URL(input); } catch { throw new MetadataError('invalid-id', '链接格式无效'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new MetadataError('invalid-id', '仅支持无内嵌凭据的 HTTP(S) 链接');
  return url.href;
}
export class GMTransport implements Transport {
  request(input: Request, signal: AbortSignal): Promise<Response> {
    cancelled(signal);
    const url = safeUrl(input.url);
    return new Promise((resolve, reject) => {
      let handle: { abort(): void } | undefined;
      const finish = (fn: () => void) => { signal.removeEventListener('abort', abort); fn(); };
      const abort = () => { handle?.abort(); finish(() => reject(new MetadataError('cancelled', '已取消'))); };
      handle = GM_xmlhttpRequest({
        url, method: input.method ?? 'GET', headers: input.headers, data: input.body,
        responseType: input.responseType ?? 'text', timeout: 30000,
        anonymous: true, cookie: input.cookie,
        onload: r => finish(() => {
          const headers: Record<string, string> = {};
          for (const line of r.responseHeaders.split(/\r?\n/)) {
            const i = line.indexOf(':');
            if (i > 0) headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
          }
          resolve({ status: r.status, headers, text: r.responseText ?? '', blob: r.response instanceof Blob ? r.response : undefined, finalUrl: r.finalUrl || url });
        }),
        onerror: () => finish(() => reject(new MetadataError('http', '跨域请求失败（网络或管理器权限）'))),
        ontimeout: () => finish(() => reject(new MetadataError('http', '来源请求超时'))),
        onabort: () => finish(() => reject(new MetadataError('cancelled', '已取消')))
      });
      signal.addEventListener('abort', abort, { once: true });
      if (signal.aborted) abort();
    });
  }
}
export function delay(ms: number, signal: AbortSignal): Promise<void> {
  cancelled(signal);
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new MetadataError('cancelled', '已取消')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    signal.addEventListener('abort', abort, { once: true });
  });
}
export class SourceTransport implements Transport {
  private tail: Promise<void> = Promise.resolve();
  private queued = 0;
  private next = 0;
  constructor(private inner: Transport, private interval = 500, private maxQueue = 50, private retries = 2) {}
  request(input: Request, signal: AbortSignal): Promise<Response> {
    if (this.queued >= this.maxQueue) return Promise.reject(new MetadataError('unavailable', '来源队列已满'));
    this.queued++;
    const job = this.tail.then(async () => {
      for (let attempt = 0; ; attempt++) {
        cancelled(signal);
        await delay(Math.max(0, this.next - Date.now()), signal);
        this.next = Date.now() + this.interval;
        const response = await this.inner.request(input, signal);
        if (![429, 503].includes(response.status) || attempt >= this.retries) {
          if (response.status < 200 || response.status >= 300) throw new MetadataError(response.status === 401 || response.status === 403 ? 'authentication-required' : 'http', `来源 HTTP ${response.status}`, response.status);
          return response;
        }
        const retry = response.headers['retry-after'];
        const wait = retry ? (/^\d+$/.test(retry) ? Number(retry) * 1000 : Date.parse(retry) - Date.now()) : 1000 * 2 ** attempt;
        if (!Number.isFinite(wait) || wait > 60000) throw new MetadataError('http', '来源要求等待过久，请稍后重试', response.status);
        this.next = Math.max(this.next, Date.now() + Math.max(0, wait));
        await delay(Math.max(0, wait), signal);
      }
    });
    this.tail = job.then(() => { this.queued--; }, () => { this.queued--; });
    return new Promise((resolve, reject) => {
      const abort = () => { signal.removeEventListener('abort', abort); reject(new MetadataError('cancelled', '已取消排队请求')); };
      signal.addEventListener('abort', abort, { once: true });
      job.then(r => { signal.removeEventListener('abort', abort); resolve(r); }, e => { signal.removeEventListener('abort', abort); reject(e); });
      if (signal.aborted) abort();
    });
  }
}
