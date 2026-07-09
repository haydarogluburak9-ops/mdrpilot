import "server-only";
import path from "node:path";
import { LocalStorageProvider } from "./local-storage-provider";
import { S3StorageProvider } from "./s3-storage-provider";
import type { StorageProvider } from "./types";

let instance: StorageProvider | null = null;
let uploadsInstance: StorageProvider | null = null;

function createProvider(kind: "exports" | "uploads"): StorageProvider {
  const driver = (process.env.STORAGE_DRIVER ?? "local").toLowerCase();
  if (driver === "s3") {
    const prefix =
      kind === "exports"
        ? process.env.STORAGE_S3_EXPORTS_PREFIX ?? "exports"
        : process.env.STORAGE_S3_UPLOADS_PREFIX ?? "uploads";
    return new S3StorageProvider({ prefix });
  }

  if (kind === "exports") {
    const dir = process.env.STORAGE_EXPORTS_DIR ?? path.join(process.cwd(), "storage", "exports");
    return new LocalStorageProvider(dir);
  }
  const raw = process.env.STORAGE_LOCAL_DIR ?? path.join(process.cwd(), "storage", "uploads");
  return new LocalStorageProvider(path.resolve(raw));
}

/** Returns the configured storage provider for generated exports (singleton). */
export function getStorage(): StorageProvider {
  if (!instance) instance = createProvider("exports");
  return instance;
}

/** Returns the configured storage provider for user uploads (singleton, private). */
export function getUploadsStorage(): StorageProvider {
  if (!uploadsInstance) uploadsInstance = createProvider("uploads");
  return uploadsInstance;
}

export type { StorageProvider } from "./types";
