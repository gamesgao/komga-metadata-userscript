import init from './sqlite/index.mjs';
import { receiveDirectory } from './storage.mjs';
import { SCHEMA, SCHEMA_VERSION, ANALYZER_VERSION, indexText } from './analyzer.mjs';
import { bangumi, ehentai, mangabaka, bookwalker, bookwalkerBook } from './mappings.mjs';
import { Decompress } from 'fzstd';
import { ZipReader, BlobReader } from '@zip.js/zip.js';
import xxhash from 'xxhash-wasm';

let wasmBinary;
let sqlitePromise;
class StreamReader {
  constructor(stream) {
    this.reader = stream.getReader();
    this.chunk = new Uint8Array();
    this.position = 0;
  }
  async read(size, sink) {
    let remaining = size;
    while (remaining) {
      if (this.position === this.chunk.length) {
        const { value, done } = await this.reader.read();
        if (done) throw new Error('Truncated tar archive');
        this.chunk = value;
        this.position = 0;
        if (!value.length) continue;
      }
      const length = Math.min(remaining, this.chunk.length - this.position);
      if (sink) await sink(this.chunk.subarray(this.position, this.position + length));
      this.position += length;
      remaining -= length;
    }
  }
  async bytes(size) {
    const result = new Uint8Array(size);
    let offset = 0;
    await this.read(size, chunk => { result.set(chunk, offset); offset += chunk.length; });
    return result;
  }
  async finish() {
    while (!(await this.reader.read()).done) { /* verify decompressor reaches end */ }
    this.reader.releaseLock();
  }
}
function tarText(bytes) {
  return new TextDecoder().decode(bytes).replace(/\0.*$/s, '');
}
async function extractTarGzip(file, target) {
  if (typeof DecompressionStream !== 'function') throw new Error('此浏览器不支持 gzip 流解压，请使用原生 CLI');
  const reader = new StreamReader(file.stream().pipeThrough(new DecompressionStream('gzip')));
  const writable = await target.createWritable();
  let found = false;
  let completed = false;
  try {
    while (true) {
      const header = await reader.bytes(512);
      if (header.every(byte => byte === 0)) {
        const second = await reader.bytes(512);
        if (!second.every(byte => byte === 0)) throw new Error('Invalid tar end marker');
        await reader.finish();
        break;
      }
      const checksumText = tarText(header.subarray(148, 156)).trim();
      const checksum = Number.parseInt(checksumText, 8);
      const actual = header.reduce((sum, byte, index) => sum + (index >= 148 && index < 156 ? 32 : byte), 0);
      if (!Number.isFinite(checksum) || checksum !== actual) throw new Error('Invalid tar header checksum');
      const sizeText = tarText(header.subarray(124, 136)).trim();
      if (!/^[0-7]+$/.test(sizeText)) throw new Error('Unsupported tar entry size');
      const size = Number.parseInt(sizeText, 8);
      if (!Number.isSafeInteger(size)) throw new Error('Tar entry is too large');
      const name = tarText(header.subarray(0, 100));
      const kind = header[156];
      const isSqlite = (kind === 0 || kind === 48) && /\.(sqlite|db)$/i.test(name);
      if (isSqlite && found) throw new Error('Archive contains multiple SQLite files');
      if (isSqlite) found = true;
      await reader.read(size, isSqlite ? chunk => writable.write(chunk) : undefined);
      await reader.read((512 - size % 512) % 512);
    }
    if (!found) throw new Error('Archive does not contain a SQLite file');
    await writable.close();
    completed = true;
  } finally {
    if (!completed) await writable.abort();
  }
}

