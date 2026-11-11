# Catalog integration

The production userscript integrates the panel and providers through `src/catalog-extension.ts`.
The default is four preset source buttons: download -> create/build -> load. There is no
URL, manifest or checksum form. Existing prepared files and existing raw archives are
secondary, collapsed actions. See [user workflow and limitations](../docs/CATALOG.md).

## Build

```sh
npm --prefix catalog ci
npm --prefix catalog run build
npm --prefix catalog run typecheck
npm --prefix catalog test
```

The root build bundles the client/UI and emits `catalog-worker.js`,
`catalog-build-worker.js`, SQLite WASM and license notices. Release URLs pin these
assets to the same script version. The userscript downloads static assets through GM,
creates Blob module Workers, and passes the WASM bytes to initialization. No custom
runtime backend is required. CSP must permit Blob workers and WASM. A local development
asset base on 127.0.0.1 adds an explicit loopback `@connect` only to that dev artifact.

## API

```ts
import { CatalogCollection } from './catalog/src/collection.mjs';
import { catalogProvider, mountCatalogPanel } from './catalog/src/panel.mjs';
const client = new CatalogCollection(workerUrl);
await client.open(file); // reads/validates provider; replaces only that provider
const provider = catalogProvider(client, 'bangumi');
const hits = await client.search('葬送', 'bangumi', 50);
const unmount = mountCatalogPanel(element, client, {
  buildWorkerUrl,
  downloadArchive, // (url, filename, signal, progress) -> {file, cleanup()}
  download,        // GM_download promise, manual fallback only
  fetchManifest,   // GM JSON request for Bangumi's latest archive metadata
});
await unmount();
client.dispose();
```

`CatalogCollection` retains one independent paged reader per provider; a new reader is
validated before replacing the prior reader. Search waits for persisted-catalog restore.
`CatalogClient` remains the single-file API. Both use `FileReaderSync/File.slice` VFS,
not whole-file RAM loading or mandatory OPFS copies. `stats()` reports reads, bytes,
largest read and file size. Cancellation terminates readers; their retained File objects
can be reopened on the next query. Collection cancellation affects its active readers.

`BrowserCatalogBuilder.build(file, provider, sourceVersion?, onProgress?)` creates a new
OPFS output, reporting extraction/staging/index phases and actual index counts. `file()`
returns its completed file; `persist()` commits an `active-PROVIDER.json` pointer and
relinquishes temporary ownership. The panel loads a validated result, commits that pointer
and retires the superseded saved file. Failed index persistence retains the already-loaded
result and tells the user to export it. `dispose()` removes only unpersisted builder-owned
output. `exportTo(writable, chunkSize?)` remains available for streaming exports.

The production downloader handles Tampermonkey's **status=0 onloadstart**, consumes the
ReadableStream incrementally, and waits for final HTTP status and end-of-stream before
committing the temporary archive. It checks final Content-Length when supplied. Failure
and cancellation abort the writer and remove the temporary archive. It does not collect
an entire archive into one Blob/ArrayBuffer. Manager-internal buffering is outside this
module's control. Unsupported stream responses expose a manual-download fallback.

The panel exports through a user-triggered save picker when available, otherwise a File
object URL/browser download. Save-picker cancellation does not close the parent dialog.
Input `cancel` bubbles: the root dialog must act only on cancel events targeting itself.

## Storage, format and compatibility boundaries

- Browser building requires a secure context, OPFS, Worker and sync file access in Worker;
  gzip-tar additionally needs DecompressionStream. Remote plain HTTP cannot use this
  build path, but selected prepared-file querying works there without SharedArrayBuffer.
- Browser-local saved catalogs are per origin/profile; they are not an OS download or
  backup. External file inputs are read-only and need reselection after reload.
- Zstandard decoding verifies frame checksums, rejects dictionary frames, and caps frame
  windows at 64 MiB. SQLite/FTS integrity checks run before a result is published. Checksums
  are not source authentication. No user-entered SHA form is exposed.
- ZIP uses file ranges; decompression and output use OPFS. Staging and FTS can still need
  substantial disk/RAM; source, temporary/index output and the prior saved version can
  coexist. No claim of bounded total memory for every full upstream archive.
- Normal failure/cancel cleans owned temporary files. Abrupt termination may leave files
  in `komga-catalog-build` or `komga-catalog-download`; do not clear unrelated origin data.
- Each SQLite snapshot is one provider. Routing composes it with the online provider of
  the same ID, rather than registering duplicate IDs. EH IDs are `gid:token`; BookWalker
  product IDs may retrieve volume records but not all content-ID URLs map without lookup.
- Source/archive licenses remain separate from this code; no catalogs are redistributed.

## Native CLI

Node 26+, npm, `unzip` and `tar` are required for the CLI:

```sh
node catalog/src/build-cli.mjs --provider bangumi --input /path/source.zip --output /path/bangumi.sqlite --source-version VERSION
node catalog/src/build-cli.mjs --provider ehentai --input /path/e-hentai.db.zstd --output /path/ehentai.sqlite --source-version VERSION
node catalog/src/build-cli.mjs --provider mangabaka --input /path/series.sqlite.tar.gz --output /path/mangabaka.sqlite --source-version VERSION
node catalog/src/build-cli.mjs --provider bookwalker --input /path/bkwk-db.sqlite.zst --output /path/bookwalker.sqlite --source-version VERSION
```

Raw SQLite is also accepted for the three SQLite providers. Output is a new searchable
snapshot, not an update to source archives. CLI builds temporary files beside output,
checks integrity and renames into place, preserving an old destination before commit.
Input filename is used when source-version is omitted, not a verified upstream revision.
FTS uses NFKC/CJK tokens; a continuous-title check rejects matches assembled from scattered
aliases. Display values retain source scripts; volume numbers are not inferred from order.

## Verified scope

The catalog suite generates four archive fixtures, compares browser/native records,
checks schema rejection, checksum failures, batching, cancellation, paged reads, Blob
worker loading, persistence/restore, simultaneous providers and plain-HTTP reads.
`acceptance/catalog_workflow.py` additionally runs genuine Tampermonkey against isolated
Komga: public full BookWalker download, WASM build (14,379 entries), auto-load, coexisting
external Bangumi file, reload restore and three local matches for 葬送. It tests the
input cancel event in the actual installed script, not a mock GM implementation. It does
not automate the operating system's native file-dialog Cancel button, nor claim full
browser builds of all four providers. See VALIDATION.md for historical native/live runs.
