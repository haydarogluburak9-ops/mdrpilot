import { sterilizationMethodsFromVariants, sterilizationText } from "./sterilization";

/**
 * Derives applicable EU legislation, MDCG guidance and harmonised standards for a
 * product from its characteristics — used in the standards-list technical-file
 * section, AI suggestions and product context prompts.
 */
const L = (locale: string, en: string, tr: string) => (locale === "tr" ? tr : en);

export interface ReferenceInput {
  deviceClass: string;
  isSterile?: boolean;
  sterilization?: string | null;
  variantsJson?: unknown;
  isInvasive?: boolean;
  containsSoftware?: boolean;
  hasMeasuringFn?: boolean;
  isImplantable?: boolean;
  isActive?: boolean;
  isReusable?: boolean;
  emitsRadiation?: boolean;
  administersMedicineOrEnergy?: boolean;
  containsMedicinalSubstance?: boolean;
  containsBiologicalMaterial?: boolean;
  isAbsorbable?: boolean;
  containsCmrOrEndocrine?: boolean;
  containsNanomaterial?: boolean;
  isForLayUser?: boolean;
  bodyContactDuration?: string | null;
  appliedStandards?: string | null;
}

export interface ApplicableReferences {
  legislation: string[];
  mdgc: string[];
  harmonisedStandards: string[];
}

function isHighClass(deviceClass: string): boolean {
  return deviceClass === "CLASS_IIA" || deviceClass === "CLASS_IIB" || deviceClass === "CLASS_III";
}

function needsSscp(input: ReferenceInput): boolean {
  return input.deviceClass === "CLASS_III" || !!input.isImplantable;
}

function hasBodyContact(input: ReferenceInput): boolean {
  if (input.isInvasive || input.isImplantable || input.isAbsorbable) return true;
  const d = (input.bodyContactDuration ?? "").toLowerCase();
  return d.includes("transient") || d.includes("short") || d.includes("long") || d.includes("kısa") || d.includes("uzun");
}

