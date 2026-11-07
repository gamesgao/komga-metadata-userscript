import type { Provider } from '../../src/model.js';
import type { CatalogClient } from './client.mjs';
export interface PreparedCatalog { provider: string; source_version: string; url: string }
export type CatalogProviderId = 'bangumi' | 'ehentai' | 'mangabaka' | 'bookwalker';
export interface PanelOptions {
  download?: (url: string, filename: string) => Promise<void>;
  fetchManifest?: (url: string) => Promise<unknown>;
  buildWorkerUrl?: string | URL;
}
export function validatePreparedManifest(manifest: unknown): PreparedCatalog[];
export function mountCatalogPanel(container: HTMLElement, client: CatalogClient, options?: PanelOptions): () => Promise<void>;
export function catalogProvider(client: CatalogClient, provider: CatalogProviderId): Provider;
