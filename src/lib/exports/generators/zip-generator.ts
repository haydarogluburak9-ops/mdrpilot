import "server-only";
import archiver from "archiver";

export interface ZipEntry {
  name: string;
  buffer: Buffer;
}

export function buildZip(entries: ZipEntry[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks: Buffer[] = [];

    archive.on("data", (c: Buffer) => chunks.push(c));
    archive.on("warning", (err) => {
      if ((err as { code?: string }).code !== "ENOENT") reject(err);
    });
    archive.on("error", reject);
    archive.on("end", () => resolve(Buffer.concat(chunks)));

    for (const e of entries) archive.append(e.buffer, { name: e.name });
    void archive.finalize();
  });
}
