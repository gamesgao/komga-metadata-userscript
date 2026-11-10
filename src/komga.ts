import { cancelled, MetadataError } from './model';
import { obj, arr, idText, required } from './providers/data';
export type Value = string | number | boolean | null | Value[] | { [key: string]: Value };
export type Metadata = Record<string, Value | undefined>;
export interface Series { id: string; oneshot: boolean; metadata: Metadata }
export interface Book { id: string; seriesId: string; metadata: Metadata }
export interface State { series: Series; books: Book[] }
export interface Target { kind: 'series' | 'books'; id: string }
export interface Thumbnail { id: string; selected: boolean; type: string }
export function validId(id: string): string {
  if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new MetadataError('invalid-id', '无效 Komga ID');
  return id;
}
function metadata(value: unknown): Metadata {
  const x = obj(value);
  required(x.title);
  return x as Metadata;
}
function series(value: unknown, id: string): Series {
  const x = obj(value);
  if (idText(x.id) !== id || typeof x.oneshot !== 'boolean') throw new MetadataError('invalid-response', 'Komga 系列响应不符');
  return { id, oneshot: x.oneshot, metadata: metadata(x.metadata) };
}
function book(value: unknown): Book {
  const x = obj(value);
  return { id: validId(idText(x.id)), seriesId: validId(idText(x.seriesId)), metadata: metadata(x.metadata) };
}
export interface Deployment { origin: string; basePath: string }
export function currentSeries(location: Pick<Location, 'pathname' | 'hash'>, doc?: Document): string | undefined {
  const route = location.hash.startsWith('#/') ? location.hash.slice(1) : location.pathname;
  const match = route.match(/\/(?:series|oneshot)\/([a-zA-Z0-9_-]+)(?:\/|$)/);
  if (match) return match[1];
  const ids = new Set([...doc?.querySelectorAll<HTMLImageElement>('main img[src*="/api/v1/series/"], [role="main"] img[src*="/api/v1/series/"]') ?? []].map(image => image.getAttribute('src')?.match(/\/api\/v1\/series\/([a-zA-Z0-9_-]+)\/thumbnail/)?.[1]).filter(Boolean));
  return ids.size === 1 ? [...ids][0] : undefined;
}
export function detectKomga(doc: Document, location: Pick<Location, 'origin' | 'pathname'>): Deployment | undefined {
  // No storage, requests, menus or UI before these independent DOM markers agree.
  const brand = /(?:^|[\s|–-])komga(?:$|[\s|–-])/i.test(doc.title) || doc.querySelector('meta[name="application-name"]')?.getAttribute('content')?.toLowerCase() === 'komga';
  const shell = doc.querySelector('#app, #__nuxt, #root');
  const asset = [...doc.querySelectorAll<HTMLScriptElement>('script[src]')].find(s => {
    const u = new URL(s.getAttribute('src')!, location.origin + location.pathname);
    return u.origin === location.origin && /\/(?:assets|_nuxt|js)\/[^/]+\.(?:m?js)(?:$)/.test(u.pathname);
  });
  const api = [...doc.querySelectorAll('[src],[href]')].map(e => e.getAttribute('src') || e.getAttribute('href') || '').map(s => {
    try { return new URL(s, location.origin + location.pathname); } catch { return undefined; }
  }).find(u => u?.origin === location.origin && /\/api\/v1\/(?:series|books)\//.test(u.pathname));
  if (!brand || !shell || (!asset && !api)) return undefined;
  let basePath = '';
  if (api) basePath = api.pathname.split('/api/v1/')[0]!;
  else if (asset) basePath = new URL(asset.getAttribute('src')!, location.origin + location.pathname).pathname.replace(/\/(?:assets|_nuxt|js)\/.*$/, '');
  const base = doc.querySelector('base[href]')?.getAttribute('href');
  if (base) {
    const u = new URL(base, location.origin + location.pathname);
    if (u.origin !== location.origin) return undefined;
    basePath = u.pathname.replace(/\/$/, '');
  }
  return { origin: location.origin, basePath };
}
export class KomgaClient {
  constructor(public deployment: Deployment, private fetcher: typeof fetch = (input, init) => globalThis.fetch(input, init)) {}
  private url(path: string): string {
    if (!path.startsWith('/') || path.includes('..')) throw new MetadataError('invalid-id', '非法 API 路径');
    return `${this.deployment.origin}${this.deployment.basePath}/api/v1${path}`;
  }
  async request(path: string, signal: AbortSignal, method = 'GET', body?: BodyInit, headers?: HeadersInit): Promise<Response> {
    cancelled(signal);
    let r: Response;
    try { r = await this.fetcher(this.url(path), { method, body, headers, signal, credentials: 'include' }); }
    catch (e) {
      if (signal.aborted) throw new MetadataError('cancelled', '已取消；已发出的写入请读回确认');
      throw new MetadataError('http', `Komga 网络失败：${e instanceof Error ? e.message : '未知错误'}`);
    }
    if (!r.ok) throw new MetadataError(r.status === 401 || r.status === 403 ? 'authentication-required' : 'http', `Komga HTTP ${r.status}（需要当前会话及编辑权限）`, r.status);
    return r;
  }
  path(t: Target): string { return `/${t.kind}/${validId(t.id)}`; }
  async state(id: string, signal: AbortSignal): Promise<State> {
    validId(id);
    const s = series(await (await this.request(`/series/${id}`, signal)).json(), id);
    const books: Book[] = [];
    for (let page = 0; page < 100; page++) {
      const data = obj(await (await this.request(`/series/${id}/books?page=${page}&size=100`, signal)).json());
      const batch = arr(data.content).map(book);
      if (batch.some(b => b.seriesId !== id) || batch.some(b => books.some(old => old.id === b.id))) throw new MetadataError('invalid-response', 'Komga 书籍归属或分页不符');
      books.push(...batch);
      if (data.last === true || batch.length < 100) return { series: s, books };
    }
    throw new MetadataError('unavailable', '系列超过分页安全上限');
  }
  async read(t: Target, signal: AbortSignal): Promise<Metadata> {
    const data = await (await this.request(this.path(t), signal)).json();
    if (t.kind === 'series') return series(data, t.id).metadata;
    const b = book(data);
    if (b.id !== t.id) throw new MetadataError('invalid-response', 'Komga 书籍 ID 不符');
    return b.metadata;
  }
  async patch(t: Target, patch: Metadata, signal: AbortSignal): Promise<void> {
    await this.request(`${this.path(t)}/metadata`, signal, 'PATCH', JSON.stringify(patch), { 'Content-Type': 'application/json' });
  }
  async thumbnails(t: Target, signal: AbortSignal): Promise<Thumbnail[]> {
    return arr(await (await this.request(`${this.path(t)}/thumbnails`, signal)).json()).map(v => {
      const x = obj(v);
      if (typeof x.selected !== 'boolean') throw new MetadataError('invalid-response', '封面列表不符');
      return { id: validId(idText(x.id)), selected: x.selected, type: required(x.type) };
    });
  }
  async thumbnail(t: Target, id: string, signal: AbortSignal): Promise<Blob> {
    return (await this.request(`${this.path(t)}/thumbnails/${validId(id)}`, signal)).blob();
  }
  async displayedThumbnail(t: Target, signal: AbortSignal): Promise<Blob | undefined> {
    try { return await (await this.request(`${this.path(t)}/thumbnail?_verify=${Date.now()}`, signal)).blob(); }
    catch (error) { if (error instanceof MetadataError && error.status === 404) return undefined; throw error; }
  }
  async upload(t: Target, blob: Blob, signal: AbortSignal): Promise<string> {
    const form = new FormData();
    const ext = blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : blob.type === 'image/gif' ? 'gif' : 'jpg';
    form.append('file', blob, `metadata-cover.${ext}`);
    const x = obj(await (await this.request(`${this.path(t)}/thumbnails?selected=false`, signal, 'POST', form)).json());
    return validId(idText(x.id));
  }
  async select(t: Target, id: string, signal: AbortSignal): Promise<void> { await this.request(`${this.path(t)}/thumbnails/${validId(id)}/selected`, signal, 'PUT'); }
  async remove(t: Target, id: string, signal: AbortSignal): Promise<void> { await this.request(`${this.path(t)}/thumbnails/${validId(id)}`, signal, 'DELETE'); }
}
