import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";
import { describeProduct, productInputSchema, type ProductInput } from "./input";

export const cerPrompt: PromptDefinition<ProductInput> = {
  id: "cer",
  inputSchema: productInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Draft a full Clinical Evaluation per MDR Annex XIV Part A and MEDDEV 2.7/1 Rev. 4.
Produce consultant-grade markdown for EACH section in data.cer (not bullet stubs).

Sections required in data.cer:
- plan: Clinical Evaluation Plan (CEP) — team, data sources, method, update cycle, proportionality to class
- stateOfTheArt: SOTA — clinical context, alternatives table, standards, unmet need
- equivalentDevices: equivalence claim position; if applicable, clinical/technical/biological pillar table
- literatureStrategy: PICO, databases, search strings, inclusion/exclusion, quality appraisal, PRISMA — include scientific DBs AND national registries (FDA MAUDE, FDA recalls, BfArM, MHRA, EUDAMED, TİTCK, Health Canada, TGA, PMDA, ANSM, AEMPS, Swissmedic)
- clinicalDataSummary: literature results table, manufacturer data, link to ISO 14971 risks, sufficiency
- benefitRiskConclusion: clinical benefit, residual risks, overall acceptable benefit-risk (aligned with risk file)
- pmsPmcfInputs: PMS activities, PSUR vs PMS report by class, PMCF need/waiver, CER update triggers
- report: executive CER summary referencing the above
- equivalenceEvidence: string[] — evidence still needed if equivalence claimed
- dataGaps: string[] — specific clinical data gaps and recommended closure (PMCF, study, literature)

Use the existing risk table and product context. Class IIa/IIb/III need stronger clinical data and PMCF.
Write Turkish section content when locale is tr; otherwise English.
Put gap items also in top-level missingItems.`,
  buildUser: (input) =>
    [
      describeProduct(input),
      "",
      "Draft all CER sections with substantive markdown. Integrate foreseeable risks from the risk file.",
      jsonOutputReminder(
        '{ "cer": { "plan": string, "stateOfTheArt": string, "equivalentDevices": string, "literatureStrategy": string, "clinicalDataSummary": string, "benefitRiskConclusion": string, "pmsPmcfInputs": string, "report": string, "equivalenceEvidence": string[], "dataGaps": string[] } }',
      ),
    ].join("\n"),
};
