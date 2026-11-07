import init from './sqlite/index.mjs';
import { sha256 } from '@noble/hashes/sha2.js';
import { matchesTitlePhrases } from './phrase.mjs';
import { SCHEMA_VERSION, ANALYZER_VERSION, matchQuery } from './analyzer.mjs';

let sqlitePromise;
let active;
let sequence = 0;

function openFile(sqlite, file) {
  const { capi, wasm } = sqlite;
  const reader = new FileReaderSync();
  const stats = { reads: 0, bytesRead: 0, largestRead: 0, fileSize: file.size };
  const io = new capi.sqlite3_io_methods();
  io.$iVersion = 1;
  const vfs = new capi.sqlite3_vfs();
  vfs.$iVersion = 2;
  vfs.$szOsFile = capi.sqlite3_file.structInfo.sizeof;
  vfs.$mxPathname = 1024;
  const name = `catalog-ro-${++sequence}`;
  vfs.addOnDispose(vfs.$zName = wasm.allocCString(name));
  sqlite.vfs.installVfs({ io: { struct: io, methods: {
    xClose: () => 0,
    xRead: (pFile, pDest, n, offset) => {
      try {
        const start = Number(offset);
        const bytes = new Uint8Array(reader.readAsArrayBuffer(file.slice(start, start + n)));
        stats.reads++; stats.bytesRead += bytes.length;
        stats.largestRead = Math.max(stats.largestRead, bytes.length);
        const dest = wasm.heap8u().subarray(Number(pDest), Number(pDest) + n);
        dest.fill(0); dest.set(bytes);
        return bytes.length < n ? capi.SQLITE_IOERR_SHORT_READ : 0;
      } catch { return capi.SQLITE_IOERR_READ; }
    },
    xWrite: () => capi.SQLITE_READONLY, xTruncate: () => capi.SQLITE_READONLY,
    xSync: () => 0,
    xFileSize: (pFile, pSize) => { wasm.poke(pSize, BigInt(file.size), 'i64'); return 0; },
    xLock: () => 0, xUnlock: () => 0,
    xCheckReservedLock: (pFile, pOut) => { wasm.poke32(pOut, 0); return 0; },
    xFileControl: () => capi.SQLITE_NOTFOUND,
    xSectorSize: () => 4096, xDeviceCharacteristics: () => capi.SQLITE_IOCAP_IMMUTABLE
  } }, vfs: { struct: vfs, methods: {
    xOpen: (pVfs, zName, pFile, flags, pOut) => {
      if (wasm.cstrToJs(zName) !== 'catalog.sqlite') return capi.SQLITE_CANTOPEN;
      const f = new capi.sqlite3_file(pFile); f.$pMethods = io.pointer; f.dispose();
      wasm.poke32(pOut, capi.SQLITE_OPEN_READONLY); return 0;
    },
    xAccess: (pVfs, zName, flags, pOut) => {
      wasm.poke32(pOut, wasm.cstrToJs(zName) === 'catalog.sqlite' ? 1 : 0); return 0;
    },
    xDelete: () => capi.SQLITE_READONLY,
    xFullPathname: (pVfs, zName, nOut, pOut) =>
      wasm.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN,
    xRandomness: (pVfs, n, pOut) => {
      const a = new Uint8Array(n); crypto.getRandomValues(a); wasm.heap8u().set(a, Number(pOut)); return n;
    },
    xSleep: () => 0,
    xCurrentTime: (pVfs, pOut) => { wasm.poke(pOut, 2440587.5 + Date.now() / 86400000, 'double'); return 0; },
    xCurrentTimeInt64: (pVfs, pOut) => { wasm.poke(pOut, BigInt(210866760000000 + Date.now()), 'i64'); return 0; },
    xGetLastError: () => 0
  } } });
  let db;
  const close = () => {
    if (db) { db.close(); db = undefined; }
    capi.sqlite3_vfs_unregister(vfs.pointer); vfs.dispose(); io.dispose();
  };
  try {
    db = new sqlite.oo1.DB({ filename: 'catalog.sqlite', flags: 'r', vfs: name });
    db.exec('PRAGMA query_only=ON; PRAGMA temp_store=MEMORY; PRAGMA cache_size=-4096;');
    const rows = db.selectObjects('SELECT * FROM manifest');
    if (rows.length !== 1 || rows[0].schema_version !== SCHEMA_VERSION ||
        rows[0].analyzer_version !== ANALYZER_VERSION || !rows[0].provider ||
        typeof rows[0].source_version !== 'string') throw new Error('Unsupported catalog schema or analyzer version');
    db.selectObjects('SELECT provider, source_id, title, url, record FROM entries LIMIT 0');
    db.selectObjects('SELECT provider, source_id, record FROM book_entries LIMIT 0');
    db.selectObjects("SELECT rowid FROM title_fts WHERE title_fts MATCH 'catalogvalidation' LIMIT 1");
    return { db, close, stats, manifest: rows[0] };
  } catch (error) {
    close();
    throw new Error(`Invalid catalog: ${error.message}`);
  }
}

