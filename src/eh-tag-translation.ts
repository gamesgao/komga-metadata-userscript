import { cancelled, MetadataError, type MetadataRecord } from './model';
import { storage, type Transport } from './transport';
export const dictionaryUrl = 'https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json';
export const dictionaryKey = 'eh-tag-dictionary-v1';
export type PrefixStyle = 'compact' | 'preserve';
type Dictionary = Record<string, Record<string, string>>;
interface Cache { format: 1; checkedAt: number; revision: string; names: Dictionary }
interface Store { get<T>(key: string, fallback: T): T; set<T>(key: string, value: T): void }
const ttl = 24 * 60 * 60 * 1000;
const compactNamespaces = new Set(['female', 'male', 'mixed', 'location', 'other', 'tag']);
const key = (s: string) => s.trim().toLowerCase();
function object(v: unknown): v is Record<string, unknown> { return Boolean(v && typeof v === 'object' && !Array.isArray(v)); }
export function parseDictionary(text: string): { names: Dictionary; revision: string } {
  if (text.length > 32 * 1024 * 1024) throw new MetadataError('invalid-response', '标签词库过大');
  let db: unknown;
  try { db = JSON.parse(text); } catch { throw new MetadataError('invalid-response', '标签词库不是有效 JSON'); }
  if (!object(db) || !Array.isArray(db.data)) throw new MetadataError('invalid-response', '标签词库结构不符');
  const names: Dictionary = Object.create(null);
  for (const group of db.data) {
    if (!object(group) || typeof group.namespace !== 'string' || !object(group.data)) throw new MetadataError('invalid-response', '标签词库分区不符');
    const ns = key(group.namespace), entries: Record<string, string> = Object.create(null);
    for (const [tag, info] of Object.entries(group.data)) {
      if (object(info) && typeof info.name === 'string' && info.name.trim()) entries[key(tag)] = info.name.trim();
    }
    if (ns && Object.keys(entries).length) names[ns] = entries;
  }
  if (!Object.keys(names).length) throw new MetadataError('invalid-response', '标签词库为空');
  const head = object(db.head) ? db.head : {};
  return { names, revision: typeof head.sha === 'string' ? head.sha : `schema-${String(db.version ?? 'unknown')}` };
}
function validCache(v: unknown): v is Cache {
  return object(v) && v.format === 1 && typeof v.checkedAt === 'number' && Number.isFinite(v.checkedAt) && typeof v.revision === 'string' && object(v.names) && Object.keys(v.names).length > 0 && Object.values(v.names).every(g => object(g) && Object.values(g).every(n => typeof n === 'string' && n.trim()));
}
export class EhTagTranslation {
  private cache?: Cache;
  constructor(private transport: Transport, private store: Store = storage, private now = Date.now) {}
  async load(signal: AbortSignal): Promise<{ warning?: string; revision: string }> {
    cancelled(signal);
    if (!this.cache) { const saved = this.store.get<unknown>(dictionaryKey, undefined); if (validCache(saved)) this.cache = saved; }
    if (this.cache && this.now() - this.cache.checkedAt >= 0 && this.now() - this.cache.checkedAt < ttl) return { revision: this.cache.revision };
    try {
      const response = await this.transport.request({ url: dictionaryUrl }, signal); cancelled(signal);
      if (response.status < 200 || response.status >= 300) throw new MetadataError('http', `标签词库 HTTP ${response.status}`);
      const parsed = parseDictionary(response.text), next: Cache = { format: 1, checkedAt: this.now(), ...parsed };
      cancelled(signal); this.cache = next;
      try { this.store.set(dictionaryKey, next); }
      catch { return { revision: next.revision, warning: '词库未能持久缓存，本次仍可翻译' }; }
      return { revision: next.revision };
    } catch (error) {
      cancelled(signal);
      if (this.cache) return { revision: this.cache.revision, warning: '词库更新失败，继续使用已有缓存' };
      throw new MetadataError('unavailable', `中文标签词库不可用：${error instanceof Error ? error.message : String(error)}；可重试或关闭 EH 标签翻译`);
    }
  }
  project(record: MetadataRecord, style: PrefixStyle): { record: MetadataRecord; replacements: Map<string, string>; matched: number } {
    const replacements = new Map<string, string>();
    if (record.provider !== 'ehentai') return { record, replacements, matched: 0 };
    if (!this.cache) throw new MetadataError('unavailable', '中文标签词库尚未加载');
    let matched = 0;
    const translatedTags = record.tags.map(raw => {
      const split = raw.indexOf(':'); if (split < 1) return raw;
      const ns = key(raw.slice(0, split)), tag = key(raw.slice(split + 1));
      const group = Object.hasOwn(this.cache!.names, ns) ? this.cache!.names[ns] : undefined;
      const name = group && Object.hasOwn(group, tag) ? group[tag] : undefined;
      if (!name) return raw; // No cross-namespace guesses and no tag filtering.
      // Remove decorative emoji only for descriptive tags; preserve named entities.
      const text = compactNamespaces.has(ns) ? name.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, '').trim() : name;
      if (!text) return raw;
      const translated = style === 'compact' && compactNamespaces.has(ns) ? text : `${ns}:${text}`;
      replacements.set(key(raw), key(translated)); matched++;
      return translated;
    });
    return { record: { ...record, translatedTags }, replacements, matched };
  }
}
export function translateExisting(values: ValueTags, replacements: Map<string, string>): ValueTags {
  return values.map(v => typeof v === 'string' ? replacements.get(key(v)) ?? v : v);
}
type ValueTags = import('./komga').Value[];
