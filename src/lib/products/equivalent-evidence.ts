import "server-only";
import { randomUUID } from "node:crypto";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { readImageSize } from "@/lib/exports/logo";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";
import type { EquivalentEvidenceScreenshot } from "@/lib/domain/clinical-equivalent-model";

const ALLOWED_MIME = ["image/png", "image/jpeg", "image/jpg", "image/webp"] as const;
const MAX_BYTES = 8 * 1024 * 1024;

function evidenceKey(companyId: string, productId: string, deviceId: string, fileId: string, ext: string) {
  return `clinical-equiv/${companyId}/${productId}/${deviceId}/${fileId}${ext}`;
}

export async function uploadEquivalentEvidenceScreenshot(params: {
  companyId: string;
  productId: string;
  deviceId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  caption?: string;
}): Promise<EquivalentEvidenceScreenshot> {
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
  const storageKey = evidenceKey(params.companyId, params.productId, params.deviceId, id, ext);
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

export async function readEquivalentEvidenceBuffer(
  storageKey: string,
): Promise<Buffer | null> {
  try {
    if (!(await getUploadsStorage().exists(storageKey))) return null;
    return await getUploadsStorage().read(storageKey);
  } catch {
    return null;
  }
}

const DATASHEET_MIME = ["application/pdf"] as const;
const DATASHEET_MAX = 25 * 1024 * 1024;

function datasheetKey(companyId: string, productId: string, deviceId: string, fileId: string) {
  return `clinical-equiv/${companyId}/${productId}/${deviceId}/datasheet-${fileId}.pdf`;
}

export async function uploadEquivalentDatasheetPdf(params: {
  companyId: string;
  productId: string;
  deviceId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
}): Promise<{ storageKey: string; fileName: string; mimeType: string }> {
  const mime = params.mimeType === "application/x-pdf" ? "application/pdf" : params.mimeType;
  if (!DATASHEET_MIME.includes(mime as (typeof DATASHEET_MIME)[number])) {
    throw new BadRequestError("Datasheet must be a PDF file");
  }
  if (params.buffer.length > DATASHEET_MAX) {
    throw new BadRequestError("PDF exceeds 25 MB");
  }
  if (params.buffer.slice(0, 5).toString() !== "%PDF-") {
    throw new BadRequestError("Invalid PDF file");
  }

  const id = randomUUID();
  const storageKey = datasheetKey(params.companyId, params.productId, params.deviceId, id);
  await getUploadsStorage().save(storageKey, params.buffer);
  return { storageKey, fileName: params.fileName, mimeType: mime };
}

export function assertEvidenceKeyOwned(
  storageKey: string,
  companyId: string,
  productId: string,
  deviceId: string,
): void {
  const prefix = `clinical-equiv/${companyId}/${productId}/${deviceId}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new NotFoundError();
  }
}
