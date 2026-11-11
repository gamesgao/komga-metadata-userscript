export interface CatalogWritable { write(data: BlobPart): Promise<void>; close(): Promise<void>; abort(): Promise<void> }
export interface CatalogFile { getFile(): Promise<File>; createWritable(): Promise<CatalogWritable> }
export interface CatalogDirectory { getFileHandle(name: string, options?: {create?: boolean}): Promise<CatalogFile>; removeEntry(name: string): Promise<void> }
export function storageBackend(): 'opfs' | 'legacy' | undefined;
export function uniqueId(): string;
export function catalogDirectory(name: string, create?: boolean): Promise<CatalogDirectory>;
export function transferDirectory(directory: CatalogDirectory): unknown;
export function receiveDirectory(directory: unknown): Promise<CatalogDirectory>;
