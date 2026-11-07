#!/usr/bin/env node
import { DatabaseSync } from 'node:sqlite';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdtemp, rename, rm } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';
import { createZstdDecompress } from 'node:zlib';
import { pathToFileURL } from 'node:url';
import { ANALYZER_VERSION, SCHEMA, SCHEMA_VERSION, indexText } from './analyzer.mjs';
import { bangumi, ehentai, mangabaka, bookwalker, bookwalkerBook } from './mappings.mjs';

function child(command, args) {
  const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', chunk => { if (stderr.length < 8192) stderr += chunk; });
  const done = new Promise((resolvePromise, reject) => {
    proc.once('error', reject);
    proc.once('close', code => code === 0 ? resolvePromise() : reject(new Error(`${command} failed (${code}): ${stderr.trim()}`)));
  });
  return { proc, done };
}
async function output(command, args) {
  const { proc, done } = child(command, args);
  let text = '';
  for await (const chunk of proc.stdout) {
    text += chunk;
    if (text.length > 1024 * 1024) { proc.kill(); throw new Error('Archive member list exceeds limit'); }
  }
  await done;
  return text;
}
async function extractSqlite(input, provider, dir) {
  if (/\.(sqlite|db)$/i.test(input)) return input;
  const destination = join(dir, 'source.sqlite');
  if (/\.(zst|zstd)$/i.test(input)) {
    await pipeline(createReadStream(input), createZstdDecompress(), createWriteStream(destination, { flags: 'wx' }));
  } else if (provider === 'mangabaka' && /\.tar\.gz$/i.test(input)) {
    const names = (await output('tar', ['-tzf', input])).split('\n').filter(n => /\.(sqlite|db)$/i.test(n));
    if (names.length !== 1) throw new Error('MangaBaka archive must contain exactly one SQLite file');
    const { proc, done } = child('tar', ['-xOzf', input, names[0]]);
    await Promise.all([pipeline(proc.stdout, createWriteStream(destination, { flags: 'wx' })), done]);
  } else throw new Error('Unsupported source archive extension');
  return destination;
}
async function importBangumi(input, stage) {
  if (!/\.zip$/i.test(input)) throw new Error('Bangumi input must be a ZIP archive');
  const names = (await output('unzip', ['-Z', '-1', input])).split('\n').filter(Boolean);
  const expected = ['subject.jsonlines', 'person.jsonlines', 'subject-persons.jsonlines', 'subject-relations.jsonlines'];
  stage.exec(`CREATE TABLE subjects(id TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE persons(id TEXT PRIMARY KEY, json TEXT NOT NULL);
    CREATE TABLE subject_persons(subject_id TEXT NOT NULL, person_id TEXT NOT NULL, json TEXT NOT NULL);
    CREATE TABLE relations(subject_id TEXT NOT NULL, related_id TEXT NOT NULL, json TEXT NOT NULL);`);
  for (const name of expected) {
    const found = names.filter(n => n.split('/').at(-1) === name);
    if (found.length !== 1) throw new Error(`Bangumi archive must contain exactly one ${name}`);
    const { proc, done } = child('unzip', ['-p', input, found[0]]);
    const lines = createInterface({ input: proc.stdout, crlfDelay: Infinity });
    const insert = stage.prepare(name === 'subject.jsonlines' ? 'INSERT INTO subjects VALUES (?,?)' :
      name === 'person.jsonlines' ? 'INSERT INTO persons VALUES (?,?)' :
      name === 'subject-persons.jsonlines' ? 'INSERT INTO subject_persons VALUES (?,?,?)' : 'INSERT INTO relations VALUES (?,?,?)');
    stage.exec('BEGIN');
    let count = 0;
    try {
      for await (const line of lines) {
        if (!line.trim()) continue;
        const value = JSON.parse(line);
        const json = JSON.stringify(value);
        if (name === 'subject.jsonlines' || name === 'person.jsonlines') {
          if (value.id == null) throw new Error(`Missing id in ${name}`);
          insert.run(String(value.id), json);
        } else {
          const subject = value.subject_id ?? value.subjectId;
          const target = name === 'subject-persons.jsonlines' ? (value.person_id ?? value.personId) :
            (value.related_subject_id ?? value.relatedSubjectId);
          if (subject == null || target == null) throw new Error(`Missing relationship id in ${name}`);
          insert.run(String(subject), String(target), json);
        }
        if (++count % 10000 === 0) { stage.exec('COMMIT; BEGIN'); }
      }
      await done;
      stage.exec('COMMIT');
    } catch (error) {
      proc.kill(); await done.catch(() => {}); stage.exec('ROLLBACK'); throw error;
    }
  }
  stage.exec('CREATE INDEX sp_subject ON subject_persons(subject_id); CREATE INDEX rel_subject ON relations(subject_id);');
}
function bangumiRecords(stage) {
  const people = stage.prepare('SELECT p.json AS person, sp.json AS relation FROM subject_persons sp LEFT JOIN persons p ON p.id=sp.person_id WHERE sp.subject_id=?');
  const relations = stage.prepare('SELECT json FROM relations WHERE subject_id=?');
  const subject = stage.prepare('SELECT json FROM subjects WHERE id=?');
  function record(s, withBooks) {
    const persons = people.all(String(s.id)).map(x => ({ person: x.person == null ? null : JSON.parse(x.person), relation: JSON.parse(x.relation) }));
    const rels = relations.all(String(s.id)).map(x => JSON.parse(x.json));
    const books = [];
    if (withBooks) for (const rel of rels) {
      if (String(rel.relation_type ?? rel.relationType) !== '1003') continue;
      const target = subject.get(String(rel.related_subject_id ?? rel.relatedSubjectId));
      if (target) books.push(record(JSON.parse(target.json), false));
    }
    return bangumi(s, persons, rels, books);
  }
  return (function* () { for (const row of stage.prepare("SELECT json FROM subjects WHERE json_extract(json, '$.type') = 1 OR json_type(json, '$.type') IS NULL").iterate()) yield record(JSON.parse(row.json), true); })();
}
function prepareRelations(stage, source, table, column) {
  const exists = source.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
  if (!exists) throw new Error(`Source is missing required table: ${table}`);
  stage.exec(`CREATE TABLE "${table}" AS SELECT * FROM raw."${table}"; CREATE INDEX "${table}_lookup" ON "${table}"("${column}");`);
}
function sqliteRecords(provider, source, stage, sourcePath) {
  // Attachment is used only to build local indexed relationship staging tables.
  const uri = encodeURI(sourcePath).replaceAll('#', '%23').replaceAll('?', '%3F');
  stage.prepare('ATTACH DATABASE ? AS raw').run(`file:${uri}?mode=ro`);
  if (provider === 'ehentai') {
    prepareRelations(stage, source, 'gid_tid', 'gid');
    prepareRelations(stage, source, 'tag', 'id');
    const tags = stage.prepare('SELECT t.* FROM gid_tid gt JOIN tag t ON t.id=gt.tid WHERE gt.gid=?');
    return (function* () {
      for (const row of source.prepare('SELECT * FROM gallery').iterate()) yield ehentai(row, tags.all(row.gid));
    })();
  }
  if (provider === 'mangabaka') {
    const tables = source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tags','series_tags')").all().map(row => row.name);
    if (tables.length === 1) throw new Error('MangaBaka tag relationship tables are incomplete');
    let tags;
    if (tables.length === 2) {
      prepareRelations(stage, source, 'series_tags', 'series_id');
      prepareRelations(stage, source, 'tags', 'id');
      tags = stage.prepare('SELECT st.*, t.name, t.name_path, t.is_genre FROM series_tags st JOIN tags t ON t.id=st.tag_id WHERE st.series_id=?');
    }
    return (function* () {
      for (const row of source.prepare('SELECT * FROM series').iterate())
        yield mangabaka(row, tags ? tags.all(row.id) : []);
    })();
  }
  if (provider === 'bookwalker') {
    for (const [table, column] of [['series_tags','series_id'],['tags','id'],['products','series_id'],
      ['images','id'],['product_external_ids','product_id'],['product_contributors','product_id'],['contributors','id']])
      prepareRelations(stage, source, table, column);
    const tags = stage.prepare('SELECT t.* FROM series_tags st JOIN tags t ON t.id=st.tag_id WHERE st.series_id=?');
    const products = stage.prepare('SELECT * FROM products WHERE series_id=?');
    const images = stage.prepare('SELECT * FROM images WHERE id=?');
    const external = stage.prepare('SELECT * FROM product_external_ids WHERE product_id=?');
    const contributors = stage.prepare('SELECT pc.*, c.name, c.name_alt FROM product_contributors pc LEFT JOIN contributors c ON c.id=pc.contributor_id WHERE pc.product_id=?');
    return (function* () {
      for (const row of source.prepare('SELECT * FROM series').iterate()) {
        const books = products.all(row.id).map(p => bookwalkerBook(p, contributors.all(p.id), external.all(p.id), images.get(p.image_id) ?? null));
        yield bookwalker(row, tags.all(row.id), images.get(row.image_id) ?? null, books);
      }
    })();
  }
  throw new Error(`Unsupported provider: ${provider}`);
}

