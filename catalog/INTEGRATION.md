# Catalog integration

## Status and boundaries

The native and browser builders have been exercised with generated schema
fixtures, **not full upstream archives**. Full-dataset compatibility, disk
use, memory limits, throughput and data completeness need independent
acceptance. The panel and provider adapters have not been integrated into the
root UI.

The read-only Worker uses official SQLite WASM 3.54.1 and FTS5 with a
FileReaderSync/File.slice VFS. It reads pages, not an entire file or an OPFS
copy. File ownership stays with the browser; reopening after cancellation may
need the selected File object to remain accessible. `stats()` reports reads,
bytes read (including repeated reads), largest read and file size.

## Build and assets

Node 26 or newer, npm, `unzip`, and `tar` are required for the CLI. From the
repository root:

```sh
npm --prefix catalog ci
npm --prefix catalog run build
npm --prefix catalog run typecheck
npm --prefix catalog test
```

The root build must deploy `catalog/dist/worker.mjs`, `build-worker.mjs`,
`analyzer.mjs`, `sqlite/index.mjs` and `sqlite/sqlite3.wasm` together with their
relative paths unchanged. `client.mjs`, `browser-builder.mjs`, `panel.mjs` and
the declarations are also emitted.
Choose an absolute, same-origin worker URL (e.g. the Komga reverse proxy's
static asset path). Module Workers and WASM must be allowed by the site's CSP;
whether a userscript manager can load a cross-origin worker or use blob URLs
depends on browser/manager/CSP and has **not** been verified. No root build or
asset integration is performed here. The npm dependency `@sqlite.org/sqlite-wasm`
is pinned in the isolated lockfile; its package is Apache-2.0. SQLite itself
is public domain. The build Worker bundles zip.js (BSD-3-Clause), fzstd (MIT)
and xxhash-wasm (MIT); esbuild (MIT) is a build-time dependency. Include the
corresponding licenses in the root distribution.

## API

```ts
import { CatalogClient } from './catalog/src/client.mjs';
import { catalogProvider, mountCatalogPanel } from './catalog/src/panel.mjs';
import { BrowserCatalogBuilder, browserBuildCapability } from './catalog/src/browser-builder.mjs';

const client = new CatalogClient(workerUrl); // same-origin module Worker URL
const manifest = await client.open(file);    // File from a file input
const candidates = await client.search('葬送', 'bangumi', 50);
const record = await client.get('bangumi', '1');
const io = await client.stats();
const provider = catalogProvider(client, 'bangumi');
const unmount = mountCatalogPanel(element, client, {
  buildWorkerUrl, // same-origin module Worker URL
  download: async (url, filename) => { /* resolve only on GM_download onload; reject on error */ },
  fetchManifest: async url => { /* GM_xmlhttpRequest; parse JSON, reject HTTP/errors */ },
});
client.cancel(); // terminates Worker, rejects in-flight calls; next call reopens previous valid File
await client.close(); // forget selected file
await unmount();
client.dispose();
```

`BrowserCatalogBuilder` provides `build(file, provider, sourceVersion?)`,
`file()`, `exportTo(writable, chunkSize?)`, `cancel()` and `dispose()`.
`exportTo` writes chunks of at most 1 MiB by default to a caller-supplied
`FileSystemWritableFileStream`-compatible object; it never uses SAHPool's
whole-file `exportFile`. The panel opens a save picker directly from the user
gesture. Browsers without the save picker can still open the built OPFS file,
but cannot use that panel's export button. Build input is a locally selected
source archive (or raw SQLite for the three SQLite sources); network source
downloads are not supplied by this component. The panel can download an
already-prepared catalog through the injected `GM_download` callback.

The browser builder needs a secure context, OPFS, Worker,
`FileSystemSyncAccessHandle` and, for gzip-tar, `DecompressionStream`. It
streams archive extraction into a uniquely named OPFS temporary file; ZIP is
read via Blob ranges. It uses a custom synchronous OPFS VFS for output and
in-memory SQLite temp storage. This is not a guarantee of bounded memory for
full databases: FTS/index operations can be large. Browser Zstandard decoding
validates frame checksums, rejects dictionary frames and caps each frame's
window at 64 MiB; use the native CLI for larger windows or when browser memory
or storage quotas are insufficient. Checksums are not authentication: verify
source archives independently. Temporary OPFS files are removed on
ordinary completion, failure and cancellation; abrupt browser termination can
leave files in the `komga-catalog-build` origin-private directory. Do not clear
other origin storage automatically. A failed or cancelled replacement keeps
the previously completed builder output. `dispose()` removes its completed
temporary output, so export it first if it should persist.

