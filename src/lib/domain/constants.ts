import type { DeviceClass, DocStatus, RiskLevel } from "./types";
import { editionOf } from "./standards-catalog";

export const DISCLAIMER =
  "This output is an AI-generated draft for documentation support only. It does not constitute regulatory approval or legal advice. Final assessment must be performed by a qualified person and, where applicable, your Notified Body.";

export const DISCLAIMER_TR =
  "Bu çıktı yalnızca dokümantasyon desteği için AI destekli bir taslaktır; regülatif onay veya hukuki tavsiye değildir. Nihai değerlendirme yetkili kişi ve uygulanabilir ise Onaylanmış Kuruluş tarafından yapılmalıdır.";

export function disclaimerForLocale(locale: string): string {
  return locale === "tr" ? DISCLAIMER_TR : DISCLAIMER;
}

// Professional, non-alarming trust notice shown on AI outputs across the product.
export const AI_DRAFT_NOTICE =
  "AI-generated draft. Requires review and approval by qualified regulatory/quality personnel.";

export const DEVICE_CLASS_LABEL: Record<DeviceClass, string> = {
  CLASS_I: "Class I",
  CLASS_IS: "Class Is (sterile)",
  CLASS_IM: "Class Im (measuring)",
  CLASS_IR: "Class Ir (reusable surgical)",
  CLASS_IIA: "Class IIa",
  CLASS_IIB: "Class IIb",
  CLASS_III: "Class III",
};

