# Validation ledger

Status legend: NOT RUN, PASS (fixture/component), PASS (live), BLOCKED (specific reason), FAIL. No blanket all-pass claim until every advertised feature and environment is exercised. Current status: development not started.

| Feature | Required acceptance | Status |
|---|---|---|
| Install/launch | Actual bundled userscript in a real desktop userscript manager, Komga page | NOT RUN |
| Online sources | Search -> chosen ID detail -> meaningful mapped fields; live separate from fixtures | NOT RUN |
| Authentication modes | Local user credential entry, expiry/redaction; ExH/MAL/ComicVine live needs credentials | NOT RUN |
| Preview/merge | Unselected fields unchanged; native names/namespaced tags retained | NOT RUN |
| Locks/One-shot/volumes | Book + series locks, real One-shot book, explicit volume association | NOT RUN |
| Apply/readback/undo | Real local Komga PATCH, cover upload, readback; conservative undo | NOT RUN |
| Failures | HTTP403/429/timeouts/missing cover/cancel/conflict; no false success | NOT RUN |
| Local prebuilt DB | Actual File input, paged VFS, FTS, no full import/no mutation | NOT RUN |
| Four source builders | Real schemas, streaming/batched generation, same normalized catalog version | NOT RUN |
| Full catalogs | Full public source imports/query checks, record resource/coverage limits | NOT RUN |
| Download/build/export | Actual manager download, actual browser build and selected output, reload validity | NOT RUN |
| Persistence/update | Settings/queue, schema-version mismatch, old file preservation | NOT RUN |
| Desktop browser matrix | Chromium primary, Firefox where supported; exact versions recorded | NOT RUN |
| CI/release | Tests/build remote CI, committed dist matches built and published files | NOT RUN |
