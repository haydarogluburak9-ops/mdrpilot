import type { OperationalModuleKind } from "@prisma/client";
import type { OperationalModuleSlug } from "@/lib/operational/modules";

const KIND_TO_SLUG: Record<OperationalModuleKind, OperationalModuleSlug> = {
  INTERNAL_AUDIT: "internal-audit",
  NCP: "ncp",
  FSCA: "fsca",
  VIGILANCE: "vigilance",
  CHANGE_CONTROL: "change-control",
  MANAGEMENT_REVIEW: "management-review",
  TRAINING: "training",
  SUPPLIER_EVAL: "supplier-eval",
  TRACEABILITY: "traceability",
  CALIBRATION: "calibration",
};

export function operationalKindToSlug(kind: OperationalModuleKind): OperationalModuleSlug {
  return KIND_TO_SLUG[kind];
}

export function operationalHrefForKind(kind: OperationalModuleKind, recordId?: string): string {
  const slug = operationalKindToSlug(kind);
  const base = `/operational/${slug}`;
  return recordId ? `${base}/${recordId}` : base;
}
