// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { mergeRecords, sourceKey } from '../src/merge';
import { buildPlan } from '../src/plan';
import { searchPreferred } from '../src/search';
import { type MetadataRecord, type Provider, type Context } from '../src/model';
const record = (provider: MetadataRecord['provider'] = 'bangumi'): MetadataRecord => ({ provider, id: '1', url: `https://${provider}.test/1`, titles: [{ text: '日本語', type: 'native' }], summary: 'Primary summary', tags: ['old', 'A'], genres: [], authors: [{ name: '山田', role: 'writer' }], links: [{ label: provider, url: 'https://same.test/' }], covers: [], raw: {} });
const context = (): Context => ({ signal: new AbortController().signal, credentials: {} });
function provider(offline = false): Provider {
  return { id: 'bangumi', capabilities: { series: true, volumes: false, offline }, available: () => true,
    search: vi.fn(async () => [{ provider: 'bangumi' as const, id: '1', title: '日本語', url: 'https://bgm.tv/subject/1' }]),
    get: vi.fn(async () => record()), resolveLink: async id => id };
}
describe('multi-source merge', () => {
  it('uses primary scalar, fills blanks, unions arrays by value, deduplicates URLs and leaves inputs untouched', () => {
    const a = record(), b = record('anilist'); b.summary = 'Secondary summary'; b.language = 'ja'; b.tags = ['a', 'B'];
    const saved = structuredClone([a, b]), m = mergeRecords([a, b]);
    expect(m.values.summary).toBe('Primary summary'); expect(m.values.language).toBe('ja');
    expect(m.values.tags).toEqual(['old', 'a', 'b']); expect(m.values.authors).toHaveLength(1); expect(m.values.links).toHaveLength(1);
    expect(m.used.tags).toEqual(['bangumi', 'anilist']); expect([a, b]).toEqual(saved);
  });
  it('per-field choice selects only that source and keeps all other strategies', () => {
    const a = record(), b = record('anilist'); b.summary = 'Secondary'; b.tags = ['B'];
    const m = mergeRecords([a, b], { summary: sourceKey(b), tags: sourceKey(b) });
    expect(m.values.summary).toBe('Secondary'); expect(m.values.tags).toEqual(['b']); expect(m.used.summary).toEqual(['anilist']);
  });
  it('refuses mixed scopes and mismatched volumes', () => {
    const a = record(), b = record('anilist'); b.volume = 2;
    expect(() => mergeRecords([a, b])).toThrow('整部作品和单卷');
    a.volume = 1; expect(() => mergeRecords([a, b])).toThrow('不同卷号');
    a.volume = 2; expect(mergeRecords([a, b]).record.volume).toBe(2);
  });
  it('merged values still respect every series/book lock and only update selected targets', () => {
    const m = mergeRecords([record(), record('anilist')]);
    const state = { series: { id: 's', oneshot: false, metadata: { title: 'Manual', titleLock: true, tags: ['keep'], tagsLock: true } }, books: [{ id: 'b', seriesId: 's', metadata: { authors: [], authorsLock: true } }] };
    const p = buildPlan(state, m.record, { fields: ['title', 'tags', 'authors'], bookId: 'b', propagateAuthors: true, mergedFields: m.values });
    expect(p.edits).toEqual([]);
    const seriesOnly = buildPlan(state, m.record, { fields: ['summary'], mergedFields: m.values });
    expect(seriesOnly.edits.map(e => e.target)).toEqual([{ kind: 'series', id: 's' }]);
  });
});
describe('automatic offline-first routing', () => {
  it('local hits make zero online calls and keep the local provider for details', async () => {
    const local = provider(true), online = provider(), result = await searchPreferred(online, local, 'x', context());
    expect(result.provider).toBe(local); expect(result.mode).toBe('本地'); expect(online.search).not.toHaveBeenCalled();
    await result.provider.get('1', context()); expect(local.get).toHaveBeenCalledOnce(); expect(online.get).not.toHaveBeenCalled();
  });
  it('unloaded catalogs are skipped rather than confusing capability with availability', async () => {
    const local = provider(true), online = provider(); local.available = () => false;
    expect((await searchPreferred(online, local, 'x', context())).mode).toBe('在线'); expect(local.search).not.toHaveBeenCalled();
  });
  it('empty local results fall back online, while local failures remain visible in the route note', async () => {
    const local = provider(true), online = provider(); vi.mocked(local.search).mockResolvedValueOnce([]);
    expect((await searchPreferred(online, local, 'x', context())).note).toContain('本地无匹配');
    vi.mocked(local.search).mockRejectedValueOnce(new Error('broken catalog'));
    expect((await searchPreferred(online, local, 'x', context())).note).toContain('broken catalog');
    expect(online.search).toHaveBeenCalledTimes(2);
  });
  it('cancelling local lookup does not start online fallback', async () => {
    const local = provider(true), online = provider(), c = new AbortController();
    vi.mocked(local.search).mockImplementation(async () => { c.abort(); return []; });
    await expect(searchPreferred(online, local, 'x', { ...context(), signal: c.signal })).rejects.toThrow('已取消');
    expect(online.search).not.toHaveBeenCalled();
  });
});
