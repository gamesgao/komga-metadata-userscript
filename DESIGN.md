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
Construction: four source buttons or existing archive input -> streaming origin-local download/decompression -> SQLite batched import/index -> validation -> auto-load/persist, with optional export. Prefer OPFS in secure contexts; a feature-detected Chromium legacy filesystem adapter enables actual non-secure HTTP. Its FileWriterSync seek clamps at EOF, so sparse writes must extend before seeking. Temporary siblings preserve old files on abort; per-build cleanup also handles terminated workers. The deprecated API is not a permanent/cross-browser guarantee or an fsync substitute. No mandatory indexing on UI entry, security-disabling flags, runtime backend, or redistribution of source catalogs.
Source formats: Bangumi zip JSONL (subjects/persons/subject-persons/relations); EH zstd SQLite; MangaBaka gzip-tar SQLite; BookWalker zstd SQLite. Preserve complete raw EH namespaces and native names. Prepared artifacts may be per provider or combined, but no forced per-library restructuring.

## Komga editing
Explicit preview of edited series/book fields and covers. Authors belong to books. Resolve One-shot's actual book. Match volumes by metadata or explicit user assignment; never cover array order. Read existing fields/locks before plan; avoid changing locked or unselected fields. Re-read before commit for conflict detection. Sequential writes with per-target outcomes, cover download/validation separately. Re-read applied metadata before success. Keep original values for conservative undo that refuses to overwrite subsequent changes. Metadata API only, not archive rewrites.

## Browser UI
One launcher in Komga, current series selection and explicit search, provider toggles, candidate details, merge preview, apply. Shadow DOM/style isolation. Source URL/ID manual input. Native names first. Database panel offers choose local/download prepared/advanced build/export. Provider credentials remain user-local GM storage, never request tokens in group chat or log them. Config export redacts secrets unless explicitly requested locally.

## Evidence boundaries
Unit and fixture browser tests cover failure/lock/merge behavior. Real isolated Komga E2E validates writes/readback/cover/undo. Live public API probes separately exercise available sources. ExH/MAL/ComicVine require appropriate user-supplied credentials for live acceptance and must remain unverified without them. Full offline catalogs tested separately from reduced fixtures. Publishing source is not equivalent to shipping tested stable software.

## Provenance
Reference behavior: Snd-R/komf2.1.0 MIT, dyphire/komf-rs1.14.5 MIT, dyphire/KomgaBangumi2.11.0 MIT. Preserve notices for copied/substantial ports. Source data licenses are distinct from source code licenses; do not redistribute full catalogs without checking. Research notes/source snapshots are available to developers outside repo at ~/.hermes/research/komga-userscript-feasibility/ and the corresponding Obsidian note; never commit raw local notes or hidden credentials.

## Component 1 implementation

`src/model.ts` defines the stable provider/record/context interfaces and optional
`CatalogExtension`; `Registry.register` attaches online or future offline
providers without changing writer behavior. Capabilities separate gallery,
volume metadata, and volume-cover-only sources. `workerAssetBase` is a compile
time static directory, not a runtime service. Component 2's worker/VFS/schema
and builders are not implemented by component 1.

`src/transport.ts` provides anonymous GM cross-origin requests (explicit ExH
cookies only), per-source serialization, maximum queue 50, at most two retries,
60-second maximum Retry-After, cancellation, and retained source cooldown.
`src/komga.ts` owns session fetch and deployment/route detection. Detection is
DOM-only and conservative before any network, storage, UI or menu effects.
`src/providers/` validates JSON/HTML boundaries and IDs; remote DOM is never
inserted into the host page.

`src/plan.ts` creates selected-field edits with scoped originals and lock
guards. Explicit book IDs take precedence over uniquely verified metadata
volume numbers; One-shot must have exactly one associated server book.
`src/writer.ts` preflights every target, serially rereads/writes/verifies each,
tracks independent partial outcomes, and restores only snapshots whose
current fields still equal the attempted new values. Metadata snapshots are
retained even when write delivery/readback is uncertain, so undo can safely
attempt recovery without pretending success. Cover snapshots retain previous
selection and byte hashes; cleanup requires a newly returned upload ID not
present before upload. No user-cover sweeping is performed.

Komga offers no atomic conditional PATCH in the API used here, so a small
read-to-write race remains; the implementation does not claim transactional
updates. Server image-byte transformations intentionally fail strict content
verification. `src/ui.ts` mounts safe vanilla DOM in Shadow DOM, persists only
GM settings/undo, shows editable previews and concrete partial/error outcomes,
and fades only the local successful metadata action indicator.
