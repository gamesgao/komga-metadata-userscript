import { type MetadataRecord, MetadataError } from './model';
import { type Metadata, type Value } from './komga';
import { mappedFields, isVolumeRecord, seriesFields, bookFields, type Field, equal } from './plan';
export const mergeFields: Field[] = [...new Set<Field>([...seriesFields, ...bookFields])];
export const sourceKey = (r: MetadataRecord): string => `${r.provider}:${r.id}`;
export type FieldChoices = Partial<Record<Field, string>>;
export interface Merged {
  record: MetadataRecord; values: Metadata; used: Partial<Record<Field, string[]>>;
  options: Partial<Record<Field, { key: string; provider: string; value: Value }[]>>;
  covers: { cover: MetadataRecord['covers'][number]; provider: string }[];
}
function present(v: Value | undefined): v is Value { return v !== undefined && v !== null && v !== '' && (!Array.isArray(v) || v.length > 0); }
function union(field: Field, values: Value[]): Value[] {
  const result: Value[] = [];
  const same = (a: Value, b: Value) => {
    if (field === 'links' && a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) return a.url === b.url;
    return equal(a, b);
  };
  for (const value of values) if (Array.isArray(value)) for (const item of value) if (!result.some(old => same(old, item))) result.push(item);
  return result;
}
/** Caller confirms same work/edition. Never mix series with volume records,
 * or different explicit volumes. Order is user-selected source priority. */
export function mergeRecords(records: MetadataRecord[], choices: FieldChoices = {}): Merged {
  if (!records.length) throw new MetadataError('verification', '先选择候选');
  if (new Set(records.map(isVolumeRecord)).size > 1) throw new MetadataError('verification', '不能把整部作品和单卷条目混合；请先移除不同层级的条目');
  if (new Set(records.map(r => r.volume).filter(v => v !== undefined)).size > 1) throw new MetadataError('verification', '选中了不同卷号，不能合并到同一本书');
  const mapped = records.map(r => ({ r, value: mappedFields(r) }));
  const values: Metadata = {}, used: Merged['used'] = {}, options: Merged['options'] = {};
  for (const field of mergeFields) {
    const entries = mapped.filter(x => present(x.value[field])).map(x => ({ key: sourceKey(x.r), provider: x.r.provider, value: x.value[field]! }));
    options[field] = entries;
    if (!entries.length) continue;
    const chosen = entries.find(e => e.key === choices[field]);
    if (chosen) { values[field] = chosen.value; used[field] = [chosen.provider]; }
    else if (Array.isArray(entries[0]!.value)) {
      values[field] = union(field, entries.map(e => e.value)); used[field] = [...new Set(entries.map(e => e.provider))];
    } else { values[field] = entries[0]!.value; used[field] = [entries[0]!.provider]; }
  }
  const covers: Merged['covers'] = [];
  for (const r of records) for (const cover of r.covers) if (!covers.some(c => c.cover.url === cover.url)) covers.push({ cover, provider: r.provider });
  return { record: { ...records[0]!, covers: covers.map(c => c.cover) }, values, used, options, covers };
}
