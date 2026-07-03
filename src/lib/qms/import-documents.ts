import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { QMS_REGISTER_EXCLUDED_CODES } from "@/lib/domain/constants";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { extensionOf } from "@/lib/files/config";
import { extractText } from "@/lib/files/text-extraction";
import { inferParentProcedureCode } from "@/lib/qms/procedure-children";
import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";
import { scaffoldCompanyQms } from "@/lib/qms/scaffold";
import type { DocStatus } from "@/lib/domain/types";
import {
  appendRevisionHistory,
  parseRevisionHistory,
  planQmsRevisionOnContentChange,
  revisionNoToLabel,
} from "@/lib/qms/revision";
import { snapshotQmsDocumentRevision } from "@/lib/qms/revision-snapshots";

const CODE_RE =
  /\b(QM-01|SOP-[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)?|FORM-[A-Z0-9-]+|WI-[A-Z0-9-]+|TAL-[A-Z0-9-]+|PLAN-[A-Z0-9-]+|LIST-[A-Z0-9-]+|DIAGRAM-[A-Z0-9-]+)\b/gi;

export interface QmsImportItemResult {
  fileId: string;
  fileName: string;
  inferredCode: string | null;
  documentId?: string;
  status: "imported" | "skipped" | "unmatched" | "failed";
  error?: string;
  revisionNote?: string;
}

export interface QmsImportResult {
  imported: number;
  skipped: number;
  unmatched: number;
  failed: number;
  items: QmsImportItemResult[];
}

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/_/g, "-");
}

/** Infer KYS document code from filename or extracted text header. */
export function inferQmsCodeFromFile(
  fileName: string,
  textHead: string,
  knownCodes: Set<string>,
): string | null {
  const candidates: string[] = [];
  const fromName = fileName.replace(/\.[^.]+$/, "");
  for (const m of fromName.matchAll(CODE_RE)) {
    candidates.push(normalizeCode(m[1]));
  }
  const head = textHead.slice(0, 800);
  for (const m of head.matchAll(CODE_RE)) {
    candidates.push(normalizeCode(m[1]));
  }

  for (const code of candidates) {
    if (knownCodes.has(code)) return code;
  }

  // Keyword fallbacks (Turkish + English)
  const lower = `${fromName} ${head.slice(0, 200)}`.toLowerCase();
  if (/el\s*kitab|quality\s*manual|kalite\s*el/.test(lower) && knownCodes.has("QM-01")) {
    return "QM-01";
  }
  if (/organizasyon|organization|sorumluluk|roles/.test(lower) && knownCodes.has("SOP-ORG")) {
    return "SOP-ORG";
  }

  return candidates[0] ?? null;
}

async function textFromUpload(companyId: string, fileId: string): Promise<{ text: string; fileName: string }> {
  const file = await prisma.uploadedFile.findFirst({
    where: { id: fileId, companyId, deletedAt: null },
  });
  if (!file) throw new NotFoundError("File not found");

  let text = file.textExtract?.trim() ?? "";
  if (!text && file.storageKey) {
    const ext = (file.extension ?? extensionOf(file.fileName)).toLowerCase();
    const kindMap: Record<string, "pdf" | "docx"> = { pdf: "pdf", docx: "docx", doc: "docx" };
    const kind = kindMap[ext];
    if (kind) {
      const buf = await getUploadsStorage().read(file.storageKey);
      text = await extractText(kind, buf);
      if (text) {
        await prisma.uploadedFile.update({
          where: { id: file.id },
          data: { textExtract: text },
        });
      }
    }
  }
  if (!text.trim()) throw new BadRequestError("Could not extract text. Use Word (.docx) or PDF.");
  return { text, fileName: file.fileName };
}

function markdownFromPlain(text: string, title: string): string {
  const trimmed = text.trim();
  if (trimmed.includes("## ") || trimmed.startsWith("# ")) return trimmed;
  return `## ${title}\n\n${trimmed}`;
}

