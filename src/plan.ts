import { type MetadataRecord, type Cover, MetadataError, nativeTitle } from './model';
import { type State, type Metadata, type Target, type Value, validId } from './komga';
import { plain } from './providers/html';
export const seriesFields = ['title', 'summary', 'publisher', 'language', 'status', 'ageRating', 'tags', 'genres', 'links', 'alternateTitles'] as const;
export const bookFields = ['title', 'summary', 'releaseDate', 'isbn', 'tags', 'links', 'authors'] as const;
export type Field = typeof seriesFields[number] | typeof bookFields[number];
export interface Selection {
  fields: Field[]; bookId?: string; verifiedVolume?: number; propagateAuthors?: boolean;
  cover?: Cover; coverTarget?: Target;
  mergedFields?: Metadata;
}
export interface Edit { target: Target; before: Metadata; after: Metadata; guards: Metadata }
export interface CoverEdit {
  target: Target; source: Cover; beforeSelected?: string; beforeHash?: string; beforeBlob?: Blob;
  prepared?: { url: string; blob: Blob; hash: string };
}
export interface Plan { seriesId: string; edits: Edit[]; cover?: CoverEdit; skipped: string[] }
export function equal(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null || typeof a !== 'object' || typeof b !== 'object') return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    // Komga sets may reorder. Object arrays (links/authors) are also compared by members.
    if (a.length !== b.length) return false;
    const unmatched = [...b];
    return a.every(v => {
      const index = unmatched.findIndex(w => equal(v, w));
      if (index < 0) return false;
      unmatched.splice(index, 1);
      return true;
    });
  }
  const x = a as Record<string, unknown>, y = b as Record<string, unknown>;
  const keys = Object.keys(x);
  return keys.length === Object.keys(y).length && keys.every(k => equal(x[k], y[k]));
}
function merge(old: Value | undefined, incoming: Value[]): Value[] {
  const values = Array.isArray(old) ? [...old] : [];
  for (const v of incoming) if (!values.some(w => equal(v, w))) values.push(v);
  return values;
}
export function normalizeWriteFields(metadata: Metadata): Metadata {
  const normalized = { ...metadata };
  for (const field of ['tags', 'genres']) {
    const values = normalized[field];
    if (Array.isArray(values) && values.every((v): v is string => typeof v === 'string')) {
      normalized[field] = [...new Set(values.map(v => v.trim().toLowerCase()).filter(Boolean))];
    }
  }
  return normalized;
}
export function mappedFields(r: MetadataRecord): Metadata {
  return normalizeWriteFields({
    title: nativeTitle(r), summary: r.summary === undefined ? undefined : plain(r.summary),
    publisher: r.publisher, language: r.language, status: r.status, ageRating: r.ageRating,
    releaseDate: r.releaseDate, isbn: r.isbn?.replace(/[- ]/g, ''),
    tags: r.tags, genres: r.genres,
    links: r.links.map(l => ({ label: l.label, url: l.url })),
    alternateTitles: r.titles.map(t => ({ title: t.text, label: t.language || t.type })),
    authors: r.authors.map(a => ({ name: a.native || a.name, role: a.role }))
  });
}
export function isVolumeRecord(record: MetadataRecord): boolean {
  return record.volume !== undefined || record.provider === 'viz' || record.provider === 'ehentai' || record.id.startsWith('4000-') || record.id.startsWith('/titles/');
}
export function buildPlan(state: State, record: MetadataRecord, selection: Selection): Plan {
  const plan: Plan = { seriesId: state.series.id, edits: [], skipped: [] };
  const incoming = selection.mergedFields ?? mappedFields(record);
  let chosen = selection.bookId ? state.books.find(b => b.id === validId(selection.bookId!)) : undefined;
  if (selection.bookId && !chosen) throw new MetadataError('invalid-id', '所选书籍不属于当前系列');
  if (!chosen && selection.verifiedVolume !== undefined) {
    const matched = state.books.filter(b => typeof b.metadata.number === 'string' && /^\d+(?:\.\d+)?$/.test(b.metadata.number) && Number(b.metadata.number) === selection.verifiedVolume);
    if (matched.length !== 1 || record.volume !== selection.verifiedVolume) throw new MetadataError('invalid-id', '卷号未验证或不唯一，请明确选择书籍 ID');
    chosen = matched[0];
  }
  if (state.series.oneshot) {
    if (state.books.length !== 1) throw new MetadataError('invalid-response', 'One-shot 必须有唯一实际关联书籍');
    chosen = state.books[0];
  }
  const add = (target: Target, old: Metadata, fields: readonly Field[]) => {
    const before: Metadata = {}, after: Metadata = {}, guards: Metadata = {};
    for (const field of fields) {
      if (!selection.fields.includes(field)) continue;
      const value = incoming[field];
      if (value === undefined || (Array.isArray(value) && !value.length)) continue;
      const lock = `${field}Lock`;
      if (old[lock] === true || state.series.metadata[lock] === true) { plan.skipped.push(`${target.kind}/${target.id} ${field} 已锁定`); continue; }
      const next = Array.isArray(value) ? merge(old[field], value) : value;
      if (equal(old[field], next)) continue;
      before[field] = old[field] ?? null; after[field] = next; guards[lock] = old[lock] ?? false;
    }
    if (Object.keys(after).length) plan.edits.push({ target, before, after, guards });
  };
  // Volume records must not overwrite the series title/summary with a single issue.
  const volumeSpecific = isVolumeRecord(record);
  if (!volumeSpecific || state.series.oneshot) add({ kind: 'series', id: state.series.id }, state.series.metadata, seriesFields);
  if (chosen) add({ kind: 'books', id: chosen.id }, chosen.metadata, bookFields);
  else if (selection.fields.some(f => ['releaseDate', 'isbn'].includes(f)) || (volumeSpecific && selection.fields.some(f => bookFields.includes(f as typeof bookFields[number])))) throw new MetadataError('invalid-id', '单卷字段需要明确目标书籍');
  if (selection.propagateAuthors && !volumeSpecific) for (const b of state.books) {
    if (b.id !== chosen?.id) add({ kind: 'books', id: b.id }, b.metadata, ['authors']);
  }
  if (selection.fields.includes('authors') && !chosen && !selection.propagateAuthors) plan.skipped.push('作者未选择书籍；可启用传播');
  if (selection.cover) {
    let target = selection.coverTarget;
    if (state.series.oneshot) target = { kind: 'books', id: chosen!.id };
    if (!target) throw new MetadataError('invalid-id', '请选择封面目标');
    const old = target.kind === 'series' && target.id === state.series.id ? state.series.metadata : state.books.find(b => b.id === target!.id)?.metadata;
    if (!old || (target.kind === 'books' && !state.books.some(b => b.id === target!.id))) throw new MetadataError('invalid-id', '封面目标不属于系列');
    if (volumeSpecific && !state.series.oneshot && target.kind === 'series') throw new MetadataError('invalid-id', '单卷封面需要书籍目标');
    if (old.thumbnailLock === true || state.series.metadata.thumbnailLock === true) plan.skipped.push('封面已锁定');
    else plan.cover = { target, source: selection.cover };
  }
  return plan;
}
