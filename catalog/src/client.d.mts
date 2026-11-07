import type { Candidate, MetadataRecord, ProviderId } from '../../src/model.js';

export interface CatalogManifest {
  schema_version: number;
  analyzer_version: number;
  provider: ProviderId;
  source_version: string;
  created_at: string;
}
export interface ReadStats { reads: number; bytesRead: number; largestRead: number; fileSize: number }
export interface CatalogWorkerOptions {
  workerFactory?: () => Worker | Promise<Worker | { worker: Worker; initOptions?: { wasmBinary?: ArrayBuffer } }>;
  initOptions?: { wasmBinary?: ArrayBuffer };
}
export class CatalogClient {
  constructor(workerUrl?: string | URL, options?: CatalogWorkerOptions);
  readonly hasFile: boolean;
  readonly selectedFile?: File;
  open(file: File, verification?: { sha256?: string }): Promise<CatalogManifest>;
  search(query: string, provider?: ProviderId, limit?: number): Promise<Candidate[]>;
  get(provider: ProviderId, id: string): Promise<MetadataRecord>;
  manifest(): Promise<CatalogManifest>;
  stats(): Promise<ReadStats>;
  close(): Promise<void>;
  cancel(): void;
  dispose(): void;
}
