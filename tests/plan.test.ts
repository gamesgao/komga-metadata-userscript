// @vitest-environment jsdom
import { it, expect, describe } from 'vitest';
import { buildPlan, equal } from '../src/plan';
import { type State } from '../src/komga';
import { type MetadataRecord } from '../src/model';
export function state(): State {
  return { series: { id: 's-real', oneshot: false, metadata: { title: 'Original', summary: 'old', tags: ['old'], links: [{ label: 'old', url: 'https://old.test/' }], alternateTitles: [{ title: '旧名', label: 'ja' }], titleLock: false } }, books: [
    { id: 'b-nine', seriesId: 's-real', metadata: { title: 'Volume 9', number: '9', authors: [{ name: 'Old', role: 'writer' }], authorsLock: false, tags: [] } },
    { id: 'b-two', seriesId: 's-real', metadata: { title: 'Volume 2', number: '2', authors: [], authorsLock: true, tags: [] } }
  ] };
}
export function source(): MetadataRecord {
  return { provider: 'bangumi', id: '1', url: 'https://bgm.tv/subject/1', titles: [{ text: '日本語', type: 'native' }], summary: '<b>新简介</b><script>bad()</script>', tags: ['female:glasses', 'old'], genres: ['Fantasy'], authors: [{ name: 'Romaji', native: '山田鐘人', role: 'writer' }], covers: [{ url: 'https://cover.test/a.png' }], links: [{ label: 'bangumi', url: 'https://bgm.tv/subject/1' }], raw: {} };
}
describe('field/lock-aware explicit plans', () => {
  it('leaves original title and all unselected fields untouched, deliberately merges arrays', () => {
    const p = buildPlan(state(), source(), { fields: ['summary', 'tags', 'links', 'alternateTitles'] });
    expect(p.edits[0]?.after).toEqual({
      summary: '新简介', tags: ['old', 'female:glasses'],
      links: [{ label: 'old', url: 'https://old.test/' }, { label: 'bangumi', url: 'https://bgm.tv/subject/1' }],
      alternateTitles: [{ title: '旧名', label: 'ja' }, { title: '日本語', label: 'native' }]
    });
    expect(p.edits[0]?.before.title).toBeUndefined();
    expect(p.edits[0]?.after.authors).toBeUndefined();
  });
  it('respects series AND book locks; authors only go to actual book IDs', () => {
    const s = state(); s.series.metadata.tagsLock = true;
    const p = buildPlan(s, source(), { fields: ['tags', 'authors'], propagateAuthors: true });
    expect(p.edits).toHaveLength(1);
    expect(p.edits[0]?.target).toEqual({ kind: 'books', id: 'b-nine' });
    expect(p.edits[0]?.after.authors).toEqual([{ name: 'Old', role: 'writer' }, { name: '山田鐘人', role: 'writer' }]);
    expect(p.skipped.join(' ')).toContain('已锁定');
    s.series.metadata.authorsLock = true;
    expect(buildPlan(s, source(), { fields: ['authors'], propagateAuthors: true }).edits).toEqual([]);
  });
  it('One-shot uses its actual associated book for authors and cover', () => {
    const s = state(); s.series.oneshot = true; s.books = [s.books[0]!];
    const r = source(); r.provider = 'ehentai';
    const p = buildPlan(s, r, { fields: ['authors'], cover: r.covers[0], coverTarget: { kind: 'series', id: 's-real' } });
    expect(p.edits[0]?.target).toEqual({ kind: 'books', id: 'b-nine' });
    expect(p.cover?.target).toEqual({ kind: 'books', id: 'b-nine' });
    expect(p.cover?.sharedSeries).toEqual({ kind: 'series', id: 's-real' });
    s.books.push(state().books[1]!);
    expect(() => buildPlan(s, r, { fields: ['authors'] })).toThrow('唯一实际关联');
  });
  it('volume mapping is explicit or matches unique verified metadata.number, never array index', () => {
    const r = source(); r.volume = 2; r.releaseDate = '2020-01-01';
    const p = buildPlan(state(), r, { fields: ['releaseDate', 'title'], verifiedVolume: 2 });
    expect(p.edits).toHaveLength(1);
    expect(p.edits[0]?.target.id).toBe('b-two');
    expect(() => buildPlan(state(), r, { fields: ['releaseDate'] })).toThrow('需要明确');
    expect(() => buildPlan(state(), r, { fields: ['releaseDate'], bookId: 'wrong' })).toThrow('不属于');
    expect(() => buildPlan(state(), r, { fields: ['releaseDate'], verifiedVolume: 9 })).toThrow('未验证');
    const s = state(); s.books[0]!.metadata.number = '2';
    expect(() => buildPlan(s, r, { fields: ['releaseDate'], verifiedVolume: 2 })).toThrow('不唯一');
  });
  it('missing source values never erase data; thumbnail locks skip explicit covers', () => {
    const r = source(); r.tags = []; r.summary = undefined;
    const s = state(); s.series.metadata.thumbnailLock = true;
    const p = buildPlan(s, r, { fields: ['summary', 'tags'], cover: r.covers[0], coverTarget: { kind: 'series', id: 's-real' } });
    expect(p.edits).toEqual([]); expect(p.cover).toBeUndefined();
    expect(p.skipped).toContain('封面已锁定');
  });
  it('semantic equality checks members not filesize or order', () => {
    expect(equal(['a', 'b'], ['b', 'a'])).toBe(true);
    expect(equal([{ name: 'a', role: 'writer' }], [{ role: 'writer', name: 'a' }])).toBe(true);
    expect(equal(['a'], ['b'])).toBe(false);
    expect(equal(['a', 'a', 'b'], ['a', 'b', 'b'])).toBe(false);
  });
});
