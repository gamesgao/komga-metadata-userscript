# Validation ledger

Status legend: NOT RUN, PASS (fixture/component), PASS (live), BLOCKED (specific reason), FAIL. No blanket all-pass claim until every advertised feature and environment is exercised. **The component-1 table below is historical, not the current project-wide status.** See the v0.2.1 section here and [UI regression evidence](docs/UI.md) for the executed scope. The project is still not fully accepted as a stable release.

## v0.2.1 automatic Release acceptance (2026-11-09)

- [Source CI](https://github.com/gamesgao/komga-metadata-userscript/actions/runs/42544823020): PASS; 62 core tests, 9 browser tests, 5 catalog tests, 6 release tests, typechecks and committed-dist reproducibility.
- [Automatic Release run](https://github.com/gamesgao/komga-metadata-userscript/actions/runs/42544921416): attempt 1 built/tested the release-mode bundle, uploaded a draft, downloaded/hash-checked every asset, then published. Attempt 2 skipped the published version; release ID and every asset ID remained unchanged.
- [Published v0.2.1](https://github.com/gamesgao/komga-metadata-userscript/releases/tag/v0.2.1): all five public assets returned HTTP 200 without authentication; GitHub digests, SHA256SUMS, ZIP manifest and file hashes matched. Version-pinned reader/build Worker and SQLite WASM URLs also returned matching bytes. No databases or source archives shipped.
- Downloaded script SHA-256: `31160761ee97da9c8124743fdd02bacd4a03b3a6252e67d96f9c9ba11dabd4f7`. Tests below installed these exact public Release bytes, not a local developer rebuild.
- Actual Tampermonkey / Chromium 156.0.8078.4 / isolated Komga 1.30.0: PASS for live Bangumi details, locks and native author mapping, preview/PATCH/GET, series/book/One-Shot cover upload/readback/undo, stale-preview conflicts and injected 503 handling. Synthetic fixture restore had no errors. An initial extension-startup timeout was retried without modifying the product.
- Release UI/read-only catalog acceptance: PASS for themes, preview, narrow layout, Escape and an existing full BookWalker catalog opened through the actual GM-loaded, tag-pinned Worker/WASM. No database was rebuilt for release distribution.
- Installation boundary: direct navigation to the public GitHub attachment URL did not open a native installation prompt in tested Chromium. **File import of the downloaded Release through Tampermonkey was tested successfully**; do not describe the attachment link as universally one-click installation. Update metadata/header/URLs were verified, not a fabricated next-version scheduled-upgrade demonstration.
- Initial draft lookup failed before publication. Fixed by retaining the creation response ID and using release/asset IDs for upload, byte readback and publication; failed empty drafts were removed, without moving any published tag.

## Historical component-1 acceptance

| Feature | Required acceptance | Status |
|---|---|---|
| Install/launch | Actual bundled userscript in a real desktop userscript manager, Komga page | PASS (fixture bundle launch/menu); actual manager NOT RUN |
| Online sources | Search -> chosen ID detail -> meaningful mapped fields; live separate from fixtures | PASS (public Node transport probes, below); GM live transport NOT RUN |
| Authentication modes | Local user credential entry, expiry/redaction; ExH/MAL/ComicVine live needs credentials | PASS (fixture missing credentials, explicit ExH config, GM storage); authenticated live/expiry NOT RUN |
| Preview/merge | Unselected fields unchanged; native names/namespaced tags retained | PASS (unit + actual bundle browser fixture) |
| Locks/One-shot/volumes | Book + series locks, real One-shot book, explicit volume association | PASS (fixture actual DTO IDs); real Komga NOT RUN |
| Apply/readback/undo | Real local Komga PATCH, cover upload, readback; conservative undo | PASS (fixture HTTP PATCH/multipart/selection/readback/undo); real Komga NOT RUN |
| Failures | HTTP403/429/timeouts/missing cover/cancel/conflict; no false success | PASS (component HTTP/auth/retry/cancel/conflict/image/partial cases); manager timeout and real server failures NOT RUN |
| Local prebuilt DB | Actual File input, paged VFS, FTS, no full import/no mutation | NOT RUN |
| Four source builders | Real schemas, streaming/batched generation, same normalized catalog version | NOT RUN |
| Full catalogs | Full public source imports/query checks, record resource/coverage limits | NOT RUN |
| Download/build/export | Actual manager download, actual browser build and selected output, reload validity | NOT RUN |
| Persistence/update | Settings/queue, schema-version mismatch, old file preservation | PASS (GM settings/undo component shim); real manager persistence, catalog versions NOT RUN |
| Desktop browser matrix | Chromium primary, Firefox where supported; exact versions recorded | PASS (Chromium fixture only, below); Firefox/real manager NOT RUN |
| CI/release | Tests/build remote CI, committed dist matches built and published files | NOT RUN |

## Executed component checks (2026-11-07, local macOS arm64)

| Command | Exact result and scope |
|---|---|
| `npm test` | PASS: Vitest 3.2.7, 6 files / 60 tests. Injected fixture responses, not live provider acceptance |
| `npm run typecheck` | PASS: strict TypeScript, source and tests |
| `npm run build` | PASS: esbuild; `dist/komga-metadata.user.js`, 100346 bytes in this execution |
| `npm run test:browser` | PASS: 5 tests; builds and loads actual dist artifact; Playwright Chromium Headless Shell 158.0.8127.18 |
| `git diff --check` | PASS: no whitespace errors at execution |
| `npm run test:live` | PASS for 9 public sources' small search/link/detail probes; own-credential sources explicitly NOT RUN |

The browser suite starts its own `127.0.0.1` random-port HTTP fixture and uses a
GM shim, an ephemeral browser context, and generated decodable PNG bytes. It
exercises native safe rendering, both series/book locks, title preservation,
array merging/editable choices, real fixture multipart requests to the actual
One-shot book ID, byte/selection readback, scoped undo, persistent visible
partial failures, conflict preservation, cancellation, one-source failure
isolation, and menu fallback after launcher removal. Non-Komga fixture pages
make zero GM storage/menu/network calls and have no script UI. No existing
browser profile or real Komga credential is used. This is **not** a genuine
userscript-manager or real Komga account/library test.

Component tests additionally exercise modern MU base36 vs API numeric and
legacy redirect IDs, incorrect IDs/responses, missing credential behavior,
per-source serialization/queue limits/Retry-After, book ownership, unique
volume numbers rather than array positions, readback mismatch, newly locked
fields, same-size/different-byte covers, failed-own-artifact cleanup, and
refusal to delete a preexisting ID returned by an invalid upload receipt.

## Public live probes: search vs mapped data completeness

Transport was **Node fetch**, not browser GM. Query was `Frieren`, except
Webtoons `Tower of God`. Each probe searched, resolved the **first returned
candidate's public URL**, checked its ID, and retrieved its detail. These are
small live identity/mapping checks, not exhaustive relevance, native-name,
all-volume, all-author, image-download, or provider-catalog completeness
acceptance. Counts below are the last execution's mapped fields, not fixed
expectations for upstream content.

| Source | Search candidates | Detail | Titles / authors / tags / genres / covers / related books | Available summary / publisher / date / status |
|---|---:|---|---|---|
| Bangumi next | 1 | PASS (live mapping) | 4 / 4 / 30 / 0 / 1 / 15 | yes / yes / yes / unknown |
| MangaUpdates | 25 | PASS (live mapping) | 2 / 2 / 9 / 3 / 1 / 0 | absent / absent / unknown / unknown |
| MangaBaka | 10 | PASS (live mapping) | 67 / 2 / 80 / 8 / 105 / 0 | yes / yes / yes / yes |
| MangaDex | 11 | PASS (live mapping) | 14 / 2 / 8 / 0 / 76 / 0 | yes / absent / unknown / yes |
| AniList | 3 | PASS (live mapping) | 3 / 14 / 0 / 3 / 1 / 0 | yes / absent / yes / yes |
| EH public | 25 | PASS (live mapping) | 2 / 0 / 14 / 1 / 1 / 0 | absent / absent / unknown / unknown |
| VIZ | 15 | PASS (live mapping) | 1 / 2 / 0 / 3 / 1 / 0 | yes / yes / yes / unknown |
| YenPress | 2 | PASS (live mapping) | 1 / 3 / 0 / 0 / 1 / 2 | yes (featured volume) / yes / unknown / unknown |
| Webtoons | 23 | PASS (live mapping) | 1 / 1 / 0 / 1 / 1 / 0 | yes / absent / unknown / yes |
| MAL | NOT RUN | Own Client ID unset | fixture mapping only | authenticated live NOT RUN |
| ComicVine | NOT RUN | Own API Key unset | fixture mapping only | authenticated live NOT RUN |
| ExH authenticated mode | NOT RUN | Explicit cookies unset | fixture configuration only | authenticated live NOT RUN |

Initial live checks exposed VIZ's modern `/product/ID` paths and Webtoons'
required Referer header; both were corrected and retested. YenPress's global
recommended-title links are now excluded: related books come from the scoped
paginated series endpoint, and duplicated mobile/desktop authors/count
superscripts are not mistaken for metadata. This does not assert all future
HTML structures will remain compatible.

Raw local responses/probe reports/browser downloads are under ignored
`.runtime/` or `test-results/`, not distributed. Only sanitized aggregate
evidence is recorded here. No NAS, mounted library, private configuration URL,
real server credentials, git commit or push was accessed/performed.

## Remaining acceptance and next component

Main operator still needs actual manager installation/session behavior and
isolated real Komga write/readback/cover/undo acceptance, authenticated source
acceptance, Firefox/desktop matrix, and publication. Component 2 still owns
readonly paged SQLite Worker/VFS, file selection, the shared catalog
schema/analyzer, all four resource-bounded archive builders, full catalogs,
download/build/export and database UI. No offline PASS or complete-project
claim is made. The stable hooks are `Provider`, `Registry.register`,
`CatalogExtension`, `Panel.mount(extension)`, and `workerAssetBase`.
