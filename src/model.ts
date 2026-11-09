export const providerIds = ['bangumi', 'ehentai', 'mangaupdates', 'mangabaka', 'mangadex', 'anilist', 'mal', 'comicvine', 'bookwalker', 'yenpress', 'viz', 'webtoons'] as const;
export type ProviderId = typeof providerIds[number];
export interface Title { text: string; language?: string; type: 'native' | 'localized' | 'alias' }
export interface Author { name: string; role: string; native?: string; localized?: string }
export interface Link { label: string; url: string }
export interface Cover { url: string; volume?: number; language?: string }
export interface MetadataRecord {
  provider: ProviderId; id: string; url: string; titles: Title[];
  summary?: string; publisher?: string; language?: string;
  status?: 'ONGOING' | 'ENDED' | 'HIATUS' | 'ABANDONED';
  ageRating?: number; releaseDate?: string; isbn?: string; volume?: number;
  tags: string[]; genres: string[]; authors: Author[]; covers: Cover[];
  links: Link[]; books?: MetadataRecord[]; raw: unknown;
  warnings?: string[];
}
export interface Candidate { provider: ProviderId; id: string; title: string; url: string; cover?: string }
export interface Capabilities {
  series: boolean; volumes: boolean; volumeMetadata?: boolean; volumeCovers?: boolean; gallery?: boolean;
  authentication?: boolean; offline?: boolean;
}
export interface Credentials {
  malClientId?: string; comicVineKey?: string;
  exhentai?: { enabled: boolean; memberId: string; passHash: string; igneous?: string };
}
export interface Context { signal: AbortSignal; credentials: Credentials }
export interface Provider {
  id: ProviderId; capabilities: Capabilities;
  search(query: string, context: Context): Promise<Candidate[]>;
  get(id: string, context: Context): Promise<MetadataRecord>;
  resolveLink(input: string, context: Context): Promise<string>;
}
export type ErrorCode = 'authentication-required' | 'invalid-id' | 'invalid-response' | 'unavailable' | 'http' | 'cancelled' | 'conflict' | 'verification' | 'unknown-provider';
export class MetadataError extends Error {
  constructor(public code: ErrorCode, message: string, public status?: number) { super(message); this.name = 'MetadataError'; }
}
export function cancelled(signal: AbortSignal): void {
  if (signal.aborted) throw new MetadataError('cancelled', '已取消');
}
export function nativeTitle(record: MetadataRecord): string {
  return (record.titles.find(t => t.type === 'native') ?? record.titles[0])?.text ?? record.id;
}
export class Registry {
  private providers = new Map<ProviderId, Provider>();
  register(provider: Provider): void {
    if (this.providers.has(provider.id)) throw new Error(`Duplicate provider: ${provider.id}`);
    this.providers.set(provider.id, provider);
  }
  get(id: string): Provider {
    const p = this.providers.get(id as ProviderId);
    if (!p) throw new MetadataError('unknown-provider', `未接入来源：${id}`);
    return p;
  }
  list(): Provider[] { return [...this.providers.values()]; }
  async search(ids: string[], query: string, context: Context): Promise<SearchResult[]> {
    return Promise.all(ids.map(async id => {
      try { return { id, candidates: await this.get(id).search(query, context) }; }
      catch (error) { return { id, error: error instanceof Error ? error : new Error(String(error)) }; }
    }));
  }
}
export interface SearchResult { id: string; candidates?: Candidate[]; error?: Error }
// Component 2 registers a Provider and mounts its independent advanced panel here.
export interface CatalogExtension {
  providers: Provider[];
  mount(container: HTMLElement): void | (() => void | Promise<void>);
  dispose(): void | Promise<void>;
}
declare const __ASSET_BASE__: string;
export const workerAssetBase = typeof __ASSET_BASE__ === 'undefined' ? '' : __ASSET_BASE__;
