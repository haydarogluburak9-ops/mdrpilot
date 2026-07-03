import "server-only";
import { prisma } from "@/lib/db";
import { buildFormCapa01 } from "@/lib/qms/form-templates";
import { parseCapaFormMarkdown, serializeCapaFormMarkdown } from "@/lib/operational/capa-form-model";
import { initGenericFormContent } from "@/lib/operational/generic-form-model";
import { OPERATIONAL_MODULES } from "@/lib/operational/modules";
import {
  computeVigilanceDueDate,
  inferVigilanceSeverity,
} from "@/lib/operational/vigilance-deadlines";

type Locale = "tr" | "en";

export async function createCapaFromInternalAudit(input: {
  companyId: string;
  auditCycleId: string;
  findingTitle: string;
  findingDescription?: string;
  locale?: Locale;
}) {
  const locale = input.locale ?? "tr";
  const cycle = await prisma.internalAuditCycle.findFirst({
    where: { id: input.auditCycleId, companyId: input.companyId },
  });
  if (!cycle) throw new Error("Not found");

  const capa = await prisma.cAPA.create({
    data: {
      companyId: input.companyId,
      title: `IA ${cycle.year}: ${input.findingTitle.slice(0, 180)}`,
      rootCause: input.findingDescription?.trim() || null,
      status: "OPEN",
    },
  });

  const capaNo = `CAPA-${capa.id.slice(-6).toUpperCase()}`;
  const capaForm = parseCapaFormMarkdown(buildFormCapa01(locale), locale);
  capaForm.capaNo = capaNo;
  capaForm.sourceInternalAudit = true;
  capaForm.sourceRef = `IA-${cycle.year}`;
  capaForm.description = input.findingDescription ?? input.findingTitle;
  const formContent = serializeCapaFormMarkdown(capaForm, locale);

  await prisma.cAPA.update({
    where: { id: capa.id },
    data: { referenceNo: capaNo, formContent },
  });

  return { capaId: capa.id, capaRef: capaNo };
}

export async function createCapaFromComplaint(input: {
  companyId: string;
  complaintId: string;
  locale?: Locale;
}) {
  const locale = input.locale ?? "tr";
  const complaint = await prisma.complaint.findFirst({
    where: { id: input.complaintId, companyId: input.companyId },
  });
  if (!complaint) throw new Error("Not found");

  const capa = await prisma.cAPA.create({
    data: {
      companyId: input.companyId,
      productId: complaint.productId,
      title: `CH: ${complaint.title.slice(0, 180)}`,
      rootCause: complaint.description,
      status: complaint.capaRequired ? "OPEN" : "IN_PROGRESS",
    },
  });

  const capaNo = `CAPA-${capa.id.slice(-6).toUpperCase()}`;
  const capaForm = parseCapaFormMarkdown(buildFormCapa01(locale), locale);
  capaForm.capaNo = capaNo;
  capaForm.sourceComplaint = true;
  capaForm.sourceRef = complaint.complaintNo ?? complaint.id.slice(0, 8);
  capaForm.description = complaint.description ?? complaint.title;
  const formContent = serializeCapaFormMarkdown(capaForm, locale);

  await prisma.cAPA.update({
    where: { id: capa.id },
    data: { referenceNo: capaNo, formContent },
  });

  await prisma.complaint.update({
    where: { id: complaint.id },
    data: { capaRef: capaNo, status: "MONITORING" },
  });

  return { capaId: capa.id, capaRef: capaNo };
}

export async function createVigilanceFromComplaint(input: {
  companyId: string;
  complaintId: string;
  locale?: Locale;
}) {
  const locale = input.locale ?? "tr";
  const def = OPERATIONAL_MODULES.vigilance;
  const complaint = await prisma.complaint.findFirst({
    where: { id: input.complaintId, companyId: input.companyId },
  });
  if (!complaint) throw new Error("Not found");

  const severity = inferVigilanceSeverity(complaint.title, complaint.description);
  const eventAt = complaint.receivedAt ?? new Date();
  const dueDate = computeVigilanceDueDate(eventAt, severity);
  const ref = `VG-${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const formContent = initGenericFormContent(def.formCode, locale, ref);

  const record = await prisma.qmsOperationalRecord.create({
    data: {
      companyId: input.companyId,
      module: def.kind,
      formCode: def.formCode,
      referenceNo: ref,
      title: `Vigilans: ${complaint.title.slice(0, 160)}`,
      description: complaint.description,
      productId: complaint.productId,
      status: "OPEN",
      eventAt,
      dueDate,
      capaRef: complaint.complaintNo ?? complaint.id.slice(0, 8),
      vigilanceSeverity: severity,
      relatedRecordId: complaint.id,
      relatedRecordType: "complaint",
      formContent,
    },
  });

  return { vigilanceId: record.id, referenceNo: ref, severity, dueDate: dueDate.toISOString() };
}
