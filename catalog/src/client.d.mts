import type { Candidate, MetadataRecord, ProviderId } from '../../src/model.js';

export interface CatalogManifest {
  schema_version: number;
  analyzer_version: number;
  provider: ProviderId;
  source_version: string;
  created_at: string;
}
export interface ReadStats { reads: number; bytesRead: number; largestRead: number; fileSize: number }
export class CatalogClient {
  constructor(workerUrl: string | URL);
  open(file: File): Promise<CatalogManifest>;
  search(query: string, provider?: ProviderId, limit?: number): Promise<Candidate[]>;
  get(provider: ProviderId, id: string): Promise<MetadataRecord>;
  manifest(): Promise<CatalogManifest>;
  stats(): Promise<ReadStats>;
  close(): Promise<void>;
  cancel(): void;
  dispose(): void;
}
