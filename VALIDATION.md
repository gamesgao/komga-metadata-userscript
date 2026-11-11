# Validation ledger

## v0.9.0 ordered language fallback, lean UI and measurable catalog progress

- PASS: 96 core tests, 22 bundled browser tests, eight catalog tests, six release tests and both typechecks. Tests cover legacy unknown-to-other migration, cross-source per-field fallback, explicit override, per-author variants, language ordering persistence/boundary buttons, card deselection, independent source-popup navigation, title-only failed-image tooltips, real download totals arriving after stream start or via concurrent HEAD, and visible determinate download bars.
- Development native Tampermonkey PASS: real AniList variants obey zh→ja→en fallback, Romaji-first and English-first; One-shot series/book English title write/readback/undo succeeds. Real online/offline EH language-controlled tags, manual-tag preservation and both-target undo pass.
- Development native ordinary-HTTP BookWalker PASS: measured staging denominator 969,938 relationship rows, partial value observed with a visible 10px bar; all 14,379 entries build, survive refresh and return three local matches. Popup-hidden work, cancel/complete-archive resume and multi-catalog coexistence pass. SQL-only index/integrity phases show real execution elapsed time rather than fictional percentages. Final published artifact is verified again after release; raw reports/screenshots stay in ignored `.runtime`.
- Fixture upstream data remains distinct from public-source native acceptance. No new full-build claims for the other three upstream datasets and no user NAS access.

## v0.8.0 independent catalog tasks and complete-archive checkpoints

- Component coverage: 91 core tests, 21 bundled browser tests, eight catalog tests and six release tests. The insecure-origin catalog case submits all four formats, observes two concurrent downloads and only one build, detaches the view while work proceeds, cancels another queued source without affecting the active build, injects a build failure, reloads and resumes from a complete archive with zero downloader calls. Actual WASM builds/readers and filesystem storage are used; source downloads in this scheduling fixture are controlled fixtures.
- Save-index failure injection verifies that the old reader/file remains usable, the complete raw archive survives, and a retry succeeds. Provider-scoped raw cleanup retains its database; database removal unloads only that provider, and measured owned storage decreases.
- Native task-mode acceptance: `KOMGA_ACCEPTANCE_HTTP=1 KOMGA_ACCEPTANCE_TASKS=1 KOMGA_ACCEPTANCE_ARTIFACT=... python acceptance/catalog_workflow.py`. Real Tampermonkey/full public BookWalker data exercises download/build while the popup is hidden, cancellation, refresh, continuation without a new download step, full 14,379-entry build, final archive cleanup, completed-catalog restore and local search. Repeat on the published script before reporting delivery; exact artifact SHA/result/screenshots remain in ignored `.runtime/acceptance/catalog-workflow-http/`.
- The first native run exposed cancellation during asynchronous Worker/WASM loading: cancellation was only checked before the factory await. The builder now checks after the await and terminates the newly created Worker without running it; a delayed-factory regression verifies this. A subsequent full build completed; an old label assertion (`已加载` versus `已构建并加载`) was updated to check both successful states.
- No byte-range resume, partial SQLite/import/index checkpoint, automatic restart after reload, background execution after the tab closes, or multi-tab scheduler claim. The other three sources have generated-archive scheduling/build coverage, not new full upstream browser-build claims. No user NAS is contacted.

## v0.7.1 ordinary-HTTP catalog construction

- PASS: typechecks, 91 core tests, 21 bundled browser tests, six catalog tests and six release tests. The no-storage fallback test now disables both OPFS availability and the legacy API, rather than assuming all HTTP is unsupported.
- Actual non-secure origin (`isSecureContext=false`, `navigator.storage.getDirectory` absent): four archive-format fixtures build and persist, four providers restore after reload, and a downloaded export passes native SQLite integrity/provider checks. Tests cover aborted index replacement, an interrupted write, pending-file cleanup, and sparse writes beyond EOF.
- Full native-manager PASS (development artifact): `KOMGA_ACCEPTANCE_HTTP=1 ... python acceptance/catalog_workflow.py` runs real Tampermonkey against an isolated Komga page at `http://catalog-http.test:18767`. Public complete BookWalker data streams to origin storage, builds and validates 14,379 entries, automatically loads, restores after refresh, returns three local 葬送 matches, and coexists with the full external Bangumi catalog. Input cancellation preserves the dialog.
- The test hostname forwards to the loopback test Komga without overriding secure-context rules. Its unrelated background SSE subscription is explicitly aborted because the test forwarding buffers response bodies; catalog downloads, WASM and Komga page/API responses are real. No user NAS is contacted. Published-package verification is rerun separately after release.
- Full-data testing caught a real compatibility issue that small SQLite fixtures missed: FileWriterSync.seek clamps past EOF. A failing sparse-write regression was added, then fixed by extending before seeking. Integrity checks prevented the failed experimental output from being published as an active catalog.
- Legacy storage is Chromium-specific and deprecated; no universal-browser or power-loss durability claim. Other three providers have insecure-origin fixture coverage, not new full upstream browser-build claims. Raw evidence stays in `.runtime/acceptance/catalog-workflow-http/`.

