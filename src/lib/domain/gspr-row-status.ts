import type { DocStatus } from "./types";
import { isGsprAutoHint } from "./gspr-evidence-i18n";

/** Linked file, user-confirmed manual note, or non-auto-hint text counts as real evidence. */
export function hasRealGsprEvidence(
  linkedFileCount: number,
  evidenceDocument?: string | null,
  evidenceManual?: boolean,
): boolean {
  if (linkedFileCount > 0) return true;
  const doc = evidenceDocument?.trim();
  if (!doc) return false;
  if (evidenceManual) return true;
  return !isGsprAutoHint(doc);
}

export interface GsprRowStatusInput {
  applicable: string;
  status: DocStatus;
  justification?: string | null;
  evidenceDocument?: string | null;
  evidenceManual?: boolean;
  linkedFileCount: number;
}

/** Allowed manual workflow transitions. */
export const GSPR_STATUS_TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  MISSING: ["DRAFT", "IN_REVIEW", "APPROVED"],
  DRAFT: ["MISSING", "IN_REVIEW", "APPROVED"],
  IN_REVIEW: ["DRAFT", "MISSING", "APPROVED"],
  APPROVED: ["IN_REVIEW", "DRAFT", "MISSING"],
  REJECTED: ["DRAFT"],
};

export function canTransitionGsprStatus(from: DocStatus, to: DocStatus): boolean {
  if (from === to) return true;
  return GSPR_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/** Validation error key (i18n) or null if the row can move to target status. */
export function gsprStatusBlockReason(
  input: GsprRowStatusInput,
  target: DocStatus,
): "gspr.status.err.justification" | "gspr.status.err.evidence" | "gspr.status.err.evidenceAutoHint" | null {
  if (target !== "IN_REVIEW" && target !== "APPROVED") return null;

  if (!input.justification?.trim()) return "gspr.status.err.justification";

  if (input.applicable === "NO") return null;

  if (!hasRealGsprEvidence(input.linkedFileCount, input.evidenceDocument, input.evidenceManual)) {
    const doc = input.evidenceDocument?.trim();
    if (doc && isGsprAutoHint(doc)) return "gspr.status.err.evidenceAutoHint";
    return "gspr.status.err.evidence";
  }
  return null;
}

/** Auto-derived readiness (ignores manual APPROVED / IN_REVIEW). */
export function computeGsprRowStatus(input: GsprRowStatusInput): DocStatus {
  if (input.applicable === "NO") {
    return input.justification?.trim() ? "DRAFT" : "MISSING";
  }

  const hasEvidence = hasRealGsprEvidence(input.linkedFileCount, input.evidenceDocument, input.evidenceManual);
  const hasJustification = !!input.justification?.trim();

  if (!hasEvidence && !hasJustification) return "MISSING";
  return "DRAFT";
}

/** Status shown in UI and persisted after content changes. */
export function resolveGsprStatus(
  stored: DocStatus,
  input: Omit<GsprRowStatusInput, "status">,
): DocStatus {
  const full: GsprRowStatusInput = { ...input, status: stored };
  const auto = computeGsprRowStatus(full);

  if (stored === "APPROVED" || stored === "IN_REVIEW") {
    if (gsprStatusBlockReason(full, stored)) return auto;
    return stored;
  }
  return auto;
}

/** Status options a user may pick in the dropdown. */
export function gsprStatusOptions(canApprove: boolean): DocStatus[] {
  const base: DocStatus[] = ["MISSING", "DRAFT", "IN_REVIEW"];
  if (canApprove) base.push("APPROVED");
  return base;
}

export type GsprStatusCountInput = {
  id: string;
  status: DocStatus;
  applicable: string;
  justification?: string | null;
  evidenceDocument?: string | null;
  evidenceDocumentRaw?: string | null;
  evidenceManual?: boolean;
};

/** Count rows by effective (UI) status. Uygulanmaz (NO) satırlar özet dışı bırakılır. */
export function countEffectiveGsprStatuses(
  items: GsprStatusCountInput[],
  linkedFileCountById: Record<string, number>,
): Record<DocStatus, number> {
  const counts: Record<DocStatus, number> = {
    MISSING: 0,
    DRAFT: 0,
    IN_REVIEW: 0,
    APPROVED: 0,
    REJECTED: 0,
  };
  for (const item of items) {
    if (item.applicable === "NO") continue;

    const effective = resolveGsprStatus(item.status, {
      applicable: item.applicable,
      justification: item.justification,
      evidenceDocument: item.evidenceDocumentRaw ?? item.evidenceDocument,
      evidenceManual: item.evidenceManual,
      linkedFileCount: linkedFileCountById[item.id] ?? 0,
    });
    counts[effective]++;
  }
  return counts;
}

/** Count of not-applicable GSPR rows (excluded from workflow stat cards). */
export function countNotApplicableGsprRows(items: GsprStatusCountInput[]): number {
  return items.filter((item) => item.applicable === "NO").length;
}
