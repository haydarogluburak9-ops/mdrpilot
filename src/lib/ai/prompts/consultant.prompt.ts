import { REGULATORY_GUARDRAILS } from "./shared";

export interface ConsultantPromptInput {
  standard: string;
  productName: string | null;
  deterministicSummary: string;
  overallScore: number;
  categoryScores: Record<string, number>;
  gaps: { title: string; severity: string; standard: string; clause: string; currentSituation: string }[];
  clausesContext: { standardCode: string; clauseNo: string; title: string; summary: string }[];
}

export const consultantSystemPrompt = `
${REGULATORY_GUARDRAILS}

ROLE OVERRIDE: For THIS task act as a senior regulatory compliance consultant performing a gap
assessment. Your job is NOT to produce documents — it is to find deficiencies and prioritize them.

Respond with a SINGLE JSON object using this shape (override the generic schema):
{
  "overallScore": number (0-100),
  "categoryScores": { "technicalFile": number, "gspr": number, "risk": number, "clinical": number, "pms": number, "qms": number, "evidenceCoverage": number, "documentationQuality": number, "traceability": number },
  "gaps": [
    {
      "title": string, "severity": "Critical"|"Major"|"Minor"|"Observation",
      "standard": string, "clause": string, "requirementSummary": string,
      "whyItMatters": string, "currentSituation": string, "recommendedAction": string,
      "estimatedEffort": number (0-100), "quickWin": boolean,
      "dependencies": string[], "evidenceNeeded": string[], "confidence": number (0-1)
    }
  ],
  "topActions": [ { "title": string, "impact": number, "effort": number, "priority": "Critical"|"Major"|"Minor"|"Observation" } ],
  "roadmap": [ { "week": number, "focus": string, "items": string[] } ],
  "citations": [ { "standardCode": string, "clauseNo": string, "reason": string, "confidence": number } ],
  "confidence": number (0-1),
  "summary": string,
  "disclaimer": string
}
Base your answer on the provided deterministic findings and retrieved clauses. Keep only realistic gaps.
`.trim();

export function buildConsultantUser(input: ConsultantPromptInput): string {
  return [
    `Standard scope: ${input.standard}`,
    `Product: ${input.productName ?? "(company-wide)"}`,
    `Deterministic readiness summary: ${input.deterministicSummary}`,
    `Deterministic overall score: ${input.overallScore}`,
    `Deterministic category scores: ${JSON.stringify(input.categoryScores)}`,
    "",
    "Deterministic gaps detected:",
    ...input.gaps.map((g) => `- [${g.severity}] ${g.title} (${g.standard} ${g.clause}): ${g.currentSituation}`),
    "",
    "Retrieved standard clauses (for citations):",
    ...input.clausesContext.map((c) => `- ${c.standardCode} ${c.clauseNo}: ${c.title} — ${c.summary}`),
    "",
    "Refine scores, enrich gap explanations, prioritize the top 5 actions and produce a 4-week roadmap.",
  ].join("\n");
}
