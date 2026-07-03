import { z } from "zod";
import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";

const auditInputSchema = z.object({
  productName: z.string(),
  deviceClass: z.string(),
  score: z.number(),
  breakdown: z.array(z.object({ label: z.string(), value: z.number() })),
  clauseGaps: z.array(z.object({ standardCode: z.string(), clauseNo: z.string(), message: z.string() })).optional(),
  clausesContext: z.string().optional(),
});

export type AuditInput = z.infer<typeof auditInputSchema>;

export const auditReadinessPrompt: PromptDefinition<AuditInput> = {
  id: "audit-readiness",
  inputSchema: auditInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Interpret an audit readiness score for an MDR/ISO 13485 audit. Explain the most critical gaps
in plain language and produce a prioritized action list. Do not claim audit success.`,
  buildUser: (input) =>
    [
      `Product: ${input.productName} (${input.deviceClass})`,
      `Overall readiness score: ${input.score}/100`,
      "Breakdown:",
      ...input.breakdown.map((b) => `- ${b.label}: ${b.value}%`),
      ...(input.clauseGaps?.length ? ["", "Clause-level gaps:", ...input.clauseGaps.map((g) => `- ${g.standardCode} ${g.clauseNo}: ${g.message}`)] : []),
      ...(input.clausesContext ? ["", "Retrieved standard clauses (cite where relevant):", input.clausesContext] : []),
      "",
      "Explain readiness and give a prioritized, clause-referenced action list.",
      jsonOutputReminder('{ "actions": [{ "priority": "high"|"medium"|"low", "action": string, "clauseRef": string }] }'),
    ].join("\n"),
};
