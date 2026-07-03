export type VerificationTestCategory =
  | "BIOCOMPATIBILITY"
  | "STERILIZATION"
  | "PACKAGING"
  | "ELECTRICAL"
  | "MECHANICAL"
  | "SOFTWARE"
  | "CLINICAL"
  | "OTHER";

export type VerificationTestStatus = "PLANNED" | "IN_PROGRESS" | "PASS" | "FAIL" | "NA";

export interface VerificationTestRecord {
  id: string;
  category: VerificationTestCategory;
  title: string;
  standardRef?: string;
  protocolRef?: string;
  status: VerificationTestStatus;
  resultSummary?: string;
  performedAt?: string;
  evidenceFileIds?: string[];
}

export const VERIFICATION_TEST_CATEGORIES: VerificationTestCategory[] = [
  "BIOCOMPATIBILITY",
  "STERILIZATION",
  "PACKAGING",
  "ELECTRICAL",
  "MECHANICAL",
  "SOFTWARE",
  "CLINICAL",
  "OTHER",
];

export const DEFAULT_VERIFICATION_TESTS = (
  product: { isSterile?: boolean; containsSoftware?: boolean },
): VerificationTestRecord[] => {
  const tests: VerificationTestRecord[] = [
    {
      id: "vv-biocomp",
      category: "BIOCOMPATIBILITY",
      title: "Biological evaluation (ISO 10993 series)",
      standardRef: "ISO 10993-1",
      status: "PLANNED",
    },
    {
      id: "vv-packaging",
      category: "PACKAGING",
      title: "Packaging validation / shelf-life",
      standardRef: "ISO 11607",
      status: "PLANNED",
    },
    {
      id: "vv-mechanical",
      category: "MECHANICAL",
      title: "Mechanical / functional verification",
      status: "PLANNED",
    },
  ];
  if (product.isSterile) {
    tests.push({
      id: "vv-steril",
      category: "STERILIZATION",
      title: "Sterilization validation",
      standardRef: "ISO 11135 / ISO 11137 / ISO 17665",
      status: "PLANNED",
    });
  }
  if (product.containsSoftware) {
    tests.push({
      id: "vv-software",
      category: "SOFTWARE",
      title: "Software verification and validation",
      standardRef: "IEC 62304 / IEC 62366-1",
      status: "PLANNED",
    });
  }
  return tests;
};

function isRecord(v: unknown): v is VerificationTestRecord {
  if (!v || typeof v !== "object") return false;
  const r = v as VerificationTestRecord;
  return (
    typeof r.id === "string" &&
    typeof r.title === "string" &&
    typeof r.category === "string" &&
    typeof r.status === "string"
  );
}

export function parseVerificationTests(raw: unknown): VerificationTestRecord[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRecord);
}

export function mergeVerificationTests(
  existing: VerificationTestRecord[],
  defaults: VerificationTestRecord[],
): VerificationTestRecord[] {
  const byId = new Map(existing.map((t) => [t.id, t]));
  for (const d of defaults) {
    if (!byId.has(d.id)) byId.set(d.id, d);
  }
  return Array.from(byId.values());
}
