/*! HTML selector adaptations informed by komf (MIT); see THIRD_PARTY.md. */
import { type Provider, type Context, type Candidate, type MetadataRecord, MetadataError } from '../model';
import { type Transport, safeUrl } from '../transport';
import { arr, obj, str, required, numeric, record, candidate, json, checkId, volume, date } from './data';

export function documentOf(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'text/html');
  doc.querySelectorAll('script:not([type="application/ld+json"]),style,iframe,object,embed').forEach(e => e.remove());
  return doc;
}
export function plain(text: string): string { return documentOf(text).body.textContent?.trim() ?? ''; }
function text(doc: ParentNode, selector: string): string { return doc.querySelector(selector)?.textContent?.trim() ?? ''; }
function meta(doc: ParentNode, name: string): string { return doc.querySelector(`meta[property="${name}"]`)?.getAttribute('content') ?? ''; }
function href(value: string, base: string): string { return safeUrl(new URL(value, base).href); }
function image(r: MetadataRecord, value: string): void { if (value) r.covers.push({ url: href(value, r.url), volume: r.volume }); }
function known(doc: Document, selector: string): void {
  if (!doc.querySelector(selector)) throw new MetadataError('invalid-response', '页面结构变化或来源拦截，请使用具体链接重试');
}
const vizPath = /^\/manga-books\/manga\/[\w.-]+(?:\/product\/[1-9]\d*)?(?:\/(?:digital|paperback|hardcover))?\/?$/;
export class EHentai implements Provider {
  readonly id = 'ehentai'; capabilities = { series: false, volumes: true, gallery: true, volumeMetadata: false };
  constructor(private t: Transport) {}
  private config(c: Context): { host: string; cookie?: string } {
    const auth = c.credentials.exhentai;
    if (!auth?.enabled) return { host: 'e-hentai.org' };
    if (!/^\d+$/.test(auth.memberId) || !/^[a-z0-9]+$/i.test(auth.passHash) || (auth.igneous && !/^[a-z0-9]+$/i.test(auth.igneous))) throw new MetadataError('authentication-required', 'ExH 需要有效的本地登录 Cookie 配置');
    return { host: 'exhentai.org', cookie: `ipb_member_id=${auth.memberId}; ipb_pass_hash=${auth.passHash}${auth.igneous ? `; igneous=${auth.igneous}` : ''}` };
  }
  async resolveLink(input: string, c: Context): Promise<string> {
    const { host } = this.config(c);
    if (/^[1-9]\d*:[a-f0-9]{10}$/i.test(input)) return input.toLowerCase();
    const u = new URL(safeUrl(input));
    if (!['e-hentai.org', 'exhentai.org'].includes(u.hostname)) throw new MetadataError('invalid-id', 'EH 域名不符');
    if (u.hostname === 'exhentai.org' && host !== 'exhentai.org') throw new MetadataError('authentication-required', '请明确启用并配置 ExH');
    const m = u.pathname.match(/^\/g\/([1-9]\d*)\/([a-f0-9]{10})\/?$/i);
    if (!m) throw new MetadataError('invalid-id', 'EH 需要 gid:token 或完整画廊链接');
    return `${numeric(m[1]!)}:${m[2]!.toLowerCase()}`;
  }
  async search(q: string, c: Context): Promise<Candidate[]> {
    const config = this.config(c), base = `https://${config.host}/`;
    const response = await this.t.request({ url: `${base}?f_search=${encodeURIComponent(q)}`, cookie: config.cookie }, c.signal);
    const doc = documentOf(response.text);
    known(doc, '.itg, #searchbox, #searchnav, .searchtext');
    const found = new Map<string, Candidate>();
    for (const a of doc.querySelectorAll<HTMLAnchorElement>('a[href]')) {
      const u = new URL(a.getAttribute('href')!, base);
      const m = u.pathname.match(/^\/g\/([1-9]\d*)\/([a-f0-9]{10})\/?$/i);
      if (m && ['e-hentai.org', 'exhentai.org'].includes(u.hostname)) {
        const name = a.textContent?.trim() || a.querySelector('img')?.getAttribute('alt');
        if (name) found.set(`${m[1]}:${m[2]}`, candidate(this.id, `${m[1]}:${m[2]}`, name, u.href));
      }
    }
    return [...found.values()].slice(0, 25);
  }
  async get(input: string, c: Context): Promise<MetadataRecord> {
    const id = await this.resolveLink(input, c), config = this.config(c);
    const [gid, token] = id.split(':');
    const response = await this.t.request({
      url: 'https://api.e-hentai.org/api.php', method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ method: 'gdata', gidlist: [[Number(gid), token]], namespace: 1 }),
      cookie: config.cookie
    }, c.signal);
    let data: unknown;
    try { data = JSON.parse(response.text); } catch { throw new MetadataError('invalid-response', 'EH 返回非 JSON'); }
    const x = obj(arr(obj(data).gmetadata)[0]);
    if (x.error) throw new MetadataError('unavailable', `EH 条目不可用：${plain(str(x.error))}`);
    checkId(x.gid, gid!);
    if (x.token !== token) throw new MetadataError('invalid-id', 'EH token 不符');
    const r = record(this.id, id, `https://${config.host}/g/${gid}/${token}/`, x);
    r.titles.push({ text: required(x.title_jpn || x.title), type: 'native' });
    if (str(x.title) && x.title !== x.title_jpn) r.titles.push({ text: str(x.title), type: 'localized' });
    r.tags = arr(x.tags).map(required);
    r.genres = str(x.category) ? [str(x.category)] : [];
    r.authors = r.tags.filter(t => t.startsWith('artist:') || t.startsWith('group:')).map(t => ({ name: t.slice(t.indexOf(':') + 1), role: t.startsWith('artist:') ? 'penciller' : 'writer' }));
    const language = r.tags.find(t => t.startsWith('language:'))?.slice(9);
    const languages: Record<string, string> = { japanese: 'ja', english: 'en', chinese: 'zh', korean: 'ko', french: 'fr', spanish: 'es' };
    r.language = language ? languages[language] : undefined;
    image(r, str(x.thumb));
    r.warnings = ['EH 封面为来源缩略图；上传日期不是发行日；系列状态未知'];
    return r;
  }
}
export class HTMLSource implements Provider {
  capabilities: { series: boolean; volumes: boolean; volumeMetadata: boolean; volumeCovers: boolean };
  constructor(public id: 'viz' | 'yenpress' | 'webtoons', private t: Transport) {
    this.capabilities = { series: id !== 'viz', volumes: id !== 'webtoons', volumeMetadata: id !== 'webtoons', volumeCovers: id !== 'webtoons' };
  }
  private get base(): string { return this.id === 'viz' ? 'https://www.viz.com' : this.id === 'yenpress' ? 'https://yenpress.com' : 'https://www.webtoons.com'; }
  async resolveLink(input: string): Promise<string> {
    const u = new URL(input.includes('://') ? safeUrl(input) : href(input, this.base));
    const host = new URL(this.base).hostname;
    if (u.hostname !== host && u.hostname !== host.replace(/^www\./, '')) throw new MetadataError('invalid-id', '来源域名不符');
    if (this.id === 'viz' && vizPath.test(u.pathname)) return u.pathname.replace(/\/$/, '');
    if (this.id === 'yenpress' && /^\/(?:series|titles)\/[\w-]+\/?$/.test(u.pathname)) return u.pathname.replace(/\/$/, '');
    if (this.id === 'webtoons' && /^\/[a-z-]+\/[^?]+\/list$/.test(u.pathname)) {
      const no = numeric(u.searchParams.get('title_no') ?? u.searchParams.get('titleNo') ?? '');
      return `${u.pathname}?title_no=${no}`;
    }
    throw new MetadataError('invalid-id', '需要该来源的作品完整链接');
  }
  async search(q: string, c: Context): Promise<Candidate[]> {
    if (this.id === 'yenpress') {
      const source = await this.t.request({ url: `${this.base}/search` }, c.signal);
      const key = source.text.match(/"search_key"\s*:\s*"(search-[\w-]+)"/)?.[1];
      if (!key) throw new MetadataError('unavailable', 'YenPress 公开搜索配置已变化，可粘贴作品链接');
      const x = await json(this.t, 'https://enterprise-search.yenpress.com/api/as/v1/engines/yenpress/search.json', c.signal,
        { query: q, filters: { all: [{ type: 'series' }] }, page: { size: 20, current: 1 } }, { Authorization: `Bearer ${key}` });
      return Promise.all(arr(x.results).map(async v => {
        const row = obj(v), url = required(obj(row.url).raw), id = await this.resolveLink(url);
        return candidate(this.id, id, required(obj(row.title).raw), href(id, this.base));
      }));
    }
    if (this.id === 'webtoons') {
      const results: Candidate[] = [];
      for (const type of ['WEBTOON', 'CHALLENGE']) {
        const x = await json(this.t, `https://m.webtoons.com/undefined/search/result?keyword=${encodeURIComponent(q)}&searchType=${type}&start=1`, c.signal, undefined, { Referer: 'https://m.webtoons.com' });
        if (x.success !== true) throw new MetadataError('unavailable', 'Webtoons 拒绝搜索');
        const result = obj(x.result), value = result[type === 'WEBTOON' ? 'webtoonResult' : 'challengeResult'];
        if (!value) throw new MetadataError('invalid-response', 'Webtoons 搜索结构变化');
        for (const v of arr(obj(value).titleList)) {
          const row = obj(v);
          const titleNo = numeric(String(row.titleNo ?? ''));
          const group = str(row.titleGroupName) || plain(required(row.title)).toLowerCase().replace(/[`~!@#$%^&*|\\'" ;:/?({[\]})]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || '_';
          const genre = type === 'CHALLENGE' ? 'canvas' : str(row.representGenre);
          if (!genre || !/^[\w-]+$/.test(genre)) throw new MetadataError('invalid-response', 'Webtoons 缺少类型，不能构造作品链接');
          const rawUrl = str(row.titleUrl) || str(row.url) || `${this.base}/en/${genre.toLowerCase()}/${encodeURIComponent(group)}/list?title_no=${titleNo}`;
          const id = await this.resolveLink(rawUrl);
          results.push(candidate(this.id, id, required(row.title || row.titleName), href(id, this.base)));
        }
      }
      return results;
    }
    const response = await this.t.request({ url: `${this.base}/search?search=${encodeURIComponent(q)}&category=Manga` }, c.signal);
    const doc = documentOf(response.text);
    known(doc, '#results');
    const results = new Map<string, Candidate>();
    for (const a of doc.querySelectorAll<HTMLAnchorElement>('#results a[href*="/manga-books/manga/"]')) {
      const name = a.textContent?.trim();
      const path = new URL(a.getAttribute('href')!, this.base).pathname;
      if (name && vizPath.test(path)) {
        const id = await this.resolveLink(href(path, this.base));
        results.set(id, candidate(this.id, id, name, href(id, this.base)));
      }
    }
    return [...results.values()].slice(0, 20);
  }
  async get(input: string, c: Context): Promise<MetadataRecord> {
    const id = await this.resolveLink(input), url = href(id, this.base);
    const response = await this.t.request({ url, headers: this.id === 'webtoons' ? { Referer: 'https://www.webtoons.com/en' } : undefined }, c.signal);
    const doc = documentOf(response.text), r = record(this.id, id, url, { htmlUrl: response.finalUrl });
    const canonical = meta(doc, 'og:url') || doc.querySelector('link[rel="canonical"]')?.getAttribute('href');
    if (canonical) {
      const resolved = await this.resolveLink(href(canonical, this.base));
      const same = this.id === 'webtoons' ? new URL(resolved, this.base).searchParams.get('title_no') === new URL(id, this.base).searchParams.get('title_no') : resolved === id;
      if (!same) throw new MetadataError('invalid-id', '页面重定向到不同作品');
    }
    const selector = this.id === 'viz' ? '#purchase_links_block h2' : this.id === 'yenpress' ? '.heading-content .heading, h1' : 'h1.subj, h3.subj';
    known(doc, selector);
    if (this.id === 'yenpress') doc.querySelector(selector)?.querySelectorAll('sup[rel="nofollow"]').forEach(e => e.remove());
    const title = required(text(doc, selector));
    r.titles.push({ text: title, type: 'native' });
    r.volume = this.id === 'webtoons' || id.startsWith('/series/') ? undefined : volume(title);
    r.summary = text(doc, this.id === 'webtoons' ? '#_asideDetail p.summary' : this.id === 'yenpress' ? '.content-heading-txt p.paragraph, .book-info .content-heading-txt, .series-description' : '#product_row .description, #product_row .o_summary, #product_row .text-spacing') || meta(doc, 'og:description') || undefined;
    image(r, meta(doc, 'og:image') || doc.querySelector('#product_image_block img, .series-cover img')?.getAttribute('data-src') || doc.querySelector('#product_image_block img, .series-cover img')?.getAttribute('src') || '');
    r.publisher = this.id === 'viz' ? 'VIZ Media' : this.id === 'yenpress' ? 'Yen Press' : undefined;
    r.genres = [...doc.querySelectorAll(this.id === 'webtoons' ? '.detail_header .genre' : '.genres a, .book-details .txt-hold a')].map(e => e.textContent?.trim() ?? '').filter(Boolean);
    if (this.id === 'viz') {
      r.genres = [...doc.querySelectorAll('#purchase_links_block > div:first-child a:not(.bg-yellow)')].map(e => e.textContent?.trim() ?? '').filter(Boolean);
      for (const strong of doc.querySelectorAll('#product_row strong')) {
        const label = strong.textContent?.trim() ?? '', content = strong.parentElement?.textContent?.trim() ?? '';
        if (/^Story.*by$|^Art by$/.test(label)) {
          for (const part of content.split(/,\s*(?=(?:Story|Art))/)) {
            const match = part.match(/^(Story and Art by|Story by|Art by)\s+(.+)$/);
            if (match) {
              if (match[1]!.includes('Story')) r.authors.push({ name: match[2]!, role: 'writer' });
              if (match[1]!.includes('Art')) r.authors.push({ name: match[2]!, role: 'penciller' });
            }
          }
        }
        if (label === 'Age Rating') {
          const ratings: Record<string, number> = { 'All Ages': 0, Teen: 13, 'Teen Plus': 16, Mature: 18 };
          r.ageRating = ratings[content.replace(/^Age Rating\s*/, '')];
        }
      }
    }
    if (this.id === 'webtoons') {
      const day = text(doc, '#_asideDetail p.day_info');
      if (/COMPLETED|END|TERMINÉ/i.test(day)) r.status = 'ENDED';
      else if (/EVERY|UP|NOUVEAU/i.test(day)) r.status = 'ONGOING';
      const authors = doc.querySelectorAll('.detail_header .author');
      r.authors = [...authors].map((e, i) => ({ name: required(e.textContent?.trim()), role: i === 0 ? 'writer' : 'penciller' }));
      if (!authors.length) {
        const author = text(doc, '.detail_header .author_area');
        if (author) r.authors.push({ name: author, role: 'writer' });
      }
    } else {
      const details = doc.body.textContent ?? '';
      const isbn = text(doc, '.o_isbn13, .o_eisbn13') || details.match(/ISBN(?:-13)?\s*:?\s*([\d-]{13,17})/)?.[1];
      if (isbn) r.isbn = isbn.replace(/^(?:e?ISBN-13|ISBN)\s*:?\s*/i, '').replace(/[^0-9X]/g, '');
      const d = text(doc, '.o_release-date').replace(/^Release\s*/, '') || details.match(/Release Date\s*:?\s*([A-Za-z]+ \d{1,2}, \d{4})/)?.[1];
      if (d && !Number.isNaN(Date.parse(d))) {
        const parsed = new Date(d);
        r.releaseDate = date(`${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`);
      }
      const authorElements = this.id === 'yenpress' ? [...doc.querySelector('.heading-content .story-details, .story-details')?.children ?? []] : [...doc.querySelectorAll('.o_author')];
      for (const e of authorElements) {
        const name = e.textContent?.trim() ?? '', match = name.match(/^(?:Story and Art by|Story by|Art by|Author|Artist|Illustrated by|Translated by)\s*:?\s+(.+)$/i);
        if (match) r.authors.push({ name: match[1]!, role: /art|illustrat/i.test(name) ? 'penciller' : /translat/i.test(name) ? 'translator' : 'writer' });
      }
      if (this.id === 'yenpress' && id.startsWith('/series/')) {
        const books = new Map<string, MetadataRecord>();
        let next = `${this.base}/series/get_more/${id.slice('/series/'.length)}?next_ord=99999`;
        for (let page = 0; page < 10; page++) {
          const response = await this.t.request({ url: next, headers: { 'X-Requested-With': 'XMLHttpRequest' } }, c.signal);
          const pageDoc = documentOf(response.text);
          known(pageDoc, '.inline_block, .no-results, .no-books');
          for (const a of pageDoc.querySelectorAll<HTMLAnchorElement>('.inline_block a[href^="/titles/"]')) {
            const name = a.textContent?.trim();
            if (!name) continue;
            const bid = await this.resolveLink(href(a.getAttribute('href')!, this.base));
            const b = record(this.id, bid, href(bid, this.base), { relationUrl: url });
            b.titles = [{ text: name, type: 'native' }]; b.volume = volume(name);
            const cover = a.querySelector('img');
            image(b, cover?.getAttribute('data-src') || cover?.getAttribute('src') || '');
            b.warnings = ['卷列表仅含简要信息；选择具体卷读取详情'];
            books.set(bid, b);
          }
          const more = pageDoc.querySelector('.show-more')?.getAttribute('data-url');
          if (!more) break;
          const u = new URL(more, next);
          if (u.origin !== this.base || u.pathname !== `/series/get_more/${id.slice('/series/'.length)}` || !/^\d+$/.test(u.searchParams.get('next_ord') ?? '')) throw new MetadataError('invalid-response', '非法卷列表分页');
          next = u.href;
          if (page === 9) throw new MetadataError('unavailable', '卷列表超过分页安全上限');
        }
        r.books = [...books.values()];
        const featuredVolume = volume(text(doc, '.series-cover p'));
        if (featuredVolume !== undefined && r.covers[0]) r.covers[0].volume = featuredVolume;
        r.warnings = ['系列简介来自当前精选卷；发行日、ISBN 等请读取具体卷。封面精选卷号不代表数组顺序。'];
      }
    }
    return r;
  }
}
