import "server-only";
import { createHash } from "node:crypto";
import type { DocumentKind, UploadedFile } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog } from "@/lib/audit";
import { HttpError, NotFoundError } from "@/lib/auth/errors";
import { resolveCitations, persistCitations } from "@/lib/rag/citation-builder";
import { indexUploadedFile } from "@/lib/rag/indexer";
import { extensionOf, sanitizeFileName, validateUpload } from "./config";
import { extractText } from "./text-extraction";
import { analyzeFile, type AnalysisProductContext } from "./analysis";
import { enrichRiskFileAnalysis } from "@/lib/domain/risk-document-meta";

async function recordAnalysisRag(companyId: string, fileId: string, fileName: string, text: string, analysis: Awaited<ReturnType<typeof analyzeFile>>) {
  await persistCitations({
    companyId, targetType: "FILE_ANALYSIS", targetId: fileId, uploadedFileId: fileId,
    citations: resolveCitations(analysis.citations, analysis._clauses ?? []),
  });
  if (text) await indexUploadedFile({ companyId, uploadedFileId: fileId, fileName, text });
}

export interface UploadParams {
  companyId: string;
  userId: string;
  productId?: string | null;
  documentKind: DocumentKind;
  originalName: string;
  mimeType: string;
  buffer: Buffer;
  ip?: string | null;
}

export interface UploadResult {
  file: UploadedFile;
  duplicateOf?: { id: string; fileName: string } | null;
}

async function productContext(companyId: string, productId: string): Promise<AnalysisProductContext> {
  const p = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      gsprItems: { select: { id: true, gsprNo: true, requirementSummary: true } },
      technicalSections: { select: { id: true, key: true, title: true } },
      riskItems: { select: { id: true, hazard: true } },
    },
  });
  if (!p || p.companyId !== companyId) throw new NotFoundError();
  return {
    name: p.name,
    deviceClass: p.deviceClass,
    gsprItems: p.gsprItems,
    technicalSections: p.technicalSections,
    riskItems: p.riskItems,
  };
}

/**
 * Validates, stores (privately), records and analyses an uploaded file.
 * Validation failures throw before anything is persisted.
 */
