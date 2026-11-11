import type { Candidate, MetadataRecord, ProviderId } from '../../src/model.js';
import type { CatalogManifest, CatalogWorkerOptions, ReadStats } from './client.mjs';
export class CatalogCollection {
 constructor(workerUrl?: string | URL, options?: CatalogWorkerOptions);
 readonly hasFile: boolean;
 readonly selectedFile?: File;
 hasProvider(id: string): boolean;
 fileFor(id: string): File | undefined;
 remove(id: string): void;
 cancelQueries(): void;
 restoring?: Promise<void>;
 open(file: File, verification?: {sha256?: string}): Promise<CatalogManifest>;
 search(query: string, provider?: ProviderId, limit?: number): Promise<Candidate[]>;
 get(provider: ProviderId, id: string): Promise<MetadataRecord>;
 manifest(): Promise<CatalogManifest>;
 stats(): Promise<ReadStats>;
 close(): Promise<void>;
 cancel(): void;
 dispose(): void;
}
