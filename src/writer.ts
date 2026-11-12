import { cancelled, MetadataError } from './model';
import { sha256 } from '@noble/hashes/sha2.js';
import { type KomgaClient, type Metadata, type Target } from './komga';
import { equal, isOneShotTarget, normalizeWriteFields, type Plan, type Edit, type CoverEdit } from './plan';
import type { Transport } from './transport';
export interface Snapshot { target: Target; before: Metadata; after: Metadata }
export interface CoverSnapshot { target: Target; previous?: string; previousHash?: string; uploaded: string; uploadedHash: string; sharedSeries?: Target }
export interface Outcome { target: Target; action: 'metadata' | 'cover'; status: 'success' | 'error'; message?: string }
export interface Result { status: 'success' | 'partial' | 'error'; outcomes: Outcome[]; snapshots: Snapshot[]; covers: CoverSnapshot[] }
export async function hash(blob: Blob): Promise<string> {
  // Pure incremental SHA-256 also works on ordinary HTTP Komga deployments.
  const digest = sha256.create();
  for (let offset = 0; offset < blob.size; offset += 1024 * 1024) {
    digest.update(new Uint8Array(await blob.slice(offset, offset + 1024 * 1024).arrayBuffer()));
  }
  return [...digest.digest()].map(b => b.toString(16).padStart(2, '0')).join('');
}
export async function validateImage(blob: Blob): Promise<void> {
  if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(blob.type.toLowerCase()) || blob.size === 0 || blob.size > 25 * 1024 * 1024) throw new MetadataError('verification', '封面必须是 25 MiB 内的有效图片（不能是 HTML 或 SVG）');
  const bytes = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const signature = blob.type === 'image/png' ? [137, 80, 78, 71, 13, 10, 26, 10].every((n, i) => bytes[i] === n)
    : blob.type === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
    : blob.type === 'image/gif' ? String.fromCharCode(...bytes.slice(0, 6)).match(/^GIF8[79]a$/)
    : String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (!signature) throw new MetadataError('verification', '图片 MIME 与文件内容不符');
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(blob);
      const valid = bitmap.width > 0 && bitmap.height > 0; bitmap.close();
      if (!valid) throw new Error('zero dimensions');
    } catch { throw new MetadataError('verification', '封面无法解码'); }
  } else if (typeof Image !== 'undefined' && typeof URL.createObjectURL === 'function') {
    const url = URL.createObjectURL(blob);
    try {
      const img = new Image(); img.src = url; await img.decode();
      if (!img.naturalWidth || !img.naturalHeight) throw new Error('zero dimensions');
    } catch { throw new MetadataError('verification', '封面无法解码'); }
    finally { URL.revokeObjectURL(url); }
  }
}
function verify(current: Metadata, expected: Metadata, nullish = true): void {
  for (const [field, value] of Object.entries(expected)) {
    if (!equal(nullish ? current[field] ?? null : current[field] ?? false, value)) throw new MetadataError('conflict', `${field} 已变化，请重新预览`);
  }
}
function outcome(result: Result, target: Target, action: Outcome['action'], error?: unknown): void {
  result.outcomes.push({ target, action, status: error ? 'error' : 'success', message: error ? (error instanceof Error ? error.message : String(error)) : undefined });
}
function finish(result: Result): Result {
  const successful = result.outcomes.filter(o => o.status === 'success').length;
  result.status = successful === result.outcomes.length && successful > 0 ? 'success' : successful ? 'partial' : 'error';
  return result;
}
export class Writer {
  private busy = false;
  constructor(private client: KomgaClient, private transport: Transport) {}
  async image(url: string, signal: AbortSignal): Promise<Blob> {
    const response = await this.transport.request({ url, responseType: 'blob' }, signal);
    cancelled(signal);
    if (response.status < 200 || response.status >= 300 || !response.blob) throw new MetadataError('http', `封面下载失败 HTTP ${response.status}`);
    await validateImage(response.blob);
    cancelled(signal);
    return response.blob;
  }
  private async verifySharedCover(target: Target | undefined, expected: string | undefined, signal: AbortSignal): Promise<void> {
    if (!target) return;
    const blob = await this.client.displayedThumbnail(target, signal);
    if ((blob ? await hash(blob) : undefined) !== expected) throw new MetadataError('conflict', 'One-shot 系列与书籍封面读回不一致');
  }
  async prepare(plan: Plan, signal: AbortSignal): Promise<Plan> {
    if (plan.cover) {
      const cover = plan.cover; cover.prepared = undefined;
      const blob = await this.image(cover.source.url, signal);
      const selected = (await this.client.thumbnails(cover.target, signal)).find(t => t.selected);
      cover.beforeSelected = selected?.id;
      cover.beforeBlob = selected ? await this.client.thumbnail(cover.target, selected.id, signal) : undefined;
      cover.beforeHash = cover.beforeBlob ? await hash(cover.beforeBlob) : undefined;
      await this.verifySharedCover(cover.sharedSeries, cover.beforeHash, signal);
      cancelled(signal);
      cover.prepared = { url: cover.source.url, blob, hash: await hash(blob) };
    }
    return plan;
  }
  private async coverGuard(edit: CoverEdit, signal: AbortSignal) {
    const selected = (await this.client.thumbnails(edit.target, signal)).find(t => t.selected);
    if (selected?.id !== edit.beforeSelected || (selected && await hash(await this.client.thumbnail(edit.target, selected.id, signal)) !== edit.beforeHash)) throw new MetadataError('conflict', '封面已变化，请重新预览');
  }
  private async metadataGuard(edit: Edit, signal: AbortSignal) {
    const current = await this.client.read(edit.target, signal);
    verify(current, edit.before); verify(current, edit.guards, false);
    const series = await this.client.read({ kind: 'series', id: this.seriesId }, signal);
    for (const field of Object.keys(edit.after)) if (series[`${field}Lock`] === true) throw new MetadataError('conflict', `${field} 系列锁已变化`);
  }
  private seriesId = '';
  async apply(plan: Plan, signal: AbortSignal): Promise<Result> {
    if (this.busy) throw new MetadataError('unavailable', '写入任务进行中');
    if (!plan.edits.length && !plan.cover) throw new MetadataError('verification', '没有选中可写变更');
    for (const edit of plan.edits) edit.after = normalizeWriteFields(edit.after);
    this.busy = true; this.seriesId = plan.seriesId;
    const result: Result = { status: 'error', outcomes: [], snapshots: [], covers: [] };
    try {
      // Preflight every target before writing any target, then reread each immediately before write.
      const fresh = await this.client.state(plan.seriesId, signal);
      if (plan.oneShotBookId && (!isOneShotTarget(fresh) || fresh.books[0]!.id !== plan.oneShotBookId)) throw new MetadataError('conflict', 'One-shot 目标已变化，请重新预览');
      for (const e of plan.edits) {
        if (e.target.kind === 'books' && !fresh.books.some(b => b.id === e.target.id)) throw new MetadataError('conflict', '书籍归属已变化');
        await this.metadataGuard(e, signal);
      }
      if (plan.cover) {
        const cover = plan.cover;
        if (cover.target.kind === 'books' && !fresh.books.some(b => b.id === cover.target.id)) throw new MetadataError('conflict', '封面书籍归属已变化');
        const metadata = await this.client.read(cover.target, signal);
        if (metadata.thumbnailLock || fresh.series.metadata.thumbnailLock) throw new MetadataError('conflict', '封面已锁定');
        if (!cover.prepared || cover.prepared.url !== cover.source.url) throw new MetadataError('verification', '请先生成封面预览');
        await this.coverGuard(cover, signal);
        await this.verifySharedCover(cover.sharedSeries, cover.beforeHash, signal);
      }
      for (const e of plan.edits) {
        try {
          cancelled(signal); await this.metadataGuard(e, signal);
          // Keep scoped originals even when PATCH delivery/readback is uncertain.
          result.snapshots.push({ target: e.target, before: structuredClone(e.before), after: structuredClone(e.after) });
          await this.client.patch(e.target, e.after, signal);
          const readback = await this.client.read(e.target, signal);
          for (const field of Object.keys(e.after)) if (!equal(readback[field], e.after[field])) throw new MetadataError('verification', `${field} 写入读回不符`);
          outcome(result, e.target, 'metadata');
        } catch (error) { outcome(result, e.target, 'metadata', error); if (signal.aborted) break; }
      }
      if (plan.cover) {
        const edit = plan.cover;
        let own: string | undefined;
        try {
          cancelled(signal);
          const old = await this.client.read(edit.target, signal), series = await this.client.read({ kind: 'series', id: plan.seriesId }, signal);
          if (old.thumbnailLock || series.thumbnailLock) throw new MetadataError('conflict', '封面已锁定');
          await this.coverGuard(edit, signal);
          const prepared = edit.prepared!;
          const expected = prepared.hash;
          const existingIds = new Set((await this.client.thumbnails(edit.target, signal)).map(t => t.id));
          const receipt = await this.client.upload(edit.target, prepared.blob, signal);
          if (existingIds.has(receipt)) throw new MetadataError('verification', '上传返回了已有封面 ID；不清理已有封面');
          own = receipt;
          if (await hash(await this.client.thumbnail(edit.target, own, signal)) !== expected) throw new MetadataError('verification', '上传封面内容读回不符');
          await this.coverGuard(edit, signal);
          await this.client.select(edit.target, own, signal);
          const selected = (await this.client.thumbnails(edit.target, signal)).find(t => t.selected);
          if (selected?.id !== own || await hash(await this.client.thumbnail(edit.target, own, signal)) !== expected) throw new MetadataError('verification', '封面选择读回不符');
          await this.verifySharedCover(edit.sharedSeries, expected, signal);
          result.covers.push({ target: edit.target, previous: edit.beforeSelected, previousHash: edit.beforeHash, uploaded: own, uploadedHash: expected, sharedSeries: edit.sharedSeries });
          outcome(result, edit.target, 'cover');
        } catch (error) {
          let message = error instanceof Error ? error.message : String(error);
          if (own) {
            // Cancellation still permits a bounded cleanup of the ID returned by our own upload.
            const cleanup = new AbortController();
            const timer = setTimeout(() => cleanup.abort(), 10000);
            try {
              const selected = (await this.client.thumbnails(edit.target, cleanup.signal)).find(t => t.selected);
              if (selected?.id === own && edit.beforeSelected) {
                if (await hash(await this.client.thumbnail(edit.target, edit.beforeSelected, cleanup.signal)) !== edit.beforeHash) throw new MetadataError('conflict', '原封面内容变化，未恢复选择');
                await this.client.select(edit.target, edit.beforeSelected, cleanup.signal);
              }
              await this.client.remove(edit.target, own, cleanup.signal);
            } catch (cleanupError) { message += `；自身封面清理失败：${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`; }
            finally { clearTimeout(timer); }
          }
          outcome(result, edit.target, 'cover', new Error(message));
        }
      }
      return finish(result);
    } finally { this.busy = false; }
  }
  async undo(previous: Result, seriesId: string, signal: AbortSignal): Promise<Result> {
    if (this.busy) throw new MetadataError('unavailable', '写入任务进行中');
    this.busy = true;
    const result: Result = { status: 'error', outcomes: [], snapshots: [], covers: [] };
    try {
      const state = await this.client.state(seriesId, signal);
      for (const s of previous.snapshots) {
        try {
          if (s.target.kind === 'books' && !state.books.some(b => b.id === s.target.id)) throw new MetadataError('conflict', '书籍归属变化');
          const current = await this.client.read(s.target, signal);
          const series = await this.client.read({ kind: 'series', id: seriesId }, signal);
          verify(current, s.after);
          for (const field of Object.keys(s.before)) if (current[`${field}Lock`] || series[`${field}Lock`]) throw new MetadataError('conflict', `${field} 已锁定，不能撤销`);
          await this.client.patch(s.target, s.before, signal);
          verify(await this.client.read(s.target, signal), s.before);
          outcome(result, s.target, 'metadata');
        } catch (error) { outcome(result, s.target, 'metadata', error); }
      }
      for (const s of previous.covers) {
        try {
          if (s.target.kind === 'books' && !state.books.some(b => b.id === s.target.id)) throw new MetadataError('conflict', '书籍归属变化');
          const metadata = await this.client.read(s.target, signal);
          const series = await this.client.read({ kind: 'series', id: seriesId }, signal);
          if (metadata.thumbnailLock || series.thumbnailLock) throw new MetadataError('conflict', '封面已锁定，不能撤销');
          const selected = (await this.client.thumbnails(s.target, signal)).find(t => t.selected);
          if (selected?.id !== s.uploaded || await hash(await this.client.thumbnail(s.target, s.uploaded, signal)) !== s.uploadedHash) throw new MetadataError('conflict', '封面已被其他操作修改');
          await this.verifySharedCover(s.sharedSeries, s.uploadedHash, signal);
          if (s.previous) {
            if (await hash(await this.client.thumbnail(s.target, s.previous, signal)) !== s.previousHash) throw new MetadataError('conflict', '原封面内容已变化');
            await this.client.select(s.target, s.previous, signal);
            if ((await this.client.thumbnails(s.target, signal)).find(t => t.selected)?.id !== s.previous) throw new MetadataError('verification', '原封面选择读回失败');
          }
          await this.client.remove(s.target, s.uploaded, signal);
          if ((await this.client.thumbnails(s.target, signal)).some(t => t.id === s.uploaded)) throw new MetadataError('verification', '自身上传封面删除读回失败');
          await this.verifySharedCover(s.sharedSeries, s.previousHash, signal);
          outcome(result, s.target, 'cover');
        } catch (error) { outcome(result, s.target, 'cover', error); }
      }
      return finish(result);
    } finally { this.busy = false; }
  }
}
