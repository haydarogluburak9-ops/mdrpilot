// Client-safe types shared by the Compliance Consultant, Audit Simulator and Executive Dashboard.

import { displayStandardCode } from "@/lib/domain/standards-catalog";

export type ComplianceStandardScope = "MDR" | "ISO_13485" | "ISO_14971" | "ISO_9001" | "COMBINED";

export const COMPLIANCE_STANDARDS: { value: ComplianceStandardScope; label: string }[] = [
  { value: "MDR", label: displayStandardCode("MDR") },
  { value: "ISO_13485", label: displayStandardCode("ISO_13485") },
  { value: "ISO_14971", label: displayStandardCode("ISO_14971") },
  { value: "ISO_9001", label: displayStandardCode("ISO_9001") },
  { value: "COMBINED", label: "Combined Assessment" },
];

export const COMPLIANCE_STANDARD_LABEL: Record<ComplianceStandardScope, string> =
  Object.fromEntries(COMPLIANCE_STANDARDS.map((s) => [s.value, s.label])) as Record<ComplianceStandardScope, string>;

export type Severity = "Critical" | "Major" | "Minor" | "Observation";
export type ScoreBand = "red" | "yellow" | "green";

export interface CategoryScores {
  technicalFile: number;
  gspr: number;
  risk: number;
  clinical: number;
  pms: number;
  qms: number;
  evidenceCoverage: number;
  documentationQuality: number;
  traceability: number;
}

export interface ComplianceGap {
  title: string;
  severity: Severity;
  standard: string;
  clause: string;
  requirementSummary: string;
  whyItMatters: string;
  currentSituation: string;
  recommendedAction: string;
  estimatedEffort: number; // 0-100 (relative effort)
  quickWin: boolean;
  dependencies: string[];
  evidenceNeeded: string[];
  confidence: number;
}

export interface TopAction {
  title: string;
  impact: number; // 0-100
  effort: number; // 0-100
  priority: Severity;
}

export interface RoadmapWeek {
  week: number;
  focus: string;
  items: string[];
}

export interface Citation {
  standardCode: string;
  clauseNo: string;
  reason: string;
  confidence: number;
}

export interface ConsultantResult {
  standard: ComplianceStandardScope;
  productId: string | null;
  productName: string | null;
  overallScore: number;
  band: ScoreBand;
  categoryScores: CategoryScores;
  gaps: ComplianceGap[];
  topActions: TopAction[];
  roadmap: RoadmapWeek[];
  citations: Citation[];
  confidence: number;
  summary: string;
  generatedAt: string;
  disclaimer: string;
}

export function bandOf(score: number): ScoreBand {
  if (score >= 80) return "green";
  if (score >= 50) return "yellow";
  return "red";
}

export const SEVERITY_RANK: Record<Severity, number> = {
  Critical: 3, Major: 2, Minor: 1, Observation: 0,
};

export const CATEGORY_LABELS: Record<keyof CategoryScores, string> = {
  technicalFile: "Technical File",
  gspr: "GSPR",
  risk: "Risk",
  clinical: "Clinical",
  pms: "PMS",
  qms: "QMS",
  evidenceCoverage: "Evidence Coverage",
  documentationQuality: "Documentation Quality",
  traceability: "Traceability",
};
