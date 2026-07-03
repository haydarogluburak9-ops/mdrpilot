import { REGULATORY_GUARDRAILS } from "./shared";

export interface AuditReportPromptInput {
  standard: string;
  productName: string | null;
  score: number;
  major: number;
  minor: number;
  observations: number;
  positive: number;
  findings: { severity: string; standardCode: string; clauseNo: string; description: string }[];
}

export const auditReportSystemPrompt = `
${REGULATORY_GUARDRAILS}

ROLE OVERRIDE: Write an executive audit report summary for the given simulated audit.
Respond with a SINGLE JSON object:
{
  "executiveSummary": string,
  "strengths": string[],
  "keyConcerns": string[],
  "recommendation": string,
  "disclaimer": string
}
`.trim();

export function buildAuditReportUser(input: AuditReportPromptInput): string {
  return [
    `Standard: ${input.standard} · Auditee: ${input.productName ?? "(company-wide)"}`,
    `Score: ${input.score}/100 — ${input.major} major, ${input.minor} minor, ${input.observations} observations, ${input.positive} positive.`,
    "",
    "Findings:",
    ...input.findings.map((f) => `- [${f.severity}] ${f.standardCode} ${f.clauseNo}: ${f.description}`),
    "",
    "Write a concise, professional audit report summary.",
  ].join("\n");
}