/** Core rule engine — returns code/title pairs (language-neutral codes). */
export function resolveApplicableReferences(input: ReferenceInput): ApplicableReferences {
  const legislation: string[] = [
    "Regulation (EU) 2017/745 (MDR) — general obligations",
    "MDR Article 8 — Conformity with GSPR (harmonised standards / common specifications)",
    "MDR Annex I — General Safety and Performance Requirements (GSPR)",
    "MDR Annex II — Technical documentation",
    "MDR Annex III — Post-market surveillance technical documentation",
    "MDR Annex XIV — Clinical evaluation and post-market clinical follow-up (PMCF)",
    "MDR Annex IV — EU Declaration of Conformity",
  ];

  const mdgc: string[] = [
    "MDCG 2021-24 — Classification of medical devices (Annex VIII rules)",
    "MDCG 2018-1 — UDI assignment and Basic UDI-DI",
    "MDCG 2020-6 — Sufficient clinical evidence for legacy devices / clinical evaluation",
    "MDCG 2020-5 — Clinical evaluation — equivalence demonstration",
    "MDCG 2020-3 — Significant changes under transitional provisions (design / intended purpose)",
  ];

  legislation.push("MDR Article 120 — Transitional provisions and significant changes");

  const harmonisedStandards: string[] = [
    "EN ISO 13485:2016 — Quality management systems",
    "EN ISO 14971:2019 — Application of risk management to medical devices",
    "EN ISO 15223-1:2021 — Symbols for labels and IFU",
    "EN ISO 20417:2021 — Information supplied by the manufacturer",
  ];

  // UDI
  legislation.push("MDR Articles 27–31 — UDI system and EUDAMED registration");

  // Classification rationale
  legislation.push("MDR Annex VIII — Classification rules");

  // Conformity assessment route by class
  if (input.deviceClass === "CLASS_I") {
    legislation.push("MDR Article 52 — Conformity assessment (Class I, self-declaration)");
  } else {
    legislation.push("MDR Article 52 — Conformity assessment (Notified Body involvement)");
    legislation.push("MDR Annexes IX–XI — Conformity assessment procedures");
  }

  // PMS / PSUR
  legislation.push("MDR Article 83–84 — Post-market surveillance system and PMS plan");
  if (isHighClass(input.deviceClass)) {
    legislation.push("MDR Article 86 — Periodic Safety Update Report (PSUR)");
    mdgc.push("MDCG 2022-21 — PSUR content and format");
  } else {
    legislation.push("MDR Article 85 — Post-market surveillance report (Class I)");
  }

  mdgc.push("MDCG 2020-7 — PMCF Plan template");
  mdgc.push("MDCG 2020-8 — PMCF Evaluation Report template");

  // Clinical evaluation
  mdgc.push("MDCG 2020-1 — Clinical evaluation — CEP template");
  mdgc.push("MDCG 2020-13 — Clinical evaluation assessment report template");

  // Body contact / biocompatibility
  if (hasBodyContact(input)) {
    harmonisedStandards.push("EN ISO 10993-1:2018 — Biological evaluation of medical devices");
    legislation.push("MDR Annex I GSPR 10.1 — Chemical, physical and biological properties");
  }

  // Sterility
  if (input.isSterile) {
    legislation.push("MDR Annex I GSPR 11.2 — Devices in a sterile state");
    harmonisedStandards.push("EN ISO 11607-1:2019 — Packaging for terminally sterilized devices");
    harmonisedStandards.push("EN ISO 11607-2:2019 — Validation of forming, sealing and assembly");
    const methods = sterilizationMethodsFromVariants(input.variantsJson);
    const ster = methods.length ? methods : input.sterilization ? [input.sterilization] : [];
    if (ster.includes("EO")) harmonisedStandards.push("EN ISO 11135:2014 — Sterilization of health-care products (ethylene oxide)");
    if (ster.includes("GAMMA") || ster.includes("STEAM")) {
      harmonisedStandards.push("EN ISO 11137-1:2006 — Sterilization of health-care products (radiation)");
    }
    if (!ster.length || ster.includes("OTHER")) {
      harmonisedStandards.push("EN ISO 11135:2014 / EN ISO 11137-1:2006 — Sterilization validation (method to be confirmed)");
    }
  }

  // Software / cybersecurity
  if (input.containsSoftware) {
    legislation.push("MDR Annex I GSPR 17.1–17.4 — Software / IT security requirements");
    harmonisedStandards.push("EN IEC 62304:2006+A1:2015 — Medical device software life cycle");
    harmonisedStandards.push("EN IEC 62366-1:2015+A1:2020 — Usability engineering");
    mdgc.push("MDCG 2019-11 — Qualification and classification of software (MDSW)");
    mdgc.push("MDCG 2019-16 — Cybersecurity for medical devices");
  } else {
    harmonisedStandards.push("EN IEC 62366-1:2015+A1:2020 — Usability engineering (use-error risk)");
  }

  // Measuring function
  if (input.hasMeasuringFn) {
    legislation.push("MDR Annex I GSPR 15.1–15.2 — Accuracy and measuring function");
  }

  // Active / electrical
  if (input.isActive) {
    legislation.push("MDR Annex I GSPR 18.1–18.8 — Active devices and energy hazards");
    harmonisedStandards.push("EN IEC 60601-1:2006+A1:2012+A2:2020 — Medical electrical equipment — basic safety");
    harmonisedStandards.push("EN IEC 60601-1-2:2015 — Electromagnetic compatibility (EMC)");
  }

  // Radiation
  if (input.emitsRadiation) {
    legislation.push("MDR Annex I GSPR 16.1–16.2 — Devices emitting radiation");
  }

  // Medicinal / biological / absorbable
  if (input.containsMedicinalSubstance) legislation.push("MDR Annex I GSPR 12.1 — Devices incorporating a medicinal substance");
  if (input.containsBiologicalMaterial) legislation.push("MDR Annex I GSPR 13.1 — Materials of biological origin");
  if (input.isAbsorbable) legislation.push("MDR Annex I GSPR 12.2 — Absorbable / dispersed devices");
  if (input.containsCmrOrEndocrine) legislation.push("MDR Annex I GSPR 10.4 — CMR / endocrine-disrupting substances");
  if (input.containsNanomaterial) {
    legislation.push("MDR Annex I GSPR 10.6 — Nanomaterials");
    mdgc.push("MDCG 2022-5 — Borderline and classification of medical devices incorporating nanomaterials");
  }

  // Lay user
  if (input.isForLayUser) legislation.push("MDR Annex I GSPR 22.1–22.3 — Devices intended for lay persons");

  // Reusable / reprocessing
  if (input.isReusable) {
    harmonisedStandards.push("EN ISO 17664-1:2021 — Reprocessing of reusable medical devices");
    legislation.push("MDR Annex I GSPR 23.4(p) — Reprocessing instructions for reusable devices");
  }

  // Implantable / Class III
  if (needsSscp(input)) {
    legislation.push("MDR Article 32 — Summary of Safety and Clinical Performance (SSCP)");
    mdgc.push("MDCG 2019-9 — SSCP content and format");
    legislation.push("MDR Annex XV — Clinical investigation (where applicable)");
    harmonisedStandards.push("EN ISO 14155:2020 — Clinical investigation of medical devices (GCP)");
  }
  if (input.isImplantable) {
    legislation.push("MDR Article 18 — Implant card and information to the patient");
    mdgc.push("MDCG 2019-8 — Implant card guidance");
  }

  // User-confirmed additions from the product form (deduplicated)
  if (input.appliedStandards?.trim()) {
    for (const line of input.appliedStandards.split(/\n|;/).map((s) => s.trim()).filter(Boolean)) {
      const lower = line.toLowerCase();
      if (![...legislation, ...mdgc, ...harmonisedStandards].some((r) => r.toLowerCase().includes(lower.slice(0, 12)))) {
        harmonisedStandards.push(line);
      }
    }
  }

  return {
    legislation: [...new Set(legislation)],
    mdgc: [...new Set(mdgc)],
    harmonisedStandards: [...new Set(harmonisedStandards)],
  };
}

/** Localised bullet lines for the standards-list section subheadings. */
export function describeApplicableReferences(input: ReferenceInput, locale: string): ApplicableReferences {
  const refs = resolveApplicableReferences(input);
  const ster = sterilizationText(input);
  const note = (code: string) =>
    ster && code.includes("11135") ? ` (${L(locale, `sterilization: ${ster}`, `sterilizasyon: ${ster}`)})` : "";

  return {
    legislation: refs.legislation.map((r) => `- ${r}`),
    mdgc: refs.mdgc.map((r) => `- ${r}`),
    harmonisedStandards: refs.harmonisedStandards.map((r) => `- ${r}${note(r)}`),
  };
}

/** Flat text for the appliedStandards product field / AI suggest output. */
export function formatAppliedReferencesField(input: ReferenceInput, locale: string): string {
  const refs = resolveApplicableReferences(input);
  const h = (en: string, tr: string) => L(locale, en, tr);
  return [
    h("=== Applicable legislation ===", "=== Uygulanan mevzuat ==="),
    ...refs.legislation,
    "",
    h("=== Applicable MDCG guidance ===", "=== Uygulanan MDCG kılavuzları ==="),
    ...refs.mdgc,
    "",
    h("=== Harmonised / applied standards ===", "=== Uygulanan harmonize standartlar ==="),
    ...refs.harmonisedStandards,
  ].join("\n");
}
