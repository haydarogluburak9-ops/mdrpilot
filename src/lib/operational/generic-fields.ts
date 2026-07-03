import {
  inferCapaStatus,
  parseFormDate,
  parseMarkdownFormFields,
  pickField,
} from "@/lib/qms/form-content-parser";
import type { OperationalModuleDef } from "./modules";

export function genericFieldsFromFormContent(
  def: OperationalModuleDef,
  content: string,
  fallbackTitle?: string,
) {
  const fields = parseMarkdownFormFields(content);
  const referenceNo = pickField(fields, ...def.referenceAliases);
  const description = pickField(fields, ...def.descriptionAliases);
  const titleField = pickField(fields, ...def.titleAliases);
  const ownerName = pickField(fields, ...def.ownerAliases);
  const dueDate = parseFormDate(pickField(fields, ...def.dueDateAliases));
  const capaRef = pickField(fields, ...def.capaRefAliases);
  const eventAt = parseFormDate(pickField(fields, ...def.eventDateAliases));

  const title =
    description?.slice(0, 500) ||
    titleField?.slice(0, 500) ||
    fallbackTitle?.slice(0, 500) ||
    referenceNo ||
    undefined;

  const status = inferGenericOperationalStatus(fields, dueDate, def.statusOrder);

  return {
    referenceNo: referenceNo ?? null,
    title,
    description: description ?? null,
    ownerName: ownerName ?? null,
    dueDate,
    capaRef: capaRef ?? null,
    eventAt,
    status,
  };
}

export function inferGenericOperationalStatus(
  fields: Record<string, string>,
  dueDate: Date | null,
  statusOrder: readonly string[],
): string {
  const statusRow =
    pickField(fields, "durum", "status") ??
    Object.entries(fields).find(([k]) => k.includes("durum") || k.includes("status"))?.[1];

  if (statusRow) {
    if (/izlemede|monitoring/i.test(statusRow)) return "MONITORING";
    if (/kapalı|closed|kapat/i.test(statusRow)) return "CLOSED";
    if (/devam|progress|in progress/i.test(statusRow)) return "IN_PROGRESS";
    if (/gecik|overdue/i.test(statusRow)) return "OVERDUE";
  }

  const closure = pickField(fields, "kapanış onayı", "closure approval", "onay", "approval");
  if (closure && closure.length > 2) return "CLOSED";

  const capaStatus = inferCapaStatus(fields, dueDate);
  if (statusOrder.includes(capaStatus)) return capaStatus;

  if (dueDate && dueDate.getTime() < Date.now() && statusOrder.includes("OVERDUE")) {
    return "OVERDUE";
  }

  return statusOrder[0] ?? "OPEN";
}
