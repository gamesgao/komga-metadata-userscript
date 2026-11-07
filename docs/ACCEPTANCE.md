# Functional acceptance

This harness tests the **built userscript**, installed through the unmodified
Tampermonkey extension in a separate persistent Chromium profile. It is not a
mock browser or a review checklist. Its only Komga target is the generated
local Komga 1.30 fixture at `http://127.0.0.1:18767`; it reads the test
credentials and generated IDs from ignored `.runtime/` files and never prints
them. Do not point it at another host or use another browser profile.

## Run

From the repository root, after the production build is ready:

```sh
npm run build
uv run --with playwright --with requests python acceptance/e2e.py
```

The runner imports `dist/komga-metadata.user.js` through Tampermonkey's actual
Utilities file input and install confirmation, grants the extension's
user-scripts permission in this isolated Chromium session, logs into the local
test account through Komga's UI, opens the generated series, detects the
production userscript, and exercises a live public-source search/detail
preview. It saves only screenshots of the synthetic fixture and a sanitized
status report under ignored `.runtime/acceptance/`. It fails or reports
`BLOCKED`; it never substitutes fixture data for a live-provider success.

Tampermonkey and the Chromium browser must already be available at the paths
described by the task setup. The persistent profile is
`.runtime/browser-acceptance` and must not be replaced with a personal browser
profile. The runner is deliberately separate from root package scripts so it
does not install or rewrite root dependencies.

## Evidence status and limits

| Area | Acceptance level | Status |
|---|---|---|
| Real browser and actual Tampermonkey install | Actual bundle, local test account | BLOCKED until `dist/komga-metadata.user.js` exists |
| Public-source search/detail | Actual userscript UI and public traffic, not fixtures | BLOCKED until the browser flow is runnable |
| Metadata preview, merge, namespaced tags and locks | Requires the actual panel and write flow | NOT RUN |
| Komga PATCH/readback, cover, scoped undo | Synthetic local library only | NOT RUN |
| One-shot destination and explicit volume mapping | Generated One-shot and two-volume fixtures | NOT RUN |
| Error, partial, cancel and conflict behavior | Actual UI failure paths; fixtures must be labeled separately | NOT RUN |
| EH, MAL and ComicVine live access | Credentials are not available | BLOCKED; never report live PASS |
| Other live providers / HTML sources | Must be separately reported per provider, without raw response dumps | NOT RUN |

An API unit test, fixture transport response, build, or screenshot by itself is
not functional acceptance. `PASS` is valid only for the specific live level
that ran; provider-level live results must not be generalized to other
providers. The runner writes detailed sanitized evidence only to the ignored
runtime directory. No provider descriptions, credentials, full responses, or
library content belong in committed evidence.
