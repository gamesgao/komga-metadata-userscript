// ==UserScript==
// @name         Komga 元数据
// @namespace    https://github.com/gamesgao/komga-metadata-userscript
// @version      0.1.0
// @description  桌面 Komga 元数据搜索、预览与安全写入（组件 1）
// @license      MIT
// @match        http://*/*
// @match        https://*/*
// @grant        GM_xmlhttpRequest
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
  function record(provider, id, url, raw) {
    return { provider, id, url, raw, titles: [], tags: [], genres: [], authors: [], covers: [], links: [{ label: provider, url }] };
  }
  function candidate(provider, id, title, url) {
    return { provider, id, title: required(title), url };
  }
  async function json(t, url, signal, body, headers) {
    const r = await t.request({ url, method: body === void 0 ? "GET" : "POST", headers: { Accept: "application/json", ...body === void 0 ? {} : { "Content-Type": "application/json" }, ...headers }, body: body === void 0 ? void 0 : JSON.stringify(body) }, signal);
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
    const base = doc.querySelector("base[href]")?.getAttribute("href");
    if (base) {
      const u = new URL(base, location2.origin + location2.pathname);
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

  // src/transport.ts
  var storage = {
    get(key, fallback) {
      return GM_getValue(key, fallback);
    },
    set(key, value) {
      GM_setValue(key, value);
    }
  };
  function safeUrl(input2) {
    let url;
    try {
      url = new URL(input2);
    } catch {
      throw new MetadataError("invalid-id", "\u94FE\u63A5\u683C\u5F0F\u65E0\u6548");
    }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new MetadataError("invalid-id", "\u4EC5\u652F\u6301\u65E0\u5185\u5D4C\u51ED\u636E\u7684 HTTP(S) \u94FE\u63A5");
    return url.href;
  }
  var GMTransport = class {
    request(input2, signal) {
      cancelled(signal);
      const url = safeUrl(input2.url);
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
          url,
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
            resolve({ status: r.status, headers, text: r.responseText ?? "", blob: r.response instanceof Blob ? r.response : void 0, finalUrl: r.finalUrl || url });
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
            if (response.status < 200 || response.status >= 300) throw new MetadataError(response.status === 401 || response.status === 403 ? "authentication-required" : "http", `\u6765\u6E90 HTTP ${response.status}`, response.status);
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
    if (str(localized) && localized !== native) r.titles.push({ text: str(localized), type: "localized" });
    if (!r.titles.length) throw new MetadataError("invalid-response", "\u6765\u6E90\u7F3A\u5C11\u6807\u9898");
  }
  function addCover(r, value, number, language) {
    if (str(value)) r.covers.push({ url: safeUrl(str(value)), volume: number, language });
  }
  async function pages(t, base, c) {
    const rows = [];
    for (let page = 0; page < 10; page++) {
      const data = await json(t, `${base}${base.includes("?") ? "&" : "?"}limit=100&offset=${page * 100}`, c.signal);
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
        return candidate(this.id, id, required(x.name), `https://bgm.tv/subject/${id}`);
      });
    }
    async get(id, c) {
      numeric(id);
      const base = `https://next.bgm.tv/p1/subjects/${id}`;
      const x = await json(this.t, base, c.signal);
      checkId(x.id, id);
      const staff = await pages(this.t, `${base}/staffs/persons`, c);
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
          if (role) r.authors.push({ name: required(person.name), native: required(person.name), localized: str(person.nameCN) || void 0, role });
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
        const relations = await pages(this.t, `${base}/relations?type=1&offprint=true`, c);
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
        return candidate(this.id, numeric(idText(row.series_id)), required(row.title), required(row.url));
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
        const url = str(s.x3) || str(s.x2) || str(s.x1);
        if (url) return url;
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
        return candidate(this.id, id, str(row.native_title) || str(row.title) || required(list(row.titles).map((v2) => obj(v2).title)[0]), str(row.canonical_url) || `https://mangabaka.org/manga/${id}`);
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
  var MangaDex = class {
    constructor(t) {
      this.t = t;
    }
    id = "mangadex";
    capabilities = { series: true, volumes: true, volumeMetadata: false, volumeCovers: true };
    validate(id) {
      if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id)) throw new MetadataError("invalid-id", "\u9700\u8981 MangaDex UUID");
      return id;
    }
    async resolveLink(input2) {
      return this.validate(input2.includes("://") ? linkId(input2, ["mangadex.org", "www.mangadex.org"], /^\/title\/([^/]+)/) : input2);
    }
    async search(q, c) {
      const x = await json(this.t, `https://api.mangadex.org/manga?title=${encodeURIComponent(q)}&limit=20`, c.signal);
      return arr(x.data).map((v) => {
        const row = obj(v);
        const id = this.validate(idText(row.id));
        const title = obj(obj(row.attributes).title);
        return candidate(this.id, id, required(title.ja || Object.values(title)[0]), `https://mangadex.org/title/${id}`);
      });
    }
    async get(id, c) {
      this.validate(id);
      const x = obj((await json(this.t, `https://api.mangadex.org/manga/${id}?includes[]=author&includes[]=artist`, c.signal)).data);
      checkId(x.id, id);
      const a = obj(x.attributes), r = record(this.id, id, `https://mangadex.org/title/${id}`, x);
      r.language = str(a.originalLanguage) || void 0;
      for (const entry of [obj(a.title), ...list(a.altTitles).map(obj)]) for (const [language, text2] of Object.entries(entry)) {
        r.titles.push({ text: required(text2), language, type: language === a.originalLanguage ? "native" : "alias" });
      }
      if (!r.titles.length) throw new MetadataError("invalid-response", "MangaDex \u7F3A\u5C11\u6807\u9898");
      r.summary = a.description ? str(obj(a.description)[r.language ?? ""] || obj(a.description).en || Object.values(obj(a.description))[0]) || void 0 : void 0;
      r.status = status(a.status);
      r.ageRating = a.contentRating === "pornographic" || a.contentRating === "erotica" ? 18 : void 0;
      r.tags = list(a.tags).map((v) => {
        const name = obj(obj(obj(v).attributes).name);
        return required(name.en || Object.values(name)[0]);
      });
      for (const v of list(x.relationships)) {
        const rel = obj(v);
        if (["author", "artist"].includes(str(rel.type))) r.authors.push({ name: required(obj(rel.attributes).name), role: rel.type === "artist" ? "penciller" : "writer" });
      }
      for (let offset = 0; offset < 1e3; offset += 100) {
        const covers = await json(this.t, `https://api.mangadex.org/cover?manga[]=${id}&limit=100&offset=${offset}`, c.signal);
        for (const v of arr(covers.data)) {
          const attributes = obj(obj(v).attributes);
          const n = /^\d+(?:\.\d+)?$/.test(str(attributes.volume)) ? Number(attributes.volume) : void 0;
          const filename = required(attributes.fileName);
          if (!/^[\w.-]+$/.test(filename)) throw new MetadataError("invalid-response", "\u975E\u6CD5\u5C01\u9762\u6587\u4EF6\u540D");
          addCover(r, `https://uploads.mangadex.org/covers/${id}/${filename}`, n, str(attributes.locale) || void 0);
        }
        if (arr(covers.data).length < 100 || typeof covers.total === "number" && offset + 100 >= covers.total) return r;
      }
      throw new MetadataError("unavailable", "\u5C01\u9762\u5206\u9875\u8D85\u8FC7\u5B89\u5168\u4E0A\u9650");
    }
  };
  var aniFields = `id siteUrl title { native romaji english } description(asHtml:false) status genres startDate { year month day } coverImage { extraLarge large } staff(perPage:50) { pageInfo { hasNextPage } edges { role node { name { native full } } } }`;
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
      const data = await this.query("query($q:String){Page(perPage:20){media(search:$q,type:MANGA){id siteUrl title{native romaji english}}}}", { q }, c);
      return arr(obj(data.Page).media).map((v) => {
        const row = obj(v), t = obj(row.title);
        return candidate(this.id, numeric(idText(row.id)), required(t.native || t.english || t.romaji), required(row.siteUrl));
      });
    }
    async get(id, c) {
      numeric(id);
      const x = obj((await this.query(`query($id:Int){Media(id:$id,type:MANGA){${aniFields}}}`, { id: Number(id) }, c)).Media);
      checkId(x.id, id);
      const r = record(this.id, id, required(x.siteUrl), x), t = obj(x.title);
      titles(r, t.native || t.romaji || t.english, t.english);
      if (str(t.romaji)) r.titles.push({ text: str(t.romaji), type: "alias" });
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
        const row = obj(obj(v).node), id = numeric(idText(row.id));
        return candidate(this.id, id, required(row.title), `https://myanimelist.net/manga/${id}`);
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
        const row = obj(v);
        return candidate(this.id, `4050-${numeric(idText(row.id))}`, required(row.name), required(row.site_detail_url));
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
  function href(value, base) {
    return safeUrl(new URL(value, base).href);
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
      const config = this.config(c), base = `https://${config.host}/`;
      const response = await this.t.request({ url: `${base}?f_search=${encodeURIComponent(q)}`, cookie: config.cookie }, c.signal);
      const doc = documentOf(response.text);
      known(doc, ".itg, #searchbox, #searchnav, .searchtext");
      const found = /* @__PURE__ */ new Map();
      for (const a of doc.querySelectorAll("a[href]")) {
        const u = new URL(a.getAttribute("href"), base);
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
        const source = await this.t.request({ url: `${this.base}/search` }, c.signal);
        const key = source.text.match(/"search_key"\s*:\s*"(search-[\w-]+)"/)?.[1];
        if (!key) throw new MetadataError("unavailable", "YenPress \u516C\u5F00\u641C\u7D22\u914D\u7F6E\u5DF2\u53D8\u5316\uFF0C\u53EF\u7C98\u8D34\u4F5C\u54C1\u94FE\u63A5");
        const x = await json(
          this.t,
          "https://enterprise-search.yenpress.com/api/as/v1/engines/yenpress/search.json",
          c.signal,
          { query: q, filters: { all: [{ type: "series" }] }, page: { size: 20, current: 1 } },
          { Authorization: `Bearer ${key}` }
        );
        return Promise.all(arr(x.results).map(async (v) => {
          const row = obj(v), url = required(obj(row.url).raw), id = await this.resolveLink(url);
          return candidate(this.id, id, required(obj(row.title).raw), href(id, this.base));
        }));
      }
      if (this.id === "webtoons") {
        const results2 = [];
        for (const type of ["WEBTOON", "CHALLENGE"]) {
          const x = await json(this.t, `https://m.webtoons.com/undefined/search/result?keyword=${encodeURIComponent(q)}&searchType=${type}&start=1`, c.signal, void 0, { Referer: "https://m.webtoons.com" });
          if (x.success !== true) throw new MetadataError("unavailable", "Webtoons \u62D2\u7EDD\u641C\u7D22");
          const result = obj(x.result), value = result[type === "WEBTOON" ? "webtoonResult" : "challengeResult"];
          if (!value) throw new MetadataError("invalid-response", "Webtoons \u641C\u7D22\u7ED3\u6784\u53D8\u5316");
          for (const v of arr(obj(value).titleList)) {
            const row = obj(v);
            const titleNo = numeric(String(row.titleNo ?? ""));
            const group = str(row.titleGroupName) || plain(required(row.title)).toLowerCase().replace(/[`~!@#$%^&*|\\'" ;:/?({[\]})]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "_";
            const genre = type === "CHALLENGE" ? "canvas" : str(row.representGenre);
            if (!genre || !/^[\w-]+$/.test(genre)) throw new MetadataError("invalid-response", "Webtoons \u7F3A\u5C11\u7C7B\u578B\uFF0C\u4E0D\u80FD\u6784\u9020\u4F5C\u54C1\u94FE\u63A5");
            const rawUrl = str(row.titleUrl) || str(row.url) || `${this.base}/en/${genre.toLowerCase()}/${encodeURIComponent(group)}/list?title_no=${titleNo}`;
            const id = await this.resolveLink(rawUrl);
            results2.push(candidate(this.id, id, required(row.title || row.titleName), href(id, this.base)));
          }
        }
        return results2;
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
      const id = await this.resolveLink(input2), url = href(id, this.base);
      const response = await this.t.request({ url, headers: this.id === "webtoons" ? { Referer: "https://www.webtoons.com/en" } : void 0 }, c.signal);
      const doc = documentOf(response.text), r = record(this.id, id, url, { htmlUrl: response.finalUrl });
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
              const b = record(this.id, bid, href(bid, this.base), { relationUrl: url });
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
    registry.register(new MangaDex(new SourceTransport(transport, 300)));
    registry.register(new AniList(new SourceTransport(transport, 1e3)));
    registry.register(new EHentai(new SourceTransport(transport, 1500)));
    registry.register(new MAL(new SourceTransport(transport, 1e3)));
    registry.register(new ComicVine(new SourceTransport(transport, 2e3)));
    for (const id of ["viz", "yenpress", "webtoons"]) registry.register(new HTMLSource(id, new SourceTransport(transport, 1e3)));
    return registry;
  }

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
  function mapped(r) {
    return {
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
    };
  }
  function buildPlan(state, record2, selection) {
    const plan = { seriesId: state.series.id, edits: [], skipped: [] };
    const incoming = mapped(record2);
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
        if (equal(old[field], next)) continue;
        before[field] = old[field] ?? null;
        after[field] = next;
        guards[lock] = old[lock] ?? false;
      }
      if (Object.keys(after).length) plan.edits.push({ target, before, after, guards });
    };
    const volumeSpecific = record2.volume !== void 0 || record2.provider === "viz" || record2.provider === "ehentai" || record2.id.startsWith("4000-") || record2.id.startsWith("/titles/");
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
      else plan.cover = { target, source: selection.cover };
    }
    return plan;
  }

  // src/writer.ts
  async function hash(blob) {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
      const url = URL.createObjectURL(blob);
      try {
        const img = new Image();
        img.src = url;
        await img.decode();
        if (!img.naturalWidth || !img.naturalHeight) throw new Error("zero dimensions");
      } catch {
        throw new MetadataError("verification", "\u5C01\u9762\u65E0\u6CD5\u89E3\u7801");
      } finally {
        URL.revokeObjectURL(url);
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
    async prepare(plan, signal) {
      if (plan.cover) {
        const selected = (await this.client.thumbnails(plan.cover.target, signal)).find((t) => t.selected);
        plan.cover.beforeSelected = selected?.id;
        plan.cover.beforeHash = selected ? await hash(await this.client.thumbnail(plan.cover.target, selected.id, signal)) : void 0;
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
          if (plan.cover.target.kind === "books" && !fresh.books.some((b) => b.id === plan.cover.target.id)) throw new MetadataError("conflict", "\u5C01\u9762\u4E66\u7C4D\u5F52\u5C5E\u5DF2\u53D8\u5316");
          await this.coverGuard(plan.cover, signal);
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
            const response = await this.transport.request({ url: edit.source.url, responseType: "blob" }, signal);
            if (response.status < 200 || response.status >= 300 || !response.blob) throw new MetadataError("http", `\u5C01\u9762\u4E0B\u8F7D\u5931\u8D25 HTTP ${response.status}`);
            await validateImage(response.blob);
            await this.coverGuard(edit, signal);
            const expected = await hash(response.blob);
            const existingIds = new Set((await this.client.thumbnails(edit.target, signal)).map((t) => t.id));
            const receipt = await this.client.upload(edit.target, response.blob, signal);
            if (existingIds.has(receipt)) throw new MetadataError("verification", "\u4E0A\u4F20\u8FD4\u56DE\u4E86\u5DF2\u6709\u5C01\u9762 ID\uFF1B\u4E0D\u6E05\u7406\u5DF2\u6709\u5C01\u9762");
            own = receipt;
            if (await hash(await this.client.thumbnail(edit.target, own, signal)) !== expected) throw new MetadataError("verification", "\u4E0A\u4F20\u5C01\u9762\u5185\u5BB9\u8BFB\u56DE\u4E0D\u7B26");
            await this.coverGuard(edit, signal);
            await this.client.select(edit.target, own, signal);
            const selected = (await this.client.thumbnails(edit.target, signal)).find((t) => t.selected);
            if (selected?.id !== own || await hash(await this.client.thumbnail(edit.target, own, signal)) !== expected) throw new MetadataError("verification", "\u5C01\u9762\u9009\u62E9\u8BFB\u56DE\u4E0D\u7B26");
            result.covers.push({ target: edit.target, previous: edit.beforeSelected, previousHash: edit.beforeHash, uploaded: own, uploadedHash: expected });
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
            if (s.previous) {
              if (await hash(await this.client.thumbnail(s.target, s.previous, signal)) !== s.previousHash) throw new MetadataError("conflict", "\u539F\u5C01\u9762\u5185\u5BB9\u5DF2\u53D8\u5316");
              await this.client.select(s.target, s.previous, signal);
              if ((await this.client.thumbnails(s.target, signal)).find((t) => t.selected)?.id !== s.previous) throw new MetadataError("verification", "\u539F\u5C01\u9762\u9009\u62E9\u8BFB\u56DE\u5931\u8D25");
            }
            await this.client.remove(s.target, s.uploaded, signal);
            if ((await this.client.thumbnails(s.target, signal)).some((t) => t.id === s.uploaded)) throw new MetadataError("verification", "\u81EA\u8EAB\u4E0A\u4F20\u5C01\u9762\u5220\u9664\u8BFB\u56DE\u5931\u8D25");
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
    l.append(i);
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
    constructor(registry, client, writer) {
      this.registry = registry;
      this.client = client;
      this.writer = writer;
      this.host.id = "komga-metadata-panel";
      this.host.style.cssText = "position:fixed;right:16px;top:48px;z-index:2147483000";
      const style = element("style");
      style.textContent = `:host{font:14px system-ui;color:#222}section{background:#fff;border:1px solid #888;border-radius:8px;box-shadow:0 4px 20px #0004;padding:14px;width:min(620px,90vw);max-height:85vh;overflow:auto}button,input,select,textarea{font:inherit;margin:4px;padding:5px}button{cursor:pointer}button:disabled{cursor:wait}label{display:inline-block}textarea{width:95%;height:65px}pre{white-space:pre-wrap;overflow-wrap:anywhere;background:#f4f4f4;padding:6px}p{overflow-wrap:anywhere}p[data-state=error]{color:#a21919}p[data-state=success]{color:#137333;transition:opacity .5s}.row{border-top:1px solid #ddd;padding:6px}details{margin:8px 0}h3{font-size:15px}`;
      const header = element("header", "\u5143\u6570\u636E ");
      header.append(button("\u5173\u95ED", () => {
        if (this.busy) this.controller?.abort();
        this.host.remove();
      }), button("\u53D6\u6D88", () => this.controller?.abort()));
      this.query.setAttribute("aria-label", "\u641C\u7D22\u8BCD");
      this.query.placeholder = "\u4F5C\u54C1\u540D";
      this.direct.setAttribute("aria-label", "\u6765\u6E90\u94FE\u63A5\u6216 ID");
      this.direct.placeholder = "\u6765\u6E90\u94FE\u63A5\u6216 ID";
      this.provider.setAttribute("aria-label", "\u6765\u6E90");
      this.controls.append(this.query, button("\u641C\u7D22", () => void this.run(() => this.search())));
      const toggles = element("div");
      for (const p of registry.list()) {
        option(this.provider, p.id, p.id);
        const i = input(p.id, toggles, "checkbox");
        i.checked = this.settings.sources.includes(p.id);
        i.onchange = () => {
          this.settings.sources = [...toggles.querySelectorAll("input:checked")].map((i2) => i2.getAttribute("aria-label"));
          storage.set("settings-v1", this.settings);
        };
      }
      this.controls.append(toggles, this.provider, this.direct, button("\u8BFB\u53D6", () => void this.run(() => this.readDirect())));
      const choices = element("div");
      this.book.setAttribute("aria-label", "\u76EE\u6807\u4E66\u7C4D");
      this.cover.setAttribute("aria-label", "\u5C01\u9762");
      this.coverTarget.setAttribute("aria-label", "\u5C01\u9762\u76EE\u6807");
      choices.append(element("p", "\u5355\u5377\uFF1A\u660E\u786E\u9009\u62E9\u4E66\u7C4D\u3002\u4F5C\u8005\u53EF\u4F20\u64AD\u81F3\u672A\u9501\u5B9A\u4E66\u7C4D\u3002"), this.book, this.cover, this.coverTarget);
      for (const f of [.../* @__PURE__ */ new Set([...seriesFields, ...bookFields])]) {
        const i = input(labels[f], choices, "checkbox");
        i.checked = !["title", "releaseDate", "isbn"].includes(f);
        this.fields.set(f, i);
        i.onchange = () => this.invalidate();
      }
      this.propagate = input("\u4F20\u64AD\u4F5C\u8005", choices, "checkbox");
      this.propagate.checked = true;
      for (const e of [this.book, this.cover, this.coverTarget, this.propagate]) e.onchange = () => this.invalidate();
      this.controls.append(choices, button("\u751F\u6210\u9884\u89C8", () => void this.run(() => this.makePreview())));
      this.applyButton = button("\u5E94\u7528", () => void this.run(async () => {
        if (!this.plan) throw new MetadataError("verification", "\u8BF7\u5148\u9884\u89C8");
        this.readPreview();
        const plan = this.plan;
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
      this.body.append(header, this.controls, this.results, this.preview, this.applyButton, this.undoButton, this.status, this.settingsPanel(), this.catalog);
      this.shadow.append(style, this.body);
    }
    host = element("div");
    shadow = this.host.attachShadow({ mode: "open" });
    body = element("section");
    status = element("p");
    settings = storage.get("settings-v1", { sources: ["bangumi", "mangabaka", "mangadex", "anilist", "mangaupdates"], credentials: {} });
    controller;
    busy = false;
    state;
    selected;
    plan;
    seriesId;
    undoData = storage.get("undo-v1", void 0);
    controls = element("div");
    results = element("div");
    preview = element("div");
    query = element("input");
    direct = element("input");
    provider = element("select");
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
      if (extension) extension.mount(this.catalog);
      void this.run(async () => {
        this.seriesId = currentSeries(location, document);
        if (!this.seriesId) throw new MetadataError("invalid-id", "\u8BF7\u6253\u5F00\u7CFB\u5217\u6216 One-shot \u8BE6\u60C5\u9875\uFF0C\u518D\u4ECE\u83DC\u5355\u542F\u52A8");
        this.state = await this.client.state(this.seriesId, this.signal);
        this.query.value = String(this.state.series.metadata.title);
        this.book.replaceChildren();
        option(this.book, "", "\u4E0D\u6307\u5B9A\u4E66\u7C4D");
        this.coverTarget.replaceChildren();
        option(this.coverTarget, `series:${this.seriesId}`, "\u7CFB\u5217\u5C01\u9762");
        for (const b of this.state.books) {
          option(this.book, b.id, `${b.metadata.number ?? "?"} \xB7 ${b.metadata.title} \xB7 ${b.id}`);
          option(this.coverTarget, `books:${b.id}`, `\u4E66\u7C4D ${b.metadata.number ?? "?"} \xB7 ${b.id}`);
        }
        this.status.textContent = `\u5F53\u524D\uFF1A${this.state.series.metadata.title}`;
      });
    }
    get signal() {
      if (!this.controller) throw new Error("No action context");
      return this.controller.signal;
    }
    invalidate() {
      this.plan = void 0;
      this.applyButton.disabled = true;
      this.preview.replaceChildren();
    }
    async run(action) {
      if (this.busy) return;
      this.busy = true;
      this.controller = new AbortController();
      clearTimeout(this.fade);
      this.status.style.opacity = "1";
      this.status.dataset.state = "busy";
      this.status.textContent = "\u25CC \u5904\u7406\u4E2D";
      this.controls.querySelectorAll("input,button,select").forEach((e) => e.disabled = true);
      this.results.querySelectorAll("button").forEach((e) => e.disabled = true);
      this.applyButton.disabled = true;
      this.undoButton.disabled = true;
      try {
        await action();
        if (this.status.dataset.state === "busy") {
          this.status.dataset.state = "idle";
          if (this.status.textContent === "\u25CC \u5904\u7406\u4E2D") this.status.textContent = "\u8BF7\u9009\u62E9\u5019\u9009\u5E76\u9884\u89C8";
        }
      } catch (error) {
        this.status.dataset.state = "error";
        this.status.textContent = error instanceof Error ? error.message : String(error);
      } finally {
        this.busy = false;
        this.controls.querySelectorAll("input,button,select").forEach((e) => e.disabled = false);
        this.results.querySelectorAll("button").forEach((e) => e.disabled = false);
        this.applyButton.disabled = !this.plan;
        this.undoButton.disabled = !this.undoData;
      }
    }
    context() {
      return { signal: this.signal, credentials: structuredClone(this.settings.credentials) };
    }
    async search() {
      this.invalidate();
      this.results.replaceChildren();
      if (!this.query.value.trim() || !this.settings.sources.length) throw new MetadataError("verification", "\u8F93\u5165\u641C\u7D22\u8BCD\u5E76\u9009\u62E9\u6765\u6E90");
      const results = await this.registry.search(this.settings.sources, this.query.value.trim(), this.context());
      for (const result of results) {
        const group = element("div");
        group.append(element("h3", result.id));
        if (result.error) group.append(element("p", result.error.message));
        else if (!result.candidates?.length) group.append(element("p", "\u65E0\u5339\u914D"));
        for (const c of result.candidates ?? []) group.append(button(c.title, () => void this.run(async () => {
          this.choose(await this.registry.get(c.provider).get(c.id, this.context()));
        })));
        this.results.append(group);
      }
      if (results.some((r) => r.error)) {
        this.status.dataset.state = "error";
        this.status.textContent = "\u90E8\u5206\u6765\u6E90\u5931\u8D25\uFF1B\u5176\u4ED6\u7ED3\u679C\u4ECD\u53EF\u9009\u62E9";
      }
    }
    async readDirect() {
      this.invalidate();
      const p = this.registry.get(this.provider.value);
      const id = await p.resolveLink(this.direct.value.trim(), this.context());
      this.choose(await p.get(id, this.context()));
    }
    choose(record2) {
      this.invalidate();
      this.selected = record2;
      this.results.replaceChildren();
      this.results.append(element("h3", `${record2.provider} \xB7 ${nativeTitle(record2)}`), element("p", record2.url));
      const capabilities = this.registry.get(record2.provider).capabilities;
      const scope = capabilities.gallery ? "\u753B\u5ECA\uFF1B\u4E0D\u63A8\u65AD\u5377\u53F7" : capabilities.volumeMetadata ? "\u652F\u6301\u5355\u5377\u8BE6\u60C5\uFF1B\u987B\u660E\u786E\u6620\u5C04" : capabilities.volumeCovers ? "\u4EC5\u7CFB\u5217\u4E0E\u5377\u5C01\u9762\uFF1B\u65E0\u5355\u5377\u8BE6\u60C5" : "\u4EC5\u7CFB\u5217\u5143\u6570\u636E\uFF1B\u4E0D\u63A8\u65AD\u5355\u5377";
      this.results.append(element("p", `${scope} \xB7 ${record2.status ?? "\u7CFB\u5217\u72B6\u6001\u672A\u77E5"}`));
      if (record2.summary) this.results.append(element("pre", record2.summary));
      for (const warning of record2.warnings ?? []) this.results.append(element("p", warning));
      for (const b of record2.books ?? []) this.results.append(button(`\u5355\u5377\uFF1A${nativeTitle(b)}`, () => void this.run(async () => this.choose(await this.registry.get(b.provider).get(b.id, this.context())))));
      this.cover.replaceChildren();
      option(this.cover, "", "\u4E0D\u4FEE\u6539\u5C01\u9762");
      record2.covers.forEach((c, i) => option(this.cover, String(i), `\u5C01\u9762 ${c.volume === void 0 ? "\u7CFB\u5217/\u672A\u5B9A\u5377" : `\u5377 ${c.volume}`} ${c.language ?? ""}`));
    }
    async makePreview() {
      this.invalidate();
      if (!this.selected || !this.seriesId) throw new MetadataError("verification", "\u5148\u9009\u62E9\u5019\u9009");
      if (currentSeries(location, document) !== this.seriesId) throw new MetadataError("conflict", "\u9875\u9762\u7CFB\u5217\u53D8\u5316\uFF0C\u8BF7\u5173\u95ED\u540E\u91CD\u65B0\u542F\u52A8");
      this.state = await this.client.state(this.seriesId, this.signal);
      const [kind, id] = this.coverTarget.value.split(":");
      const plan = buildPlan(this.state, this.selected, {
        fields: [...this.fields].filter(([, i]) => i.checked).map(([f]) => f),
        bookId: this.book.value || void 0,
        propagateAuthors: this.propagate.checked,
        cover: this.cover.value === "" ? void 0 : this.selected.covers[Number(this.cover.value)],
        coverTarget: id && (kind === "series" || kind === "books") ? { kind, id } : void 0
      });
      await this.writer.prepare(plan, this.signal);
      this.plan = plan;
      this.preview.append(element("h3", "\u9884\u89C8\uFF1A\u52FE\u9009\u5199\u5165\uFF0C\u53EF\u7F16\u8F91 JSON \u65B0\u503C"));
      plan.edits.forEach((edit, index) => {
        this.preview.append(element("h3", `${edit.target.kind}/${edit.target.id}`));
        for (const [field, value] of Object.entries(edit.after)) {
          const row = element("div");
          row.className = "row";
          const check = input(labels[field], row, "checkbox");
          check.checked = true;
          check.dataset.edit = String(index);
          check.dataset.field = field;
          row.append(element("pre", `\u539F\uFF1A${JSON.stringify(edit.before[field])}`));
          const next = element("textarea");
          next.value = JSON.stringify(value, null, 2);
          next.dataset.edit = String(index);
          next.dataset.field = field;
          row.append(next);
          this.preview.append(row);
        }
      });
      if (plan.cover) this.preview.append(element("p", `\u5C01\u9762\uFF1A${plan.cover.target.kind}/${plan.cover.target.id} \u2190 ${plan.cover.source.url}\uFF08\u5305\u542B\u4E0B\u8F7D\u5931\u8D25\u98CE\u9669\uFF09`));
      for (const skipped of plan.skipped) this.preview.append(element("p", skipped));
      this.preview.append(element("p", "API \u65E0\u539F\u5B50\u6761\u4EF6\u5199\u5165\uFF1A\u8BFB\u5199\u95F4\u4ECD\u6709\u6781\u77ED\u5E76\u53D1\u7A97\u53E3\u3002\u64A4\u9500\u4EC5\u6062\u590D\u672C\u6B21\u5B57\u6BB5\u3002"));
    }
    readPreview() {
      if (!this.plan) return;
      for (const i of this.preview.querySelectorAll("input[data-field]")) {
        const edit = this.plan.edits[Number(i.dataset.edit)], field = i.dataset.field;
        if (!i.checked) {
          delete edit.after[field];
          delete edit.before[field];
          delete edit.guards[`${field}Lock`];
          continue;
        }
        const textarea = [...this.preview.querySelectorAll("textarea")].find((t) => t.dataset.edit === i.dataset.edit && t.dataset.field === field);
        let value;
        try {
          value = JSON.parse(textarea.value);
        } catch {
          throw new MetadataError("verification", `${labels[field]} \u65B0\u503C JSON \u683C\u5F0F\u9519\u8BEF`);
        }
        edit.after[field] = validateValue(field, value);
      }
      this.plan.edits = this.plan.edits.filter((e) => Object.keys(e.after).length);
    }
    report(result) {
      if (result.status === "success") {
        this.status.dataset.state = "success";
        this.status.textContent = "\u2713 \u5DF2\u8BFB\u56DE\u786E\u8BA4";
        this.fade = setTimeout(() => {
          this.status.style.opacity = "0";
        }, 1200);
      } else {
        this.status.dataset.state = "error";
        this.status.textContent = `${result.status === "partial" ? "\u90E8\u5206\u5B8C\u6210" : "\u5931\u8D25"}\uFF1A${result.outcomes.map((o) => `${o.target.kind}/${o.target.id} ${o.action} ${o.status === "success" ? "\u5DF2\u786E\u8BA4" : o.message}`).join("\uFF1B")}`;
      }
    }
    settingsPanel() {
      const d = element("details");
      d.append(element("summary", "\u8BBE\u7F6E\uFF08\u51ED\u636E\u4EC5\u4FDD\u5B58\u5728 GM \u672C\u5730\uFF09"));
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
      d.append(element("p", "\u79BB\u7EBF\u76EE\u5F55\u4E0E\u6570\u636E\u5E93\u9AD8\u7EA7\u9762\u677F\uFF1A\u7EC4\u4EF6 2 \u63A5\u5165\uFF0C\u5F53\u524D\u672A\u5B9E\u73B0\u3002"));
      return d;
    }
  };

  // src/entry.ts
  function activate() {
    const deployment = detectKomga(document, location);
    if (!deployment) return false;
    const transport = new GMTransport(), registry = createRegistry(transport), client = new KomgaClient(deployment);
    const writer = new Writer(client, transport);
    const launch = () => {
      if (!detectKomga(document, location)) return;
      if (document.getElementById("komga-metadata-panel")) return;
      new Panel(registry, client, writer).mount();
    };
    GM_registerMenuCommand("\u5143\u6570\u636E\uFF1A\u5F53\u524D\u7CFB\u5217", launch);
    const host = document.createElement("div");
    host.id = "komga-metadata-launcher";
    host.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147482999";
    const shadow = host.attachShadow({ mode: "open" }), button2 = document.createElement("button");
    button2.textContent = "\u5143\u6570\u636E";
    button2.style.cssText = "font:14px system-ui;padding:8px 14px;cursor:pointer;border:1px solid #888;border-radius:6px;background:#fff;color:#222";
    button2.addEventListener("click", launch);
    shadow.append(button2);
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
