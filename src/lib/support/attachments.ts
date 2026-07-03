import "server-only";
import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";
import { sanitizeFileName, validateUpload } from "@/lib/files/config";
import {
  SUPPORT_MAX_FILES,
  SUPPORT_MAX_FILE_BYTES,
  SUPPORT_MAX_FILE_MB,
  type SupportAttachmentMeta,
} from "@/lib/support/constants";

export { SUPPORT_MAX_FILES, SUPPORT_MAX_FILE_MB, SUPPORT_MAX_FILE_BYTES } from "@/lib/support/constants";
export type { SupportAttachmentMeta } from "@/lib/support/constants";

const SUPPORT_DIR = path.join(process.cwd(), "storage", "support-attachments");

export async function saveSupportAttachments(
  ticketId: string,
  files: File[],
): Promise<{ attachments: SupportAttachmentMeta[]; buffers: { fileName: string; mimeType: string; buffer: Buffer }[] }> {
  const attachments: SupportAttachmentMeta[] = [];
  const buffers: { fileName: string; mimeType: string; buffer: Buffer }[] = [];

  if (files.length > SUPPORT_MAX_FILES) {
    throw new Error(`Maximum ${SUPPORT_MAX_FILES} files allowed`);
  }

  const ticketDir = path.join(SUPPORT_DIR, ticketId);
  await fs.mkdir(ticketDir, { recursive: true });

  for (const file of files) {
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > SUPPORT_MAX_FILE_BYTES) {
      throw new Error(`Each file must be under ${SUPPORT_MAX_FILE_MB} MB`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const head = buffer.subarray(0, Math.min(buffer.length, 16));
    const validation = validateUpload({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      head,
    });
    if (!validation.ok) {
      throw new Error(validation.error ?? "Unsupported file");
    }

    const safeName = sanitizeFileName(file.name);
    const unique = `${randomBytes(4).toString("hex")}-${safeName}`;
    const absPath = path.join(ticketDir, unique);
    await fs.writeFile(absPath, buffer);

    const storageKey = path.posix.join("support-attachments", ticketId, unique);
    attachments.push({
      fileName: safeName,
      storageKey,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
    });
    buffers.push({ fileName: safeName, mimeType: file.type, buffer });
  }

  return { attachments, buffers };
}
