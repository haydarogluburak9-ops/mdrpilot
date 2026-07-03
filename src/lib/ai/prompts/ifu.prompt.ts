import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";
import { describeProduct, productInputSchema, type ProductInput } from "./input";

export const ifuPrompt: PromptDefinition<ProductInput> = {
  id: "ifu",
  inputSchema: productInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Draft Instructions for Use (IFU) content per MDR Annex I Chapter III (23.4) and check that
warnings present in the risk file are reflected in the IFU. Highlight any safety information that
must appear on label/IFU.`,
  buildUser: (input) =>
    [
      describeProduct(input),
      "",
      "Draft IFU sections and flag IFU/risk alignment gaps.",
      "When drafting IFU content, write complete, product-specific Turkish regulatory text suitable for a Word IFU document.",
      jsonOutputReminder(
        '{ "ifu": { "intendedPurpose": string, "indications": string, "contraindications": string, "warnings": string[], "precautions": string[], "instructions": string, "storage": string, "sterilityInfo": string, "disposal": string }, "labelCaution": string }',
      ),
    ].join("\n"),
};
