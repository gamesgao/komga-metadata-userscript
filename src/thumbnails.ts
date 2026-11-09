import { cancelled } from './model';

interface Job { frame: HTMLElement; title: string; resolve: () => Promise<string | undefined>; queued: boolean; started: boolean }
/** One search owns its lazy, bounded image work and blob URLs. No hotlinking,
 * no image credentials embedded in DOM, and no work for folded/offscreen cards. */
export class Thumbnails {
  private controller = new AbortController();
  readonly signal = this.controller.signal;
  private observer: IntersectionObserver;
  private jobs = new Map<Element, Job>();
  private queue: Job[] = [];
  private active = 0;
  private urls = new Set<string>();
  private cache = new Map<string, Promise<string>>();
  constructor(root: HTMLElement, private download: (url: string, signal: AbortSignal) => Promise<Blob>) {
    this.observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const job = this.jobs.get(entry.target);
        if (entry.isIntersecting && job && !job.started && !job.queued) { job.queued = true; this.queue.push(job); }
      }
      this.pump();
    }, { root, rootMargin: '100px 0px' });
  }
  add(title: string, resolve: Job['resolve']): HTMLElement {
    const frame = document.createElement('span'); frame.className = 'cover-thumb';
    frame.dataset.state = 'pending'; frame.setAttribute('aria-label', '加载封面');
    this.jobs.set(frame, { frame, title, resolve, queued: false, started: false });
    this.observer.observe(frame); return frame;
  }
  private pump(): void {
    while (!this.signal.aborted && this.active < 3 && this.queue.length) {
      const job = this.queue.shift()!; job.queued = false;
      if (!job.frame.isConnected || !job.frame.getClientRects().length) continue;
      job.started = true; this.active++; this.observer.unobserve(job.frame);
      void this.load(job).finally(() => { this.active--; this.pump(); });
    }
  }
  private async load(job: Job): Promise<void> {
    try {
      const source = await job.resolve(); cancelled(this.signal);
      if (!source) { job.frame.dataset.state = 'empty'; job.frame.textContent = '暂无封面'; job.frame.setAttribute('aria-label', '暂无封面'); return; }
      let pending = this.cache.get(source);
      if (!pending) {
        pending = this.download(source, this.signal).then(blob => {
          cancelled(this.signal); const url = URL.createObjectURL(blob); this.urls.add(url); return url;
        });
        this.cache.set(source, pending);
      }
      const url = await pending; cancelled(this.signal);
      const image = new Image(); image.alt = `${job.title} · 封面`; image.src = url;
      await image.decode(); cancelled(this.signal);
      job.frame.replaceChildren(image); job.frame.dataset.state = 'ready'; job.frame.removeAttribute('aria-label');
    } catch (error) {
      if (this.signal.aborted) return;
      job.frame.dataset.state = 'error'; job.frame.textContent = '封面加载失败';
      job.frame.setAttribute('aria-label', '封面加载失败');
      job.frame.title = error instanceof Error ? error.message : String(error);
    }
  }
  dispose(): void {
    this.controller.abort(); this.observer.disconnect(); this.queue.length = 0; this.jobs.clear(); this.cache.clear();
    for (const url of this.urls) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}
