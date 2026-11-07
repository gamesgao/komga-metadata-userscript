function list(value) {
  if (value == null || value === '') return [];
  if (Array.isArray(value)) return value;
  const parsed = JSON.parse(value);
  if (parsed === null) return [];
  if (!Array.isArray(parsed)) throw new Error('Expected JSON array in source database');
  return parsed;
}
function base(provider, id, url, raw) {
  return { provider, id: String(id), url, titles: [], tags: [], genres: [], authors: [], covers: [], links: [{ label: provider, url }], raw };
}
function title(record, text, type = 'native', language) {
  if (typeof text === 'string' && text.trim() && !record.titles.some(t => t.text === text))
    record.titles.push({ text, type, ...(language ? { language } : {}) });
}
function optional(record, field, value) {
  if (value !== null && value !== undefined && value !== '') record[field] = value;
}
function sourceDate(value) {
  if (typeof value !== 'string') return undefined;
  const match = value.match(/^(\d{4})[-/年](\d{1,2})[-/月](\d{1,2})(?:日|T.*)?$/);
  if (!match) return undefined;
  const iso = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`;
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.valueOf()) || date.toISOString().slice(0, 10) !== iso ? undefined : iso;
}
function addAuthor(record, name, role) {
  if (typeof name !== 'string' || !name.trim()) return;
  if (!record.authors.some(a => a.name === name && a.role === role)) record.authors.push({ name, role });
}
function cover(record, url, volume) {
  if (typeof url === 'string' && /^https?:\/\//i.test(url))
    record.covers.push({ url, ...(Number.isFinite(volume) ? { volume } : {}) });
}
function infobox(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return [];
  const items = [];
  const re = /^\|([^=\n]+)=([\s\S]*?)(?=^\|[^=\n]+=|^\}\}|$)/gm;
  for (const m of value.matchAll(re)) {
    const raw = m[2].trim();
    const values = [...raw.matchAll(/\[([^\]]+)\]/g)].map(x => {
      const parts = x[1].split('|');
      return parts.at(-1).trim();
    });
    items.push({ key: m[1].trim(), value: values.length ? values : raw });
  }
  return items;
}

export function bangumi(subject, persons = [], relations = [], books = []) {
  const id = String(subject.id);
  // Keep person identity/roles/infobox, not a publisher biography repeated in every volume.
  const rawPersons = persons.map(p => ({ ...p, person: p.person ? { ...p.person, summary: undefined } : p.person }));
  const r = base('bangumi', id, `https://bgm.tv/subject/${encodeURIComponent(id)}`, { subject, persons: rawPersons, relations });
  title(r, subject.name);
  title(r, subject.name_cn ?? subject.nameCN, 'localized', 'zh');
  for (const item of infobox(subject.infobox)) {
    const values = Array.isArray(item.value) ? item.value.map(v => typeof v === 'string' ? v : v?.v) : [item.value];
    if (/^(别名|別名|alias)$/i.test(item.key ?? '')) for (const v of values) title(r, v, 'alias');
    if (/^(出版社|publisher)$/i.test(item.key ?? '')) optional(r, 'publisher', values[0]);
    if (/^(发售日|発売日)$/i.test(item.key ?? '')) optional(r, 'releaseDate', values[0]);
    if (/^ISBN(?:-1[03])?$/i.test(item.key ?? '')) optional(r, 'isbn', values[0]);
    const role = { 作者: 'writer', 作画: 'penciller', 原作: 'writer', 插画: 'penciller', 插圖: 'penciller', 翻译: 'translator', 譯者: 'translator' }[item.key];
    if (role) for (const v of values) addAuthor(r, v, role);
  }
  const roles = { 2001: 'writer', 2002: 'penciller', 2003: 'cover', 2006: 'translator', 2007: 'writer', 2009: 'character', 2010: 'writer' };
  for (const p of persons) {
    const role = roles[p.relation?.position];
    if (role) addAuthor(r, p.person?.name, role);
    // Publisher, serialization magazine and agents aren't authors.
    if (p.relation?.position === 2004 && !r.publisher) optional(r, 'publisher', p.person?.name);
  }
  r.tags = (subject.tags ?? []).map(t => typeof t === 'string' ? t : t.name).filter(Boolean);
  optional(r, 'summary', subject.summary);
  const releaseDate = sourceDate(subject.date) || sourceDate(r.releaseDate);
  delete r.releaseDate;
  optional(r, 'releaseDate', releaseDate);
  if (subject.series === false) {
    const match = String(subject.name ?? '').match(/第\s*(\d+(?:\.\d+)?)\s*巻|(?:vol(?:ume)?\.?\s*|[（(])(\d+(?:\.\d+)?)(?:[）)]|\b)/i);
    if (match) r.volume = Number(match[1] ?? match[2]);
  }
  if (books.length) r.books = books;
  return r;
}

