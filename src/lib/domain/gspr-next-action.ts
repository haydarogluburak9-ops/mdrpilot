import type { GsprItem } from "./types";
import { hasRealGsprEvidence, resolveGsprStatus } from "./gspr-row-status";
import { sortByGsprNo } from "./gspr-sort";

export type GsprNextActionReason =
  | "missing"
  | "no_evidence"
  | "no_justification"
  | "not_approved";

export interface GsprNextAction {
  item: GsprItem;
  reason: GsprNextActionReason;
}

export function findNextGsprAction(
  items: GsprItem[],
  linkedFileCountById: Record<string, number>,
): GsprNextAction | null {
  const applicable = sortByGsprNo(items.filter((g) => g.applicable !== "NO"));

  const ctx = (g: GsprItem) => ({
    applicable: g.applicable,
    justification: g.justification,
    evidenceDocument: g.evidenceDocumentRaw ?? g.evidenceDocument,
    evidenceManual: g.evidenceManual,
    linkedFileCount: linkedFileCountById[g.id] ?? 0,
  });

  for (const g of applicable) {
    const effective = resolveGsprStatus(g.status, ctx(g));
    if (effective === "MISSING") return { item: g, reason: "missing" };
  }

  for (const g of applicable) {
    if (
      !hasRealGsprEvidence(
        linkedFileCountById[g.id] ?? 0,
        g.evidenceDocumentRaw ?? g.evidenceDocument,
        g.evidenceManual,
      )
    ) {
      return { item: g, reason: "no_evidence" };
    }
  }

  for (const g of applicable) {
    if (!g.justification?.trim()) return { item: g, reason: "no_justification" };
  }

  for (const g of applicable) {
    if (g.status !== "APPROVED") return { item: g, reason: "not_approved" };
  }

  return null;
}
