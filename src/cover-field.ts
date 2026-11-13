import { type Cover, type MetadataRecord, nativeTitle, cancelled } from './model';
import { type Target, type KomgaClient } from './komga';
import { type CoverEdit } from './plan';
import { type Writer } from './writer';
import { Thumbnails } from './thumbnails';

export interface CoverChoice { source: string; url: string; enabled: boolean }
const key = (r: MetadataRecord) => `${r.provider}:${r.id}`;
function node<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (text) e.textContent = text; return e;
}
/** One preview field owns its target, request generation and prepared upload bytes. */
export class CoverField {
  readonly element = node('section');
  private check = node('input');
  private source = node('select');
  private gallery = node('div');
  private current = node('div');
  private replacement = node('div');
  private status = node('span');
  private retry = node('button', '重试');
  private life = new AbortController();
  private request?: AbortController;
  private urls = new Map<HTMLElement, string>();
  private selected?: Cover;
  private prepared?: CoverEdit;
  private loading = false;

  constructor(
    readonly target: Target, private sharedSeries: Target | undefined, private seriesId: string,
    private records: MetadataRecord[], private locked: boolean,
    private client: KomgaClient, private writer: Writer, private thumbnails: Thumbnails,
    private changed: () => void, private save: (choice?: CoverChoice) => void, initial?: CoverChoice
  ) {
    const section = this.element; section.className = 'cover-preview row'; section.dataset.coverTarget = `${target.kind}:${target.id}`;
    const label = node('label', sharedSeries ? '封面 · 系列与书籍共用' : '封面');
    this.check.type = 'checkbox'; this.check.setAttribute('aria-label', '封面'); label.prepend(this.check);
    const controls = node('div'); controls.className = 'field-compose';
    this.source.setAttribute('aria-label', '封面来源');
    const current = node('option', '当前封面'); current.value = ''; this.source.append(current);
    for (const r of records) { const o = node('option', `${r.provider} · ${nativeTitle(r)}`); o.value = key(r); this.source.append(o); }
    controls.append(this.source); this.gallery.className = 'cover-candidates candidate-grid'; this.gallery.hidden = true;
    const comparison = node('div'); comparison.className = 'cover-compare';
    for (const [label, frame] of [['当前封面', this.current], ['替换为', this.replacement]] as const) {
      const figure = node('figure'); frame.className = 'cover-frame'; frame.append(node('span', label === '当前封面' ? '加载中' : '—'));
      figure.append(node('figcaption', label), frame); comparison.append(figure);
    }
    const feedback = node('div'); feedback.className = 'cover-feedback'; this.status.setAttribute('role', 'status');
    this.retry.type = 'button'; this.retry.hidden = true; this.retry.className = 'ghost'; feedback.append(this.status, this.retry);
    section.append(label, controls, this.gallery, comparison, feedback);
    this.source.onchange = () => this.selectSource();
    this.check.onchange = () => {
      this.remember();
      if (!this.check.checked) {
        this.request?.abort();
        if (this.loading) { this.status.textContent = ''; this.clear(this.replacement, '—'); }
        this.loading = false; this.changed();
      }
      else if (this.selected && !this.prepared) void this.load();
      else this.changed();
    };
    this.retry.onclick = () => void this.load();
    if (locked) { this.status.textContent = '封面已锁定'; this.source.disabled = true; this.source.dataset.boundaryDisabled = 'true'; }
    this.updateCheck();
    void this.loadCurrent();
    const record = records.find(r => key(r) === initial?.source);
    if (!locked && record?.covers.some(c => c.url === initial?.url)) {
      this.source.value = initial!.source; this.selectSource(initial!.url, initial!.enabled);
    }
  }
  get enabled(): boolean { return this.check.checked && !this.locked; }
  get blocked(): boolean { return this.enabled && (this.loading || !this.prepared); }
  get edit(): CoverEdit | undefined { return this.enabled && !this.blocked ? this.prepared : undefined; }
  private updateCheck(): void {
    this.check.disabled = this.locked || !this.selected;
    this.check.dataset.boundaryDisabled = String(this.check.disabled);
  }
  private remember(): void {
    this.save(this.selected ? { source: this.source.value, url: this.selected.url, enabled: this.check.checked } : undefined);
  }
  private selectSource(url?: string, enabled = true): void {
    this.request?.abort(); this.prepared = undefined; this.loading = false; this.selected = undefined;
    this.gallery.replaceChildren(); this.gallery.hidden = true; this.status.textContent = ''; this.retry.hidden = true;
    this.clear(this.replacement, '—');
    const record = this.records.find(r => key(r) === this.source.value);
    const covers = record?.covers.filter((c, i, all) => all.findIndex(x => x.url === c.url) === i) ?? [];
    this.check.checked = enabled && covers.length > 0;
    if (record && !covers.length) this.status.textContent = '此条目暂无封面';
    if (record && covers.length) {
      this.gallery.hidden = false;
      for (const [index, cover] of covers.entries()) {
        const button = node('button'); button.type = 'button'; button.className = 'candidate cover-candidate';
        const title = `${nativeTitle(record)} · ${cover.volume === undefined ? `封面 ${index + 1}` : `第 ${cover.volume} 卷`}${cover.language ? ` · ${cover.language}` : ''}`;
        button.setAttribute('aria-label', title); button.dataset.url = cover.url;
        const caption = `${cover.volume === undefined ? `封面 ${index + 1}` : `第 ${cover.volume} 卷`}${cover.language ? ` · ${cover.language}` : ''}`;
        button.append(this.thumbnails.add(nativeTitle(record), async () => cover.url), node('span', caption));
        button.onclick = () => this.choose(cover, true); this.gallery.append(button);
      }
      this.choose(covers.find(c => c.url === url) ?? covers[0]!, enabled);
    } else { this.updateCheck(); this.remember(); this.changed(); }
  }
  private choose(cover: Cover, enabled: boolean): void {
    this.selected = cover; this.check.checked = enabled; this.updateCheck();
    this.gallery.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.url === cover.url)));
    this.remember(); void this.load();
  }
  private clear(frame: HTMLElement, text: string): void {
    const old = this.urls.get(frame); if (old) URL.revokeObjectURL(old); this.urls.delete(frame); frame.replaceChildren(node('span', text));
  }
  private async show(frame: HTMLElement, blob: Blob | undefined, label: string, signal: AbortSignal): Promise<void> {
    cancelled(signal); if (!blob) { this.clear(frame, '暂无封面'); return; }
    const url = URL.createObjectURL(blob), image = node('img'); image.alt = label; image.src = url;
    try { await image.decode(); cancelled(signal); } catch (e) { URL.revokeObjectURL(url); throw e; }
    this.clear(frame, ''); this.urls.set(frame, url); frame.replaceChildren(image);
  }
  private async loadCurrent(): Promise<void> {
    try {
      const blob = await this.client.displayedThumbnail(this.target, this.life.signal);
      if (!this.selected) await this.show(this.current, blob, '当前封面', this.life.signal);
    } catch { if (!this.life.signal.aborted && !this.selected) this.clear(this.current, '当前封面加载失败'); }
  }
  private async load(): Promise<void> {
    if (this.locked || !this.selected || this.life.signal.aborted) return;
    this.request?.abort(); const request = this.request = new AbortController();
    this.loading = true; this.prepared = undefined; this.status.textContent = '加载中'; this.retry.hidden = true;
    this.clear(this.replacement, '加载中'); this.changed();
    const cover: CoverEdit = { target: this.target, sharedSeries: this.sharedSeries, source: this.selected };
    try {
      await this.writer.prepare({ seriesId: this.seriesId, edits: [], skipped: [], cover }, request.signal);
      await this.show(this.current, cover.beforeBlob, '当前封面', request.signal);
      await this.show(this.replacement, cover.prepared!.blob, '替换为', request.signal);
      cancelled(request.signal); this.prepared = cover; this.status.textContent = '';
    } catch (error) {
      if (!request.signal.aborted) { this.status.textContent = error instanceof Error ? error.message : String(error); this.retry.hidden = false; this.clear(this.replacement, '加载失败'); }
    } finally {
      if (this.request === request && !this.life.signal.aborted) { this.loading = false; this.changed(); }
    }
  }
  dispose(): void {
    this.life.abort(); this.request?.abort(); this.prepared = undefined;
    for (const url of this.urls.values()) URL.revokeObjectURL(url); this.urls.clear();
  }
}
