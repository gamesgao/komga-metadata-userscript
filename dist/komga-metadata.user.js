// ==UserScript==
// @name         Komga 元数据
// @namespace    https://github.com/gamesgao/komga-metadata-userscript
// @version      0.6.1
// @description  桌面 Komga 多源元数据、离线目录、预览与读回验证
// @downloadURL  https://github.com/gamesgao/komga-metadata-userscript/releases/latest/download/komga-metadata.user.js
// @updateURL    https://github.com/gamesgao/komga-metadata-userscript/releases/latest/download/komga-metadata.meta.js
// @license      MIT
// @match        http://*/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      api.bgm.tv
// @connect      next.bgm.tv
// @connect      api.mangaupdates.com
// @connect      api.mangabaka.dev
// @connect      api.mangadex.org
// @connect      uploads.mangadex.org
// @connect      graphql.anilist.co
// @connect      e-hentai.org
// @connect      api.e-hentai.org
// @connect      exhentai.org
// @connect      api.myanimelist.net
// @connect      comicvine.gamespot.com
// @connect      yenpress.com
// @connect      viz.com
// @connect      www.viz.com
// @connect      webtoons.com
// @connect      www.webtoons.com
// @connect      raw.githubusercontent.com
// @connect      github.com
// @connect      api.github.com
// @connect      release-assets.githubusercontent.com
// @connect      objects.githubusercontent.com
// @connect      lain.bgm.tv
// @connect      cdn.mangaupdates.com
// @connect      s4.anilist.co
// @connect      ehgt.org
// @connect      hath.network
// @connect      static.bookwalker.com
// @connect      api.mangabaka.org
// @connect      mangabaka.dev
// @connect      mangabaka.org
// @connect      *
// @run-at       document-idle
// ==/UserScript==
/*!
Provider adaptations: Copyright (c) 2022 Snd-R; Copyright (c) 2023 eeezae; Copyright (c) 2025 ramu; Copyright (c) 2025 dyphire.
See THIRD_PARTY.md for provenance.
MIT License

Copyright (c) 2026 gamesgao

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
*/
"use strict";
(() => {
  // src/model.ts
  var MetadataError = class extends Error {
    constructor(code, message, status2) {
      super(message);
      this.code = code;
      this.status = status2;
      this.name = "MetadataError";
    }
  };
  function cancelled(signal) {
    if (signal.aborted) throw new MetadataError("cancelled", "\u5DF2\u53D6\u6D88");
  }
  function nativeTitle(record2) {
    return (record2.titles.find((t) => t.type === "native") ?? record2.titles[0])?.text ?? record2.id;
  }
  var Registry = class {
    providers = /* @__PURE__ */ new Map();
    register(provider) {
      if (this.providers.has(provider.id)) throw new Error(`Duplicate provider: ${provider.id}`);
      this.providers.set(provider.id, provider);
    }
    get(id) {
      const p = this.providers.get(id);
      if (!p) throw new MetadataError("unknown-provider", `\u672A\u63A5\u5165\u6765\u6E90\uFF1A${id}`);
      return p;
    }
    list() {
      return [...this.providers.values()];
    }
    async search(ids, query, context) {
      return Promise.all(ids.map(async (id) => {
        try {
          return { id, candidates: await this.get(id).search(query, context) };
        } catch (error) {
          return { id, error: error instanceof Error ? error : new Error(String(error)) };
        }
      }));
    }
  };
  var workerAssetBase = false ? "" : "https://raw.githubusercontent.com/gamesgao/komga-metadata-userscript/main/dist/catalog/";

  // src/transport.ts
  var storage = {
    get(key2, fallback) {
      return GM_getValue(key2, fallback);
    },
    set(key2, value) {
      GM_setValue(key2, value);
    }
  };
  function safeUrl(input2) {
    let url2;
    try {
      url2 = new URL(input2);
    } catch {
      throw new MetadataError("invalid-id", "\u94FE\u63A5\u683C\u5F0F\u65E0\u6548");
    }
    if (!["http:", "https:"].includes(url2.protocol) || url2.username || url2.password) throw new MetadataError("invalid-id", "\u4EC5\u652F\u6301\u65E0\u5185\u5D4C\u51ED\u636E\u7684 HTTP(S) \u94FE\u63A5");
    return url2.href;
  }
  var GMTransport = class {
    request(input2, signal) {
      cancelled(signal);
      const url2 = safeUrl(input2.url);
      return new Promise((resolve, reject) => {
        let handle;
        const finish2 = (fn) => {
          signal.removeEventListener("abort", abort);
          fn();
        };
        const abort = () => {
          handle?.abort();
          finish2(() => reject(new MetadataError("cancelled", "\u5DF2\u53D6\u6D88")));
        };
        handle = GM_xmlhttpRequest({
          url: url2,
          method: input2.method ?? "GET",
          headers: input2.headers,
          data: input2.body,
          responseType: input2.responseType ?? "text",
          timeout: 3e4,
          anonymous: true,
          cookie: input2.cookie,
          onload: (r) => finish2(() => {
            const headers = {};
            for (const line of r.responseHeaders.split(/\r?\n/)) {
              const i = line.indexOf(":");
              if (i > 0) headers[line.slice(0, i).toLowerCase()] = line.slice(i + 1).trim();
            }
            resolve({ status: r.status, headers, text: r.responseText ?? "", blob: r.response instanceof Blob ? r.response : void 0, finalUrl: r.finalUrl || url2 });
          }),
          onerror: () => finish2(() => reject(new MetadataError("http", "\u8DE8\u57DF\u8BF7\u6C42\u5931\u8D25\uFF08\u7F51\u7EDC\u6216\u7BA1\u7406\u5668\u6743\u9650\uFF09"))),
          ontimeout: () => finish2(() => reject(new MetadataError("http", "\u6765\u6E90\u8BF7\u6C42\u8D85\u65F6"))),
          onabort: () => finish2(() => reject(new MetadataError("cancelled", "\u5DF2\u53D6\u6D88")))
        });
        signal.addEventListener("abort", abort, { once: true });
        if (signal.aborted) abort();
      });
    }
  };
  function delay(ms, signal) {
    cancelled(signal);
    if (ms <= 0) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(new MetadataError("cancelled", "\u5DF2\u53D6\u6D88"));
      };
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", abort);
        resolve();
      }, ms);
      signal.addEventListener("abort", abort, { once: true });
    });
  }
  var SourceTransport = class {
    constructor(inner, interval = 500, maxQueue = 50, retries = 2) {
      this.inner = inner;
      this.interval = interval;
      this.maxQueue = maxQueue;
      this.retries = retries;
    }
    tail = Promise.resolve();
    queued = 0;
    next = 0;
    request(input2, signal) {
      if (this.queued >= this.maxQueue) return Promise.reject(new MetadataError("unavailable", "\u6765\u6E90\u961F\u5217\u5DF2\u6EE1"));
      this.queued++;
      const job = this.tail.then(async () => {
        for (let attempt = 0; ; attempt++) {
          cancelled(signal);
          await delay(Math.max(0, this.next - Date.now()), signal);
          this.next = Date.now() + this.interval;
          const response = await this.inner.request(input2, signal);
          if (![429, 503].includes(response.status) || attempt >= this.retries) {
            if (response.status < 200 || response.status >= 300) throw new MetadataError(response.status === 401 || response.status === 403 ? "authentication-required" : "http", `\u6765\u6E90 HTTP ${response.status}${response.status === 403 ? "\uFF1A\u62D2\u7EDD\u8BBF\u95EE\uFF0C\u53EF\u80FD\u9700\u8981\u6D4F\u89C8\u5668\u9A8C\u8BC1\u6216\u53D7\u7F51\u7EDC\uFF0F\u5730\u533A\u9650\u5236" : ""}`, response.status);
            return response;
          }
          const retry = response.headers["retry-after"];
          const wait = retry ? /^\d+$/.test(retry) ? Number(retry) * 1e3 : Date.parse(retry) - Date.now() : 1e3 * 2 ** attempt;
          if (!Number.isFinite(wait) || wait > 6e4) throw new MetadataError("http", "\u6765\u6E90\u8981\u6C42\u7B49\u5F85\u8FC7\u4E45\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5", response.status);
          this.next = Math.max(this.next, Date.now() + Math.max(0, wait));
          await delay(Math.max(0, wait), signal);
        }
      });
      this.tail = job.then(() => {
        this.queued--;
      }, () => {
        this.queued--;
      });
      return new Promise((resolve, reject) => {
        const abort = () => {
          signal.removeEventListener("abort", abort);
          reject(new MetadataError("cancelled", "\u5DF2\u53D6\u6D88\u6392\u961F\u8BF7\u6C42"));
        };
        signal.addEventListener("abort", abort, { once: true });
        job.then((r) => {
          signal.removeEventListener("abort", abort);
          resolve(r);
        }, (e) => {
          signal.removeEventListener("abort", abort);
          reject(e);
        });
        if (signal.aborted) abort();
      });
    }
  };

  // src/providers/data.ts
  function obj(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new MetadataError("invalid-response", "\u6765\u6E90\u54CD\u5E94\u7ED3\u6784\u4E0D\u7B26");
    return value;
  }
  function arr(value) {
    if (!Array.isArray(value)) throw new MetadataError("invalid-response", "\u6765\u6E90\u5217\u8868\u7ED3\u6784\u4E0D\u7B26");
    return value;
  }
  function list(value) {
    return value == null ? [] : arr(value);
  }
  function str(value) {
    return typeof value === "string" ? value : "";
  }
  function required(value) {
    const text2 = str(value);
    if (!text2.trim()) throw new MetadataError("invalid-response", "\u6765\u6E90\u7F3A\u5C11\u540D\u79F0");
    return text2;
  }
  function idText(value) {
    if (typeof value !== "string" && typeof value !== "number") throw new MetadataError("invalid-response", "\u6765\u6E90\u7F3A\u5C11 ID");
    return String(value);
  }
  function numeric(id) {
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new MetadataError("invalid-id", "\u9700\u8981\u6709\u6548\u6570\u5B57 ID");
    return id;
  }
  function date(value) {
    const s = str(value);
    return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) ? s : void 0;
  }
  function volume(text2) {
    const m = text2.match(/(?:\bvol(?:ume)?\.?\s*|\(|（)(\d+(?:\.\d+)?)(?:\)|）|\b)/i);
    return m ? Number(m[1]) : void 0;
  }
  function record(provider, id, url2, raw) {
    return { provider, id, url: url2, raw, titles: [], tags: [], genres: [], authors: [], covers: [], links: [{ label: provider, url: url2 }] };
  }
  function candidate(provider, id, title, url2, image2) {
    const result = { provider, id, title: required(title), url: url2 };
    if (typeof image2 === "string" && image2) {
      try {
        result.cover = safeUrl(image2);
      } catch {
      }
    }
    return result;
  }
  async function json(t, url2, signal, body, headers) {
    const r = await t.request({ url: url2, method: body === void 0 ? "GET" : "POST", headers: { Accept: "application/json", ...body === void 0 ? {} : { "Content-Type": "application/json" }, ...headers }, body: body === void 0 ? void 0 : JSON.stringify(body) }, signal);
    if (/^\s*</.test(r.text) && /Browser verification|cf-chl|challenge-assets/i.test(r.text)) throw new MetadataError("unavailable", "\u6765\u6E90\u8981\u6C42\u6D4F\u89C8\u5668\u9A8C\u8BC1\uFF0C\u5F53\u524D\u533F\u540D\u8BF7\u6C42\u65E0\u6CD5\u8BFB\u53D6");
    try {
      return obj(JSON.parse(r.text));
    } catch (e) {
      if (e instanceof MetadataError) throw e;
      throw new MetadataError("invalid-response", "\u6765\u6E90\u8FD4\u56DE\u975E JSON\uFF08\u53EF\u80FD\u53D7\u9650\uFF09");
    }
  }
  function checkId(actual, expected) {
    if (idText(actual) !== expected) throw new MetadataError("invalid-id", "\u6765\u6E90\u8FD4\u56DE\u4E86\u4E0D\u540C ID\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9");
  }
  function status(value) {
    const s = str(value).toLowerCase();
    if (["finished", "completed", "complete", "ended"].includes(s)) return "ENDED";
    if (["releasing", "ongoing", "publishing"].includes(s)) return "ONGOING";
    if (["hiatus", "on_hiatus"].includes(s)) return "HIATUS";
    if (["cancelled", "discontinued"].includes(s)) return "ABANDONED";
    return void 0;
  }

  // src/komga.ts
  function validId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) throw new MetadataError("invalid-id", "\u65E0\u6548 Komga ID");
    return id;
  }
  function metadata(value) {
    const x = obj(value);
    required(x.title);
    return x;
  }
  function series(value, id) {
    const x = obj(value);
    if (idText(x.id) !== id || typeof x.oneshot !== "boolean") throw new MetadataError("invalid-response", "Komga \u7CFB\u5217\u54CD\u5E94\u4E0D\u7B26");
    return { id, oneshot: x.oneshot, metadata: metadata(x.metadata) };
  }
  function book(value) {
    const x = obj(value);
    return { id: validId(idText(x.id)), seriesId: validId(idText(x.seriesId)), metadata: metadata(x.metadata) };
  }
  function currentSeries(location2, doc) {
    const route = location2.hash.startsWith("#/") ? location2.hash.slice(1) : location2.pathname;
    const match = route.match(/\/(?:series|oneshot)\/([a-zA-Z0-9_-]+)(?:\/|$)/);
    if (match) return match[1];
    const ids = new Set([...doc?.querySelectorAll('main img[src*="/api/v1/series/"], [role="main"] img[src*="/api/v1/series/"]') ?? []].map((image2) => image2.getAttribute("src")?.match(/\/api\/v1\/series\/([a-zA-Z0-9_-]+)\/thumbnail/)?.[1]).filter(Boolean));
    return ids.size === 1 ? [...ids][0] : void 0;
  }
  function detectKomga(doc, location2) {
    const brand = /(?:^|[\s|–-])komga(?:$|[\s|–-])/i.test(doc.title) || doc.querySelector('meta[name="application-name"]')?.getAttribute("content")?.toLowerCase() === "komga";
    const shell = doc.querySelector("#app, #__nuxt, #root");
    const asset = [...doc.querySelectorAll("script[src]")].find((s) => {
      const u = new URL(s.getAttribute("src"), location2.origin + location2.pathname);
      return u.origin === location2.origin && /\/(?:assets|_nuxt|js)\/[^/]+\.(?:m?js)(?:$)/.test(u.pathname);
    });
    const api = [...doc.querySelectorAll("[src],[href]")].map((e) => e.getAttribute("src") || e.getAttribute("href") || "").map((s) => {
      try {
        return new URL(s, location2.origin + location2.pathname);
      } catch {
        return void 0;
      }
    }).find((u) => u?.origin === location2.origin && /\/api\/v1\/(?:series|books)\//.test(u.pathname));
    if (!brand || !shell || !asset && !api) return void 0;
    let basePath = "";
    if (api) basePath = api.pathname.split("/api/v1/")[0];
    else if (asset) basePath = new URL(asset.getAttribute("src"), location2.origin + location2.pathname).pathname.replace(/\/(?:assets|_nuxt|js)\/.*$/, "");
    const base2 = doc.querySelector("base[href]")?.getAttribute("href");
    if (base2) {
      const u = new URL(base2, location2.origin + location2.pathname);
      if (u.origin !== location2.origin) return void 0;
      basePath = u.pathname.replace(/\/$/, "");
    }
    return { origin: location2.origin, basePath };
  }
  var KomgaClient = class {
    constructor(deployment, fetcher = (input2, init) => globalThis.fetch(input2, init)) {
      this.deployment = deployment;
      this.fetcher = fetcher;
    }
    url(path) {
      if (!path.startsWith("/") || path.includes("..")) throw new MetadataError("invalid-id", "\u975E\u6CD5 API \u8DEF\u5F84");
      return `${this.deployment.origin}${this.deployment.basePath}/api/v1${path}`;
    }
    async request(path, signal, method = "GET", body, headers) {
      cancelled(signal);
      let r;
      try {
        r = await this.fetcher(this.url(path), { method, body, headers, signal, credentials: "include" });
      } catch (e) {
        if (signal.aborted) throw new MetadataError("cancelled", "\u5DF2\u53D6\u6D88\uFF1B\u5DF2\u53D1\u51FA\u7684\u5199\u5165\u8BF7\u8BFB\u56DE\u786E\u8BA4");
        throw new MetadataError("http", `Komga \u7F51\u7EDC\u5931\u8D25\uFF1A${e instanceof Error ? e.message : "\u672A\u77E5\u9519\u8BEF"}`);
      }
      if (!r.ok) throw new MetadataError(r.status === 401 || r.status === 403 ? "authentication-required" : "http", `Komga HTTP ${r.status}\uFF08\u9700\u8981\u5F53\u524D\u4F1A\u8BDD\u53CA\u7F16\u8F91\u6743\u9650\uFF09`, r.status);
      return r;
    }
    path(t) {
      return `/${t.kind}/${validId(t.id)}`;
    }
    async state(id, signal) {
      validId(id);
      const s = series(await (await this.request(`/series/${id}`, signal)).json(), id);
      const books = [];
      for (let page = 0; page < 100; page++) {
        const data = obj(await (await this.request(`/series/${id}/books?page=${page}&size=100`, signal)).json());
        const batch = arr(data.content).map(book);
        if (batch.some((b) => b.seriesId !== id) || batch.some((b) => books.some((old) => old.id === b.id))) throw new MetadataError("invalid-response", "Komga \u4E66\u7C4D\u5F52\u5C5E\u6216\u5206\u9875\u4E0D\u7B26");
        books.push(...batch);
        if (data.last === true || batch.length < 100) return { series: s, books };
      }
      throw new MetadataError("unavailable", "\u7CFB\u5217\u8D85\u8FC7\u5206\u9875\u5B89\u5168\u4E0A\u9650");
    }
    async read(t, signal) {
      const data = await (await this.request(this.path(t), signal)).json();
      if (t.kind === "series") return series(data, t.id).metadata;
      const b = book(data);
      if (b.id !== t.id) throw new MetadataError("invalid-response", "Komga \u4E66\u7C4D ID \u4E0D\u7B26");
      return b.metadata;
    }
    async patch(t, patch, signal) {
      await this.request(`${this.path(t)}/metadata`, signal, "PATCH", JSON.stringify(patch), { "Content-Type": "application/json" });
    }
    async thumbnails(t, signal) {
      return arr(await (await this.request(`${this.path(t)}/thumbnails`, signal)).json()).map((v) => {
        const x = obj(v);
        if (typeof x.selected !== "boolean") throw new MetadataError("invalid-response", "\u5C01\u9762\u5217\u8868\u4E0D\u7B26");
        return { id: validId(idText(x.id)), selected: x.selected, type: required(x.type) };
      });
    }
    async thumbnail(t, id, signal) {
      return (await this.request(`${this.path(t)}/thumbnails/${validId(id)}`, signal)).blob();
    }
    async displayedThumbnail(t, signal) {
      try {
        return await (await this.request(`${this.path(t)}/thumbnail?_verify=${Date.now()}`, signal)).blob();
      } catch (error) {
        if (error instanceof MetadataError && error.status === 404) return void 0;
        throw error;
      }
    }
    async upload(t, blob, signal) {
      const form = new FormData();
      const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : blob.type === "image/gif" ? "gif" : "jpg";
      form.append("file", blob, `metadata-cover.${ext}`);
      const x = obj(await (await this.request(`${this.path(t)}/thumbnails?selected=false`, signal, "POST", form)).json());
      return validId(idText(x.id));
    }
    async select(t, id, signal) {
      await this.request(`${this.path(t)}/thumbnails/${validId(id)}/selected`, signal, "PUT");
    }
    async remove(t, id, signal) {
      await this.request(`${this.path(t)}/thumbnails/${validId(id)}`, signal, "DELETE");
    }
  };

  // src/providers/api.ts
  /*! Endpoint/model adaptations informed by komf-rs and komf (MIT); see THIRD_PARTY.md. */
  function linkId(input2, hosts, expression) {
    const u = new URL(safeUrl(input2));
    if (!hosts.includes(u.hostname)) throw new MetadataError("invalid-id", "\u6765\u6E90\u57DF\u540D\u4E0D\u7B26");
    const match = u.pathname.match(expression);
    if (!match?.[1]) throw new MetadataError("invalid-id", "\u65E0\u6CD5\u8BC6\u522B\u6765\u6E90\u94FE\u63A5");
    return match[1];
  }
  function titles(r, native, localized) {
    if (str(native)) r.titles.push({ text: str(native), type: "native" });
    if (str(localized) && localized !== native) r.titles.push({ text: str(localized), type: "localized", language: r.provider === "bangumi" ? "zh" : void 0 });
    if (!r.titles.length) throw new MetadataError("invalid-response", "\u6765\u6E90\u7F3A\u5C11\u6807\u9898");
  }
  function addCover(r, value, number, language) {
    if (str(value)) r.covers.push({ url: safeUrl(str(value)), volume: number, language });
  }
  async function pages(t, base2, c) {
    const rows = [];
    for (let page = 0; page < 10; page++) {
      const data = await json(t, `${base2}${base2.includes("?") ? "&" : "?"}limit=100&offset=${page * 100}`, c.signal);
      const batch = arr(data.data);
      rows.push(...batch);
      if (batch.length < 100 || typeof data.total === "number" && rows.length >= data.total) return rows;
    }
    throw new MetadataError("unavailable", "\u6765\u6E90\u5206\u9875\u8D85\u8FC7\u5B89\u5168\u4E0A\u9650\uFF0C\u8BF7\u4F7F\u7528\u5177\u4F53\u5355\u5377 ID");
  }
  var Bangumi = class {
    constructor(t) {
      this.t = t;
    }
    id = "bangumi";
    capabilities = { series: true, volumes: true, volumeMetadata: true, volumeCovers: true };
    async resolveLink(input2) {
      return numeric(/^\d+$/.test(input2) ? input2 : linkId(input2, ["bgm.tv", "bangumi.tv", "chii.in"], /^\/subject\/(\d+)/));
    }
    async search(q, c) {
      const data = await json(this.t, "https://next.bgm.tv/p1/search/subjects?limit=20", c.signal, { keyword: q, filter: { type: [1] } });
      return arr(data.data).map((v) => {
        const x = obj(v);
        const id = numeric(idText(x.id));
        const images = obj(x.images ?? {});
        return candidate(this.id, id, required(x.name), `https://bgm.tv/subject/${id}`, images.common || images.medium || images.large);
      });
    }
    async get(id, c) {
      numeric(id);
      const base2 = `https://next.bgm.tv/p1/subjects/${id}`;
      const x = await json(this.t, base2, c.signal);
      checkId(x.id, id);
      const staff = await pages(this.t, `${base2}/staffs/persons`, c);
      const r = record(this.id, id, `https://bgm.tv/subject/${id}`, { subject: x, staff });
      titles(r, x.name, x.nameCN);
      r.summary = str(x.summary) || void 0;
      r.releaseDate = x.airtime ? date(obj(x.airtime).date) : void 0;
      r.volume = x.series === false ? volume(required(x.name)) : void 0;
      r.tags = list(x.tags).map((v) => required(obj(v).name));
      addCover(r, x.images && obj(x.images).large, r.volume);
      const roles = { 2001: "writer", 2002: "penciller", 2003: "cover", 2007: "writer", 2009: "character", 2010: "writer", 2006: "translator" };
      for (const v of staff) {
        const row = obj(v), person = obj(row.staff);
        for (const p of list(row.positions)) {
          const position = obj(obj(p).type);
          if (position.id === 2004) r.publisher = required(person.name);
          const role = typeof position.id === "number" ? roles[position.id] : void 0;
          if (role) r.authors.push({ name: required(person.name), native: required(person.name), localized: str(person.nameCN) || void 0, localizedLanguage: "zh", role });
        }
      }
      for (const v of list(x.infobox)) {
        const row = obj(v);
        const value = list(row.values).map((v2) => str(obj(v2).v)).filter(Boolean).join(", ");
        if (row.key === "ISBN" && value) r.isbn = value.replace(/[- ]/g, "");
        if (row.key === "\u51FA\u7248\u793E" && value && !r.publisher) r.publisher = value;
        if (["\u522B\u540D", "\u4E2D\u6587\u540D"].includes(str(row.key)) && value) r.titles.push({ text: value, type: "alias" });
      }
      if (x.series === true) {
        const relations = await pages(this.t, `${base2}/relations?type=1&offprint=true`, c);
        r.books = relations.filter((v) => obj(obj(v).relation).id === 1003).map((v) => {
          const subject = obj(obj(v).subject), sid = numeric(idText(subject.id));
          const b = record(this.id, sid, `https://bgm.tv/subject/${sid}`, v);
          titles(b, subject.name, subject.nameCN);
          b.volume = volume(required(subject.name));
          addCover(b, subject.images && obj(subject.images).large, b.volume);
          b.warnings = ["\u5173\u8054\u5217\u8868\u4EC5\u542B\u7B80\u8981\u4FE1\u606F\uFF1B\u9009\u62E9\u5355\u5377\u540E\u8BFB\u53D6\u8BE6\u60C5"];
          return b;
        });
      }
      return r;
    }
  };
  var MangaUpdates = class {
    constructor(t) {
      this.t = t;
    }
    id = "mangaupdates";
    capabilities = { series: true, volumes: false };
    async resolveLink(input2, c) {
      if (/^\d+$/.test(input2)) return numeric(input2);
      let u = new URL(safeUrl(input2));
      if (!["www.mangaupdates.com", "mangaupdates.com"].includes(u.hostname)) throw new MetadataError("invalid-id", "\u6765\u6E90\u57DF\u540D\u4E0D\u7B26");
      if (u.pathname === "/series.html") {
        numeric(u.searchParams.get("id") ?? "");
        const response = await this.t.request({ url: u.href }, c.signal);
        u = new URL(response.finalUrl);
        if (!["www.mangaupdates.com", "mangaupdates.com"].includes(u.hostname) || u.pathname === "/series.html") throw new MetadataError("unavailable", "\u65E7 MU ID \u672A\u91CD\u5B9A\u5411\u5230\u73B0\u4EE3\u94FE\u63A5\uFF0C\u4E0D\u80FD\u6309 base36 \u731C\u6D4B");
      }
      const slug = u.pathname.match(/^\/series\/([a-z0-9]+)(?:\/|$)/)?.[1];
      if (!slug || !/^[a-z0-9]{7}$/.test(slug)) throw new MetadataError("invalid-id", "\u9700\u8981\u73B0\u4EE3 MU \u4E03\u4F4D base36 \u94FE\u63A5\u6216 API \u6570\u5B57 ID");
      return numeric(String(parseInt(slug, 36)));
    }
    async search(q, c) {
      const x = await json(this.t, "https://api.mangaupdates.com/v1/series/search", c.signal, { search: q.slice(0, 400), perpage: 20, page: 1 });
      return arr(x.results).map((v) => {
        const row = obj(obj(v).record);
        const images = obj(obj(row.image ?? {}).url ?? {});
        return candidate(this.id, numeric(idText(row.series_id)), required(row.title), required(row.url), images.thumb || images.original);
      });
    }
    async get(id, c) {
      numeric(id);
      const x = await json(this.t, `https://api.mangaupdates.com/v1/series/${id}`, c.signal);
      checkId(x.series_id, id);
      const r = record(this.id, id, safeUrl(required(x.url)), x);
      titles(r, x.title);
      r.titles.push(...list(x.associated).map((v) => ({ text: required(obj(v).title), type: "alias" })));
      r.summary = str(x.description) || void 0;
      r.genres = list(x.genres).map((v) => required(obj(v).genre));
      r.tags = list(x.categories).map((v) => required(obj(v).category));
      r.authors = list(x.authors).map((v) => {
        const a = obj(v);
        return { name: required(a.name), role: str(a.type).toLowerCase() === "artist" ? "penciller" : "writer" };
      });
      const publishers = list(x.publishers).map((v) => str(obj(v).publisher_name)).filter(Boolean);
      r.publisher = publishers.length ? publishers.join(", ") : void 0;
      addCover(r, x.image && obj(obj(x.image).url).original);
      return r;
    }
  };
  function bakaCover(value) {
    if (!value) return "";
    const x = obj(value);
    if (x.raw) {
      const raw = obj(x.raw);
      if (str(raw.url)) return str(raw.url);
    }
    for (const size of ["x350", "x250", "x150"]) {
      if (x[size]) {
        const s = obj(x[size]);
        const url2 = str(s.x3) || str(s.x2) || str(s.x1);
        if (url2) return url2;
      }
    }
    return "";
  }
  var MangaBaka = class {
    constructor(t) {
      this.t = t;
    }
    id = "mangabaka";
    capabilities = { series: true, volumes: true, volumeMetadata: false, volumeCovers: true };
    async resolveLink(input2) {
      return numeric(/^\d+$/.test(input2) ? input2 : linkId(input2, ["mangabaka.org", "www.mangabaka.org"], /^\/(?:(?:manga|series)\/)?(\d+)(?:\/|$)/));
    }
    async search(q, c) {
      const x = await json(this.t, `https://api.mangabaka.org/v1/series/search?q=${encodeURIComponent(q)}`, c.signal);
      return arr(x.data).map((v) => {
        const row = obj(v);
        const id = numeric(idText(row.id));
        return candidate(this.id, id, str(row.native_title) || str(row.title) || required(list(row.titles).map((v2) => obj(v2).title)[0]), str(row.canonical_url) || `https://mangabaka.org/manga/${id}`, bakaCover(row.cover));
      });
    }
    async get(id, c) {
      numeric(id);
      const x = obj((await json(this.t, `https://api.mangabaka.org/v1/series/${id}`, c.signal)).data);
      checkId(x.id, id);
      if (x.merged_with) throw new MetadataError("invalid-id", `\u6761\u76EE\u5DF2\u5408\u5E76\u81F3 ${idText(x.merged_with)}`);
      const r = record(this.id, id, str(x.canonical_url) || `https://mangabaka.org/manga/${id}`, x);
      if (x.native_title || x.title) titles(r, x.native_title || x.title, x.title);
      for (const v of list(x.titles)) {
        const t = obj(v);
        r.titles.push({ text: required(t.title), language: str(t.language) || void 0, type: t.type === "native" ? "native" : "alias" });
      }
      if (x.secondary_titles) for (const [language, values] of Object.entries(obj(x.secondary_titles))) {
        r.titles.push(...list(values).map((v) => ({ text: required(obj(v).title), language: language === "unknown" ? void 0 : language, type: "alias" })));
      }
      if (!r.titles.length) throw new MetadataError("invalid-response", "MangaBaka \u7F3A\u5C11\u6807\u9898");
      r.summary = str(x.description) || void 0;
      r.status = status(x.status);
      r.language = str(x.original_language) || void 0;
      for (const title of r.titles) if (title.type === "native" && !title.language) title.language = r.language;
      r.releaseDate = x.published ? date(obj(x.published).start_date) : void 0;
      for (const [field, role] of [["authors", "writer"], ["artists", "penciller"]]) r.authors.push(...list(x[field]).map((v) => ({ name: required(v), role })));
      const publishers = list(x.publishers).map((v) => str(obj(v).name)).filter(Boolean);
      r.publisher = publishers.length ? publishers.join(", ") : void 0;
      for (const v of list(x.tags_v2)) {
        const tag = obj(v);
        (tag.is_genre ? r.genres : r.tags).push(required(tag.name_path || tag.name));
      }
      for (const v of list(x.links_v2)) {
        const link = obj(v);
        r.links.push({ label: str(link.name_display) || "\u6765\u6E90", url: safeUrl(required(link.url)) });
      }
      addCover(r, bakaCover(x.cover));
      let next = `https://api.mangabaka.org/v1/series/${id}/images?type=volume`;
      for (let i = 0; i < 10; i++) {
        const images = await json(this.t, next, c.signal);
        for (const v of arr(images.data)) {
          const image2 = obj(v);
          const n2 = typeof image2.index_numeric === "number" ? image2.index_numeric : /^\d+(?:\.\d+)?$/.test(str(image2.index)) ? Number(image2.index) : void 0;
          addCover(r, bakaCover(image2.image), n2, str(image2.language) || void 0);
        }
        const n = images.pagination ? str(obj(images.pagination).next) : "";
        if (!n) return r;
        const u = new URL(n, next);
        if (u.origin !== "https://api.mangabaka.org" || u.pathname !== `/v1/series/${id}/images`) throw new MetadataError("invalid-response", "\u975E\u6CD5\u5206\u9875\u94FE\u63A5");
        next = u.href;
      }
      throw new MetadataError("unavailable", "\u5C01\u9762\u5206\u9875\u8D85\u8FC7\u5B89\u5168\u4E0A\u9650");
    }
  };
  var aniFields = `id siteUrl countryOfOrigin title { native romaji english } description(asHtml:false) status genres startDate { year month day } coverImage { extraLarge large } staff(perPage:50) { pageInfo { hasNextPage } edges { role node { name { native full } } } }`;
  var AniList = class {
    constructor(t) {
      this.t = t;
    }
    id = "anilist";
    capabilities = { series: true, volumes: false };
    async resolveLink(input2) {
      return numeric(/^\d+$/.test(input2) ? input2 : linkId(input2, ["anilist.co", "www.anilist.co"], /^\/manga\/(\d+)/));
    }
    async query(query, variables, c) {
      const x = await json(this.t, "https://graphql.anilist.co", c.signal, { query, variables });
      if (x.errors) throw new MetadataError("unavailable", "AniList \u67E5\u8BE2\u5931\u8D25\u6216\u6761\u76EE\u4E0D\u53EF\u7528");
      return obj(x.data);
    }
    async search(q, c) {
      const data = await this.query("query($q:String){Page(perPage:20){media(search:$q,type:MANGA){id siteUrl title{native romaji english} coverImage{large}}}}", { q }, c);
      return arr(obj(data.Page).media).map((v) => {
        const row = obj(v), t = obj(row.title);
        return candidate(this.id, numeric(idText(row.id)), required(t.native || t.english || t.romaji), required(row.siteUrl), obj(row.coverImage ?? {}).large);
      });
    }
    async get(id, c) {
      numeric(id);
      const x = obj((await this.query(`query($id:Int){Media(id:$id,type:MANGA){${aniFields}}}`, { id: Number(id) }, c)).Media);
      checkId(x.id, id);
      const r = record(this.id, id, required(x.siteUrl), x), t = obj(x.title);
      if (str(t.native)) r.titles.push({ text: str(t.native), type: "native", language: { JP: "ja", CN: "zh", KR: "ko" }[str(x.countryOfOrigin)] });
      if (str(t.english)) r.titles.push({ text: str(t.english), type: "localized", language: "en" });
      if (str(t.romaji)) r.titles.push({ text: str(t.romaji), type: "alias", language: "romaji" });
      r.summary = str(x.description) || void 0;
      r.status = status(x.status);
      r.genres = list(x.genres).map(required);
      const d = obj(x.startDate);
      if (d.year && d.month && d.day) r.releaseDate = date(`${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`);
      addCover(r, obj(x.coverImage).extraLarge || obj(x.coverImage).large);
      const staff = obj(x.staff);
      for (const v of list(staff.edges)) {
        const e = obj(v), n = obj(obj(e.node).name), role = str(e.role);
        r.authors.push({ name: required(n.native || n.full), native: str(n.native) || void 0, localized: str(n.full) || void 0, role: /art/i.test(role) ? "penciller" : /translat/i.test(role) ? "translator" : "writer" });
      }
      if (obj(staff.pageInfo).hasNextPage) r.warnings = ["\u4EBA\u7269\u8D85\u8FC7 50 \u6761\uFF0C\u672C\u6B21\u8BE6\u60C5\u4E0D\u5B8C\u6574"];
      return r;
    }
  };
  var MAL = class {
    constructor(t) {
      this.t = t;
    }
    id = "mal";
    capabilities = { series: true, volumes: false, authentication: true };
    async resolveLink(input2) {
      return numeric(/^\d+$/.test(input2) ? input2 : linkId(input2, ["myanimelist.net", "www.myanimelist.net"], /^\/manga\/(\d+)/));
    }
    headers(c) {
      if (!c.credentials.malClientId?.trim()) throw new MetadataError("authentication-required", "MAL \u9700\u8981\u81EA\u884C\u586B\u5199 Client ID");
      return { "X-MAL-CLIENT-ID": c.credentials.malClientId.trim() };
    }
    async search(q, c) {
      const x = await json(this.t, `https://api.myanimelist.net/v2/manga?q=${encodeURIComponent(q)}&limit=20`, c.signal, void 0, this.headers(c));
      return arr(x.data).map((v) => {
        const row = obj(obj(v).node), id = numeric(idText(row.id)), image2 = obj(row.main_picture ?? {});
        return candidate(this.id, id, required(row.title), `https://myanimelist.net/manga/${id}`, image2.medium || image2.large);
      });
    }
    async get(id, c) {
      numeric(id);
      const fields = "alternative_titles,synopsis,status,genres,authors{first_name,last_name},start_date,main_picture";
      const x = await json(this.t, `https://api.myanimelist.net/v2/manga/${id}?fields=${fields}`, c.signal, void 0, this.headers(c));
      checkId(x.id, id);
      const r = record(this.id, id, `https://myanimelist.net/manga/${id}`, x);
      const alt = x.alternative_titles ? obj(x.alternative_titles) : {};
      titles(r, alt.ja || x.title, x.title);
      if (str(alt.ja)) r.titles[0].language = "ja";
      if (str(alt.en)) r.titles.push({ text: str(alt.en), type: "localized", language: "en" });
      r.titles.push(...list(alt.synonyms).map((v) => ({ text: required(v), type: "alias" })));
      r.summary = str(x.synopsis) || void 0;
      r.status = status(x.status);
      r.releaseDate = date(x.start_date);
      r.genres = list(x.genres).map((v) => required(obj(v).name));
      r.authors = list(x.authors).map((v) => {
        const a = obj(v), n = obj(a.node);
        return { name: required([str(n.last_name), str(n.first_name)].filter(Boolean).join(" ")), role: /art/i.test(str(a.role)) ? "penciller" : "writer" };
      });
      addCover(r, x.main_picture && (obj(x.main_picture).large || obj(x.main_picture).medium));
      return r;
    }
  };
  var ComicVine = class {
    constructor(t) {
      this.t = t;
    }
    id = "comicvine";
    capabilities = { series: true, volumes: true, volumeMetadata: true, volumeCovers: true, authentication: true };
    async resolveLink(input2) {
      const id = input2.includes("://") ? linkId(input2, ["comicvine.gamespot.com"], /\/(40(?:00|50)-\d+)(?:\/|$)/) : input2;
      if (!/^(?:4000|4050)-[1-9]\d*$/.test(id)) throw new MetadataError("invalid-id", "\u9700\u8981 ComicVine \u5377 4050-ID \u6216\u671F 4000-ID");
      return id;
    }
    async api(path, c) {
      if (!c.credentials.comicVineKey?.trim()) throw new MetadataError("authentication-required", "ComicVine \u9700\u8981\u81EA\u884C\u586B\u5199 API Key");
      const u = new URL(`https://comicvine.gamespot.com/api/${path}`);
      u.searchParams.set("api_key", c.credentials.comicVineKey.trim());
      u.searchParams.set("format", "json");
      const x = await json(this.t, u.href, c.signal);
      if (x.status_code !== 1) throw new MetadataError(x.status_code === 100 ? "authentication-required" : "unavailable", "ComicVine \u62D2\u7EDD\u67E5\u8BE2");
      return x;
    }
    async search(q, c) {
      const x = await this.api(`search/?resources=volume&limit=20&query=${encodeURIComponent(q)}`, c);
      return arr(x.results).map((v) => {
        const row = obj(v), image2 = obj(row.image ?? {});
        return candidate(this.id, `4050-${numeric(idText(row.id))}`, required(row.name), required(row.site_detail_url), image2.small_url || image2.super_url || image2.original_url);
      });
    }
    async get(id, c) {
      await this.resolveLink(id);
      const issue = id.startsWith("4000-"), x = obj((await this.api(`${issue ? "issue" : "volume"}/${id}/`, c)).results);
      checkId(x.id, id.split("-")[1]);
      const r = record(this.id, id, required(x.site_detail_url), x);
      titles(r, str(x.name) || (issue ? `Issue ${required(x.issue_number)}` : ""));
      r.summary = str(x.description) || str(x.deck) || void 0;
      if (x.publisher) r.publisher = str(obj(x.publisher).name) || void 0;
      if (issue) {
        r.volume = /^\d+(?:\.\d+)?$/.test(str(x.issue_number)) ? Number(x.issue_number) : void 0;
        r.releaseDate = date(x.store_date || x.cover_date);
        r.authors = list(x.person_credits).map((v) => {
          const p = obj(v);
          return { name: required(p.name), role: /pencil|art/i.test(str(p.role)) ? "penciller" : "writer" };
        });
      } else {
        r.books = list(x.issues).map((v) => {
          const i = obj(v), iid = `4000-${numeric(idText(i.id))}`;
          const b = record(this.id, iid, required(i.site_detail_url), i);
          titles(b, str(i.name) || `Issue ${required(i.issue_number)}`);
          b.volume = /^\d+(?:\.\d+)?$/.test(str(i.issue_number)) ? Number(i.issue_number) : void 0;
          b.warnings = ["\u9009\u62E9\u5177\u4F53\u671F ID \u540E\u8BFB\u53D6\u8BE6\u60C5"];
          return b;
        });
      }
      addCover(r, x.image && (obj(x.image).original_url || obj(x.image).super_url), r.volume);
      return r;
    }
  };

  // src/providers/html.ts
  /*! HTML selector adaptations informed by komf (MIT); see THIRD_PARTY.md. */
  function documentOf(text2) {
    const doc = new DOMParser().parseFromString(text2, "text/html");
    doc.querySelectorAll('script:not([type="application/ld+json"]),style,iframe,object,embed').forEach((e) => e.remove());
    return doc;
  }
  function plain(text2) {
    return documentOf(text2).body.textContent?.trim() ?? "";
  }
  function text(doc, selector) {
    return doc.querySelector(selector)?.textContent?.trim() ?? "";
  }
  function meta(doc, name) {
    return doc.querySelector(`meta[property="${name}"]`)?.getAttribute("content") ?? "";
  }
  function href(value, base2) {
    return safeUrl(new URL(value, base2).href);
  }
  function image(r, value) {
    if (value) r.covers.push({ url: href(value, r.url), volume: r.volume });
  }
  function known(doc, selector) {
    if (!doc.querySelector(selector)) throw new MetadataError("invalid-response", "\u9875\u9762\u7ED3\u6784\u53D8\u5316\u6216\u6765\u6E90\u62E6\u622A\uFF0C\u8BF7\u4F7F\u7528\u5177\u4F53\u94FE\u63A5\u91CD\u8BD5");
  }
  var vizPath = /^\/manga-books\/manga\/[\w.-]+(?:\/product\/[1-9]\d*)?(?:\/(?:digital|paperback|hardcover))?\/?$/;
  var EHentai = class {
    constructor(t) {
      this.t = t;
    }
    id = "ehentai";
    capabilities = { series: false, volumes: true, gallery: true, volumeMetadata: false };
    config(c) {
      const auth = c.credentials.exhentai;
      if (!auth?.enabled) return { host: "e-hentai.org" };
      if (!/^\d+$/.test(auth.memberId) || !/^[a-z0-9]+$/i.test(auth.passHash) || auth.igneous && !/^[a-z0-9]+$/i.test(auth.igneous)) throw new MetadataError("authentication-required", "ExH \u9700\u8981\u6709\u6548\u7684\u672C\u5730\u767B\u5F55 Cookie \u914D\u7F6E");
      return { host: "exhentai.org", cookie: `ipb_member_id=${auth.memberId}; ipb_pass_hash=${auth.passHash}${auth.igneous ? `; igneous=${auth.igneous}` : ""}` };
    }
    async resolveLink(input2, c) {
      const { host } = this.config(c);
      if (/^[1-9]\d*:[a-f0-9]{10}$/i.test(input2)) return input2.toLowerCase();
      const u = new URL(safeUrl(input2));
      if (!["e-hentai.org", "exhentai.org"].includes(u.hostname)) throw new MetadataError("invalid-id", "EH \u57DF\u540D\u4E0D\u7B26");
      if (u.hostname === "exhentai.org" && host !== "exhentai.org") throw new MetadataError("authentication-required", "\u8BF7\u660E\u786E\u542F\u7528\u5E76\u914D\u7F6E ExH");
      const m = u.pathname.match(/^\/g\/([1-9]\d*)\/([a-f0-9]{10})\/?$/i);
      if (!m) throw new MetadataError("invalid-id", "EH \u9700\u8981 gid:token \u6216\u5B8C\u6574\u753B\u5ECA\u94FE\u63A5");
      return `${numeric(m[1])}:${m[2].toLowerCase()}`;
    }
    async search(q, c) {
      const config = this.config(c), base2 = `https://${config.host}/`;
      const response = await this.t.request({ url: `${base2}?f_search=${encodeURIComponent(q)}`, cookie: config.cookie }, c.signal);
      const doc = documentOf(response.text);
      known(doc, ".itg, #searchbox, #searchnav, .searchtext");
      const found = /* @__PURE__ */ new Map();
      for (const a of doc.querySelectorAll("a[href]")) {
        const u = new URL(a.getAttribute("href"), base2);
        const m = u.pathname.match(/^\/g\/([1-9]\d*)\/([a-f0-9]{10})\/?$/i);
        if (m && ["e-hentai.org", "exhentai.org"].includes(u.hostname)) {
          const name = a.textContent?.trim() || a.querySelector("img")?.getAttribute("alt");
          if (name) found.set(`${m[1]}:${m[2]}`, candidate(this.id, `${m[1]}:${m[2]}`, name, u.href));
        }
      }
      return [...found.values()].slice(0, 25);
    }
    async get(input2, c) {
      const id = await this.resolveLink(input2, c), config = this.config(c);
      const [gid, token] = id.split(":");
      const response = await this.t.request({
        url: "https://api.e-hentai.org/api.php",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ method: "gdata", gidlist: [[Number(gid), token]], namespace: 1 }),
        cookie: config.cookie
      }, c.signal);
      let data;
      try {
        data = JSON.parse(response.text);
      } catch {
        throw new MetadataError("invalid-response", "EH \u8FD4\u56DE\u975E JSON");
      }
      const x = obj(arr(obj(data).gmetadata)[0]);
      if (x.error) throw new MetadataError("unavailable", `EH \u6761\u76EE\u4E0D\u53EF\u7528\uFF1A${plain(str(x.error))}`);
      checkId(x.gid, gid);
      if (x.token !== token) throw new MetadataError("invalid-id", "EH token \u4E0D\u7B26");
      const r = record(this.id, id, `https://${config.host}/g/${gid}/${token}/`, x);
      r.titles.push({ text: required(x.title_jpn || x.title), type: "native" });
      if (str(x.title) && x.title !== x.title_jpn) r.titles.push({ text: str(x.title), type: "localized" });
      r.tags = arr(x.tags).map(required);
      r.genres = str(x.category) ? [str(x.category)] : [];
      r.authors = r.tags.filter((t) => t.startsWith("artist:") || t.startsWith("group:")).map((t) => ({ name: t.slice(t.indexOf(":") + 1), role: t.startsWith("artist:") ? "penciller" : "writer" }));
      const language = r.tags.find((t) => t.startsWith("language:"))?.slice(9);
      const languages = { japanese: "ja", english: "en", chinese: "zh", korean: "ko", french: "fr", spanish: "es" };
      r.language = language ? languages[language] : void 0;
      image(r, str(x.thumb));
      r.warnings = ["EH \u5C01\u9762\u4E3A\u6765\u6E90\u7F29\u7565\u56FE\uFF1B\u4E0A\u4F20\u65E5\u671F\u4E0D\u662F\u53D1\u884C\u65E5\uFF1B\u7CFB\u5217\u72B6\u6001\u672A\u77E5"];
      return r;
    }
  };
  var HTMLSource = class {
    constructor(id, t) {
      this.id = id;
      this.t = t;
      this.capabilities = { series: id !== "viz", volumes: id !== "webtoons", volumeMetadata: id !== "webtoons", volumeCovers: id !== "webtoons" };
    }
    capabilities;
    get base() {
      return this.id === "viz" ? "https://www.viz.com" : this.id === "yenpress" ? "https://yenpress.com" : "https://www.webtoons.com";
    }
    async resolveLink(input2) {
      const u = new URL(input2.includes("://") ? safeUrl(input2) : href(input2, this.base));
      const host = new URL(this.base).hostname;
      if (u.hostname !== host && u.hostname !== host.replace(/^www\./, "")) throw new MetadataError("invalid-id", "\u6765\u6E90\u57DF\u540D\u4E0D\u7B26");
      if (this.id === "viz" && vizPath.test(u.pathname)) return u.pathname.replace(/\/$/, "");
      if (this.id === "yenpress" && /^\/(?:series|titles)\/[\w-]+\/?$/.test(u.pathname)) return u.pathname.replace(/\/$/, "");
      if (this.id === "webtoons" && /^\/[a-z-]+\/[^?]+\/list$/.test(u.pathname)) {
        const no = numeric(u.searchParams.get("title_no") ?? u.searchParams.get("titleNo") ?? "");
        return `${u.pathname}?title_no=${no}`;
      }
      throw new MetadataError("invalid-id", "\u9700\u8981\u8BE5\u6765\u6E90\u7684\u4F5C\u54C1\u5B8C\u6574\u94FE\u63A5");
    }
    async search(q, c) {
      if (this.id === "yenpress") {
        try {
          const source = await this.t.request({ url: `${this.base}/search` }, c.signal);
          const key2 = source.text.match(/"search_key"\s*:\s*"(search-[\w-]+)"/)?.[1];
          if (!key2) throw new MetadataError("unavailable", "YenPress \u516C\u5F00\u641C\u7D22\u914D\u7F6E\u5DF2\u53D8\u5316\uFF0C\u53EF\u7C98\u8D34\u4F5C\u54C1\u94FE\u63A5");
          const x = await json(
            this.t,
            "https://enterprise-search.yenpress.com/api/as/v1/engines/yenpress/search.json",
            c.signal,
            { query: q, filters: { all: [{ type: "series" }] }, page: { size: 20, current: 1 } },
            { Authorization: `Bearer ${key2}` }
          );
          return Promise.all(arr(x.results).map(async (v) => {
            const row = obj(v), url2 = required(obj(row.url).raw), id = await this.resolveLink(url2);
            return candidate(this.id, id, required(obj(row.title).raw), href(id, this.base));
          }));
        } catch (error) {
          if (error instanceof MetadataError && error.status === 502) throw new MetadataError("http", "YenPress \u641C\u7D22\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF08HTTP 502\uFF09\uFF1B\u53EF\u901A\u8FC7\u4F5C\u54C1\u94FE\u63A5\u8BFB\u53D6", 502);
          throw error;
        }
      }
      if (this.id === "webtoons") {
        const response2 = await this.t.request({ url: `${this.base}/en/search?keyword=${encodeURIComponent(q)}` }, c.signal);
        const doc2 = documentOf(response2.text);
        known(doc2, "#content");
        if (!/^\s*Search\s*::\s*WEBTOON/i.test(doc2.title)) throw new MetadataError("unavailable", "Webtoons \u641C\u7D22\u9875\u88AB\u62E6\u622A\u6216\u9875\u9762\u7ED3\u6784\u5DF2\u53D8\u5316");
        const found = /* @__PURE__ */ new Map();
        for (const a of doc2.querySelectorAll("#content .webtoon_list a._card_item[href]")) {
          const id = await this.resolveLink(href(a.getAttribute("href"), this.base));
          const img = a.querySelector("img");
          const cover = img?.getAttribute("data-src") || img?.getAttribute("src");
          found.set(id, candidate(this.id, id, required(text(a, ".title")), href(id, this.base), cover ? href(cover, this.base) : void 0));
        }
        return [...found.values()];
      }
      const response = await this.t.request({ url: `${this.base}/search?search=${encodeURIComponent(q)}&category=Manga` }, c.signal);
      const doc = documentOf(response.text);
      known(doc, "#results");
      const results = /* @__PURE__ */ new Map();
      for (const a of doc.querySelectorAll('#results a[href*="/manga-books/manga/"]')) {
        const name = a.textContent?.trim();
        const path = new URL(a.getAttribute("href"), this.base).pathname;
        if (name && vizPath.test(path)) {
          const id = await this.resolveLink(href(path, this.base));
          results.set(id, candidate(this.id, id, name, href(id, this.base)));
        }
      }
      return [...results.values()].slice(0, 20);
    }
    async get(input2, c) {
      const id = await this.resolveLink(input2), url2 = href(id, this.base);
      const response = await this.t.request({ url: url2, headers: this.id === "webtoons" ? { Referer: "https://www.webtoons.com/en" } : void 0 }, c.signal);
      const doc = documentOf(response.text), r = record(this.id, id, url2, { htmlUrl: response.finalUrl });
      const canonical = meta(doc, "og:url") || doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
      if (canonical) {
        const resolved = await this.resolveLink(href(canonical, this.base));
        const same = this.id === "webtoons" ? new URL(resolved, this.base).searchParams.get("title_no") === new URL(id, this.base).searchParams.get("title_no") : resolved === id;
        if (!same) throw new MetadataError("invalid-id", "\u9875\u9762\u91CD\u5B9A\u5411\u5230\u4E0D\u540C\u4F5C\u54C1");
      }
      const selector = this.id === "viz" ? "#purchase_links_block h2" : this.id === "yenpress" ? ".heading-content .heading, h1" : "h1.subj, h3.subj";
      known(doc, selector);
      if (this.id === "yenpress") doc.querySelector(selector)?.querySelectorAll('sup[rel="nofollow"]').forEach((e) => e.remove());
      const title = required(text(doc, selector));
      r.titles.push({ text: title, type: "native" });
      r.volume = this.id === "webtoons" || id.startsWith("/series/") ? void 0 : volume(title);
      r.summary = text(doc, this.id === "webtoons" ? "#_asideDetail p.summary" : this.id === "yenpress" ? ".content-heading-txt p.paragraph, .book-info .content-heading-txt, .series-description" : "#product_row .description, #product_row .o_summary, #product_row .text-spacing") || meta(doc, "og:description") || void 0;
      image(r, meta(doc, "og:image") || doc.querySelector("#product_image_block img, .series-cover img")?.getAttribute("data-src") || doc.querySelector("#product_image_block img, .series-cover img")?.getAttribute("src") || "");
      r.publisher = this.id === "viz" ? "VIZ Media" : this.id === "yenpress" ? "Yen Press" : void 0;
      r.genres = [...doc.querySelectorAll(this.id === "webtoons" ? ".detail_header .genre" : ".genres a, .book-details .txt-hold a")].map((e) => e.textContent?.trim() ?? "").filter(Boolean);
      if (this.id === "viz") {
        r.genres = [...doc.querySelectorAll("#purchase_links_block > div:first-child a:not(.bg-yellow)")].map((e) => e.textContent?.trim() ?? "").filter(Boolean);
        for (const strong of doc.querySelectorAll("#product_row strong")) {
          const label = strong.textContent?.trim() ?? "", content = strong.parentElement?.textContent?.trim() ?? "";
          if (/^Story.*by$|^Art by$/.test(label)) {
            for (const part of content.split(/,\s*(?=(?:Story|Art))/)) {
              const match = part.match(/^(Story and Art by|Story by|Art by)\s+(.+)$/);
              if (match) {
                if (match[1].includes("Story")) r.authors.push({ name: match[2], role: "writer" });
                if (match[1].includes("Art")) r.authors.push({ name: match[2], role: "penciller" });
              }
            }
          }
          if (label === "Age Rating") {
            const ratings = { "All Ages": 0, Teen: 13, "Teen Plus": 16, Mature: 18 };
            r.ageRating = ratings[content.replace(/^Age Rating\s*/, "")];
          }
        }
      }
      if (this.id === "webtoons") {
        const day = text(doc, "#_asideDetail p.day_info");
        if (/COMPLETED|END|TERMINÉ/i.test(day)) r.status = "ENDED";
        else if (/EVERY|UP|NOUVEAU/i.test(day)) r.status = "ONGOING";
        const authors = doc.querySelectorAll(".detail_header .author");
        r.authors = [...authors].map((e, i) => ({ name: required(e.textContent?.trim()), role: i === 0 ? "writer" : "penciller" }));
        if (!authors.length) {
          const author = text(doc, ".detail_header .author_area");
          if (author) r.authors.push({ name: author, role: "writer" });
        }
      } else {
        const details = doc.body.textContent ?? "";
        const isbn = text(doc, ".o_isbn13, .o_eisbn13") || details.match(/ISBN(?:-13)?\s*:?\s*([\d-]{13,17})/)?.[1];
        if (isbn) r.isbn = isbn.replace(/^(?:e?ISBN-13|ISBN)\s*:?\s*/i, "").replace(/[^0-9X]/g, "");
        const d = text(doc, ".o_release-date").replace(/^Release\s*/, "") || details.match(/Release Date\s*:?\s*([A-Za-z]+ \d{1,2}, \d{4})/)?.[1];
        if (d && !Number.isNaN(Date.parse(d))) {
          const parsed = new Date(d);
          r.releaseDate = date(`${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`);
        }
        const authorElements = this.id === "yenpress" ? [...doc.querySelector(".heading-content .story-details, .story-details")?.children ?? []] : [...doc.querySelectorAll(".o_author")];
        for (const e of authorElements) {
          const name = e.textContent?.trim() ?? "", match = name.match(/^(?:Story and Art by|Story by|Art by|Author|Artist|Illustrated by|Translated by)\s*:?\s+(.+)$/i);
          if (match) r.authors.push({ name: match[1], role: /art|illustrat/i.test(name) ? "penciller" : /translat/i.test(name) ? "translator" : "writer" });
        }
        if (this.id === "yenpress" && id.startsWith("/series/")) {
          const books = /* @__PURE__ */ new Map();
          let next = `${this.base}/series/get_more/${id.slice("/series/".length)}?next_ord=99999`;
          for (let page = 0; page < 10; page++) {
            const response2 = await this.t.request({ url: next, headers: { "X-Requested-With": "XMLHttpRequest" } }, c.signal);
            const pageDoc = documentOf(response2.text);
            known(pageDoc, ".inline_block, .no-results, .no-books");
            for (const a of pageDoc.querySelectorAll('.inline_block a[href^="/titles/"]')) {
              const name = a.textContent?.trim();
              if (!name) continue;
              const bid = await this.resolveLink(href(a.getAttribute("href"), this.base));
              const b = record(this.id, bid, href(bid, this.base), { relationUrl: url2 });
              b.titles = [{ text: name, type: "native" }];
              b.volume = volume(name);
              const cover = a.querySelector("img");
              image(b, cover?.getAttribute("data-src") || cover?.getAttribute("src") || "");
              b.warnings = ["\u5377\u5217\u8868\u4EC5\u542B\u7B80\u8981\u4FE1\u606F\uFF1B\u9009\u62E9\u5177\u4F53\u5377\u8BFB\u53D6\u8BE6\u60C5"];
              books.set(bid, b);
            }
            const more = pageDoc.querySelector(".show-more")?.getAttribute("data-url");
            if (!more) break;
            const u = new URL(more, next);
            if (u.origin !== this.base || u.pathname !== `/series/get_more/${id.slice("/series/".length)}` || !/^\d+$/.test(u.searchParams.get("next_ord") ?? "")) throw new MetadataError("invalid-response", "\u975E\u6CD5\u5377\u5217\u8868\u5206\u9875");
            next = u.href;
            if (page === 9) throw new MetadataError("unavailable", "\u5377\u5217\u8868\u8D85\u8FC7\u5206\u9875\u5B89\u5168\u4E0A\u9650");
          }
          r.books = [...books.values()];
          const featuredVolume = volume(text(doc, ".series-cover p"));
          if (featuredVolume !== void 0 && r.covers[0]) r.covers[0].volume = featuredVolume;
          r.warnings = ["\u7CFB\u5217\u7B80\u4ECB\u6765\u81EA\u5F53\u524D\u7CBE\u9009\u5377\uFF1B\u53D1\u884C\u65E5\u3001ISBN \u7B49\u8BF7\u8BFB\u53D6\u5177\u4F53\u5377\u3002\u5C01\u9762\u7CBE\u9009\u5377\u53F7\u4E0D\u4EE3\u8868\u6570\u7EC4\u987A\u5E8F\u3002"];
        }
      }
      return r;
    }
  };

  // src/providers/index.ts
  function createRegistry(transport) {
    const registry = new Registry();
    registry.register(new Bangumi(new SourceTransport(transport, 400)));
    registry.register(new MangaUpdates(new SourceTransport(transport, 1e3)));
    registry.register(new MangaBaka(new SourceTransport(transport, 500)));
    registry.register(new AniList(new SourceTransport(transport, 1e3)));
    registry.register(new EHentai(new SourceTransport(transport, 1500)));
    registry.register(new MAL(new SourceTransport(transport, 1e3)));
    registry.register(new ComicVine(new SourceTransport(transport, 2e3)));
    registry.register(new HTMLSource("viz", new SourceTransport(transport, 1e3)));
    return registry;
  }

  // node_modules/@noble/hashes/_u64.js
  var fromNumH = (n) => n / 2 ** 32 | 0;
  var fromNumL = (n) => n >>> 0;
  function setU64FromNum(view, byteOffset, n, isLE) {
    const h = fromNumH(n);
    const l = fromNumL(n);
    view.setUint32(byteOffset, isLE ? l : h, isLE);
    view.setUint32(byteOffset + 4, isLE ? h : l, isLE);
  }

  // node_modules/@noble/hashes/utils.js
  function isBytes(a) {
    return a instanceof Uint8Array || ArrayBuffer.isView(a) && a.constructor.name === "Uint8Array" && "BYTES_PER_ELEMENT" in a && a.BYTES_PER_ELEMENT === 1;
  }
  var atitle = (title) => title ? `"${title}" ` : "";
  function anumber(n, title = "") {
    if (typeof n !== "number")
      throw new TypeError(atitle(title) + "expected number, got " + typeof n);
    if (!Number.isSafeInteger(n) || n < 0)
      throw new RangeError(atitle(title) + "expected integer >= 0, got " + n);
    return n;
  }
  function abytes(value, length, title = "") {
    if (isBytes(value) && (length === void 0 || value.length === length))
      return value;
    if (length !== void 0)
      anumber(length, "length");
    const bytes = isBytes(value);
    const ofLen = length !== void 0 ? ` of length ${length}` : "";
    const got = bytes ? `length=${value.length}` : `type=${typeof value}`;
    const message = atitle(title) + "expected Uint8Array" + ofLen + ", got " + got;
    if (!bytes)
      throw new TypeError(message);
    throw new RangeError(message);
  }
  var aobject = (value, label) => {
    if (value === null || typeof value !== "object" || Array.isArray(value))
      throw new TypeError((label === "object" ? "" : `"${label}" `) + "expected object, got type=" + typeof value);
  };
  var aopts = (value, label) => {
    aobject(value, label);
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null)
      throw new TypeError(`"${label}" expected plain object`);
    if (Object.hasOwn(value, "__proto__"))
      throw new TypeError(`"${label}.__proto__" is not allowed`);
  };
  function aexists(instance, checkFinished = true) {
    if (instance.destroyed)
      throw new Error("hash was destroyed");
    if (checkFinished && instance.finished)
      throw new Error("digest() was already called");
  }
  function aoutput(out, instance) {
    abytes(out, void 0, "output");
    const min = instance.outputLen;
    if (!(out.length >= min)) {
      throw new RangeError('"output" expected length >= ' + min);
    }
  }
  function clean(...arrays) {
    for (let i = 0; i < arrays.length; i++) {
      arrays[i].fill(0);
    }
  }
  function createView(arr2) {
    return new DataView(arr2.buffer, arr2.byteOffset, arr2.byteLength);
  }
  function rotr(word, shift) {
    return word << 32 - shift | word >>> shift;
  }
  function checkOpts(defaults, opts, title = "opts") {
    aopts(defaults, "defaults");
    if (opts !== void 0)
      aopts(opts, title);
    const merged = Object.assign(/* @__PURE__ */ Object.create(null), defaults, opts);
    return merged;
  }
  function createHasher(hashCons, info = {}) {
    if (typeof hashCons !== "function")
      throw new TypeError('"hashCons" expected function, got type=' + typeof hashCons);
    info = checkOpts({}, info, "info");
    const hashC = (msg, opts) => hashCons(opts).update(msg).digest();
    const tmp = hashCons(void 0);
    hashC.outputLen = tmp.outputLen;
    hashC.blockLen = tmp.blockLen;
    hashC.canXOF = tmp.canXOF;
    hashC.create = (opts) => hashCons(opts);
    Object.assign(hashC, info);
    return Object.freeze(hashC);
  }
  var oidNist = (suffix) => ({
    // Current NIST hashAlgs suffixes used here fit in one DER subidentifier octet.
    // Larger suffix values would need base-128 OID encoding and a different length byte.
    oid: Uint8Array.from([6, 9, 96, 134, 72, 1, 101, 3, 4, 2, suffix])
  });

  // node_modules/@noble/hashes/_md.js
  function Chi(a, b, c) {
    return a & b ^ ~a & c;
  }
  function Maj(a, b, c) {
    return a & b ^ a & c ^ b & c;
  }
  var HashMD = class {
    blockLen;
    outputLen;
    canXOF = false;
    padOffset;
    isLE;
    // For partial updates less than block size
    buffer;
    view;
    finished = false;
    length = 0;
    pos = 0;
    destroyed = false;
    constructor(blockLen, outputLen, padOffset, isLE) {
      this.blockLen = blockLen;
      this.outputLen = outputLen;
      this.padOffset = padOffset;
      this.isLE = isLE;
      this.buffer = new Uint8Array(blockLen);
      this.view = createView(this.buffer);
    }
    update(data) {
      aexists(this);
      abytes(data);
      const { view, buffer, blockLen } = this;
      const len = data.length;
      let processed = false;
      for (let pos = 0; pos < len; ) {
        const take = Math.min(blockLen - this.pos, len - pos);
        if (take === blockLen) {
          const dataView = createView(data);
          for (; blockLen <= len - pos; pos += blockLen)
            this.process(dataView, pos);
          processed = true;
          continue;
        }
        buffer.set(pos === 0 && take === len ? data : data.subarray(pos, pos + take), this.pos);
        this.pos += take;
        pos += take;
        if (this.pos === blockLen) {
          this.process(view, 0);
          this.pos = 0;
          processed = true;
        }
      }
      this.length += data.length;
      if (processed)
        this.roundClean();
      return this;
    }
    digestInto(out) {
      aexists(this);
      aoutput(out, this);
      this.finished = true;
      const { buffer, view, blockLen, isLE } = this;
      let { pos } = this;
      buffer[pos++] = 128;
      buffer.fill(0, pos);
      if (this.padOffset > blockLen - pos) {
        this.process(view, 0);
        buffer.fill(0);
      }
      setU64FromNum(view, blockLen - 8, this.length * 8, isLE);
      this.process(view, 0);
      this.roundClean();
      const oview = out === buffer ? view : createView(out);
      const len = this.outputLen;
      const outLen = len / 4;
      const state = this.get();
      if (len % 4 || outLen > state.length)
        throw new Error("invalid outputLen");
      for (let i = 0; i < outLen; i++)
        oview.setUint32(4 * i, state[i], isLE);
    }
    digest() {
      const { buffer, outputLen } = this;
      this.digestInto(buffer);
      const res = buffer.slice(0, outputLen);
      this.destroy();
      return res;
    }
    _cloneIntoMeta(to) {
      const { buffer, length, finished, destroyed, pos } = this;
      to.destroyed = destroyed;
      to.finished = finished;
      to.length = length;
      to.pos = pos;
      if (pos)
        to.buffer.set(buffer);
      return to;
    }
    clone() {
      return this._cloneInto();
    }
  };
  var SHA256_IV = /* @__PURE__ */ Uint32Array.from([
    1779033703,
    3144134277,
    1013904242,
    2773480762,
    1359893119,
    2600822924,
    528734635,
    1541459225
  ]);

  // node_modules/@noble/hashes/sha2.js
  var SHA256_K = /* @__PURE__ */ Uint32Array.from([
    1116352408,
    1899447441,
    3049323471,
    3921009573,
    961987163,
    1508970993,
    2453635748,
    2870763221,
    3624381080,
    310598401,
    607225278,
    1426881987,
    1925078388,
    2162078206,
    2614888103,
    3248222580,
    3835390401,
    4022224774,
    264347078,
    604807628,
    770255983,
    1249150122,
    1555081692,
    1996064986,
    2554220882,
    2821834349,
    2952996808,
    3210313671,
    3336571891,
    3584528711,
    113926993,
    338241895,
    666307205,
    773529912,
    1294757372,
    1396182291,
    1695183700,
    1986661051,
    2177026350,
    2456956037,
    2730485921,
    2820302411,
    3259730800,
    3345764771,
    3516065817,
    3600352804,
    4094571909,
    275423344,
    430227734,
    506948616,
    659060556,
    883997877,
    958139571,
    1322822218,
    1537002063,
    1747873779,
    1955562222,
    2024104815,
    2227730452,
    2361852424,
    2428436474,
    2756734187,
    3204031479,
    3329325298
  ]);
  var SHA256_W = /* @__PURE__ */ new Uint32Array(64);
  var SHA2_32B = class extends HashMD {
    // We cannot use array here since array allows indexing by variable
    // which means optimizer/compiler cannot use registers.
    // Numeric initializers matter: starting the fields as `undefined` changes
    // V8's field representation and makes sha256 3x slower (measured).
    A = 0;
    B = 0;
    C = 0;
    D = 0;
    E = 0;
    F = 0;
    G = 0;
    H = 0;
    constructor(outputLen, IV) {
      super(64, outputLen, 8, false);
      this.A = IV[0] | 0;
      this.B = IV[1] | 0;
      this.C = IV[2] | 0;
      this.D = IV[3] | 0;
      this.E = IV[4] | 0;
      this.F = IV[5] | 0;
      this.G = IV[6] | 0;
      this.H = IV[7] | 0;
    }
    get() {
      const { A, B, C, D, E, F, G, H } = this;
      return [A, B, C, D, E, F, G, H];
    }
    // prettier-ignore
    set(A, B, C, D, E, F, G, H) {
      this.A = A | 0;
      this.B = B | 0;
      this.C = C | 0;
      this.D = D | 0;
      this.E = E | 0;
      this.F = F | 0;
      this.G = G | 0;
      this.H = H | 0;
    }
    _cloneInto(to) {
      (to ||= new this.constructor()).set(...this.get());
      return this._cloneIntoMeta(to);
    }
    process(view, offset) {
      for (let i = 0; i < 16; i++, offset += 4)
        SHA256_W[i] = view.getUint32(offset, false);
      for (let i = 16; i < 64; i++) {
        const W15 = SHA256_W[i - 15];
        const W2 = SHA256_W[i - 2];
        const s0 = rotr(W15, 7) ^ rotr(W15, 18) ^ W15 >>> 3;
        const s1 = rotr(W2, 17) ^ rotr(W2, 19) ^ W2 >>> 10;
        SHA256_W[i] = s1 + SHA256_W[i - 7] + s0 + SHA256_W[i - 16] | 0;
      }
      let { A, B, C, D, E, F, G, H } = this;
      for (let i = 0; i < 64; i++) {
        const sigma1 = rotr(E, 6) ^ rotr(E, 11) ^ rotr(E, 25);
        const T1 = H + sigma1 + Chi(E, F, G) + SHA256_K[i] + SHA256_W[i] | 0;
        const sigma0 = rotr(A, 2) ^ rotr(A, 13) ^ rotr(A, 22);
        const T2 = sigma0 + Maj(A, B, C) | 0;
        H = G;
        G = F;
        F = E;
        E = D + T1 | 0;
        D = C;
        C = B;
        B = A;
        A = T1 + T2 | 0;
      }
      A = A + this.A | 0;
      B = B + this.B | 0;
      C = C + this.C | 0;
      D = D + this.D | 0;
      E = E + this.E | 0;
      F = F + this.F | 0;
      G = G + this.G | 0;
      H = H + this.H | 0;
      this.set(A, B, C, D, E, F, G, H);
    }
    roundClean() {
      clean(SHA256_W);
    }
    destroy() {
      this.destroyed = true;
      this.set(0, 0, 0, 0, 0, 0, 0, 0);
      clean(this.buffer);
    }
  };
  var _SHA256 = class extends SHA2_32B {
    constructor() {
      super(32, SHA256_IV);
    }
  };
  var sha256 = /* @__PURE__ */ createHasher(
    () => new _SHA256(),
    /* @__PURE__ */ oidNist(1)
  );

  // src/plan.ts
  var seriesFields = ["title", "summary", "publisher", "language", "status", "ageRating", "tags", "genres", "links", "alternateTitles"];
  var bookFields = ["title", "summary", "releaseDate", "isbn", "tags", "links", "authors"];
  function equal(a, b) {
    if (a === b) return true;
    if (a == null || b == null || typeof a !== "object" || typeof b !== "object") return false;
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false;
      const unmatched = [...b];
      return a.every((v) => {
        const index = unmatched.findIndex((w) => equal(v, w));
        if (index < 0) return false;
        unmatched.splice(index, 1);
        return true;
      });
    }
    const x = a, y = b;
    const keys = Object.keys(x);
    return keys.length === Object.keys(y).length && keys.every((k) => equal(x[k], y[k]));
  }
  function merge(old, incoming) {
    const values = Array.isArray(old) ? [...old] : [];
    for (const v of incoming) if (!values.some((w) => equal(v, w))) values.push(v);
    return values;
  }
  function normalizeWriteFields(metadata2) {
    const normalized = { ...metadata2 };
    for (const field of ["tags", "genres"]) {
      const values = normalized[field];
      if (Array.isArray(values) && values.every((v) => typeof v === "string")) {
        normalized[field] = [...new Set(values.map((v) => v.trim().toLowerCase()).filter(Boolean))];
      }
    }
    return normalized;
  }
  function mappedFields(r) {
    return normalizeWriteFields({
      title: nativeTitle(r),
      summary: r.summary === void 0 ? void 0 : plain(r.summary),
      publisher: r.publisher,
      language: r.language,
      status: r.status,
      ageRating: r.ageRating,
      releaseDate: r.releaseDate,
      isbn: r.isbn?.replace(/[- ]/g, ""),
      tags: r.tags,
      genres: r.genres,
      links: r.links.map((l) => ({ label: l.label, url: l.url })),
      alternateTitles: r.titles.map((t) => ({ title: t.text, label: t.language || t.type })),
      authors: r.authors.map((a) => ({ name: a.native || a.name, role: a.role }))
    });
  }
  function isVolumeRecord(record2) {
    return record2.volume !== void 0 || record2.provider === "viz" || record2.provider === "ehentai" || record2.id.startsWith("4000-") || record2.id.startsWith("/titles/");
  }
  function buildPlan(state, record2, selection) {
    const plan = { seriesId: state.series.id, edits: [], skipped: [] };
    const incoming = selection.mergedFields ?? mappedFields(record2);
    let chosen = selection.bookId ? state.books.find((b) => b.id === validId(selection.bookId)) : void 0;
    if (selection.bookId && !chosen) throw new MetadataError("invalid-id", "\u6240\u9009\u4E66\u7C4D\u4E0D\u5C5E\u4E8E\u5F53\u524D\u7CFB\u5217");
    if (!chosen && selection.verifiedVolume !== void 0) {
      const matched = state.books.filter((b) => typeof b.metadata.number === "string" && /^\d+(?:\.\d+)?$/.test(b.metadata.number) && Number(b.metadata.number) === selection.verifiedVolume);
      if (matched.length !== 1 || record2.volume !== selection.verifiedVolume) throw new MetadataError("invalid-id", "\u5377\u53F7\u672A\u9A8C\u8BC1\u6216\u4E0D\u552F\u4E00\uFF0C\u8BF7\u660E\u786E\u9009\u62E9\u4E66\u7C4D ID");
      chosen = matched[0];
    }
    if (state.series.oneshot) {
      if (state.books.length !== 1) throw new MetadataError("invalid-response", "One-shot \u5FC5\u987B\u6709\u552F\u4E00\u5B9E\u9645\u5173\u8054\u4E66\u7C4D");
      chosen = state.books[0];
    }
    const add = (target, old, fields) => {
      const before = {}, after = {}, guards = {};
      for (const field of fields) {
        if (!selection.fields.includes(field)) continue;
        const value = incoming[field];
        if (value === void 0 || Array.isArray(value) && !value.length) continue;
        const lock = `${field}Lock`;
        if (old[lock] === true || state.series.metadata[lock] === true) {
          plan.skipped.push(`${target.kind}/${target.id} ${field} \u5DF2\u9501\u5B9A`);
          continue;
        }
        const next = Array.isArray(value) ? merge(old[field], value) : value;
        if (!selection.includeUnchanged && equal(old[field], next)) continue;
        before[field] = old[field] ?? null;
        after[field] = next;
        guards[lock] = old[lock] ?? false;
      }
      if (Object.keys(after).length) plan.edits.push({ target, before, after, guards });
    };
    const volumeSpecific = isVolumeRecord(record2);
    if (!volumeSpecific || state.series.oneshot) add({ kind: "series", id: state.series.id }, state.series.metadata, seriesFields);
    if (chosen) add({ kind: "books", id: chosen.id }, chosen.metadata, bookFields);
    else if (selection.fields.some((f) => ["releaseDate", "isbn"].includes(f)) || volumeSpecific && selection.fields.some((f) => bookFields.includes(f))) throw new MetadataError("invalid-id", "\u5355\u5377\u5B57\u6BB5\u9700\u8981\u660E\u786E\u76EE\u6807\u4E66\u7C4D");
    if (selection.propagateAuthors && !volumeSpecific) for (const b of state.books) {
      if (b.id !== chosen?.id) add({ kind: "books", id: b.id }, b.metadata, ["authors"]);
    }
    if (selection.fields.includes("authors") && !chosen && !selection.propagateAuthors) plan.skipped.push("\u4F5C\u8005\u672A\u9009\u62E9\u4E66\u7C4D\uFF1B\u53EF\u542F\u7528\u4F20\u64AD");
    if (selection.cover) {
      let target = selection.coverTarget;
      if (state.series.oneshot) target = { kind: "books", id: chosen.id };
      if (!target) throw new MetadataError("invalid-id", "\u8BF7\u9009\u62E9\u5C01\u9762\u76EE\u6807");
      const old = target.kind === "series" && target.id === state.series.id ? state.series.metadata : state.books.find((b) => b.id === target.id)?.metadata;
      if (!old || target.kind === "books" && !state.books.some((b) => b.id === target.id)) throw new MetadataError("invalid-id", "\u5C01\u9762\u76EE\u6807\u4E0D\u5C5E\u4E8E\u7CFB\u5217");
      if (volumeSpecific && !state.series.oneshot && target.kind === "series") throw new MetadataError("invalid-id", "\u5355\u5377\u5C01\u9762\u9700\u8981\u4E66\u7C4D\u76EE\u6807");
      if (old.thumbnailLock === true || state.series.metadata.thumbnailLock === true) plan.skipped.push("\u5C01\u9762\u5DF2\u9501\u5B9A");
      else plan.cover = { target, source: selection.cover, sharedSeries: state.series.oneshot ? { kind: "series", id: state.series.id } : void 0 };
    }
    return plan;
  }

  // src/writer.ts
  async function hash(blob) {
    const digest = sha256.create();
    for (let offset = 0; offset < blob.size; offset += 1024 * 1024) {
      digest.update(new Uint8Array(await blob.slice(offset, offset + 1024 * 1024).arrayBuffer()));
    }
    return [...digest.digest()].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  async function validateImage(blob) {
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(blob.type.toLowerCase()) || blob.size === 0 || blob.size > 25 * 1024 * 1024) throw new MetadataError("verification", "\u5C01\u9762\u5FC5\u987B\u662F 25 MiB \u5185\u7684\u6709\u6548\u56FE\u7247\uFF08\u4E0D\u80FD\u662F HTML \u6216 SVG\uFF09");
    const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
    const signature = blob.type === "image/png" ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n) : blob.type === "image/jpeg" ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : blob.type === "image/gif" ? String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/) : String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP";
    if (!signature) throw new MetadataError("verification", "\u56FE\u7247 MIME \u4E0E\u6587\u4EF6\u5185\u5BB9\u4E0D\u7B26");
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(blob);
        const valid = bitmap.width > 0 && bitmap.height > 0;
        bitmap.close();
        if (!valid) throw new Error("zero dimensions");
      } catch {
        throw new MetadataError("verification", "\u5C01\u9762\u65E0\u6CD5\u89E3\u7801");
      }
    } else if (typeof Image !== "undefined" && typeof URL.createObjectURL === "function") {
      const url2 = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.src = url2;
        await img.decode();
        if (!img.naturalWidth || !img.naturalHeight) throw new Error("zero dimensions");
      } catch {
        throw new MetadataError("verification", "\u5C01\u9762\u65E0\u6CD5\u89E3\u7801");
      } finally {
        URL.revokeObjectURL(url2);
      }
    }
  }
  function verify(current, expected, nullish = true) {
    for (const [field, value] of Object.entries(expected)) {
      if (!equal(nullish ? current[field] ?? null : current[field] ?? false, value)) throw new MetadataError("conflict", `${field} \u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8`);
    }
  }
  function outcome(result, target, action, error) {
    result.outcomes.push({ target, action, status: error ? "error" : "success", message: error ? error instanceof Error ? error.message : String(error) : void 0 });
  }
  function finish(result) {
    const successful = result.outcomes.filter((o) => o.status === "success").length;
    result.status = successful === result.outcomes.length && successful > 0 ? "success" : successful ? "partial" : "error";
    return result;
  }
  var Writer = class {
    constructor(client, transport) {
      this.client = client;
      this.transport = transport;
    }
    busy = false;
    async image(url2, signal) {
      const response = await this.transport.request({ url: url2, responseType: "blob" }, signal);
      cancelled(signal);
      if (response.status < 200 || response.status >= 300 || !response.blob) throw new MetadataError("http", `\u5C01\u9762\u4E0B\u8F7D\u5931\u8D25 HTTP ${response.status}`);
      await validateImage(response.blob);
      cancelled(signal);
      return response.blob;
    }
    async verifySharedCover(target, expected, signal) {
      if (!target) return;
      const blob = await this.client.displayedThumbnail(target, signal);
      if ((blob ? await hash(blob) : void 0) !== expected) throw new MetadataError("conflict", "One-shot \u7CFB\u5217\u4E0E\u4E66\u7C4D\u5C01\u9762\u8BFB\u56DE\u4E0D\u4E00\u81F4");
    }
    async prepare(plan, signal) {
      if (plan.cover) {
        const cover = plan.cover;
        cover.prepared = void 0;
        const blob = await this.image(cover.source.url, signal);
        const selected = (await this.client.thumbnails(cover.target, signal)).find((t) => t.selected);
        cover.beforeSelected = selected?.id;
        cover.beforeBlob = selected ? await this.client.thumbnail(cover.target, selected.id, signal) : void 0;
        cover.beforeHash = cover.beforeBlob ? await hash(cover.beforeBlob) : void 0;
        await this.verifySharedCover(cover.sharedSeries, cover.beforeHash, signal);
        cancelled(signal);
        cover.prepared = { url: cover.source.url, blob, hash: await hash(blob) };
      }
      return plan;
    }
    async coverGuard(edit, signal) {
      const selected = (await this.client.thumbnails(edit.target, signal)).find((t) => t.selected);
      if (selected?.id !== edit.beforeSelected || selected && await hash(await this.client.thumbnail(edit.target, selected.id, signal)) !== edit.beforeHash) throw new MetadataError("conflict", "\u5C01\u9762\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8");
    }
    async metadataGuard(edit, signal) {
      const current = await this.client.read(edit.target, signal);
      verify(current, edit.before);
      verify(current, edit.guards, false);
      const series2 = await this.client.read({ kind: "series", id: this.seriesId }, signal);
      for (const field of Object.keys(edit.after)) if (series2[`${field}Lock`] === true) throw new MetadataError("conflict", `${field} \u7CFB\u5217\u9501\u5DF2\u53D8\u5316`);
    }
    seriesId = "";
    async apply(plan, signal) {
      if (this.busy) throw new MetadataError("unavailable", "\u5199\u5165\u4EFB\u52A1\u8FDB\u884C\u4E2D");
      if (!plan.edits.length && !plan.cover) throw new MetadataError("verification", "\u6CA1\u6709\u9009\u4E2D\u53EF\u5199\u53D8\u66F4");
      for (const edit of plan.edits) edit.after = normalizeWriteFields(edit.after);
      this.busy = true;
      this.seriesId = plan.seriesId;
      const result = { status: "error", outcomes: [], snapshots: [], covers: [] };
      try {
        const fresh = await this.client.state(plan.seriesId, signal);
        for (const e of plan.edits) {
          if (e.target.kind === "books" && !fresh.books.some((b) => b.id === e.target.id)) throw new MetadataError("conflict", "\u4E66\u7C4D\u5F52\u5C5E\u5DF2\u53D8\u5316");
          await this.metadataGuard(e, signal);
        }
        if (plan.cover) {
          const cover = plan.cover;
          if (cover.target.kind === "books" && !fresh.books.some((b) => b.id === cover.target.id)) throw new MetadataError("conflict", "\u5C01\u9762\u4E66\u7C4D\u5F52\u5C5E\u5DF2\u53D8\u5316");
          const metadata2 = await this.client.read(cover.target, signal);
          if (metadata2.thumbnailLock || fresh.series.metadata.thumbnailLock) throw new MetadataError("conflict", "\u5C01\u9762\u5DF2\u9501\u5B9A");
          if (!cover.prepared || cover.prepared.url !== cover.source.url) throw new MetadataError("verification", "\u8BF7\u5148\u751F\u6210\u5C01\u9762\u9884\u89C8");
          await this.coverGuard(cover, signal);
          await this.verifySharedCover(cover.sharedSeries, cover.beforeHash, signal);
        }
        for (const e of plan.edits) {
          try {
            cancelled(signal);
            await this.metadataGuard(e, signal);
            result.snapshots.push({ target: e.target, before: structuredClone(e.before), after: structuredClone(e.after) });
            await this.client.patch(e.target, e.after, signal);
            const readback = await this.client.read(e.target, signal);
            for (const field of Object.keys(e.after)) if (!equal(readback[field], e.after[field])) throw new MetadataError("verification", `${field} \u5199\u5165\u8BFB\u56DE\u4E0D\u7B26`);
            outcome(result, e.target, "metadata");
          } catch (error) {
            outcome(result, e.target, "metadata", error);
            if (signal.aborted) break;
          }
        }
        if (plan.cover) {
          const edit = plan.cover;
          let own;
          try {
            cancelled(signal);
            const old = await this.client.read(edit.target, signal), series2 = await this.client.read({ kind: "series", id: plan.seriesId }, signal);
            if (old.thumbnailLock || series2.thumbnailLock) throw new MetadataError("conflict", "\u5C01\u9762\u5DF2\u9501\u5B9A");
            await this.coverGuard(edit, signal);
            const prepared = edit.prepared;
            const expected = prepared.hash;
            const existingIds = new Set((await this.client.thumbnails(edit.target, signal)).map((t) => t.id));
            const receipt = await this.client.upload(edit.target, prepared.blob, signal);
            if (existingIds.has(receipt)) throw new MetadataError("verification", "\u4E0A\u4F20\u8FD4\u56DE\u4E86\u5DF2\u6709\u5C01\u9762 ID\uFF1B\u4E0D\u6E05\u7406\u5DF2\u6709\u5C01\u9762");
            own = receipt;
            if (await hash(await this.client.thumbnail(edit.target, own, signal)) !== expected) throw new MetadataError("verification", "\u4E0A\u4F20\u5C01\u9762\u5185\u5BB9\u8BFB\u56DE\u4E0D\u7B26");
            await this.coverGuard(edit, signal);
            await this.client.select(edit.target, own, signal);
            const selected = (await this.client.thumbnails(edit.target, signal)).find((t) => t.selected);
            if (selected?.id !== own || await hash(await this.client.thumbnail(edit.target, own, signal)) !== expected) throw new MetadataError("verification", "\u5C01\u9762\u9009\u62E9\u8BFB\u56DE\u4E0D\u7B26");
            await this.verifySharedCover(edit.sharedSeries, expected, signal);
            result.covers.push({ target: edit.target, previous: edit.beforeSelected, previousHash: edit.beforeHash, uploaded: own, uploadedHash: expected, sharedSeries: edit.sharedSeries });
            outcome(result, edit.target, "cover");
          } catch (error) {
            let message = error instanceof Error ? error.message : String(error);
            if (own) {
              const cleanup = new AbortController();
              const timer = setTimeout(() => cleanup.abort(), 1e4);
              try {
                const selected = (await this.client.thumbnails(edit.target, cleanup.signal)).find((t) => t.selected);
                if (selected?.id === own && edit.beforeSelected) {
                  if (await hash(await this.client.thumbnail(edit.target, edit.beforeSelected, cleanup.signal)) !== edit.beforeHash) throw new MetadataError("conflict", "\u539F\u5C01\u9762\u5185\u5BB9\u53D8\u5316\uFF0C\u672A\u6062\u590D\u9009\u62E9");
                  await this.client.select(edit.target, edit.beforeSelected, cleanup.signal);
                }
                await this.client.remove(edit.target, own, cleanup.signal);
              } catch (cleanupError) {
                message += `\uFF1B\u81EA\u8EAB\u5C01\u9762\u6E05\u7406\u5931\u8D25\uFF1A${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`;
              } finally {
                clearTimeout(timer);
              }
            }
            outcome(result, edit.target, "cover", new Error(message));
          }
        }
        return finish(result);
      } finally {
        this.busy = false;
      }
    }
    async undo(previous, seriesId, signal) {
      if (this.busy) throw new MetadataError("unavailable", "\u5199\u5165\u4EFB\u52A1\u8FDB\u884C\u4E2D");
      this.busy = true;
      const result = { status: "error", outcomes: [], snapshots: [], covers: [] };
      try {
        const state = await this.client.state(seriesId, signal);
        for (const s of previous.snapshots) {
          try {
            if (s.target.kind === "books" && !state.books.some((b) => b.id === s.target.id)) throw new MetadataError("conflict", "\u4E66\u7C4D\u5F52\u5C5E\u53D8\u5316");
            const current = await this.client.read(s.target, signal);
            const series2 = await this.client.read({ kind: "series", id: seriesId }, signal);
            verify(current, s.after);
            for (const field of Object.keys(s.before)) if (current[`${field}Lock`] || series2[`${field}Lock`]) throw new MetadataError("conflict", `${field} \u5DF2\u9501\u5B9A\uFF0C\u4E0D\u80FD\u64A4\u9500`);
            await this.client.patch(s.target, s.before, signal);
            verify(await this.client.read(s.target, signal), s.before);
            outcome(result, s.target, "metadata");
          } catch (error) {
            outcome(result, s.target, "metadata", error);
          }
        }
        for (const s of previous.covers) {
          try {
            if (s.target.kind === "books" && !state.books.some((b) => b.id === s.target.id)) throw new MetadataError("conflict", "\u4E66\u7C4D\u5F52\u5C5E\u53D8\u5316");
            const metadata2 = await this.client.read(s.target, signal);
            const series2 = await this.client.read({ kind: "series", id: seriesId }, signal);
            if (metadata2.thumbnailLock || series2.thumbnailLock) throw new MetadataError("conflict", "\u5C01\u9762\u5DF2\u9501\u5B9A\uFF0C\u4E0D\u80FD\u64A4\u9500");
            const selected = (await this.client.thumbnails(s.target, signal)).find((t) => t.selected);
            if (selected?.id !== s.uploaded || await hash(await this.client.thumbnail(s.target, s.uploaded, signal)) !== s.uploadedHash) throw new MetadataError("conflict", "\u5C01\u9762\u5DF2\u88AB\u5176\u4ED6\u64CD\u4F5C\u4FEE\u6539");
            await this.verifySharedCover(s.sharedSeries, s.uploadedHash, signal);
            if (s.previous) {
              if (await hash(await this.client.thumbnail(s.target, s.previous, signal)) !== s.previousHash) throw new MetadataError("conflict", "\u539F\u5C01\u9762\u5185\u5BB9\u5DF2\u53D8\u5316");
              await this.client.select(s.target, s.previous, signal);
              if ((await this.client.thumbnails(s.target, signal)).find((t) => t.selected)?.id !== s.previous) throw new MetadataError("verification", "\u539F\u5C01\u9762\u9009\u62E9\u8BFB\u56DE\u5931\u8D25");
            }
            await this.client.remove(s.target, s.uploaded, signal);
            if ((await this.client.thumbnails(s.target, signal)).some((t) => t.id === s.uploaded)) throw new MetadataError("verification", "\u81EA\u8EAB\u4E0A\u4F20\u5C01\u9762\u5220\u9664\u8BFB\u56DE\u5931\u8D25");
            await this.verifySharedCover(s.sharedSeries, s.previousHash, signal);
            outcome(result, s.target, "cover");
          } catch (error) {
            outcome(result, s.target, "cover", error);
          }
        }
        return finish(result);
      } finally {
        this.busy = false;
      }
    }
  };

  // src/ui-style.ts
  var panelStyle = `
:host{font:13px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans",system-ui,sans-serif;--bg:#fff;--surface:#f7f8fa;--hover:#eef0f4;--text:#20232b;--muted:#697180;--line:#e4e7ed;--accent:#4f46e5;--tint:#eeedff;--danger:#b42336;--positive:#14804a;color:var(--text);color-scheme:light}
:host([data-theme=dark]){--bg:#1b1d23;--surface:#14161b;--hover:#282b34;--text:#e9eaf0;--muted:#a2a8b7;--line:#353944;--accent:#a6a0ff;--tint:#302d49;--danger:#ff8b98;--positive:#69d6a0;color-scheme:dark}
*{box-sizing:border-box} [hidden]{display:none!important}
.dialog{pointer-events:auto;position:fixed;inset:0;margin:auto;width:min(1120px,calc(100vw - 48px));height:min(820px,calc(100dvh - 64px));max-width:none;max-height:none;padding:0;border:1px solid var(--line);border-radius:16px;background:var(--bg);color:var(--text);box-shadow:0 24px 80px #0005;font:inherit;overflow:hidden}
.dialog[open]{display:flex;flex-direction:column}.dialog::backdrop{background:#10131d66;backdrop-filter:blur(3px)}
.header{display:flex;align-items:center;gap:12px;padding:20px 24px 16px;flex-shrink:0}.brand{display:grid;place-items:center;width:40px;height:40px;border-radius:12px;background:var(--tint);color:var(--accent)}
.heading{min-width:0;flex:1}.heading h2{margin:0;font-size:17px;font-weight:650;letter-spacing:-.3px}.context{color:var(--muted);font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:65vw}.header-actions{display:flex;gap:6px}
svg{width:18px;height:18px;flex-shrink:0;vertical-align:middle}button,input,select,textarea{font:inherit;color:inherit}button{display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:36px;border:1px solid var(--line);border-radius:8px;background:var(--bg);padding:7px 12px;cursor:pointer;font-weight:550;transition:background .12s,border-color .12s;white-space:nowrap}button:hover:not(:disabled){background:var(--hover);border-color:var(--muted)}button:disabled{opacity:.42;cursor:not-allowed}.primary{background:var(--accent);border-color:var(--accent);color:#fff}:host([data-theme=dark]) .primary{color:#191627}.primary:hover:not(:disabled){background:var(--accent);filter:brightness(.93)}.ghost{border-color:transparent;background:transparent;color:var(--muted)}.icon-button{width:34px;padding:7px;min-height:34px}.subtle{font-weight:500;color:var(--muted)}
:focus-visible{outline:2px solid var(--accent);outline-offset:3px}input:not([type=checkbox]),select,textarea{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:8px 10px;min-width:0;max-width:100%;outline-offset:1px}input::placeholder,textarea::placeholder{color:var(--muted)}select{height:38px;text-overflow:ellipsis}input[type=checkbox]{width:15px;height:15px;accent-color:var(--accent);margin:0;flex-shrink:0;cursor:pointer}label{cursor:pointer}label:has(input[type=password]){cursor:default}
.tabs{display:flex;gap:22px;border-bottom:1px solid var(--line);padding:0 24px;flex-shrink:0}.tabs button{border:0;border-bottom:2px solid transparent;border-radius:0;background:transparent;color:var(--muted);padding:10px 0 12px;font-size:13px}.tabs button[aria-selected=true]{color:var(--text);border-bottom-color:var(--accent)}
.viewport{flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;background:var(--surface);scrollbar-width:thin;scrollbar-color:var(--line) transparent}.tab-panel{padding:22px 24px;min-height:100%}.workspace{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr);gap:20px;align-items:start}.card{min-width:0;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:18px}.section-title{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px}.section-title h3{margin:0;font-size:14px;font-weight:650}.section-title select{font-size:12px;height:32px;padding:4px 8px}
h3{font-size:14px;font-weight:600;margin:0 0 10px}p{margin:8px 0;overflow-wrap:anywhere}pre{margin:10px 0;white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;font-size:13px;line-height:1.75;color:var(--muted)}.search-row{display:flex;gap:8px}.search-row input{width:100%;flex:1}.source-toggles{display:flex;flex-wrap:wrap;gap:6px;margin:12px 0 16px}.source-toggles label{display:flex;align-items:center;gap:6px;padding:4px 8px;border:1px solid var(--line);border-radius:6px;color:var(--muted);font-size:11px;transition:background .12s}.source-toggles label:has(:checked){background:var(--tint);border-color:var(--tint);color:var(--accent)}.source-toggles input{width:12px;height:12px}.direct-row{display:grid;grid-template-columns:115px minmax(0,1fr) auto;gap:8px}.direct-row input{width:100%}
details{margin-top:14px}summary{cursor:pointer;color:var(--muted);font-size:12px;padding:8px 0;user-select:none}details[open]>summary{margin-bottom:8px}.results{margin-top:18px;padding-top:16px;border-top:1px solid var(--line);min-height:230px}.results:empty::before{content:'\u641C\u7D22\u4F5C\u54C1\uFF0C\u9009\u62E9\u5339\u914D\u7684\u6761\u76EE';display:block;text-align:center;padding:64px 8px;color:var(--muted);font-size:13px}.result-group{margin:0 0 12px;border:1px solid var(--line);border-radius:10px;overflow:hidden}.result-group>summary{display:flex;align-items:center;gap:8px;list-style:none;padding:11px 12px;margin:0!important;color:var(--text);font-size:13px;font-weight:600;background:var(--surface)}.result-group>summary::-webkit-details-marker{display:none}.result-group>summary::before{content:'\u203A';font-size:20px;line-height:1;transition:transform .12s}.result-group[open]>summary::before{transform:rotate(90deg)}.result-count{margin-left:auto;color:var(--muted);font-size:11px;font-weight:400}.result-group>p{padding:0 12px;color:var(--muted);font-size:12px}.candidate-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(115px,1fr));gap:10px;padding:12px;max-height:460px;overflow:auto;scrollbar-width:thin}.candidate-grid:empty{display:none}.candidate{display:flex;flex-direction:column;justify-content:flex-start;align-items:stretch;width:100%;height:100%;min-width:0;padding:7px;margin:0;text-align:left;white-space:normal;line-height:1.45;font-weight:500;gap:8px}.candidate[aria-pressed=true]{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent);background:var(--tint)}.candidate-title{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere;font-size:12px;min-height:2.9em}.cover-thumb{display:flex;align-items:center;justify-content:center;aspect-ratio:2/3;width:100%;min-width:0;background:var(--surface);border-radius:5px;overflow:hidden;color:var(--muted);font-size:11px;font-weight:400}.cover-thumb img{display:block;width:100%;height:100%;object-fit:contain}.cover-thumb[data-state=pending]::before{content:'';width:18px;height:18px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:km-spin .7s linear infinite}.selected-record:empty{display:none}.selected-record:not(:empty){border-bottom:1px solid var(--line);padding-bottom:14px;margin-bottom:16px}.selected-record>h3{font-size:16px;line-height:1.6}.record-url{font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.record-meta{font-size:12px;color:var(--muted)}.record-summary{max-height:210px;overflow:auto;scrollbar-width:thin}.volumes button{display:flex;width:100%;white-space:normal;text-align:left;justify-content:flex-start;margin:5px 0;font-size:12px}
.field-label{display:grid;gap:6px;color:var(--muted);font-size:12px;margin-bottom:12px}.field-label select{width:100%;color:var(--text);font-size:13px}.field-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px 6px;padding:12px 0 16px}.field-grid label,.check-label{display:flex;align-items:center;gap:7px;font-size:12px;line-height:1.5;min-height:28px}.field-grid label:first-child{grid-column:span 2}.field-caption{font-size:12px;font-weight:600;border-top:1px solid var(--line);padding-top:16px;margin-top:16px}.hint{font-size:11px;color:var(--muted);margin:8px 0 0}
.footer{display:flex;align-items:center;gap:10px;padding:14px 24px;border-top:1px solid var(--line);background:var(--bg);flex-shrink:0}.status{flex:1;min-width:0;font-size:12px;color:var(--muted);margin:0;max-height:90px;overflow:auto}.status[data-state=error]{color:var(--danger)}.status[data-state=busy]::before{content:'';display:inline-block;width:15px;height:15px;border:2px solid var(--line);border-top-color:var(--accent);border-radius:50%;animation:km-spin .7s linear infinite;vertical-align:middle}.status[data-state=success]{color:var(--positive);font-size:0}.status[data-state=success]::before{content:'\u2713';font-size:22px}.footer-actions{display:flex;gap:8px;align-items:center}.cancel-action[hidden]{display:none}
.preview:empty{display:none}.preview-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px}.preview-head h3{font-size:18px;margin:0}.target-heading{font-size:12px;color:var(--muted);margin:20px 0 10px}.row{border:1px solid var(--line);border-radius:10px;background:var(--bg);padding:14px;margin:10px 0}.row>label{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:600;margin-bottom:10px}.diff{display:grid;grid-template-columns:1fr 1fr;gap:14px}.diff-caption{font-size:10px;color:var(--muted);margin-bottom:5px}.diff pre{margin:0;padding:10px;background:var(--surface);border-radius:7px;font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace;max-height:180px;overflow:auto}.diff textarea{display:block;width:100%;min-height:92px;resize:vertical;font:12px/1.6 ui-monospace,SFMono-Regular,Consolas,monospace}.row:has(input[data-field]:not(:checked)){opacity:.55}
.settings-card{max-width:660px;margin:0 auto}.settings-card>summary{font-size:15px;color:var(--text);font-weight:600}.settings-card>label:has(input[type=password]){display:grid;gap:5px;font-size:12px;margin:14px 0;color:var(--muted)}.settings-card input[type=password]{width:100%;color:var(--text)}.settings-card>label:has(input[type=checkbox]){display:flex;align-items:center;gap:8px;margin:18px 0}
section[data-km-catalog]{max-width:800px;margin:0 auto;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:22px}section[data-km-catalog]>h3{font-size:16px;margin-bottom:18px}section[data-km-catalog]>[role=status]{font-size:12px;color:var(--muted);padding:10px 0}section[data-km-catalog] input[type=file]{display:block;width:100%;padding:14px;background:var(--surface);border:1px dashed var(--line);border-radius:10px;color:var(--muted);font-size:12px}input[type=file]::file-selector-button{font:inherit;border:1px solid var(--line);padding:7px 10px;border-radius:6px;background:var(--bg);color:var(--text);margin-right:12px;cursor:pointer}section[data-km-catalog] details{border-top:1px solid var(--line);padding-top:10px}section[data-km-catalog] details button,section[data-km-catalog] details input,section[data-km-catalog] details select{margin:4px 4px 4px 0}section[data-km-catalog] details input[type=url]{display:block;width:100%;margin-top:16px}section[data-km-catalog] details p{font-size:12px;color:var(--muted)}section[data-km-catalog] a{color:var(--accent);text-decoration:none;font-size:12px;line-height:2}section[data-km-catalog] a:hover{text-decoration:underline}section[data-km-catalog] details>select{display:block;width:100%;margin-top:14px}section[data-km-catalog] details>div:last-child{border-top:1px solid var(--line);margin-top:18px;padding-top:12px}
.cover-preview{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:16px;margin-bottom:20px}.cover-preview>h3{font-size:13px;margin-bottom:14px}.cover-compare{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px}.cover-compare figure{margin:0;min-width:0}.cover-compare figcaption{font-size:12px;font-weight:600;margin-bottom:8px;color:var(--muted)}.cover-compare figure:last-child figcaption{color:var(--accent)}.cover-frame{height:min(38vh,330px);display:flex;align-items:center;justify-content:center;background:var(--surface);border:1px solid var(--line);border-radius:8px;overflow:hidden;color:var(--muted);font-size:12px}.cover-frame img{display:block;width:100%;height:100%;object-fit:contain}
.search-progress{margin-top:16px;display:grid;gap:7px;font-size:12px;color:var(--muted)}.search-progress progress{width:100%;height:7px;border:0;border-radius:4px;overflow:hidden;accent-color:var(--accent)}.search-progress progress::-webkit-progress-bar{background:var(--line)}.search-progress progress::-webkit-progress-value{background:var(--accent)}.result-group[data-state=error] .result-count{color:var(--danger)}.selected-source{display:flex;align-items:center;gap:8px;margin:6px 0;font-size:12px}.selected-source>span{flex:1;min-width:0;overflow-wrap:anywhere}.selected-source button{padding:4px 7px;font-size:11px}.merge-rules{border-top:1px solid var(--line);margin:12px 0;padding-top:4px}.merge-rules>p{font-size:12px;color:var(--muted)}.merge-rules .field-label{grid-template-columns:90px minmax(0,1fr);align-items:center}
.field-compose{display:grid;grid-template-columns:110px minmax(0,1fr);gap:8px;margin:10px 0}.field-source-picks{grid-column:1/-1}.field-source-picks label{display:flex;align-items:flex-start;gap:8px;margin-top:8px;overflow-wrap:anywhere;font-size:12px;line-height:1.5}.field-source-picks input{flex-shrink:0}.language-options p{font-size:12px;color:var(--muted);line-height:1.6}.language-options .field-grid{margin:12px 0}
@keyframes km-spin{to{transform:rotate(360deg)}}
@media(max-width:820px){.dialog{width:calc(100vw - 24px);height:calc(100dvh - 24px);border-radius:12px}.workspace{grid-template-columns:1fr}.tab-panel{padding:16px}.header{padding:16px}.tabs{padding:0 16px}.footer{padding:12px 16px;flex-wrap:wrap}.status{flex-basis:100%}.footer-actions{margin-left:auto}.direct-row{grid-template-columns:95px minmax(0,1fr) auto}.diff{grid-template-columns:1fr}.context{max-width:55vw}}
@media(prefers-reduced-motion:reduce){*,*::before{transition:none!important;animation-duration:1.5s!important}.dialog{transition:none!important}}
`;
  function icon(name) {
    const paths = {
      layers: ["m12 3 9 5-9 5-9-5 9-5Z", "m3 12 9 5 9-5", "m3 16 9 5 9-5"],
      close: ["m6 6 12 12", "M18 6 6 18"],
      sun: ["M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42", "M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0"],
      search: ["M19 11a8 8 0 1 1-16 0 8 8 0 0 1 16 0", "m17 17 4 4"],
      database: ["M20 6c0 2-3.6 3-8 3S4 8 4 6s3.6-3 8-3 8 1 8 3Z", "M4 6v12c0 2 3.6 3 8 3s8-1 8-3V6", "M4 12c0 2 3.6 3 8 3s8-1 8-3"],
      settings: ["M4 7h16M4 17h16", "M8 4v6M16 14v6"],
      back: ["m12 5-7 7 7 7", "M5 12h15"]
    };
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    for (const [k, v] of Object.entries({ viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": "1.7", "stroke-linecap": "round", "stroke-linejoin": "round", "aria-hidden": "true" })) svg.setAttribute(k, v);
    for (const d of paths[name]) {
      const path = document.createElementNS(svg.namespaceURI, "path");
      path.setAttribute("d", d);
      svg.append(path);
    }
    return svg;
  }

  // src/thumbnails.ts
  var Thumbnails = class {
    constructor(root, download2) {
      this.download = download2;
      this.observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          const job = this.jobs.get(entry.target);
          if (entry.isIntersecting && job && !job.started && !job.queued) {
            job.queued = true;
            this.queue.push(job);
          }
        }
        this.pump();
      }, { root, rootMargin: "100px 0px" });
    }
    controller = new AbortController();
    signal = this.controller.signal;
    observer;
    jobs = /* @__PURE__ */ new Map();
    queue = [];
    active = 0;
    urls = /* @__PURE__ */ new Set();
    cache = /* @__PURE__ */ new Map();
    add(title, resolve) {
      const frame = document.createElement("span");
      frame.className = "cover-thumb";
      frame.dataset.state = "pending";
      frame.setAttribute("aria-label", "\u52A0\u8F7D\u5C01\u9762");
      this.jobs.set(frame, { frame, title, resolve, queued: false, started: false });
      this.observer.observe(frame);
      return frame;
    }
    pump() {
      while (!this.signal.aborted && this.active < 3 && this.queue.length) {
        const job = this.queue.shift();
        job.queued = false;
        if (!job.frame.isConnected || !job.frame.getClientRects().length) continue;
        job.started = true;
        this.active++;
        this.observer.unobserve(job.frame);
        void this.load(job).finally(() => {
          this.active--;
          this.pump();
        });
      }
    }
    async load(job) {
      try {
        const source = await job.resolve();
        cancelled(this.signal);
        if (!source) {
          job.frame.dataset.state = "empty";
          job.frame.textContent = "\u6682\u65E0\u5C01\u9762";
          job.frame.setAttribute("aria-label", "\u6682\u65E0\u5C01\u9762");
          return;
        }
        let pending = this.cache.get(source);
        if (!pending) {
          pending = this.download(source, this.signal).then((blob) => {
            cancelled(this.signal);
            const url3 = URL.createObjectURL(blob);
            this.urls.add(url3);
            return url3;
          });
          this.cache.set(source, pending);
        }
        const url2 = await pending;
        cancelled(this.signal);
        const image2 = new Image();
        image2.alt = `${job.title} \xB7 \u5C01\u9762`;
        image2.src = url2;
        await image2.decode();
        cancelled(this.signal);
        job.frame.replaceChildren(image2);
        job.frame.dataset.state = "ready";
        job.frame.removeAttribute("aria-label");
      } catch (error) {
        if (this.signal.aborted) return;
        job.frame.dataset.state = "error";
        job.frame.textContent = "\u5C01\u9762\u52A0\u8F7D\u5931\u8D25";
        job.frame.setAttribute("aria-label", "\u5C01\u9762\u52A0\u8F7D\u5931\u8D25");
        job.frame.title = error instanceof Error ? error.message : String(error);
      }
    }
    dispose() {
      for (const { frame } of this.jobs.values()) if (frame.dataset.state === "pending") {
        frame.dataset.state = "empty";
        frame.textContent = "\u672A\u52A0\u8F7D";
        frame.setAttribute("aria-label", "\u672A\u52A0\u8F7D");
      }
      this.controller.abort();
      this.observer.disconnect();
      this.queue.length = 0;
      this.jobs.clear();
      this.cache.clear();
      for (const url2 of this.urls) URL.revokeObjectURL(url2);
      this.urls.clear();
    }
  };

  // src/search.ts
  async function searchPreferred(online, offline, query, context, phase = () => {
  }) {
    let note;
    if (offline && offline.available?.() !== false) {
      phase("\u672C\u5730\u68C0\u7D22");
      try {
        const candidates2 = await offline.search(query, context);
        cancelled(context.signal);
        if (candidates2.length || !online) return { provider: offline, candidates: candidates2, mode: "\u672C\u5730" };
        note = "\u672C\u5730\u65E0\u5339\u914D\uFF0C\u5DF2\u67E5\u8BE2\u5728\u7EBF";
      } catch (error) {
        cancelled(context.signal);
        if (!online) throw error;
        note = `\u672C\u5730\u67E5\u8BE2\u5931\u8D25\uFF0C\u5DF2\u67E5\u8BE2\u5728\u7EBF\uFF1A${error instanceof Error ? error.message : String(error)}`;
      }
    }
    cancelled(context.signal);
    if (!online) throw new MetadataError("unavailable", "\u8BF7\u5148\u5728\u300C\u672C\u5730\u6570\u636E\u5E93\u300D\u52A0\u8F7D\u6B64\u6765\u6E90\u7684\u76EE\u5F55");
    phase(note ? "\u5728\u7EBF\u515C\u5E95" : "\u5728\u7EBF\u68C0\u7D22");
    const candidates = await online.search(query, context);
    cancelled(context.signal);
    return { provider: online, candidates, mode: "\u5728\u7EBF", note };
  }

  // src/languages.ts
  var allLanguages = ["en", "ja", "zh", "romaji", "unknown", "other"];
  function wantsChineseTags(languages) {
    return languages.includes("zh");
  }
  var languageLabels = { en: "\u82F1\u6587 EN", ja: "\u65E5\u6587 JP", zh: "\u4E2D\u6587 ZH / CH", romaji: "\u7F57\u9A6C\u5B57 Romaji", unknown: "\u672A\u6807\u6CE8", other: "\u5176\u4ED6\u8BED\u8A00" };
  function languageOf(text2, explicit) {
    const code = explicit?.trim().toLowerCase().replace(/_/g, "-");
    if (code && /^(romaji|ja-latn|ja-ro|jp-ro|romanized|romanised)$/.test(code)) return "romaji";
    if (code && /^(ja|jp|jpn|japanese)(-|$)/.test(code)) return "ja";
    if (code && /^(zh|ch|zho|chi|chinese)(-|$)/.test(code)) return "zh";
    if (code && /^(en|eng|english)(-|$)/.test(code)) return "en";
    if (code && !["und", "unknown", "zxx"].includes(code)) return "other";
    return /[\u3040-\u30ff]/u.test(text2) ? "ja" : "unknown";
  }
  function accepted(text2, code, languages) {
    return languages.includes(languageOf(text2, code));
  }
  function acceptedTitles(r, languages) {
    return r.titles.filter((t) => accepted(t.text, t.language, languages)).sort((a, b) => Number(b.type === "native") - Number(a.type === "native"));
  }
  function languageFields(r, languages) {
    const values = mappedFields(r), titles2 = acceptedTitles(r, languages);
    values.title = (titles2.find((t) => t.type === "native") ?? titles2[0])?.text;
    values.alternateTitles = titles2.map((t) => ({ title: t.text, label: t.language || t.type }));
    if (r.summary && !accepted(r.summary, r.summaryLanguage, languages)) values.summary = void 0;
    if (r.publisher && !accepted(r.publisher, void 0, languages)) values.publisher = void 0;
    values.tags = r.provider === "ehentai" ? wantsChineseTags(languages) ? r.translatedTags ?? r.tags : r.tags : r.tags.filter((t) => accepted(t, void 0, languages));
    values.genres = r.genres.filter((t) => accepted(t, void 0, languages));
    values.authors = r.authors.flatMap((a) => {
      const names = [[a.native, a.nativeLanguage], [a.name, a.language], [a.localized, a.localizedLanguage]];
      const name = names.find(([text2, lang]) => text2 && accepted(text2, lang, languages))?.[0];
      return name ? [{ name, role: a.role }] : [];
    });
    return normalizeWriteFields(values);
  }

  // src/merge.ts
  var mergeFields = [.../* @__PURE__ */ new Set([...seriesFields, ...bookFields])];
  var sourceKey = (r) => `${r.provider}:${r.id}`;
  function present(v) {
    return v !== void 0 && v !== null && v !== "" && (!Array.isArray(v) || v.length > 0);
  }
  function union(field, values) {
    const result = [];
    const same = (a, b) => {
      if (field === "links" && a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) return a.url === b.url;
      return equal(a, b);
    };
    for (const value of values) if (Array.isArray(value)) {
      for (const item of value) if (!result.some((old) => same(old, item))) result.push(item);
    }
    return result;
  }
  function canMergeField(field, value) {
    return Array.isArray(value) || ["title", "summary", "publisher"].includes(field);
  }
  function combineField(field, values) {
    if (!values.length) return void 0;
    if (!canMergeField(field, values[0])) throw new MetadataError("verification", "\u6B64\u5B57\u6BB5\u53EA\u80FD\u4FDD\u5B58\u5355\u503C");
    if (Array.isArray(values[0])) return union(field, values);
    return [...new Set(values.filter((v) => typeof v === "string").map((v) => v.trim()).filter(Boolean))].join(field === "summary" ? "\n\n" : " / ");
  }
  function mergeRecords(records, choices = {}, languages = allLanguages) {
    if (!records.length) throw new MetadataError("verification", "\u5148\u9009\u62E9\u5019\u9009");
    if (new Set(records.map(isVolumeRecord)).size > 1) throw new MetadataError("verification", "\u4E0D\u80FD\u628A\u6574\u90E8\u4F5C\u54C1\u548C\u5355\u5377\u6761\u76EE\u6DF7\u5408\uFF1B\u8BF7\u5148\u79FB\u9664\u4E0D\u540C\u5C42\u7EA7\u7684\u6761\u76EE");
    if (new Set(records.map((r) => r.volume).filter((v) => v !== void 0)).size > 1) throw new MetadataError("verification", "\u9009\u4E2D\u4E86\u4E0D\u540C\u5377\u53F7\uFF0C\u4E0D\u80FD\u5408\u5E76\u5230\u540C\u4E00\u672C\u4E66");
    const mapped = records.map((r) => ({ r, value: languageFields(r, languages) }));
    const values = {}, used = {}, options = {};
    for (const field of mergeFields) {
      const entries = field === "title" ? records.flatMap((r) => acceptedTitles(r, languages).map((t, i) => ({ key: `${sourceKey(r)}#title${i}`, provider: r.provider, label: `${r.provider} \xB7 ${r.id} \xB7 ${languageOf(t.text, t.language)} \xB7 ${t.text}`, value: t.text }))) : mapped.filter((x) => present(x.value[field])).map((x) => ({ key: sourceKey(x.r), provider: x.r.provider, label: `${x.r.provider} \xB7 ${x.r.id} \xB7 ${nativeTitle(x.r)}`, value: x.value[field] }));
      options[field] = entries;
      if (!entries.length) continue;
      const chosen = entries.find((e) => e.key === choices[field]);
      if (chosen) {
        values[field] = chosen.value;
        used[field] = [chosen.provider];
      } else if (Array.isArray(entries[0].value)) {
        values[field] = union(field, entries.map((e) => e.value));
        used[field] = [...new Set(entries.map((e) => e.provider))];
      } else {
        values[field] = entries[0].value;
        used[field] = [entries[0].provider];
      }
    }
    const covers = [];
    for (const r of records) for (const cover of r.covers) if (accepted("", cover.language, languages) && !covers.some((c) => c.cover.url === cover.url)) covers.push({ cover, provider: r.provider });
    return { record: { ...records[0], covers: covers.map((c) => c.cover) }, values, used, options, covers };
  }

  // src/eh-tag-translation.ts
  var dictionaryUrl = "https://github.com/EhTagTranslation/Database/releases/latest/download/db.text.json";
  var dictionaryKey = "eh-tag-dictionary-v1";
  var ttl = 24 * 60 * 60 * 1e3;
  var compactNamespaces = /* @__PURE__ */ new Set(["female", "male", "mixed", "location", "other", "tag"]);
  var key = (s) => s.trim().toLowerCase();
  function object(v) {
    return Boolean(v && typeof v === "object" && !Array.isArray(v));
  }
  function parseDictionary(text2) {
    if (text2.length > 32 * 1024 * 1024) throw new MetadataError("invalid-response", "\u6807\u7B7E\u8BCD\u5E93\u8FC7\u5927");
    let db;
    try {
      db = JSON.parse(text2);
    } catch {
      throw new MetadataError("invalid-response", "\u6807\u7B7E\u8BCD\u5E93\u4E0D\u662F\u6709\u6548 JSON");
    }
    if (!object(db) || !Array.isArray(db.data)) throw new MetadataError("invalid-response", "\u6807\u7B7E\u8BCD\u5E93\u7ED3\u6784\u4E0D\u7B26");
    const names = /* @__PURE__ */ Object.create(null);
    for (const group of db.data) {
      if (!object(group) || typeof group.namespace !== "string" || !object(group.data)) throw new MetadataError("invalid-response", "\u6807\u7B7E\u8BCD\u5E93\u5206\u533A\u4E0D\u7B26");
      const ns = key(group.namespace), entries = /* @__PURE__ */ Object.create(null);
      for (const [tag, info] of Object.entries(group.data)) {
        if (object(info) && typeof info.name === "string" && info.name.trim()) entries[key(tag)] = info.name.trim();
      }
      if (ns && Object.keys(entries).length) names[ns] = entries;
    }
    if (!Object.keys(names).length) throw new MetadataError("invalid-response", "\u6807\u7B7E\u8BCD\u5E93\u4E3A\u7A7A");
    const head = object(db.head) ? db.head : {};
    return { names, revision: typeof head.sha === "string" ? head.sha : `schema-${String(db.version ?? "unknown")}` };
  }
  function validCache(v) {
    return object(v) && v.format === 1 && typeof v.checkedAt === "number" && Number.isFinite(v.checkedAt) && typeof v.revision === "string" && object(v.names) && Object.keys(v.names).length > 0 && Object.values(v.names).every((g) => object(g) && Object.values(g).every((n) => typeof n === "string" && n.trim()));
  }
  var EhTagTranslation = class {
    constructor(transport, store = storage, now = Date.now) {
      this.transport = transport;
      this.store = store;
      this.now = now;
    }
    cache;
    async load(signal) {
      cancelled(signal);
      if (!this.cache) {
        const saved = this.store.get(dictionaryKey, void 0);
        if (validCache(saved)) this.cache = saved;
      }
      if (this.cache && this.now() - this.cache.checkedAt >= 0 && this.now() - this.cache.checkedAt < ttl) return { revision: this.cache.revision };
      try {
        const response = await this.transport.request({ url: dictionaryUrl }, signal);
        cancelled(signal);
        if (response.status < 200 || response.status >= 300) throw new MetadataError("http", `\u6807\u7B7E\u8BCD\u5E93 HTTP ${response.status}`);
        const parsed = parseDictionary(response.text), next = { format: 1, checkedAt: this.now(), ...parsed };
        cancelled(signal);
        this.cache = next;
        try {
          this.store.set(dictionaryKey, next);
        } catch {
          return { revision: next.revision, warning: "\u8BCD\u5E93\u672A\u80FD\u6301\u4E45\u7F13\u5B58\uFF0C\u672C\u6B21\u4ECD\u53EF\u7FFB\u8BD1" };
        }
        return { revision: next.revision };
      } catch (error) {
        cancelled(signal);
        if (this.cache) return { revision: this.cache.revision, warning: "\u8BCD\u5E93\u66F4\u65B0\u5931\u8D25\uFF0C\u7EE7\u7EED\u4F7F\u7528\u5DF2\u6709\u7F13\u5B58" };
        throw new MetadataError("unavailable", `\u4E2D\u6587\u6807\u7B7E\u8BCD\u5E93\u4E0D\u53EF\u7528\uFF1A${error instanceof Error ? error.message : String(error)}\uFF1B\u53EF\u91CD\u8BD5\uFF0C\u6216\u5728\u8D44\u6599\u8BED\u8A00\u4E2D\u53D6\u6D88\u52FE\u9009\u4E2D\u6587`);
      }
    }
    project(record2, style) {
      const replacements = /* @__PURE__ */ new Map();
      if (record2.provider !== "ehentai") return { record: record2, replacements, matched: 0 };
      if (!this.cache) throw new MetadataError("unavailable", "\u4E2D\u6587\u6807\u7B7E\u8BCD\u5E93\u5C1A\u672A\u52A0\u8F7D");
      let matched = 0;
      const translatedTags = record2.tags.map((raw) => {
        const split = raw.indexOf(":");
        if (split < 1) return raw;
        const ns = key(raw.slice(0, split)), tag = key(raw.slice(split + 1));
        const group = Object.hasOwn(this.cache.names, ns) ? this.cache.names[ns] : void 0;
        const name = group && Object.hasOwn(group, tag) ? group[tag] : void 0;
        if (!name) return raw;
        const text2 = compactNamespaces.has(ns) ? name.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").trim() : name;
        if (!text2) return raw;
        const translated = style === "compact" && compactNamespaces.has(ns) ? text2 : `${ns}:${text2}`;
        replacements.set(key(raw), key(translated));
        matched++;
        return translated;
      });
      return { record: { ...record2, translatedTags }, replacements, matched };
    }
  };
  function translateExisting(values, replacements) {
    return values.map((v) => typeof v === "string" ? replacements.get(key(v)) ?? v : v);
  }

  // src/ui.ts
  var labels = { title: "\u6807\u9898\uFF08\u9ED8\u8BA4\u4E0D\u6539\uFF09", summary: "\u7B80\u4ECB", publisher: "\u51FA\u7248\u793E", language: "\u8BED\u8A00", status: "\u72B6\u6001", ageRating: "\u5E74\u9F84", tags: "\u6807\u7B7E", genres: "\u7C7B\u578B", links: "\u94FE\u63A5", alternateTitles: "\u522B\u540D", authors: "\u4F5C\u8005", releaseDate: "\u53D1\u884C\u65E5", isbn: "ISBN" };
  function element(tag, text2) {
    const e = document.createElement(tag);
    if (text2 !== void 0) e.textContent = text2;
    return e;
  }
  function button(text2, action) {
    const e = element("button", text2);
    e.type = "button";
    e.addEventListener("click", action);
    return e;
  }
  function input(label, parent, type = "text") {
    const l = element("label", label), i = element("input");
    i.type = type;
    i.setAttribute("aria-label", label);
    if (type === "checkbox") l.prepend(i);
    else l.append(i);
    parent.append(l);
    return i;
  }
  function option(select, value, name) {
    const e = element("option", name);
    e.value = value;
    select.append(e);
  }
  function validateValue(field, value) {
    if (["tags", "genres", "alternateTitles", "links", "authors"].includes(field)) {
      if (!Array.isArray(value) || value.length > 1e3) throw new MetadataError("verification", "\u6570\u7EC4\u683C\u5F0F\u4E0D\u7B26");
      if (field === "tags" || field === "genres") {
        if (!value.every((v) => typeof v === "string" && v.trim())) throw new MetadataError("verification", "\u6807\u7B7E\u5E94\u4E3A\u975E\u7A7A\u5B57\u7B26\u4E32\u6570\u7EC4");
      } else for (const item of value) {
        if (!item || typeof item !== "object") throw new MetadataError("verification", "\u6570\u7EC4\u5BF9\u8C61\u683C\u5F0F\u4E0D\u7B26");
        const keys = field === "links" ? ["label", "url"] : field === "authors" ? ["name", "role"] : ["title", "label"];
        for (const k of keys) if (typeof item[k] !== "string" || !item[k].trim()) throw new MetadataError("verification", "\u6570\u7EC4\u5BF9\u8C61\u7F3A\u5C11\u5B57\u6BB5");
        if (Object.keys(item).some((k) => !keys.includes(k))) throw new MetadataError("verification", "\u6570\u7EC4\u5BF9\u8C61\u542B\u672A\u77E5\u5B57\u6BB5");
        if (field === "links") {
          const u = new URL(item.url);
          if (!["http:", "https:"].includes(u.protocol) || u.username || u.password) throw new MetadataError("verification", "\u94FE\u63A5\u5FC5\u987B\u4E3A HTTP(S)");
        }
      }
      return value;
    }
    if (field === "ageRating") {
      if (typeof value !== "number" || !Number.isInteger(value) || value < 0) throw new MetadataError("verification", "\u5E74\u9F84\u5FC5\u987B\u4E3A\u975E\u8D1F\u6574\u6570");
    } else {
      if (typeof value !== "string") throw new MetadataError("verification", "\u5B57\u6BB5\u5FC5\u987B\u4E3A\u5B57\u7B26\u4E32");
      if (field === "title" && !value.trim()) throw new MetadataError("verification", "\u6807\u9898\u4E0D\u80FD\u4E3A\u7A7A");
      if (field === "status" && !["ONGOING", "ENDED", "HIATUS", "ABANDONED"].includes(value)) throw new MetadataError("verification", "\u72B6\u6001\u503C\u4E0D\u7B26");
      if (field === "releaseDate" && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new MetadataError("verification", "\u65E5\u671F\u4F7F\u7528 YYYY-MM-DD");
    }
    return value;
  }
  var Panel = class {
    constructor(registry, client, writer, translation) {
      this.registry = registry;
      this.client = client;
      this.writer = writer;
      this.translation = translation;
      if (this.settings.sourceMode !== void 0 || this.settings.offlineSources !== void 0) {
        if (this.settings.sourceMode === "offline" && this.settings.offlineSources) this.settings.sources = this.settings.offlineSources;
        delete this.settings.sourceMode;
        delete this.settings.offlineSources;
        storage.set("settings-v1", this.settings);
      }
      this.host.id = "komga-metadata-panel";
      this.host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483000";
      this.host.dataset.theme = storage.get("ui-theme-v1", matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const style = element("style");
      style.textContent = panelStyle;
      this.body.className = "dialog";
      this.body.setAttribute("aria-label", "\u5143\u6570\u636E");
      this.body.addEventListener("cancel", (event) => {
        event.preventDefault();
        this.controller?.abort();
        void this.close();
      });
      this.body.addEventListener("keydown", (event) => {
        if (event.key !== "Tab" || event.ctrlKey || event.altKey || event.metaKey) return;
        const focusable = [...this.body.querySelectorAll("button,input,select,textarea,summary,a[href],[tabindex]")].filter((e) => e.tabIndex >= 0 && !e.matches(":disabled") && e.getClientRects().length > 0);
        const first = focusable[0], last = focusable.at(-1), active = this.shadow.activeElement;
        if (event.shiftKey && active === first && last) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && active === last && first) {
          event.preventDefault();
          first.focus();
        }
      });
      const header = element("header");
      header.className = "header";
      const brand = element("span");
      brand.className = "brand";
      brand.append(icon("layers"));
      const heading = element("div");
      heading.className = "heading";
      this.contextLabel.className = "context";
      this.contextLabel.textContent = "Komga";
      heading.append(element("h2", "\u5143\u6570\u636E"), this.contextLabel);
      const headerActions = element("div");
      headerActions.className = "header-actions";
      const theme = button("", () => {
        this.host.dataset.theme = this.host.dataset.theme === "dark" ? "light" : "dark";
        storage.set("ui-theme-v1", this.host.dataset.theme);
      });
      theme.className = "ghost icon-button";
      theme.setAttribute("aria-label", "\u5207\u6362\u6DF1\u6D45\u8272");
      theme.title = "\u5207\u6362\u6DF1\u6D45\u8272";
      theme.append(icon("sun"));
      const close = button("", () => {
        this.controller?.abort();
        void this.close();
      });
      close.className = "ghost icon-button";
      close.setAttribute("aria-label", "\u5173\u95ED");
      close.title = "\u5173\u95ED \xB7 Esc";
      close.append(icon("close"));
      headerActions.append(theme, close);
      header.append(brand, heading, headerActions);
      this.controls.className = "workspace";
      this.results.className = "results";
      this.preview.className = "preview";
      this.preview.addEventListener("change", () => this.updateApplyState());
      this.sourceToggles.className = "source-toggles";
      const searchCard = element("div");
      searchCard.className = "card";
      const searchTitle = element("div");
      searchTitle.className = "section-title";
      searchTitle.append(element("h3", "\u67E5\u627E\u4F5C\u54C1"));
      const searchRow = element("div");
      searchRow.className = "search-row";
      const searchButton = button("\u641C\u7D22", () => void this.run(() => this.search()));
      searchButton.className = "primary";
      searchButton.prepend(icon("search"));
      searchRow.append(this.query, searchButton);
      this.query.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.isComposing) void this.run(() => this.search());
      });
      this.query.setAttribute("aria-label", "\u641C\u7D22\u8BCD");
      this.query.placeholder = "\u4F5C\u54C1\u540D";
      this.direct.setAttribute("aria-label", "\u6765\u6E90\u94FE\u63A5\u6216 ID");
      this.direct.placeholder = "\u6765\u6E90\u94FE\u63A5\u6216 ID";
      this.provider.setAttribute("aria-label", "\u6765\u6E90");
      for (const p of registry.list()) option(this.provider, p.id, p.id);
      this.renderSourceChecks();
      const directDetails = element("details");
      directDetails.append(element("summary", "\u901A\u8FC7\u94FE\u63A5\u6216 ID \u8BFB\u53D6"));
      const directRow = element("div");
      directRow.className = "direct-row";
      directRow.append(this.provider, this.direct, button("\u8BFB\u53D6", () => void this.run(() => this.readDirect())));
      this.searchProgress.className = "search-progress";
      this.searchProgress.hidden = true;
      const languages = element("details");
      languages.className = "language-options";
      languages.append(element("summary", "\u63A5\u53D7\u7684\u8D44\u6599\u8BED\u8A00"));
      const languageChecks = element("div");
      languageChecks.className = "field-grid";
      for (const language of allLanguages) {
        const check = input(languageLabels[language], languageChecks, "checkbox");
        check.checked = (this.settings.acceptedLanguages ?? allLanguages).includes(language);
        check.dataset.language = language;
        check.onchange = () => {
          this.settings.acceptedLanguages = [...languageChecks.querySelectorAll("input:checked")].map((i) => i.dataset.language);
          storage.set("settings-v1", this.settings);
          this.renderSelection();
        };
      }
      languages.append(languageChecks, element("p", "\u7B5B\u9009\u5DF2\u6709\u7684\u6807\u9898\u3001\u7B80\u4ECB\u3001\u4F5C\u8005\u7B49\u6587\u672C\uFF1B\u65E0\u6CD5\u53EF\u9760\u5224\u65AD\u65F6\u5F52\u5165\u300C\u672A\u6807\u6CE8\u300D\u3002\u52FE\u9009\u4E2D\u6587\u65F6\uFF0CEH \u6807\u7B7E\u6309\u8BCD\u5E93\u7FFB\u8BD1\uFF1B\u5426\u5219\u4FDD\u7559\u539F\u59CB\u6807\u7B7E\u3002\u641C\u7D22\u8BCD\u4E0E\u4F5C\u54C1\u539F\u59CB\u8BED\u8A00\u4E0D\u53D8\u3002"));
      directDetails.append(directRow);
      searchCard.append(searchTitle, searchRow, this.sourceToggles, languages, directDetails, this.searchProgress, this.results);
      const choices = element("div");
      choices.className = "card";
      this.detail.className = "selected-record";
      choices.append(this.detail, element("h3", "\u5199\u5165\u9009\u9879"));
      this.book.setAttribute("aria-label", "\u540C\u65F6\u66F4\u65B0\u54EA\u672C\u4E66");
      this.cover.setAttribute("aria-label", "\u4F7F\u7528\u54EA\u5F20\u5C01\u9762");
      this.coverTarget.setAttribute("aria-label", "\u66FF\u6362\u54EA\u4E2A\u5C01\u9762");
      option(this.cover, "", "\u4E0D\u4FEE\u6539\u5C01\u9762");
      for (const [label, select] of [["\u540C\u65F6\u66F4\u65B0\u54EA\u672C\u4E66", this.book], ["\u4F7F\u7528\u54EA\u5F20\u5C01\u9762", this.cover], ["\u66FF\u6362\u54EA\u4E2A\u5C01\u9762", this.coverTarget]]) {
        const wrapper = element("label", label);
        wrapper.className = "field-label";
        wrapper.append(select);
        choices.append(wrapper);
      }
      const caption = element("div", "\u5199\u5165\u5B57\u6BB5");
      caption.className = "field-caption";
      choices.append(caption);
      const fieldGrid = element("div");
      fieldGrid.className = "field-grid";
      for (const f of [.../* @__PURE__ */ new Set([...seriesFields, ...bookFields])]) {
        const i = input(labels[f], fieldGrid, "checkbox");
        i.checked = !["title", "releaseDate", "isbn"].includes(f);
        this.fields.set(f, i);
        i.onchange = () => this.invalidate();
      }
      choices.append(fieldGrid);
      const tagOptions = element("details");
      tagOptions.className = "eh-tag-options";
      tagOptions.append(element("summary", "EH \u6807\u7B7E\u683C\u5F0F"));
      const prefixLabel = element("label", "\u6807\u7B7E\u524D\u7F00"), prefixes = element("select");
      prefixes.setAttribute("aria-label", "\u6807\u7B7E\u524D\u7F00");
      option(prefixes, "compact", "\u7B80\u6D01\uFF1A\u53BB\u6389\u63CF\u8FF0\u7C7B\u524D\u7F00");
      option(prefixes, "preserve", "\u4FDD\u7559\u5168\u90E8\u524D\u7F00");
      prefixes.value = this.settings.ehTagPrefixes ?? "compact";
      prefixLabel.append(prefixes);
      const credit = element("a", "EhTagTranslation \xB7 CC BY-NC-SA 3.0");
      credit.href = "https://github.com/EhTagTranslation/Database";
      credit.target = "_blank";
      credit.rel = "noopener noreferrer";
      tagOptions.append(prefixLabel, credit);
      choices.append(tagOptions);
      prefixes.onchange = () => {
        this.settings.ehTagPrefixes = prefixes.value;
        storage.set("settings-v1", this.settings);
        this.invalidate();
      };
      this.propagate = input("\u5C06\u4F5C\u8005\u540C\u6B65\u5230\u7CFB\u5217\u5185\u6240\u6709\u4E66\u7C4D", choices, "checkbox");
      this.propagate.checked = false;
      this.propagate.parentElement.className = "check-label";
      for (const e of [this.book, this.cover, this.coverTarget, this.propagate]) e.onchange = () => this.invalidate();
      this.controls.append(searchCard, choices);
      this.applyButton = button("\u5E94\u7528", () => void this.run(async () => {
        if (!this.plan) throw new MetadataError("verification", "\u8BF7\u5148\u9884\u89C8");
        const plan = this.readPreview();
        const result = await this.writer.apply(plan, this.signal);
        this.undoData = { seriesId: plan.seriesId, result };
        storage.set("undo-v1", this.undoData);
        this.plan = void 0;
        this.report(result);
      }));
      this.applyButton.disabled = true;
      this.undoButton = button("\u64A4\u9500\u6700\u8FD1\u5199\u5165", () => void this.run(async () => {
        if (!this.undoData) throw new MetadataError("verification", "\u6CA1\u6709\u64A4\u9500\u5FEB\u7167");
        const saved = this.undoData;
        const result = await this.writer.undo(saved.result, saved.seriesId, this.signal);
        const succeeded = (t, action) => result.outcomes.some((o) => o.target.kind === t.kind && o.target.id === t.id && o.action === action && o.status === "success");
        saved.result.snapshots = saved.result.snapshots.filter((s) => !succeeded(s.target, "metadata"));
        saved.result.covers = saved.result.covers.filter((s) => !succeeded(s.target, "cover"));
        this.undoData = saved.result.snapshots.length || saved.result.covers.length ? saved : void 0;
        storage.set("undo-v1", this.undoData);
        this.invalidate();
        this.report(result);
      }));
      this.undoButton.disabled = !this.undoData;
      this.applyButton.className = "primary";
      this.undoButton.className = "ghost";
      this.previewButton.disabled = true;
      this.metaActions.className = "footer-actions";
      this.metaActions.append(this.undoButton, this.previewButton, this.applyButton);
      this.status.className = "status";
      this.status.setAttribute("role", "status");
      this.status.setAttribute("aria-live", "polite");
      this.cancelButton.className = "ghost cancel-action";
      this.cancelButton.hidden = true;
      const footer = element("footer");
      footer.className = "footer";
      footer.append(this.status, this.cancelButton, this.metaActions);
      this.metadataPage.append(this.controls, this.preview);
      const settingsPage = element("div");
      settingsPage.append(this.settingsPanel());
      const tabs = element("nav");
      tabs.className = "tabs";
      tabs.setAttribute("role", "tablist");
      tabs.setAttribute("aria-label", "\u5143\u6570\u636E\u5DE5\u5177");
      this.viewport.className = "viewport";
      const pages2 = [this.metadataPage, this.catalog, settingsPage];
      const tabButtons = [];
      const selectTab = (index) => {
        pages2.forEach((page, n) => {
          page.hidden = n !== index;
          tabButtons[n].setAttribute("aria-selected", String(n === index));
          tabButtons[n].tabIndex = n === index ? 0 : -1;
        });
        this.metaActions.hidden = index !== 0;
        this.viewport.scrollTop = 0;
      };
      ["\u5143\u6570\u636E", "\u672C\u5730\u6570\u636E\u5E93", "\u8BBE\u7F6E"].forEach((name, index) => {
        const tab = button(name, () => selectTab(index));
        tab.prepend(icon(["search", "database", "settings"][index]));
        tab.id = `km-tab-${index}`;
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-controls", `km-page-${index}`);
        tab.addEventListener("keydown", (event) => {
          let next;
          if (event.key === "ArrowRight") next = (index + 1) % pages2.length;
          else if (event.key === "ArrowLeft") next = (index + pages2.length - 1) % pages2.length;
          else if (event.key === "Home") next = 0;
          else if (event.key === "End") next = pages2.length - 1;
          else return;
          event.preventDefault();
          selectTab(next);
          tabButtons[next].focus();
        });
        const page = pages2[index];
        page.id = `km-page-${index}`;
        page.className = "tab-panel";
        page.setAttribute("role", "tabpanel");
        page.setAttribute("aria-labelledby", tab.id);
        tabButtons.push(tab);
        tabs.append(tab);
        this.viewport.append(page);
      });
      selectTab(0);
      this.body.append(header, tabs, this.viewport, footer);
      this.shadow.append(style, this.body);
    }
    host = element("div");
    shadow = this.host.attachShadow({ mode: "open" });
    body = element("dialog");
    metadataPage = element("div");
    viewport = element("div");
    contextLabel = element("div");
    metaActions = element("div");
    previewButton = button("\u751F\u6210\u9884\u89C8", () => void this.run(() => this.makePreview()));
    cancelButton = button("\u53D6\u6D88", () => this.controller?.abort());
    finishing = false;
    returnFocus = document.activeElement?.shadowRoot?.activeElement ?? document.activeElement;
    status = element("p");
    settings = storage.get("settings-v1", { sources: ["bangumi", "mangabaka", "anilist", "mangaupdates"], credentials: {} });
    controller;
    busy = false;
    state;
    selected;
    selections = [];
    merged;
    tagReplacements = /* @__PURE__ */ new Map();
    sameWork = false;
    plan;
    seriesId;
    undoData = storage.get("undo-v1", void 0);
    controls = element("div");
    results = element("div");
    detail = element("div");
    thumbnails;
    collapsedSources = /* @__PURE__ */ new Set();
    previewUrls = /* @__PURE__ */ new Set();
    preview = element("div");
    query = element("input");
    direct = element("input");
    provider = element("select");
    searchProgress = element("div");
    sourceToggles = element("div");
    extension;
    catalogCleanup;
    book = element("select");
    cover = element("select");
    coverTarget = element("select");
    fields = /* @__PURE__ */ new Map();
    propagate = element("input");
    applyButton;
    undoButton;
    catalog = element("div");
    fade;
    mount(extension) {
      if (!this.host.isConnected) document.body.append(this.host);
      this.body.showModal();
      this.extension = extension;
      this.renderSourceChecks();
      if (extension) this.catalogCleanup = extension.mount(this.catalog) || void 0;
      void this.run(async () => {
        this.seriesId = currentSeries(location, document);
        if (!this.seriesId) throw new MetadataError("invalid-id", "\u8BF7\u6253\u5F00\u7CFB\u5217\u6216 One-shot \u8BE6\u60C5\u9875\uFF0C\u518D\u4ECE\u83DC\u5355\u542F\u52A8");
        this.state = await this.client.state(this.seriesId, this.signal);
        this.query.value = String(this.state.series.metadata.title);
        this.contextLabel.textContent = this.query.value;
        this.contextLabel.title = this.query.value;
        this.book.replaceChildren();
        this.coverTarget.replaceChildren();
        if (!this.state.series.oneshot) {
          option(this.book, "", "\u4EC5\u66F4\u65B0\u7CFB\u5217\u8D44\u6599");
          option(this.coverTarget, `series:${this.seriesId}`, "\u6574\u4E2A\u7CFB\u5217\u7684\u5C01\u9762");
        }
        for (const b of this.state.books) {
          option(this.book, b.id, `${this.state.series.oneshot ? "\u7CFB\u5217 + \u552F\u4E00\u4E66\u7C4D \xB7 " : ""}${b.metadata.number ?? "?"} \xB7 ${b.metadata.title}`);
          if (!this.state.series.oneshot) option(this.coverTarget, `books:${b.id}`, `${b.metadata.number ?? "?"} \xB7 ${b.metadata.title}`);
        }
        if (this.state.series.oneshot) option(this.coverTarget, "both", "\u7CFB\u5217\u4E0E\u552F\u4E00\u4E66\u7C4D\u5171\u7528\u5C01\u9762");
        this.status.textContent = `\u5F53\u524D\uFF1A${this.state.series.metadata.title}`;
      });
    }
    get signal() {
      if (!this.controller) throw new Error("No action context");
      return this.controller.signal;
    }
    updateApplyState() {
      this.applyButton.disabled = this.busy || this.finishing || !this.plan || !this.plan.cover && !this.preview.querySelector("input[data-edit][data-field]:checked");
    }
    invalidate() {
      this.tagReplacements.clear();
      for (const url2 of this.previewUrls) URL.revokeObjectURL(url2);
      this.previewUrls.clear();
      this.plan = void 0;
      this.applyButton.disabled = true;
      this.preview.replaceChildren();
      this.controls.hidden = false;
      this.previewButton.hidden = false;
      this.previewButton.disabled = !this.selected;
    }
    async run(action) {
      if (this.busy || this.finishing) return;
      this.busy = true;
      this.controller = new AbortController();
      clearTimeout(this.fade);
      this.host.style.opacity = "1";
      this.body.style.opacity = "1";
      this.status.style.opacity = "1";
      this.status.dataset.state = "busy";
      this.status.textContent = "";
      this.status.setAttribute("aria-label", "\u5904\u7406\u4E2D");
      this.cancelButton.hidden = false;
      this.previewButton.disabled = true;
      this.controls.querySelectorAll("input,button,select").forEach((e) => e.disabled = true);
      this.results.querySelectorAll("button").forEach((e) => e.disabled = true);
      this.preview.querySelectorAll("input,select,textarea,button").forEach((e) => e.disabled = true);
      this.applyButton.disabled = true;
      this.undoButton.disabled = true;
      try {
        await action();
        if (this.status.dataset.state === "busy" || this.status.dataset.state === "search") {
          this.status.dataset.state = "idle";
          if (!this.status.textContent) this.status.textContent = this.plan ? "\u786E\u8BA4\u9884\u89C8\u540E\u5E94\u7528" : this.selected ? "\u5DF2\u9009\u62E9\u6765\u6E90\u6761\u76EE" : "\u8BF7\u9009\u62E9\u5339\u914D\u6761\u76EE";
        }
      } catch (error) {
        this.status.dataset.state = "error";
        this.status.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
        this.status.removeAttribute("aria-label");
        this.cancelButton.hidden = true;
        this.controls.querySelectorAll("input,button,select").forEach((e) => e.disabled = this.finishing);
        this.results.querySelectorAll("button").forEach((e) => e.disabled = this.finishing);
        this.preview.querySelectorAll("input,select,textarea,button").forEach((e) => e.disabled = this.finishing);
        this.previewButton.disabled = this.finishing || !this.selected || Boolean(this.plan);
        this.updateApplyState();
        this.undoButton.disabled = this.finishing || !this.undoData;
      }
    }
    context() {
      return { signal: this.signal, credentials: structuredClone(this.settings.credentials) };
    }
    clearSearch() {
      this.thumbnails?.dispose();
      this.thumbnails = void 0;
      this.searchProgress.hidden = true;
      this.searchProgress.replaceChildren();
      this.selections = [];
      this.merged = void 0;
      this.sameWork = false;
      this.selected = void 0;
      this.detail.replaceChildren();
      this.results.replaceChildren();
      this.invalidate();
      this.cover.replaceChildren();
      option(this.cover, "", "\u4E0D\u4FEE\u6539\u5C01\u9762");
    }
    async search() {
      this.clearSearch();
      this.saveSourceChecks();
      const ids = this.sourceIds();
      if (!this.query.value.trim() || !ids.length) throw new MetadataError("verification", "\u8F93\u5165\u641C\u7D22\u8BCD\u5E76\u9009\u62E9\u6765\u6E90");
      const query = this.query.value.trim(), context = this.context();
      const thumbnails = this.thumbnails = new Thumbnails(this.viewport, (url2, signal) => this.writer.image(url2, signal));
      context.signal.addEventListener("abort", () => thumbnails.dispose(), { once: true });
      const imageContext = { ...context, signal: thumbnails.signal };
      const bar = element("progress"), progressLabel = element("span");
      bar.max = ids.length;
      bar.value = 0;
      bar.setAttribute("aria-label", "\u641C\u7D22\u8FDB\u5EA6");
      this.searchProgress.replaceChildren(progressLabel, bar);
      this.searchProgress.hidden = false;
      this.status.dataset.state = "search";
      let completed = 0, failed = 0;
      const progress = () => {
        bar.value = completed;
        progressLabel.textContent = `\u5DF2\u7ED3\u675F ${completed} / ${ids.length} \u4E2A\u6765\u6E90`;
      };
      progress();
      await Promise.all(ids.map(async (id) => {
        const group = element("details");
        group.className = "result-group";
        group.dataset.provider = id;
        group.dataset.state = "pending";
        group.open = !this.collapsedSources.has(id);
        group.addEventListener("toggle", () => {
          if (group.open) this.collapsedSources.delete(id);
          else this.collapsedSources.add(id);
        });
        const heading = element("summary");
        heading.append(element("span", id));
        const count = element("span", "\u68C0\u7D22\u4E2D");
        count.className = "result-count";
        heading.append(count);
        group.append(heading);
        this.results.append(group);
        try {
          const result = await searchPreferred(this.registry.list().find((p) => p.id === id), this.extension?.providers.find((p) => p.id === id), query, context, (phase) => {
            count.textContent = phase;
          });
          group.dataset.state = "ready";
          count.textContent = `${result.mode} \xB7 ${result.candidates.length} \u9879`;
          if (result.note) {
            const note = element("p", result.note);
            note.className = "hint";
            group.append(note);
          }
          if (!result.candidates.length) group.append(element("p", "\u65E0\u5339\u914D"));
          const grid = element("div");
          grid.className = "candidate-grid";
          for (const c of result.candidates) {
            const provider = result.provider;
            const candidate2 = button("", () => void this.run(async () => {
              if (this.selections.some((s) => sourceKey(s.record) === `${c.provider}:${c.id}`)) {
                this.removeSelection(`${c.provider}:${c.id}`);
                return;
              }
              this.choose(await provider.get(c.id, this.context()), provider);
            }));
            candidate2.disabled = this.busy;
            candidate2.className = "candidate";
            candidate2.setAttribute("aria-label", c.title);
            candidate2.setAttribute("aria-pressed", "false");
            candidate2.dataset.key = `${c.provider}:${c.id}`;
            candidate2.title = c.title;
            const title = element("span", c.title);
            title.className = "candidate-title";
            candidate2.append(thumbnails.add(c.title, async () => c.cover || (await provider.get(c.id, imageContext)).covers[0]?.url), title);
            grid.append(candidate2);
          }
          group.append(grid);
        } catch (error) {
          failed++;
          group.dataset.state = "error";
          count.textContent = context.signal.aborted ? "\u5DF2\u53D6\u6D88" : "\u6765\u6E90\u5931\u8D25";
          group.append(element("p", error instanceof Error ? error.message : String(error)));
        } finally {
          completed++;
          progress();
        }
      }));
      cancelled(context.signal);
      if (failed) {
        this.status.dataset.state = "error";
        this.status.textContent = "\u90E8\u5206\u6765\u6E90\u5931\u8D25\uFF1B\u5176\u4ED6\u7ED3\u679C\u4ECD\u53EF\u9009\u62E9";
      }
    }
    async readDirect() {
      this.invalidate();
      const online = this.registry.list().find((p2) => p2.id === this.provider.value);
      const offline = this.extension?.providers.find((p2) => p2.id === this.provider.value && p2.available?.() !== false);
      let p = offline ?? online;
      if (!p) throw new MetadataError("unavailable", "\u8BF7\u5148\u52A0\u8F7D\u6B64\u6765\u6E90\u7684\u672C\u5730\u76EE\u5F55");
      let record2;
      try {
        record2 = await p.get(await p.resolveLink(this.direct.value.trim(), this.context()), this.context());
      } catch (error) {
        cancelled(this.signal);
        if (!offline || !online || p !== offline) throw error;
        p = online;
        record2 = await p.get(await p.resolveLink(this.direct.value.trim(), this.context()), this.context());
      }
      this.choose(record2, p);
    }
    choose(record2, provider) {
      const next = [...this.selections];
      const existing = next.findIndex((s) => sourceKey(s.record) === sourceKey(record2));
      if (existing < 0) next.push({ record: record2, provider });
      else next[existing] = { record: record2, provider };
      mergeRecords(next.map((s) => s.record));
      this.selections = next;
      this.sameWork = false;
      this.renderSelection();
    }
    removeSelection(key2) {
      this.selections = this.selections.filter((s) => sourceKey(s.record) !== key2);
      this.sameWork = false;
      this.renderSelection();
    }
    renderSelection() {
      this.invalidate();
      this.detail.replaceChildren();
      const previousCover = this.cover.value === "" ? void 0 : this.selected?.covers[Number(this.cover.value)]?.url;
      this.cover.replaceChildren();
      option(this.cover, "", "\u4E0D\u4FEE\u6539\u5C01\u9762");
      this.results.querySelectorAll(".candidate").forEach((e) => e.setAttribute("aria-pressed", String(this.selections.some((s) => sourceKey(s.record) === e.dataset.key))));
      if (!this.selections.length) {
        this.selected = void 0;
        this.merged = void 0;
        this.previewButton.disabled = true;
        return;
      }
      this.merged = mergeRecords(this.selections.map((s) => s.record), {}, this.settings.acceptedLanguages ?? allLanguages);
      this.selected = this.merged.record;
      const record2 = this.selected;
      this.detail.append(element("h3", this.selections.length === 1 ? `${record2.provider} \xB7 ${nativeTitle(record2)}` : `\u5DF2\u9009 ${this.selections.length} \u4E2A\u6761\u76EE`));
      for (const { record: r, provider } of this.selections) {
        const row = element("div");
        row.className = "selected-source";
        const name = element("span", `${r.provider}${provider.capabilities.offline ? " \xB7 \u672C\u5730" : ""} \xB7 ${nativeTitle(r)}`);
        name.title = r.url;
        const remove = button("\u79FB\u9664", () => {
          if (!this.busy) this.removeSelection(sourceKey(r));
        });
        remove.className = "ghost";
        remove.setAttribute("aria-label", `\u79FB\u9664 ${r.provider}`);
        row.append(name, remove);
        this.detail.append(row);
      }
      const states = { ONGOING: "\u8FDE\u8F7D\u4E2D", ENDED: "\u5DF2\u5B8C\u7ED3", HIATUS: "\u6682\u505C\u8FDE\u8F7D", ABANDONED: "\u5DF2\u505C\u6B62\u8FDE\u8F7D" };
      const meta2 = element("p", `${isVolumeRecord(record2) ? "\u5355\u5377\u8D44\u6599" : "\u6574\u90E8\u4F5C\u54C1\u8D44\u6599"}${record2.status ? ` \xB7 ${states[record2.status]}` : ""}`);
      meta2.className = "record-meta";
      this.detail.append(meta2);
      if (this.selections.length > 1) {
        this.detail.append(element("p", "\u5728\u9884\u89C8\u4E2D\u9010\u5B57\u6BB5\u9009\u62E9\u300C\u5355\u9009\u300D\u6216\u300C\u5408\u5E76\u300D\u3002"));
        const confirm = input("\u8FD9\u4E9B\u6761\u76EE\u662F\u540C\u4E00\u4F5C\u54C1\uFF0F\u540C\u4E00\u5377\u548C\u7248\u672C", this.detail, "checkbox");
        confirm.parentElement.className = "check-label";
        confirm.checked = this.sameWork;
        confirm.onchange = () => {
          this.sameWork = confirm.checked;
          this.invalidate();
        };
      }
      const summaryText = this.merged.values.summary;
      if (typeof summaryText === "string" && summaryText) {
        const summary = element("pre", summaryText);
        summary.className = "record-summary";
        if (this.selections.length > 1) {
          const about = element("details");
          about.append(element("summary", "\u4F5C\u54C1\u7B80\u4ECB"), summary);
          this.detail.append(about);
        } else this.detail.append(summary);
      }
      for (const { record: r, provider } of this.selections) {
        for (const warning of r.warnings ?? []) this.detail.append(element("p", warning));
        if (r.books?.length) {
          const volumes = element("details");
          volumes.className = "volumes";
          volumes.append(element("summary", `${r.provider} \xB7 \u5173\u8054\u5355\u5377 \xB7 ${r.books.length}`));
          for (const b of r.books) volumes.append(button(`\u5355\u5377\uFF1A${nativeTitle(b)}`, () => void this.run(async () => this.choose(await provider.get(b.id, this.context()), provider))));
          this.detail.append(volumes);
        }
      }
      this.merged.covers.forEach(({ cover, provider }, i) => option(this.cover, String(i), `${provider} \xB7 ${cover.volume === void 0 ? `\u56FE\u7247 ${i + 1}` : `\u7B2C ${cover.volume} \u5377`} ${cover.language ?? ""}`));
      if (previousCover) {
        const index = this.merged.covers.findIndex((c) => c.cover.url === previousCover);
        if (index >= 0) this.cover.value = String(index);
      }
      this.previewButton.disabled = this.busy;
    }
    async makePreview() {
      this.invalidate();
      if (!this.selected || !this.seriesId) throw new MetadataError("verification", "\u5148\u9009\u62E9\u5019\u9009");
      if (this.selections.length > 1 && !this.sameWork) throw new MetadataError("verification", "\u8BF7\u5148\u786E\u8BA4\u9009\u4E2D\u6761\u76EE\u662F\u540C\u4E00\u4F5C\u54C1\uFF0F\u540C\u4E00\u5377\u548C\u7248\u672C");
      if (currentSeries(location, document) !== this.seriesId) throw new MetadataError("conflict", "\u9875\u9762\u7CFB\u5217\u53D8\u5316\uFF0C\u8BF7\u5173\u95ED\u540E\u91CD\u65B0\u542F\u52A8");
      let translationWarning;
      if (wantsChineseTags(this.settings.acceptedLanguages ?? allLanguages) && this.fields.get("tags")?.checked && this.selections.some((s) => s.record.provider === "ehentai" && s.record.tags.length)) {
        this.status.textContent = "\u6B63\u5728\u51C6\u5907\u4E2D\u6587\u6807\u7B7E\u8BCD\u5E93\u2026";
        const loaded = await this.translation.load(this.signal);
        const records = this.selections.map(({ record: record2 }) => {
          const projected = this.translation.project(record2, this.settings.ehTagPrefixes ?? "compact");
          for (const [raw, translated] of projected.replacements) this.tagReplacements.set(raw, translated);
          return projected.record;
        });
        this.merged = mergeRecords(records, {}, this.settings.acceptedLanguages ?? allLanguages);
        this.selected = this.merged.record;
        translationWarning = loaded.warning;
        this.status.textContent = "";
      } else this.merged = mergeRecords(this.selections.map((s) => s.record), {}, this.settings.acceptedLanguages ?? allLanguages);
      this.selected = this.merged.record;
      this.state = await this.client.state(this.seriesId, this.signal);
      const [kind, id] = this.coverTarget.value.split(":");
      const plan = buildPlan(this.state, this.selected, {
        fields: [...this.fields].filter(([, i]) => i.checked).map(([f]) => f),
        bookId: this.book.value || void 0,
        propagateAuthors: this.propagate.checked,
        mergedFields: this.merged?.values,
        includeUnchanged: true,
        cover: this.cover.value === "" ? void 0 : this.selected.covers[Number(this.cover.value)],
        coverTarget: id && (kind === "series" || kind === "books") ? { kind, id } : void 0
      });
      await this.writer.prepare(plan, this.signal);
      const previewHead = element("div");
      previewHead.className = "preview-head";
      const back = button("\u8FD4\u56DE\u9009\u9879", () => {
        if (!this.busy && !this.finishing) {
          this.invalidate();
          this.viewport.scrollTop = 0;
        }
      });
      back.className = "ghost";
      back.prepend(icon("back"));
      previewHead.append(element("h3", "\u786E\u8BA4\u66F4\u6539"), back);
      this.preview.append(previewHead);
      if (translationWarning) this.preview.append(element("p", translationWarning));
      if (plan.cover) {
        try {
          await this.coverPreview(plan.cover);
        } catch (error) {
          this.invalidate();
          throw error;
        }
      }
      plan.edits.forEach((edit, index) => {
        const target = edit.target.kind === "series" ? this.state.series : this.state.books.find((b) => b.id === edit.target.id);
        const targetHeading = element("h3", `${edit.target.kind === "series" ? "\u7CFB\u5217" : "\u4E66\u7C4D"} \xB7 ${target?.metadata.title ?? edit.target.id}`);
        targetHeading.className = "target-heading";
        targetHeading.title = `${edit.target.kind}/${edit.target.id}`;
        this.preview.append(targetHeading);
        for (const [field, value] of Object.entries(edit.after)) {
          const row = element("div");
          row.className = "row";
          const check = input(labels[field], row, "checkbox");
          check.checked = true;
          check.dataset.edit = String(index);
          check.dataset.field = field;
          const diff = element("div");
          diff.className = "diff";
          const old = element("div"), updated = element("div");
          const sources = this.merged?.used[field]?.join(" + ");
          const beforeLabel = element("div", "\u5F53\u524D\u503C"), afterLabel = element("div", `\u5199\u5165\u503C${sources ? ` \xB7 ${sources}` : ""}`);
          beforeLabel.className = afterLabel.className = "diff-caption";
          const before = edit.before[field];
          old.append(beforeLabel, element("pre", typeof before === "string" ? before || "\u2014" : JSON.stringify(before, null, 2)));
          const next = element("textarea");
          next.dataset.format = typeof value === "string" ? "text" : "json";
          next.value = typeof value === "string" ? value : JSON.stringify(value, null, 2);
          next.dataset.edit = String(index);
          next.dataset.field = field;
          next.title = next.dataset.format === "text" ? "\u53EF\u76F4\u63A5\u7F16\u8F91\u6587\u672C" : "JSON \u683C\u5F0F";
          next.setAttribute("aria-label", `${labels[field]}\u5199\u5165\u503C`);
          this.fieldComposer(row, field, value, before, next, check, afterLabel);
          updated.append(afterLabel, next);
          diff.append(old, updated);
          row.append(diff);
          this.preview.append(row);
        }
      });
      for (const skipped of plan.skipped) this.preview.append(element("p", skipped));
      const note = element("p", "\u4EC5\u5E94\u7528\u52FE\u9009\u5B57\u6BB5\u3002\u5199\u5165\u524D\u4F1A\u91CD\u65B0\u68C0\u67E5\uFF0C\u5B8C\u6210\u540E\u8BFB\u56DE\u6838\u5BF9\u3002");
      note.className = "hint";
      this.preview.append(note);
      cancelled(this.signal);
      this.plan = plan;
      this.controls.hidden = true;
      this.previewButton.hidden = true;
      this.viewport.scrollTop = 0;
    }
    fieldComposer(row, field, value, before, textarea, enabled, caption) {
      const entries = [...this.merged?.options[field] ?? []];
      const existing = field === "tags" && Array.isArray(before) ? translateExisting(before, this.tagReplacements) : before;
      if (existing !== void 0 && existing !== null && existing !== "" && (!Array.isArray(existing) || existing.length)) entries.unshift({ key: "current", provider: "\u73B0\u6709", label: this.tagReplacements.size && field === "tags" ? "Komga \u5F53\u524D\u503C\uFF08\u5339\u914D\u7684 EH \u6807\u7B7E\u5DF2\u7FFB\u8BD1\uFF09" : "Komga \u5F53\u524D\u503C", value: existing });
      if (!entries.length) return;
      const controls = element("div");
      controls.className = "field-compose";
      const mode = element("select");
      mode.setAttribute("aria-label", `${labels[field]}\u5904\u7406\u65B9\u5F0F`);
      option(mode, "single", "\u5355\u9009");
      if (canMergeField(field, value)) option(mode, "merge", "\u5408\u5E76");
      mode.value = Array.isArray(value) ? "merge" : "single";
      const select = element("select");
      select.setAttribute("aria-label", `${labels[field]}\u6765\u6E90`);
      for (const e of entries) option(select, e.key, e.label);
      select.value = entries.find((e) => e.key !== "current")?.key ?? entries[0].key;
      const picks = element("details");
      picks.className = "field-source-picks";
      picks.append(element("summary", "\u9009\u62E9\u53C2\u4E0E\u5408\u5E76\u7684\u6761\u76EE"));
      const checks = entries.map((e) => {
        const i = input(e.label, picks, "checkbox");
        i.checked = true;
        return i;
      });
      const refresh = () => {
        select.hidden = mode.value !== "single";
        picks.hidden = mode.value !== "merge";
        const chosen = mode.value === "single" ? entries.filter((e) => e.key === select.value) : entries.filter((_, i) => checks[i].checked);
        const next = mode.value === "single" ? chosen[0]?.value : combineField(field, chosen.map((e) => e.value));
        textarea.dataset.format = typeof next === "string" ? "text" : "json";
        textarea.value = next === void 0 ? "" : typeof next === "string" ? next : JSON.stringify(next, null, 2);
        enabled.checked = next !== void 0 && !equal(next, before);
        caption.textContent = `\u5199\u5165\u503C \xB7 ${[...new Set(chosen.map((e) => e.provider))].join(" + ") || "\u672A\u9009\u62E9"}`;
      };
      mode.onchange = select.onchange = refresh;
      checks.forEach((i) => i.onchange = refresh);
      controls.append(mode, select, picks);
      row.append(controls);
      refresh();
    }
    async coverPreview(cover) {
      const target = cover.target.kind === "series" ? this.state.series : this.state.books.find((b) => b.id === cover.target.id);
      const section = element("section");
      section.className = "cover-preview";
      section.append(element("h3", `\u5C01\u9762 \xB7 ${cover.sharedSeries ? "\u7CFB\u5217 + \u552F\u4E00\u4E66\u7C4D\uFF08\u5171\u7528\uFF09" : cover.target.kind === "series" ? "\u7CFB\u5217" : "\u4E66\u7C4D"} \xB7 ${target?.metadata.title ?? cover.target.id}`));
      const comparison = element("div");
      comparison.className = "cover-compare";
      for (const [label, blob] of [["\u5F53\u524D\u5C01\u9762", cover.beforeBlob], ["\u66FF\u6362\u4E3A", cover.prepared.blob]]) {
        const figure = element("figure"), frame = element("div");
        frame.className = "cover-frame";
        figure.append(element("figcaption", label), frame);
        if (blob) {
          const image2 = element("img");
          image2.alt = label;
          const url2 = URL.createObjectURL(blob);
          this.previewUrls.add(url2);
          image2.src = url2;
          try {
            await image2.decode();
          } catch {
            throw new MetadataError("verification", `${label}\u65E0\u6CD5\u663E\u793A\uFF0C\u8BF7\u68C0\u67E5\u56FE\u7247\u6216\u9875\u9762\u6743\u9650`);
          }
          cancelled(this.signal);
          frame.append(image2);
        } else frame.append(element("span", "\u6682\u65E0\u5C01\u9762"));
        comparison.append(figure);
      }
      section.append(comparison);
      this.preview.append(section);
    }
    readPreview() {
      if (!this.plan) throw new MetadataError("verification", "\u8BF7\u5148\u9884\u89C8");
      const plan = { ...this.plan, edits: structuredClone(this.plan.edits) };
      for (const i of this.preview.querySelectorAll("input[data-field]")) {
        const edit = plan.edits[Number(i.dataset.edit)], field = i.dataset.field;
        if (!i.checked) {
          delete edit.after[field];
          delete edit.before[field];
          delete edit.guards[`${field}Lock`];
          continue;
        }
        const textarea = [...this.preview.querySelectorAll("textarea")].find((t) => t.dataset.edit === i.dataset.edit && t.dataset.field === field);
        let value;
        try {
          value = textarea.dataset.format === "text" ? textarea.value : JSON.parse(textarea.value);
        } catch {
          throw new MetadataError("verification", `${labels[field]} \u65B0\u503C JSON \u683C\u5F0F\u9519\u8BEF`);
        }
        edit.after[field] = validateValue(field, value);
        if (equal(edit.after[field], edit.before[field])) {
          delete edit.after[field];
          delete edit.before[field];
          delete edit.guards[`${field}Lock`];
        }
      }
      plan.edits = plan.edits.filter((e) => Object.keys(e.after).length);
      return plan;
    }
    report(result) {
      if (result.status === "success") {
        this.finishing = true;
        this.status.dataset.state = "success";
        this.status.textContent = "\u2713 \u5DF2\u8BFB\u56DE\u786E\u8BA4";
        this.fade = setTimeout(() => {
          this.host.style.transition = "opacity 240ms";
          this.body.style.transition = "opacity 240ms";
          this.body.style.opacity = "0";
          this.host.style.opacity = "0";
          this.fade = setTimeout(() => {
            void this.close();
          }, 240);
        }, 1200);
      } else {
        this.status.dataset.state = "error";
        this.status.textContent = `${result.status === "partial" ? "\u90E8\u5206\u5B8C\u6210" : "\u5931\u8D25"}\uFF1A${result.outcomes.map((o) => `${o.target.kind}/${o.target.id} ${o.action} ${o.status === "success" ? "\u5DF2\u786E\u8BA4" : o.message}`).join("\uFF1B")}`;
      }
    }
    settingsPanel() {
      const d = element("details");
      d.className = "card settings-card";
      d.open = true;
      d.append(element("summary", "\u6765\u6E90\u51ED\u636E"));
      const note = element("p", "\u4EC5\u4FDD\u5B58\u5728\u5F53\u524D\u811A\u672C\u7BA1\u7406\u5668\u4E2D\u3002\u7559\u7A7A\u7684\u6765\u6E90\u4E0D\u4F1A\u4F7F\u7528\u51ED\u636E\u3002");
      note.className = "hint";
      d.append(note);
      const mal = input("MAL Client ID", d, "password"), cv = input("ComicVine API Key", d, "password");
      const exh = input("\u660E\u786E\u542F\u7528 ExH", d, "checkbox"), member = input("ExH member ID", d, "password"), pass = input("ExH pass hash", d, "password"), igneous = input("ExH igneous\uFF08\u53EF\u9009\uFF09", d, "password");
      mal.value = this.settings.credentials.malClientId ?? "";
      cv.value = this.settings.credentials.comicVineKey ?? "";
      exh.checked = this.settings.credentials.exhentai?.enabled ?? false;
      member.value = this.settings.credentials.exhentai?.memberId ?? "";
      pass.value = this.settings.credentials.exhentai?.passHash ?? "";
      igneous.value = this.settings.credentials.exhentai?.igneous ?? "";
      d.append(button("\u4FDD\u5B58\u8BBE\u7F6E", () => {
        if (this.busy) return;
        this.settings.credentials = { malClientId: mal.value.trim(), comicVineKey: cv.value.trim(), exhentai: { enabled: exh.checked, memberId: member.value.trim(), passHash: pass.value.trim(), igneous: igneous.value.trim() } };
        storage.set("settings-v1", this.settings);
        this.status.textContent = "\u8BBE\u7F6E\u5DF2\u4FDD\u5B58\uFF1B\u672A\u9A8C\u8BC1\u767B\u5F55";
      }));
      return d;
    }
    sourceIds() {
      return [...this.sourceToggles.querySelectorAll("input:checked")].map((i) => i.getAttribute("aria-label"));
    }
    saveSourceChecks() {
      const selected = this.sourceIds();
      this.settings.sources = selected;
    }
    renderSourceChecks() {
      this.sourceToggles.replaceChildren();
      const providers2 = [...new Map([...this.registry.list(), ...this.extension?.providers ?? []].map((p) => [p.id, p])).values()];
      const selected = this.settings.sources;
      this.provider.replaceChildren();
      for (const p of providers2) option(this.provider, p.id, p.id);
      for (const p of providers2) {
        const i = input(p.id, this.sourceToggles, "checkbox");
        i.checked = selected.includes(p.id);
        i.onchange = () => {
          this.saveSourceChecks();
          storage.set("settings-v1", this.settings);
        };
      }
    }
    async close() {
      this.controller?.abort();
      this.thumbnails?.dispose();
      for (const url2 of this.previewUrls) URL.revokeObjectURL(url2);
      this.previewUrls.clear();
      this.plan = void 0;
      clearTimeout(this.fade);
      this.fade = void 0;
      try {
        if (this.catalogCleanup) {
          const cleanup = this.catalogCleanup;
          this.catalogCleanup = void 0;
          await cleanup();
        }
      } finally {
        this.body.close();
        this.host.remove();
        if (this.returnFocus instanceof HTMLElement && this.returnFocus.isConnected) this.returnFocus.focus();
      }
    }
  };

  // catalog/src/client.mjs
  var CatalogClient = class {
    constructor(workerUrl, options = {}) {
      if (!workerUrl && !options.workerFactory) throw new Error("Catalog worker URL or factory is required");
      this.workerUrl = workerUrl;
      this.workerFactory = options.workerFactory;
      this.initOptions = options.initOptions;
      this.pending = /* @__PURE__ */ new Map();
      this.nextId = 0;
      this.file = void 0;
      this.worker = void 0;
      this.starting = void 0;
      this.cancelStarting = void 0;
      this.isOpen = false;
      this.reopening = void 0;
      this.generation = 0;
    }
    async start() {
      if (this.worker) return;
      if (this.starting) return this.starting;
      this.starting = (async () => {
        const created = this.workerFactory ? await this.workerFactory() : new Worker(this.workerUrl, { type: "module" });
        const worker2 = created?.worker ?? created;
        const initOptions = created?.initOptions ?? this.initOptions;
        if (!worker2 || typeof worker2.postMessage !== "function") throw new Error("Catalog worker factory returned no Worker");
        this.worker = worker2;
        let resolveReady;
        let rejectReady;
        const cancelStarting = () => rejectReady?.(new DOMException("Catalog operation cancelled", "AbortError"));
        const ready = initOptions ? new Promise((resolve, reject) => {
          resolveReady = resolve;
          rejectReady = reject;
        }) : Promise.resolve();
        this.cancelStarting = cancelStarting;
        worker2.onmessage = ({ data }) => {
          if (data.type === "ready") {
            this.cancelStarting = void 0;
            resolveReady?.();
            return;
          }
          if (data.type === "init-error") {
            rejectReady?.(new Error(data.error));
            return;
          }
          const pending = this.pending.get(data.id);
          if (!pending) return;
          this.pending.delete(data.id);
          if (data.error) pending.reject(new Error(data.error));
          else pending.resolve(data.result);
        };
        worker2.onerror = (event) => {
          event.preventDefault();
          const error = new Error(`Catalog worker failed: ${event.message || "startup error"} (Blob Worker may be blocked by browser CSP)`);
          rejectReady?.(error);
          this.failAll(error);
          worker2.terminate();
          if (this.worker === worker2) {
            this.worker = void 0;
            this.isOpen = false;
          }
        };
        if (initOptions) {
          const payload = { ...initOptions };
          const transfer = payload.wasmBinary instanceof ArrayBuffer ? [payload.wasmBinary] : [];
          worker2.postMessage({ type: "init", payload }, transfer);
        }
        await ready;
      })();
      try {
        await this.starting;
      } catch (error) {
        this.worker?.terminate();
        this.worker = void 0;
        throw error;
      } finally {
        this.starting = void 0;
        this.cancelStarting = void 0;
      }
    }
    failAll(error) {
      for (const pending of this.pending.values()) pending.reject(error);
      this.pending.clear();
    }
    async request(method, ...args) {
      await this.start();
      const id = ++this.nextId;
      return new Promise((resolve, reject) => {
        this.pending.set(id, { resolve, reject });
        this.worker.postMessage({ id, method, args });
      });
    }
    async open(file, verification) {
      if (!(file instanceof File)) throw new Error("Select a catalog file");
      const result = await this.request("open", file, verification);
      this.verification = verification;
      this.file = file;
      this.isOpen = true;
      return result;
    }
    async ensureOpen() {
      if (this.isOpen) return;
      if (!this.file) throw new Error("No catalog is open");
      if (!this.reopening) {
        const promise = this.request("open", this.file, this.verification).then(() => {
          this.isOpen = true;
        });
        this.reopening = promise;
        promise.finally(() => {
          if (this.reopening === promise) this.reopening = void 0;
        }).catch(() => {
        });
      }
      await this.reopening;
    }
    async operation(method, ...args) {
      const generation = this.generation;
      await this.ensureOpen();
      if (generation !== this.generation) throw new DOMException("Catalog operation cancelled", "AbortError");
      return this.request(method, ...args);
    }
    search(query, provider, limit) {
      return this.operation("search", query, provider, limit);
    }
    get(provider, id) {
      return this.operation("get", provider, id);
    }
    manifest() {
      return this.operation("manifest");
    }
    stats() {
      return this.operation("stats");
    }
    get hasFile() {
      return this.file instanceof File;
    }
    get selectedFile() {
      return this.file;
    }
    async close() {
      if (this.worker) await this.request("close");
      this.file = void 0;
      this.isOpen = false;
    }
    cancel() {
      this.generation++;
      this.cancelStarting?.();
      this.cancelStarting = void 0;
      if (this.worker) this.worker.terminate();
      this.worker = void 0;
      this.starting = void 0;
      this.failAll(new DOMException("Catalog operation cancelled", "AbortError"));
      this.isOpen = false;
      this.reopening = void 0;
    }
    dispose() {
      this.cancel();
      this.file = void 0;
    }
  };

  // catalog/src/browser-builder.mjs
  function browserBuildCapability() {
    if (!globalThis.isSecureContext) return { available: false, reason: "\u6D4F\u89C8\u5668\u6784\u5EFA\u9700\u8981\u5B89\u5168\u4E0A\u4E0B\u6587\uFF1B\u8BF7\u4F7F\u7528\u539F\u751F CLI" };
    if (!navigator.storage?.getDirectory) return { available: false, reason: "\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 OPFS\uFF1B\u8BF7\u4F7F\u7528\u539F\u751F CLI" };
    if (typeof Worker !== "function") return { available: false, reason: "\u6D4F\u89C8\u5668\u4E0D\u652F\u6301 Worker\uFF1B\u8BF7\u4F7F\u7528\u539F\u751F CLI" };
    return { available: true, reason: "\u652F\u6301\u56DB\u79CD\u672C\u5730\u6765\u6E90\u6863\u6848\uFF1B\u6D4F\u89C8\u5668\u8D44\u6E90\u4E0D\u8DB3\u65F6\u8BF7\u4F7F\u7528\u539F\u751F CLI" };
  }
  var BrowserCatalogBuilder = class {
    constructor(workerUrl, options = {}) {
      if (!workerUrl && !options.workerFactory) throw new Error("Build worker URL or factory is required");
      this.workerUrl = workerUrl;
      this.workerFactory = options.workerFactory;
      this.initOptions = options.initOptions;
      this.current = void 0;
      this.completed = void 0;
      this.generation = 0;
      this.busy = false;
    }
    async build(file, provider, sourceVersion) {
      if (this.busy) throw new Error("\u5DF2\u6709\u6784\u5EFA\u4EFB\u52A1");
      const capability = browserBuildCapability();
      if (!capability.available) throw new Error(capability.reason);
      if (!(file instanceof File)) throw new Error("\u8BF7\u9009\u62E9\u672C\u5730\u6765\u6E90\u6587\u4EF6");
      const generation = this.generation;
      this.busy = true;
      try {
        const root = await navigator.storage.getDirectory();
        const directory = await root.getDirectoryHandle("komga-catalog-build", { create: true });
        if (generation !== this.generation) throw new DOMException("Build cancelled", "AbortError");
        const nonce = crypto.randomUUID();
        const outputName = `output-${nonce}.sqlite`, sourceName = `source-${nonce}.sqlite`;
        const created = this.workerFactory ? await this.workerFactory() : new Worker(this.workerUrl, { type: "module" });
        const worker2 = created?.worker ?? created;
        const initOptions = created?.initOptions ?? this.initOptions;
        if (!worker2 || typeof worker2.postMessage !== "function") throw new Error("Build worker factory returned no Worker");
        const task = { worker: worker2, directory, sourceName, outputName, reject: void 0 };
        this.current = task;
        try {
          const result = await new Promise((resolve, reject) => {
            let settled = false;
            const fail = (error) => {
              if (!settled) {
                settled = true;
                reject(error);
              }
            };
            task.reject = fail;
            worker2.onmessage = ({ data }) => {
              if (data.type === "ready") {
                const payload = { file, directory, sourceName, outputName, provider, sourceVersion };
                worker2.postMessage(initOptions ? { type: "build", payload } : payload);
              } else if (data.type === "init-error") fail(new Error(data.error));
              else if (data.error) fail(new Error(data.error));
              else if (!settled) {
                settled = true;
                resolve(data.result);
              }
            };
            worker2.onerror = (event) => {
              event.preventDefault();
              fail(new Error(`Build worker failed: ${event.message || "startup error"} (Blob Worker may be blocked by browser CSP)`));
            };
            if (initOptions) {
              const payload = { ...initOptions };
              const transfer = payload.wasmBinary instanceof ArrayBuffer ? [payload.wasmBinary] : [];
              worker2.postMessage({ type: "init", payload }, transfer);
            } else {
              const payload = { file, directory, sourceName, outputName, provider, sourceVersion };
              worker2.postMessage(payload);
            }
          });
          if (generation !== this.generation) throw new DOMException("Build cancelled", "AbortError");
          const handle = await directory.getFileHandle(outputName);
          if (generation !== this.generation) throw new DOMException("Build cancelled", "AbortError");
          const previous = this.completed;
          if (previous) await previous.directory.removeEntry(previous.name);
          this.completed = { directory, handle, name: outputName };
          return result;
        } finally {
          worker2.terminate();
          if (this.current === task) this.current = void 0;
          await directory.removeEntry(sourceName).catch((error) => {
            if (error.name !== "NotFoundError") throw error;
          });
          if (this.completed?.name !== outputName)
            await directory.removeEntry(outputName).catch((error) => {
              if (error.name !== "NotFoundError") throw error;
            });
        }
      } finally {
        this.busy = false;
      }
    }
    async file() {
      if (!this.completed) throw new Error("\u6CA1\u6709\u5DF2\u5B8C\u6210\u7684\u76EE\u5F55");
      return this.completed.handle.getFile();
    }
    get ready() {
      return Boolean(this.completed);
    }
    async exportTo(writable, chunkSize = 1024 * 1024) {
      try {
        if (!Number.isInteger(chunkSize) || chunkSize < 4096 || chunkSize > 8 * 1024 * 1024)
          throw new Error("Invalid export chunk size");
        const generation = this.generation;
        const file = await this.file();
        for (let offset = 0; offset < file.size; offset += chunkSize) {
          if (generation !== this.generation) throw new DOMException("Export cancelled", "AbortError");
          await writable.write(await file.slice(offset, offset + chunkSize).arrayBuffer());
        }
        if (generation !== this.generation) throw new DOMException("Export cancelled", "AbortError");
        await writable.close();
        return file.size;
      } catch (error) {
        try {
          await writable.abort(error);
        } catch (abortError) {
          throw new AggregateError([error, abortError], "Export and abort both failed");
        }
        throw error;
      }
    }
    cancel() {
      this.generation++;
      if (this.current) {
        this.current.worker.terminate();
        this.current.reject?.(new DOMException("Build cancelled", "AbortError"));
      }
    }
    async dispose() {
      this.cancel();
      if (this.completed) {
        await this.completed.directory.removeEntry(this.completed.name);
        this.completed = void 0;
      }
    }
  };

  // catalog/src/analyzer.mjs
  var SCHEMA_VERSION = 1;
  var ANALYZER_VERSION = 1;

  // catalog/src/panel.mjs
  function url(value) {
    const parsed = new URL(value);
    if (!["https:", "http:"].includes(parsed.protocol) || parsed.username || parsed.password)
      throw new Error("\u4EC5\u652F\u6301\u65E0\u51ED\u636E\u7684 HTTP(S) \u5730\u5740");
    return parsed.href;
  }
  function validatePreparedManifest(manifest) {
    if (!manifest || manifest.schema_version !== SCHEMA_VERSION || manifest.analyzer_version !== ANALYZER_VERSION || !Array.isArray(manifest.catalogs))
      throw new Error("\u9884\u5236\u76EE\u5F55\u6E05\u5355\u7248\u672C\u6216\u683C\u5F0F\u9519\u8BEF");
    return manifest.catalogs.map((item) => {
      if (!item || !["bangumi", "ehentai", "mangabaka", "bookwalker"].includes(item.provider) || typeof item.source_version !== "string" || typeof item.url !== "string") throw new Error("\u9884\u5236\u76EE\u5F55\u6E05\u5355\u6761\u76EE\u9519\u8BEF");
      if (item.schema_version !== void 0 && item.schema_version !== SCHEMA_VERSION)
        throw new Error("\u6E05\u5355\u76EE\u5F55 schema \u7248\u672C\u4E0D\u517C\u5BB9");
      if (item.analyzer_version !== void 0 && item.analyzer_version !== ANALYZER_VERSION)
        throw new Error("\u6E05\u5355\u76EE\u5F55 analyzer \u7248\u672C\u4E0D\u517C\u5BB9");
      if (item.size_bytes !== void 0 && (!Number.isSafeInteger(item.size_bytes) || item.size_bytes < 1))
        throw new Error("\u6E05\u5355\u6587\u4EF6\u5927\u5C0F\u683C\u5F0F\u9519\u8BEF");
      if (item.sha256 !== void 0 && !/^[a-f0-9]{64}$/i.test(item.sha256))
        throw new Error("\u6E05\u5355 SHA-256 \u683C\u5F0F\u9519\u8BEF");
      return {
        provider: item.provider,
        source_version: item.source_version,
        url: url(item.url),
        size_bytes: item.size_bytes,
        sha256: item.sha256?.toLowerCase(),
        schema_version: item.schema_version,
        analyzer_version: item.analyzer_version
      };
    });
  }
  function mountCatalogPanel(container, client, options = {}) {
    const root = document.createElement("section");
    root.dataset.kmCatalog = "1";
    const spinnerStyle = document.createElement("style");
    spinnerStyle.textContent = 'section[data-km-catalog] p[role=status]:empty::before{content:"";display:inline-block;width:12px;height:12px;border:2px solid #bbb;border-right-color:#444;border-radius:50%;animation:kmdb-spin .7s linear infinite}@keyframes kmdb-spin{to{transform:rotate(360deg)}}';
    root.append(spinnerStyle);
    const panelController = new AbortController();
    const heading = document.createElement("h3");
    heading.textContent = "\u672C\u5730\u76EE\u5F55";
    const status2 = document.createElement("p");
    status2.textContent = "\u9009\u62E9\u9884\u5236 SQLite";
    status2.setAttribute("role", "status");
    const file = document.createElement("input");
    file.type = "file";
    file.accept = ".sqlite,.db";
    file.setAttribute("aria-label", "\u672C\u5730\u6570\u636E\u5E93\u6587\u4EF6");
    let selectionGeneration = 0;
    let expectedCatalog;
    const checkManifestCompatibility = (manifest, selectedFile) => {
      if (!expectedCatalog) return;
      if (manifest.provider !== expectedCatalog.provider || manifest.source_version !== expectedCatalog.source_version || expectedCatalog.schema_version !== void 0 && manifest.schema_version !== expectedCatalog.schema_version || expectedCatalog.analyzer_version !== void 0 && manifest.analyzer_version !== expectedCatalog.analyzer_version || expectedCatalog.size_bytes !== void 0 && selectedFile.size !== expectedCatalog.size_bytes)
        throw new Error("\u6240\u9009\u6587\u4EF6\u4E0E\u6E05\u5355\u7248\u672C\u6216\u5927\u5C0F\u4E0D\u7B26");
    };
    file.addEventListener("change", async () => {
      if (!file.files?.[0]) return;
      const generation = ++selectionGeneration;
      const previousFile = client.selectedFile;
      status2.textContent = "";
      try {
        const selectedFile = file.files[0];
        const m = await client.open(selectedFile, { sha256: expectedCatalog?.sha256 });
        checkManifestCompatibility(m, selectedFile);
        if (generation === selectionGeneration) status2.textContent = `${m.provider} \xB7 ${m.source_version}`;
      } catch (error) {
        if (client.selectedFile !== previousFile) {
          try {
            if (previousFile) await client.open(previousFile);
            else await client.close();
          } catch (restoreError) {
            if (generation === selectionGeneration)
              status2.textContent = `\u6253\u5F00\u5931\u8D25\uFF1A${error.message}\uFF1B\u6062\u590D\u5931\u8D25\uFF1A${restoreError.message}`;
            return;
          }
        }
        if (generation === selectionGeneration) status2.textContent = `\u6253\u5F00\u5931\u8D25\uFF1A${error.message}`;
      }
    });
    if (client.hasFile) {
      const generation = ++selectionGeneration;
      status2.textContent = "";
      void client.manifest().then((m) => {
        if (generation === selectionGeneration) status2.textContent = `${m.provider} \xB7 ${m.source_version}`;
      }, (error) => {
        if (generation === selectionGeneration) status2.textContent = `\u6062\u590D\u5931\u8D25\uFF1A${error.message}`;
      });
    }
    const details = document.createElement("details");
    const summary = document.createElement("summary");
    summary.textContent = "\u4E0B\u8F7D\u4E0E\u9AD8\u7EA7\u64CD\u4F5C";
    const explanation = document.createElement("p");
    explanation.textContent = "\u9884\u5236\u5E93\u53EF\u76F4\u63A5\u9009\u62E9\uFF1B\u539F\u59CB\u6863\u6848\u9700\u6784\u5EFA\u3002\u63D0\u4F9B\u6821\u9A8C\u503C\u65F6\uFF0C\u6309\u5757\u6838\u9A8C SHA-256\u3002";
    const archiveLinks = document.createElement("div");
    const archives = [
      ["Bangumi \xB7 \u6700\u65B0\u539F\u59CB JSONL ZIP", "https://github.com/bangumi/Archive/releases/tag/archive"],
      ["E-Hentai \xB7 RAW SQLite Zstandard", "https://github.com/URenko/e-hentai-db/releases/download/nightly/e-hentai.db.zstd"],
      ["MangaBaka \xB7 RAW SQLite gzip-tar", "https://api.mangabaka.org/v1/database/series.sqlite.tar.gz"],
      ["BookWalker \xB7 RAW SQLite Zstandard", "https://static.bookwalker.com/data/bkwk-db.sqlite.zst"]
    ];
    for (const [label, href2] of archives) {
      const link = document.createElement("a");
      link.textContent = label;
      link.href = href2;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      if (label.startsWith("Bangumi")) link.addEventListener("click", async (event) => {
        event.preventDefault();
        status2.textContent = "";
        try {
          if (!options.fetchManifest) throw new Error("\u7F3A\u5C11\u8DE8\u57DF\u8BF7\u6C42\u6743\u9650");
          const latest = await options.fetchManifest("https://raw.githubusercontent.com/bangumi/Archive/master/aux/latest.json", panelController.signal);
          const href3 = url(latest.browser_download_url);
          if (!href3.startsWith("https://github.com/bangumi/Archive/releases/download/")) throw new Error("\u6765\u6E90\u5730\u5740\u4E0D\u7B26");
          await startDownload(href3, "bangumi-source.zip");
          status2.textContent = "\u539F\u59CB\u6863\u6848\u5DF2\u4E0B\u8F7D";
        } catch (error) {
          status2.textContent = `\u4E0B\u8F7D\u5931\u8D25\uFF1A${error.message}`;
        }
      });
      archiveLinks.append(link, document.createTextNode(" \xB7 "));
    }
    const address = document.createElement("input");
    address.type = "url";
    address.placeholder = "\u9884\u5236\u6570\u636E\u5E93\u6216\u6E05\u5355 URL";
    address.addEventListener("input", () => {
      expectedCatalog = void 0;
    });
    const download2 = document.createElement("button");
    download2.type = "button";
    download2.textContent = "\u4E0B\u8F7D\u6570\u636E\u5E93";
    const cancelDownload = document.createElement("button");
    cancelDownload.type = "button";
    cancelDownload.textContent = "\u53D6\u6D88\u4E0B\u8F7D";
    cancelDownload.disabled = true;
    let downloadController;
    const startDownload = async (href2, filename) => {
      if (!options.download) throw new Error("\u672A\u914D\u7F6E GM_download");
      downloadController?.abort();
      downloadController = new AbortController();
      cancelDownload.disabled = false;
      try {
        await options.download(href2, filename, downloadController.signal);
      } finally {
        cancelDownload.disabled = true;
        downloadController = void 0;
      }
    };
    cancelDownload.addEventListener("click", () => downloadController?.abort());
    download2.addEventListener("click", async () => {
      try {
        const href2 = url(address.value);
        status2.textContent = "";
        await startDownload(href2, "catalog.sqlite");
        status2.textContent = "\u4E0B\u8F7D\u5B8C\u6210\uFF0C\u8BF7\u9009\u62E9\u6587\u4EF6";
      } catch (error) {
        status2.textContent = `\u4E0B\u8F7D\u5931\u8D25\uFF1A${error.message}`;
      }
    });
    const loadManifest = document.createElement("button");
    loadManifest.type = "button";
    loadManifest.textContent = "\u8BFB\u53D6\u6E05\u5355";
    const choices = document.createElement("select");
    choices.setAttribute("aria-label", "\u9884\u5236\u76EE\u5F55");
    const manifestDownload = document.createElement("button");
    manifestDownload.type = "button";
    manifestDownload.textContent = "\u4E0B\u8F7D\u6240\u9009\u76EE\u5F55";
    loadManifest.addEventListener("click", async () => {
      try {
        choices.replaceChildren();
        if (!options.fetchManifest) throw new Error("\u672A\u914D\u7F6E\u8DE8\u57DF\u6E05\u5355\u8BFB\u53D6");
        const catalogs = validatePreparedManifest(await options.fetchManifest(url(address.value), panelController.signal));
        for (const item of catalogs) {
          const opt = document.createElement("option");
          opt.value = item.url;
          const info = [
            item.provider,
            item.source_version,
            item.size_bytes ? `${(item.size_bytes / 1024 / 1024).toFixed(1)} MiB` : "",
            item.sha256 ? `\u6E05\u5355 SHA-256 ${item.sha256.slice(0, 12)}\u2026` : "",
            `schema ${item.schema_version ?? SCHEMA_VERSION}`,
            `analyzer ${item.analyzer_version ?? ANALYZER_VERSION}`
          ].filter(Boolean).join(" \xB7 ");
          opt.textContent = info;
          opt.dataset.filename = `${item.provider}.sqlite`;
          choices.append(opt);
          opt.dataset.provider = item.provider;
          opt.dataset.sourceVersion = item.source_version;
          if (item.sha256 !== void 0) opt.dataset.sha256 = item.sha256;
          if (item.size_bytes !== void 0) opt.dataset.sizeBytes = String(item.size_bytes);
          if (item.schema_version !== void 0) opt.dataset.schemaVersion = String(item.schema_version);
          if (item.analyzer_version !== void 0) opt.dataset.analyzerVersion = String(item.analyzer_version);
        }
        status2.textContent = catalogs.length ? "\u9009\u62E9\u9884\u5236\u76EE\u5F55" : "\u6E05\u5355\u6CA1\u6709\u9884\u5236\u76EE\u5F55\uFF1B\u8BF7\u4F7F\u7528 CLI \u6784\u5EFA";
      } catch (error) {
        status2.textContent = `\u6E05\u5355\u8BFB\u53D6\u5931\u8D25\uFF1A${error.message}`;
      }
    });
    manifestDownload.addEventListener("click", async () => {
      try {
        if (!choices.value) throw new Error("\u6CA1\u6709\u53EF\u4E0B\u8F7D\u7684\u76EE\u5F55");
        status2.textContent = "";
        const selected = choices.selectedOptions[0];
        await startDownload(url(choices.value), selected?.dataset.filename || "catalog.sqlite");
        expectedCatalog = selected ? {
          provider: selected.dataset.provider,
          source_version: selected.dataset.sourceVersion,
          sha256: selected.dataset.sha256,
          size_bytes: selected.dataset.sizeBytes === void 0 ? void 0 : Number(selected.dataset.sizeBytes),
          schema_version: selected.dataset.schemaVersion === void 0 ? void 0 : Number(selected.dataset.schemaVersion),
          analyzer_version: selected.dataset.analyzerVersion === void 0 ? void 0 : Number(selected.dataset.analyzerVersion)
        } : void 0;
        status2.textContent = "\u4E0B\u8F7D\u5B8C\u6210\uFF0C\u8BF7\u9009\u62E9\u6587\u4EF6";
      } catch (error) {
        status2.textContent = `\u4E0B\u8F7D\u5931\u8D25\uFF1A${error.message}`;
      }
    });
    const advanced = document.createElement("div");
    const capability = document.createElement("p");
    const detected = browserBuildCapability();
    const buildConfigured = Boolean(options.buildWorkerUrl || options.buildWorkerFactory || options.builder);
    capability.textContent = buildConfigured ? detected.reason : "\u672A\u914D\u7F6E\u6784\u5EFA Worker\uFF1B\u8BF7\u4F7F\u7528\u539F\u751F CLI\u3002";
    advanced.append(capability);
    let builder = options.builder;
    const ownsBuilder = !builder;
    if ((options.buildWorkerUrl || options.buildWorkerFactory || builder) && detected.available) {
      builder ??= new BrowserCatalogBuilder(options.buildWorkerUrl, {
        workerFactory: options.buildWorkerFactory,
        initOptions: options.buildInitOptions
      });
      const source = document.createElement("select");
      source.setAttribute("aria-label", "\u6784\u5EFA\u6765\u6E90");
      for (const id of ["bangumi", "ehentai", "mangabaka", "bookwalker"]) {
        const option2 = document.createElement("option");
        option2.value = id;
        option2.textContent = id;
        source.append(option2);
      }
      const archive = document.createElement("input");
      archive.type = "file";
      archive.setAttribute("aria-label", "\u6765\u6E90\u6863\u6848");
      const version = document.createElement("input");
      version.placeholder = "\u6765\u6E90\u7248\u672C\uFF08\u53EF\u9009\uFF09";
      const build = document.createElement("button");
      build.type = "button";
      build.textContent = "\u6784\u5EFA\u672C\u5730\u76EE\u5F55";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "\u53D6\u6D88\u6784\u5EFA\u6216\u5BFC\u51FA";
      const exportButton = document.createElement("button");
      exportButton.type = "button";
      exportButton.textContent = "\u5206\u5757\u5BFC\u51FA";
      const openButton = document.createElement("button");
      openButton.type = "button";
      openButton.textContent = "\u6253\u5F00\u6784\u5EFA\u7ED3\u679C";
      build.addEventListener("click", async () => {
        try {
          if (!archive.files?.[0]) throw new Error("\u8BF7\u9009\u62E9\u6765\u6E90\u6863\u6848");
          status2.textContent = "";
          build.disabled = true;
          const result = await builder.build(archive.files[0], source.value, version.value);
          status2.textContent = `\u6784\u5EFA\u5B8C\u6210\uFF1A${result.provider} \xB7 ${result.count} \u6761\uFF1B\u53EF\u6253\u5F00\u6216\u5BFC\u51FA`;
        } catch (error) {
          status2.textContent = `\u6784\u5EFA\u5931\u8D25\uFF1A${error.message}`;
        } finally {
          build.disabled = false;
        }
      });
      cancel.addEventListener("click", () => {
        builder.cancel();
        status2.textContent = "\u5DF2\u53D6\u6D88";
      });
      openButton.addEventListener("click", async () => {
        try {
          const manifest = await client.open(await builder.file());
          status2.textContent = `${manifest.provider} \xB7 ${manifest.source_version}`;
        } catch (error) {
          status2.textContent = `\u6253\u5F00\u5931\u8D25\uFF1A${error.message}`;
        }
      });
      exportButton.addEventListener("click", async () => {
        try {
          if (!builder.ready) throw new Error("\u6CA1\u6709\u5DF2\u5B8C\u6210\u7684\u76EE\u5F55");
          if (typeof globalThis.showSaveFilePicker === "function") {
            const handle = await globalThis.showSaveFilePicker({ suggestedName: "catalog.sqlite" });
            status2.textContent = "";
            await builder.exportTo(await handle.createWritable());
            status2.textContent = "\u5BFC\u51FA\u5B8C\u6210";
          } else {
            const exportFile = await builder.file();
            const objectUrl = URL.createObjectURL(exportFile);
            exportUrls.add(objectUrl);
            const anchor = document.createElement("a");
            anchor.href = objectUrl;
            anchor.download = "catalog.sqlite";
            anchor.hidden = true;
            root.append(anchor);
            anchor.click();
            anchor.remove();
            exportedFiles.push(exportFile);
            status2.textContent = "\u5DF2\u5F00\u59CB\u4E0B\u8F7D";
          }
        } catch (error) {
          status2.textContent = `\u5BFC\u51FA\u5931\u8D25\uFF1A${error.message}`;
        }
      });
      advanced.append(source, archive, version, build, cancel, openButton, exportButton);
    }
    details.append(summary, explanation, archiveLinks, address, download2, cancelDownload, loadManifest, choices, manifestDownload, advanced);
    root.append(heading, file, status2, details);
    container.append(root);
    const exportUrls = /* @__PURE__ */ new Set();
    const exportedFiles = [];
    return async () => {
      panelController.abort();
      downloadController?.abort();
      if (ownsBuilder && builder) await builder.dispose();
      else builder?.cancel();
      for (const objectUrl of exportUrls) URL.revokeObjectURL(objectUrl);
      exportedFiles.length = 0;
      root.remove();
    };
  }
  function catalogProvider(client, provider) {
    if (!["bangumi", "ehentai", "mangabaka", "bookwalker"].includes(provider))
      throw new Error(`\u4E0D\u652F\u6301\u7684\u672C\u5730\u76EE\u5F55\u6765\u6E90\uFF1A${provider}`);
    return {
      id: provider,
      capabilities: { series: provider !== "ehentai", volumes: ["bangumi", "bookwalker"].includes(provider), volumeMetadata: ["bangumi", "bookwalker"].includes(provider), gallery: provider === "ehentai", offline: true },
      available: () => Boolean(client.file),
      async search(query, context) {
        if (context.signal.aborted) throw new DOMException("\u5DF2\u53D6\u6D88", "AbortError");
        const abort = () => client.cancel();
        context.signal.addEventListener("abort", abort, { once: true });
        try {
          return await client.search(query, provider);
        } finally {
          context.signal.removeEventListener("abort", abort);
        }
      },
      async get(id, context) {
        if (context.signal.aborted) throw new DOMException("\u5DF2\u53D6\u6D88", "AbortError");
        const abort = () => client.cancel();
        context.signal.addEventListener("abort", abort, { once: true });
        try {
          return await client.get(provider, id);
        } finally {
          context.signal.removeEventListener("abort", abort);
        }
      },
      async resolveLink(input2, context) {
        if (context?.signal.aborted) throw new DOMException("\u5DF2\u53D6\u6D88", "AbortError");
        if (provider === "bookwalker" && /^(?:CNT|PRD)_[\w-]+$/.test(input2)) return input2;
        if (["bangumi", "mangabaka"].includes(provider) && /^\d+$/.test(input2)) return input2;
        if (provider === "ehentai" && /^[1-9]\d*:[a-f0-9]{10}$/i.test(input2)) return input2.toLowerCase();
        const u = new URL(input2);
        const path = u.pathname.split("/").filter(Boolean);
        if (provider === "bangumi" && ["bgm.tv", "bangumi.tv", "chii.in"].includes(u.hostname) && path[0] === "subject" && /^\d+$/.test(path[1] ?? "")) return path[1];
        if (provider === "ehentai" && ["e-hentai.org", "exhentai.org"].includes(u.hostname) && path[0] === "g" && /^[1-9]\d*$/.test(path[1] ?? "") && /^[a-f0-9]{10}$/i.test(path[2] ?? "")) return `${path[1]}:${path[2].toLowerCase()}`;
        if (provider === "mangabaka" && ["mangabaka.org", "www.mangabaka.org"].includes(u.hostname) && ["manga", "series"].includes(path[0]) && /^\d+$/.test(path[1] ?? "")) return path[1];
        if (provider === "bookwalker" && ["bookwalker.com", "www.bookwalker.com"].includes(u.hostname) && path[0] === "series" && /^[\w-]+$/.test(path[1] ?? ""))
          return path[1].startsWith("CNT_") ? path[1] : `CNT_${path[1]}`;
        throw new Error("\u8BE5\u6765\u6E90\u7684\u94FE\u63A5\u65E0\u6CD5\u89E3\u6790\uFF0C\u8BF7\u4F7F\u7528\u76EE\u5F55 ID");
      }
    };
  }

  // src/catalog-extension.ts
  var providers = ["bangumi", "ehentai", "mangabaka", "bookwalker"];
  var base = workerAssetBase || "https://raw.githubusercontent.com/gamesgao/komga-metadata-userscript/main/dist/catalog/";
  var wasmRequest;
  var sourceCache = /* @__PURE__ */ new Map();
  function request(url2, responseType, signal) {
    return new Promise((resolve, reject) => {
      let handle;
      let settled = false;
      const finish2 = (action) => {
        if (settled) return;
        settled = true;
        signal?.removeEventListener("abort", abort);
        action();
      };
      const abort = () => {
        finish2(() => reject(new DOMException("Catalog asset request cancelled", "AbortError")));
        handle?.abort();
      };
      if (signal?.aborted) {
        abort();
        return;
      }
      signal?.addEventListener("abort", abort, { once: true });
      try {
        handle = GM_xmlhttpRequest({
          url: url2,
          method: "GET",
          responseType,
          timeout: 3e4,
          onload: (response) => {
            if (response.status < 200 || response.status >= 300) {
              finish2(() => reject(new Error(`Catalog asset HTTP ${response.status}`)));
              return;
            }
            const result = responseType === "arraybuffer" ? response.response : response.responseText ?? response.response;
            if (responseType === "arraybuffer" && !(result instanceof ArrayBuffer)) {
              finish2(() => reject(new Error("Catalog asset response was not binary")));
              return;
            }
            if (responseType === "text" && typeof result !== "string") {
              finish2(() => reject(new Error("Catalog worker response was not text")));
              return;
            }
            finish2(() => resolve(result));
          },
          onerror: (error) => finish2(() => reject(new Error(`Catalog asset request failed: ${error?.error ?? error?.details ?? "network error"}`))),
          ontimeout: () => finish2(() => reject(new Error("Catalog asset request timed out")))
        });
      } catch (error) {
        finish2(() => reject(error instanceof Error ? error : new Error(String(error))));
      }
    });
  }
  function wasm(signal) {
    if (!wasmRequest) {
      wasmRequest = request(new URL("sqlite/sqlite3.wasm", base).href, "arraybuffer", signal).then((result) => result).catch((error) => {
        wasmRequest = void 0;
        throw error;
      });
    }
    return wasmRequest;
  }
  async function worker(name, signal) {
    let scriptPromise = sourceCache.get(name);
    if (!scriptPromise) {
      scriptPromise = request(new URL(name, base).href, "text", signal).then((result) => result);
      sourceCache.set(name, scriptPromise);
      scriptPromise.catch(() => {
        if (sourceCache.get(name) === scriptPromise) sourceCache.delete(name);
      });
    }
    const [script, binary] = await Promise.all([scriptPromise, wasm(signal)]);
    const objectUrl = URL.createObjectURL(new Blob([script], { type: "text/javascript" }));
    try {
      const instance = new Worker(objectUrl, { type: "module" });
      URL.revokeObjectURL(objectUrl);
      return { worker: instance, initOptions: { wasmBinary: binary.slice(0) } };
    } catch (error) {
      URL.revokeObjectURL(objectUrl);
      throw new Error(`Blob Worker blocked by browser CSP: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  function download(url2, name, signal) {
    return new Promise((resolve, reject) => {
      let handle;
      let finished = false;
      const finish2 = (error) => {
        if (finished) return;
        finished = true;
        signal.removeEventListener("abort", abort);
        if (error) reject(error);
        else resolve();
      };
      const abort = () => {
        finish2(new DOMException("\u5DF2\u53D6\u6D88\u4E0B\u8F7D", "AbortError"));
        handle?.abort();
      };
      if (signal.aborted) {
        abort();
        return;
      }
      signal.addEventListener("abort", abort, { once: true });
      try {
        handle = GM_download({
          url: url2,
          name,
          onload: () => finish2(),
          onerror: (error) => finish2(new Error(`\u4E0B\u8F7D\u5931\u8D25\uFF1A${error?.error ?? error?.details ?? `HTTP ${error?.status ?? "\u7F51\u7EDC\u9519\u8BEF"}`}`)),
          ontimeout: () => finish2(new Error("\u4E0B\u8F7D\u8D85\u65F6"))
        });
        if (signal.aborted) abort();
      } catch (error) {
        finish2(error instanceof Error ? error : new Error(String(error)));
      }
    });
  }
  function fetchManifest(url2, signal) {
    return request(url2, "text", signal).then((text2) => {
      try {
        return JSON.parse(text2);
      } catch (error) {
        throw new Error(`\u6E05\u5355 JSON \u9519\u8BEF\uFF1A${error instanceof Error ? error.message : String(error)}`);
      }
    });
  }
  function createCatalogExtension() {
    let assetController;
    const loadWorker = (name) => {
      if (!assetController) throw new Error("\u79BB\u7EBF\u8D44\u6E90\u8BF7\u6C42\u5DF2\u5173\u95ED");
      return worker(name, assetController.signal);
    };
    const client = new CatalogClient(void 0, { workerFactory: () => loadWorker("catalog-worker.js") });
    const builder = new BrowserCatalogBuilder(void 0, {
      workerFactory: () => loadWorker("catalog-build-worker.js")
    });
    let mounted = false;
    return {
      providers: providers.map((provider) => catalogProvider(client, provider)),
      mount(container) {
        if (mounted) throw new Error("\u79BB\u7EBF\u76EE\u5F55\u9762\u677F\u5DF2\u6302\u8F7D");
        mounted = true;
        assetController = new AbortController();
        const unmount = mountCatalogPanel(container, client, {
          download,
          fetchManifest,
          builder
        });
        return async () => {
          assetController?.abort();
          try {
            await unmount();
          } finally {
            assetController = void 0;
            mounted = false;
            client.cancel();
          }
        };
      },
      async dispose() {
        assetController?.abort();
        client.dispose();
        await builder.dispose();
        mounted = false;
      }
    };
  }

  // src/entry.ts
  function activate() {
    const deployment = detectKomga(document, location);
    if (!deployment) return false;
    const transport = new GMTransport(), registry = createRegistry(transport), client = new KomgaClient(deployment);
    const writer = new Writer(client, transport);
    const translation = new EhTagTranslation(transport);
    const catalog = createCatalogExtension();
    const launch = () => {
      if (!detectKomga(document, location)) return;
      if (document.getElementById("komga-metadata-panel")) return;
      new Panel(registry, client, writer, translation).mount(catalog);
    };
    window.addEventListener("pagehide", () => {
      void Promise.resolve(catalog.dispose()).catch((error) => console.error("Catalog cleanup failed", error));
    }, { once: true });
    GM_registerMenuCommand("\u5143\u6570\u636E\uFF1A\u5F53\u524D\u7CFB\u5217", launch);
    const host = document.createElement("div");
    host.id = "komga-metadata-launcher";
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147482999";
    const shadow = host.attachShadow({ mode: "open" }), button2 = document.createElement("button");
    button2.textContent = "\u5143\u6570\u636E";
    button2.prepend(icon("layers"));
    const style = document.createElement("style");
    style.textContent = "button{display:flex;align-items:center;gap:8px;font:500 13px system-ui;padding:11px 16px;cursor:pointer;border:1px solid #ffffff30;border-radius:12px;background:#4f46e5;color:#fff;box-shadow:0 6px 24px #15133d33}button:hover{background:#4338ca}button:focus-visible{outline:2px solid #a6a0ff;outline-offset:3px}svg{width:18px;height:18px}";
    button2.addEventListener("click", launch);
    shadow.append(style, button2);
    document.body.append(host);
    return true;
  }
  if (!activate()) {
    const observer = new MutationObserver(() => {
      if (activate()) observer.disconnect();
    });
    observer.observe(document.documentElement, { subtree: true, childList: true });
    setTimeout(() => observer.disconnect(), 3e4);
  }
})();
