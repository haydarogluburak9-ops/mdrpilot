import type { Readable } from "node:stream";

export interface SavedObject {
  key: string;
  size: number;
}

/**
 * Storage abstraction. The local implementation writes to disk under a private
 * directory; a future S3/GCS provider can implement the same interface so that
 * export download URLs are never public paths.
 */
export interface StorageProvider {
  save(key: string, data: Buffer): Promise<SavedObject>;
  read(key: string): Promise<Buffer>;
  createReadStream(key: string): Readable;
  stat(key: string): Promise<{ size: number } | null>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
}
