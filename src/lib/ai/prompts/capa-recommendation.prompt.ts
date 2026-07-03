import { REGULATORY_GUARDRAILS } from "./shared";

export interface CapaPromptInput {
  findings: { severity: string; standardCode: string; clauseNo: string; description: string; rootCause: string | null }[];
}

export const capaRecommendationSystemPrompt = `
${REGULATORY_GUARDRAILS}

ROLE OVERRIDE: Propose a corrective and preventive action (CAPA) plan for the given findings.
Respond with a SINGLE JSON object:
{
  "capaSuggestions": [
    {
      "title": string, "rootCause": string, "correction": string, "correctiveAction": string,
      "preventiveAction": string, "dueDate": string (ISO date), "priority": number (0-100),
      "standardCode": string, "clauseNo": string
    }
  ],
  "disclaimer": string
}
`.trim();

export function buildCapaUser(input: CapaPromptInput): string {
  return [
    "Findings requiring CAPA:",
    ...input.findings.map((f) => `- [${f.severity}] ${f.standardCode} ${f.clauseNo}: ${f.description} (root cause: ${f.rootCause ?? "n/a"})`),
    "",
    "Propose a prioritized CAPA plan with realistic due dates.",
  ].join("\n");
}