export async function applyImportedQmsContent(params: {
  companyId: string;
  documentId: string;
  content: string;
  importedBy: string;
  sourceFileName: string;
  locale: "tr" | "en";
  overwrite?: boolean;
  sourceFileId?: string;
}): Promise<{ revisionNo: number; version: string; status: DocStatus; bumped: boolean }> {
  const doc = await prisma.qMSDocument.findFirst({
    where: { id: params.documentId, companyId: params.companyId, deletedAt: null },
  });
  if (!doc) throw new NotFoundError();

  const existing = (doc.content?.trim() ?? "").length > 0;
  if (existing && !params.overwrite) {
    throw new BadRequestError("Document already has content. Enable overwrite to replace.");
  }

  const now = new Date();
  const plan = planQmsRevisionOnContentChange({
    status: doc.status as DocStatus,
    revisionNo: doc.revisionNo ?? 0,
    issueDate: doc.issueDate,
  });

  const note =
    params.locale === "tr"
      ? plan.bump
        ? `Mevcut doküman içe aktarıldı: ${params.sourceFileName}`
        : `İçe aktarıldı: ${params.sourceFileName}`
      : plan.bump
        ? `Imported over existing content: ${params.sourceFileName}`
        : `Imported: ${params.sourceFileName}`;

  let history = parseRevisionHistory(doc.revisionHistoryJson);
  const entry = {
    rev: plan.revisionNo,
    date: now.toISOString().slice(0, 10),
    by: params.importedBy,
    note,
  };
  if (plan.bump || history.length === 0) {
    history = appendRevisionHistory(history, entry);
  }

  if (doc.content?.trim() && plan.bump) {
    await snapshotQmsDocumentRevision({
      documentId: doc.id,
      revisionNo: doc.revisionNo ?? 0,
      content: doc.content,
      changeNote: params.locale === "tr" ? "Revizyon öncesi arşiv" : "Archived before revision",
      preparedBy: doc.preparedBy ?? params.importedBy,
      sourceFileId: doc.sourceFileId ?? undefined,
    });
  }

  const layer = inferQmsLayerFromCode(doc.code ?? "");
  const parent =
    doc.parentProcedureCode ??
    (layer !== "PROCEDURE" && layer !== "MANUAL" ? inferParentProcedureCode(doc.code ?? "") : null);

  await prisma.qMSDocument.update({
    where: { id: doc.id },
    data: {
      content: params.content,
      status: plan.status,
      revisionNo: plan.revisionNo,
      version: revisionNoToLabel(plan.revisionNo),
      revisionDate: plan.bump ? now : doc.revisionDate ?? now,
      revisionHistoryJson: history as unknown as object,
      layer,
      parentProcedureCode: parent ?? doc.parentProcedureCode,
      sourceFileId: params.sourceFileId ?? doc.sourceFileId,
    },
  });

  await snapshotQmsDocumentRevision({
    documentId: doc.id,
    revisionNo: plan.revisionNo,
    content: params.content,
    changeNote: note,
    preparedBy: params.importedBy,
    sourceFileId: params.sourceFileId,
  });

  return {
    revisionNo: plan.revisionNo,
    version: revisionNoToLabel(plan.revisionNo),
    status: plan.status,
    bumped: plan.bump,
  };
}

/** Map uploaded Word/PDF files to KYS codes and import extracted text. */
export async function importQmsFromUploadedFiles(params: {
  companyId: string;
  fileIds: string[];
  importedBy: string;
  locale: "tr" | "en";
  overwrite?: boolean;
}): Promise<QmsImportResult> {
  await scaffoldCompanyQms(params.companyId, ["ISO 13485", "ISO 9001"]);

  const register = await prisma.qMSDocument.findMany({
    where: { companyId: params.companyId, deletedAt: null },
    select: { id: true, code: true, title: true, content: true },
  });

  const excluded = new Set<string>(QMS_REGISTER_EXCLUDED_CODES);
  const knownCodes = new Set(
    register
      .map((d) => d.code?.trim())
      .filter((c): c is string => typeof c === "string" && c.length > 0 && !excluded.has(c)),
  );
  const idByCode = new Map(
    register.filter((d) => d.code && !excluded.has(d.code)).map((d) => [d.code!.trim(), d.id]),
  );
  const titleByCode = new Map(
    register.filter((d) => d.code).map((d) => [d.code!.trim(), d.title]),
  );

  const items: QmsImportItemResult[] = [];
  let imported = 0;
  let skipped = 0;
  let unmatched = 0;
  let failed = 0;

  for (const fileId of params.fileIds) {
    try {
      const { text, fileName } = await textFromUpload(params.companyId, fileId);
      const inferred = inferQmsCodeFromFile(fileName, text, knownCodes);

      if (!inferred || !idByCode.has(inferred)) {
        unmatched++;
        items.push({
          fileId,
          fileName,
          inferredCode: inferred,
          status: "unmatched",
        });
        continue;
      }

      const docId = idByCode.get(inferred)!;
      const regDoc = register.find((d) => d.id === docId);
      const hasContent = Boolean(regDoc?.content?.trim());

      if (hasContent && !params.overwrite) {
        skipped++;
        items.push({
          fileId,
          fileName,
          inferredCode: inferred,
          documentId: docId,
          status: "skipped",
        });
        continue;
      }

      const title = titleByCode.get(inferred) ?? inferred;
      const content = markdownFromPlain(text, title);
      const rev = await applyImportedQmsContent({
        companyId: params.companyId,
        documentId: docId,
        content,
        importedBy: params.importedBy,
        sourceFileName: fileName,
        locale: params.locale,
        overwrite: params.overwrite,
        sourceFileId: fileId,
      });

      imported++;
      items.push({
        fileId,
        fileName,
        inferredCode: inferred,
        documentId: docId,
        status: "imported",
        revisionNote: rev.bumped ? rev.version : undefined,
      });
    } catch (err) {
      failed++;
      items.push({
        fileId,
        fileName: fileId,
        inferredCode: null,
        status: "failed",
        error: err instanceof Error ? err.message : "import_failed",
      });
    }
  }

  return { imported, skipped, unmatched, failed, items };
}