export const STATUS_LABEL: Record<DocStatus, string> = {
  MISSING: "Missing",
  DRAFT: "Draft",
  IN_REVIEW: "In Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

// MDR Annex II / III technical documentation structure.
// Full set of sections an MDR technical file (Annex II) plus PMS documentation
// (Annex III) is expected to contain. New products are scaffolded with all of
// these so the dossier mirrors a real Notified Body review checklist.
export const TECHNICAL_FILE_TEMPLATE: {
  key: string;
  title: string;
  annexRef: string;
}[] = [
  { key: "device-description", title: "Device Description and Specification", annexRef: "Annex II 1.1" },
  { key: "general-info", title: "Manufacturer Identification, UDI-DI / Basic UDI-DI and EUDAMED Registration", annexRef: "Annex II 1.1(a) / Art. 27-31" },
  { key: "previous-generations", title: "Reference to Previous and Similar Generations", annexRef: "Annex II 1.2" },
  { key: "info-supplied", title: "Information Supplied by the Manufacturer (Label and IFU)", annexRef: "Annex II 2 / Annex I 23" },
  { key: "design-manufacturing", title: "Design and Manufacturing Information", annexRef: "Annex II 3" },
  { key: "suppliers", title: "Suppliers, Critical Subcontractors and Manufacturing Sites", annexRef: `Annex II 3(b) / ${editionOf("ISO 13485")} 7.4` },
  { key: "standards-list", title: "List of Applied Harmonised Standards and Common Specifications", annexRef: "Annex II / Art. 8" },
  { key: "gspr", title: "General Safety and Performance Requirements (GSPR Checklist)", annexRef: "Annex II 4 / Annex I" },
  { key: "verification-validation", title: "Product Verification and Validation", annexRef: "Annex II 6.1" },
  { key: "biocompatibility", title: "Biocompatibility / Biological Evaluation", annexRef: `Annex II 6.1 / ${editionOf("ISO 10993-1")}` },
  { key: "sterilization", title: "Sterilization Validation", annexRef: `Annex II 6.1 / ${editionOf("ISO 11135")} / ${editionOf("ISO 11137")}` },
  { key: "reprocessing", title: "Reprocessing Validation (Cleaning, Disinfection, Re-sterilization)", annexRef: `Annex I 23.4(p) / ${editionOf("ISO 17664")}` },
  { key: "packaging", title: "Packaging Validation", annexRef: `Annex II 6.1 / ${editionOf("ISO 11607-1")}` },
  { key: "shelf-life", title: "Shelf Life / Stability", annexRef: "Annex II 6.1" },
  { key: "electrical-safety", title: "Electrical Safety and EMC", annexRef: `${editionOf("IEC 60601-1")} / ${editionOf("IEC 60601-1-2")} (if applicable)` },
  { key: "software-validation", title: "Software Verification and Validation", annexRef: `${editionOf("IEC 62304")} / ${editionOf("IEC 62366-1")} (if applicable)` },
  { key: "usability", title: "Usability / Human Factors Engineering", annexRef: `Annex I 5 / ${editionOf("IEC 62366-1")}` },
  { key: "sscp", title: "Summary of Safety and Clinical Performance (SSCP)", annexRef: "Art. 32 (Class III / implantable)" },
  { key: "implant-card", title: "Implant Card and Information Supplied to the Patient", annexRef: "Art. 18 / MDCG 2019-8 (implantable)" },
  { key: "doc", title: "Declaration of Conformity", annexRef: "Annex IV" },
];

/** Post-market docs — shown in PMS tab, not in TF checklist. */
export const POST_MARKET_SECTION_TEMPLATE: {
  key: string;
  title: string;
  annexRef: string;
}[] = [
  { key: "pms-plan", title: "PMS Plan", annexRef: "MDR Annex III · Art. 83–84" },
  { key: "pmcf-plan", title: "PMCF Plan", annexRef: "MDR Annex XIV B · MDCG 2020-7" },
  { key: "pmcf-report", title: "PMCF Evaluation Report", annexRef: "MDR Annex XIV B · MDCG 2020-8" },
  { key: "psur-report", title: "PSUR / PMS Report", annexRef: "MDR Art. 85–86 · MDCG 2022-21" },
];

export const POST_MARKET_SECTION_KEYS = POST_MARKET_SECTION_TEMPLATE.map((s) => s.key);

const TECHNICAL_FILE_KEY_SET = new Set(TECHNICAL_FILE_TEMPLATE.map((s) => s.key));

/** Keys hidden from TF table (managed in product tabs or obsolete). */
export const REMOVED_TECHNICAL_FILE_KEYS = [
  "benefit-risk",
  "risk-management",
  "clinical-evaluation",
  "clinical-investigation",
  "psur",
  "psur-pms-report",
] as const;

export function isTechnicalFileSectionKey(key: string): boolean {
  return TECHNICAL_FILE_KEY_SET.has(key);
}

// Full MDR Annex I — General Safety and Performance Requirements.
// Chapter I (general, 1-9), Chapter II (design & manufacture, 10-22) and
// Chapter III (information supplied, 23). Sub-clauses are paraphrased summaries.
export { GSPR_TEMPLATE, GSPR_TEMPLATE_COUNT } from "./gspr-template";

// ISO 13485:2016 documented procedures for the KYS register.
// Kalite El Kitabı (QM-01) is managed only via the Quality Manual Wizard — not listed here.
export const QMS_REGISTER_EXCLUDED_CODES = ["QM-01"] as const;

/** ISO 13485 + MDR Art. 120 / MDCG 2020-3 references for change control. */
export const CHANGE_CONTROL_CLAUSE_REFS = "4.1.4 / 7.3.9 / MDR Art. 120 / MDCG 2020-3";

export function canonicalQmsClauseRefs(code: string | null | undefined, stored?: string | null): string | undefined {
  if (code) {
    const doc = ISO13485_DOCS.find((d) => d.code === code);
    if (doc) return doc.clauseRefs;
  }
  return stored ?? undefined;
}

export const ISO13485_DOCS: { code: string; title: string; clauseRefs: string }[] = [
  { code: "SOP-MDF", title: "Medical Device File Procedure", clauseRefs: "4.2.3" },
  { code: "SOP-DC", title: "Control of Documents Procedure", clauseRefs: "4.2.4" },
  { code: "SOP-RC", title: "Control of Records Procedure", clauseRefs: "4.2.5" },
  { code: "SOP-MR", title: "Management Review Procedure", clauseRefs: "5.6" },
  { code: "SOP-ORG", title: "Organization, Roles and Responsibilities Procedure", clauseRefs: "5.5" },
  { code: "SOP-HR", title: "Competence, Training and Awareness Procedure", clauseRefs: "6.2" },
  { code: "SOP-INF", title: "Infrastructure and Maintenance Procedure", clauseRefs: "6.3" },
  { code: "SOP-ENV", title: "Work Environment and Contamination Control Procedure", clauseRefs: "6.4" },
  { code: "SOP-RM", title: "Risk Management Procedure", clauseRefs: `7.1 / ${editionOf("ISO 14971")}` },
  { code: "SOP-CRP", title: "Customer-Related Processes / Requirements Review Procedure", clauseRefs: "7.2" },
  { code: "SOP-DD", title: "Design and Development Procedure", clauseRefs: "7.3" },
  { code: "SOP-PU", title: "Purchasing Procedure", clauseRefs: "7.4" },
  { code: "SOP-SE", title: "Supplier Evaluation and Control Procedure", clauseRefs: "7.4.1" },
  { code: "SOP-PC", title: "Production and Service Provision Procedure", clauseRefs: "7.5.1" },
  { code: "SOP-CLN", title: "Cleanliness of Product Procedure", clauseRefs: "7.5.2" },
  { code: "SOP-INST", title: "Installation Activities Procedure", clauseRefs: "7.5.3" },
  { code: "SOP-SRV", title: "Servicing Procedure", clauseRefs: "7.5.4" },
  { code: "SOP-PV", title: "Process Validation Procedure", clauseRefs: "7.5.6" },
  { code: "SOP-ST", title: "Sterilization and Sterile Barrier Validation Procedure", clauseRefs: "7.5.7" },
  { code: "SOP-ID", title: "Identification Procedure", clauseRefs: "7.5.8" },
  { code: "SOP-TR", title: "Traceability Procedure", clauseRefs: "7.5.9" },
  { code: "SOP-PP", title: "Preservation of Product Procedure", clauseRefs: "7.5.11" },
  { code: "SOP-ME", title: "Control of Monitoring and Measuring Equipment Procedure", clauseRefs: "7.6" },
  { code: "SOP-FB", title: "Feedback and Post-Market Surveillance Procedure", clauseRefs: "8.2.1" },
  { code: "SOP-CH", title: "Complaint Handling Procedure", clauseRefs: "8.2.2" },
  { code: "SOP-VG", title: "Regulatory Reporting / Vigilance Procedure", clauseRefs: "8.2.3 / MDR Art. 87-90" },
  { code: "SOP-IA", title: "Internal Audit Procedure", clauseRefs: "8.2.4" },
  { code: "SOP-MON", title: "Monitoring and Measurement of Processes and Product Procedure", clauseRefs: "8.2.5 / 8.2.6" },
  { code: "SOP-NCP", title: "Control of Nonconforming Product Procedure", clauseRefs: "8.3" },
  { code: "SOP-AN", title: "Advisory Notices and Field Safety Corrective Action Procedure", clauseRefs: "8.3.3 / MDR Art. 95" },
  { code: "SOP-DA", title: "Analysis of Data Procedure", clauseRefs: "8.4" },
  { code: "SOP-CAPA", title: "Corrective and Preventive Action (CAPA) Procedure", clauseRefs: "8.5.2 / 8.5.3" },
  { code: "SOP-CC", title: "Change Control Procedure", clauseRefs: CHANGE_CONTROL_CLAUSE_REFS },
];

// ISO 9001 module sections
export const ISO9001_SECTIONS: { code: string; title: string; clauseRefs: string }[] = [
  { code: "9001-4.1", title: "Context of the Organization", clauseRefs: "4.1" },
  { code: "9001-4.2", title: "Interested Parties", clauseRefs: "4.2" },
  { code: "9001-5.2", title: "Quality Policy", clauseRefs: "5.2" },
  { code: "9001-6.2", title: "Quality Objectives", clauseRefs: "6.2" },
  { code: "9001-4.4", title: "Process Map", clauseRefs: "4.4" },
  { code: "9001-6.1", title: "Risk and Opportunity Register", clauseRefs: "6.1" },
  { code: "9001-9.2", title: "Internal Audit", clauseRefs: "9.2" },
  { code: "9001-9.3", title: "Management Review", clauseRefs: "9.3" },
  { code: "9001-10.2", title: "Corrective Actions", clauseRefs: "10.2" },
  { code: "9001-9.1.2", title: "Customer Satisfaction", clauseRefs: "9.1.2" },
];

export function riskLevelFromScore(severity: number, probability: number): RiskLevel {
  const score = severity * probability;
  if (score >= 15) return "CRITICAL";
  if (score >= 9) return "HIGH";
  if (score >= 4) return "MEDIUM";
  return "LOW";
}
