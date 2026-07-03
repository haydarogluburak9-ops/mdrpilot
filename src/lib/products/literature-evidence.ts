import "server-only";
import { randomUUID } from "node:crypto";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { readImageSize } from "@/lib/exports/logo";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
const MAX_BYTES = 8 * 1024 * 1024;

export interface LiteratureEvidenceScreenshot {
  id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  caption?: string;
}

function evidenceKey(
  companyId: string,
  productId: string,
  target: string,
  fileId: string,
  ext: string,
) {
  const safeTarget = target.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  return `clinical-lit/${companyId}/${productId}/${safeTarget}/${fileId}${ext}`;
}

export async function uploadLiteratureEvidenceScreenshot(params: {
  companyId: string;
  productId: string;
  target: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  caption?: string;
}): Promise<LiteratureEvidenceScreenshot> {
  const mime = params.mimeType === "image/jpg" ? "image/jpeg" : params.mimeType;
  if (!ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) {
    throw new BadRequestError("Screenshot must be PNG, JPEG or WebP");
  }
  if (params.buffer.length > MAX_BYTES) {
    throw new BadRequestError("Screenshot exceeds 8 MB");
  }
  if (!readImageSize(params.buffer)) {
    throw new BadRequestError("Invalid image file");
  }

  const ext =
    mime === "image/png" ? ".png" : mime === "image/webp" ? ".webp" : ".jpg";
  const id = randomUUID();
  const storageKey = evidenceKey(params.companyId, params.productId, params.target, id, ext);
  await getUploadsStorage().save(storageKey, params.buffer);

  return {
    id,
    storageKey,
    fileName: params.fileName,
    mimeType: mime,
    uploadedAt: new Date().toISOString(),
    caption: params.caption?.trim() || undefined,
  };
}

export async function readLiteratureEvidenceBuffer(
  storageKey: string,
): Promise<Buffer | null> {
  try {
    if (!(await getUploadsStorage().exists(storageKey))) return null;
    return await getUploadsStorage().read(storageKey);
  } catch {
    return null;
  }
}

export function assertLiteratureEvidenceKeyOwned(
  storageKey: string,
  companyId: string,
  productId: string,
  target: string,
): void {
  const safeTarget = target.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64);
  const prefix = `clinical-lit/${companyId}/${productId}/${safeTarget}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new NotFoundError();
  }
}
