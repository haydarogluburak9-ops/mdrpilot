import type { DocStatus } from "@/lib/domain/types";

const ALL: DocStatus[] = ["MISSING", "DRAFT", "IN_REVIEW", "APPROVED"];

export function qmsStatusOptions(canApprove: boolean): DocStatus[] {
  return canApprove ? ALL : ALL.filter((s) => s !== "APPROVED");
}

export function qmsStatusBlockReason(
  doc: { status: DocStatus; content: string | null },
  target: DocStatus,
): string | null {
  if (target === doc.status) return null;
  const hasContent = Boolean(doc.content?.trim());

  if ((target === "IN_REVIEW" || target === "APPROVED") && !hasContent) {
    return "qms.status.err.content";
  }
  if (target === "APPROVED" && doc.status !== "IN_REVIEW") {
    return "qms.status.err.approveFromReview";
  }
  return null;
}

export function statusAfterQmsDraft(current: DocStatus): DocStatus {
  if (current === "APPROVED") return "IN_REVIEW";
  if (current === "MISSING") return "DRAFT";
  return current;
}