async function* zstdFrames(file) {
  let position = 0;
  let cached = new Uint8Array();
  let cachedAt = -1;
  const maxWindow = 64 * 1024 * 1024;
  async function bytes(at, length) {
    if (at + length > file.size) throw new Error('Truncated zstd archive');
    if (at < cachedAt || at + length > cachedAt + cached.length) {
      cachedAt = at;
      cached = new Uint8Array(await file.slice(at, at + Math.max(65536, length)).arrayBuffer());
    }
    return cached.subarray(at - cachedAt, at - cachedAt + length);
  }
  const integer = data => {
    let value = 0n;
    for (let i = data.length - 1; i >= 0; i--) value = (value << 8n) | BigInt(data[i]);
    return value;
  };
  while (position < file.size) {
    const start = position;
    const magic = Number(integer(await bytes(position, 4)));
    if (magic >= 0x184d2a50 && magic <= 0x184d2a5f) {
      const size = Number(integer(await bytes(position + 4, 4)));
      position += 8 + size;
      if (position > file.size) throw new Error('Truncated zstd skippable frame');
      continue;
    }
    if (magic !== 0xfd2fb528) throw new Error('Invalid zstd frame');
    const flags = (await bytes(position + 4, 1))[0];
    if (flags & 8) throw new Error('Invalid zstd frame header');
    const single = Boolean(flags & 32), checksum = Boolean(flags & 4), contentFlag = flags >> 6;
    const dictionaryBytes = [0, 1, 2, 4][flags & 3];
    position += 5;
    let window;
    if (!single) {
      const descriptor = (await bytes(position++, 1))[0];
      const base = 2 ** (10 + (descriptor >> 3));
      window = base + base / 8 * (descriptor & 7);
    }
    const dictionary = integer(await bytes(position, dictionaryBytes));
    if (dictionary !== 0n) throw new Error('Zstandard dictionaries are unsupported; use the native CLI');
    position += dictionaryBytes;
    const contentBytes = contentFlag ? 1 << contentFlag : single ? 1 : 0;
    let contentSize = integer(await bytes(position, contentBytes));
    if (contentFlag === 1) contentSize += 256n;
    position += contentBytes;
    if (single) window = Number(contentSize);
    if (window > maxWindow) throw new Error('Zstandard window exceeds 64 MiB browser limit; use the native CLI');
    let last = false;
    while (!last) {
      const block = Number(integer(await bytes(position, 3)));
      position += 3;
      last = Boolean(block & 1);
      const kind = (block >> 1) & 3, size = block >> 3;
      if (kind === 3 || size > 131072) throw new Error('Invalid zstd block');
      position += kind === 1 ? 1 : size;
      if (position > file.size) throw new Error('Truncated zstd block');
    }
    let expected;
    if (checksum) {
      expected = Number(integer(await bytes(position, 4)));
      position += 4;
    }
    yield { start, end: position, expected };
  }
}
async function extractZstd(file, target) {
  const writable = await target.createWritable();
  let completed = false;
  try {
    const { create64 } = await xxhash();
    let frames = 0;
    for await (const frame of zstdFrames(file)) {
      frames++;
      let chunks = [];
      const hash = create64();
      const decoder = new Decompress(chunk => {
        if (chunk.length) { hash.update(chunk); chunks.push(chunk); }
      });
      for (let offset = frame.start; offset < frame.end; offset += 65536) {
        const input = new Uint8Array(await file.slice(offset, Math.min(offset + 65536, frame.end)).arrayBuffer());
        for (let i = 0; i < input.length; i += 512) {
          decoder.push(input.subarray(i, i + 512), false);
          for (const chunk of chunks) await writable.write(chunk);
          chunks = [];
        }
      }
      decoder.push(new Uint8Array(), true);
      for (const chunk of chunks) await writable.write(chunk);
      if (frame.expected !== undefined && Number(hash.digest() & 0xffffffffn) !== frame.expected)
        throw new Error('Zstandard checksum mismatch');
    }
    if (!frames) throw new Error('Zstandard archive has no data frames');
    await writable.close();
    completed = true;
  } finally { if (!completed) await writable.abort(); }
}

