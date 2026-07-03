import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";
import { describeProduct, productInputSchema, type ProductInput } from "./input";

export const pmsPrompt: PromptDefinition<ProductInput> = {
  id: "pms",
  inputSchema: productInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Define PMS (Art. 83-86, Annex III) and PMCF (Annex XIV Part B, MDCG 2020-7) requirements proportionate to the device
class. PSUR structure follows MDCG 2022-21 for Class IIa/IIb/III. PMCF evaluation report per MDCG 2020-8.
PMCF survey/questionnaire methods per MDCG 2020-7 Section E.2.
Class IIa/IIb/III require stricter, more frequent surveillance (PSUR vs PMS report). Note
when PMCF is expected and what would justify a PMCF waiver.`,
  buildUser: (input) =>
    [
      describeProduct(input),
      "",
      "Propose PMS and PMCF plan elements proportionate to the device class.",
      jsonOutputReminder(
        '{ "pms": { "activities": string[], "reportType": string, "frequency": string }, "pmcf": { "needed": boolean, "methods": string[], "justification": string } }',
      ),
    ].join("\n"),
};
