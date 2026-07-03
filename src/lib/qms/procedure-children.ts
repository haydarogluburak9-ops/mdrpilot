/**
 * ISO 13485: child documents (forms, WI, diagrams…) belong under a parent procedure.
 */

import type { QmsDocumentLayer } from "./kys-structure";

/** Layers that should be nested under a procedure when parent is set. */
export const PROCEDURE_CHILD_LAYERS: QmsDocumentLayer[] = [
  "DIAGRAM",
  "PLAN",
  "LIST",
  "SPECIFICATION",
  "JOB_DESCRIPTION",
  "INSTRUCTION",
  "FORM",
  "ASSIGNMENT",
  "RECORD",
  "OTHER",
];

/** Explicit parent SOP for scaffold codes (overrides inference). */
export const PARENT_PROCEDURE_BY_CODE: Record<string, string> = {
  "DOC-OTH-01": "SOP-MR",
  "PLAN-QA-01": "SOP-MR",
  "PLAN-IA-01": "SOP-IA",
  "PLAN-MR-01": "SOP-MR",
  "DIA-ORG-01": "SOP-ORG",
  "DIA-PRC-01": "SOP-ORG",
  "LIST-DC-01": "SOP-DC",
  "LIST-RC-01": "SOP-RC",
  "LIST-EQ-01": "SOP-ME",
  "SPEC-PRD-01": "SOP-DD",
  "JD-GM-01": "SOP-ORG",
  "JD-QM-01": "SOP-ORG",
  "JD-PRRC-01": "SOP-ORG",
  "WI-GEN-01": "SOP-PC",
  "FORM-CH-01": "SOP-CH",
  "FORM-CH-02": "SOP-CH",
  "FORM-CAPA-01": "SOP-CAPA",
  "FORM-IA-01": "SOP-IA",
  "FORM-MR-01": "SOP-MR",
  "FORM-NCP-01": "SOP-NCP",
  "DIA-AN-01": "SOP-AN",
  "FORM-AN-01": "SOP-AN",
  "FORM-AN-02": "SOP-AN",
  "FORM-AN-03": "SOP-AN",
  "FORM-AN-04": "SOP-AN",
  "FORM-AN-05": "SOP-AN",
  "FORM-AN-06": "SOP-AN",
  "WI-AN-01": "SOP-AN",
  "LIST-AN-01": "SOP-AN",
  "REC-AN-01": "SOP-AN",
  "DIA-CC-01": "SOP-CC",
  "FORM-CC-01": "SOP-CC",
  "FORM-CC-02": "SOP-CC",
  "FORM-CC-03": "SOP-CC",
  "LIST-CC-01": "SOP-CC",
  "REC-CC-01": "SOP-CC",
  "REC-CH-02": "SOP-CH",
  "ASG-YT-01": "SOP-ORG",
  "ASG-PRRC-01": "SOP-ORG",
  "REC-GUIDE-01": "SOP-RC",
};

/** Infer parent SOP from child document code patterns. */
export function inferParentProcedureCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const c = code.trim().toUpperCase();
  if (c in PARENT_PROCEDURE_BY_CODE) return PARENT_PROCEDURE_BY_CODE[c];
  if (c.startsWith("SOP-")) return null;

  const form = c.match(/^FORM-([A-Z0-9]+)/);
  if (form) {
    const slug = form[1];
    if (slug === "CAPA") return "SOP-CAPA";
    if (slug === "CH") return "SOP-CH";
    if (slug === "IA") return "SOP-IA";
    if (slug === "MR") return "SOP-MR";
    if (slug === "NCP") return "SOP-NCP";
    return `SOP-${slug}`;
  }

  const wi = c.match(/^WI-([A-Z0-9]+)/);
  if (wi) {
    const slug = wi[1];
    const map: Record<string, string> = {
      GEN: "SOP-PC",
      DC: "SOP-DC",
      RM: "SOP-RM",
      ST: "SOP-ST",
      TR: "SOP-TR",
    };
    return map[slug] ?? `SOP-${slug}`;
  }

  const dia = c.match(/^DIA-([A-Z0-9]+)/);
  if (dia) {
    if (dia[1] === "ORG" || dia[1] === "PRC") return "SOP-ORG";
    if (dia[1] === "AN") return "SOP-AN";
    if (dia[1] === "CC") return "SOP-CC";
    return `SOP-${dia[1]}`;
  }

  const plan = c.match(/^PLAN-([A-Z0-9]+)/);
  if (plan) {
    const slug = plan[1];
    if (slug === "IA") return "SOP-IA";
    if (slug === "MR" || slug === "QA") return "SOP-MR";
    if (slug === "AN") return "SOP-AN";
    return `SOP-${slug}`;
  }

  const list = c.match(/^LIST-([A-Z0-9]+)/);
  if (list) {
    const slug = list[1];
    if (slug === "DC") return "SOP-DC";
    if (slug === "RC") return "SOP-RC";
    if (slug === "EQ") return "SOP-ME";
    if (slug === "AN") return "SOP-AN";
    if (slug === "CC") return "SOP-CC";
    return `SOP-${slug}`;
  }

  if (c.startsWith("REC-")) {
    const rec = c.match(/^REC-([A-Z0-9]+)/);
    if (rec?.[1] === "GUIDE") return "SOP-RC";
    if (rec?.[1] === "AN") return "SOP-AN";
    if (rec?.[1] === "CC") return "SOP-CC";
    if (rec?.[1]) return `SOP-${rec[1]}`;
    return "SOP-RC";
  }

  if (c.startsWith("JD-") || c.startsWith("ASG-")) return "SOP-ORG";
  if (c.startsWith("SPEC-")) return "SOP-DD";

  return null;
}

