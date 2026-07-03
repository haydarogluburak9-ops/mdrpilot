import "server-only";
import { prisma } from "@/lib/db";
import { ISO13485_DOCS, ISO9001_SECTIONS } from "@/lib/domain/constants";
import { DEFAULT_QMS_REVISION } from "@/lib/qms/revision";
import {
  KYS_STRUCTURE_TEMPLATES,
  inferQmsLayerFromCode,
  type QmsDocumentLayer,
} from "@/lib/qms/kys-structure";
import { inferParentProcedureCode } from "@/lib/qms/procedure-children";

/**
 * Create a company's initial QMS document register (procedure list) so a brand
 * new company immediately sees the full ISO 13485 (and optionally ISO 9001)
 * documented-procedure checklist with status MISSING. Idempotent: existing
 * codes are skipped, so it is safe to re-run as standards are added.
 */
export async function scaffoldCompanyQms(
  companyId: string,
  standards: string[] = ["ISO 13485"],
): Promise<number> {
  const normalized = standards.map((s) => s.toUpperCase());
  const wants13485 = normalized.some((s) => s.includes("13485")) || normalized.length === 0;
  const wants9001 = normalized.some((s) => s.includes("9001"));

  const existing = await prisma.qMSDocument.findMany({
    where: { companyId },
    select: { id: true, code: true, layer: true, parentProcedureCode: true },
  });
  const seen = new Set(existing.map((d) => d.code).filter(Boolean) as string[]);

  const rows: {
    companyId: string;
    code: string;
    title: string;
    standard: string;
    clauseRefs: string;
    status: "MISSING";
    version: string;
    revisionNo: number;
    layer: QmsDocumentLayer;
    parentProcedureCode: string | null;
  }[] = [];

  const push = (
    docs: {
      code: string;
      title: string;
      clauseRefs: string;
      layer?: QmsDocumentLayer;
      parentProcedureCode?: string | null;
    }[],
    standard: string,
  ) => {
    for (const d of docs) {
      if (seen.has(d.code)) continue;
      seen.add(d.code);
      const layer = d.layer ?? inferQmsLayerFromCode(d.code);
      const parent =
        d.parentProcedureCode ??
        (layer !== "PROCEDURE" && layer !== "MANUAL" ? inferParentProcedureCode(d.code) : null);
      rows.push({
        companyId,
        code: d.code,
        title: d.title,
        standard,
        clauseRefs: d.clauseRefs,
        status: "MISSING",
        version: DEFAULT_QMS_REVISION,
        revisionNo: 0,
        layer,
        parentProcedureCode: parent ?? null,
      });
    }
  };

  if (wants13485) {
    push(
      ISO13485_DOCS.map((d) => ({ ...d, layer: "PROCEDURE" as QmsDocumentLayer })),
      "ISO 13485",
    );
    push(
      KYS_STRUCTURE_TEMPLATES.map((t) => ({
        code: t.code,
        title: t.title,
        clauseRefs: t.clauseRefs ?? "",
        layer: t.layer,
        parentProcedureCode: t.parentProcedureCode ?? inferParentProcedureCode(t.code),
      })),
      "ISO 13485",
    );
  }
  if (wants9001) {
    push(
      ISO9001_SECTIONS.map((d) => ({ ...d, layer: "OTHER" as QmsDocumentLayer })),
      "ISO 9001",
    );
  }

  if (rows.length > 0) {
    await prisma.qMSDocument.createMany({ data: rows });
  }

  await dedupeCompanyQmsByCode(companyId);

  // Backfill layer + parent on legacy rows (idempotent).
  const allDocs = await prisma.qMSDocument.findMany({
    where: { companyId },
    select: { id: true, code: true, layer: true, parentProcedureCode: true },
  });
  for (const doc of allDocs) {
    const inferredLayer = inferQmsLayerFromCode(doc.code);
    const inferredParent =
      inferredLayer !== "PROCEDURE" && inferredLayer !== "MANUAL"
        ? inferParentProcedureCode(doc.code)
        : null;
    const patch: { layer?: QmsDocumentLayer; parentProcedureCode?: string | null } = {};
    if (doc.layer !== inferredLayer) patch.layer = inferredLayer;
    if (!doc.parentProcedureCode && inferredParent) patch.parentProcedureCode = inferredParent;
    if (Object.keys(patch).length > 0) {
      await prisma.qMSDocument.update({ where: { id: doc.id }, data: patch });
    }
  }

  return rows.length;
}

/** Soft-delete duplicate codes (keeps row with content, else most recently updated). */
export async function dedupeCompanyQmsByCode(companyId: string): Promise<number> {
  const docs = await prisma.qMSDocument.findMany({
    where: { companyId, deletedAt: null, code: { not: null } },
    select: { id: true, code: true, content: true, updatedAt: true },
  });

  const groups = new Map<string, typeof docs>();
  for (const doc of docs) {
    const code = doc.code!.trim().toUpperCase();
    const bucket = groups.get(code) ?? [];
    bucket.push(doc);
    groups.set(code, bucket);
  }

  const toDelete: string[] = [];
  for (const list of groups.values()) {
    if (list.length <= 1) continue;
    const winner = list.reduce((best, cur) => {
      const bHas = Boolean(best.content?.trim());
      const cHas = Boolean(cur.content?.trim());
      if (cHas && !bHas) return cur;
      if (bHas && !cHas) return best;
      return cur.updatedAt > best.updatedAt ? cur : best;
    });
    for (const d of list) {
      if (d.id !== winner.id) toDelete.push(d.id);
    }
  }

  if (toDelete.length === 0) return 0;

  await prisma.qMSDocument.updateMany({
    where: { id: { in: toDelete } },
    data: { deletedAt: new Date() },
  });
  return toDelete.length;
}
