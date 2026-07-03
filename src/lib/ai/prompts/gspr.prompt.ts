import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";
import { describeProduct, productInputSchema, type ProductInput } from "./input";

export const gsprPrompt: PromptDefinition<ProductInput> = {
  id: "gspr",
  inputSchema: productInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: From MDR Annex I (General Safety and Performance Requirements), decide which GSPR clauses
apply to this device and which evidence/standards are typically expected. Flag clauses where
applicability needs justification.`,
  buildUser: (input) =>
    [
      describeProduct(input),
      "",
      "Suggest applicable GSPR clauses and required evidence.",
      jsonOutputReminder(
        '{ "items": [{ "gsprNo": string, "applicable": "YES"|"NO"|"JUSTIFICATION", "standardReference": string, "evidenceNeeded": string }] }',
      ),
    ].join("\n"),
};
