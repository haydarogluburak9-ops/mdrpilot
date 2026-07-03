// Client-safe types for the Audit Simulator.

import { displayStandardCode } from "@/lib/domain/standards-catalog";

export type AuditStandardScope = "MDR" | "ISO_13485" | "ISO_9001" | "ISO_14971" | "COMBINED";
export type AssessmentType = "QUICK" | "STANDARD" | "FULL";
export type FindingSeverity = "MAJOR" | "MINOR" | "OBSERVATION" | "POSITIVE";

export const AUDIT_STANDARDS: { value: AuditStandardScope; label: string }[] = [
  { value: "ISO_13485", label: displayStandardCode("ISO_13485") },
  { value: "MDR", label: displayStandardCode("MDR") },
  { value: "ISO_9001", label: displayStandardCode("ISO_9001") },
  { value: "ISO_14971", label: displayStandardCode("ISO_14971") },
  { value: "COMBINED", label: "Combined" },
];

export const ASSESSMENT_TYPES: { value: AssessmentType; label: string; count: number }[] = [
  { value: "QUICK", label: "Quick (5 questions)", count: 5 },
  { value: "STANDARD", label: "Standard (10 questions)", count: 10 },
  { value: "FULL", label: "Full Audit (18 questions)", count: 18 },
];

export const ASSESSMENT_COUNT: Record<AssessmentType, number> = {
  QUICK: 5, STANDARD: 10, FULL: 18,
};

export const FINDING_SEVERITY_LABEL: Record<FindingSeverity, string> = {
  MAJOR: "Major", MINOR: "Minor", OBSERVATION: "Observation", POSITIVE: "Positive",
};

export interface AuditFindingDto {
  id?: string;
  standardCode: string;
  clauseNo: string;
  severity: FindingSeverity;
  description: string;
  evidence: string | null;
  rootCause: string | null;
  correctiveAction: string | null;
  dueDateSuggestion: string | null;
  priority: number;
}

export interface CapaSuggestion {
  title: string;
  rootCause: string;
  correctiveAction: string;
  dueDate: string;
  priority: number;
  standardCode: string;
  clauseNo: string;
}

export interface AuditSummary {
  score: number;
  major: number;
  minor: number;
  observations: number;
  positive: number;
  narrative: string;
  capaSuggestions: CapaSuggestion[];
  confidence: number;
  disclaimer: string;
}