## v0.7.0 local database workflow

- PASS: 91 core tests, 21 bundled browser tests, six catalog tests (including actual browser Workers). File-input bubbling cancel preserves dialog/query state while dialog Escape still closes. Four preset downloads replace URL/manifest/checksum forms; external-file import is secondary.
- Catalog tests exercise four generated archive formats, paged reads, invalid replacement, cancellation during reader startup, persistence across panel destruction/recreation, four simultaneously loaded providers, export, and actual insecure-origin readonly search. Download tests cover status=0 at stream start, final HTTP rejection/length mismatch and abort cleanup.
- PASS: `acceptance/catalog_workflow.py`, real Tampermonkey plus isolated Komga, public complete BookWalker archive -> stream to OPFS -> actual WASM build (14,379 entries) -> automatic load. External full Bangumi catalog coexists; input cancel events preserve the dialog and loaded catalogs. After reload, saved BookWalker automatically restores and 葬送 returns three local matches.
- The native workflow dispatches the browser input cancel event; it does not automate the OS file chooser's Cancel button. Full-browser builds of the other three providers are not claimed. Source HEAD responses can differ from GET (BookWalker HEAD 404/MangaBaka HEAD 403 while real GET succeeds); verification uses actual GET/download, not HEAD as proof of availability.
- Stream integration found and fixed Tampermonkey onloadstart status=0 handling. The real-login harness now checks filled values silently and corrects extension/autofocus interference before submitting; failure screenshots redact login fields.
- Raw artifacts, source archives, full catalogs, test account configuration and screenshots remain uncommitted under `.runtime`.

## v0.6.2 remove EH formatting controls

- Regression asserts zero EH formatting sections, prefix selectors, translation switches, duplicate translation tables or attribution links in the operation UI. Fixed compact translation continues to preserve raw source records, unknown tags and named-entity prefixes; legacy prefix settings cannot select an alternate policy.
- Attribution remains in THIRD_PARTY.md and the generated userscript legal notice. The real-manager EH acceptance continues to cover both online/local records, English/Chinese language choice, both One-shot metadata targets, readback and undo.

## v0.6.1 language-driven EH translation

- PASS: 88 core tests, 20 actual-bundle browser tests. Chinese membership controls translation, including mixed Chinese/Japanese and Chinese/English. English/Japanese-only keep raw EH keys rather than filtering them away as unknown-language text.
- Browser verifies no dictionary request for English/Japanese-only, Chinese on/off rebuilds previews without stale translated values, no separate switch/hit-count/translation table, and a dictionary failure can be resolved by deselecting Chinese without another download. Locks, current-value handling and undo invariants unchanged.
- PASS: real-manager `acceptance/eh_translation.py` independently checks official dictionary and online/local Non-H metadata against actual previews. Four cases (online/offline × English-only/Chinese+Japanese) write both One-shot metadata targets, GET readback matches expected raw/Chinese values, undo restores original English/manual tags, titles stay unchanged.
- v0.6.0 notes below describe its historical independent switch, which v0.6.1 replaces.

## v0.6.0 EH Chinese tags

- PASS: 88 core tests and 19 actual-bundle browser tests. Added compact/full-prefix semantics, no cross-namespace fallback or tag filtering, raw-record preservation, Japanese-only text selection plus Chinese tags, current English-key replacement without deleting manual tags, persistent/expired cache, malformed/failed download fallback, cancellation and prototype-key handling.
- Browser fixture acceptance: preview both prefix policies, one cached download, real fixture HTTP PATCH/readback, locked book preserved; missing dictionary blocks all writes and explicit opt-out restores raw tags without another download.
- PASS real Tampermonkey + isolated Komga: `acceptance/eh_translation.py` independently fetches the official public EHT dictionary and public EH Non-H gallery 373840 metadata. Actual script translates online metadata and an existing full local EH SQLite record; both One-shot metadata targets match the preview on GET and undo restores original English/manual tags. Source title remains unchanged and Japanese-only language selection does not discard Chinese tags. No mocked provider/dictionary responses in this native acceptance.
- Actual examples include `parody:东方project`, `character:火焰猫燐`, `character:古明地觉`, `language:日语`. Dictionary names without a Chinese variant remain as supplied, not invented translations. Komga normalizes tag casing. Native screenshots/reports stay ignored under `.runtime/acceptance/eh-translation/`.

## v0.5.0 field composition / language selection / One-shot shared cover

