import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";
import { describeProduct, productInputSchema, type ProductInput } from "./input";

export const technicalFilePrompt: PromptDefinition<ProductInput> = {
  id: "technical-file",
  inputSchema: productInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Assess the MDR Annex II/III technical file for the given device.
Identify which sections are required, which are likely missing, and what evidence is needed.`,
  buildUser: (input) =>
    [
      describeProduct(input),
      "",
      "Produce a technical file gap analysis.",
      jsonOutputReminder(
        '{ "sections": [{ "title": string, "status": "MISSING"|"DRAFT"|"IN_REVIEW"|"APPROVED", "required": boolean, "note": string }] }',
      ),
    ].join("\n"),
};
