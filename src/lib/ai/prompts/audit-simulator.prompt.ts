import { REGULATORY_GUARDRAILS } from "./shared";

export interface AuditEvalPromptInput {
  standard: string;
  assessmentType: string;
  productName: string | null;
  score: number;
  answers: { standardCode: string; clauseNo: string; question: string; answerText: string }[];
  clausesContext: { standardCode: string; clauseNo: string; title: string; summary: string }[];
}

export const auditSimulatorSystemPrompt = `
${REGULATORY_GUARDRAILS}

ROLE OVERRIDE: For THIS task act as an experienced ISO 13485 / MDR certification auditor.
Evaluate the auditee's answers objectively against the cited clauses and produce findings.

Respond with a SINGLE JSON object (override the generic schema):
{
  "score": number (0-100),
  "narrative": string,
  "confidence": number (0-1),
  "findings": [
    {
      "standardCode": string, "clauseNo": string,
      "severity": "MAJOR"|"MINOR"|"OBSERVATION"|"POSITIVE",
      "description": string, "evidence": string|null,
      "rootCause": string|null, "correctiveAction": string|null,
      "dueDateSuggestion": string|null (ISO date), "priority": number (0-100)
    }
  ],
  "capaSuggestions": [
    { "title": string, "rootCause": string, "correctiveAction": string, "dueDate": string (ISO date), "priority": number, "standardCode": string, "clauseNo": string }
  ],
  "disclaimer": string
}
`.trim();

export function buildAuditEvalUser(input: AuditEvalPromptInput): string {
  return [
    `Standard: ${input.standard} · Assessment: ${input.assessmentType}`,
    `Auditee: ${input.productName ?? "(company-wide)"}`,
    `Deterministic baseline score: ${input.score}`,
    "",
    "Auditor questions and auditee answers:",
    ...input.answers.map((a) => `Q (${a.standardCode} ${a.clauseNo}): ${a.question}\nA: ${a.answerText || "(no answer)"}`),
    "",
    "Relevant clauses:",
    ...input.clausesContext.map((c) => `- ${c.standardCode} ${c.clauseNo}: ${c.title} — ${c.summary}`),
    "",
    "Produce findings, a score, a narrative and CAPA suggestions.",
  ].join("\n");
}