export function ehentai(row, tags) {
  const gid = String(row.gid), token = String(row.token ?? '').toLowerCase();
  if (!/^[1-9]\d*$/.test(gid) || !/^[a-f0-9]{10}$/.test(token))
    throw new Error(`Invalid E-Hentai gid or token: ${gid}`);
  const id = `${gid}:${token}`;
  const r = base('ehentai', id, `https://e-hentai.org/g/${gid}/${token}/`, { gallery: row, tags });
  title(r, row.title_jpn || row.title); title(r, row.title, 'alias');
  r.tags = tags.map(t => t.name);
  if (row.category) r.genres.push(row.category);
  r.authors = r.tags.filter(tag => /^(artist|group):/.test(tag)).map(tag => ({
    name: tag.slice(tag.indexOf(':') + 1), role: tag.startsWith('artist:') ? 'penciller' : 'writer'
  }));
  const language = r.tags.find(tag => tag.startsWith('language:'))?.slice(9);
  optional(r, 'language', { japanese: 'ja', english: 'en', chinese: 'zh', korean: 'ko', french: 'fr', spanish: 'es' }[language]);
  cover(r, row.thumb);
  return r;
}

export function mangabaka(row, relatedTags = []) {
  const id = String(row.id);
  const r = base('mangabaka', id, row.canonical_url || `https://mangabaka.org/manga/${id}`, { series: row, tags: relatedTags });
  for (const t of list(row.titles)) title(r, t.title, t.language === row.original_language ? 'native' : 'alias', t.language);
  if (r.titles.length && !r.titles.some(t => t.type === 'native')) r.titles[0].type = 'native';
  for (const [field, role] of [['authors', 'writer'], ['artists', 'penciller']])
    for (const name of list(row[field])) if (typeof name === 'string') r.authors.push({ name, role });
  const tags = list(row.tags_v2);
  for (const tag of [...tags, ...relatedTags]) {
    const name = tag.name_path || tag.name;
    if (name && !r.tags.includes(name)) (tag.is_genre ? r.genres : r.tags).push(name);
  }
  for (const link of list(row.links_v2)) if (link.url) r.links.push({ label: link.name_display || link.name || 'source', url: link.url });
  const publishers = list(row.publishers);
  optional(r, 'publisher', publishers[0]?.name);
  optional(r, 'summary', row.description); optional(r, 'language', row.original_language);
  optional(r, 'releaseDate', sourceDate(row.published_start_date));
  const status = { RELEASING: 'ONGOING', COMPLETED: 'ENDED', HIATUS: 'HIATUS', CANCELLED: 'ABANDONED' }[String(row.status ?? '').toUpperCase()];
  optional(r, 'status', status);
  cover(r, row.cover_raw_url || row.cover_x350_x1);
  return r;
}

function imageUrl(id) {
  if (!id || id.length < 6) return undefined;
  return `https://img.sos-dan.net/600/${id.slice(0, 3)}/${id[3]}/${id[4]}/${id.slice(5)}.webp`;
}
const roles = ['contributor','writer','penciller','illustrator','unknown-4','unknown-5','colorist','letterer','editor','translator','narrator','original author','character design','adaptation','compilation','consulting editor','cover design','creator','designer','coordination','idea','unknown-21','producer','script','text','with'];
export function bookwalkerBook(row, contributors, externalIds, image) {
  const id = String(row.id);
  const kind = row.level === 3 ? 'chapter' : 'volume';
  const url = `https://bookwalker.com/${kind}/${String(row.content_id ?? id).replace(/^CNT_/, '')}`;
  const r = base('bookwalker', id, url, { product: row, contributors, externalIds, image });
  title(r, row.display_title || row.title); title(r, row.title, 'alias');
  for (const t of list(row.alt_titles)) title(r, t, 'alias');
  optional(r, 'summary', row.description); optional(r, 'releaseDate', sourceDate(row.on_sale_at));
  if (row.level === 2) {
    const text = `${row.title ?? ''} ${row.display_title ?? ''}`;
    const match = text.match(/第\s*(\d+(?:\.\d+)?)\s*巻|(?:vol(?:ume)?\.?)\s*(\d+(?:\.\d+)?)/i);
    if (match) r.volume = Number(match[1] ?? match[2]);
  }
  optional(r, 'isbn', externalIds.find(x => x.type === 3)?.external_id);
  r.authors = contributors.filter(c => c.name_override || c.name).map(c => ({
    name: c.name_override || c.name, role: roles[c.role] ?? `role-${c.role}`,
    ...(c.name_alt ? { localized: c.name_alt } : {})
  }));
  cover(r, imageUrl(image?.id), r.volume);
  return r;
}
export function bookwalker(row, tags, image, books) {
  const id = String(row.id);
  const r = base('bookwalker', id, `https://bookwalker.com/series/${id.replace(/^CNT_/, '')}`, { series: row, tags, image });
  title(r, row.title); title(r, row.display_title, 'alias');
  for (const t of list(row.alt_titles)) title(r, t, 'alias');
  r.tags = tags.map(t => t.name).filter(Boolean);
  optional(r, 'summary', row.description);
  // listed_at is catalogue ingestion, not the work's release date.
  for (const book of books) for (const author of book.authors ?? []) addAuthor(r, author.name, author.role);
  cover(r, imageUrl(image?.id));
  if (books.length) r.books = books;
  return r;
}
