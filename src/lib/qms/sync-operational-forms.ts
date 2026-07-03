import "server-only";
import { prisma } from "@/lib/db";
import {
  inferCapaRequired,
  inferCapaStatus,
  inferComplaintStatus,
  parseFormDate,
  parseMarkdownFormFields,
  pickField,
} from "@/lib/qms/form-content-parser";
import { FORM_CODE_TO_MODULE, OPERATIONAL_MODULES } from "@/lib/operational/modules";
import { syncOperationalRecordFromForm } from "@/lib/operational/record-service";
import {
  isInternalAuditQmsCode,
  syncInternalAuditCycleFromQmsDoc,
} from "@/lib/operational/internal-audit-service";
import type { OperationalLinkModule } from "@/lib/operational/modules";

export type OperationalFormSyncResult =
  | { synced: false; reason: "not_operational_form" }
  | { synced: true; module: "capa"; id: string; created: boolean }
  | { synced: true; module: "complaint"; id: string; created: boolean }
  | { synced: true; module: OperationalLinkModule; id: string; created: boolean };

const LEGACY_FORM_CODES = ["FORM-CAPA-01", "FORM-CH-01", "FORM-CH-02"];

export async function syncOperationalFormFromQmsDoc(params: {
  companyId: string;
  documentId: string;
  code: string | null;
  content: string;
  userContext?: string;
  operationalLink?: { module: OperationalLinkModule; id: string };
}): Promise<OperationalFormSyncResult> {
  const formCode = (params.code ?? "").trim().toUpperCase();

  if (isInternalAuditQmsCode(formCode)) {
    const linkedCycleId =
      params.operationalLink?.module === "internal-audit" ? params.operationalLink.id : undefined;
    const result = await syncInternalAuditCycleFromQmsDoc({
      companyId: params.companyId,
      documentId: params.documentId,
      code: formCode,
      content: params.content,
      hint: params.userContext,
      linkedCycleId,
    });
    return {
      synced: true,
      module: "internal-audit",
      id: result.id,
      created: result.created,
    };
  }

  if (!formCode.startsWith("FORM-")) {
    return { synced: false, reason: "not_operational_form" };
  }

  const genericSlug = FORM_CODE_TO_MODULE[formCode];
  if (genericSlug && !LEGACY_FORM_CODES.includes(formCode)) {
    const def = OPERATIONAL_MODULES[genericSlug];
    const linkedId =
      params.operationalLink?.module === genericSlug ? params.operationalLink.id : undefined;
    const result = await syncOperationalRecordFromForm({
      companyId: params.companyId,
      documentId: params.documentId,
      def,
      formContent: params.content,
      hint: params.userContext,
      linkedId,
    });
    return {
      synced: true,
      module: genericSlug,
      id: result.id,
      created: result.created,
    };
  }

  if (!LEGACY_FORM_CODES.includes(formCode)) {
    return { synced: false, reason: "not_operational_form" };
  }

  const fields = parseMarkdownFormFields(params.content);
  const hint = params.userContext?.trim();

  switch (formCode) {
    case "FORM-CAPA-01":
      return syncCapaForm(
        params.companyId,
        params.documentId,
        params.content,
        fields,
        hint,
        params.operationalLink?.module === "capa" ? params.operationalLink.id : undefined,
      );
    case "FORM-CH-01":
      return syncComplaintForm(
        params.companyId,
        params.documentId,
        params.content,
        fields,
        hint,
        params.operationalLink?.module === "complaint" ? params.operationalLink.id : undefined,
      );
    case "FORM-CH-02":
      return syncComplaintCapaLink(params.companyId, fields, hint);
    default:
      return { synced: false, reason: "not_operational_form" };
  }
}

async function syncCapaForm(
  companyId: string,
  documentId: string,
  formContent: string,
  fields: Record<string, string>,
  hint?: string,
  linkedCapaId?: string,
): Promise<OperationalFormSyncResult> {
  const referenceNo = pickField(fields, "capa no", "capa no.");
  const description = pickField(fields, "açıklama", "description");
  const rootCause = pickField(fields, "kök neden analizi", "root cause analysis");
  const correction = pickField(fields, "düzeltme", "correction");
  const correctiveAction = pickField(
    fields,
    "düzeltici faaliyet",
    "corrective action",
    "düzeltici / önleyici aksiyon özeti",
    "corrective / preventive action summary",
  );
  const ownerName = pickField(fields, "sorumlu", "owner", "capa sorumlusu", "capa owner");
  const dueDate = parseFormDate(pickField(fields, "hedef tarih", "target date", "capa hedef tarih", "capa target date"));
  const source = pickField(fields, "kaynak", "source");

  const title =
    description?.slice(0, 500) ||
    hint?.slice(0, 500) ||
    (source ? `${source}${referenceNo ? ` (${referenceNo})` : ""}` : undefined) ||
    referenceNo ||
    "CAPA — FORM-CAPA-01";

  const status = inferCapaStatus(fields, dueDate);

  const existing = linkedCapaId
    ? await prisma.cAPA.findFirst({ where: { id: linkedCapaId, companyId } })
    : await prisma.cAPA.findFirst({
        where: {
          companyId,
          OR: [
            { qmsDocumentId: documentId },
            ...(referenceNo ? [{ referenceNo }] : []),
          ],
        },
      });

  const data = {
    title,
    referenceNo: referenceNo ?? existing?.referenceNo ?? null,
    rootCause: rootCause ?? null,
    correction: correction ?? null,
    correctiveAction: correctiveAction ?? null,
    ownerName: ownerName ?? null,
    dueDate,
    status,
    qmsDocumentId: documentId,
    formContent,
  };

  if (existing) {
    await prisma.cAPA.update({ where: { id: existing.id }, data });
    return { synced: true, module: "capa", id: existing.id, created: false };
  }

  const created = await prisma.cAPA.create({
    data: { companyId, ...data },
  });
  return { synced: true, module: "capa", id: created.id, created: true };
}

