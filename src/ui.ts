import { type CatalogExtension, type Credentials, type MetadataRecord, type Registry, nativeTitle, MetadataError } from './model';
import { currentSeries, type KomgaClient, type State, type Value } from './komga';
import { buildPlan, type Field, type Plan, seriesFields, bookFields } from './plan';
import { type Writer, type Result } from './writer';
import { storage } from './transport';
import { panelStyle, icon } from './ui-style';
interface Settings { sources: string[]; offlineSources?: string[]; sourceMode?: 'online' | 'offline'; credentials: Credentials }
interface SavedUndo { seriesId: string; result: Result }
const labels: Record<Field, string> = { title: '标题（默认不改）', summary: '简介', publisher: '出版社', language: '语言', status: '状态', ageRating: '年龄', tags: '标签', genres: '类型', links: '链接', alternateTitles: '别名', authors: '作者', releaseDate: '发行日', isbn: 'ISBN' };
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag); if (text !== undefined) e.textContent = text; return e;
}
function button(text: string, action: () => void): HTMLButtonElement {
  const e = element('button', text); e.type = 'button'; e.addEventListener('click', action); return e;
}
function input(label: string, parent: HTMLElement, type = 'text'): HTMLInputElement {
  const l = element('label', label), i = element('input'); i.type = type; i.setAttribute('aria-label', label);
  if (type === 'checkbox') l.prepend(i); else l.append(i);
  parent.append(l); return i;
}
function option(select: HTMLSelectElement, value: string, name: string): void {
  const e = element('option', name); e.value = value; select.append(e);
}
function validateValue(field: string, value: unknown): Value {
  if (['tags', 'genres', 'alternateTitles', 'links', 'authors'].includes(field)) {
    if (!Array.isArray(value) || value.length > 1000) throw new MetadataError('verification', '数组格式不符');
    if (field === 'tags' || field === 'genres') {
      if (!value.every(v => typeof v === 'string' && v.trim())) throw new MetadataError('verification', '标签应为非空字符串数组');
    } else for (const item of value) {
      if (!item || typeof item !== 'object') throw new MetadataError('verification', '数组对象格式不符');
      const keys = field === 'links' ? ['label', 'url'] : field === 'authors' ? ['name', 'role'] : ['title', 'label'];
      for (const k of keys) if (typeof item[k] !== 'string' || !item[k].trim()) throw new MetadataError('verification', '数组对象缺少字段');
      if (Object.keys(item).some(k => !keys.includes(k))) throw new MetadataError('verification', '数组对象含未知字段');
      if (field === 'links') {
        const u = new URL(item.url);
        if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) throw new MetadataError('verification', '链接必须为 HTTP(S)');
      }
    }
    return value as Value[];
  }
  if (field === 'ageRating') {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) throw new MetadataError('verification', '年龄必须为非负整数');
  } else {
    if (typeof value !== 'string') throw new MetadataError('verification', '字段必须为字符串');
    if (field === 'title' && !value.trim()) throw new MetadataError('verification', '标题不能为空');
    if (field === 'status' && !['ONGOING', 'ENDED', 'HIATUS', 'ABANDONED'].includes(value)) throw new MetadataError('verification', '状态值不符');
    if (field === 'releaseDate' && !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new MetadataError('verification', '日期使用 YYYY-MM-DD');
  }
  return value as Value;
}
export class Panel {
  private host = element('div');
  private shadow = this.host.attachShadow({ mode: 'open' });
  private body = element('dialog');
  private metadataPage = element('div');
  private viewport = element('div');
  private contextLabel = element('div');
  private metaActions = element('div');
  private previewButton = button('生成预览', () => void this.run(() => this.makePreview()));
  private cancelButton = button('取消', () => this.controller?.abort());
  private finishing = false;
  private returnFocus = document.activeElement?.shadowRoot?.activeElement ?? document.activeElement;
  private status = element('p');
  private settings: Settings = storage.get('settings-v1', { sources: ['bangumi', 'mangabaka', 'mangadex', 'anilist', 'mangaupdates'], credentials: {} });
  private controller?: AbortController;
  private busy = false;
  private state?: State;
  private selected?: MetadataRecord;
  private plan?: Plan;
  private seriesId?: string;
  private undoData?: SavedUndo = storage.get<SavedUndo | undefined>('undo-v1', undefined);
  private controls = element('div');
  private results = element('div');
  private preview = element('div');
  private query = element('input');
  private direct = element('input');
  private provider = element('select');
  private sourceMode = element('select');
  private sourceToggles = element('div');
  private extension?: CatalogExtension;
  private catalogCleanup?: () => void | Promise<void>;
  private book = element('select');
  private cover = element('select');
  private coverTarget = element('select');
  private fields = new Map<Field, HTMLInputElement>();
  private propagate = element('input');
  private applyButton: HTMLButtonElement;
  private undoButton: HTMLButtonElement;
  private catalog = element('div');
  private fade?: ReturnType<typeof setTimeout>;
  constructor(private registry: Registry, private client: KomgaClient, private writer: Writer) {
    this.host.id = 'komga-metadata-panel';
    this.host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000';
    this.host.dataset.theme = storage.get('ui-theme-v1', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const style = element('style'); style.textContent = panelStyle;
    this.body.className = 'dialog'; this.body.setAttribute('aria-label', '元数据');
    this.body.addEventListener('cancel', event => { event.preventDefault(); this.controller?.abort(); void this.close(); });
    this.body.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || event.ctrlKey || event.altKey || event.metaKey) return;
      const focusable = [...this.body.querySelectorAll<HTMLElement>('button,input,select,textarea,summary,a[href],[tabindex]')]
        .filter(e => e.tabIndex >= 0 && !e.matches(':disabled') && e.getClientRects().length > 0);
      const first = focusable[0], last = focusable.at(-1), active = this.shadow.activeElement;
      if (event.shiftKey && active === first && last) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last && first) { event.preventDefault(); first.focus(); }
    });
    const header = element('header'); header.className = 'header';
    const brand = element('span'); brand.className = 'brand'; brand.append(icon('layers'));
    const heading = element('div'); heading.className = 'heading';
    this.contextLabel.className = 'context'; this.contextLabel.textContent = 'Komga';
    heading.append(element('h2', '元数据'), this.contextLabel);
    const headerActions = element('div'); headerActions.className = 'header-actions';
    const theme = button('', () => {
      this.host.dataset.theme = this.host.dataset.theme === 'dark' ? 'light' : 'dark';
      storage.set('ui-theme-v1', this.host.dataset.theme);
    });
    theme.className = 'ghost icon-button'; theme.setAttribute('aria-label', '切换深浅色'); theme.title = '切换深浅色'; theme.append(icon('sun'));
    const close = button('', () => { this.controller?.abort(); void this.close(); });
    close.className = 'ghost icon-button'; close.setAttribute('aria-label', '关闭'); close.title = '关闭 · Esc'; close.append(icon('close'));
    headerActions.append(theme, close); header.append(brand, heading, headerActions);
    this.controls.className = 'workspace'; this.results.className = 'results'; this.preview.className = 'preview';
    this.sourceToggles.className = 'source-toggles';
    const searchCard = element('div'); searchCard.className = 'card';
    const searchTitle = element('div'); searchTitle.className = 'section-title'; searchTitle.append(element('h3', '查找作品'), this.sourceMode);
    const searchRow = element('div'); searchRow.className = 'search-row';
    const searchButton = button('搜索', () => void this.run(() => this.search())); searchButton.className = 'primary'; searchButton.prepend(icon('search'));
    searchRow.append(this.query, searchButton);
    this.query.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) void this.run(() => this.search()); });
    this.query.setAttribute('aria-label', '搜索词'); this.query.placeholder = '作品名';
    this.direct.setAttribute('aria-label', '来源链接或 ID'); this.direct.placeholder = '来源链接或 ID';
    this.provider.setAttribute('aria-label', '来源');
    option(this.sourceMode, 'online', '在线');
    option(this.sourceMode, 'offline', '离线');
    this.sourceMode.value = this.settings.sourceMode ?? 'online';
    this.sourceMode.setAttribute('aria-label', '来源模式');
    this.sourceMode.onchange = () => {
      this.saveSourceChecks();
      this.settings.sourceMode = this.sourceMode.value as 'online' | 'offline';
      this.selected = undefined; this.invalidate();
      this.renderSourceChecks();
      storage.set('settings-v1', this.settings);
    };
    for (const p of registry.list()) option(this.provider, p.id, p.id);
    this.renderSourceChecks();
    const directDetails = element('details'); directDetails.append(element('summary', '通过链接或 ID 读取'));
    const directRow = element('div'); directRow.className = 'direct-row';
    directRow.append(this.provider, this.direct, button('读取', () => void this.run(() => this.readDirect())));
    directDetails.append(directRow); searchCard.append(searchTitle, searchRow, this.sourceToggles, directDetails, this.results);
    const choices = element('div'); choices.className = 'card'; choices.append(element('h3', '写入选项'));
    this.book.setAttribute('aria-label', '目标书籍'); this.cover.setAttribute('aria-label', '封面'); this.coverTarget.setAttribute('aria-label', '封面目标');
    option(this.cover, '', '不修改封面');
    for (const [label, select] of [['目标书籍', this.book], ['封面', this.cover], ['封面目标', this.coverTarget]] as const) {
      const wrapper = element('label', label); wrapper.className = 'field-label'; wrapper.append(select); choices.append(wrapper);
    }
    const caption = element('div', '写入字段'); caption.className = 'field-caption'; choices.append(caption);
    const fieldGrid = element('div'); fieldGrid.className = 'field-grid';
    for (const f of [...new Set<Field>([...seriesFields, ...bookFields])]) {
      const i = input(labels[f], fieldGrid, 'checkbox');
      i.checked = !['title', 'releaseDate', 'isbn'].includes(f); this.fields.set(f, i);
      i.onchange = () => this.invalidate();
    }
    choices.append(fieldGrid);
    this.propagate = input('传播作者', choices, 'checkbox'); this.propagate.checked = true;
    this.propagate.parentElement!.className = 'check-label';
    const hint = element('p', '保留已锁定字段；作者仅写入未锁定书籍。'); hint.className = 'hint'; choices.append(hint);
    for (const e of [this.book, this.cover, this.coverTarget, this.propagate]) e.onchange = () => this.invalidate();
    this.controls.append(searchCard, choices);
    this.applyButton = button('应用', () => void this.run(async () => {
      if (!this.plan) throw new MetadataError('verification', '请先预览');
      this.readPreview();
      const plan = this.plan;
      const result = await this.writer.apply(plan, this.signal);
      this.undoData = { seriesId: plan.seriesId, result };
      storage.set('undo-v1', this.undoData);
      this.plan = undefined; this.report(result);
    }));
    this.applyButton.disabled = true;
    this.undoButton = button('撤销最近写入', () => void this.run(async () => {
      if (!this.undoData) throw new MetadataError('verification', '没有撤销快照');
      const saved = this.undoData;
      const result = await this.writer.undo(saved.result, saved.seriesId, this.signal);
      const succeeded = (t: { kind: string; id: string }, action: string) => result.outcomes.some(o => o.target.kind === t.kind && o.target.id === t.id && o.action === action && o.status === 'success');
      saved.result.snapshots = saved.result.snapshots.filter(s => !succeeded(s.target, 'metadata'));
      saved.result.covers = saved.result.covers.filter(s => !succeeded(s.target, 'cover'));
      this.undoData = saved.result.snapshots.length || saved.result.covers.length ? saved : undefined;
      storage.set('undo-v1', this.undoData);
      this.invalidate(); this.report(result);
    }));
    this.undoButton.disabled = !this.undoData;
    this.applyButton.className = 'primary'; this.undoButton.className = 'ghost'; this.previewButton.disabled = true;
    this.metaActions.className = 'footer-actions'; this.metaActions.append(this.undoButton, this.previewButton, this.applyButton);
    this.status.className = 'status'; this.status.setAttribute('role', 'status'); this.status.setAttribute('aria-live', 'polite');
    this.cancelButton.className = 'ghost cancel-action'; this.cancelButton.hidden = true;
    const footer = element('footer'); footer.className = 'footer'; footer.append(this.status, this.cancelButton, this.metaActions);
    this.metadataPage.append(this.controls, this.preview);
    const settingsPage = element('div'); settingsPage.append(this.settingsPanel());
    const tabs = element('nav'); tabs.className = 'tabs'; tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '元数据工具');
    this.viewport.className = 'viewport';
    const pages = [this.metadataPage, this.catalog, settingsPage];
    const tabButtons: HTMLButtonElement[] = [];
    const selectTab = (index: number) => {
      pages.forEach((page, n) => { page.hidden = n !== index; tabButtons[n]!.setAttribute('aria-selected', String(n === index)); tabButtons[n]!.tabIndex = n === index ? 0 : -1; });
      this.metaActions.hidden = index !== 0; this.viewport.scrollTop = 0;
    };
    (['元数据', '本地数据库', '设置'] as const).forEach((name, index) => {
      const tab = button(name, () => selectTab(index));
      tab.prepend(icon((['search', 'database', 'settings'] as const)[index]!));
      tab.id = `km-tab-${index}`; tab.setAttribute('role', 'tab'); tab.setAttribute('aria-controls', `km-page-${index}`);
      tab.addEventListener('keydown', event => {
        let next: number;
        if (event.key === 'ArrowRight') next = (index + 1) % pages.length;
        else if (event.key === 'ArrowLeft') next = (index + pages.length - 1) % pages.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = pages.length - 1;
        else return;
        event.preventDefault(); selectTab(next); tabButtons[next]!.focus();
      });
      const page = pages[index]!; page.id = `km-page-${index}`; page.className = 'tab-panel'; page.setAttribute('role', 'tabpanel'); page.setAttribute('aria-labelledby', tab.id);
      tabButtons.push(tab); tabs.append(tab); this.viewport.append(page);
    });
    selectTab(0);
    this.body.append(header, tabs, this.viewport, footer);
    this.shadow.append(style, this.body);
  }
  mount(extension?: CatalogExtension): void {
    if (!this.host.isConnected) document.body.append(this.host);
    this.body.showModal();
    this.extension = extension;
    this.renderSourceChecks();
    if (extension) this.catalogCleanup = extension.mount(this.catalog) || undefined;
    void this.run(async () => {
      this.seriesId = currentSeries(location, document);
      if (!this.seriesId) throw new MetadataError('invalid-id', '请打开系列或 One-shot 详情页，再从菜单启动');
      this.state = await this.client.state(this.seriesId, this.signal);
      this.query.value = String(this.state.series.metadata.title);
      this.contextLabel.textContent = this.query.value; this.contextLabel.title = this.query.value;
      this.book.replaceChildren(); option(this.book, '', '不指定书籍');
      this.coverTarget.replaceChildren(); option(this.coverTarget, `series:${this.seriesId}`, '系列封面');
      for (const b of this.state.books) {
        option(this.book, b.id, `${b.metadata.number ?? '?'} · ${b.metadata.title} · ${b.id}`);
        option(this.coverTarget, `books:${b.id}`, `书籍 ${b.metadata.number ?? '?'} · ${b.id}`);
      }
      this.status.textContent = `当前：${this.state.series.metadata.title}`;
    });
  }
  private get signal(): AbortSignal {
    if (!this.controller) throw new Error('No action context');
    return this.controller.signal;
  }
  private invalidate(): void {
    this.plan = undefined; this.applyButton.disabled = true; this.preview.replaceChildren();
    this.controls.hidden = false; this.previewButton.hidden = false;
    this.previewButton.disabled = !this.selected;
  }
  private async run(action: () => Promise<void>): Promise<void> {
    if (this.busy || this.finishing) return;
    this.busy = true; this.controller = new AbortController();
    clearTimeout(this.fade); this.host.style.opacity = '1'; this.body.style.opacity = '1'; this.status.style.opacity = '1'; this.status.dataset.state = 'busy'; this.status.textContent = '';
    this.status.setAttribute('aria-label', '处理中'); this.cancelButton.hidden = false; this.previewButton.disabled = true;
    this.controls.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select').forEach(e => e.disabled = true);
    this.results.querySelectorAll<HTMLButtonElement>('button').forEach(e => e.disabled = true);
    this.applyButton.disabled = true; this.undoButton.disabled = true;
    try {
      await action();
      if (this.status.dataset.state === 'busy') {
        this.status.dataset.state = 'idle';
        if (!this.status.textContent) this.status.textContent = this.plan ? '确认预览后应用' : this.selected ? '已选择来源条目' : '请选择匹配条目';
      }
    }
    catch (error) { this.status.dataset.state = 'error'; this.status.textContent = error instanceof Error ? error.message : String(error); }
    finally {
      this.busy = false;
      this.status.removeAttribute('aria-label'); this.cancelButton.hidden = true;
      this.controls.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select').forEach(e => e.disabled = this.finishing);
      this.results.querySelectorAll<HTMLButtonElement>('button').forEach(e => e.disabled = this.finishing);
      this.previewButton.disabled = this.finishing || !this.selected || Boolean(this.plan);
      this.applyButton.disabled = this.finishing || !this.plan; this.undoButton.disabled = this.finishing || !this.undoData;
    }
  }
  private context() { return { signal: this.signal, credentials: structuredClone(this.settings.credentials) }; }
  private async search() {
    this.invalidate(); this.results.replaceChildren();
    this.saveSourceChecks();
    const ids = this.sourceIds();
    if (!this.query.value.trim() || !ids.length) throw new MetadataError('verification', '输入搜索词并选择来源');
    const query = this.query.value.trim(), context = this.context();
    const results = await Promise.all(ids.map(async id => {
      try { return { id, candidates: await this.activeProvider(id).search(query, context) }; }
      catch (error) { return { id, error: error instanceof Error ? error : new Error(String(error)) }; }
    }));
    for (const result of results) {
      const group = element('div'); group.className = 'result-group'; group.append(element('h3', result.id));
      if (result.error) group.append(element('p', result.error.message));
      else if (!result.candidates?.length) group.append(element('p', '无匹配'));
      for (const c of result.candidates ?? []) {
        const candidate = button(c.title, () => void this.run(async () => {
          const provider = this.activeProvider(c.provider);
          this.choose(await provider.get(c.id, this.context()), provider);
        }));
        candidate.className = 'candidate'; candidate.setAttribute('aria-label', c.title); group.append(candidate);
      }
      this.results.append(group);
    }
    if (results.some(r => r.error)) { this.status.dataset.state = 'error'; this.status.textContent = '部分来源失败；其他结果仍可选择'; }
  }
  private async readDirect() {
    this.invalidate();
    const p = this.activeProvider(this.provider.value);
    const id = await p.resolveLink(this.direct.value.trim(), this.context());
    this.choose(await p.get(id, this.context()), p);
  }
  private choose(record: MetadataRecord, provider = this.activeProvider(record.provider)) {
    this.invalidate(); this.selected = record; this.results.replaceChildren();
    const sourceUrl = element('p', record.url); sourceUrl.className = 'record-url'; sourceUrl.title = record.url;
    this.results.append(element('h3', `${record.provider} · ${nativeTitle(record)}`), sourceUrl);
    const capabilities = provider.capabilities;
    const scope = capabilities.gallery ? '画廊；不推断卷号' : capabilities.volumeMetadata ? '支持单卷详情；须明确映射' : capabilities.volumeCovers ? '仅系列与卷封面；无单卷详情' : '仅系列元数据；不推断单卷';
    const meta = element('p', `${scope} · ${record.status ?? '系列状态未知'}`); meta.className = 'record-meta'; this.results.append(meta);
    if (record.summary) { const summary = element('pre', record.summary); summary.className = 'record-summary'; this.results.append(summary); }
    for (const warning of record.warnings ?? []) this.results.append(element('p', warning));
    if (record.books?.length) {
      const volumes = element('details'); volumes.className = 'volumes'; volumes.append(element('summary', `关联单卷 · ${record.books.length}`));
      for (const b of record.books) volumes.append(button(`单卷：${nativeTitle(b)}`, () => void this.run(async () => {
        const bookProvider = this.activeProvider(b.provider);
        this.choose(await bookProvider.get(b.id, this.context()), bookProvider);
      })));
      this.results.append(volumes);
    }
    this.cover.replaceChildren(); option(this.cover, '', '不修改封面');
    record.covers.forEach((c, i) => option(this.cover, String(i), `封面 ${c.volume === undefined ? '系列/未定卷' : `卷 ${c.volume}`} ${c.language ?? ''}`));
  }
  private async makePreview() {
    this.invalidate();
    if (!this.selected || !this.seriesId) throw new MetadataError('verification', '先选择候选');
    if (currentSeries(location, document) !== this.seriesId) throw new MetadataError('conflict', '页面系列变化，请关闭后重新启动');
    this.state = await this.client.state(this.seriesId, this.signal);
    const [kind, id] = this.coverTarget.value.split(':');
    const plan = buildPlan(this.state, this.selected, {
      fields: [...this.fields].filter(([, i]) => i.checked).map(([f]) => f),
      bookId: this.book.value || undefined, propagateAuthors: this.propagate.checked,
      cover: this.cover.value === '' ? undefined : this.selected.covers[Number(this.cover.value)],
      coverTarget: id && (kind === 'series' || kind === 'books') ? { kind, id } : undefined
    });
    await this.writer.prepare(plan, this.signal);
    this.plan = plan;
    const previewHead = element('div'); previewHead.className = 'preview-head';
    const back = button('返回选项', () => { if (!this.busy && !this.finishing) { this.invalidate(); this.viewport.scrollTop = 0; } });
    back.className = 'ghost'; back.prepend(icon('back'));
    previewHead.append(element('h3', '确认更改'), back); this.preview.append(previewHead);
    plan.edits.forEach((edit, index) => {
      const target = edit.target.kind === 'series' ? this.state!.series : this.state!.books.find(b => b.id === edit.target.id);
      const targetHeading = element('h3', `${edit.target.kind === 'series' ? '系列' : '书籍'} · ${target?.metadata.title ?? edit.target.id}`);
      targetHeading.className = 'target-heading'; targetHeading.title = `${edit.target.kind}/${edit.target.id}`; this.preview.append(targetHeading);
      for (const [field, value] of Object.entries(edit.after)) {
        const row = element('div'); row.className = 'row';
        const check = input(labels[field as Field], row, 'checkbox'); check.checked = true; check.dataset.edit = String(index); check.dataset.field = field;
        const diff = element('div'); diff.className = 'diff';
        const old = element('div'), updated = element('div');
        const beforeLabel = element('div', '当前值'), afterLabel = element('div', '写入值'); beforeLabel.className = afterLabel.className = 'diff-caption';
        const before = edit.before[field];
        old.append(beforeLabel, element('pre', typeof before === 'string' ? before || '—' : JSON.stringify(before, null, 2)));
        const next = element('textarea'); next.dataset.format = typeof value === 'string' ? 'text' : 'json';
        next.value = typeof value === 'string' ? value : JSON.stringify(value, null, 2); next.dataset.edit = String(index); next.dataset.field = field;
        next.title = next.dataset.format === 'text' ? '可直接编辑文本' : 'JSON 格式';
        next.setAttribute('aria-label', `${labels[field as Field]}写入值`);
        updated.append(afterLabel, next); diff.append(old, updated); row.append(diff); this.preview.append(row);
      }
    });
    if (plan.cover) this.preview.append(element('p', `封面：${plan.cover.target.kind}/${plan.cover.target.id} ← ${plan.cover.source.url}（包含下载失败风险）`));
    for (const skipped of plan.skipped) this.preview.append(element('p', skipped));
    const note = element('p', '仅应用勾选字段。写入前会重新检查，完成后读回核对。'); note.className = 'hint'; this.preview.append(note);
    this.controls.hidden = true; this.previewButton.hidden = true; this.viewport.scrollTop = 0;
  }
  private readPreview() {
    if (!this.plan) return;
    for (const i of this.preview.querySelectorAll<HTMLInputElement>('input[data-field]')) {
      const edit = this.plan.edits[Number(i.dataset.edit)]!, field = i.dataset.field!;
      if (!i.checked) { delete edit.after[field]; delete edit.before[field]; delete edit.guards[`${field}Lock`]; continue; }
      const textarea = [...this.preview.querySelectorAll<HTMLTextAreaElement>('textarea')].find(t => t.dataset.edit === i.dataset.edit && t.dataset.field === field)!;
      let value: unknown;
      try { value = textarea.dataset.format === 'text' ? textarea.value : JSON.parse(textarea.value); } catch { throw new MetadataError('verification', `${labels[field as Field]} 新值 JSON 格式错误`); }
      edit.after[field] = validateValue(field, value);
    }
    this.plan.edits = this.plan.edits.filter(e => Object.keys(e.after).length);
  }
  private report(result: Result) {
    if (result.status === 'success') {
      this.finishing = true;
      this.status.dataset.state = 'success'; this.status.textContent = '✓ 已读回确认';
      this.fade = setTimeout(() => {
        this.host.style.transition = 'opacity 240ms';
        this.body.style.transition = 'opacity 240ms'; this.body.style.opacity = '0';
        this.host.style.opacity = '0';
        this.fade = setTimeout(() => { void this.close(); }, 240);
      }, 1200);
    } else {
      this.status.dataset.state = 'error';
      this.status.textContent = `${result.status === 'partial' ? '部分完成' : '失败'}：${result.outcomes.map(o => `${o.target.kind}/${o.target.id} ${o.action} ${o.status === 'success' ? '已确认' : o.message}`).join('；')}`;
    }
  }
  private settingsPanel(): HTMLElement {
    const d = element('details'); d.className = 'card settings-card'; d.open = true;
    d.append(element('summary', '来源凭据'));
    const note = element('p', '仅保存在当前脚本管理器中。留空的来源不会使用凭据。'); note.className = 'hint'; d.append(note);
    const mal = input('MAL Client ID', d, 'password'), cv = input('ComicVine API Key', d, 'password');
    const exh = input('明确启用 ExH', d, 'checkbox'), member = input('ExH member ID', d, 'password'), pass = input('ExH pass hash', d, 'password'), igneous = input('ExH igneous（可选）', d, 'password');
    mal.value = this.settings.credentials.malClientId ?? ''; cv.value = this.settings.credentials.comicVineKey ?? '';
    exh.checked = this.settings.credentials.exhentai?.enabled ?? false;
    member.value = this.settings.credentials.exhentai?.memberId ?? ''; pass.value = this.settings.credentials.exhentai?.passHash ?? ''; igneous.value = this.settings.credentials.exhentai?.igneous ?? '';
    d.append(button('保存设置', () => {
      if (this.busy) return;
      this.settings.credentials = { malClientId: mal.value.trim(), comicVineKey: cv.value.trim(), exhentai: { enabled: exh.checked, memberId: member.value.trim(), passHash: pass.value.trim(), igneous: igneous.value.trim() } };
      storage.set('settings-v1', this.settings);
      this.status.textContent = '设置已保存；未验证登录';
    }));
    return d;
  }
  private sourceIds(): string[] {
    return [...this.sourceToggles.querySelectorAll<HTMLInputElement>('input:checked')]
      .map(i => i.getAttribute('aria-label')!);
  }
  private saveSourceChecks(): void {
    const selected = this.sourceIds();
    if (this.sourceMode.value === 'offline') this.settings.offlineSources = selected;
    else this.settings.sources = selected;
  }
  private renderSourceChecks(): void {
    this.sourceToggles.replaceChildren();
    const offline = this.sourceMode.value === 'offline';
    const providers = offline ? (this.extension?.providers ?? []) : this.registry.list();
    const selected = offline ? this.settings.offlineSources ?? providers.map(p => p.id) : this.settings.sources;
    this.provider.replaceChildren();
    for (const p of providers) option(this.provider, p.id, p.id);
    for (const p of providers) {
      const i = input(p.id, this.sourceToggles, 'checkbox');
      i.checked = selected.includes(p.id);
      i.onchange = () => { this.saveSourceChecks(); storage.set('settings-v1', this.settings); };
    }
  }
  private activeProvider(id: string): CatalogExtension['providers'][number] {
    if (this.sourceMode.value === 'offline') {
      const provider = this.extension?.providers.find(p => p.id === id);
      if (!provider) throw new MetadataError('unknown-provider', '离线目录未接入');
      return provider;
    }
    return this.registry.get(id);
  }
  private async close(): Promise<void> {
    clearTimeout(this.fade);
    this.fade = undefined;
    try {
      if (this.catalogCleanup) {
        const cleanup = this.catalogCleanup;
        this.catalogCleanup = undefined;
        await cleanup();
      }
    } finally {
      this.body.close(); this.host.remove();
      if (this.returnFocus instanceof HTMLElement && this.returnFocus.isConnected) this.returnFocus.focus();
    }
  }
}
