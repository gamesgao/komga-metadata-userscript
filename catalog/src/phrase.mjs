// FTS narrows candidates; each whitespace-delimited phrase must actually occur
// in a title. In particular, do not synthesize a Japanese phrase across aliases.
export function matchesTitlePhrases(record, query) {
  const normalize = text => String(text).normalize('NFKC').toLowerCase();
  const titles = (record.titles ?? []).map(title => normalize(title.text));
  const phrases = normalize(query).trim().split(/\s+/).filter(Boolean);
  return phrases.length > 0 && phrases.every(phrase => titles.some(title => title.includes(phrase)));
}
