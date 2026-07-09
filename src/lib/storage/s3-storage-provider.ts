/**
 * S3 / S3-compatible storage (AWS, MinIO, R2, etc.).
 * Enabled when STORAGE_DRIVER=s3 and STORAGE_S3_BUCKET is set.
 */
import "server-only";
import { Readable } from "node:stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import type { SavedObject, StorageProvider } from "./types";

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`Missing required env ${name} for S3 storage`);
  return v;
}

export class S3StorageProvider implements StorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;

  constructor(opts?: { bucket?: string; prefix?: string }) {
    this.bucket = opts?.bucket ?? requireEnv("STORAGE_S3_BUCKET");
    this.prefix = (opts?.prefix ?? process.env.STORAGE_S3_PREFIX ?? "").replace(/^\/+|\/+$/g, "");
    const region = process.env.STORAGE_S3_REGION ?? process.env.AWS_REGION ?? "eu-central-1";
    const endpoint = process.env.STORAGE_S3_ENDPOINT?.trim() || undefined;
    this.client = new S3Client({
      region,
      endpoint,
      forcePathStyle: process.env.STORAGE_S3_FORCE_PATH_STYLE === "true" || Boolean(endpoint),
      credentials:
        process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
          ? {
              accessKeyId: process.env.AWS_ACCESS_KEY_ID,
              secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            }
          : undefined,
    });
  }

  private objectKey(key: string): string {
    const normalized = key.replace(/^\/+/, "").replace(/\.\./g, "");
    return this.prefix ? `${this.prefix}/${normalized}` : normalized;
  }

  async save(key: string, data: Buffer): Promise<SavedObject> {
    const objectKey = this.objectKey(key);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Body: data,
      }),
    );
    return { key, size: data.byteLength };
  }

  async read(key: string): Promise<Buffer> {
    const res = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key) }),
    );
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`S3 object empty: ${key}`);
    return Buffer.from(bytes);
  }

  createReadStream(key: string): Readable {
    const stream = new Readable({
      read() {},
    });
    void this.read(key)
      .then((buf) => {
        stream.push(buf);
        stream.push(null);
      })
      .catch((err) => stream.destroy(err instanceof Error ? err : new Error(String(err))));
    return stream;
  }

  async stat(key: string): Promise<{ size: number } | null> {
    try {
      const res = await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key) }),
      );
      return { size: res.ContentLength ?? 0 };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: this.objectKey(key) }),
      );
    } catch {
      /* ignore */
    }
  }

  async exists(key: string): Promise<boolean> {
    return (await this.stat(key)) !== null;
  }
}
