// Tasks keep running independently of the view; only explicit cancellation aborts them.
export class TaskQueue {
  constructor(limit = 1) { this.limit = limit; this.active = 0; this.waiting = []; }
  run(work, signal) {
    return new Promise((resolve, reject) => {
      const task = { work, signal, resolve, reject, started: false };
      task.abort = () => {
        if (task.started) return; // Running work owns its cancellation/cleanup.
        this.waiting = this.waiting.filter(item => item !== task);
        signal?.removeEventListener('abort', task.abort);
        reject(new DOMException('已取消', 'AbortError'));
      };
      if (signal?.aborted) { task.abort(); return; }
      signal?.addEventListener('abort', task.abort, { once: true });
      this.waiting.push(task); this.pump();
    });
  }
  pump() {
    while (this.active < this.limit && this.waiting.length) {
      const task = this.waiting.shift(); task.started = true; this.active++;
      task.signal?.removeEventListener('abort', task.abort);
      Promise.resolve().then(() => {
        if (task.signal?.aborted) throw new DOMException('已取消', 'AbortError');
        return task.work();
      }).then(task.resolve, task.reject).finally(() => { this.active--; this.pump(); });
    }
  }
}
