# Attribution

Provider endpoint/model/HTML selector adaptations in `src/providers/` were
informed by Snd-R/komf 2.1.0 and dyphire/komf-rs 1.14.5, both MIT.
No Kotlin/Rust runtime or machine translation is included. The series/oneshot routing patterns were compared with
dyphire/KomgaBangumi 2.11.0 (MIT); its jQuery/UI/cover cleanup code is not copied.

Upstream MIT notices:

Copyright (c) 2022 Snd-R

Copyright (c) 2023 eeezae
Copyright (c) 2025 ramu
Copyright (c) 2025 dyphire

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

The build bundles only this project's code. esbuild (MIT), TypeScript
(Apache-2.0), Vitest (MIT), jsdom (MIT), and Playwright (Apache-2.0) are development
dependencies, not runtime providers. npm retains their license files in
`node_modules`. Provider data, API usage terms and image copyrights are separate
from source-code licenses; no catalog or provider images are redistributed.

## EhTagTranslation data (separate from MIT code)

Optional EH Chinese-tag projection downloads the official
[EhTagTranslation/Database](https://github.com/EhTagTranslation/Database) release
`db.text.json` at runtime. Dictionary text belongs to its contributors and is
licensed under [CC BY-NC-SA 3.0](https://github.com/EhTagTranslation/Database/blob/master/LICENSE.md),
subject to any entry-specific notices. It is not relicensed under this project's MIT license.
The dictionary and derived name-only GM cache are not included in this repository
or Release assets. Attribution and source/license links are retained in this
document and the generated userscript's legal notice, not the operation UI.
Upstream requests a project-introduction Issue from downstream users; no such
Issue is submitted automatically by this software.

The independent TypeScript mapper uses namespace-exact lookups. Its fixed
compact policy removes descriptive namespace prefixes only after a dictionary hit,
does not copy komf-rs's namespace/tag exclusion lists, and leaves source records intact.
