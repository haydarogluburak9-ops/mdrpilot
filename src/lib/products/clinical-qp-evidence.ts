import "server-only";
import { randomUUID } from "node:crypto";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
const MAX_BYTES = 15 * 1024 * 1024;

export type QpEvidenceKind = "cv" | "coi";

function qpKey(companyId: string, productId: string, kind: QpEvidenceKind, fileId: string, ext: string) {
  return `clinical-qp/${companyId}/${productId}/${kind}/${fileId}${ext}`;
}

export async function uploadQpEvidenceFile(params: {
  companyId: string;
  productId: string;
  kind: QpEvidenceKind;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ storageKey: string; fileName: string; mimeType: string }> {
  let mime = params.mimeType;
  if (mime === "application/x-pdf") mime = "application/pdf";
  if (!ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) {
    throw new BadRequestError("File must be PDF or DOCX");
  }
  if (params.buffer.length > MAX_BYTES) {
    throw new BadRequestError("File exceeds 15 MB");
  }

  const ext =
    mime === "application/pdf"
      ? ".pdf"
      : ".docx";
  if (mime === "application/pdf" && params.buffer.slice(0, 5).toString() !== "%PDF-") {
    throw new BadRequestError("Invalid PDF file");
  }

  const id = randomUUID();
  const storageKey = qpKey(params.companyId, params.productId, params.kind, id, ext);
  await getUploadsStorage().save(storageKey, params.buffer);

  return { storageKey, fileName: params.fileName, mimeType: mime };
}

export async function readQpEvidenceBuffer(storageKey: string): Promise<Buffer | null> {
  try {
    if (!(await getUploadsStorage().exists(storageKey))) return null;
    return await getUploadsStorage().read(storageKey);
  } catch {
    return null;
  }
}

export function assertQpEvidenceKeyOwned(
  storageKey: string,
  companyId: string,
  productId: string,
): void {
  const prefix = `clinical-qp/${companyId}/${productId}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new NotFoundError();
  }
}
