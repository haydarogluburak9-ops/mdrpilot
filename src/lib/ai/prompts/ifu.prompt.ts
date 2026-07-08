import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";
import { describeProduct, productInputSchema, type ProductInput } from "./input";

const IFU_JSON_SCHEMA = `{
  "ifu": {
    "productDescription": string,
    "technicalSpecifications": string,
    "intendedPurpose": string,
    "intendedUsers": string,
    "patientPopulation": string,
    "clinicalBenefits": string,
    "indications": string,
    "contraindications": string,
    "warnings": string[],
    "precautions": string[],
    "instructions": string,
    "biocompatibility": string,
    "storage": string,
    "shelfLifeDetail": string,
    "sterilityInfo": string,
    "disposal": string,
    "wasteSeparation": string,
    "mdrAnnexIDeclaration": string,
    "incidentReporting": string,
    "troubleshooting": string[],
    "symbolsGlossary": string[],
    "regulatoryInfo": string,
    "revisionHistory": string
  },
  "labelCaution": string
}`;

export const ifuPrompt: PromptDefinition<ProductInput> = {
  id: "ifu",
  inputSchema: productInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Draft a complete Instructions for Use (IFU) per MDR Annex I Chapter III (23.4).
Include product description, technical specifications, biocompatibility, MDR Annex I declarations,
incident reporting, waste separation, troubleshooting, and ensure warnings from the risk file appear in IFU.
Write product-specific regulatory text — not generic placeholders where product data is available.`,
  buildUser: (input) =>
    [
      describeProduct(input),
      "",
      "Draft all IFU sections. Reflect risk-file hazards in warnings. Include:",
      "- Product description with composition/materials",
      "- Technical specifications and applied standards",
      "- Intended users, patient population, clinical benefits",
      "- Biocompatibility (ISO 10993) per body contact",
      "- Storage, shelf life, sterility, disposal and waste separation",
      "- MDR Annex I declarations (no drugs/blood/tissue, CMR/phthalates)",
      "- Incident reporting per MDR Art. 87",
      "- Troubleshooting bullets",
      "- Symbols glossary lines (ISO 15223-1 style: title, clause, note)",
      "- CE / regulatory status placeholder if NB unknown",
      jsonOutputReminder(IFU_JSON_SCHEMA),
    ].join("\n"),
};