`search` returns `Candidate[]`; `get` returns `MetadataRecord`. Both retain the
original source provider ID. E-Hentai entry IDs use `gid:token`, matching the
online provider; the numeric `gid` and token are also retained in the raw
gallery row. Each catalog is currently one source. The root
registry may already contain an online provider with the same ID: do **not**
register the offline adapter as a second provider into a registry that forbids
duplicate IDs. Compose routing explicitly in the root. `resolveLink` accepts
the four supported sources' series URLs and source IDs. BookWalker volume and
chapter records can be retrieved by their product source ID via `get`, but are
not separate FTS series search candidates and their content-ID URLs cannot
necessarily be resolved to a product ID without a lookup.
The adapter's `AbortSignal`
terminates the shared Worker, so cancellation also cancels other concurrent
catalog requests; the next request reopens the prior file.

The panel takes injected Promise-based callbacks, not raw GM functions.
Cross-origin manifest reads need `GM_xmlhttpRequest` and matching `@connect`
permissions; downloads need `GM_download` and appropriate manager permissions.
For arbitrary user-entered domains the integrator must choose an appropriate
permission policy. No prepared URLs are bundled. A user-provided JSON manifest
must have this shape; URL schemes are restricted to HTTP(S), without embedded
credentials:

```json
{"schema_version":1,"analyzer_version":1,"catalogs":[
  {"provider":"bangumi","source_version":"example","url":"https://example.org/catalog.sqlite"}
]}
```

The URL above illustrates the shape only and is not a published catalog. A
completed download must be selected manually; the panel does not claim that a
download automatically opens a database or validates its content.

## Native CLI

```sh
node catalog/src/build-cli.mjs --provider bangumi --input /path/source.zip --output /path/catalog.sqlite --source-version VERSION
node catalog/src/build-cli.mjs --provider ehentai --input /path/e-hentai.db.zstd --output /path/catalog.sqlite --source-version VERSION
node catalog/src/build-cli.mjs --provider mangabaka --input /path/series.sqlite.tar.gz --output /path/catalog.sqlite --source-version VERSION
node catalog/src/build-cli.mjs --provider bookwalker --input /path/bkwk-db.sqlite.zst --output /path/catalog.sqlite --source-version VERSION
```

For the three SQLite providers, uncompressed `.sqlite` or `.db` is accepted.
`source-version` should identify the actual upstream release; if omitted the
input filename is recorded, not a verified upstream version. The CLI writes
temporary files next to the destination, processes compressed streams without
buffering entire archives in JS, builds disk-backed relationship staging
indexes, commits entries in batches, checks SQLite and FTS integrity, then
renames the completed snapshot into place. It never writes the source database.
Failure before rename preserves the existing destination. Ensure sufficient
free disk for the uncompressed source, staging, FTS and final catalog; no
resource-bound full-catalog measurement has been made. On filesystems that do
not support atomic replacement, rename can fail instead of replacing.

The FTS analyzer stores NFKC/lowercased CJK unigrams and bigrams and word
tokens, and uses the same analyzer for search. This is a token intersection,
not phrase matching, so false positives are possible. Display strings and raw
rows are not normalized. Series, relationships and associated volume records
are kept in record JSON. BookWalker volume numbers are set only when explicitly
present in a volume title, not from array position or display order; other
volumes require user mapping. Full mapping completeness against upstream dumps
remains unverified. Missing source titles use the source ID with a warning.

## Verification actually performed

`npm --prefix catalog run build`, `npm --prefix catalog run typecheck`, and
`npm --prefix catalog test` are the intended checks. Typecheck checks the
declared API against `src/model.ts`, not all JavaScript implementation bodies.
The test generates tiny fixtures for the four archive formats and three raw
SQLite inputs; it checks FTS, names, EH namespaces, source IDs, associated
books, schema rejection, zstd checksum errors, cancellation and atomic failure;
an additional synthetic 2,001-record fixture exercises batch commits. It selects generated
files in a separate headless Chromium and executes the emitted Workers. The
four browser-built fixture catalogs are compared record-for-record with native
output; a MangaBaka archive is also built, exported in 4 KiB chunks, reopened
and searched. The advanced panel's build/open/export path is exercised. A padded
16 MiB fixture confirms reads remain well below file size. The insecure HTTP
origin is simulated using Playwright request routing to the loopback server;
the browser sees `isSecureContext === false`. These are **fixture tests**, not
full archives, real provider APIs, a real Komga server, packaged userscript
integration, or resource-bounded full-catalog tests.

Source-format and mapping behavior was consulted from dyphire/komf-rs 1.14.5
(MIT); the selected-file VFS follows the supplied local-file research spike.
The data sources have separate terms and licenses; this component does not
redistribute their catalogs.
