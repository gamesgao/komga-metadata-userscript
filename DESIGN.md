# Design

## Scope
Desktop browsers first. Standalone userscript, no custom runtime backend. Modules: transport, online providers, normalized records, Komga client/writer, field/lock-aware merge/preview, catalog worker, optional catalog build/export, UI and task state. Existing Komga remains the data server. Never access user's NAS during development.

## Shared model
Use TypeScript. `ProviderId` stable lowercase IDs: bangumi, ehentai, mangaupdates, mangabaka, mangadex, anilist, mal, comicvine, bookwalker, yenpress, viz, webtoons. ExH is authenticated mode of EH. Capabilities are explicit, not every provider has book metadata.
`MetadataRecord`: provider/id/url; titles with text/language/type (native/localized/alias); optional summary/publisher/language/status/ageRating/releaseDate/isbn/volume; tags/genres; authors with name/role and optional native/localized variants; covers with URL/volume/language; optional books. Preserve raw provenance. Candidate search + detail retrieval are separate.
Online provider interface: search(query, context), get(id, context), resolveLink(url), capabilities. Use injected transport for unit tests but bundled runtime uses real GM network. Do not fetch old/removed providers silently; report availability honestly.

## Offline
One normalized schema shared by CLI/build worker and read-only query worker. Required tables: manifest (schema/analyzer/source version and timestamps), entries (provider+source_id, original record JSON and normalized metadata), title index, source relationships when needed. Build CJK-capable FTS and use matching normalization for query. Display text never gets search-only normalization. Database files are immutable standalone snapshots with no live WAL dependency.
Runtime queries: File input -> File sent to dedicated Worker -> SQLite WASM + custom File.slice/FileReaderSync VFS. Bounded page cache, no whole-file arrayBuffer or OPFS import as default. The research implementation in ~/.hermes/research/komga-userscript-feasibility/local-file-spike/ proved FTS5 read-only works even on insecure HTTP. Official SQLite WASM has FTS5; wa-sqlite default build examined did not.
Optional construction: source download or local archive input -> stream decompression -> OPFS SQLite + batched import/index -> validation -> chunked export. HTTPS/storage prerequisites explicit; no mandatory full-catalog indexing on UI entry. Provide one-shot native builder fallback (not a runtime server). Prebuilt release manifest initially empty unless real artifacts are published; never fake a download URL.
Source formats: Bangumi zip JSONL (subjects/persons/subject-persons/relations); EH zstd SQLite; MangaBaka gzip-tar SQLite; BookWalker zstd SQLite. Preserve complete raw EH namespaces and native names. Prepared artifacts may be per provider or combined, but no forced per-library restructuring.

## Komga editing
Explicit preview of edited series/book fields and covers. Authors belong to books. Resolve One-shot's actual book. Match volumes by metadata or explicit user assignment; never cover array order. Read existing fields/locks before plan; avoid changing locked or unselected fields. Re-read before commit for conflict detection. Sequential writes with per-target outcomes, cover download/validation separately. Re-read applied metadata before success. Keep original values for conservative undo that refuses to overwrite subsequent changes. Metadata API only, not archive rewrites.

## Browser UI
One launcher in Komga, current series selection and explicit search, provider toggles, candidate details, merge preview, apply. Shadow DOM/style isolation. Source URL/ID manual input. Native names first. Database panel offers choose local/download prepared/advanced build/export. Provider credentials remain user-local GM storage, never request tokens in group chat or log them. Config export redacts secrets unless explicitly requested locally.

## Evidence boundaries
Unit and fixture browser tests cover failure/lock/merge behavior. Real isolated Komga E2E validates writes/readback/cover/undo. Live public API probes separately exercise available sources. ExH/MAL/ComicVine require appropriate user-supplied credentials for live acceptance and must remain unverified without them. Full offline catalogs tested separately from reduced fixtures. Publishing source is not equivalent to shipping tested stable software.

## Provenance
Reference behavior: Snd-R/komf2.1.0 MIT, dyphire/komf-rs1.14.5 MIT, dyphire/KomgaBangumi2.11.0 MIT. Preserve notices for copied/substantial ports. Source data licenses are distinct from source code licenses; do not redistribute full catalogs without checking. Research notes/source snapshots are available to developers outside repo at ~/.hermes/research/komga-userscript-feasibility/ and the corresponding Obsidian note; never commit raw local notes or hidden credentials.