async function syncComplaintForm(
  companyId: string,
  documentId: string,
  formContent: string,
  fields: Record<string, string>,
  hint?: string,
  linkedComplaintId?: string,
): Promise<OperationalFormSyncResult> {
  const complaintNo = pickField(fields, "şikâyet no", "complaint no");
  const description = pickField(fields, "şikâyet açıklaması", "description");
  const lotNumber = pickField(fields, "lot / seri no", "lot / serial no", "ürün / lot", "product / lot");
  const source = pickField(fields, "kaynak", "source");
  const ownerName = pickField(fields, "değerlendiren", "assessed by");
  const receivedAt = parseFormDate(pickField(fields, "alım tarihi", "received date"));
  const capaRequired = inferCapaRequired(fields);
  const status = inferComplaintStatus(fields);

  const title =
    description?.slice(0, 500) ||
    hint?.slice(0, 500) ||
    complaintNo ||
    "Şikâyet — FORM-CH-01";

  const hintComplaintNo = hint?.match(/CH-\d{4}-\d{3}/i)?.[0]?.toUpperCase();

  const existing = linkedComplaintId
    ? await prisma.complaint.findFirst({ where: { id: linkedComplaintId, companyId } })
    : await prisma.complaint.findFirst({
        where: {
          companyId,
          OR: [
            { qmsDocumentId: documentId },
            ...(complaintNo ? [{ complaintNo }] : []),
            ...(hintComplaintNo ? [{ complaintNo: hintComplaintNo }] : []),
            ...(hint
              ? [{ title: { contains: hint.slice(0, 80), mode: "insensitive" as const } }]
              : []),
          ],
        },
        orderBy: { updatedAt: "desc" },
      });

  const data = {
    title,
    complaintNo: complaintNo ?? existing?.complaintNo ?? null,
    description: description ?? null,
    lotNumber: lotNumber ?? null,
    source: source ?? null,
    ownerName: ownerName ?? null,
    capaRequired,
    status,
    qmsDocumentId: documentId,
    formContent,
    ...(receivedAt ? { receivedAt } : {}),
  };

  if (existing) {
    await prisma.complaint.update({ where: { id: existing.id }, data });
    return { synced: true, module: "complaint", id: existing.id, created: false };
  }

  const created = await prisma.complaint.create({
    data: { companyId, ...data },
  });
  return { synced: true, module: "complaint", id: created.id, created: true };
}

async function syncComplaintCapaLink(
  companyId: string,
  fields: Record<string, string>,
  hint?: string,
): Promise<OperationalFormSyncResult> {
  const complaintNo = pickField(
    fields,
    "şikâyet no",
    "complaint no",
    "şikâyet no form-ch-01",
    "complaint no form-ch-01",
  );
  const capaRef = pickField(fields, "capa no", "capa no.");
  const status = inferComplaintStatus(fields);

  if (!complaintNo && !hint) {
    return { synced: false, reason: "not_operational_form" };
  }

  const complaint = await prisma.complaint.findFirst({
    where: {
      companyId,
      OR: [
        ...(complaintNo ? [{ complaintNo }] : []),
        ...(hint ? [{ title: { contains: hint.slice(0, 80), mode: "insensitive" as const } }] : []),
      ],
    },
    orderBy: { updatedAt: "desc" },
  });

  if (!complaint) {
    const created = await prisma.complaint.create({
      data: {
        companyId,
        title: hint?.slice(0, 500) || complaintNo || "Şikâyet — FORM-CH-02",
        complaintNo: complaintNo ?? null,
        capaRequired: true,
        capaRef: capaRef ?? null,
        status: status === "OPEN" ? "MONITORING" : status,
      },
    });
    return { synced: true, module: "complaint", id: created.id, created: true };
  }

  await prisma.complaint.update({
    where: { id: complaint.id },
    data: {
      capaRequired: true,
      capaRef: capaRef ?? complaint.capaRef,
      status: status === "OPEN" ? "MONITORING" : status,
    },
  });

  if (capaRef) {
    const capa = await prisma.cAPA.findFirst({
      where: { companyId, OR: [{ referenceNo: capaRef }, { title: { contains: capaRef, mode: "insensitive" } }] },
    });
    if (capa && !capa.referenceNo) {
      await prisma.cAPA.update({ where: { id: capa.id }, data: { referenceNo: capaRef } });
    }
  }

  return { synced: true, module: "complaint", id: complaint.id, created: false };
}
