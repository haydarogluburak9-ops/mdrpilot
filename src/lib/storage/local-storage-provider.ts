import "server-only";
import { createReadStream } from "node:fs";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Readable } from "node:stream";
import type { SavedObject, StorageProvider } from "./types";

export class LocalStorageProvider implements StorageProvider {
  constructor(private readonly baseDir: string) {}

  /** Resolve a storage key to an absolute path, blocking path traversal. */
  private resolve(key: string): string {
    const normalized = path.normalize(key).replace(/^(\.\.(\/|\\|$))+/, "");
    const full = path.resolve(this.baseDir, normalized);
    const base = path.resolve(this.baseDir);
    if (!full.startsWith(base + path.sep) && full !== base) {
      throw new Error("Invalid storage key (path traversal)");
    }
    return full;
  }

  async save(key: string, data: Buffer): Promise<SavedObject> {
    const full = this.resolve(key);
    await mkdir(path.dirname(full), { recursive: true });
    await writeFile(full, data);
    return { key, size: data.byteLength };
  }

  async read(key: string): Promise<Buffer> {
    return readFile(this.resolve(key));
  }

  createReadStream(key: string): Readable {
    return createReadStream(this.resolve(key));
  }

  async stat(key: string): Promise<{ size: number } | null> {
    try {
      const s = await stat(this.resolve(key));
      return { size: s.size };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(key));
    } catch {
      /* already gone */
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }
}