function installFileVfs(sqlite, name, input, writableHandle) {
  const { capi, wasm } = sqlite;
  const reader = input ? new FileReaderSync() : undefined;
  const io = new capi.sqlite3_io_methods(); io.$iVersion = 1;
  const vfs = new capi.sqlite3_vfs(); vfs.$iVersion = 2;
  vfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof; vfs.$mxPathname = 1024;
  vfs.addOnDispose(vfs.$zName = wasm.allocCString(name));
  sqlite.vfs.installVfs({ io: { struct: io, methods: {
    xClose: () => 0,
    xRead: (pFile, pDest, n, offset) => {
      try {
        const dest = wasm.heap8u().subarray(Number(pDest), Number(pDest) + n);
        dest.fill(0);
        let count;
        if (input) {
          const bytes = new Uint8Array(reader.readAsArrayBuffer(input.slice(Number(offset), Number(offset) + n)));
          dest.set(bytes); count = bytes.length;
        } else count = writableHandle.read(dest, { at: Number(offset) });
        return count < n ? capi.SQLITE_IOERR_SHORT_READ : 0;
      } catch { return capi.SQLITE_IOERR_READ; }
    },
    xWrite: (pFile, pData, n, offset) => {
      if (!writableHandle) return capi.SQLITE_READONLY;
      try {
        const data = wasm.heap8u().subarray(Number(pData), Number(pData) + n);
        return writableHandle.write(data, { at: Number(offset) }) === n ? 0 : capi.SQLITE_IOERR_WRITE;
      } catch { return capi.SQLITE_IOERR_WRITE; }
    },
    xTruncate: (pFile, size) => {
      if (!writableHandle) return capi.SQLITE_READONLY;
      try { writableHandle.truncate(Number(size)); return 0; } catch { return capi.SQLITE_IOERR_TRUNCATE; }
    },
    xSync: () => {
      try { if (writableHandle) writableHandle.flush(); return 0; } catch { return capi.SQLITE_IOERR_FSYNC; }
    },
    xFileSize: (pFile, out) => {
      try { wasm.poke(out, BigInt(input ? input.size : writableHandle.getSize()), 'i64'); return 0; }
      catch { return capi.SQLITE_IOERR_FSTAT; }
    },
    xLock: () => 0, xUnlock: () => 0,
    xCheckReservedLock: (pFile, out) => { wasm.poke32(out, 0); return 0; },
    xFileControl: () => capi.SQLITE_NOTFOUND,
    xSectorSize: () => 4096,
    xDeviceCharacteristics: () => input ? capi.SQLITE_IOCAP_IMMUTABLE : 0
  } }, vfs: { struct: vfs, methods: {
    xOpen: (pVfs, zName, pFile, flags, pOut) => {
      if (wasm.cstrToJs(zName) !== 'catalog.sqlite') return capi.SQLITE_CANTOPEN;
      const f = new capi.sqlite3_file(pFile); f.$pMethods = io.pointer; f.dispose();
      wasm.poke32(pOut, input ? capi.SQLITE_OPEN_READONLY : capi.SQLITE_OPEN_READWRITE); return 0;
    },
    xAccess: (pVfs, zName, flags, out) => { wasm.poke32(out, wasm.cstrToJs(zName) === 'catalog.sqlite' ? 1 : 0); return 0; },
    xDelete: () => capi.SQLITE_READONLY,
    xFullPathname: (pVfs, zName, nOut, pOut) => wasm.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN,
    xRandomness: (pVfs, n, pOut) => {
      const a = new Uint8Array(n); crypto.getRandomValues(a); wasm.heap8u().set(a, Number(pOut)); return n;
    },
    xSleep: () => 0,
    xCurrentTime: (pVfs, out) => { wasm.poke(out, 2440587.5 + Date.now() / 86400000, 'double'); return 0; },
    xCurrentTimeInt64: (pVfs, out) => { wasm.poke(out, BigInt(210866760000000 + Date.now()), 'i64'); return 0; },
    xGetLastError: () => 0
  } } });
  return () => { capi.sqlite3_vfs_unregister(vfs.pointer); vfs.dispose(); io.dispose(); };
}
function each(db, sql, callback) {
  const statement = db.prepare(sql);
  try {
    while (statement.step()) callback(statement.get({}));
  } finally { statement.finalize(); }
}
function createStage(db, table) {
  db.exec(`CREATE TABLE stage_${table}(key TEXT NOT NULL, json TEXT NOT NULL);`);
  const stmt = db.prepare(`INSERT INTO stage_${table} VALUES (?,?)`);
  return {
    insert(key, row) {
      if (key == null) throw new Error(`Missing relationship key in ${table}`);
      stmt.bind([String(key), JSON.stringify(row)]).stepReset();
    },
    done() {
      stmt.finalize();
      db.exec(`CREATE INDEX stage_${table}_key ON stage_${table}(key);`);
    }
  };
}
function stageSource(source, output, table, column) {
  const stage = createStage(output, table);
  let count = 0;
  try { each(source, `SELECT * FROM "${table}"`, row => {
    stage.insert(row[column], row);
    if (++count % 10000 === 0) output.exec('COMMIT; BEGIN');
  }); }
  finally { stage.done(); }
}
function stageRows(output, table, key) {
  return output.selectObjects(`SELECT json FROM stage_${table} WHERE key=?`, [String(key)]).map(row => JSON.parse(row.json));
}
async function stageBangumi(file, output) {
  const zip = new ZipReader(new BlobReader(file), { useWebWorkers: false });
  try {
    const entries = await zip.getEntries();
    const specs = [
      ['subject.jsonlines', 'subjects', row => row.id],
      ['person.jsonlines', 'persons', row => row.id],
      ['subject-persons.jsonlines', 'subject_persons', row => row.subject_id ?? row.subjectId],
      ['subject-relations.jsonlines', 'relations', row => row.subject_id ?? row.subjectId]
    ];
    for (const [filename, table, key] of specs) {
      const found = entries.filter(entry => entry.filename.split('/').at(-1) === filename);
      if (found.length !== 1) throw new Error(`Bangumi archive must contain exactly one ${filename}`);
      const stage = createStage(output, table);
      const decoder = new TextDecoder('utf-8', { fatal: true });
      let pending = '', count = 0;
      function line(text) {
        if (!text.trim()) return;
        const row = JSON.parse(text);
        stage.insert(key(row), row);
        if (++count % 10000 === 0) output.exec('COMMIT; BEGIN');
      }
      output.exec('BEGIN');
      try {
        const stream = new WritableStream({
          write(chunk) {
            pending += decoder.decode(chunk, { stream: true });
            let pos;
            while ((pos = pending.indexOf('\n')) !== -1) {
              line(pending.slice(0, pos)); pending = pending.slice(pos + 1);
            }
            if (pending.length > 16 * 1024 * 1024) throw new Error('JSONL line exceeds 16 MiB');
          },
          close() { pending += decoder.decode(); line(pending); }
        });
        await found[0].getData(stream, { useWebWorkers: false, checkSignature: true });
        output.exec('COMMIT');
      } finally { stage.done(); }
    }
  } finally { await zip.close(); }
}
async function run({ file, directory, sourceName, outputName, provider, sourceVersion }) {
  directory = await receiveDirectory(directory);
  if (!['bangumi', 'ehentai', 'mangabaka', 'bookwalker'].includes(provider)) throw new Error('不支持的来源');
  if (!(file instanceof File)) throw new Error('请选择本地来源文件');
  const sqlite = await (sqlitePromise ??= init(wasmBinary
    ? { wasmBinary, locateFile: () => '' } : {}));
  const outHandle = await directory.getFileHandle(outputName, { create: true });
  const sourceHandle = await directory.getFileHandle(sourceName, { create: true });
  let sourceFile = file;
  self.postMessage({ type: 'progress', phase: '解压原始数据' });
  if (provider === 'bangumi' && !/\.zip$/i.test(file.name)) throw new Error('Bangumi 输入必须是 ZIP');
  if (provider === 'mangabaka' && /\.tar\.gz$/i.test(file.name)) {
    await extractTarGzip(file, sourceHandle);
    sourceFile = await sourceHandle.getFile();
  } else if (['ehentai', 'bookwalker'].includes(provider) && /\.(zst|zstd)$/i.test(file.name)) {
    await extractZstd(file, sourceHandle);
    sourceFile = await sourceHandle.getFile();
  } else if (provider !== 'bangumi' && !/\.(sqlite|db)$/i.test(file.name)) {
    throw new Error('不支持的来源档案格式；请使用原生 CLI');
  }
  if (typeof outHandle.createSyncAccessHandle !== 'function') throw new Error('浏览器不支持 OPFS 同步访问句柄；请使用原生 CLI');
  const access = await outHandle.createSyncAccessHandle();
  access.truncate(0);
  let disposeInput, disposeOutput, source, output;
  try {
    disposeOutput = installFileVfs(sqlite, 'build-output', undefined, access);
    if (provider !== 'bangumi') {
      disposeInput = installFileVfs(sqlite, 'build-source', sourceFile);
      source = new sqlite.oo1.DB({ filename: 'catalog.sqlite', flags: 'r', vfs: 'build-source' });
    }
    output = new sqlite.oo1.DB({ filename: 'catalog.sqlite', flags: 'c', vfs: 'build-output' });
    output.exec('PRAGMA journal_mode=MEMORY; PRAGMA temp_store=MEMORY; PRAGMA cache_size=-4096;');
    output.exec(SCHEMA.replace('PRAGMA journal_mode=DELETE;', ''));
    output.exec({ sql: 'INSERT INTO manifest VALUES (?,?,?,?,?)', bind: [SCHEMA_VERSION, ANALYZER_VERSION, provider, sourceVersion || file.name, new Date().toISOString()] });
    let staging = [];
    self.postMessage({ type: 'progress', phase: '整理标签和关联数据' });
    if (provider === 'bangumi') {
      await stageBangumi(file, output);
      staging = ['subjects', 'persons', 'subject_persons', 'relations'];
    } else {
      let specs;
      if (provider === 'ehentai') specs = [['gid_tid', 'gid'], ['tag', 'id']];
      if (provider === 'bookwalker') specs = [['series_tags', 'series_id'], ['tags', 'id'], ['products', 'series_id'],
        ['images', 'id'], ['product_external_ids', 'product_id'], ['product_contributors', 'product_id'], ['contributors', 'id']];
      if (provider === 'mangabaka') {
        const tables = source.selectObjects("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('tags','series_tags')").map(r => r.name);
        if (tables.length === 1) throw new Error('MangaBaka tag relationship tables are incomplete');
        specs = tables.length === 2 ? [['series_tags', 'series_id'], ['tags', 'id']] : [];
      }
      for (const [table, column] of specs) {
        output.exec('BEGIN');
        stageSource(source, output, table, column);
        output.exec('COMMIT');
        staging.push(table);
      }
    }
    const insert = output.prepare('INSERT INTO entries(provider,source_id,title,url,record) VALUES (?,?,?,?,?)');
    const insertBook = output.prepare('INSERT INTO book_entries(provider,source_id,record) VALUES (?,?,?)');
    const index = output.prepare('INSERT INTO title_fts(rowid,tokens) VALUES (?,?)');
    let count = 0;
    const total = provider === 'bangumi'
      ? output.selectValue("SELECT count(*) FROM stage_subjects WHERE json_extract(json, '$.type') = 1 OR json_type(json, '$.type') IS NULL")
      : source.selectValue(`SELECT count(*) FROM ${provider === 'ehentai' ? 'gallery' : 'series'}`);
    self.postMessage({ type: 'progress', phase: '建立检索索引', count, total });
    try {
      output.exec('BEGIN');
      const add = record => {
        if (!record.id || record.id === 'undefined' || record.id === 'null') throw new Error('Source entry has no id');
        if (!record.titles.length) {
          record.titles.push({ text: record.id, type: 'alias' });
          record.warnings = ['Source has no title; displayed ID instead'];
        }
        const title = record.titles.find(t => t.type === 'native')?.text ?? record.titles[0].text;
        insert.bind([record.provider, record.id, title, record.url, JSON.stringify(record)]).stepReset();
        const rowId = sqlite.capi.sqlite3_last_insert_rowid(output.pointer);
        index.bind([rowId, indexText(record.titles.map(t => t.text))]).stepReset();
        if (record.provider === 'bookwalker') for (const book of record.books ?? [])
          insertBook.bind([book.provider, book.id, JSON.stringify(book)]).stepReset();
        if (++count % 1000 === 0) { output.exec('COMMIT; BEGIN'); self.postMessage({ type: 'progress', phase: '建立检索索引', count, total }); }
      };
      if (provider === 'bangumi') {
        const make = (subject, withBooks) => {
          const persons = stageRows(output, 'subject_persons', subject.id).map(relation => ({
            relation, person: stageRows(output, 'persons', relation.person_id ?? relation.personId)[0] ?? null
          }));
          const relations = stageRows(output, 'relations', subject.id);
          const books = [];
          if (withBooks) for (const relation of relations) {
            if (String(relation.relation_type ?? relation.relationType) !== '1003') continue;
            const related = stageRows(output, 'subjects', relation.related_subject_id ?? relation.relatedSubjectId)[0];
            if (related) books.push(make(related, false));
          }
          return bangumi(subject, persons, relations, books);
        };
        each(output, "SELECT json FROM stage_subjects WHERE json_extract(json, '$.type') = 1 OR json_type(json, '$.type') IS NULL", row => add(make(JSON.parse(row.json), true)));
      } else if (provider === 'ehentai') {
        each(source, 'SELECT * FROM gallery', row => {
          const tags = stageRows(output, 'gid_tid', row.gid).flatMap(rel => stageRows(output, 'tag', rel.tid));
          add(ehentai(row, tags));
        });
      } else if (provider === 'mangabaka') {
        each(source, 'SELECT * FROM series', row => {
          const tags = staging.includes('tags') ? stageRows(output, 'series_tags', row.id).flatMap(rel =>
            stageRows(output, 'tags', rel.tag_id).map(tag => ({ ...rel, name: tag.name, name_path: tag.name_path, is_genre: tag.is_genre }))) : [];
          add(mangabaka(row, tags));
        });
      } else {
        each(source, 'SELECT * FROM series', row => {
          const tags = stageRows(output, 'series_tags', row.id).flatMap(rel => stageRows(output, 'tags', rel.tag_id));
          const image = stageRows(output, 'images', row.image_id)[0] ?? null;
          const books = stageRows(output, 'products', row.id).map(product => {
            const contributors = stageRows(output, 'product_contributors', product.id).map(rel => {
              const person = stageRows(output, 'contributors', rel.contributor_id)[0];
              return { ...rel, name: person?.name ?? null, name_alt: person?.name_alt ?? null };
            });
            return bookwalkerBook(product, contributors, stageRows(output, 'product_external_ids', product.id),
              stageRows(output, 'images', product.image_id)[0] ?? null);
          });
          add(bookwalker(row, tags, image, books));
        });
      }
      output.exec('COMMIT');
      if (!count) throw new Error('Source contained no records');
      self.postMessage({ type: 'progress', phase: '校验数据库', count, total });
      for (const table of staging) output.exec(`DROP TABLE stage_${table}`);
      output.exec("INSERT INTO title_fts(title_fts) VALUES('optimize'); INSERT INTO title_fts(title_fts) VALUES('integrity-check');");
      if (output.selectValue('PRAGMA integrity_check') !== 'ok') throw new Error('Output integrity check failed');
      return { provider, count, sourceVersion: sourceVersion || file.name };
    } finally { insert.finalize(); insertBook.finalize(); index.finalize(); }
  } finally {
    if (output) output.close();
    if (source) source.close();
    if (disposeOutput) disposeOutput();
    if (disposeInput) disposeInput();
    access.close();
  }
}
self.onmessage = async ({ data }) => {
  if (data?.type === 'init') {
    try {
      wasmBinary = data.payload?.wasmBinary;
      sqlitePromise = init(wasmBinary ? { wasmBinary, locateFile: () => '' } : {});
      await sqlitePromise;
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'init-error', error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  try { self.postMessage({ result: await run(data.payload ?? data) }); }
  catch (error) { self.postMessage({ error: error instanceof Error ? error.message : String(error) }); }
};
