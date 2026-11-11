import type { AcceptedLanguage, MetadataRecord, Title } from './model';
import { mappedFields, normalizeWriteFields } from './plan';
export const allLanguages: AcceptedLanguage[] = ['en', 'ja', 'zh', 'romaji', 'unknown', 'other'];
export const languageLabels: Record<AcceptedLanguage, string> = { en: '英文 EN', ja: '日文 JP', zh: '中文 ZH / CH', romaji: '罗马字 Romaji', unknown: '未标注', other: '其他语言' };
export function languageOf(text: string, explicit?: string): AcceptedLanguage {
  const code = explicit?.trim().toLowerCase().replace(/_/g, '-');
  if (code && /^(romaji|ja-latn|ja-ro|jp-ro|romanized|romanised)$/.test(code)) return 'romaji';
  if (code && /^(ja|jp|jpn|japanese)(-|$)/.test(code)) return 'ja';
  if (code && /^(zh|ch|zho|chi|chinese)(-|$)/.test(code)) return 'zh';
  if (code && /^(en|eng|english)(-|$)/.test(code)) return 'en';
  if (code && !['und', 'unknown', 'zxx'].includes(code)) return 'other';
  // Kana is identifying evidence; Han alone and Latin names cannot distinguish
  // Japanese/Chinese or English/romaji. Preserve that uncertainty explicitly.
  return /[\u3040-\u30ff]/u.test(text) ? 'ja' : 'unknown';
}
export function accepted(text: string, code: string | undefined, languages: AcceptedLanguage[]): boolean { return languages.includes(languageOf(text, code)); }
export function acceptedTitles(r: MetadataRecord, languages: AcceptedLanguage[]): Title[] {
  return r.titles.filter(t => accepted(t.text, t.language, languages)).sort((a, b) => Number(b.type === 'native') - Number(a.type === 'native'));
}
export function languageFields(r: MetadataRecord, languages: AcceptedLanguage[]) {
  const values = mappedFields(r), titles = acceptedTitles(r, languages);
  values.title = (titles.find(t => t.type === 'native') ?? titles[0])?.text;
  values.alternateTitles = titles.map(t => ({ title: t.text, label: t.language || t.type }));
  if (r.summary && !accepted(r.summary, r.summaryLanguage, languages)) values.summary = undefined;
  if (r.publisher && !accepted(r.publisher, undefined, languages)) values.publisher = undefined;
  // Explicit EH Chinese-tag output is independent of title/text language selection.
  values.tags = r.translatedTags ?? r.tags.filter(t => accepted(t, undefined, languages));
  values.genres = r.genres.filter(t => accepted(t, undefined, languages));
  values.authors = r.authors.flatMap(a => {
    const names = [[a.native, a.nativeLanguage], [a.name, a.language], [a.localized, a.localizedLanguage]];
    const name = names.find(([text, lang]) => text && accepted(text, lang, languages))?.[0];
    return name ? [{ name, role: a.role }] : [];
  });
  return normalizeWriteFields(values);
}
