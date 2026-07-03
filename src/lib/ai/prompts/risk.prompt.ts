import type { PromptDefinition } from "../types";
import { REGULATORY_GUARDRAILS, jsonOutputReminder } from "./shared";
import { describeProduct, productInputSchema, type ProductInput } from "./input";

export const riskPrompt: PromptDefinition<ProductInput> = {
  id: "risk",
  inputSchema: productInputSchema,
  system: `${REGULATORY_GUARDRAILS}

Task: Audit ISO 14971 risk management for this device against the existing risk table (if provided).
- Identify coverage gaps, missing hazards, incomplete controls and documentation gaps.
- Propose additional foreseeable hazards using the company's risk table template (ISO 14971 style).
- Each proposed risk must include:
  • hazardousSituation (tehlikeli durum tanımı)
  • harm (riskin sebep olacağı durum / clinical harm)
  • riskSource (riskin kaynağı)
  • initial severity (1-5) and probability (1-5)
  • mitigations array with exactly three rows: DESIGN (Tasarım), PRODUCTION (Üretim), POST_MARKET (Satış Sonrası)
    — each with actions (detailed controls, standards, document refs) and residual severity/probability after that category
  • residualAssessment (artık risk değerlendirme paragraph)
  • benefitRiskJustification (risk/fayda analizi paragraph when residual risk remains)
- For EO-sterilized devices, consider sterility assurance, packaging integrity, EO/ECH residuals and biocompatibility.
- For software, consider cybersecurity and software failure modes (IEC 62304 / IEC 81001-5-1).
- For invasive devices, consider tissue damage, infection and misuse.
- Put structured proposals in data.risks (do not duplicate hazards already in the existing table).
- Write Turkish field content when locale is tr; otherwise English.`,
  buildUser: (input) =>
    [
      describeProduct(input),
      "",
      "Audit the risk file and propose missing hazards in the full template structure.",
      jsonOutputReminder(
        '{ "risks": [{ "hazardousSituation": string, "harm": string, "riskSource": string, "severity": number, "probability": number, "mitigations": [{ "category": "DESIGN"|"PRODUCTION"|"POST_MARKET", "actions": string, "residualSeverity": number, "residualProbability": number }], "residualAssessment": string, "benefitRiskJustification": string }] } — place inside top-level "data" as data.risks; keep risks[] as short "hazardousSituation → harm" strings.',
      ),
    ].join("\n"),
};