export async function uploadFile(params: UploadParams): Promise<UploadResult> {
  const head = params.buffer.subarray(0, 16);
  const validation = validateUpload({
    fileName: params.originalName,
    mimeType: params.mimeType,
    size: params.buffer.byteLength,
    head,
  });
  if (!validation.ok || !validation.type) {
    throw new ValidationError(validation.error ?? "Invalid file");
  }

  // Validate product ownership up-front.
  let ctx: AnalysisProductContext | null = null;
  if (params.productId) ctx = await productContext(params.companyId, params.productId);

  const checksum = createHash("sha256").update(params.buffer).digest("hex");
  const ext = extensionOf(params.originalName);
  const displayName = sanitizeFileName(params.originalName);

  // Non-blocking duplicate detection (same product + checksum).
  const duplicate = await prisma.uploadedFile.findFirst({
    where: { companyId: params.companyId, productId: params.productId ?? null, checksumSha256: checksum, deletedAt: null },
    select: { id: true, fileName: true },
  });

  const file = await prisma.uploadedFile.create({
    data: {
      companyId: params.companyId,
      productId: params.productId ?? null,
      uploadedById: params.userId,
      originalName: displayName,
      fileName: displayName,
      mimeType: params.mimeType || `application/${ext}`,
      extension: ext,
      sizeBytes: params.buffer.byteLength,
      checksumSha256: checksum,
      documentKind: params.documentKind,
      storageKey: "", // set after we know the id
      analysisStatus: "PENDING",
    },
  });

  const storedName = `${file.id}.${ext}`;
  const key = `${params.companyId}/${params.productId ?? "company"}/${storedName}`;
  await getUploadsStorage().save(key, params.buffer);
  await prisma.uploadedFile.update({ where: { id: file.id }, data: { storageKey: key, storedName } });

  await writeAuditLog({
    action: "file.upload",
    userId: params.userId,
    companyId: params.companyId,
    entity: "UploadedFile",
    entityId: file.id,
    metadata: { documentKind: params.documentKind, size: params.buffer.byteLength, duplicate: !!duplicate },
    ip: params.ip,
  });

  // Best-effort extraction + analysis (failure marks FAILED but keeps the file).
  let finalFile: UploadedFile;
  try {
    const text = await extractText(validation.type.kind, params.buffer);
    const analysis = await analyzeFile({
      fileName: displayName,
      documentKind: params.documentKind,
      mimeType: params.mimeType,
      extractedText: text,
      product: ctx,
      companyId: params.companyId,
    });
    const analysisJson = enrichRiskFileAnalysis(
      displayName,
      text,
      { ...analysis, _clauses: undefined } as Record<string, unknown>,
    );
    finalFile = await prisma.uploadedFile.update({
      where: { id: file.id },
      data: {
        textExtract: text || null,
        analysisSummary: analysis.summary,
        aiSummary: analysis.summary,
        analysisJson: analysisJson as object,
        analysisStatus: "COMPLETED",
      },
    });
    await recordAnalysisRag(params.companyId, file.id, displayName, text, analysis);
    await writeAuditLog({
      action: "file.analyze",
      userId: params.userId,
      companyId: params.companyId,
      entity: "UploadedFile",
      entityId: file.id,
      metadata: { confidence: analysis.confidence, links: analysis.recommendedLinks.length },
      ip: params.ip,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    finalFile = await prisma.uploadedFile.update({
      where: { id: file.id },
      data: { analysisStatus: "FAILED", analysisSummary: message.slice(0, 300) },
    });
  }

  return { file: finalFile, duplicateOf: duplicate };
}

/** Re-runs analysis on an existing (company-scoped) file. */
export async function reanalyzeFile(companyId: string, fileId: string, userId: string, ip?: string | null): Promise<UploadedFile> {
  const file = await prisma.uploadedFile.findFirst({ where: { id: fileId, deletedAt: null } });
  if (!file || file.companyId !== companyId) throw new NotFoundError();

  const ext = (file.extension ?? extensionOf(file.fileName)) as string;
  const kindMap: Record<string, "pdf" | "docx" | "xlsx" | "png" | "jpg"> = {
    pdf: "pdf", docx: "docx", xlsx: "xlsx", png: "png", jpg: "jpg", jpeg: "jpg",
  };
  const allowedKind = kindMap[ext] ?? "pdf";

  let ctx: AnalysisProductContext | null = null;
  if (file.productId) ctx = await productContext(companyId, file.productId);

  try {
    let text = file.textExtract ?? "";
    if (!text && file.storageKey) {
      const buf = await getUploadsStorage().read(file.storageKey);
      text = await extractText(allowedKind, buf);
    }
    const analysis = await analyzeFile({
      fileName: file.fileName,
      documentKind: file.documentKind,
      mimeType: file.mimeType,
      extractedText: text,
      product: ctx,
      companyId,
    });
    const analysisJson = { ...analysis, _clauses: undefined };
    const updated = await prisma.uploadedFile.update({
      where: { id: file.id },
      data: {
        textExtract: text || null,
        analysisSummary: analysis.summary,
        aiSummary: analysis.summary,
        analysisJson: analysisJson as object,
        analysisStatus: "COMPLETED",
      },
    });
    await recordAnalysisRag(companyId, file.id, file.fileName, text, analysis);
    await writeAuditLog({
      action: "file.analyze",
      userId,
      companyId,
      entity: "UploadedFile",
      entityId: file.id,
      metadata: { reanalyze: true, links: analysis.recommendedLinks.length },
      ip,
    });
    return updated;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Analysis failed";
    return prisma.uploadedFile.update({
      where: { id: file.id },
      data: { analysisStatus: "FAILED", analysisSummary: message.slice(0, 300) },
    });
  }
}

export class ValidationError extends HttpError {
  constructor(message: string) {
    super(400, message);
    this.name = "ValidationError";
  }
}
