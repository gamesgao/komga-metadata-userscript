// src/worker.mjs
import init from "./sqlite/index.mjs";

// node_modules/@noble/hashes/_u64.js
var fromNumH = (n) => n / 2 ** 32 | 0;
var fromNumL = (n) => n >>> 0;
function setU64FromNum(view, byteOffset, n, isLE) {
  const h = fromNumH(n);
  const l = fromNumL(n);
  view.setUint32(byteOffset, isLE ? l : h, isLE);
  view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
}

// node_modules/@noble/hashes/utils.js
function isBytes(a) {
  return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
}
var atitle = (title) => title ? `"${title}" ` : "";
function anumber(n, title = "") {
  if (typeof n !== "number")
    throw new TypeError(atitle(title) + "expected number, got " + typeof n);
  if (!Number.isSafeInteger(n) || n < 0)
    throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
  return n;
}
function abytes(value, length, title = "") {
  if (isBytes(value) && (length === void 0 || value.length === length))
    return value;
  if (length !== void 0)
    anumber(length, "length");
  const bytes = isBytes(value);
  const ofLen = length !== void 0 ? ` of length ${length}` : "";
  const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
  const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
  if (!bytes)
    throw new TypeError(message);
  throw new RangeError(message);
}
var aobject = (value, label) => {
  if (value === null || typeof value !== "object" || Array.isArray(value))
    throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
};
var aopts = (value, label) => {
  aobject(value, label);
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null)
    throw new TypeError(`"${label}" expected plain object`);
  if (Object.hasOwn(value, "__proto__"))
    throw new TypeError(`"${label}.__proto__" is not allowed`);
};
function aexists(instance, checkFinished = true) {
  if (instance.destroyed)
    throw new Error("hash was destroyed");
  if (checkFinished && instance.finished)
    throw new Error("digest() was already called");
}
function aoutput(out, instance) {
  abytes(out, void 0, "output");
  const min = instance.outputLen;
  if (!(out.length >= min)) {
    throw new RangeError('"output" expected length >= ' + min);
  }
}
function clean(...arrays) {
  for (let i = 0; i < arrays.length; i++) {
    arrays[i].fill(0);
  }
}
function createView(arr) {
  return new DataView(arr.buffer, arr.byteOffset, arr.byteLength);
}
function rotr(word, shift) {
  return word << 32 - shift | word >>> shift;
}
function checkOpts(defaults, opts, title = "opts") {
  aopts(defaults, "defaults");
  if (opts !== void 0)
    aopts(opts, title);
  const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
  return merged;
}
function createHasher(hashCons, info = {}) {
  if (typeof hashCons !== "function")
    throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
  info = checkOpts({}, info, "info");
  const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
  const tmp = hashCons(void 0);
  hashC.outputLen = tmp.outputLen;
  hashC.blockLen = tmp.blockLen;
  hashC.canXOF = tmp.canXOF;
  hashC.create = (opts) => hashCons(opts);
  Object.assign(hashC, info);
  return Object.freeze(hashC);
}
var oidNist = (suffix) => ({
  // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
  // Larger suffix values would need base-128 OID encoding and a different length byte.
  oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
});