export interface QmsDocTreeNode<T extends QmsDocTreeItem> {
  procedure: T;
  children: T[];
}

export interface QmsDocTreeItem {
  id?: string;
  code: string | null;
  layer: string;
  parentProcedureCode?: string | null;
  linkedProcedureCodes?: string[];
  hasContent?: boolean;
}

/** One row per document code — keeps the row with content when duplicates exist. */
export function dedupeQmsDocsByCode<T extends QmsDocTreeItem>(docs: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const doc of docs) {
    const key = (doc.code?.trim().toUpperCase() || doc.id || "").trim();
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      byKey.set(key, doc);
      continue;
    }
    const score = (d: T) => (d.hasContent ? 2 : 0);
    byKey.set(key, score(doc) > score(prev) ? doc : prev);
  }
  return Array.from(byKey.values());
}

/** Group child docs under procedures; return orphans without parent. */
export function buildProcedureTree<T extends QmsDocTreeItem>(docs: T[]): {
  procedures: QmsDocTreeNode<T>[];
  manualDocs: T[];
  orphans: T[];
} {
  const manualDocs = docs.filter((d) => d.layer === "MANUAL");
  const procedures = docs
    .filter((d) => d.layer === "PROCEDURE")
    .sort((a, b) => (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true }));

  const childCandidates = docs.filter((d) => d.layer !== "PROCEDURE" && d.layer !== "MANUAL");

  const childrenByParent = new Map<string, T[]>();
  const orphans: T[] = [];

  for (const doc of childCandidates) {
    const primaryParent =
      doc.parentProcedureCode?.trim() ||
      inferParentProcedureCode(doc.code) ||
      null;

    const parentCodes = new Set<string>();
    if (primaryParent && procedures.some((p) => p.code === primaryParent)) {
      parentCodes.add(primaryParent);
    }
    for (const linked of doc.linkedProcedureCodes ?? []) {
      const lp = linked.trim().toUpperCase();
      if (lp && procedures.some((p) => p.code === lp)) parentCodes.add(lp);
    }

    if (parentCodes.size === 0) {
      orphans.push(doc);
      continue;
    }

    for (const parent of parentCodes) {
      const bucket = childrenByParent.get(parent) ?? [];
      bucket.push(doc);
      childrenByParent.set(parent, bucket);
    }
  }

  const procedureNodes: QmsDocTreeNode<T>[] = procedures.map((procedure) => ({
    procedure,
    children: dedupeQmsDocsByCode(childrenByParent.get(procedure.code ?? "") ?? []).sort((a, b) =>
      (a.code ?? "").localeCompare(b.code ?? "", undefined, { numeric: true }),
    ),
  }));

  return { procedures: procedureNodes, manualDocs, orphans };
}

export function groupChildrenByLayer<T extends { layer: string }>(
  children: T[],
): Array<{ layer: QmsDocumentLayer; items: T[] }> {
  const order = PROCEDURE_CHILD_LAYERS;
  const buckets = new Map<string, T[]>();
  for (const c of children) {
    const list = buckets.get(c.layer) ?? [];
    list.push(c);
    buckets.set(c.layer, list);
  }
  return order
    .filter((layer) => buckets.has(layer))
    .map((layer) => ({ layer, items: buckets.get(layer)! }));
}
