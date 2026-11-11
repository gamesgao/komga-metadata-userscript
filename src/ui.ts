import { type CatalogExtension, type Credentials, type MetadataRecord, type Provider, type Registry, type AcceptedLanguage, nativeTitle, MetadataError, cancelled } from './model';
import { currentSeries, type KomgaClient, type State, type Value } from './komga';
import { buildPlan, isVolumeRecord, equal, type Field, type Plan, seriesFields, bookFields } from './plan';
import { type Writer, type Result } from './writer';
import { storage } from './transport';
import { panelStyle, icon } from './ui-style';
import { Thumbnails } from './thumbnails';
import { searchPreferred } from './search';
import { mergeRecords, sourceKey, canMergeField, combineField, type Merged } from './merge';
import { allLanguages, languageLabels, wantsChineseTags, languagePreferences } from './languages';
import { EhTagTranslation, translateExisting } from './eh-tag-translation';
interface Settings { sources: string[]; offlineSources?: string[]; sourceMode?: 'online' | 'offline'; credentials: Credentials; acceptedLanguages?: AcceptedLanguage[]; languagePriority?: AcceptedLanguage[] }
interface SavedUndo { seriesId: string; result: Result }
const labels: Record<Field, string> = { title: '标题', summary: '简介', publisher: '出版社', language: '语言', status: '状态', ageRating: '年龄', tags: '标签', genres: '类型', links: '链接', alternateTitles: '别名', authors: '作者', releaseDate: '发行日', isbn: 'ISBN' };
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
function candidateCard(candidate: HTMLButtonElement, title: string, href: string): HTMLElement {
  const card = element('div'); card.className = 'candidate-card'; candidate.title = title; card.append(candidate);
  try {
    const url = new URL(href);
    if (['https:', 'http:'].includes(url.protocol) && !url.username && !url.password) {
      const link = element('a', '↗'); link.className = 'candidate-link'; link.href = url.href;
      link.target = '_blank'; link.rel = 'noopener noreferrer'; link.title = title;
      link.setAttribute('aria-label', `${title}：打开来源`); card.append(link);
    }
  } catch { /* No external navigation for malformed provider URLs. */ }
  return card;
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
  private settings: Settings = storage.get('settings-v1', { sources: ['bangumi', 'mangabaka', 'anilist', 'mangaupdates'], credentials: {} });
  private controller?: AbortController;
  private busy = false;
  private state?: State;
  private selected?: MetadataRecord;
  private selections: { record: MetadataRecord; provider: Provider }[] = [];
  private merged?: Merged;
  private tagReplacements = new Map<string, string>();


  private plan?: Plan;
  private seriesId?: string;
  private undoData?: SavedUndo = storage.get<SavedUndo | undefined>('undo-v1', undefined);
  private controls = element('div');
  private results = element('div');
  private detail = element('div');
  private thumbnails?: Thumbnails;
  private collapsedSources = new Set<string>();
  private previewUrls = new Set<string>();
  private preview = element('div');
  private query = element('input');
  private direct = element('input');
  private provider = element('select');
  private searchProgress = element('div');
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
  constructor(private registry: Registry, private client: KomgaClient, private writer: Writer, private translation: EhTagTranslation) {
    if (this.settings.sourceMode !== undefined || this.settings.offlineSources !== undefined) {
      if (this.settings.sourceMode === 'offline' && this.settings.offlineSources) this.settings.sources = this.settings.offlineSources;
      delete this.settings.sourceMode; delete this.settings.offlineSources;
      storage.set('settings-v1', this.settings);
    }
    this.host.id = 'komga-metadata-panel';
    this.host.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000';
    this.host.dataset.theme = storage.get('ui-theme-v1', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const style = element('style'); style.textContent = panelStyle;
    this.body.className = 'dialog'; this.body.setAttribute('aria-label', '元数据');
    this.body.addEventListener('cancel', event => {
      // File inputs also emit a bubbling cancel event (Escape or unchanged selection).
      if (event.target !== this.body) return;
      event.preventDefault(); this.controller?.abort(); void this.close();
    });
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
    this.preview.addEventListener('change', () => this.updateApplyState());
    this.sourceToggles.className = 'source-toggles';
    const searchCard = element('div'); searchCard.className = 'card';
    const searchTitle = element('div'); searchTitle.className = 'section-title'; searchTitle.append(element('h3', '查找作品'));
    const searchRow = element('div'); searchRow.className = 'search-row';
    const searchButton = button('搜索', () => void this.run(() => this.search())); searchButton.className = 'primary'; searchButton.prepend(icon('search'));
    searchRow.append(this.query, searchButton);
    this.query.addEventListener('keydown', event => { if (event.key === 'Enter' && !event.isComposing) void this.run(() => this.search()); });
    this.query.setAttribute('aria-label', '搜索词'); this.query.placeholder = '作品名';
    this.direct.setAttribute('aria-label', '来源链接或 ID'); this.direct.placeholder = '来源链接或 ID';
    this.provider.setAttribute('aria-label', '来源');

    for (const p of registry.list()) option(this.provider, p.id, p.id);
    this.renderSourceChecks();
    const directDetails = element('details'); directDetails.append(element('summary', '通过链接或 ID 读取'));
    const directRow = element('div'); directRow.className = 'direct-row';
    directRow.append(this.provider, this.direct, button('读取', () => void this.run(() => this.readDirect())));
    this.searchProgress.className = 'search-progress'; this.searchProgress.hidden = true;
    const languages = element('details'); languages.className = 'language-options'; languages.append(element('summary', '接受的资料语言'));
    const preference = languagePreferences(this.settings.acceptedLanguages, this.settings.languagePriority);
    this.settings.languagePriority = preference.order; this.settings.acceptedLanguages = preference.accepted;
    storage.set('settings-v1', this.settings);
    const languageChecks = element('div'); languageChecks.className = 'language-list';
    const saveLanguages = () => {
      this.settings.acceptedLanguages = this.settings.languagePriority!.filter(l => this.settings.acceptedLanguages!.includes(l));
      storage.set('settings-v1', this.settings); this.renderSelection();
    };
    const renderLanguages = () => {
      languageChecks.replaceChildren();
      this.settings.languagePriority!.forEach((language, index, order) => {
        const row = element('div'); row.className = 'language-row'; row.dataset.language = language;
        const check = input(languageLabels[language], row, 'checkbox'); check.dataset.language = language;
        check.checked = this.settings.acceptedLanguages!.includes(language);
        check.onchange = () => {
          this.settings.acceptedLanguages = this.settings.acceptedLanguages!.filter(l => l !== language);
          if (check.checked) this.settings.acceptedLanguages.push(language);
          saveLanguages();
        };
        for (const [direction, offset, text] of [['up', -1, '上移'], ['down', 1, '下移']] as const) {
          const move = button(direction === 'up' ? '↑' : '↓', () => {
            if (this.busy || index + offset < 0 || index + offset >= order.length) return;
            [order[index], order[index + offset]] = [order[index + offset]!, order[index]!];
            saveLanguages(); renderLanguages();
            languageChecks.querySelector<HTMLInputElement>(`input[data-language="${language}"]`)?.focus();
          });
          move.className = 'ghost'; move.setAttribute('aria-label', `${languageLabels[language]}${text}`);
          move.disabled = index + offset < 0 || index + offset >= order.length;
          move.dataset.boundaryDisabled = String(move.disabled);
          row.append(move);
        }
        languageChecks.append(row);
      });
    };
    renderLanguages();
    languages.append(languageChecks);
    directDetails.append(directRow); searchCard.append(searchTitle, searchRow, this.sourceToggles, languages, directDetails, this.searchProgress, this.results);
    const choices = element('div'); choices.className = 'card';
    this.detail.className = 'source-details'; searchCard.append(this.detail); choices.append(element('h3', '写入选项'));
    this.book.setAttribute('aria-label', '同时更新哪本书'); this.cover.setAttribute('aria-label', '使用哪张封面'); this.coverTarget.setAttribute('aria-label', '替换哪个封面');
    option(this.cover, '', '不修改封面');
    for (const [label, select] of [['同时更新哪本书', this.book], ['使用哪张封面', this.cover], ['替换哪个封面', this.coverTarget]] as const) {
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

    this.propagate = input('将作者同步到系列内所有书籍', choices, 'checkbox'); this.propagate.checked = false;
    this.propagate.parentElement!.className = 'check-label';

    for (const e of [this.book, this.cover, this.coverTarget, this.propagate]) e.onchange = () => this.invalidate();
    this.controls.append(searchCard, choices);
    this.applyButton = button('应用', () => void this.run(async () => {
      if (!this.plan) throw new MetadataError('verification', '请先预览');
      const plan = this.readPreview();
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
      this.book.replaceChildren(); this.coverTarget.replaceChildren();
      if (!this.state.series.oneshot) {
        option(this.book, '', '仅更新系列资料');
        option(this.coverTarget, `series:${this.seriesId}`, '整个系列的封面');
      }
      for (const b of this.state.books) {
        option(this.book, b.id, `${this.state.series.oneshot ? '系列 + 唯一书籍 · ' : ''}${b.metadata.number ?? '?'} · ${b.metadata.title}`);
        if (!this.state.series.oneshot) option(this.coverTarget, `books:${b.id}`, `${b.metadata.number ?? '?'} · ${b.metadata.title}`);
      }
      if (this.state.series.oneshot) option(this.coverTarget, 'both', '系列与唯一书籍共用封面');
      this.status.textContent = '';
    });
  }
  private get signal(): AbortSignal {
    if (!this.controller) throw new Error('No action context');
    return this.controller.signal;
  }
  private updateApplyState(): void {
    this.applyButton.disabled = this.busy || this.finishing || !this.plan || (!this.plan.cover && !this.preview.querySelector('input[data-edit][data-field]:checked'));
  }
  private invalidate(): void {
    this.tagReplacements.clear();
    for (const url of this.previewUrls) URL.revokeObjectURL(url);
    this.previewUrls.clear();
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
    this.preview.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input,select,textarea,button').forEach(e => e.disabled = true);
    this.applyButton.disabled = true; this.undoButton.disabled = true;
    try {
      await action();
      if (this.status.dataset.state === 'busy' || this.status.dataset.state === 'search') {
        this.status.dataset.state = 'idle';

      }
    }
    catch (error) { this.status.dataset.state = 'error'; this.status.textContent = error instanceof Error ? error.message : String(error); }
    finally {
      this.busy = false;
      this.status.removeAttribute('aria-label'); this.cancelButton.hidden = true;
      this.controls.querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>('input,button,select').forEach(e => e.disabled = this.finishing || e.dataset.boundaryDisabled === 'true');
      this.results.querySelectorAll<HTMLButtonElement>('button').forEach(e => e.disabled = this.finishing);
      this.preview.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | HTMLButtonElement>('input,select,textarea,button').forEach(e => e.disabled = this.finishing);
      this.previewButton.disabled = this.finishing || !this.selected || Boolean(this.plan);
      this.updateApplyState(); this.undoButton.disabled = this.finishing || !this.undoData;
    }
  }
  private context() { return { signal: this.signal, credentials: structuredClone(this.settings.credentials) }; }
  private clearSearch(): void {
    this.thumbnails?.dispose(); this.thumbnails = undefined;
    this.searchProgress.hidden = true; this.searchProgress.replaceChildren();
    this.selections = []; this.merged = undefined;
    this.selected = undefined; this.detail.replaceChildren(); this.results.replaceChildren(); this.invalidate();
    this.cover.replaceChildren(); option(this.cover, '', '不修改封面');
  }
  private async search() {
    this.clearSearch();
    this.saveSourceChecks();
    const ids = this.sourceIds();
    if (!this.query.value.trim() || !ids.length) throw new MetadataError('verification', '输入搜索词并选择来源');
    const query = this.query.value.trim(), context = this.context();
    const thumbnails = this.thumbnails = new Thumbnails(this.viewport, (url, signal) => this.writer.image(url, signal));
    context.signal.addEventListener('abort', () => thumbnails.dispose(), { once: true });
    const imageContext = { ...context, signal: thumbnails.signal };
    const bar = element('progress'), progressLabel = element('span'); bar.max = ids.length; bar.value = 0; bar.setAttribute('aria-label', '搜索进度');
    this.searchProgress.replaceChildren(progressLabel, bar); this.searchProgress.hidden = false;
    this.status.dataset.state = 'search';
    let completed = 0, failed = 0;
    const progress = () => { bar.value = completed; progressLabel.textContent = `已结束 ${completed} / ${ids.length} 个来源`; };
    progress();
    await Promise.all(ids.map(async id => {
      const group = element('details'); group.className = 'result-group'; group.dataset.provider = id; group.dataset.state = 'pending';
      group.open = !this.collapsedSources.has(id);
      group.addEventListener('toggle', () => { if (group.open) this.collapsedSources.delete(id); else this.collapsedSources.add(id); });
      const heading = element('summary'); heading.append(element('span', id));
      const count = element('span', '检索中'); count.className = 'result-count'; heading.append(count); group.append(heading); this.results.append(group);
      try {
        const result = await searchPreferred(this.registry.list().find(p => p.id === id), this.extension?.providers.find(p => p.id === id), query, context, phase => { count.textContent = phase; });
        group.dataset.state = 'ready'; count.textContent = `${result.mode} · ${result.candidates.length} 项`;
        if (result.note?.startsWith('本地查询失败')) { const note = element('p', result.note); note.className = 'hint'; group.append(note); }
        if (!result.candidates.length) group.append(element('p', '无匹配'));
        const grid = element('div'); grid.className = 'candidate-grid';
        for (const c of result.candidates) {
          const provider = result.provider;
          const candidate = button('', () => void this.run(async () => {
            if (this.selections.some(s => sourceKey(s.record) === `${c.provider}:${c.id}`)) { this.removeSelection(`${c.provider}:${c.id}`); return; }
            this.choose(await provider.get(c.id, this.context()), provider);
          }));
          candidate.disabled = this.busy;
          candidate.className = 'candidate'; candidate.setAttribute('aria-label', c.title); candidate.setAttribute('aria-pressed', 'false');
          candidate.dataset.key = `${c.provider}:${c.id}`; candidate.title = c.title;
          candidate.dataset.mode = provider.capabilities.offline ? 'offline' : 'online';
          const title = element('span', c.title); title.className = 'candidate-title';
          candidate.append(thumbnails.add(c.title, async () => c.cover || (await provider.get(c.id, imageContext)).covers[0]?.url), title); grid.append(candidateCard(candidate, c.title, c.url));
        }
        group.append(grid);
      } catch (error) {
        failed++; group.dataset.state = 'error'; count.textContent = context.signal.aborted ? '已取消' : '来源失败';
        group.append(element('p', error instanceof Error ? error.message : String(error)));
      } finally { completed++; progress(); }
    }));
    cancelled(context.signal);
    if (failed) { this.status.dataset.state = 'error'; this.status.textContent = '部分来源失败'; }
  }
  private async readDirect() {
    this.invalidate();
    const online = this.registry.list().find(p => p.id === this.provider.value);
    const offline = this.extension?.providers.find(p => p.id === this.provider.value && p.available?.() !== false);
    let p = offline ?? online;
    if (!p) throw new MetadataError('unavailable', '请先加载此来源的本地目录');
    let record: MetadataRecord;
    try { record = await p.get(await p.resolveLink(this.direct.value.trim(), this.context()), this.context()); }
    catch (error) {
      cancelled(this.signal);
      if (!offline || !online || p !== offline) throw error;
      p = online; record = await p.get(await p.resolveLink(this.direct.value.trim(), this.context()), this.context());
    }
    this.choose(record, p);
  }
  private choose(record: MetadataRecord, provider: Provider) {
    const next = [...this.selections];
    const existing = next.findIndex(s => sourceKey(s.record) === sourceKey(record));
    if (existing < 0) next.push({ record, provider }); else next[existing] = { record, provider };
    mergeRecords(next.map(s => s.record)); // reject incompatible scopes before changing selection
    // Direct links/associated volumes must also have a left-hand toggle card.
    if (![...this.results.querySelectorAll<HTMLElement>('.candidate')].some(e => e.dataset.key === sourceKey(record))) {
      let group = [...this.results.querySelectorAll<HTMLDetailsElement>('.result-group')].find(e => e.dataset.provider === record.provider);
      if (!group) { group = element('details'); group.className = 'result-group'; group.dataset.provider = record.provider; group.open = true; group.append(element('summary', record.provider)); this.results.append(group); }
      let grid = group.querySelector<HTMLElement>('.candidate-grid');
      if (!grid) { grid = element('div'); grid.className = 'candidate-grid'; group.append(grid); }
      const card = button('', () => { if (!this.busy) { if (this.selections.some(s => sourceKey(s.record) === sourceKey(record))) this.removeSelection(sourceKey(record)); else this.choose(record, provider); } });
      card.className = 'candidate'; card.dataset.key = sourceKey(record); card.setAttribute('aria-label', nativeTitle(record));
      card.dataset.mode = provider.capabilities.offline ? 'offline' : 'online';
      const title = element('span', nativeTitle(record)); title.className = 'candidate-title';
      this.thumbnails ??= new Thumbnails(this.viewport, (url, signal) => this.writer.image(url, signal));
      card.append(this.thumbnails.add(nativeTitle(record), async () => record.covers[0]?.url), title); grid.append(candidateCard(card, nativeTitle(record), record.url));
    }
    this.selections = next; this.renderSelection();
  }
  private removeSelection(key: string): void {
    this.selections = this.selections.filter(s => sourceKey(s.record) !== key); this.renderSelection();
  }
  private renderSelection(): void {
    this.invalidate(); this.detail.replaceChildren();
    const previousCover = this.cover.value === '' ? undefined : this.selected?.covers[Number(this.cover.value)]?.url;
    this.cover.replaceChildren(); option(this.cover, '', '不修改封面');
    this.results.querySelectorAll<HTMLButtonElement>('.candidate').forEach(e => e.setAttribute('aria-pressed', String(this.selections.some(s => sourceKey(s.record) === e.dataset.key))));
    if (!this.selections.length) { this.selected = undefined; this.merged = undefined; this.previewButton.disabled = true; return; }
    this.merged = mergeRecords(this.selections.map(s => s.record), {}, this.settings.acceptedLanguages ?? allLanguages);
    this.selected = this.merged.record;

    for (const { record: r, provider } of this.selections) {

      if (r.books?.length) {
        const volumes = element('details'); volumes.className = 'volumes'; volumes.append(element('summary', `${r.provider} · 关联单卷 · ${r.books.length}`));
        for (const b of r.books) volumes.append(button(`单卷：${nativeTitle(b)}`, () => void this.run(async () => this.choose(await provider.get(b.id, this.context()), provider))));
        this.detail.append(volumes);
      }
    }
    this.merged.covers.forEach(({ cover, provider }, i) => option(this.cover, String(i), `${provider} · ${cover.volume === undefined ? `图片 ${i + 1}` : `第 ${cover.volume} 卷`} ${cover.language ?? ''}`));
    if (previousCover) { const index = this.merged.covers.findIndex(c => c.cover.url === previousCover); if (index >= 0) this.cover.value = String(index); }
    this.previewButton.disabled = this.busy;
  }
  private async makePreview() {
    this.invalidate();
    if (!this.selected || !this.seriesId) throw new MetadataError('verification', '先选择候选');

    if (currentSeries(location, document) !== this.seriesId) throw new MetadataError('conflict', '页面系列变化，请关闭后重新启动');
    let translationWarning: string | undefined;
    if (wantsChineseTags(this.settings.acceptedLanguages ?? allLanguages) && this.fields.get('tags')?.checked && this.selections.some(s => s.record.provider === 'ehentai' && s.record.tags.length)) {
      this.status.textContent = '正在准备中文标签词库…';
      const loaded = await this.translation.load(this.signal);
      const records = this.selections.map(({ record }) => {
        const projected = this.translation.project(record);
        for (const [raw, translated] of projected.replacements) this.tagReplacements.set(raw, translated);
        return projected.record;
      });
      this.merged = mergeRecords(records, {}, this.settings.acceptedLanguages ?? allLanguages); this.selected = this.merged.record;
      translationWarning = loaded.warning;
      this.status.textContent = '';
    } else this.merged = mergeRecords(this.selections.map(s => s.record), {}, this.settings.acceptedLanguages ?? allLanguages);
    this.selected = this.merged.record;
    this.state = await this.client.state(this.seriesId, this.signal);
    const [kind, id] = this.coverTarget.value.split(':');
    const plan = buildPlan(this.state, this.selected, {
      fields: [...this.fields].filter(([, i]) => i.checked).map(([f]) => f),
      bookId: this.book.value || undefined, propagateAuthors: this.propagate.checked,
      mergedFields: this.merged?.values,
      includeUnchanged: true,
      cover: this.cover.value === '' ? undefined : this.selected.covers[Number(this.cover.value)],
      coverTarget: id && (kind === 'series' || kind === 'books') ? { kind, id } : undefined
    });
    await this.writer.prepare(plan, this.signal);
    const previewHead = element('div'); previewHead.className = 'preview-head';
    const back = button('返回选项', () => { if (!this.busy && !this.finishing) { this.invalidate(); this.viewport.scrollTop = 0; } });
    back.className = 'ghost'; back.prepend(icon('back'));
    previewHead.append(element('h3', '确认更改'), back); this.preview.append(previewHead);
    if (translationWarning) this.preview.append(element('p', translationWarning));
    if (plan.cover) {
      try { await this.coverPreview(plan.cover); }
      catch (error) { this.invalidate(); throw error; }
    }
    plan.edits.forEach((edit, index) => {
      const target = edit.target.kind === 'series' ? this.state!.series : this.state!.books.find(b => b.id === edit.target.id);
      const targetHeading = element('h3', `${edit.target.kind === 'series' ? '系列' : '书籍'} · ${target?.metadata.title ?? edit.target.id}`);
      targetHeading.className = 'target-heading'; this.preview.append(targetHeading);
      for (const [field, value] of Object.entries(edit.after)) {
        const row = element('div'); row.className = 'row';
        const check = input(labels[field as Field], row, 'checkbox'); check.checked = true; check.dataset.edit = String(index); check.dataset.field = field;
        const diff = element('div'); diff.className = 'diff';
        const old = element('div'), updated = element('div');
        const sources = this.merged?.used[field as Field]?.join(' + ');
        const beforeLabel = element('div', '当前值'), afterLabel = element('div', `写入值${sources ? ` · ${sources}` : ''}`); beforeLabel.className = afterLabel.className = 'diff-caption';
        const before = edit.before[field];
        old.append(beforeLabel, element('pre', typeof before === 'string' ? before || '—' : JSON.stringify(before, null, 2)));
        const next = element('textarea'); next.dataset.format = typeof value === 'string' ? 'text' : 'json';
        next.value = typeof value === 'string' ? value : JSON.stringify(value, null, 2); next.dataset.edit = String(index); next.dataset.field = field;

        next.setAttribute('aria-label', `${labels[field as Field]}写入值`);
        this.fieldComposer(row, field as Field, value!, before, next, check, afterLabel);
        updated.append(afterLabel, next); diff.append(old, updated); row.append(diff); this.preview.append(row);
      }
    });
    for (const skipped of plan.skipped) this.preview.append(element('p', skipped));

    cancelled(this.signal); this.plan = plan;
    this.controls.hidden = true; this.previewButton.hidden = true; this.viewport.scrollTop = 0;
  }
  private fieldComposer(row: HTMLElement, field: Field, value: Value, before: Value | undefined, textarea: HTMLTextAreaElement, enabled: HTMLInputElement, caption: HTMLElement): void {
    const entries = [...(this.merged?.options[field] ?? [])];
    const existing = field === 'tags' && Array.isArray(before) ? translateExisting(before, this.tagReplacements) : before;
    if (existing !== undefined && existing !== null && existing !== '' && (!Array.isArray(existing) || existing.length)) entries.unshift({ key: 'current', provider: '现有', label: this.tagReplacements.size && field === 'tags' ? 'Komga 当前值（匹配的 EH 标签已翻译）' : 'Komga 当前值', value: existing });
    if (!entries.length) return;
    const controls = element('div'); controls.className = 'field-compose';
    const mode = element('select'); mode.setAttribute('aria-label', `${labels[field]}处理方式`);
    option(mode, 'single', '单选'); if (canMergeField(field, value)) option(mode, 'merge', '合并');
    mode.value = Array.isArray(value) ? 'merge' : 'single';
    const select = element('select'); select.setAttribute('aria-label', `${labels[field]}来源`);
    for (const e of entries) option(select, e.key, e.label);
    select.value = entries.find(e => e.key !== 'current')?.key ?? entries[0]!.key;
    const picks = element('details'); picks.className = 'field-source-picks'; picks.append(element('summary', '选择参与合并的条目'));
    const checks = entries.map(e => { const i = input(e.label, picks, 'checkbox'); i.checked = true; return i; });
    const refresh = () => {
      select.hidden = mode.value !== 'single'; picks.hidden = mode.value !== 'merge';
      const chosen = mode.value === 'single' ? entries.filter(e => e.key === select.value) : entries.filter((_, i) => checks[i]!.checked);
      const next = mode.value === 'single' ? chosen[0]?.value : combineField(field, chosen.map(e => e.value));
      textarea.dataset.format = typeof next === 'string' ? 'text' : 'json';
      textarea.value = next === undefined ? '' : typeof next === 'string' ? next : JSON.stringify(next, null, 2);
      enabled.checked = next !== undefined && !equal(next, before);
      caption.textContent = `写入值 · ${[...new Set(chosen.map(e => e.provider))].join(' + ') || '未选择'}`;
    };
    mode.onchange = select.onchange = refresh; checks.forEach(i => i.onchange = refresh);
    controls.append(mode, select, picks); row.append(controls); refresh();
  }
  private async coverPreview(cover: NonNullable<Plan['cover']>): Promise<void> {
    const target = cover.target.kind === 'series' ? this.state!.series : this.state!.books.find(b => b.id === cover.target.id);
    const section = element('section'); section.className = 'cover-preview';
    section.append(element('h3', `封面 · ${cover.sharedSeries ? '系列 + 唯一书籍（共用）' : cover.target.kind === 'series' ? '系列' : '书籍'} · ${target?.metadata.title ?? cover.target.id}`));
    const comparison = element('div'); comparison.className = 'cover-compare';
    for (const [label, blob] of [['当前封面', cover.beforeBlob], ['替换为', cover.prepared!.blob]] as const) {
      const figure = element('figure'), frame = element('div'); frame.className = 'cover-frame';
      figure.append(element('figcaption', label), frame);
      if (blob) {
        const image = element('img'); image.alt = label;
        const url = URL.createObjectURL(blob); this.previewUrls.add(url); image.src = url;
        try { await image.decode(); }
        catch { throw new MetadataError('verification', `${label}无法显示，请检查图片或页面权限`); }
        cancelled(this.signal); frame.append(image);
      } else frame.append(element('span', '暂无封面'));
      comparison.append(figure);
    }
    section.append(comparison); this.preview.append(section);
  }
  private readPreview(): Plan {
    if (!this.plan) throw new MetadataError('verification', '请先预览');
    // Keep original values/lock guards intact if validation or preflight fails
    // and the user rechecks a previously unchecked field before retrying.
    const plan = { ...this.plan, edits: structuredClone(this.plan.edits) };
    for (const i of this.preview.querySelectorAll<HTMLInputElement>('input[data-field]')) {
      const edit = plan.edits[Number(i.dataset.edit)]!, field = i.dataset.field!;
      if (!i.checked) { delete edit.after[field]; delete edit.before[field]; delete edit.guards[`${field}Lock`]; continue; }
      const textarea = [...this.preview.querySelectorAll<HTMLTextAreaElement>('textarea')].find(t => t.dataset.edit === i.dataset.edit && t.dataset.field === field)!;
      let value: unknown;
      try { value = textarea.dataset.format === 'text' ? textarea.value : JSON.parse(textarea.value); } catch { throw new MetadataError('verification', `${labels[field as Field]} 新值 JSON 格式错误`); }
      edit.after[field] = validateValue(field, value);
      if (equal(edit.after[field], edit.before[field])) { delete edit.after[field]; delete edit.before[field]; delete edit.guards[`${field}Lock`]; }
    }
    plan.edits = plan.edits.filter(e => Object.keys(e.after).length);
    return plan;
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

    const mal = input('MAL Client ID', d, 'password'), cv = input('ComicVine API Key', d, 'password');
    const exh = input('明确启用 ExH', d, 'checkbox'), member = input('ExH member ID', d, 'password'), pass = input('ExH pass hash', d, 'password'), igneous = input('ExH igneous（可选）', d, 'password');
    mal.value = this.settings.credentials.malClientId ?? ''; cv.value = this.settings.credentials.comicVineKey ?? '';
    exh.checked = this.settings.credentials.exhentai?.enabled ?? false;
    member.value = this.settings.credentials.exhentai?.memberId ?? ''; pass.value = this.settings.credentials.exhentai?.passHash ?? ''; igneous.value = this.settings.credentials.exhentai?.igneous ?? '';
    d.append(button('保存设置', () => {
      if (this.busy) return;
      this.settings.credentials = { malClientId: mal.value.trim(), comicVineKey: cv.value.trim(), exhentai: { enabled: exh.checked, memberId: member.value.trim(), passHash: pass.value.trim(), igneous: igneous.value.trim() } };
      storage.set('settings-v1', this.settings);
      this.status.textContent = '设置已保存';
    }));
    return d;
  }
  private sourceIds(): string[] {
    return [...this.sourceToggles.querySelectorAll<HTMLInputElement>('input:checked')]
      .map(i => i.getAttribute('aria-label')!);
  }
  private saveSourceChecks(): void {
    const selected = this.sourceIds();
    this.settings.sources = selected;
  }
  private renderSourceChecks(): void {
    this.sourceToggles.replaceChildren();
    const providers = [...new Map([...this.registry.list(), ...this.extension?.providers ?? []].map(p => [p.id, p])).values()];
    const selected = this.settings.sources;
    this.provider.replaceChildren();
    for (const p of providers) option(this.provider, p.id, p.id);
    for (const p of providers) {
      const i = input(p.id, this.sourceToggles, 'checkbox');
      i.checked = selected.includes(p.id);
      i.onchange = () => { this.saveSourceChecks(); storage.set('settings-v1', this.settings); };
    }
  }

  private async close(): Promise<void> {
    this.controller?.abort(); this.thumbnails?.dispose();
    for (const url of this.previewUrls) URL.revokeObjectURL(url);
    this.previewUrls.clear(); this.plan = undefined;
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