// node_modules/@noble/hashes/_md.js
function Chi(a, b, c) {
  return a & b ^ ~a & c;
}
function Maj(a, b, c) {
  return a & b ^ a & c ^ b & c;
}
var HashMD = class {
  blockLen;
  outputLen;
  canXOF = false;
  padOffset;
  isLE;
  // For partial updates less than block size
  buffer;
  view;
  finished = false;
  length = 0;
  pos = 0;
  destroyed = false;
  constructor(blockLen, outputLen, padOffset, isLE) {
    this.blockLen = blockLen;
    this.outputLen = outputLen;
    this.padOffset = padOffset;
    this.isLE = isLE;
    this.buffer = new Uint8Array(blockLen);
    this.view = createView(this.buffer);
  }
  update(data) {
    aexists(this);
    abytes(data);
    const { view, buffer, blockLen } = this;
    const len = data.length;
    let processed = false;
    for (let pos = 0; pos < len; ) {
      const take = Math.min(blockLen - this.pos, len - pos);
      if (take === blockLen) {
        const dataView = createView(data);
        for (; blockLen <= len - pos; pos += blockLen)
          this.process(dataView, pos);
        processed = true;
        continue;
      }
      buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
      this.pos += take;
      pos += take;
      if (this.pos === blockLen) {
        this.process(view, 0);
        this.pos = 0;
        processed = true;
      }
    }
    this.length += data.length;
    if (processed)
      this.roundClean();
    return this;
  }
  digestInto(out) {
    aexists(this);
    aoutput(out, this);
    this.finished = true;
    const { buffer, view, blockLen, isLE } = this;
    let { pos } = this;
    buffer[pos++] = 128;
    buffer.fill(0, pos);
    if (this.padOffset > blockLen - pos) {
      this.process(view, 0);
      buffer.fill(0);
    }
    setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
    this.process(view, 0);
    this.roundClean();
    const oview = out === buffer ? view : createView(out);
    const len = this.outputLen;
    const outLen = len / 4;
    const state = this.get();
    if (len % 4 || outLen > state.length)
      throw new Error("invalid outputLen");
    for (let i = 0; i < outLen; i++)
      oview.setUint32(4 * i, state[i], isLE);
  }
  digest() {
    const { buffer, outputLen } = this;
    this.digestInto(buffer);
    const res = buffer.slice(0, outputLen);
    this.destroy();
    return res;
  }
  _cloneIntoMeta(to) {
    const { buffer, length, finished, destroyed, pos } = this;
    to.destroyed = destroyed;
    to.finished = finished;
    to.length = length;
    to.pos = pos;
    if (pos)
      to.buffer.set(buffer);
    return to;
  }
  clone() {
    return this._cloneInto();
  }
};
var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
  1779033703,
  3144134277,
  1013904242,
  2773480762,
  1359893119,
  2600822924,
  528734635,
  1541459225
]);

// node_modules/@noble/hashes/sha2.js
var SHA256_K = /* @__PURE__ */ Uint32Array.from([
  1116352408,
  1899447441,
  3049323471,
  3921009573,
  961987163,
  1508970993,
  2453635748,
  2870763221,
  3624381080,
  310598401,
  607225278,
  1426881987,
  1925078388,
  2162078206,
  2614888103,
  3248222580,
  3835390401,
  4022224774,
  264347078,
  604807628,
  770255983,
  1249150122,
  1555081692,
  1996064986,
  2554220882,
  2821834349,
  2952996808,
  3210313671,
  3336571891,
  3584528711,
  113926993,
  338241895,
  666307205,
  773529912,
  1294757372,
  1396182291,
  1695183700,
  1986661051,
  2177026350,
  2456956037,
  2730485921,
  2820302411,
  3259730800,
  3345764771,
  3516065817,
  3600352804,
  4094571909,
  275423344,
  430227734,
  506948616,
  659060556,
  883997877,
  958139571,
  1322822218,
  1537002063,
  1747873779,
  1955562222,
  2024104815,
  2227730452,
  2361852424,
  2428436474,
  2756734187,
  3204031479,
  3329325298
]);
var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
var SHA2_32B = class extends HashMD {
  // We cannot use array here since array allows indexing by variable
  // which means optimizer/compiler cannot use registers.
  // Numeric initializers matter: starting the fields as `undefined` changes
  // V8's field representation and makes sha256 3x slower (measured).
  A = 0;
  B = 0;
  C = 0;
  D = 0;
  E = 0;
  F = 0;
  G = 0;
  H = 0;
  constructor(outputLen, IV) {
    super(64, outputLen, 8, false);
    this.A = IV[0] | 0;
    this.B = IV[1] | 0;
    this.C = IV[2] | 0;
    this.D = IV[3] | 0;
    this.E = IV[4] | 0;
    this.F = IV[5] | 0;
    this.G = IV[6] | 0;
    this.H = IV[7] | 0;
  }
  get() {
    const { A, B, C, D, E, F, G, H } = this;
    return [A, B, C, D, E, F, G, H];
  }
  // prettier-ignore
  set(A, B, C, D, E, F, G, H) {
    this.A = A | 0;
    this.B = B | 0;
    this.C = C | 0;
    this.D = D | 0;
    this.E = E | 0;
    this.F = F | 0;
    this.G = G | 0;
    this.H = H | 0;
  }
  _cloneInto(to) {
    (to ||= new this.constructor()).set(...this.get());
    return this._cloneIntoMeta(to);
  }
  process(view, offset) {
    for (let i = 0; i < 16; i++, offset += 4)
      SHA256_W[i] = view.getUint32(offset, false);
    for (let i = 16; i < 64; i++) {
      const W15 = SHA256_W[i - 15];
      const W2 = SHA256_W[i - 2];
      const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
      const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
      SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
    }
    let { A, B, C, D, E, F, G, H } = this;
    for (let i = 0; i < 64; i++) {
      const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
      const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
      const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
      const T2 = sigma0 + Maj(A, B, C) | 0;
      H = G;
      G = F;
      F = E;
      E = D + T1 | 0;
      D = C;
      C = B;
      B = A;
      A = T1 + T2 | 0;
    }
    A = A + this.A | 0;
    B = B + this.B | 0;
    C = C + this.C | 0;
    D = D + this.D | 0;
    E = E + this.E | 0;
    F = F + this.F | 0;
    G = G + this.G | 0;
    H = H + this.H | 0;
    this.set(A, B, C, D, E, F, G, H);
  }
  roundClean() {
    clean(SHA256_W);
  }
  destroy() {
    this.destroyed = true;
    this.set(0, 0, 0, 0, 0, 0, 0, 0);
    clean(this.buffer);
  }
};
var _SHA256 = class extends SHA2_32B {
  constructor() {
    super(32, SHA256_IV);
  }
};
var sha256 = /* @__PURE__ */ createHasher(
  () => new _SHA256(),
  /* @__PURE__ */ oidNist(1)
);

