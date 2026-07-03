import "server-only";
import type { OperationalModuleKind, OperationalRecordStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { genericFieldsFromFormContent } from "@/lib/operational/generic-fields";
import { initGenericFormContent } from "@/lib/operational/generic-form-model";
import type { OperationalModuleDef } from "@/lib/operational/modules";
import {
  computeVigilanceDueDate,
  inferVigilanceSeverity,
} from "@/lib/operational/vigilance-deadlines";

export type OperationalRecordDto = {
  id: string;
  module: OperationalModuleKind;
  formCode: string;
  referenceNo: string | null;
  title: string;
  description: string | null;
  status: OperationalRecordStatus;
  ownerName: string | null;
  dueDate: string | null;
  capaRef: string | null;
  eventAt: string | null;
  productId: string | null;
  productName: string | null;
  qmsDocumentId: string | null;
  formContent: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapRecord(
  row: {
    id: string;
    module: OperationalModuleKind;
    formCode: string;
    referenceNo: string | null;
    title: string;
    description: string | null;
    status: OperationalRecordStatus;
    ownerName: string | null;
    dueDate: Date | null;
    capaRef: string | null;
    eventAt: Date | null;
    productId: string | null;
    qmsDocumentId: string | null;
    formContent: string | null;
    createdAt: Date;
    updatedAt: Date;
    product?: { name: string } | null;
  },
): OperationalRecordDto {
  return {
    id: row.id,
    module: row.module,
    formCode: row.formCode,
    referenceNo: row.referenceNo,
    title: row.title,
    description: row.description,
    status: row.status,
    ownerName: row.ownerName,
    dueDate: row.dueDate ? row.dueDate.toISOString() : null,
    capaRef: row.capaRef,
    eventAt: row.eventAt ? row.eventAt.toISOString() : null,
    productId: row.productId,
    productName: row.product?.name ?? null,
    qmsDocumentId: row.qmsDocumentId,
    formContent: row.formContent,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listOperationalRecords(
  companyId: string,
  moduleKind: OperationalModuleKind,
  productId?: string,
) {
  const rows = await prisma.qmsOperationalRecord.findMany({
    where: { companyId, module: moduleKind, ...(productId ? { productId } : {}) },
    include: { product: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(mapRecord);
}

export async function getOperationalRecord(companyId: string, id: string) {
  const row = await prisma.qmsOperationalRecord.findFirst({
    where: { id, companyId },
    include: { product: { select: { id: true, name: true } } },
  });
  if (!row) return null;

  let formContent = row.formContent;
  if (!formContent?.trim() && row.qmsDocumentId) {
    const doc = await prisma.qMSDocument.findFirst({
      where: { id: row.qmsDocumentId, companyId, deletedAt: null },
      select: { content: true },
    });
    formContent = doc?.content ?? null;
  }

  return mapRecord({ ...row, formContent });
}

export async function createOperationalRecord(
  companyId: string,
  def: OperationalModuleDef,
  data: { title: string; productId?: string | null },
) {
  const created = await prisma.qmsOperationalRecord.create({
    data: {
      companyId,
      module: def.kind,
      formCode: def.formCode,
      title: data.title,
      productId: data.productId ?? null,
      status: "OPEN",
    },
    include: { product: { select: { name: true } } },
  });
  return mapRecord(created);
}

export async function updateOperationalRecord(
  companyId: string,
  id: string,
  def: OperationalModuleDef,
  patch: {
    title?: string;
    productId?: string | null;
    status?: OperationalRecordStatus;
    formContent?: string;
    locale?: "tr" | "en";
  },
) {
  const existing = await prisma.qmsOperationalRecord.findFirst({
    where: { id, companyId },
  });
  if (!existing) return null;

  const updateData: Record<string, unknown> = {};

  if (patch.title !== undefined) updateData.title = patch.title;
  if (patch.productId !== undefined) updateData.productId = patch.productId;
  if (patch.status !== undefined) updateData.status = patch.status;

  if (patch.formContent !== undefined) {
    const parsed = genericFieldsFromFormContent(def, patch.formContent, existing.title);
    updateData.formContent = patch.formContent;
    if (parsed.title) updateData.title = parsed.title;
    if (parsed.referenceNo != null) updateData.referenceNo = parsed.referenceNo;
    if (parsed.description != null) updateData.description = parsed.description;
    if (parsed.ownerName != null) updateData.ownerName = parsed.ownerName;
    if (parsed.dueDate != null) updateData.dueDate = parsed.dueDate;
    if (parsed.capaRef != null) updateData.capaRef = parsed.capaRef;
    if (parsed.eventAt != null) updateData.eventAt = parsed.eventAt;
    if (parsed.status && !patch.status) updateData.status = parsed.status;

    if (def.kind === "VIGILANCE" && patch.formContent) {
      const title = (parsed.title ?? existing.title) as string;
      const desc = parsed.description ?? existing.description;
      const severity = inferVigilanceSeverity(title, desc);
      updateData.vigilanceSeverity = severity;
      const eventDate = parsed.eventAt ?? existing.eventAt;
      if (eventDate) {
        updateData.dueDate = computeVigilanceDueDate(eventDate, severity);
      }
    }

    if (def.kind === "CALIBRATION" && parsed.dueDate != null) {
      const due = parsed.dueDate;
      const now = new Date();
      if (due < now && !patch.status) updateData.status = "OVERDUE";
    }

    if (existing.qmsDocumentId) {
      const { saveQmsDocumentContent } = await import("@/lib/qms/save-document-content");
      await saveQmsDocumentContent({
        companyId,
        documentId: existing.qmsDocumentId,
        content: patch.formContent,
        savedBy: "system",
        locale: patch.locale ?? "tr",
        skipOperationalSync: true,
      });
    }
  }

  const updated = await prisma.qmsOperationalRecord.update({
    where: { id },
    data: updateData,
    include: { product: { select: { name: true } } },
  });
  return mapRecord(updated);
}

export async function deleteOperationalRecord(companyId: string, id: string) {
  const existing = await prisma.qmsOperationalRecord.findFirst({
    where: { id, companyId },
  });
  if (!existing) return false;
  await prisma.qmsOperationalRecord.delete({ where: { id } });
  return true;
}

export async function syncOperationalRecordFromForm(params: {
  companyId: string;
  documentId: string;
  def: OperationalModuleDef;
  formContent: string;
  hint?: string;
  linkedId?: string;
}) {
  const parsed = genericFieldsFromFormContent(params.def, params.formContent, params.hint);

  const existing = params.linkedId
    ? await prisma.qmsOperationalRecord.findFirst({
        where: { id: params.linkedId, companyId: params.companyId },
      })
    : await prisma.qmsOperationalRecord.findFirst({
        where: {
          companyId: params.companyId,
          module: params.def.kind,
          OR: [
            { qmsDocumentId: params.documentId },
            ...(parsed.referenceNo ? [{ referenceNo: parsed.referenceNo }] : []),
            ...(params.hint
              ? [{ title: { contains: params.hint.slice(0, 80), mode: "insensitive" as const } }]
              : []),
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

  const data = {
    title: parsed.title ?? params.hint?.slice(0, 500) ?? `${params.def.formCode}`,
    referenceNo: parsed.referenceNo ?? existing?.referenceNo ?? null,
    description: parsed.description ?? null,
    ownerName: parsed.ownerName ?? null,
    dueDate: parsed.dueDate,
    capaRef: parsed.capaRef ?? null,
    eventAt: parsed.eventAt,
    status: parsed.status as OperationalRecordStatus,
    formCode: params.def.formCode,
    qmsDocumentId: params.documentId,
    formContent: params.formContent,
  };

  if (existing) {
    await prisma.qmsOperationalRecord.update({ where: { id: existing.id }, data });
    return { id: existing.id, created: false };
  }

  const created = await prisma.qmsOperationalRecord.create({
    data: {
      companyId: params.companyId,
      module: params.def.kind,
      ...data,
    },
  });
  return { id: created.id, created: true };
}

export function ensureFormContentForRecord(
  def: OperationalModuleDef,
  locale: "tr" | "en",
  referenceNo?: string | null,
) {
  return initGenericFormContent(def.formCode, locale, referenceNo ?? undefined);
}
