import "server-only";
import type { OperationalRecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { parseMarkdownFormFields, pickField } from "@/lib/qms/form-content-parser";
import {
  INTERNAL_AUDIT_FORM_CODES,
  internalAuditDocKindFromCode,
  type InternalAuditDocKind,
  type InternalAuditCycleDto,
} from "@/lib/operational/internal-audit-codes";

export { INTERNAL_AUDIT_FORM_CODES, internalAuditDocKindFromCode };
export type { InternalAuditDocKind, InternalAuditCycleDto };

export function isInternalAuditQmsCode(code: string | null | undefined): boolean {
  return internalAuditDocKindFromCode(code) !== null;
}

export function parseAuditYear(hint?: string, content?: string): number {
  const current = new Date().getFullYear();
  const sources = [hint ?? "", content ?? ""];
  for (const src of sources) {
    const m = src.match(/\b(20\d{2})\b/);
    if (m) return Number.parseInt(m[1], 10);
  }
  if (content?.trim()) {
    const fields = parseMarkdownFormFields(content);
    const y = pickField(fields, "yıl", "year", "tetkik yılı", "audit year", "plan yılı", "plan year");
    if (y?.match(/\b(20\d{2})\b/)) {
      return Number.parseInt(y.match(/\b(20\d{2})\b/)![1], 10);
    }
  }
  return current;
}

function mapCycle(row: {
  id: string;
  year: number;
  title: string;
  status: OperationalRecordStatus;
  ownerName: string | null;
  planQmsDocumentId: string | null;
  checklistQmsDocumentId: string | null;
  reportQmsDocumentId: string | null;
  planContent: string | null;
  checklistContent: string | null;
  reportContent: string | null;
  createdAt: Date;
  updatedAt: Date;
}): InternalAuditCycleDto {
  return {
    id: row.id,
    year: row.year,
    title: row.title,
    status: row.status,
    ownerName: row.ownerName,
    planQmsDocumentId: row.planQmsDocumentId,
    checklistQmsDocumentId: row.checklistQmsDocumentId,
    reportQmsDocumentId: row.reportQmsDocumentId,
    planContent: row.planContent,
    checklistContent: row.checklistContent,
    reportContent: row.reportContent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listInternalAuditCycles(companyId: string): Promise<InternalAuditCycleDto[]> {
  const rows = await prisma.internalAuditCycle.findMany({
    where: { companyId },
    orderBy: { year: "desc" },
  });
  return rows.map(mapCycle);
}

export async function getInternalAuditCycle(companyId: string, id: string) {
  const row = await prisma.internalAuditCycle.findFirst({ where: { id, companyId } });
  return row ? mapCycle(row) : null;
}

export async function createInternalAuditCycle(companyId: string, year: number) {
  const existing = await prisma.internalAuditCycle.findUnique({
    where: { companyId_year: { companyId, year } },
  });
  if (existing) return mapCycle(existing);

  const title = `${year} İç Tetkik`;
  const created = await prisma.internalAuditCycle.create({
    data: { companyId, year, title, status: "OPEN" },
  });
  return mapCycle(created);
}

export async function updateInternalAuditCycle(
  companyId: string,
  id: string,
  patch: {
    status?: OperationalRecordStatus;
    ownerName?: string | null;
    planContent?: string;
    checklistContent?: string;
    reportContent?: string;
    locale?: "tr" | "en";
  },
) {
  const existing = await prisma.internalAuditCycle.findFirst({ where: { id, companyId } });
  if (!existing) return null;

  const data: Record<string, unknown> = {};
  if (patch.status !== undefined) data.status = patch.status;
  if (patch.ownerName !== undefined) data.ownerName = patch.ownerName;

  if (patch.planContent !== undefined) {
    data.planContent = patch.planContent;
    if (existing.planQmsDocumentId) {
      await saveLinkedQmsContent(companyId, existing.planQmsDocumentId, patch.planContent, patch.locale);
    }
  }
  if (patch.checklistContent !== undefined) {
    data.checklistContent = patch.checklistContent;
    if (existing.checklistQmsDocumentId) {
      await saveLinkedQmsContent(companyId, existing.checklistQmsDocumentId, patch.checklistContent, patch.locale);
    }
  }
  if (patch.reportContent !== undefined) {
    data.reportContent = patch.reportContent;
    if (existing.reportQmsDocumentId) {
      await saveLinkedQmsContent(companyId, existing.reportQmsDocumentId, patch.reportContent, patch.locale);
    }
  }

  const updated = await prisma.internalAuditCycle.update({ where: { id }, data });
  return mapCycle(updated);
}

async function saveLinkedQmsContent(
  companyId: string,
  documentId: string,
  content: string,
  locale?: "tr" | "en",
) {
  const { saveQmsDocumentContent } = await import("@/lib/qms/save-document-content");
  await saveQmsDocumentContent({
    companyId,
    documentId,
    content,
    savedBy: "system",
    locale: locale ?? "tr",
    skipOperationalSync: true,
  });
}

export async function deleteInternalAuditCycle(companyId: string, id: string) {
  const existing = await prisma.internalAuditCycle.findFirst({ where: { id, companyId } });
  if (!existing) return false;
  await prisma.internalAuditCycle.delete({ where: { id } });
  return true;
}

function inferCycleStatus(
  planContent: string | null,
  checklistContent: string | null,
  reportContent: string | null,
  current: OperationalRecordStatus,
): OperationalRecordStatus {
  if (reportContent?.trim()) return "CLOSED";
  if (checklistContent?.trim() || planContent?.trim()) {
    return current === "CLOSED" ? "IN_PROGRESS" : current === "OPEN" ? "IN_PROGRESS" : current;
  }
  return current;
}

export async function syncInternalAuditCycleFromQmsDoc(params: {
  companyId: string;
  documentId: string;
  code: string;
  content: string;
  hint?: string;
  linkedCycleId?: string;
}): Promise<{ id: string; created: boolean }> {
  const kind = internalAuditDocKindFromCode(params.code);
  if (!kind) throw new Error("not_internal_audit_form");

  const year = parseAuditYear(params.hint, params.content);
  const fields = parseMarkdownFormFields(params.content);
  const ownerName = pickField(fields, "denetçi", "lead auditor", "sorumlu", "owner");

  let cycle = params.linkedCycleId
    ? await prisma.internalAuditCycle.findFirst({
        where: { id: params.linkedCycleId, companyId: params.companyId },
      })
    : await prisma.internalAuditCycle.findFirst({
        where: { companyId: params.companyId, year },
      });

  let created = false;
  if (!cycle) {
    const newCycle = await prisma.internalAuditCycle.create({
      data: {
        companyId: params.companyId,
        year,
        title: `${year} İç Tetkik`,
        status: "OPEN",
        ownerName: ownerName ?? null,
      },
    });
    cycle = newCycle;
    created = true;
  }

  const planContent = kind === "plan" ? params.content : cycle.planContent;
  const checklistContent = kind === "checklist" ? params.content : cycle.checklistContent;
  const reportContent = kind === "report" ? params.content : cycle.reportContent;

  const docField =
    kind === "plan"
      ? "planQmsDocumentId"
      : kind === "checklist"
        ? "checklistQmsDocumentId"
        : "reportQmsDocumentId";

  const updated = await prisma.internalAuditCycle.update({
    where: { id: cycle.id },
    data: {
      ownerName: ownerName ?? cycle.ownerName,
      planContent,
      checklistContent,
      reportContent,
      [docField]: params.documentId,
      status: inferCycleStatus(planContent, checklistContent, reportContent, cycle.status),
    },
  });

  return { id: updated.id, created };
}
