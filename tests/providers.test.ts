// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { Bangumi, MangaUpdates, MangaBaka, MangaDex, AniList, MAL, ComicVine } from '../src/providers/api';
import { EHentai, HTMLSource, plain } from '../src/providers/html';
import { Registry, type Context, type Provider, nativeTitle } from '../src/model';
import { type Request, type Transport } from '../src/transport';
const context = (): Context => ({ signal: new AbortController().signal, credentials: {} });
function mock(responses: unknown[]): Transport & { calls: Request[] } {
  const calls: Request[] = [];
  return { calls, request: vi.fn(async (r: Request) => {
    calls.push(r);
    if (!responses.length) throw new Error(`Unexpected request ${r.url}`);
    const value = responses.shift();
    return { status: 200, headers: {}, text: typeof value === 'string' ? value : JSON.stringify(value), finalUrl: r.url };
  }) };
}
const mdid = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
describe('online providers: fixture behavior, not live acceptance', () => {
  it('Bangumi next API searches books, preserves native staff, maps actual relations', async () => {
    const t = mock([
      { data: [{ id: 1, name: '葬送のフリーレン', nameCN: '葬送的芙莉莲' }] },
      { id: 1, name: '葬送のフリーレン', nameCN: '芙莉莲', summary: '原文', series: true, tags: [{ name: '魔法' }], airtime: { date: '2020-04-28' }, images: { large: 'https://lain.bgm.tv/a.jpg' }, infobox: [] },
      { data: [{ staff: { name: '山田鐘人', nameCN: '山田钟人' }, positions: [{ type: { id: 2001 } }] }, { staff: { name: '小学館' }, positions: [{ type: { id: 2004 } }] }], total: 2 },
      { data: [{ subject: { id: 99, name: '葬送のフリーレン (2)' }, relation: { id: 1003 }, order: 8 }], total: 1 }
    ]);
    const p = new Bangumi(t);
    expect((await p.search('葬送', context()))[0]?.id).toBe('1');
    expect(JSON.parse(t.calls[0]!.body!).filter.type).toEqual([1]);
    const r = await p.get('1', context());
    expect(nativeTitle(r)).toBe('葬送のフリーレン');
    expect(r.authors[0]).toMatchObject({ name: '山田鐘人', native: '山田鐘人' });
    expect(r.publisher).toBe('小学館');
    expect(r.books?.[0]).toMatchObject({ id: '99', volume: 2 });
    expect(r.releaseDate).toBe('2020-04-28');
    expect(t.calls.map(r => r.url).join()).toContain('/staffs/persons?limit=100&offset=0');
    expect(await p.resolveLink('https://chii.in/subject/1')).toBe('1');
    await expect(p.resolveLink('https://evil.test/subject/1')).rejects.toMatchObject({ code: 'invalid-id' });
  });
  it('rejects wrong Bangumi ID rather than mapping unrelated metadata', async () => {
    await expect(new Bangumi(mock([{ id: 2 }])).get('1', context())).rejects.toMatchObject({ code: 'invalid-id' });
  });
  it('MangaUpdates separates modern base36 from API numeric and legacy redirects', async () => {
    const p = new MangaUpdates(mock([]));
    expect(await p.resolveLink('https://www.mangaupdates.com/series/ugf5dzu/name', context())).toBe('66296374554');
    expect(await p.resolveLink('66296374554', context())).toBe('66296374554');
    await expect(p.resolveLink('https://www.mangaupdates.com/series/66296374554', context())).rejects.toMatchObject({ code: 'invalid-id' });
    const redirect: Transport = { request: async () => ({ status: 200, headers: {}, text: '', finalUrl: 'https://www.mangaupdates.com/series/ugf5dzu/name' }) };
    expect(await new MangaUpdates(redirect).resolveLink('https://www.mangaupdates.com/series.html?id=123', context())).toBe('66296374554');
    await expect(new MangaUpdates(mock(['old page'])).resolveLink('https://www.mangaupdates.com/series.html?id=123', context())).rejects.toMatchObject({ code: 'unavailable' });
  });
  it('MangaUpdates searches/details with categories/authors/links, not guessed release date', async () => {
    const x = { series_id: 1, title: '日本語', url: 'https://www.mangaupdates.com/series/0000001/name', associated: [{ title: 'Alias' }], description: '<b>Text</b>', year: '2020', genres: [{ genre: 'Fantasy' }], categories: [{ category: 'Magic' }], authors: [{ name: '山田', type: 'Author' }], publishers: [{ publisher_name: '小学館' }], image: { url: { original: 'https://cdn.mangaupdates.com/a.jpg' } } };
    const p = new MangaUpdates(mock([{ results: [{ record: x }] }, x]));
    expect((await p.search('日本語', context()))[0]?.title).toBe('日本語');
    const r = await p.get('1', context());
    expect(r.tags).toEqual(['Magic']); expect(r.authors[0]?.name).toBe('山田'); expect(r.releaseDate).toBeUndefined();
  });
  it('MangaBaka upgrades multilingual titles, tags, raw covers and explicit volume images', async () => {
    const x = { id: 1995, native_title: '葬送のフリーレン', title: 'Frieren', original_language: 'ja', status: 'hiatus', authors: ['山田鐘人'], artists: ['アベツカサ'], tags_v2: [{ name: 'Magic', name_path: 'Theme/Magic', is_genre: false }, { name: 'Fantasy', is_genre: true }], titles: [{ title: '葬送のフリーレン', language: 'ja', type: 'native' }], published: { start_date: '2020-04-28' }, cover: { raw: { url: 'https://images.mangabaka.dev/raw' } }, links_v2: [{ name_display: 'Publisher', url: 'https://publisher.test/' }], publishers: [{ name: '小学館' }] };
    const p = new MangaBaka(mock([{ data: [x] }, { data: x }, { data: [{ index_numeric: 4, language: 'ja', image: { x350: { x3: 'https://cdn.mangabaka.dev/v4' } } }], pagination: { next: null } }]));
    expect((await p.search('Frieren', context()))[0]?.title).toBe('葬送のフリーレン');
    const r = await p.get('1995', context());
    expect(r.covers).toContainEqual({ url: 'https://cdn.mangabaka.dev/v4', volume: 4, language: 'ja' });
    expect(r.covers[0]?.url).toBe('https://images.mangabaka.dev/raw');
    expect(r.status).toBe('HIATUS'); expect(r.tags).toEqual(['Theme/Magic']); expect(r.genres).toEqual(['Fantasy']);
  });
  it('MangaBaka rejects hostile pagination and merged IDs', async () => {
    const x = { data: { id: 1, title: 'x' } };
    await expect(new MangaBaka(mock([x, { data: [], pagination: { next: 'https://evil.test/' } }])).get('1', context())).rejects.toMatchObject({ code: 'invalid-response' });
    await expect(new MangaBaka(mock([{ data: { id: 1, merged_with: 2 } }])).get('1', context())).rejects.toMatchObject({ code: 'invalid-id' });
  });
  it('MangaDex maps author includes, native titles and named volume covers', async () => {
    const x = { id: mdid, attributes: { title: { en: 'Alias' }, altTitles: [{ ja: '原名' }], originalLanguage: 'ja', description: { en: 'Text' }, status: 'ongoing', tags: [{ attributes: { name: { en: 'Fantasy' } } }] }, relationships: [{ type: 'author', attributes: { name: '日本人' } }] };
    const t = mock([{ data: [x] }, { data: x }, { data: [{ attributes: { volume: '3', fileName: 'test.jpg', locale: 'ja' } }], total: 1 }]);
    const p = new MangaDex(t);
    expect((await p.search('原名', context()))[0]?.id).toBe(mdid);
    const r = await p.get(mdid, context());
    expect(nativeTitle(r)).toBe('原名');
    expect(r.covers[0]).toMatchObject({ volume: 3, language: 'ja' });
    expect(r.authors[0]?.name).toBe('日本人');
    await expect(p.get('1', context())).rejects.toMatchObject({ code: 'invalid-id' });
    expect(await p.resolveLink(`https://mangadex.org/title/${mdid}/name`)).toBe(mdid);
  });
  it('AniList requests native names and preserves native title over romaji', async () => {
    const x = { id: 1, siteUrl: 'https://anilist.co/manga/1', title: { native: '日本語', romaji: 'Nihongo', english: 'English' }, description: 'text', status: 'FINISHED', genres: ['Fantasy'], startDate: { year: 2020, month: 1, day: 2 }, coverImage: { large: 'https://anilist.co/a.jpg' }, staff: { edges: [{ role: 'Story', node: { name: { native: '山田鐘人', full: 'Kanehito Yamada' } } }], pageInfo: { hasNextPage: false } } };
    const t = mock([{ data: { Page: { media: [x] } } }, { data: { Media: x } }]), p = new AniList(t);
    expect((await p.search('日本', context()))[0]?.title).toBe('日本語');
    const r = await p.get('1', context());
    expect(nativeTitle(r)).toBe('日本語'); expect(r.authors[0]?.name).toBe('山田鐘人');
    expect(t.calls[1]!.body).toContain('native full');
    expect(r.releaseDate).toBe('2020-01-02'); expect(r.status).toBe('ENDED');
    await expect(new AniList(mock([{ errors: [{ message: 'no access' }] }])).get('1', context())).rejects.toMatchObject({ code: 'unavailable' });
  });
  it('EH uses gid/token, full namespaces, native title, no posted releaseDate or forced ENDED', async () => {
    const t = mock(['<div class="itg"><a href="https://e-hentai.org/g/1/0123456789/">原名</a></div>', { gmetadata: [{ gid: 1, token: '0123456789', title: 'English', title_jpn: '日本語', tags: ['language:japanese', 'female:glasses', 'artist:山田'], posted: '1700000000', category: 'Manga', thumb: 'https://ehgt.org/a.jpg' }] }]);
    const p = new EHentai(t);
    expect((await p.search('日本語', context()))[0]?.id).toBe('1:0123456789');
    const r = await p.get('1:0123456789', context());
    expect(nativeTitle(r)).toBe('日本語'); expect(r.tags).toContain('female:glasses');
    expect(r.status).toBeUndefined(); expect(r.releaseDate).toBeUndefined(); expect(r.language).toBe('ja');
    expect(JSON.parse(t.calls[1]!.body!).namespace).toBe(1);
    await expect(p.get('1:wrong', context())).rejects.toBeDefined();
    await expect(p.resolveLink('https://exhentai.org/g/1/0123456789/', context())).rejects.toMatchObject({ code: 'authentication-required' });
  });
  it('ExH requires explicit credentials and sends only explicit cookies', async () => {
    const c = context(); c.credentials.exhentai = { enabled: true, memberId: '', passHash: '' };
    const t = mock([]);
    await expect(new EHentai(t).search('x', c)).rejects.toMatchObject({ code: 'authentication-required' });
    expect(t.calls).toHaveLength(0);
    c.credentials.exhentai = { enabled: true, memberId: '123', passHash: 'abc', igneous: 'def' };
    const authed = mock(['<div class="itg"></div>']);
    expect(await new EHentai(authed).search('x', c)).toEqual([]);
    expect(authed.calls[0]).toMatchObject({ cookie: 'ipb_member_id=123; ipb_pass_hash=abc; igneous=def' });
  });
  it.each([MAL, ComicVine])('%s missing own credentials is not empty success', async Provider => {
    const t = mock([]), p = new Provider(t);
    await expect(p.search('x', context())).rejects.toMatchObject({ code: 'authentication-required' });
    await expect(p.get(p.id === 'mal' ? '1' : '4050-1', context())).rejects.toMatchObject({ code: 'authentication-required' });
    expect(t.calls).toHaveLength(0);
  });
  it('MAL search/detail maps Japanese aliases and authors with a supplied fixture client', async () => {
    const c = context(); c.credentials.malClientId = 'fixture-client-not-real';
    const x = { id: 1, title: 'Romaji', alternative_titles: { ja: '日本語', synonyms: ['Alias'] }, synopsis: 'text', status: 'finished', genres: [{ name: 'Fantasy' }], authors: [{ node: { last_name: '山田', first_name: '鐘人' }, role: 'Story' }], main_picture: { large: 'https://cdn.myanimelist.net/a.jpg' }, start_date: '2020' };
    const t = mock([{ data: [{ node: x }] }, x]), p = new MAL(t);
    expect((await p.search('x', c))[0]?.id).toBe('1');
    expect(nativeTitle(await p.get('1', c))).toBe('日本語');
    expect(t.calls[0]?.headers?.['X-MAL-CLIENT-ID']).toBe('fixture-client-not-real');
    expect(await p.resolveLink('https://myanimelist.net/manga/1/name')).toBe('1');
  });
  it('ComicVine keeps volume and issue IDs separate, maps issue credits and date', async () => {
    const c = context(); c.credentials.comicVineKey = 'fixture-key-not-real';
    const t = mock([
      { status_code: 1, results: [{ id: 1, name: 'Series', site_detail_url: 'https://comicvine.gamespot.com/name/4050-1/' }] },
      { status_code: 1, results: { id: 1, name: 'Series', site_detail_url: 'https://comicvine.gamespot.com/name/4050-1/', issues: [{ id: 3, issue_number: '8', site_detail_url: 'https://comicvine.gamespot.com/name/4000-3/' }] } },
      { status_code: 1, results: { id: 3, name: 'Issue', issue_number: '8', site_detail_url: 'https://comicvine.gamespot.com/name/4000-3/', store_date: '2020-01-02', person_credits: [{ name: 'Author', role: 'writer' }], image: { original_url: 'https://comicvine.gamespot.com/a.jpg' } } }
    ]);
    const p = new ComicVine(t);
    expect((await p.search('x', c))[0]?.id).toBe('4050-1');
    const r = await p.get('4050-1', c);
    expect(r.books?.[0]).toMatchObject({ id: '4000-3', volume: 8 });
    const issue = await p.get('4000-3', c); expect(issue.releaseDate).toBe('2020-01-02'); expect(issue.authors[0]?.role).toBe('writer');
    await expect(p.resolveLink('1')).rejects.toMatchObject({ code: 'invalid-id' });
  });
  it('VIZ search/detail parses inert HTML and metadata, rejects changed pages', async () => {
    const url = 'https://www.viz.com/manga-books/manga/test-volume-2/product/123';
    const p = new HTMLSource('viz', mock([
      `<div id="results"><a href="${url}">Test, Vol. 2</a></div>`,
      `<meta property="og:url" content="${url}"><meta property="og:image" content="https://viz.test/a.jpg"><div id="product_row"><div id="purchase_links_block"><h2>Test, Vol. 2</h2></div><p class="o_summary">Summary</p><p class="o_author">Story by Author</p><p class="o_isbn13">ISBN-13 9781234567890</p><p class="o_release-date">Release January 2, 2020</p></div><script>window.bad=1</script>`
    ]));
    expect((await p.search('Test', context()))[0]?.id).toBe('/manga-books/manga/test-volume-2/product/123');
    const r = await p.get(url, context());
    expect(r.volume).toBe(2); expect(r.isbn).toBe('9781234567890');
    expect(r.summary).toBe('Summary'); expect(r.releaseDate).toBe('2020-01-02'); expect(r.authors[0]?.name).toBe('Author');
    await expect(new HTMLSource('viz', mock(['<h1>Blocked</h1>'])).search('Test', context())).rejects.toMatchObject({ code: 'invalid-response' });
    expect(plain('<script>alert(1)</script><b>原文</b>')).toBe('原文');
  });
  it('YenPress fetches current public search key and reads concrete book data', async () => {
    const p = new HTMLSource('yenpress', mock([
      '<script>{"search_key":"search-fixture-key"}</script>',
      { results: [{ title: { raw: 'Title' }, url: { raw: 'https://yenpress.com/series/title' } }] },
      '<meta property="og:url" content="https://yenpress.com/titles/title-vol-2"><div class="heading-content"><h1 class="heading">Title, Vol. 2</h1><div class="story-details"><p>Author: 日本人</p></div></div><div class="book-info"><p class="content-heading-txt">Summary</p></div><p>ISBN 9781234567890 Release Date Jan 2, 2020</p>'
    ]));
    expect((await p.search('Title', context()))[0]?.id).toBe('/series/title');
    const r = await p.get('/titles/title-vol-2', context()); expect(r.volume).toBe(2); expect(r.authors[0]?.name).toBe('日本人');
    await expect(new HTMLSource('yenpress', mock(['<h1>Changed</h1>'])).search('x', context())).rejects.toMatchObject({ code: 'unavailable' });
  });
  it('YenPress series excludes global recommended books and uses paged actual relations', async () => {
    const p = new HTMLSource('yenpress', mock([
      '<div class="heading-content"><h1 class="heading">Frieren<sup rel="nofollow">2</sup></h1><div class="story-details"><p>Author: 日本人</p></div></div><div class="story-details"><p>Author: 日本人</p></div><div class="content-heading-txt"><p class="paragraph">Selected volume summary</p><div>SHARE</div></div><nav><a href="/titles/unrelated">Unrelated book</a></nav>',
      '<div class="inline_block"><a href="/titles/title-vol-2">Title, Vol. 2</a></div><div class="show-more" data-url="/series/get_more/frieren?next_ord=10"></div>',
      '<div class="inline_block"><a href="/titles/title-vol-1">Title, Vol. 1</a></div>'
    ]));
    const r = await p.get('/series/frieren', context());
    expect(nativeTitle(r)).toBe('Frieren');
    expect(r.authors).toEqual([{ name: '日本人', role: 'writer' }]);
    expect(r.summary).toBe('Selected volume summary');
    expect(r.books?.map(b => b.id)).toEqual(['/titles/title-vol-2', '/titles/title-vol-1']);
    expect(r.books?.map(b => b.volume)).toEqual([2, 1]);
  });
  it('Webtoons uses real mobile Title shape for both source kinds and maps detail', async () => {
    const p = new HTMLSource('webtoons', mock([
      { success: true, result: { webtoonResult: { titleList: [{ titleNo: 1, title: 'Original', representGenre: 'fantasy', titleGroupName: 'original' }] } } },
      { success: true, result: { challengeResult: { titleList: [{ titleNo: 2, title: 'Canvas Title' }] } } },
      '<meta property="og:url" content="https://www.webtoons.com/en/fantasy/original/list?title_no=1"><h1 class="subj">Original</h1><div class="detail_header"><div class="author">Author</div><p class="genre">Fantasy</p></div><div id="_asideDetail"><p class="summary">Text</p><p class="day_info">COMPLETED</p></div>'
    ]));
    const found = await p.search('x', context());
    expect(found.map(c => c.id)).toEqual(['/en/fantasy/original/list?title_no=1', '/en/canvas/canvas-title/list?title_no=2']);
    const r = await p.get(found[0]!.id, context());
    expect(r.status).toBe('ENDED'); expect(r.summary).toBe('Text'); expect(r.authors[0]?.name).toBe('Author');
    expect(p.capabilities.volumes).toBe(false);
  });
  it('one failed source and unknown provider do not hide successful candidates', async () => {
    const registry = new Registry();
    const good = new Bangumi(mock([{ data: [{ id: 1, name: '原名' }] }]));
    const bad: Provider = { ...good, id: 'mal', capabilities: good.capabilities, resolveLink: async () => '1', get: async () => { throw new Error('No auth'); }, search: async () => { throw new Error('HTTP 403'); } };
    registry.register(good); registry.register(bad);
    const results = await registry.search(['bangumi', 'mal', 'bookwalker'], 'x', context());
    expect(results[0]?.candidates).toHaveLength(1); expect(results[1]?.error?.message).toBe('HTTP 403');
    expect(results[2]?.error).toMatchObject({ code: 'unknown-provider' });
    expect(() => registry.get('unknown')).toThrow('未接入来源');
  });
  it.each([Bangumi, MangaUpdates, MangaBaka, MangaDex, AniList])('%s malformed search does not become []', async P => {
    await expect(new P(mock([{ unexpected: true }])).search('x', context())).rejects.toMatchObject({ code: 'invalid-response' });
  });
});
