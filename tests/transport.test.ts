import { describe, it, expect, vi, afterEach } from 'vitest';
import { SourceTransport, GMTransport, delay, safeUrl, type Transport, type Request, type Response } from '../src/transport';
const signal = () => new AbortController().signal;
const response = (status = 200, headers = {}): Response => ({ status, headers, text: '{}', finalUrl: 'https://fixture.test' });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
describe('bounded, abortable source transport', () => {
  it('retries Retry-After and serializes per source', async () => {
    vi.useFakeTimers();
    let active = 0, peak = 0;
    const inner: Transport = { request: vi.fn(async () => { active++; peak = Math.max(peak, active); await delay(10, signal()); active--; return response(); }) };
    const t = new SourceTransport(inner, 50);
    const jobs = [t.request({ url: 'https://fixture.test/1' }, signal()), t.request({ url: 'https://fixture.test/2' }, signal())];
    await vi.runAllTimersAsync(); await Promise.all(jobs);
    expect(peak).toBe(1); expect(inner.request).toHaveBeenCalledTimes(2);
  });
  it('obeys Retry-After and bounded attempt count for HTTP 429', async () => {
    vi.useFakeTimers();
    const inner: Transport = { request: vi.fn().mockResolvedValueOnce(response(429, { 'retry-after': '1' })).mockResolvedValue(response()) };
    const t = new SourceTransport(inner, 0);
    const promise = t.request({ url: 'https://fixture.test' }, signal());
    await vi.advanceTimersByTimeAsync(999);
    expect(inner.request).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect((await promise).status).toBe(200);
    expect(inner.request).toHaveBeenCalledTimes(2);
    const always: Transport = { request: vi.fn(async () => response(429, { 'retry-after': '0' })) };
    const failed = new SourceTransport(always, 0).request({ url: 'https://fixture.test' }, signal());
    const check = expect(failed).rejects.toMatchObject({ code: 'http', status: 429 });
    await vi.runAllTimersAsync(); await check;
    expect(always.request).toHaveBeenCalledTimes(3);
  });
  it('rejects excessive Retry-After without endless waiting', async () => {
    const t = new SourceTransport({ request: async () => response(503, { 'retry-after': '86400' }) }, 0);
    await expect(t.request({ url: 'https://fixture.test' }, signal())).rejects.toMatchObject({ code: 'http' });
  });
  it.each([401, 403, 404, 500])('surfaces HTTP %s', async status => {
    const t = new SourceTransport({ request: async () => response(status) }, 0);
    await expect(t.request({ url: 'https://fixture.test' }, signal())).rejects.toMatchObject({ status, code: [401, 403].includes(status) ? 'authentication-required' : 'http' });
  });
  it('cancels retry sleep and rejects queue overflow', async () => {
    vi.useFakeTimers();
    const c = new AbortController();
    const t = new SourceTransport({ request: async () => response(429, { 'retry-after': '10' }) }, 0, 1);
    const p = t.request({ url: 'https://fixture.test' }, c.signal);
    const check = expect(p).rejects.toMatchObject({ code: 'cancelled' });
    await vi.advanceTimersByTimeAsync(1);
    await expect(t.request({ url: 'https://fixture.test' }, signal())).rejects.toMatchObject({ code: 'unavailable' });
    c.abort(); await check;
  });
  it('aborted queued work never starts a network request and failures release queue', async () => {
    const c = new AbortController(); c.abort();
    const inner: Transport = { request: vi.fn(async () => response()) }, t = new SourceTransport(inner, 0);
    await expect(t.request({ url: 'https://fixture.test' }, c.signal)).rejects.toMatchObject({ code: 'cancelled' });
    expect(inner.request).not.toHaveBeenCalled();
    expect((await t.request({ url: 'https://fixture.test' }, signal())).status).toBe(200);
  });
  it('GM adapter uses anonymous requests, explicit cookie and abort handle', async () => {
    const abort = vi.fn();
    let options: { onload(r: unknown): void; anonymous: boolean; cookie?: string; responseType: string } | undefined;
    vi.stubGlobal('GM_xmlhttpRequest', (o: typeof options) => { options = o; return { abort }; });
    const t = new GMTransport(), c = new AbortController();
    const p = t.request({ url: 'https://fixture.test', cookie: 'fixture=1' }, c.signal);
    const check = expect(p).rejects.toMatchObject({ code: 'cancelled' });
    expect(options).toMatchObject({ anonymous: true, cookie: 'fixture=1', responseType: 'text' });
    c.abort(); await check; expect(abort).toHaveBeenCalledOnce();
    const r = t.request({ url: 'https://fixture.test' }, signal());
    options!.onload({ status: 200, responseHeaders: 'Retry-After: 2\r\nContent-Type: text/plain', responseText: 'ok', response: '', finalUrl: 'https://fixture.test' });
    expect(await r).toMatchObject({ headers: { 'retry-after': '2' }, text: 'ok' });
  });
  it('does not allow embedded credentials or non-HTTP remote URLs', () => {
    for (const u of ['javascript:alert(1)', 'file:///tmp/a', 'https://user:password@fixture.test/']) expect(() => safeUrl(u)).toThrow();
  });
});
