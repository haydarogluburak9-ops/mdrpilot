import { DEVICE_CLASS_LABEL } from "./constants";
import { sterilizationText } from "./sterilization";
import type { Product } from "./types";

// Maps a product to the AI prompt input shape. Shared by all module pages.
export function productAiInput(p: Product) {
  return {
    name: p.name,
    deviceClass: DEVICE_CLASS_LABEL[p.deviceClass],
    intendedPurpose: p.intendedPurpose,
    isSterile: p.isSterile,
    sterilization: sterilizationText({ isSterile: p.isSterile, sterilization: p.sterilization, variants: p.variants }) || p.sterilization,
    containsSoftware: p.containsSoftware,
    isInvasive: p.isInvasive,
    hasMeasuringFn: p.hasMeasuringFn,
    materials: p.materials,
    indications: p.indications,
    contraindications: p.contraindications,
    bodyContactDuration: p.bodyContactDuration,
  };
}

/** Product context for ISO 14971 risk audit prompts, including existing risk rows. */
export function riskAiInput(p: Product) {
  const base = productAiInput(p);
  const lines = p.riskItems.map((r) => {
    const harm = r.harm ? ` → ${r.harm}` : "";
    return `${r.hazard}${harm} (S${r.initialSeverity}×P${r.initialProbability})`;
  });
  const extra =
    lines.length > 0
      ? `Existing risk table (${p.riskItems.length} items):\n${lines.join("\n")}`
      : "Existing risk table: empty — no hazards recorded yet.";
  return { ...base, productId: p.id, extra };
}

/** Product + risk context for IFU prompts (MDR Annex I 23.4). */
export function ifuAiInput(p: Product) {
  const base = productAiInput(p);
  const riskLines = p.riskItems.map((r) => {
    const harm = r.harm ? ` → ${r.harm}` : "";
    const control = r.riskControlMeasure?.trim();
    return `${r.hazard}${harm}${control ? ` | control: ${control.slice(0, 100)}` : ""}`;
  });
  const extra = [
    p.userProfile?.trim() ? `Intended users: ${p.userProfile}` : "",
    p.patientPopulation?.trim() ? `Patient population: ${p.patientPopulation}` : "",
    p.shelfLife?.trim() ? `Shelf life: ${p.shelfLife}` : "",
    p.emdnCode?.trim() ? `EMDN: ${p.emdnCode}` : "",
    p.appliedStandards?.trim() ? `Applied standards: ${p.appliedStandards}` : "",
    p.isReusable !== undefined ? `Reusable: ${p.isReusable}` : "",
    p.packagingType?.trim() ? `Packaging: ${p.packagingType}` : "",
    riskLines.length > 0
      ? `Risk file — reflect HIGH/CRITICAL items in warnings:\n${riskLines.join("\n")}`
      : "Risk file: empty — use product-specific warnings.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { ...base, extra };
}

/** Product + risk file context for clinical evaluation (CER) prompts. */
export function cerAiInput(p: Product) {
  const base = productAiInput(p);
  const riskLines = p.riskItems.map((r) => {
    const no = r.riskNo?.trim() || "—";
    const situation = r.hazardousSituation ?? r.hazard;
    const harm = r.harm ? ` → ${r.harm}` : "";
    const br = r.benefitRiskJustification?.trim();
    return `${no}: ${situation}${harm}${br ? ` | benefit-risk: ${br.slice(0, 120)}` : ""}`;
  });
  const extra = [
    p.userProfile?.trim() ? `User profile: ${p.userProfile}` : "",
    riskLines.length > 0
      ? `Risk file (${p.riskItems.length} rows):\n${riskLines.join("\n")}`
      : "Risk file: empty — benefit-risk section should flag this gap.",
  ]
    .filter(Boolean)
    .join("\n\n");
  return { ...base, productId: p.id, extra };
}
