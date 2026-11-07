// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { currentSeries, detectKomga, KomgaClient } from '../src/komga';
const doc = (html: string) => new DOMParser().parseFromString(html, 'text/html');
describe('Komga deployment and actual DTOs', () => {
  it('root/new and context-path/old routing; rejects ordinary websites before effects', () => {
    expect(detectKomga(doc('<title>Komga</title><div id="app"></div><script src="/assets/index-abcd.js"></script>'), { origin: 'http://localhost', pathname: '/' })).toEqual({ origin: 'http://localhost', basePath: '' });
    expect(detectKomga(doc('<title>Series | Komga</title><div id="app"></div><script src="/reader/js/app.js"></script>'), { origin: 'http://localhost', pathname: '/reader/series/actual-id' })).toEqual({ origin: 'http://localhost', basePath: '/reader' });
    expect(detectKomga(doc('<title>Komga</title><div id="__nuxt"></div><script src="/bookshelf/_nuxt/entry.js"></script>'), { origin: 'http://localhost', pathname: '/bookshelf/oneshot/abc' })?.basePath).toBe('/bookshelf');
    expect(detectKomga(doc('<title>Shop</title><div id="app"></div><script src="/assets/index.js"></script>'), { origin: 'http://localhost', pathname: '/' })).toBeUndefined();
    expect(detectKomga(doc('<title>Komga Documentation</title><div id="app"></div>'), { origin: 'http://localhost', pathname: '/' })).toBeUndefined();
    expect(detectKomga(doc('<title>Komga</title><div id="app"></div><script src="https://evil.test/assets/app.js"></script>'), { origin: 'http://localhost', pathname: '/' })).toBeUndefined();
  });
  it('recognizes series, oneshot, hash routing and unambiguous main thumbnail fallback', () => {
    expect(currentSeries({ pathname: '/reader/series/abc-123', hash: '' })).toBe('abc-123');
    expect(currentSeries({ pathname: '/reader/oneshot/book-series', hash: '' })).toBe('book-series');
    expect(currentSeries({ pathname: '/reader/', hash: '#/series/old-id' })).toBe('old-id');
    expect(currentSeries({ pathname: '/library', hash: '' }, doc('<main><img src="/api/v1/series/a/thumbnail"><img src="/api/v1/series/b/thumbnail"></main>'))).toBeUndefined();
    expect(currentSeries({ pathname: '/detail', hash: '' }, doc('<main><img src="/reader/api/v1/series/a/thumbnail"></main>'))).toBe('a');
  });
  it('fetches same-origin with session credentials, paginates actual IDs', async () => {
    const requests: { url: string; options?: RequestInit }[] = [];
    const client = new KomgaClient({ origin: 'http://localhost', basePath: '/reader' }, async (url, options) => {
      requests.push({ url: String(url), options });
      return new Response(JSON.stringify(String(url).includes('/books?') ? { content: [{ id: 'book-real', seriesId: 'series-real', metadata: { title: 'Book', number: '9' } }], last: true } : { id: 'series-real', oneshot: false, metadata: { title: 'Series' } }));
    });
    const state = await client.state('series-real', new AbortController().signal);
    expect(state.books[0]?.id).toBe('book-real');
    expect(requests.every(r => r.url.startsWith('http://localhost/reader/api/v1/') && r.options?.credentials === 'include')).toBe(true);
  });
  it('propagates injected HTTP failures and wrong book ownership', async () => {
    const c = new KomgaClient({ origin: 'http://localhost', basePath: '' }, async () => new Response('', { status: 403 }));
    await expect(c.state('id', new AbortController().signal)).rejects.toMatchObject({ code: 'authentication-required', status: 403 });
    const wrong = new KomgaClient({ origin: 'http://localhost', basePath: '' }, async url => new Response(JSON.stringify(String(url).includes('/books?') ? { content: [{ id: 'b', seriesId: 'wrong', metadata: { title: 'Book' } }] } : { id: 's', oneshot: false, metadata: { title: 'Series' } })));
    await expect(wrong.state('s', new AbortController().signal)).rejects.toMatchObject({ code: 'invalid-response' });
    await expect(c.state('../private', new AbortController().signal)).rejects.toMatchObject({ code: 'invalid-id' });
  });
});
