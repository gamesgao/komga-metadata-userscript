export interface BuildCapability { available: boolean; reason: string }
export interface BuildResult { provider: string; count: number; sourceVersion: string }
export interface WritableTarget {
  write(chunk: ArrayBuffer): Promise<unknown>;
  close(): Promise<unknown>;
  abort(reason?: unknown): Promise<unknown>;
}
export interface BuildWorkerOptions {
  workerFactory?: () => Worker | Promise<Worker | { worker: Worker; initOptions?: { wasmBinary?: ArrayBuffer } }>;
  initOptions?: { wasmBinary?: ArrayBuffer };
}
export function browserBuildCapability(): BuildCapability;
export class BrowserCatalogBuilder {
  constructor(workerUrl?: string | URL, options?: BuildWorkerOptions);
  readonly ready: boolean;
  build(file: File, provider: string, sourceVersion?: string): Promise<BuildResult>;
  file(): Promise<File>;
  exportTo(writable: WritableTarget, chunkSize?: number): Promise<number>;
  cancel(): void;
  dispose(): Promise<void>;
}
