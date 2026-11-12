/*! Endpoint/model adaptations informed by komf-rs and komf (MIT); see THIRD_PARTY.md. */
import { type Context, type Provider, type MetadataRecord, type Candidate, MetadataError, nativeTitle } from '../model';
import { type Transport, safeUrl } from '../transport';
import { arr, list, obj, str, required, numeric, record, candidate, json, checkId, date, volume, status, idText } from './data';

function linkId(input: string, hosts: string[], expression: RegExp): string {
  const u = new URL(safeUrl(input));
  if (!hosts.includes(u.hostname)) throw new MetadataError('invalid-id', '来源域名不符');
  const match = u.pathname.match(expression);
  if (!match?.[1]) throw new MetadataError('invalid-id', '无法识别来源链接');
  return match[1];
}
function titles(r: MetadataRecord, native: unknown, localized?: unknown): void {
  if (str(native)) r.titles.push({ text: str(native), type: 'native' });
  if (str(localized) && localized !== native) r.titles.push({ text: str(localized), type: 'localized', language: r.provider === 'bangumi' ? 'zh' : undefined });
  if (!r.titles.length) throw new MetadataError('invalid-response', '来源缺少标题');
}
function addCover(r: MetadataRecord, value: unknown, number?: number, language?: string): void {
  if (str(value)) r.covers.push({ url: safeUrl(str(value)), volume: number, language });
}
async function pages(t: Transport, base: string, c: Context): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let page = 0; page < 10; page++) {
    const data = await json(t, `${base}${base.includes('?') ? '&' : '?'}limit=100&offset=${page * 100}`, c.signal);
    const batch = arr(data.data);
    rows.push(...batch);
    if (batch.length < 100 || (typeof data.total === 'number' && rows.length >= data.total)) return rows;
  }
  throw new MetadataError('unavailable', '来源分页超过安全上限，请使用具体单卷 ID');
}
export class Bangumi implements Provider {
  readonly id = 'bangumi'; capabilities = { series: true, volumes: true, volumeMetadata: true, volumeCovers: true };
  constructor(private t: Transport) {}
  async resolveLink(input: string): Promise<string> {
    return numeric(/^\d+$/.test(input) ? input : linkId(input, ['bgm.tv', 'bangumi.tv', 'chii.in'], /^\/subject\/(\d+)/));
  }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const data = await json(this.t, 'https://next.bgm.tv/p1/search/subjects?limit=20', c.signal, { keyword: q, filter: { type: [1] } });
    return arr(data.data).map(v => { const x = obj(v); const id = numeric(idText(x.id)); const images = obj(x.images ?? {}); return candidate(this.id, id, required(x.name), `https://bgm.tv/subject/${id}`, images.common || images.medium || images.large); });
  }
  async get(id: string, c: Context): Promise<MetadataRecord> {
    numeric(id);
    const base = `https://next.bgm.tv/p1/subjects/${id}`;
    const x = await json(this.t, base, c.signal);
    checkId(x.id, id);
    const staff = await pages(this.t, `${base}/staffs/persons`, c);
    const r = record(this.id, id, `https://bgm.tv/subject/${id}`, { subject: x, staff });
    titles(r, x.name, x.nameCN);
    r.summary = str(x.summary) || undefined;
    r.releaseDate = x.airtime ? date(obj(x.airtime).date) : undefined;
    r.volume = x.series === false ? volume(required(x.name)) : undefined;
    r.tags = list(x.tags).map(v => required(obj(v).name));
    addCover(r, x.images && obj(x.images).large, r.volume);
    const roles: Record<number, string> = { 2001: 'writer', 2002: 'penciller', 2003: 'cover', 2007: 'writer', 2009: 'character', 2010: 'writer', 2006: 'translator' };
    for (const v of staff) {
      const row = obj(v), person = obj(row.staff);
      for (const p of list(row.positions)) {
        const position = obj(obj(p).type);
        if (position.id === 2004) r.publisher = required(person.name);
        const role = typeof position.id === 'number' ? roles[position.id] : undefined;
        if (role) r.authors.push({ name: required(person.name), native: required(person.name), localized: str(person.nameCN) || undefined, localizedLanguage: 'zh', role });
      }
    }
    for (const v of list(x.infobox)) {
      const row = obj(v);
      const value = list(row.values).map(v => str(obj(v).v)).filter(Boolean).join(', ');
      if (row.key === 'ISBN' && value) r.isbn = value.replace(/[- ]/g, '');
      if (row.key === '出版社' && value && !r.publisher) r.publisher = value;
      if (['别名', '中文名'].includes(str(row.key)) && value) r.titles.push({ text: value, type: 'alias' });
    }
    if (x.series === true) {
      const relations = await pages(this.t, `${base}/relations?type=1&offprint=true`, c);
      r.books = relations.filter(v => obj(obj(v).relation).id === 1003).map(v => {
        const subject = obj(obj(v).subject), sid = numeric(idText(subject.id));
        const b = record(this.id, sid, `https://bgm.tv/subject/${sid}`, v);
        titles(b, subject.name, subject.nameCN);
        b.volume = volume(required(subject.name));
        addCover(b, subject.images && obj(subject.images).large, b.volume);
        b.warnings = ['关联列表仅含简要信息；选择单卷后读取详情'];
        return b;
      });
    }
    return r;
  }
}
export class MangaUpdates implements Provider {
  readonly id = 'mangaupdates'; capabilities = { series: true, volumes: false };
  constructor(private t: Transport) {}
  async resolveLink(input: string, c: Context): Promise<string> {
    if (/^\d+$/.test(input)) return numeric(input);
    let u = new URL(safeUrl(input));
    if (!['www.mangaupdates.com', 'mangaupdates.com'].includes(u.hostname)) throw new MetadataError('invalid-id', '来源域名不符');
    if (u.pathname === '/series.html') {
      numeric(u.searchParams.get('id') ?? '');
      const response = await this.t.request({ url: u.href }, c.signal);
      u = new URL(response.finalUrl);
      if (!['www.mangaupdates.com', 'mangaupdates.com'].includes(u.hostname) || u.pathname === '/series.html') throw new MetadataError('unavailable', '旧 MU ID 未重定向到现代链接，不能按 base36 猜测');
    }
    const slug = u.pathname.match(/^\/series\/([a-z0-9]+)(?:\/|$)/)?.[1];
    if (!slug || !/^[a-z0-9]{7}$/.test(slug)) throw new MetadataError('invalid-id', '需要现代 MU 七位 base36 链接或 API 数字 ID');
    return numeric(String(parseInt(slug, 36)));
  }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const x = await json(this.t, 'https://api.mangaupdates.com/v1/series/search', c.signal, { search: q.slice(0, 400), perpage: 20, page: 1 });
    return arr(x.results).map(v => { const row = obj(obj(v).record); const images = obj(obj(row.image ?? {}).url ?? {}); return candidate(this.id, numeric(idText(row.series_id)), required(row.title), required(row.url), images.thumb || images.original); });
  }
  async get(id: string, c: Context): Promise<MetadataRecord> {
    numeric(id);
    const x = await json(this.t, `https://api.mangaupdates.com/v1/series/${id}`, c.signal);
    checkId(x.series_id, id);
    const r = record(this.id, id, safeUrl(required(x.url)), x);
    titles(r, x.title);
    r.titles.push(...list(x.associated).map(v => ({ text: required(obj(v).title), type: 'alias' as const })));
    r.summary = str(x.description) || undefined;
    r.genres = list(x.genres).map(v => required(obj(v).genre));
    r.tags = list(x.categories).map(v => required(obj(v).category));
    r.authors = list(x.authors).map(v => { const a = obj(v); return { name: required(a.name), role: str(a.type).toLowerCase() === 'artist' ? 'penciller' : 'writer' }; });
    const publishers = list(x.publishers).map(v => str(obj(v).publisher_name)).filter(Boolean);
    r.publisher = publishers.length ? publishers.join(', ') : undefined;
    const images = obj(obj(x.image ?? {}).url ?? {});
    addCover(r, images.original || images.thumb);
    return r;
  }
}
function bakaCover(value: unknown): string {
  if (!value) return '';
  const x = obj(value);
  if (x.raw) { const raw = obj(x.raw); if (str(raw.url)) return str(raw.url); }
  for (const size of ['x350', 'x250', 'x150']) {
    if (x[size]) { const s = obj(x[size]); const url = str(s.x3) || str(s.x2) || str(s.x1); if (url) return url; }
  }
  return '';
}
export class MangaBaka implements Provider {
  readonly id = 'mangabaka'; capabilities = { series: true, volumes: true, volumeMetadata: false, volumeCovers: true };
  constructor(private t: Transport) {}
  async resolveLink(input: string): Promise<string> { return numeric(/^\d+$/.test(input) ? input : linkId(input, ['mangabaka.org', 'www.mangabaka.org'], /^\/(?:(?:manga|series)\/)?(\d+)(?:\/|$)/)); }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const x = await json(this.t, `https://api.mangabaka.org/v1/series/search?q=${encodeURIComponent(q)}`, c.signal);
    return arr(x.data).map(v => { const row = obj(v); const id = numeric(idText(row.id)); return candidate(this.id, id, str(row.native_title) || str(row.title) || required(list(row.titles).map(v => obj(v).title)[0]), str(row.canonical_url) || `https://mangabaka.org/manga/${id}`, bakaCover(row.cover)); });
  }
  async get(id: string, c: Context): Promise<MetadataRecord> {
    numeric(id);
    const x = obj((await json(this.t, `https://api.mangabaka.org/v1/series/${id}`, c.signal)).data);
    checkId(x.id, id);
    if (x.merged_with) throw new MetadataError('invalid-id', `条目已合并至 ${idText(x.merged_with)}`);
    const r = record(this.id, id, str(x.canonical_url) || `https://mangabaka.org/manga/${id}`, x);
    if (x.native_title || x.title) titles(r, x.native_title || x.title, x.title);
    for (const v of list(x.titles)) {
      const t = obj(v); r.titles.push({ text: required(t.title), language: str(t.language) || undefined, type: t.type === 'native' ? 'native' : 'alias' });
    }
    if (x.secondary_titles) for (const [language, values] of Object.entries(obj(x.secondary_titles))) {
      r.titles.push(...list(values).map(v => ({ text: required(obj(v).title), language: language === 'unknown' ? undefined : language, type: 'alias' as const })));
    }
    if (!r.titles.length) throw new MetadataError('invalid-response', 'MangaBaka 缺少标题');
    r.summary = str(x.description) || undefined;
    r.status = status(x.status); r.language = str(x.original_language) || undefined;
    for (const title of r.titles) if (title.type === 'native' && !title.language) title.language = r.language;
    r.releaseDate = x.published ? date(obj(x.published).start_date) : undefined;
    for (const [field, role] of [['authors', 'writer'], ['artists', 'penciller']] as const) r.authors.push(...list(x[field]).map(v => ({ name: required(v), role })));
    const publishers = list(x.publishers).map(v => str(obj(v).name)).filter(Boolean);
    r.publisher = publishers.length ? publishers.join(', ') : undefined;
    for (const v of list(x.tags_v2)) {
      const tag = obj(v); (tag.is_genre ? r.genres : r.tags).push(required(tag.name_path || tag.name));
    }
    for (const v of list(x.links_v2)) { const link = obj(v); r.links.push({ label: str(link.name_display) || '来源', url: safeUrl(required(link.url)) }); }
    addCover(r, bakaCover(x.cover));
    let next = `https://api.mangabaka.org/v1/series/${id}/images?type=volume`;
    for (let i = 0; i < 10; i++) {
      const images = await json(this.t, next, c.signal);
      for (const v of arr(images.data)) {
        const image = obj(v);
        const n = typeof image.index_numeric === 'number' ? image.index_numeric : /^\d+(?:\.\d+)?$/.test(str(image.index)) ? Number(image.index) : undefined;
        addCover(r, bakaCover(image.image), n, str(image.language) || undefined);
      }
      const n = images.pagination ? str(obj(images.pagination).next) : '';
      if (!n) return r;
      const u = new URL(n, next);
      if (u.origin !== 'https://api.mangabaka.org' || u.pathname !== `/v1/series/${id}/images`) throw new MetadataError('invalid-response', '非法分页链接');
      next = u.href;
    }
    throw new MetadataError('unavailable', '封面分页超过安全上限');
  }
}
export class MangaDex implements Provider {
  readonly id = 'mangadex'; capabilities = { series: true, volumes: true, volumeMetadata: false, volumeCovers: true };
  constructor(private t: Transport) {}
  private validate(id: string): string {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) throw new MetadataError('invalid-id', '需要 MangaDex UUID');
    return id;
  }
  async resolveLink(input: string): Promise<string> { return this.validate(input.includes('://') ? linkId(input, ['mangadex.org', 'www.mangadex.org'], /^\/title\/([^/]+)/) : input); }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const x = await json(this.t, `https://api.mangadex.org/manga?title=${encodeURIComponent(q)}&limit=20&includes[]=cover_art`, c.signal);
    return arr(x.data).map(v => {
      const row = obj(v), id = this.validate(idText(row.id)), title = obj(obj(row.attributes).title);
      const cover = list(row.relationships).map(obj).find(r => r.type === 'cover_art');
      const filename = str(obj(cover?.attributes ?? {}).fileName);
      return candidate(this.id, id, required(title.ja || Object.values(title)[0]), `https://mangadex.org/title/${id}`,
        /^[\w.-]+$/.test(filename) ? `https://uploads.mangadex.org/covers/${id}/${filename}.256.jpg` : undefined);
    });
  }
  async get(id: string, c: Context): Promise<MetadataRecord> {
    this.validate(id);
    const x = obj((await json(this.t, `https://api.mangadex.org/manga/${id}?includes[]=author&includes[]=artist`, c.signal)).data);
    checkId(x.id, id);
    const a = obj(x.attributes), r = record(this.id, id, `https://mangadex.org/title/${id}`, x);
    r.language = str(a.originalLanguage) || undefined;
    for (const entry of [obj(a.title), ...list(a.altTitles).map(obj)]) for (const [language, text] of Object.entries(entry)) {
      r.titles.push({ text: required(text), language, type: language === a.originalLanguage ? 'native' : 'alias' });
    }
    if (!r.titles.length) throw new MetadataError('invalid-response', 'MangaDex 缺少标题');
    r.summary = a.description ? str(obj(a.description)[r.language ?? ''] || obj(a.description).en || Object.values(obj(a.description))[0]) || undefined : undefined;
    r.status = status(a.status);
    r.ageRating = a.contentRating === 'pornographic' || a.contentRating === 'erotica' ? 18 : undefined;
    r.tags = list(a.tags).map(v => { const name = obj(obj(obj(v).attributes).name); return required(name.en || Object.values(name)[0]); });
    for (const v of list(x.relationships)) {
      const rel = obj(v);
      if (['author', 'artist'].includes(str(rel.type))) r.authors.push({ name: required(obj(rel.attributes).name), role: rel.type === 'artist' ? 'penciller' : 'writer' });
    }
    for (let offset = 0; offset < 1000; offset += 100) {
      const covers = await json(this.t, `https://api.mangadex.org/cover?manga[]=${id}&limit=100&offset=${offset}`, c.signal);
      for (const v of arr(covers.data)) {
        const attributes = obj(obj(v).attributes);
        const n = /^\d+(?:\.\d+)?$/.test(str(attributes.volume)) ? Number(attributes.volume) : undefined;
        const filename = required(attributes.fileName);
        if (!/^[\w.-]+$/.test(filename)) throw new MetadataError('invalid-response', '非法封面文件名');
        addCover(r, `https://uploads.mangadex.org/covers/${id}/${filename}`, n, str(attributes.locale) || undefined);
      }
      if (arr(covers.data).length < 100 || (typeof covers.total === 'number' && offset + 100 >= covers.total)) return r;
    }
    throw new MetadataError('unavailable', '封面分页超过安全上限');
  }
}
const aniFields = `id siteUrl countryOfOrigin title { native romaji english } description(asHtml:false) status genres startDate { year month day } coverImage { extraLarge large } staff(perPage:50) { pageInfo { hasNextPage } edges { role node { name { native full } } } }`;
export class AniList implements Provider {
  readonly id = 'anilist'; capabilities = { series: true, volumes: false };
  constructor(private t: Transport) {}
  async resolveLink(input: string): Promise<string> { return numeric(/^\d+$/.test(input) ? input : linkId(input, ['anilist.co', 'www.anilist.co'], /^\/manga\/(\d+)/)); }
  private async query(query: string, variables: unknown, c: Context) {
    const x = await json(this.t, 'https://graphql.anilist.co', c.signal, { query, variables });
    if (x.errors) throw new MetadataError('unavailable', 'AniList 查询失败或条目不可用');
    return obj(x.data);
  }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const data = await this.query('query($q:String){Page(perPage:20){media(search:$q,type:MANGA){id siteUrl title{native romaji english} coverImage{large}}}}', { q }, c);
    return arr(obj(data.Page).media).map(v => { const row = obj(v), t = obj(row.title); return candidate(this.id, numeric(idText(row.id)), required(t.native || t.english || t.romaji), required(row.siteUrl), obj(row.coverImage ?? {}).large); });
  }
  async get(id: string, c: Context): Promise<MetadataRecord> {
    numeric(id);
    const x = obj((await this.query(`query($id:Int){Media(id:$id,type:MANGA){${aniFields}}}`, { id: Number(id) }, c)).Media);
    checkId(x.id, id);
    const r = record(this.id, id, required(x.siteUrl), x), t = obj(x.title);
    if (str(t.native)) r.titles.push({ text: str(t.native), type: 'native', language: ({ JP: 'ja', CN: 'zh', KR: 'ko' } as Record<string, string>)[str(x.countryOfOrigin)] });
    if (str(t.english)) r.titles.push({ text: str(t.english), type: 'localized', language: 'en' });
    if (str(t.romaji)) r.titles.push({ text: str(t.romaji), type: 'alias', language: 'romaji' });
    r.summary = str(x.description) || undefined; r.status = status(x.status); r.genres = list(x.genres).map(required);
    const d = obj(x.startDate);
    if (d.year && d.month && d.day) r.releaseDate = date(`${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`);
    addCover(r, obj(x.coverImage).extraLarge || obj(x.coverImage).large);
    const staff = obj(x.staff);
    for (const v of list(staff.edges)) {
      const e = obj(v), n = obj(obj(e.node).name), role = str(e.role);
      r.authors.push({ name: required(n.native || n.full), native: str(n.native) || undefined, localized: str(n.full) || undefined, role: /art/i.test(role) ? 'penciller' : /translat/i.test(role) ? 'translator' : 'writer' });
    }
    if (obj(staff.pageInfo).hasNextPage) r.warnings = ['人物超过 50 条，本次详情不完整'];
    return r;
  }
}
export class MAL implements Provider {
  readonly id = 'mal'; capabilities = { series: true, volumes: false, authentication: true };
  constructor(private t: Transport) {}
  async resolveLink(input: string): Promise<string> { return numeric(/^\d+$/.test(input) ? input : linkId(input, ['myanimelist.net', 'www.myanimelist.net'], /^\/manga\/(\d+)/)); }
  private headers(c: Context): Record<string, string> {
    if (!c.credentials.malClientId?.trim()) throw new MetadataError('authentication-required', 'MAL 需要自行填写 Client ID');
    return { 'X-MAL-CLIENT-ID': c.credentials.malClientId.trim() };
  }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const x = await json(this.t, `https://api.myanimelist.net/v2/manga?q=${encodeURIComponent(q)}&limit=20`, c.signal, undefined, this.headers(c));
    return arr(x.data).map(v => { const row = obj(obj(v).node), id = numeric(idText(row.id)), image = obj(row.main_picture ?? {}); return candidate(this.id, id, required(row.title), `https://myanimelist.net/manga/${id}`, image.medium || image.large); });
  }
  async get(id: string, c: Context): Promise<MetadataRecord> {
    numeric(id);
    const fields = 'alternative_titles,synopsis,status,genres,authors{first_name,last_name},start_date,main_picture';
    const x = await json(this.t, `https://api.myanimelist.net/v2/manga/${id}?fields=${fields}`, c.signal, undefined, this.headers(c));
    checkId(x.id, id);
    const r = record(this.id, id, `https://myanimelist.net/manga/${id}`, x);
    const alt = x.alternative_titles ? obj(x.alternative_titles) : {};
    titles(r, alt.ja || x.title, x.title);
    if (str(alt.ja)) r.titles[0]!.language = 'ja';
    if (str(alt.en)) r.titles.push({ text: str(alt.en), type: 'localized', language: 'en' });
    r.titles.push(...list(alt.synonyms).map(v => ({ text: required(v), type: 'alias' as const })));
    r.summary = str(x.synopsis) || undefined; r.status = status(x.status); r.releaseDate = date(x.start_date);
    r.genres = list(x.genres).map(v => required(obj(v).name));
    r.authors = list(x.authors).map(v => { const a = obj(v), n = obj(a.node); return { name: required([str(n.last_name), str(n.first_name)].filter(Boolean).join(' ')), role: /art/i.test(str(a.role)) ? 'penciller' : 'writer' }; });
    addCover(r, x.main_picture && (obj(x.main_picture).large || obj(x.main_picture).medium));
    return r;
  }
}
export class ComicVine implements Provider {
  readonly id = 'comicvine'; capabilities = { series: true, volumes: true, volumeMetadata: true, volumeCovers: true, authentication: true };
  constructor(private t: Transport) {}
  async resolveLink(input: string): Promise<string> {
    const id = input.includes('://') ? linkId(input, ['comicvine.gamespot.com'], /\/(40(?:00|50)-\d+)(?:\/|$)/) : input;
    if (!/^(?:4000|4050)-[1-9]\d*$/.test(id)) throw new MetadataError('invalid-id', '需要 ComicVine 卷 4050-ID 或期 4000-ID');
    return id;
  }
  private async api(path: string, c: Context) {
    if (!c.credentials.comicVineKey?.trim()) throw new MetadataError('authentication-required', 'ComicVine 需要自行填写 API Key');
    const u = new URL(`https://comicvine.gamespot.com/api/${path}`);
    u.searchParams.set('api_key', c.credentials.comicVineKey.trim()); u.searchParams.set('format', 'json');
    const x = await json(this.t, u.href, c.signal);
    if (x.status_code !== 1) throw new MetadataError(x.status_code === 100 ? 'authentication-required' : 'unavailable', 'ComicVine 拒绝查询');
    return x;
  }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const x = await this.api(`search/?resources=volume&limit=20&query=${encodeURIComponent(q)}`, c);
    return arr(x.results).map(v => { const row = obj(v), image = obj(row.image ?? {}); return candidate(this.id, `4050-${numeric(idText(row.id))}`, required(row.name), required(row.site_detail_url), image.small_url || image.super_url || image.original_url); });
  }
  async get(id: string, c: Context): Promise<MetadataRecord> {
    await this.resolveLink(id);
    const issue = id.startsWith('4000-'), x = obj((await this.api(`${issue ? 'issue' : 'volume'}/${id}/`, c)).results);
    checkId(x.id, id.split('-')[1]!);
    const r = record(this.id, id, required(x.site_detail_url), x);
    titles(r, str(x.name) || (issue ? `Issue ${required(x.issue_number)}` : ''));
    r.summary = str(x.description) || str(x.deck) || undefined;
    if (x.publisher) r.publisher = str(obj(x.publisher).name) || undefined;
    if (issue) {
      r.volume = /^\d+(?:\.\d+)?$/.test(str(x.issue_number)) ? Number(x.issue_number) : undefined;
      r.releaseDate = date(x.store_date || x.cover_date);
      r.authors = list(x.person_credits).map(v => { const p = obj(v); return { name: required(p.name), role: /pencil|art/i.test(str(p.role)) ? 'penciller' : 'writer' }; });
    } else {
      r.books = list(x.issues).map(v => {
        const i = obj(v), iid = `4000-${numeric(idText(i.id))}`;
        const b = record(this.id, iid, required(i.site_detail_url), i);
        titles(b, str(i.name) || `Issue ${required(i.issue_number)}`);
        b.volume = /^\d+(?:\.\d+)?$/.test(str(i.issue_number)) ? Number(i.issue_number) : undefined;
        b.warnings = ['选择具体期 ID 后读取详情'];
        return b;
      });
    }
    addCover(r, x.image && (obj(x.image).original_url || obj(x.image).super_url), r.volume);
    return r;
  }
}
