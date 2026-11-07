import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';
import { createRegistry } from '../../src/providers';
import type { Transport } from '../../src/transport';
import { MetadataError, nativeTitle } from '../../src/model';
// Development-only public probes. No Komga access, cookies, tokens or private configuration.
const require = createRequire(import.meta.url);
const { JSDOM } = require('jsdom');
Object.assign(globalThis, { DOMParser: new JSDOM('').window.DOMParser });
const transport: Transport = {
  async request(r, signal) {
    const response = await fetch(r.url, { method: r.method ?? 'GET', headers: r.headers, body: r.body, signal, redirect: 'follow' });
    return { status: response.status, text: await response.text(), headers: Object.fromEntries(response.headers), finalUrl: response.url };
  }
};
const registry = createRegistry(transport);
const results: { provider: string; search: string; detail: string; fields?: Record<string, number | boolean>; error?: string }[] = [];
for (const p of registry.list()) {
  if (p.id === 'mal' || p.id === 'comicvine') {
    results.push({ provider: p.id, search: 'NOT RUN: own credentials unset', detail: 'NOT RUN' });
    continue;
  }
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 60000);
  const context = { signal: controller.signal, credentials: {} };
  const result: typeof results[number] = { provider: p.id, search: 'NOT RUN', detail: 'NOT RUN' };
  try {
    const candidates = await p.search(p.id === 'webtoons' ? 'Tower of God' : 'Frieren', context);
    result.search = candidates.length ? `PASS (live): ${candidates.length} candidates` : 'PASS (live empty): no matching title; detail NOT RUN';
    if (candidates[0]) {
      const resolved = await p.resolveLink(candidates[0].url, context);
      if (resolved !== candidates[0].id) throw new MetadataError('invalid-id', 'search/link ID mismatch');
      const record = await p.get(resolved, context);
      if (!nativeTitle(record) || record.id !== resolved) throw new MetadataError('invalid-response', 'detail identity mismatch');
      result.detail = 'PASS (live identity and mapping; not completeness acceptance)';
      result.fields = { titles: record.titles.length, authors: record.authors.length, tags: record.tags.length, genres: record.genres.length, links: record.links.length, covers: record.covers.length, books: record.books?.length ?? 0, summary: !!record.summary, publisher: !!record.publisher, releaseDate: !!record.releaseDate, status: !!record.status };
    }
  } catch (e) {
    result.error = e instanceof MetadataError ? `${e.code}: ${e.message}` : e instanceof Error ? e.message : 'unknown error';
    if (result.search === 'NOT RUN') result.search = 'FAIL/BLOCKED (live request)';
    else result.detail = 'FAIL/BLOCKED (live request/mapping)';
  } finally { clearTimeout(timer); }
  results.push(result);
  console.log(JSON.stringify(result));
}
await writeFile('.runtime/component-live-summary.json', JSON.stringify({ executedAt: new Date().toISOString(), transport: 'Node fetch, not GM/manager', query: { default: 'Frieren', webtoons: 'Tower of God' }, results }, null, 2));
console.log('ExH NOT RUN: authenticated mode/credentials unset. Full catalog/data completeness NOT RUN.');
process.exitCode = results.some(r => r.error) ? 1 : 0;
