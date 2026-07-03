import "server-only";
import type { Standard, StandardSourceType } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { validateUpload } from "@/lib/files/config";
import { extractText } from "@/lib/files/text-extraction";
import { indexStandardText } from "./indexer";

const UPLOADABLE_SOURCE_TYPES: StandardSourceType[] = ["USER_UPLOADED_LICENSED", "INTERNAL_PROCEDURE"];

export interface UploadStandardParams {
  companyId: string;
  userId: string;
  code: string;
  title: string;
  version?: string | null;
  jurisdiction?: string | null;
  sourceType: StandardSourceType;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  ip?: string | null;
}

/**
 * Creates a company-owned Standard from a user-uploaded licensed standard or
 * internal procedure, then indexes its text for company-scoped RAG.
 * The document stays private to the uploading company (isPublic = false).
 */
export async function uploadStandardDocument(params: UploadStandardParams): Promise<{ standard: Standard; chunks: number }> {
  if (!UPLOADABLE_SOURCE_TYPES.includes(params.sourceType)) {
    throw new BadRequestError("Only licensed standards or internal procedures can be uploaded.");
  }
  if (!params.code.trim() || !params.title.trim()) {
    throw new BadRequestError("Standard code and title are required.");
  }

  const validation = validateUpload({
    fileName: params.originalName,
    mimeType: params.mimeType,
    size: params.buffer.byteLength,
    head: params.buffer.subarray(0, 16),
  });
  if (!validation.ok || !validation.type) {
    throw new BadRequestError(validation.error ?? "Invalid file");
  }

  const text = await extractText(validation.type.kind, params.buffer).catch(() => "");

  const standard = await prisma.standard.create({
    data: {
      companyId: params.companyId,
      code: params.code.trim(),
      title: params.title.trim(),
      version: params.version?.trim() || null,
      jurisdiction: params.jurisdiction?.trim() || null,
      sourceType: params.sourceType,
      isPublic: false,
    },
  });

  const chunks = text
    ? await indexStandardText({
        standardId: standard.id, companyId: params.companyId,
        sourceType: params.sourceType, title: standard.code, text,
      })
    : 0;

  await writeAuditLog({
    action: "standard.upload", userId: params.userId, companyId: params.companyId,
    entity: "Standard", entityId: standard.id,
    metadata: { code: standard.code, sourceType: params.sourceType, chunks }, ip: params.ip,
  });

  return { standard, chunks };
}

/** Deletes a company-owned standard (public standards cannot be deleted). */
export async function deleteStandard(companyId: string, id: string, userId: string, ip?: string | null): Promise<void> {
  const standard = await prisma.standard.findFirst({ where: { id } });
  if (!standard || standard.companyId !== companyId) throw new NotFoundError();
  await prisma.knowledgeChunk.deleteMany({ where: { standardId: id } });
  await prisma.standard.delete({ where: { id } });
  await writeAuditLog({
    action: "standard.delete", userId, companyId, entity: "Standard", entityId: id,
    metadata: { code: standard.code }, ip,
  });
}
