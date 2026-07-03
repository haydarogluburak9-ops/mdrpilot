import type { DocStatus } from "@/lib/domain/types";
import type { ClinicalStudyRecord } from "@/lib/domain/clinical-study-model";
import type { LiteratureSearchData } from "@/lib/domain/clinical-literature-model";
import type { EquivalentDevicesData } from "@/lib/domain/clinical-equivalent-model";
import type { ClinicalGapMatrix } from "@/lib/domain/clinical-gap-matrix";
import type { ClinicalQpDocuments } from "@/lib/domain/clinical-qp-documents";

export interface CerRevisionEntry {
  rev: number;
  date: string;
  by: string;
  note: string;
}

export const CER_TRANSITIONS: Record<DocStatus, DocStatus[]> = {
  MISSING: ["DRAFT"],
  DRAFT: ["IN_REVIEW"],
  IN_REVIEW: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: ["DRAFT"],
};

export type ClinicalSectionKey =  | "plan"
  | "stateOfTheArt"
  | "equivalentDevices"
  | "literatureStrategy"
  | "clinicalDataSummary"
  | "benefitRiskConclusion"
  | "pmsPmcfInputs"
  | "report";

export const CLINICAL_SECTION_KEYS: ClinicalSectionKey[] = [
  "plan",
  "stateOfTheArt",
  "equivalentDevices",
  "literatureStrategy",
  "clinicalDataSummary",
  "benefitRiskConclusion",
  "pmsPmcfInputs",
  "report",
];

export interface ClinicalEvaluationData {
  id: string;
  plan?: string;
  stateOfTheArt?: string;
  equivalentDevices?: string;
  literatureStrategy?: string;
  clinicalDataSummary?: string;
  benefitRiskConclusion?: string;
  pmsPmcfInputs?: string;
  report?: string;
  literatureData?: LiteratureSearchData | null;
  clinicalStudies?: ClinicalStudyRecord[];
  equivalentDevicesData?: EquivalentDevicesData | null;
  status: DocStatus;
  updatedAt: string;
  submittedBy?: { id: string; name: string | null; email: string } | null;
  approvedBy?: { id: string; name: string | null; email: string } | null;
  approvedAt?: string | null;
  revisionNo?: number;
  revisionHistory?: CerRevisionEntry[];
  gapMatrix?: ClinicalGapMatrix | null;
  qpDocuments?: ClinicalQpDocuments | null;
}

export function sectionStatus(
  evaluation: ClinicalEvaluationData | null,
  key: ClinicalSectionKey,
): DocStatus {
  if (!evaluation) return "MISSING";
  const text = evaluation[key];
  if (!text || text.trim().length < 20) return "MISSING";
  if (evaluation.status === "APPROVED") return "APPROVED";
  return evaluation.status === "IN_REVIEW" ? "IN_REVIEW" : "DRAFT";
}