function codesForProcedure(
  procedureCode: string,
  register: { id: string; code: string | null; title: string; content: string | null; parentProcedureCode: string | null }[],
): Set<string> {
  const proc = procedureCode.trim().toUpperCase();
  const allowed = new Set<string>();
  for (const d of register) {
    const code = d.code?.trim();
    if (!code) continue;
    if (code === proc || d.parentProcedureCode?.trim().toUpperCase() === proc) {
      allowed.add(code);
    }
  }
  allowed.add(proc);
  return allowed;
}

/**
 * Import uploads into documents scoped to one procedure folder (Sagip-style).
 * Matches codes only within the procedure + its child documents.
 */
export async function importQmsToProcedure(params: {
  companyId: string;
  procedureCode: string;
  fileIds: string[];
  importedBy: string;
  locale: "tr" | "en";
  overwrite?: boolean;
  targetCode?: string;
}): Promise<QmsImportResult> {
  await scaffoldCompanyQms(params.companyId, ["ISO 13485", "ISO 9001"]);
  const procedureCode = params.procedureCode.trim().toUpperCase();

  const register = await prisma.qMSDocument.findMany({
    where: { companyId: params.companyId, deletedAt: null },
    select: { id: true, code: true, title: true, content: true, parentProcedureCode: true },
  });

  const excluded = new Set<string>(QMS_REGISTER_EXCLUDED_CODES);
  const scopedCodes = codesForProcedure(procedureCode, register);
  const knownCodes = new Set(
    [...scopedCodes].filter((c) => !excluded.has(c)),
  );
  if (params.targetCode) {
    const t = params.targetCode.trim().toUpperCase();
    if (!knownCodes.has(t)) {
      throw new BadRequestError(`Document ${t} is not part of procedure ${procedureCode}`);
    }
    knownCodes.clear();
    knownCodes.add(t);
  }

  const idByCode = new Map(
    register
      .filter((d) => d.code && knownCodes.has(d.code.trim()))
      .map((d) => [d.code!.trim(), d.id]),
  );
  const titleByCode = new Map(
    register.filter((d) => d.code && knownCodes.has(d.code.trim())).map((d) => [d.code!.trim(), d.title]),
  );

  const items: QmsImportItemResult[] = [];
  let imported = 0;
  let skipped = 0;
  let unmatched = 0;
  let failed = 0;

  for (const fileId of params.fileIds) {
    try {
      const { text, fileName } = await textFromUpload(params.companyId, fileId);
      const inferred =
        params.targetCode?.trim().toUpperCase() ??
        inferQmsCodeFromFile(fileName, text, knownCodes);

      if (!inferred || !idByCode.has(inferred) || !knownCodes.has(inferred)) {
        unmatched++;
        items.push({ fileId, fileName, inferredCode: inferred, status: "unmatched" });
        continue;
      }

      const docId = idByCode.get(inferred)!;
      const regDoc = register.find((d) => d.id === docId);
      const hasContent = Boolean(regDoc?.content?.trim());

      if (hasContent && !params.overwrite) {
        skipped++;
        items.push({ fileId, fileName, inferredCode: inferred, documentId: docId, status: "skipped" });
        continue;
      }

      const title = titleByCode.get(inferred) ?? inferred;
      const content = markdownFromPlain(text, title);
      const rev = await applyImportedQmsContent({
        companyId: params.companyId,
        documentId: docId,
        content,
        importedBy: params.importedBy,
        sourceFileName: fileName,
        locale: params.locale,
        overwrite: params.overwrite,
        sourceFileId: fileId,
      });

      imported++;
      items.push({
        fileId,
        fileName,
        inferredCode: inferred,
        documentId: docId,
        status: "imported",
        revisionNote: rev.bumped ? rev.version : undefined,
      });
    } catch (err) {
      failed++;
      items.push({
        fileId,
        fileName: fileId,
        inferredCode: null,
        status: "failed",
        error: err instanceof Error ? err.message : "import_failed",
      });
    }
  }

  return { imported, skipped, unmatched, failed, items };
}
