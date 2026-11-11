import type { AcceptedLanguage, MetadataRecord, Title } from './model';
import { mappedFields, normalizeWriteFields } from './plan';
// Ordered defaults; `unknown` is accepted only as a legacy persisted value.
export const allLanguages: AcceptedLanguage[] = ['zh', 'ja', 'en', 'romaji', 'other'];
export const languageLabels: Record<AcceptedLanguage, string> = { en: '英文 EN', ja: '日文 JP', zh: '中文 ZH / CH', romaji: '罗马字 Romaji', unknown: '其他语言', other: '其他语言' };
export function normalizeLanguages(values: AcceptedLanguage[]): AcceptedLanguage[] {
  return [...new Set(values.map(v => v === 'unknown' ? 'other' : v).filter(v => allLanguages.includes(v)))];
}
export function languagePreferences(enabled = allLanguages, priority?: AcceptedLanguage[]) {
  const order = normalizeLanguages([...(priority ?? allLanguages), ...allLanguages]);
  const accepted = normalizeLanguages(enabled);
  return { order, accepted: order.filter(v => accepted.includes(v)) };
}
export function wantsChineseTags(languages: AcceptedLanguage[]): boolean {
  // The dictionary supplies Chinese; the original EH taxonomy is English.
  const preferred = normalizeLanguages(languages).find(v => v === 'zh' || v === 'en');
  return preferred === 'zh';
}
export function languageOf(text: string, explicit?: string): AcceptedLanguage {
  const code = explicit?.trim().toLowerCase().replace(/_/g, '-');
  if (code && /^(romaji|ja-latn|ja-ro|jp-ro|romanized|romanised)$/.test(code)) return 'romaji';
  if (code && /^(ja|jp|jpn|japanese)(-|$)/.test(code)) return 'ja';
  if (code && /^(zh|ch|zho|chi|chinese)(-|$)/.test(code)) return 'zh';
  if (code && /^(en|eng|english)(-|$)/.test(code)) return 'en';
  if (code && !['und', 'unknown', 'zxx'].includes(code)) return 'other';
  // Kana is identifying evidence; Han alone and Latin names remain in Other.
  return /[\u3040-\u30ff]/u.test(text) ? 'ja' : 'other';
}
export function languageRank(text: string, code: string | undefined, languages: AcceptedLanguage[]): number {
  const rank = normalizeLanguages(languages).indexOf(languageOf(text, code));
  return rank < 0 ? Infinity : rank;
}
export function accepted(text: string, code: string | undefined, languages: AcceptedLanguage[]): boolean { return Number.isFinite(languageRank(text, code, languages)); }
export function acceptedTitles(r: MetadataRecord, languages: AcceptedLanguage[]): Title[] {
  return r.titles.filter(t => t.text.trim() && accepted(t.text, t.language, languages)).sort((a, b) => languageRank(a.text, a.language, languages) - languageRank(b.text, b.language, languages) || Number(b.type === 'native') - Number(a.type === 'native'));
}
export function languageFields(r: MetadataRecord, languages: AcceptedLanguage[]) {
  const values = mappedFields(r), titles = acceptedTitles(r, languages);
  values.title = titles[0]?.text;
  values.alternateTitles = titles.map(t => ({ title: t.text, label: t.language || t.type }));
  if (r.summary && !accepted(r.summary, r.summaryLanguage, languages)) values.summary = undefined;
  if (r.publisher && !accepted(r.publisher, undefined, languages)) values.publisher = undefined;
  values.tags = r.provider === 'ehentai'
    ? (wantsChineseTags(languages) ? r.translatedTags ?? r.tags : r.tags)
    : r.tags.filter(t => accepted(t, undefined, languages));
  values.genres = r.genres.filter(t => accepted(t, undefined, languages));
  values.authors = r.authors.flatMap(a => {
    const names = [[a.native, a.nativeLanguage], [a.name, a.language], [a.localized, a.localizedLanguage]];
    const name = names.filter(([text, lang]) => text?.trim() && accepted(text, lang, languages))
      .sort(([a, al], [b, bl]) => languageRank(a!, al, languages) - languageRank(b!, bl, languages))[0]?.[0];
    return name ? [{ name, role: a.role }] : [];
  });
  return normalizeWriteFields(values);
}
