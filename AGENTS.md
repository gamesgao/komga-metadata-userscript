# Project constraints

Build a real backend-free DESKTOP userscript for Komga. The user explicitly requires functional verification, not just builds/unit tests. Keep source, tests, and design in this standalone repo. No review/subagents; implement directly. Main operator handles git commits/push and independent acceptance.

## Safety/scope
- NEVER access the user's NAS, SSH hosts, mounted libraries, real Komga server, or real credentials. Only isolated loopback test servers and public provider endpoints. Do not fetch any URL copied from private config.
- Work only in this repository and explicitly supplied research paths. No edits to Hermes, global config, unrelated repositories, browser profiles, or Obsidian.
- No secrets, full downloaded catalogs, archives, logs, internal prompts or sessions in git. .gitignore all local runtime/evidence raw paths. Sanitize committed evidence.
- No publishing, git push/commit, subagents or other agent CLIs. Main operator does those.

## Product contract
- No custom runtime backend. Program and WASM assets may be static. No service required to search or write metadata.
- Runtime is a userscript installed with desktop Tampermonkey/compatible managers. Cross-origin source traffic through GM API; Komga same-origin fetch with current session, respecting reverse-proxy base paths.
- Online multi-source providers plus offline preindexed local SQLite. Native Japanese titles/authors preserved; do not force romaji/Chinese/t2s for display. Keep raw namespaced EH tags internally. EH Chinese tag writeback defaults on per user request, with a visible opt-out and compact/preserve-prefix choice. Compact removes descriptive prefixes after dictionary hits, not tags; title/author language stays independent. Always preview the projection and preserve original undo snapshots.
- Offline default: user selects a PREBUILT database file, readonly paged SQLite VFS in a Worker. Do not load whole DB into RAM or force copying/index building in browser. Browser build/download/export are optional advanced functions.
- Keep provider registry modular. Missing credentials must yield explicit authentication-required status, not success/empty array. Never fake successful live provider tests.
- Preview before write. Preserve unspecified fields and source links/tags, respect series AND book locks; array updates replace so merge deliberately. Series DTO has no authors: apply authors to appropriate books. One-shot must update actual associated book and its cover. Explicit book/volume mappings, no array-index guessing.
- Source failures do not erase other source results. Cancelable serialized/per-source bounded jobs and rate limit retry; no endless retry.
- Success only after write+readback. Partial metadata/cover failure must remain partial/error. Don't swallow errors. Snapshot original edited fields for scoped undo; do not overwrite unrelated concurrent changes.
- UI Chinese short text, no global success banner. Spinner -> green check -> short delay -> fade for successful metadata action; failure remains actionable. Keep advanced database task details separate from simple metadata panel.
- Use safe DOM/textContent for remote content; no remote eval, no broad page-global patches. Avoid global stylesheet collisions.

## Verification
Functional tests cover actual bundled artifact in browser; real local Komga account/library write-readback; API search and data completeness separately from fixtures. Claims in docs must say exact validation level and limitations. Private/authenticated sources cannot be marked live-PASS without credentials. Catalog builders support all four formats (Bangumi JSONL ZIP, EH zstd SQLite, MangaBaka gzip-tar SQLite, BookWalker zstd SQLite) and produce same schema/analyzer versions. Full catalogs need resource-bounded acceptance distinct from small test fixtures.
