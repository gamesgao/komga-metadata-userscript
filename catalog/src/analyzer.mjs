export const SCHEMA_VERSION = 1;
export const ANALYZER_VERSION = 1;

// Index CJK unigrams and bigrams separately from ordinary word tokens.
export function tokens(text) {
  const result = [];
  const normalized = String(text).normalize('NFKC').toLowerCase();
  for (const match of normalized.matchAll(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+|[\p{L}\p{N}]+/gu)) {
    const word = match[0];
    if (/^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+$/u.test(word)) {
      const chars = Array.from(word);
      for (const ch of chars) result.push(ch);
      for (let i = 0; i + 1 < chars.length; i++) result.push(chars[i] + chars[i + 1]);
    } else result.push(word);
  }
  return [...new Set(result)];
}

export function indexText(titles) {
  return tokens(titles.join(' ')).join(' ');
}

export function matchQuery(query) {
  return tokens(query).map(token => `"${token.replaceAll('"', '""')}"`).join(' AND ');
}

export const SCHEMA = `
PRAGMA journal_mode=DELETE;
CREATE TABLE manifest (schema_version INTEGER NOT NULL, analyzer_version INTEGER NOT NULL,
 provider TEXT NOT NULL, source_version TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE entries (id INTEGER PRIMARY KEY, provider TEXT NOT NULL, source_id TEXT NOT NULL,
 title TEXT NOT NULL, url TEXT NOT NULL, record TEXT NOT NULL, UNIQUE(provider, source_id));
CREATE TABLE book_entries (provider TEXT NOT NULL, source_id TEXT NOT NULL, record TEXT NOT NULL,
 PRIMARY KEY(provider, source_id));
CREATE VIRTUAL TABLE title_fts USING fts5(tokens, tokenize='unicode61');
`;
