import type { AssessmentType, AuditStandardScope } from "./types";
import { ASSESSMENT_COUNT } from "./types";

export interface QuestionTemplate {
  standardCode: string;
  clauseNo: string;
  question: string;
  expectedEvidence: string;
  scopes: AuditStandardScope[];
  weight: number; // higher = more important (asked first)
}

// Paraphrased auditor questions — no copyrighted standard text, only the kind of
// questions a notified body / certification auditor would ask.
const BANK: QuestionTemplate[] = [
  // ISO 13485 — QMS
  { standardCode: "ISO 13485", clauseNo: "4.2.4", question: "Is a Document Control Procedure available and applied? Please show evidence.", expectedEvidence: "Document Control Procedure (controlled copy, approval, revision history)", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 10 },
  { standardCode: "ISO 13485", clauseNo: "4.2.5", question: "How are quality records controlled, retained and protected?", expectedEvidence: "Record Control Procedure and retention schedule", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 8 },
  { standardCode: "ISO 13485", clauseNo: "4.2.3", question: "Is a Medical Device File maintained for each device or device family?", expectedEvidence: "Medical Device File / technical documentation index", scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 9 },
  { standardCode: "ISO 13485", clauseNo: "7.1", question: "On which standard is your Risk Management Procedure based, and how is it applied across the lifecycle?", expectedEvidence: "Risk Management Procedure referencing ISO 14971", scopes: ["ISO_13485", "ISO_14971", "COMBINED"], weight: 9 },
  { standardCode: "ISO 13485", clauseNo: "8.2.2", question: "Describe your complaint handling process and how complaints feed vigilance and CAPA.", expectedEvidence: "Complaint Handling Procedure and complaint records", scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 8 },
  { standardCode: "ISO 13485", clauseNo: "8.5.2", question: "How are corrective and preventive actions (CAPA) initiated, tracked and verified for effectiveness?", expectedEvidence: "CAPA Procedure and CAPA log with effectiveness checks", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 9 },
  { standardCode: "ISO 13485", clauseNo: "8.2.4", question: "Is there an internal audit programme, and are audits performed to schedule?", expectedEvidence: "Internal Audit Procedure, audit plan and reports", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 7 },
  { standardCode: "ISO 13485", clauseNo: "5.6", question: "How often is management review performed and what inputs/outputs are recorded?", expectedEvidence: "Management Review Procedure and meeting minutes", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 7 },
  { standardCode: "ISO 13485", clauseNo: "7.4", question: "How are suppliers evaluated, selected and re-evaluated?", expectedEvidence: "Supplier Evaluation Procedure and approved supplier list", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 6 },
  { standardCode: "ISO 13485", clauseNo: "6.2", question: "How is personnel competence and training managed and recorded?", expectedEvidence: "Training Procedure and training records", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 5 },
  { standardCode: "ISO 13485", clauseNo: "7.5.6", question: "How are special processes (e.g. sterilization) validated and monitored?", expectedEvidence: "Process validation reports", scopes: ["ISO_13485", "MDR", "COMBINED"], weight: 7 },
  { standardCode: "ISO 13485", clauseNo: "8.3", question: "How is nonconforming product identified, segregated and dispositioned?", expectedEvidence: "Nonconforming Product Procedure and NCR records", scopes: ["ISO_13485", "ISO_9001", "COMBINED"], weight: 6 },

  // MDR
  { standardCode: "MDR 2017/745", clauseNo: "Annex II", question: "Is the technical documentation complete and structured per Annex II?", expectedEvidence: "Technical file index covering Annex II sections", scopes: ["MDR", "COMBINED"], weight: 9 },
  { standardCode: "MDR 2017/745", clauseNo: "Annex I", question: "How do you demonstrate conformity with the General Safety and Performance Requirements (GSPR)?", expectedEvidence: "GSPR checklist with evidence per applicable requirement", scopes: ["MDR", "COMBINED"], weight: 9 },
  { standardCode: "MDR 2017/745", clauseNo: "Annex XIV", question: "How is clinical evaluation conducted and kept up to date?", expectedEvidence: "Clinical Evaluation Plan and Report (CER)", scopes: ["MDR", "COMBINED"], weight: 8 },
  { standardCode: "MDR 2017/745", clauseNo: "Annex III", question: "Describe your post-market surveillance system and how data is collected and reviewed.", expectedEvidence: "PMS plan and PMS/PSUR reports", scopes: ["MDR", "COMBINED"], weight: 8 },
  { standardCode: "MDR 2017/745", clauseNo: "Art. 10(9)", question: "How do you ensure UDI assignment and labeling compliance?", expectedEvidence: "UDI records and label control", scopes: ["MDR", "COMBINED"], weight: 6 },

  // ISO 14971
  { standardCode: "ISO 14971", clauseNo: "Clause 4", question: "How is the risk management plan established for each device?", expectedEvidence: "Risk Management Plan", scopes: ["ISO_14971", "MDR", "COMBINED"], weight: 8 },
  { standardCode: "ISO 14971", clauseNo: "Clause 7", question: "How are risk control measures defined and their effectiveness verified?", expectedEvidence: "Risk analysis with controls and verification", scopes: ["ISO_14971", "MDR", "COMBINED"], weight: 9 },
  { standardCode: "ISO 14971", clauseNo: "Clause 8", question: "How is overall residual risk evaluated and justified against benefits?", expectedEvidence: "Benefit-risk analysis", scopes: ["ISO_14971", "MDR", "COMBINED"], weight: 7 },

  // ISO 9001
  { standardCode: "ISO 9001", clauseNo: "4.1", question: "How have you determined the context of the organization and interested parties?", expectedEvidence: "Context analysis and interested parties register", scopes: ["ISO_9001", "COMBINED"], weight: 6 },
  { standardCode: "ISO 9001", clauseNo: "6.1", question: "How are risks and opportunities addressed in your QMS?", expectedEvidence: "Risk and opportunity register", scopes: ["ISO_9001", "COMBINED"], weight: 6 },
  { standardCode: "ISO 9001", clauseNo: "9.1.2", question: "How do you monitor customer satisfaction?", expectedEvidence: "Customer satisfaction data and analysis", scopes: ["ISO_9001", "COMBINED"], weight: 5 },
];

/** Looks up the importance weight for a stored question (by exact question text). */
export function weightForQuestion(question: string): number {
  return BANK.find((q) => q.question === question)?.weight ?? 6;
}

/** Deterministically selects questions for a session based on standard scope and assessment depth. */
export function selectQuestions(standard: AuditStandardScope, assessment: AssessmentType): QuestionTemplate[] {
  const count = ASSESSMENT_COUNT[assessment];
  const pool = BANK.filter((q) => standard === "COMBINED" || q.scopes.includes(standard));
  const sorted = [...pool].sort((a, b) => b.weight - a.weight);
  // Ensure variety: if combined, interleave standards a little by stable sort already by weight.
  return sorted.slice(0, count);
}