- PASS: 82 core tests, 17 actual-bundle browser tests, 6 release tests, 5 catalog tests, both typechecks. Tests cover same-provider multi-select, same-value defaults still offering alternative sources, explicit array replacement versus union, per-target field choices, text composition, incompatible scalar types, accepted-language persistence and withdrawn registry entries.
- PASS (real Tampermonkey + isolated Komga): actual AniList native `葬送のフリーレン`, romaji `Sousou no Frieren`, English `Frieren: Beyond Journey’s End` selected from existing upstream variants, not translation. English title written/read back on both One-shot metadata targets and undone.
- PASS (real manager): Bangumi + MangaBaka field preview/write/readback/undo, full local Bangumi database routing and online fallback. Original lock, conflict and injected-503 acceptance retained.
- One-shot independent series upload was tested and returned HTTP 400. This matches [Komga 1.30.0 SeriesController](https://github.com/gotson/komga/blob/1.30.0/komga/src/main/kotlin/org/gotson/komga/interfaces/api/rest/SeriesController.kt#L523). The final implementation uses native series-to-book image fallback, verified in [SeriesLifecycle](https://github.com/gotson/komga/blob/1.30.0/komga/src/main/kotlin/org/gotson/komga/domain/service/SeriesLifecycle.kt#L262-L285), NOT a fabricated second upload. Real acceptance independently hashes both displayed endpoints after application and undo and checks both metadata targets. Shared-image mismatch prevents false success; a new cover lock prevents all writes.
- Language boundaries: provider-labelled alternatives and detectable Japanese kana supported; ambiguous Han/Latin text is explicitly unknown, not guessed. No translation or remote language negotiation is claimed. Temporarily withdrawn providers remain historical adapter fixtures only, not active UI providers.
- Reports/screenshots live under ignored `.runtime/acceptance/{languages,multi-source,real-flows*}`; no production NAS mutation, fixtures/credentials/databases are not released.

## v0.4.0 historical multi-source / automatic local routing

- PASS (component): 74 core tests, 15 actual-bundle browser tests; new tests assert local hit never invokes online search/detail, local miss/error falls back, cancellation never launches fallback, primary/field priority, array deduplication, incompatible scope/volume rejection and all-field locks.
- PASS (browser component): a blocked second source does not hide the first result; progress is 1/2 then 2/2. Two selections require same-work confirmation, explicit summary override writes the chosen source, a locked book summary stays unchanged, and an unselected cover remains unmodified.
- PASS (live): actual Tampermonkey + isolated Komga; Bangumi/MangaBaka merge -> preview provenance -> PATCH/GET equality -> scoped undo. Existing full Bangumi SQLite loaded readonly -> local search/detail -> a no-match query invokes online fallback. No NAS access or database rebuild.
- PASS (live regression): existing real metadata and series/book/One-Shot cover write/readback/undo, conflict and injected-503 acceptance; fixture restore errors none.
- Source audit 2026-11-10 (real GM): Webtoons old search rejected; public desktop-search adaptation returned 15 candidates. YenPress search service still HTTP 502, direct series detail succeeded. MangaDex still HTTP 403; a separate direct request returned browser-verification HTML. Do not mark the latter two searches usable or infer permanent retirement from these failures.
- Reproducible harnesses: `acceptance/multi_source.py`, `acceptance/provider_audit.py`, `acceptance/real_flows.py`; use Python Playwright 1.64.1 for the installed Chromium 156. Fixture/component assertions do not stand in for all-provider live coverage.

Status legend: NOT RUN, PASS (fixture/component), PASS (live), BLOCKED (specific reason), FAIL. No blanket all-pass claim until every advertised feature and environment is exercised. **The component-1 table below is historical, not the current project-wide status.** See the v0.2.1 section here and [UI regression evidence](docs/UI.md) for the executed scope. The project is still not fully accepted as a stable release.

## v0.3.0 source galleries and cover preview acceptance

- PASS (component): 66 core tests, 13 bundled-browser tests, 6 release tests, 5 catalog tests; both typechecks. Tests cover seven search thumbnail mappings, keyboard source folding, preserved search cards after selection, decoded before/after pixels, Blob cleanup and narrow layout.
- PASS (component): missing/non-image cover responses block preview and all writes; retry works. Apply uploads the already-previewed bytes even if the source disappears. Server upload failures remain partial, rather than a false green success.
- PASS (live): actual Tampermonkey + Chromium 156.0.8078.4 + isolated Komga 1.30.0; public Bangumi/MangaBaka gallery images, 20/10 candidates, source collapse and selection retention. Current book image (200×300) and downloaded replacement (637×1000) decode before application. Light/dark screenshots are actual product views, not a mock site.
- PASS (live): real metadata PATCH/GET, locks, native authors, series/book/One-Shot cover upload/readback/undo, stale-preview conflict and injected 503 regression. Fixture restore errors: none.
- Local v0.3.0 developer artifact SHA-256: `de473346ba99be1aec90bd98791229819bde6643d3c8dd3f670caf3e2fbfd9b5`. Release-mode assets have separately pinned URLs and are independently built/tested by the publication workflow.
- Evidence: `acceptance/cover_ui.py`, `acceptance/real_flows.py`; ignored reports/screenshots under `.runtime/acceptance/`. One screenshot-run login automation timeout passed on an independent retry; no product bypass was introduced. Authenticated providers and untested environments remain outside this acceptance.

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
