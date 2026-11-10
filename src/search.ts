import { cancelled, MetadataError, type Candidate, type Context, type Provider } from './model';
export interface RoutedSearch { provider: Provider; candidates: Candidate[]; mode: '本地' | '在线'; note?: string }
/** Offline capability is not a loaded catalog: skip known-unavailable catalogs.
 * A hit owns both detail and thumbnail routing; never re-fetch it online. */
export async function searchPreferred(online: Provider | undefined, offline: Provider | undefined, query: string, context: Context, phase: (text: string) => void = () => {}): Promise<RoutedSearch> {
  let note: string | undefined;
  if (offline && offline.available?.() !== false) {
    phase('本地检索');
    try {
      const candidates = await offline.search(query, context); cancelled(context.signal);
      if (candidates.length || !online) return { provider: offline, candidates, mode: '本地' };
      note = '本地无匹配，已查询在线';
    } catch (error) {
      cancelled(context.signal);
      if (!online) throw error;
      note = `本地查询失败，已查询在线：${error instanceof Error ? error.message : String(error)}`;
    }
  }
  cancelled(context.signal);
  if (!online) throw new MetadataError('unavailable', '请先在「本地数据库」加载此来源的目录');
  phase(note ? '在线兜底' : '在线检索');
  const candidates = await online.search(query, context); cancelled(context.signal);
  return { provider: online, candidates, mode: '在线', note };
}