export async function build({ input, output: outputPath, provider, sourceVersion }) {
  if (!input || !outputPath || !['bangumi','ehentai','mangabaka','bookwalker'].includes(provider))
    throw new Error('Usage: node build-cli.mjs --provider bangumi|ehentai|mangabaka|bookwalker --input FILE --output FILE [--source-version VERSION]');
  input = resolve(input); outputPath = resolve(outputPath);
  if (input === outputPath) throw new Error('Input and output must be different files');
  const dir = await mkdtemp(join(dirname(outputPath), '.catalog-build-'));
  let db, stage, source;
  try {
    const temporary = join(dir, 'catalog.sqlite');
    db = new DatabaseSync(temporary);
    db.exec(SCHEMA);
    db.prepare('INSERT INTO manifest VALUES (?,?,?,?,?)').run(SCHEMA_VERSION, ANALYZER_VERSION, provider, sourceVersion ?? basename(input), new Date().toISOString());
    stage = new DatabaseSync(join(dir, 'staging.sqlite'));
    let records;
    if (provider === 'bangumi') {
      await importBangumi(input, stage);
      records = bangumiRecords(stage);
    } else {
      const path = await extractSqlite(input, provider, dir);
      source = new DatabaseSync(path, { readOnly: true });
      records = sqliteRecords(provider, source, stage, path);
    }
    const insert = db.prepare('INSERT INTO entries(provider,source_id,title,url,record) VALUES (?,?,?,?,?)');
    const insertBook = db.prepare('INSERT INTO book_entries(provider,source_id,record) VALUES (?,?,?)');
    const index = db.prepare('INSERT INTO title_fts(rowid,tokens) VALUES (?,?)');
    let count = 0;
    db.exec('BEGIN');
    for (const record of records) {
      if (!record.id || record.id === 'undefined' || record.id === 'null') throw new Error('Source entry has no id');
      if (!record.titles.length) {
        record.titles.push({ text: record.id, type: 'alias' });
        record.warnings = ['Source has no title; displayed ID instead'];
      }
      const title = record.titles.find(t => t.type === 'native')?.text ?? record.titles[0].text;
      const result = insert.run(record.provider, record.id, title, record.url, JSON.stringify(record));
      index.run(result.lastInsertRowid, indexText(record.titles.map(t => t.text)));
      if (record.provider === 'bookwalker') for (const book of record.books ?? [])
        insertBook.run(book.provider, book.id, JSON.stringify(book));
      if (++count % 1000 === 0) db.exec('COMMIT; BEGIN');
    }
    db.exec('COMMIT');
    if (!count) throw new Error('Source contained no records');
    db.exec("INSERT INTO title_fts(title_fts) VALUES('optimize')");
    db.exec("INSERT INTO title_fts(title_fts) VALUES('integrity-check')");
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('Output integrity check failed');
    db.close(); db = undefined;
    stage.close(); stage = undefined;
    if (source) { source.close(); source = undefined; }
    await rename(temporary, outputPath);
    return { provider, count, sourceVersion: sourceVersion ?? basename(input) };
  } finally {
    if (db) db.close();
    if (stage) stage.close();
    if (source) source.close();
    await rm(dir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2);
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = { '--input': 'input', '--output': 'output', '--provider': 'provider', '--source-version': 'sourceVersion' }[args[i]];
    if (!key || !args[i + 1] || options[key]) { console.error('Invalid or duplicate argument:', args[i]); process.exitCode = 1; break; }
    options[key] = args[i + 1];
  }
  if (!process.exitCode) {
    try { console.log(JSON.stringify(await build(options))); }
    catch (error) { console.error(error.message); process.exitCode = 1; }
  }
}
