import "server-only";
import { randomUUID } from "node:crypto";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { BadRequestError, NotFoundError } from "@/lib/auth/errors";

const ALLOWED_MIME = ["application/pdf"] as const;
const MAX_BYTES = 25 * 1024 * 1024;

export interface AcceptedArticleFile {
  id: string;
  storageKey: string;
  fileName: string;
  mimeType: string;
  uploadedAt: string;
  citation?: string;
  studyIndex?: number;
  pmid?: string;
}

function articleKey(companyId: string, productId: string, fileId: string) {
  return `clinical-articles/${companyId}/${productId}/${fileId}.pdf`;
}

export async function uploadAcceptedArticlePdf(params: {
  companyId: string;
  productId: string;
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  citation?: string;
  studyIndex?: number;
  pmid?: string;
}): Promise<AcceptedArticleFile> {
  const mime = params.mimeType === "application/x-pdf" ? "application/pdf" : params.mimeType;
  if (!ALLOWED_MIME.includes(mime as (typeof ALLOWED_MIME)[number])) {
    throw new BadRequestError("Article must be a PDF file");
  }
  if (params.buffer.length > MAX_BYTES) {
    throw new BadRequestError("PDF exceeds 25 MB");
  }
  if (params.buffer.slice(0, 5).toString() !== "%PDF-") {
    throw new BadRequestError("Invalid PDF file");
  }

  const id = randomUUID();
  const storageKey = articleKey(params.companyId, params.productId, id);
  await getUploadsStorage().save(storageKey, params.buffer);

  return {
    id,
    storageKey,
    fileName: params.fileName,
    mimeType: mime,
    uploadedAt: new Date().toISOString(),
    citation: params.citation?.trim() || undefined,
    studyIndex: params.studyIndex,
    pmid: params.pmid?.replace(/\D/g, "") || undefined,
  };
}

export async function readAcceptedArticleBuffer(storageKey: string): Promise<Buffer | null> {
  try {
    if (!(await getUploadsStorage().exists(storageKey))) return null;
    return await getUploadsStorage().read(storageKey);
  } catch {
    return null;
  }
}

export function assertAcceptedArticleKeyOwned(
  storageKey: string,
  companyId: string,
  productId: string,
): void {
  const prefix = `clinical-articles/${companyId}/${productId}/`;
  if (!storageKey.startsWith(prefix)) {
    throw new NotFoundError();
  }
}
