import "server-only";
import path from "node:path";
import { LocalStorageProvider } from "./local-storage-provider";
import type { StorageProvider } from "./types";

let instance: StorageProvider | null = null;
let uploadsInstance: StorageProvider | null = null;

/** Returns the configured storage provider for generated exports (singleton). */
export function getStorage(): StorageProvider {
  if (instance) return instance;

  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
    default: {
      const dir = process.env.STORAGE_EXPORTS_DIR ?? path.join(process.cwd(), "storage", "exports");
      instance = new LocalStorageProvider(dir);
      return instance;
    }
  }
}

/** Returns the configured storage provider for user uploads (singleton, private). */
export function getUploadsStorage(): StorageProvider {
  if (uploadsInstance) return uploadsInstance;

  const driver = process.env.STORAGE_DRIVER ?? "local";
  switch (driver) {
    case "local":
    default: {
      const raw = process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), "storage", "uploads");
      const dir = path.resolve(raw);
      uploadsInstance = new LocalStorageProvider(dir);
      return uploadsInstance;
    }
  }
}

export type { StorageProvider } from "./types";
