/** Client-safe internal audit document codes (no server-only). */
export const INTERNAL_AUDIT_FORM_CODES = {
  plan: "PLAN-IA-01",
  checklist: "FORM-IA-01",
  report: "REC-IA-01",
} as const;

export type InternalAuditDocKind = "plan" | "checklist" | "report";

export function internalAuditDocKindFromCode(code: string | null | undefined): InternalAuditDocKind | null {
  const c = (code ?? "").trim().toUpperCase();
  if (c === INTERNAL_AUDIT_FORM_CODES.plan) return "plan";
  if (c === INTERNAL_AUDIT_FORM_CODES.checklist) return "checklist";
  if (c === INTERNAL_AUDIT_FORM_CODES.report) return "report";
  return null;
}

export const INTERNAL_AUDIT_OPEN_SEQUENCE = [
  INTERNAL_AUDIT_FORM_CODES.plan,
  INTERNAL_AUDIT_FORM_CODES.checklist,
  INTERNAL_AUDIT_FORM_CODES.report,
] as const;

export type InternalAuditCycleDto = {
  id: string;
  year: number;
  title: string;
  status: "OPEN" | "IN_PROGRESS" | "CLOSED" | "OVERDUE" | "MONITORING";
  ownerName: string | null;
  planQmsDocumentId: string | null;
  checklistQmsDocumentId: string | null;
  reportQmsDocumentId: string | null;
  planContent: string | null;
  checklistContent: string | null;
  reportContent: string | null;
  createdAt: string;
  updatedAt: string;
};
