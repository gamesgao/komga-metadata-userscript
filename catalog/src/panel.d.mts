import type { Provider } from '../../src/model.js';
import type { CatalogClient } from './client.mjs';
export interface PreparedCatalog {
  provider: string; source_version: string; url: string; size_bytes?: number; sha256?: string;
  schema_version?: number; analyzer_version?: number;
}
export type CatalogProviderId = 'bangumi' | 'ehentai' | 'mangabaka' | 'bookwalker';
export interface PanelOptions {
  download?: (url: string, filename: string, signal: AbortSignal) => Promise<void>;
  fetchManifest?: (url: string, signal: AbortSignal) => Promise<unknown>;
  buildWorkerUrl?: string | URL;
  buildWorkerFactory?: () => Worker | Promise<Worker | { worker: Worker; initOptions?: { wasmBinary?: ArrayBuffer } }>;
  buildInitOptions?: { wasmBinary?: ArrayBuffer };
  builder?: import('./browser-builder.mjs').BrowserCatalogBuilder;
}
export function validatePreparedManifest(manifest: unknown): PreparedCatalog[];
export function mountCatalogPanel(container: HTMLElement, client: CatalogClient, options?: PanelOptions): () => Promise<void>;
export function catalogProvider(client: CatalogClient, provider: CatalogProviderId): Provider;
