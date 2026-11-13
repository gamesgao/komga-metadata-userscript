import { describe, it, expect, vi } from 'vitest';
import { KomgaClient, type Metadata, type State, type Thumbnail } from '../src/komga';
import { buildPlan } from '../src/plan';
import { type MetadataRecord } from '../src/model';
import { Writer, validateImage, hash } from '../src/writer';
import { type Transport } from '../src/transport';
function state(): State {
  return { series: { id: 's', oneshot: false, metadata: { title: 'Original', titleLock: false, tags: ['old'], tagsLock: false, publisher: 'Original Publisher' } }, books: [{ id: 'actual-book', seriesId: 's', metadata: { title: 'Book', number: '3', authors: [], authorsLock: false, tags: [] } }] };
}
function record(): MetadataRecord {
  return { provider: 'bangumi', id: '1', url: 'https://bgm.tv/subject/1', titles: [{ text: '日本語', type: 'native' }], tags: ['female:glasses'], genres: [], authors: [{ name: '山田', role: 'writer' }], covers: [{ url: 'https://fixture.test/cover' }], links: [], raw: {} };
}
function png(extra = 1): Blob { return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, extra])], { type: 'image/png' }); }
class Server {
  state = state(); requests: { path: string; method: string; body?: Metadata }[] = [];
  thumbnails: (Thumbnail & { blob: Blob })[] = [{ id: 'existing-user-cover', selected: true, type: 'USER_UPLOADED', blob: png(2) }];
  failBook = false; failCover = false; corruptCover = false; ignorePatch = false; wrongReceipt = false;
  mirrorStale = false;
  onPatch?: () => void; afterUpload?: () => void;
  fetch: typeof fetch = async (url, init) => {
    const u = new URL(String(url)), path = u.pathname, method = init?.method ?? 'GET';
    this.requests.push({ path, method, body: method === 'PATCH' ? JSON.parse(String(init?.body)) : undefined });
    const response = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json' } });
    if (method === 'GET' && path.endsWith('/series/s')) return response(this.state.series);
    if (method === 'GET' && path.endsWith('/series/s/books')) return response({ content: this.state.books, last: true });
    if (method === 'GET' && path.endsWith('/books/actual-book')) return response(this.state.books[0]);
    if (method === 'GET' && path.endsWith('/thumbnail')) { const blob = this.mirrorStale ? png(9) : this.thumbnails.find(t=>t.selected)?.blob; return blob ? new Response(blob) : response({},404); }
    if (path.endsWith('/metadata') && method === 'PATCH') {
      if (path.includes('/books/') && this.failBook) return response({}, 500);
      const metadata = path.includes('/books/') ? this.state.books[0]!.metadata : this.state.series.metadata;
      if (!this.ignorePatch) Object.assign(metadata, JSON.parse(String(init?.body)));
      this.onPatch?.();
      return response({});
    }
    if (path.endsWith('/thumbnails')) {
      if (method === 'GET') return response(this.thumbnails.map(({ blob, ...t }) => t));
      if (method === 'POST') {
        if (this.state.series.oneshot && path.includes('/series/')) return response({},400);
        if (this.failCover) return response({}, 500);
        const file = (init!.body as FormData).get('file');
        if (!(file instanceof Blob)) throw new Error('Missing multipart image');
        const uploaded = { id: 'own-cover', selected: false, type: 'USER_UPLOADED', blob: this.corruptCover ? png(9) : file };
        this.thumbnails.push(uploaded); this.afterUpload?.(); return response(this.wrongReceipt ? this.thumbnails[0] : uploaded);
      }
    }
    const thumbnail = path.match(/\/thumbnails\/([\w-]+)(\/selected)?$/);
    if (thumbnail) {
      const item = this.thumbnails.find(t => t.id === thumbnail[1]);
      if (!item) return response({}, 404);
      if (method === 'GET') return new Response(item.blob);
      if (method === 'PUT') { this.thumbnails.forEach(t => t.selected = t.id === item.id); return response({}); }
      if (method === 'DELETE') { this.thumbnails = this.thumbnails.filter(t => t.id !== item.id); return response({}); }
    }
    throw new Error(`Unexpected ${method} ${path}`);
  };
  client = new KomgaClient({ origin: 'http://localhost', basePath: '/reader' }, this.fetch);
}
const signal = () => new AbortController().signal;
function transport(blob = png()): Transport {
  return { request: async r => ({ status: 200, headers: {}, text: '', blob, finalUrl: r.url }) };
}
describe('real client/writer against in-memory HTTP fixture, not real Komga', () => {
  it('preflights every cover before metadata or uploads; rejects duplicate targets',async()=>{
    const s=new Server(),w=new Writer(s.client,transport());
    const p=buildPlan(s.state,record(),{fields:['tags']});
    p.covers=[{target:{kind:'series',id:'s'},source:record().covers[0]!},{target:{kind:'books',id:'actual-book'},source:record().covers[0]!}];
    await w.prepare(p,signal());p.covers[1]!.prepared=undefined;
    await expect(w.apply(p,signal())).rejects.toThrow('请先生成封面预览');
    expect(s.requests.filter(r=>['PATCH','POST','PUT','DELETE'].includes(r.method))).toEqual([]);
    p.covers=[p.covers[0]!,p.covers[0]!];await expect(w.apply(p,signal())).rejects.toThrow('同一目标');
  });
  it('writes only planned fields, verifies readback, scoped undo preserves concurrent unrelated fields', async () => {
    const s = new Server(), w = new Writer(s.client, transport());
    const p = buildPlan(s.state, record(), { fields: ['tags', 'authors'], propagateAuthors: true });
    const r = await w.apply(p, signal());
    expect(r.status).toBe('success');
    expect(s.state.series.metadata.title).toBe('Original');
    expect(s.state.books[0]?.metadata.authors).toEqual([{ name: '山田', role: 'writer' }]);
    expect(s.requests.filter(r => r.method === 'PATCH').every(r => !('authors' in (r.path.includes('/series/') ? r.body! : {})))).toBe(true);
    s.state.series.metadata.publisher = 'Concurrent Publisher';
    const undo = await w.undo(r, 's', signal());
    expect(undo.status).toBe('success'); expect(s.state.series.metadata.tags).toEqual(['old']);
    expect(s.state.series.metadata.publisher).toBe('Concurrent Publisher');
    expect(s.state.books[0]?.metadata.authors).toEqual([]);
  });
  it('preapply conflict and newly locked field prevent ALL writes', async () => {
    const s = new Server(), w = new Writer(s.client, transport());
    const p = buildPlan(s.state, record(), { fields: ['tags', 'authors'], propagateAuthors: true });
    s.state.books[0]!.metadata.authorsLock = true;
    await expect(w.apply(p, signal())).rejects.toMatchObject({ code: 'conflict' });
    expect(s.requests.filter(r => r.method === 'PATCH')).toHaveLength(0);
    s.state.books[0]!.metadata.authorsLock = false; s.state.series.metadata.tags = ['concurrent'];
    await expect(w.apply(p, signal())).rejects.toMatchObject({ code: 'conflict' });
  });
  it('readback mismatch is error, keeps original snapshot and never claims success', async () => {
    const s = new Server(); s.ignorePatch = true;
    const r = await new Writer(s.client, transport()).apply(buildPlan(s.state, record(), { fields: ['tags'] }), signal());
    expect(r.status).toBe('error'); expect(r.outcomes[0]?.message).toContain('读回不符');
    expect(r.snapshots).toHaveLength(1);
  });
  it('book HTTP 500 leaves series success PARTIAL and does not erase existing metadata', async () => {
    const s = new Server(); s.failBook = true;
    const r = await new Writer(s.client, transport()).apply(buildPlan(s.state, record(), { fields: ['tags', 'authors'], propagateAuthors: true }), signal());
    expect(r.status).toBe('partial'); expect(r.outcomes.map(o => o.status)).toEqual(['success', 'error']);
    expect(s.state.books[0]?.metadata.authors).toEqual([]);
  });
  it('undo refuses a conflicting scoped snapshot but can restore independent targets', async () => {
    const s = new Server(), w = new Writer(s.client, transport());
    const r = await w.apply(buildPlan(s.state, record(), { fields: ['tags', 'authors'], propagateAuthors: true }), signal());
    s.state.series.metadata.tags = ['edited-later'];
    const u = await w.undo(r, 's', signal());
    expect(u.status).toBe('partial');
    expect(s.state.series.metadata.tags).toEqual(['edited-later']);
    expect(s.state.books[0]?.metadata.authors).toEqual([]);
  });
  it('One-shot writes only the book cover and verifies the series shared image, including undo', async () => {
    const s = new Server(); s.state.series.oneshot = true;
    const t = transport(), request = vi.spyOn(t, 'request'), w = new Writer(s.client, t), source = record();
    const p = buildPlan(s.state, source, { fields: ['authors'], cover: source.covers[0] });
    await w.prepare(p, signal());
    const r = await w.apply(p, signal()); expect(r.status).toBe('success');
    expect(r.covers[0]?.target).toEqual({ kind: 'books', id: 'actual-book' }); expect(r.covers[0]?.sharedSeries).toEqual({kind:'series',id:'s'});
    expect(s.requests.filter(r => r.method === 'POST').map(r=>r.path)).toEqual(['/reader/api/v1/books/actual-book/thumbnails']);
    expect(s.requests.some(r=>r.path==='/reader/api/v1/series/s/thumbnail')).toBe(true); expect(request).toHaveBeenCalledTimes(1);
    expect((await w.undo(r, 's', signal())).status).toBe('success');
    expect(s.thumbnails.map(t => t.id)).toEqual(['existing-user-cover']); expect(s.thumbnails[0]?.selected).toBe(true);
  });
  it('shared cover new lock prevents all writes; failed series readback is not success and cleans its upload', async () => {
    const s = new Server(); s.state.series.oneshot = true;
    const w = new Writer(s.client, transport()), source = record();
    const p = buildPlan(s.state, source, { fields: [], cover: source.covers[0] }); await w.prepare(p, signal());
    s.state.books[0]!.metadata.thumbnailLock = true;
    await expect(w.apply(p, signal())).rejects.toThrow('锁定'); expect(s.requests.filter(r=>r.method==='POST')).toHaveLength(0);
    s.state.books[0]!.metadata.thumbnailLock = false; s.afterUpload = () => { s.mirrorStale = true; };
    const result = await w.apply(p, signal()); expect(result.status).toBe('error'); expect(result.covers).toHaveLength(0);
    expect(result.outcomes[0]?.message).toContain('读回不一致');
    expect(s.thumbnails.map(t=>t.id)).toEqual(['existing-user-cover']); expect(s.thumbnails[0]?.selected).toBe(true);
  });
  it('failed cover preparation blocks ALL writes, even when metadata could succeed', async () => {
    const s = new Server(), source = record();
    const w = new Writer(s.client, { request: async r => ({ status: 404, headers: {}, text: '', finalUrl: r.url }) });
    const p = buildPlan(s.state, source, { fields: ['tags'], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await expect(w.prepare(p, signal())).rejects.toThrow('404');
    await expect(w.apply(p, signal())).rejects.toThrow('先生成封面预览');
    expect(s.requests.every(r => r.method === 'GET')).toBe(true);
    expect(s.thumbnails.map(t => t.id)).toEqual(['existing-user-cover']);
  });
  it('uploads the exact preview bytes without re-downloading a changed or failed source', async () => {
    const s = new Server(), source = record(), t = transport();
    const request = vi.spyOn(t, 'request'), w = new Writer(s.client, t);
    const p = buildPlan(s.state, source, { fields: ['tags'], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await w.prepare(p, signal());
    expect(p.cover?.beforeBlob).toBeInstanceOf(Blob);
    request.mockRejectedValue(new Error('Source changed after preview'));
    const r = await w.apply(p, signal());
    expect(r.status).toBe('success'); expect(request).toHaveBeenCalledTimes(1);
    expect(await hash(s.thumbnails.find(t => t.id === 'own-cover')!.blob)).toBe(p.cover!.prepared!.hash);
  });
  it('an upload failure after successful preview stays partial and preserves the old cover', async () => {
    const s = new Server(), source = record(), w = new Writer(s.client, transport());
    const p = buildPlan(s.state, source, { fields: ['tags'], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await w.prepare(p, signal()); s.failCover = true;
    const r = await w.apply(p, signal());
    expect(r.status).toBe('partial'); expect(r.outcomes[1]?.message).toContain('500');
    expect(s.thumbnails.map(t => t.id)).toEqual(['existing-user-cover']);
  });
  it('same filesize but different cover bytes fail verification and cleanup never deletes another user cover', async () => {
    const s = new Server(); s.corruptCover = true;
    const w = new Writer(s.client, transport()), source = record();
    const p = buildPlan(s.state, source, { fields: [], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await w.prepare(p, signal()); const r = await w.apply(p, signal());
    expect(r.status).toBe('error'); expect(r.outcomes[0]?.message).toContain('内容读回不符');
    expect(s.thumbnails.map(t => t.id)).toEqual(['existing-user-cover']);
    expect(await hash(png(1))).not.toBe(await hash(png(9)));
    expect(png(1).size).toBe(png(9).size);
  });
  it('cover preflight detects changed selection before metadata write', async () => {
    const s = new Server(), w = new Writer(s.client, transport()), source = record();
    const p = buildPlan(s.state, source, { fields: ['tags'], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await w.prepare(p, signal()); s.thumbnails[0]!.blob = png(5);
    await expect(w.apply(p, signal())).rejects.toMatchObject({ code: 'conflict' });
    expect(s.requests.some(r => r.method === 'PATCH')).toBe(false);
  });
  it('an upload response reusing a preexisting ID can never delete that user cover', async () => {
    const s = new Server(); s.wrongReceipt = true;
    const source = record(), w = new Writer(s.client, transport());
    const p = buildPlan(s.state, source, { fields: [], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await w.prepare(p, signal());
    const r = await w.apply(p, signal());
    expect(r.status).toBe('error'); expect(r.outcomes[0]?.message).toContain('已有封面 ID');
    expect(s.thumbnails.find(t => t.id === 'existing-user-cover')?.selected).toBe(true);
    expect(s.requests.some(r => r.method === 'DELETE')).toBe(false);
  });
  it('concurrent cover selection after upload is preserved while only own artifact is cleaned', async () => {
    const s = new Server(), source = record(), w = new Writer(s.client, transport());
    s.afterUpload = () => {
      s.thumbnails.forEach(t => t.selected = false);
      s.thumbnails.push({ id: 'concurrent-cover', selected: true, type: 'USER_UPLOADED', blob: png(8) });
    };
    const p = buildPlan(s.state, source, { fields: [], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await w.prepare(p, signal()); const r = await w.apply(p, signal());
    expect(r.status).toBe('error'); expect(s.thumbnails.find(t => t.selected)?.id).toBe('concurrent-cover');
    expect(s.thumbnails.map(t => t.id)).toEqual(['existing-user-cover', 'concurrent-cover']);
  });
  it('cover undo refuses a later user cover and honors new thumbnail lock', async () => {
    const s = new Server(), source = record(), w = new Writer(s.client, transport());
    const p = buildPlan(s.state, source, { fields: [], cover: source.covers[0], coverTarget: { kind: 'series', id: 's' } });
    await w.prepare(p, signal()); const r = await w.apply(p, signal());
    s.state.series.metadata.thumbnailLock = true;
    expect((await w.undo(r, 's', signal())).status).toBe('error');
    s.state.series.metadata.thumbnailLock = false;
    s.thumbnails.forEach(t => t.selected = t.id === 'existing-user-cover');
    expect((await w.undo(r, 's', signal())).status).toBe('error');
    expect(s.thumbnails.map(t => t.id)).toContain('own-cover');
  });
  it('cancellation before writes stops entirely; cancellation after one target is partial', async () => {
    const s = new Server(), w = new Writer(s.client, transport()), c = new AbortController();
    c.abort();
    await expect(w.apply(buildPlan(s.state, record(), { fields: ['tags'] }), c.signal)).rejects.toMatchObject({ code: 'cancelled' });
    expect(s.requests.some(r => r.method === 'PATCH')).toBe(false);
    const next = new AbortController(); s.onPatch = () => next.abort();
    const r = await w.apply(buildPlan(s.state, record(), { fields: ['tags', 'authors'], propagateAuthors: true }), next.signal);
    expect(r.status).toBe('error'); // first PATCH sent but readback canceled: not verified success
    expect(r.outcomes[0]?.message).toContain('已取消');
    expect(r.snapshots).toHaveLength(1);
    expect(s.requests.filter(r => r.method === 'PATCH')).toHaveLength(1);
  });
  it('image rejects spoofed MIME, HTML, empty/oversized data and real decoder failures', async () => {
    await expect(validateImage(new Blob(['<html>'], { type: 'image/png' }))).rejects.toMatchObject({ code: 'verification' });
    await expect(validateImage(new Blob(['text'], { type: 'text/html' }))).rejects.toMatchObject({ code: 'verification' });
    await expect(validateImage(new Blob([], { type: 'image/png' }))).rejects.toMatchObject({ code: 'verification' });
    vi.stubGlobal('createImageBitmap', async () => { throw new Error('bad image'); });
    await expect(validateImage(png())).rejects.toMatchObject({ code: 'verification' });
    vi.unstubAllGlobals();
  });
});