self.onmessage = async ({ data }) => {
  if (data?.type === 'init') {
    try {
      sqlitePromise = init({ ...(data.payload ?? {}), locateFile: () => '' });
      await sqlitePromise;
      self.postMessage({ type: 'ready' });
    } catch (error) {
      self.postMessage({ type: 'init-error', error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  const { id, method, args = [] } = data;
  try {
    const sqlite = await (sqlitePromise ??= init());
    let result;
    if (method === 'open') {
      const next = openFile(sqlite, args[0]);
      try {
        const expected = args[1]?.sha256;
        if (expected !== undefined) {
          if (typeof expected !== 'string' || !/^[a-f0-9]{64}$/i.test(expected)) throw new Error('Invalid expected SHA-256');
          const reader = new FileReaderSync(), digest = sha256.create(), file = args[0];
          for (let offset = 0; offset < file.size; offset += 1024 * 1024) {
            digest.update(new Uint8Array(reader.readAsArrayBuffer(file.slice(offset, offset + 1024 * 1024))));
          }
          const actual = [...digest.digest()].map(b => b.toString(16).padStart(2, '0')).join('');
          if (actual !== expected.toLowerCase()) throw new Error('SHA-256 mismatch; previous catalog retained');
          next.manifest = { ...next.manifest, verified_sha256: actual };
          next.stats.verificationBytesRead = file.size;
          next.stats.verificationChunkSize = 1024 * 1024;
        }
      } catch (error) { next.close(); throw error; }
      if (active) active.close();
      active = next;
      result = active.manifest;
    } else if (method === 'close') {
      if (active) active.close();
      active = undefined;
    } else {
      if (!active) throw new Error('No catalog is open');
      if (method === 'manifest') result = active.manifest;
      else if (method === 'stats') result = { ...active.stats };
      else if (method === 'search') {
        const [query, provider, limit = 50] = args;
        if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error('Invalid result limit');
        const expression = matchQuery(query);
        result = [];
        if (expression) {
          const batchSize = 64;
          for (let offset = 0; result.length < limit; offset += batchSize) {
            const rows = active.db.selectObjects(
              `SELECT e.provider,e.source_id AS id,e.title,e.url,e.record FROM title_fts f
               JOIN entries e ON e.id=f.rowid WHERE title_fts MATCH ?
               AND (? IS NULL OR e.provider=?) ORDER BY rank LIMIT ? OFFSET ?`,
              [expression, provider ?? null, provider ?? null, batchSize, offset]);
            for (const {record, ...candidate} of rows) {
              if (matchesTitlePhrases(JSON.parse(record), query)) result.push(candidate);
              if (result.length === limit) break;
            }
            if (rows.length < batchSize) break;
          }
        }
      } else if (method === 'get') {
        const row = active.db.selectObject('SELECT record FROM entries WHERE provider=? AND source_id=?', args) ??
          active.db.selectObject('SELECT record FROM book_entries WHERE provider=? AND source_id=?', args);
        if (!row) throw new Error('Catalog entry not found');
        result = JSON.parse(row.record);
      } else throw new Error(`Unknown catalog operation: ${method}`);
    }
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