// src/phrase.mjs
function matchesTitlePhrases(record, query) {
  const normalize = (text) => String(text).normalize("NFKC").toLowerCase();
  const titles = (record.titles ?? []).map((title) => normalize(title.text));
  const phrases = normalize(query).trim().split(/\s+/).filter(Boolean);
  return phrases.length > 0 && phrases.every((phrase) => titles.some((title) => title.includes(phrase)));
}

// src/analyzer.mjs
var SCHEMA_VERSION = 1;
var ANALYZER_VERSION = 1;
function tokens(text) {
  const result = [];
  const normalized = String(text).normalize("NFKC").toLowerCase();
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
function matchQuery(query) {
  return tokens(query).map((token) => `"${token.replaceAll('"', '""')}"`).join(" AND ");
}

// src/worker.mjs
var sqlitePromise;
var active;
var sequence = 0;
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
        stats.reads++;
        stats.bytesRead += bytes.length;
        stats.largestRead = Math.max(stats.largestRead, bytes.length);
        const dest = wasm.heap8u().subarray(Number(pDest), Number(pDest) + n);
        dest.fill(0);
        dest.set(bytes);
        return bytes.length < n ? capi.SQLITE_IOERR_SHORT_READ : 0;
      } catch {
        return capi.SQLITE_IOERR_READ;
      }
    },
    xWrite: () => capi.SQLITE_READONLY,
    xTruncate: () => capi.SQLITE_READONLY,
    xSync: () => 0,
    xFileSize: (pFile, pSize) => {
      wasm.poke(pSize, BigInt(file.size), "i64");
      return 0;
    },
    xLock: () => 0,
    xUnlock: () => 0,
    xCheckReservedLock: (pFile, pOut) => {
      wasm.poke32(pOut, 0);
      return 0;
    },
    xFileControl: () => capi.SQLITE_NOTFOUND,
    xSectorSize: () => 4096,
    xDeviceCharacteristics: () => capi.SQLITE_IOCAP_IMMUTABLE
  } }, vfs: { struct: vfs, methods: {
    xOpen: (pVfs, zName, pFile, flags, pOut) => {
      if (wasm.cstrToJs(zName) !== "catalog.sqlite") return capi.SQLITE_CANTOPEN;
      const f = new capi.sqlite3_file(pFile);
      f.$pMethods = io.pointer;
      f.dispose();
      wasm.poke32(pOut, capi.SQLITE_OPEN_READONLY);
      return 0;
    },
    xAccess: (pVfs, zName, flags, pOut) => {
      wasm.poke32(pOut, wasm.cstrToJs(zName) === "catalog.sqlite" ? 1 : 0);
      return 0;
    },
    xDelete: () => capi.SQLITE_READONLY,
    xFullPathname: (pVfs, zName, nOut, pOut) => wasm.cstrncpy(pOut, zName, nOut) < nOut ? 0 : capi.SQLITE_CANTOPEN,
    xRandomness: (pVfs, n, pOut) => {
      const a = new Uint8Array(n);
      crypto.getRandomValues(a);
      wasm.heap8u().set(a, Number(pOut));
      return n;
    },
    xSleep: () => 0,
    xCurrentTime: (pVfs, pOut) => {
      wasm.poke(pOut, 24405875e-1 + Date.now() / 864e5, "double");
      return 0;
    },
    xCurrentTimeInt64: (pVfs, pOut) => {
      wasm.poke(pOut, BigInt(21086676e7 + Date.now()), "i64");
      return 0;
    },
    xGetLastError: () => 0
  } } });
  let db;
  const close = () => {
    if (db) {
      db.close();
      db = void 0;
    }
    capi.sqlite3_vfs_unregister(vfs.pointer);
    vfs.dispose();
    io.dispose();
  };
  try {
    db = new sqlite.oo1.DB({ filename: "catalog.sqlite", flags: "r", vfs: name });
    db.exec("PRAGMA query_only=ON; PRAGMA temp_store=MEMORY; PRAGMA cache_size=-4096;");
    const rows = db.selectObjects("SELECT * FROM manifest");
    if (rows.length !== 1 || rows[0].schema_version !== SCHEMA_VERSION || rows[0].analyzer_version !== ANALYZER_VERSION || !rows[0].provider || typeof rows[0].source_version !== "string") throw new Error("Unsupported catalog schema or analyzer version");
    db.selectObjects("SELECT provider, source_id, title, url, record FROM entries LIMIT 0");
    db.selectObjects("SELECT provider, source_id, record FROM book_entries LIMIT 0");
    db.selectObjects("SELECT rowid FROM title_fts WHERE title_fts MATCH 'catalogvalidation' LIMIT 1");
    return { db, close, stats, manifest: rows[0] };
  } catch (error) {
    close();
    throw new Error(`Invalid catalog: ${error.message}`);
  }
}
self.onmessage = async ({ data }) => {
  if (data?.type === "init") {
    try {
      sqlitePromise = init({ ...data.payload ?? {}, locateFile: () => "" });
      await sqlitePromise;
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({ type: "init-error", error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }
  const { id, method, args = [] } = data;
  try {
    const sqlite = await (sqlitePromise ??= init());
    let result;
    if (method === "open") {
      const next = openFile(sqlite, args[0]);
      try {
        const expected = args[1]?.sha256;
        if (expected !== void 0) {
          if (typeof expected !== "string" || !/^[a-f0-9]{64}$/i.test(expected)) throw new Error("Invalid expected SHA-256");
          const reader = new FileReaderSync(), digest = sha256.create(), file = args[0];
          for (let offset = 0; offset < file.size; offset += 1024 * 1024) {
            digest.update(new Uint8Array(reader.readAsArrayBuffer(file.slice(offset, offset + 1024 * 1024))));
          }
          const actual = [...digest.digest()].map((b) => b.toString(16).padStart(2, "0")).join("");
          if (actual !== expected.toLowerCase()) throw new Error("SHA-256 mismatch; previous catalog retained");
          next.manifest = { ...next.manifest, verified_sha256: actual };
          next.stats.verificationBytesRead = file.size;
          next.stats.verificationChunkSize = 1024 * 1024;
        }
      } catch (error) {
        next.close();
        throw error;
      }
      if (active) active.close();
      active = next;
      result = active.manifest;
    } else if (method === "close") {
      if (active) active.close();
      active = void 0;
    } else {
      if (!active) throw new Error("No catalog is open");
      if (method === "manifest") result = active.manifest;
      else if (method === "stats") result = { ...active.stats };
      else if (method === "search") {
        const [query, provider, limit = 50] = args;
        if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new Error("Invalid result limit");
        const expression = matchQuery(query);
        result = [];
        if (expression) {
          const batchSize = 64;
          for (let offset = 0; result.length < limit; offset += batchSize) {
            const rows = active.db.selectObjects(
              `SELECT e.provider,e.source_id AS id,e.title,e.url,e.record FROM title_fts f
               JOIN entries e ON e.id=f.rowid WHERE title_fts MATCH ?
               AND (? IS NULL OR e.provider=?) ORDER BY rank LIMIT ? OFFSET ?`,
              [expression, provider ?? null, provider ?? null, batchSize, offset]
            );
            for (const { record, ...candidate } of rows) {
              if (matchesTitlePhrases(JSON.parse(record), query)) result.push(candidate);
              if (result.length === limit) break;
            }
            if (rows.length < batchSize) break;
          }
        }
      } else if (method === "get") {
        const row = active.db.selectObject("SELECT record FROM entries WHERE provider=? AND source_id=?", args) ?? active.db.selectObject("SELECT record FROM book_entries WHERE provider=? AND source_id=?", args);
        if (!row) throw new Error("Catalog entry not found");
        result = JSON.parse(row.record);
      } else throw new Error(`Unknown catalog operation: ${method}`);
    }
    self.postMessage({ id, result });
  } catch (error) {
    self.postMessage({ id, error: error instanceof Error ? error.message : String(error) });
  }
};
