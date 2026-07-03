import "server-only";
import { DISCLAIMER } from "@/lib/domain/constants";
import type { ComplianceSnapshot } from "@/lib/compliance/snapshot";
import type { AuditFindingDto, AuditSummary, CapaSuggestion, FindingSeverity } from "./types";

export interface AnsweredQuestion {
  standardCode: string;
  clauseNo: string;
  question: string;
  expectedEvidence: string | null;
  weight: number;
  answerText: string;
}

const NEGATIVE = /\b(no|none|missing|not available|don't|do not|hayır|yok|mevcut değil|yapılmad|bilmiyorum|n\/a)\b/i;
const EVIDENCE = /(procedure|sop|report|record|document|policy|plan|register|protocol|prosedür|kayıt|rapor|talimat|doküman|plan)/i;

function dueInDays(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function classify(a: AnsweredQuestion): { severity: FindingSeverity; quality: number } {
  const text = (a.answerText ?? "").trim();
  if (!text || NEGATIVE.test(text)) {
    return { severity: a.weight >= 9 ? "MAJOR" : "MINOR", quality: 0 };
  }
  if (text.length < 15) {
    return { severity: "OBSERVATION", quality: 0.5 };
  }
  if (EVIDENCE.test(text)) {
    return { severity: "POSITIVE", quality: 1 };
  }
  return { severity: "OBSERVATION", quality: 0.6 };
}

function rootCauseFor(a: AnsweredQuestion, sev: FindingSeverity): string {
  if (sev === "MAJOR") return "Required process/evidence is not established or not demonstrable.";
  if (sev === "MINOR") return "Process exists but evidence is incomplete or not consistently maintained.";
  return "Insufficient detail provided to fully demonstrate conformity.";
}

function correctiveFor(a: AnsweredQuestion): string {
  return `Establish/complete the relevant documentation and link objective evidence (${a.expectedEvidence ?? "records"}).`;
}

const dueDays: Record<FindingSeverity, number> = { MAJOR: 30, MINOR: 60, OBSERVATION: 90, POSITIVE: 0 };
const priorityOf: Record<FindingSeverity, number> = { MAJOR: 90, MINOR: 60, OBSERVATION: 30, POSITIVE: 0 };

/**
 * Deterministic audit evaluation: turns answers + dossier snapshot into findings,
 * a score, finding summary and CAPA suggestions. AI augmentation is optional.
 */
export function evaluateAudit(
  answers: AnsweredQuestion[],
  snap: ComplianceSnapshot,
): { findings: AuditFindingDto[]; summary: AuditSummary } {
  const findings: AuditFindingDto[] = [];
  let weighted = 0;
  let weightSum = 0;

  for (const a of answers) {
    const { severity, quality } = classify(a);
    weighted += a.weight * quality;
    weightSum += a.weight;

    const evidence = a.answerText?.trim() ? a.answerText.trim().slice(0, 400) : null;
    findings.push({
      standardCode: a.standardCode,
      clauseNo: a.clauseNo,
      severity,
      description: severity === "POSITIVE"
        ? `Conformity demonstrated: ${a.question}`
        : `${a.question} — response indicates a ${severity.toLowerCase()} gap.`,
      evidence,
      rootCause: severity === "POSITIVE" ? null : rootCauseFor(a, severity),
      correctiveAction: severity === "POSITIVE" ? null : correctiveFor(a),
      dueDateSuggestion: severity === "POSITIVE" ? null : dueInDays(dueDays[severity]).toISOString(),
      priority: priorityOf[severity],
    });
  }

  // Dossier-derived findings (objective, independent of answers).
  const dossier: AuditFindingDto[] = [];
  const titles = snap.qms.titles.map((t) => t.toLowerCase());
  const hasProc = (kw: string) => titles.some((t) => t.includes(kw));
  if (!hasProc("document control")) {
    dossier.push(mkFinding("ISO 13485", "4.2.4", "MAJOR", "No Document Control Procedure found in the QMS.", "Document Control Procedure"));
  }
  if (!hasProc("capa") && !hasProc("corrective")) {
    dossier.push(mkFinding("ISO 13485", "8.5.2", "MAJOR", "No CAPA Procedure found in the QMS.", "CAPA Procedure"));
  }
  if (snap.capa.overdue > 0) {
    dossier.push(mkFinding("ISO 13485", "8.5.2", "MINOR", `${snap.capa.overdue} CAPA(s) are overdue.`, "CAPA effectiveness records"));
  }
  if (snap.evidence.uploadedFiles === 0) {
    dossier.push(mkFinding("ISO 13485", "4.2.5", "MINOR", "No objective evidence records uploaded.", "Records / test reports"));
  }
  if (snap.product) {
    const risks = snap.product.riskItems ?? [];
    const uncontrolled = risks.filter((r) => !r.riskControlMeasure || !r.verificationOfControl).length;
    if (risks.length === 0) {
      dossier.push(mkFinding("ISO 14971", "Clause 4-7", "MAJOR", "No risk management file exists for the audited product.", "Risk management file"));
    } else if (uncontrolled > 0) {
      dossier.push(mkFinding("ISO 14971", "Clause 7", "MINOR", `${uncontrolled} hazard(s) lack control/verification.`, "Verification records"));
    }
  }

  // De-duplicate dossier findings against answer findings on (clause+severity+desc-ish).
  for (const d of dossier) {
    if (!findings.some((f) => f.clauseNo === d.clauseNo && f.severity === d.severity && f.standardCode === d.standardCode && f.severity !== "POSITIVE")) {
      findings.push(d);
    }
  }

  const answerScore = weightSum > 0 ? (weighted / weightSum) * 100 : 0;
  const dossierPenalty = dossier.reduce((acc, f) => acc + (f.severity === "MAJOR" ? 8 : f.severity === "MINOR" ? 4 : 0), 0);
  const score = Math.max(0, Math.min(100, Math.round(answerScore - dossierPenalty)));

  const major = findings.filter((f) => f.severity === "MAJOR").length;
  const minor = findings.filter((f) => f.severity === "MINOR").length;
  const observations = findings.filter((f) => f.severity === "OBSERVATION").length;
  const positive = findings.filter((f) => f.severity === "POSITIVE").length;

  const capaSuggestions: CapaSuggestion[] = findings
    .filter((f) => f.severity === "MAJOR" || f.severity === "MINOR")
    .sort((a, b) => b.priority - a.priority)
    .map((f) => ({
      title: f.description.slice(0, 120),
      rootCause: f.rootCause ?? "",
      correctiveAction: f.correctiveAction ?? "",
      dueDate: f.dueDateSuggestion ?? dueInDays(60).toISOString(),
      priority: f.priority,
      standardCode: f.standardCode,
      clauseNo: f.clauseNo,
    }));

  const narrative = `Audit completed with a score of ${score}/100. ${major} major, ${minor} minor finding(s), ${observations} observation(s) and ${positive} positive finding(s) recorded. ${major > 0 ? "Major findings must be addressed before certification." : "No major non-conformities identified."}`;

  return {
    findings: findings.sort((a, b) => b.priority - a.priority),
    summary: {
      score, major, minor, observations, positive,
      narrative, capaSuggestions, confidence: 0.6, disclaimer: DISCLAIMER,
    },
  };
}

function mkFinding(standardCode: string, clauseNo: string, severity: FindingSeverity, description: string, evidenceNeeded: string): AuditFindingDto {
  return {
    standardCode, clauseNo, severity, description,
    evidence: null,
    rootCause: rootCauseFor({ standardCode, clauseNo, question: "", expectedEvidence: evidenceNeeded, weight: severity === "MAJOR" ? 9 : 6, answerText: "" }, severity),
    correctiveAction: `Establish/complete the ${evidenceNeeded} and maintain objective evidence.`,
    dueDateSuggestion: dueInDays(dueDays[severity]).toISOString(),
    priority: priorityOf[severity],
  };
}
