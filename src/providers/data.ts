import { MetadataError, type Candidate, type MetadataRecord, type ProviderId } from '../model';
import { type Transport, safeUrl } from '../transport';
export type Obj = Record<string, unknown>;
export function obj(value: unknown): Obj {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new MetadataError('invalid-response', '来源响应结构不符');
  return value as Obj;
}
export function arr(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new MetadataError('invalid-response', '来源列表结构不符');
  return value;
}
export function list(value: unknown): unknown[] { return value == null ? [] : arr(value); }
export function str(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function required(value: unknown): string {
  const text = str(value);
  if (!text.trim()) throw new MetadataError('invalid-response', '来源缺少名称');
  return text;
}
export function idText(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') throw new MetadataError('invalid-response', '来源缺少 ID');
  return String(value);
}
export function numeric(id: string): string {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new MetadataError('invalid-id', '需要有效数字 ID');
  return id;
}
export function date(value: unknown): string | undefined {
  const s = str(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : undefined;
}
export function volume(text: string): number | undefined {
  const m = text.match(/(?:\bvol(?:ume)?\.?\s*|\(|（)(\d+(?:\.\d+)?)(?:\)|）|\b)/i);
  return m ? Number(m[1]) : undefined;
}
export function record(provider: ProviderId, id: string, url: string, raw: unknown): MetadataRecord {
  return { provider, id, url, raw, titles: [], tags: [], genres: [], authors: [], covers: [], links: [{ label: provider, url }] };
}
export function candidate(provider: ProviderId, id: string, title: string, url: string, image?: unknown): Candidate {
  const result: Candidate = { provider, id, title: required(title), url };
  // A bad thumbnail must not discard an otherwise usable search result.
  if (typeof image === 'string' && image) { try { result.cover = safeUrl(image); } catch { /* detail fallback */ } }
  return result;
}
export async function json(t: Transport, url: string, signal: AbortSignal, body?: unknown, headers?: Record<string, string>): Promise<Obj> {
  const r = await t.request({ url, method: body === undefined ? 'GET' : 'POST', headers: { Accept: 'application/json', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) }, signal);
  if (/^\s*</.test(r.text) && /Browser verification|cf-chl|challenge-assets/i.test(r.text)) throw new MetadataError('unavailable', '来源要求浏览器验证，当前匿名请求无法读取');
  try { return obj(JSON.parse(r.text)); }
  catch (e) { if (e instanceof MetadataError) throw e; throw new MetadataError('invalid-response', '来源返回非 JSON（可能受限）'); }
}
export function checkId(actual: unknown, expected: string): void {
  if (idText(actual) !== expected) throw new MetadataError('invalid-id', '来源返回了不同 ID，请重新选择');
}
export function status(value: unknown): MetadataRecord['status'] {
  const s = str(value).toLowerCase();
  if (['finished', 'completed', 'complete', 'ended'].includes(s)) return 'ENDED';
  if (['releasing', 'ongoing', 'publishing'].includes(s)) return 'ONGOING';
  if (['hiatus', 'on_hiatus'].includes(s)) return 'HIATUS';
  if (['cancelled', 'discontinued'].includes(s)) return 'ABANDONED';
  return undefined;
}
