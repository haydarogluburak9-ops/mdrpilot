// Client-safe configuration for the Quality Manual Wizard.
// Used by both the UI (form rendering) and the server (gap-check / generate).

export type WizardFieldType = "text" | "textarea" | "boolean";

export interface WizardField {
  key: string;
  label: string;
  type: WizardFieldType;
  placeholder?: string;
  /** Critical fields drive gap-check severity. */
  critical?: boolean;
  help?: string;
}

export interface WizardStep {
  step: number;
  key: string;
  title: string;
  description: string;
  /** Data-entry steps have fields; review/generate steps are UI-only. */
  fields: WizardField[];
  /** Marks the read-only review and generate steps. */
  kind?: "form" | "review" | "generate";
}

export const QM_STEPS: WizardStep[] = [
  {
    step: 1, key: "companyProfile", title: "Company Profile",
    description: "Legal identity, sites and the scope of certification.",
    fields: [
      { key: "companyLegalName", label: "Legal company name", type: "text", critical: true },
      { key: "tradeName", label: "Trade name", type: "text" },
      { key: "companyHistory", label: "Company history", type: "textarea", help: "Brief company background for manual section 1.1." },
      { key: "manualPreface", label: "Manual preface / management commitment", type: "textarea", help: "Signed preface text for section 1.2." },
      { key: "qualityPolicyText", label: "Quality policy (full text)", type: "textarea", critical: true, help: "Complete quality policy statement for section 2.1." },
      { key: "contactPerson", label: "QMS contact person", type: "text" },
      { key: "contactEmail", label: "QMS contact e-mail", type: "text" },
      { key: "contactPhone", label: "QMS contact phone", type: "text" },
      { key: "mdrConformityRoute", label: "MDR conformity assessment route", type: "textarea", help: "e.g. Annex IX QMS + technical documentation." },
      { key: "address", label: "Registered address", type: "textarea" },
      { key: "sites", label: "Sites / locations (one per line)", type: "textarea" },
      { key: "scopeStatement", label: "Scope statement", type: "textarea", critical: true, help: "The activities the QMS certificate will cover." },
      { key: "productGroups", label: "Product groups", type: "textarea" },
      { key: "outsourcedProcesses", label: "Outsourced processes", type: "textarea" },
      { key: "regulatoryMarkets", label: "Regulatory markets", type: "text", help: "e.g. EU, UK, US, Türkiye" },
      { key: "applicableStandards", label: "Applicable standards", type: "text", help: "e.g. ISO 9001, ISO 13485" },
      { key: "exclusionsAndJustifications", label: "Exclusions & justifications", type: "textarea" },
    ],
  },
  {
    step: 2, key: "qmsScope", title: "QMS Scope",
    description: "What the QMS includes and which lifecycle activities apply.",
    fields: [
      { key: "qmsScope", label: "QMS scope", type: "textarea", critical: true },
      { key: "medicalDeviceFileScope", label: "Medical Device File scope", type: "textarea" },
      { key: "designAndDevelopmentIncluded", label: "Design & development included?", type: "boolean", critical: true },
      { key: "sterileProductsIncluded", label: "Sterile products included?", type: "boolean", critical: true },
      { key: "softwareIncluded", label: "Software included?", type: "boolean" },
      { key: "installationServicingIncluded", label: "Installation / servicing included?", type: "boolean" },
      { key: "distributionOnly", label: "Distribution only?", type: "boolean" },
      { key: "criticalProcesses", label: "Critical processes", type: "textarea" },
    ],
  },
  {
    step: 3, key: "organization", title: "Organization & Responsibilities",
    description: "Assign role holders here. Structure, chart and responsibilities are taken from SOP-ORG in KYS when available.",
    fields: [
      { key: "generalManager", label: "General manager", type: "text", critical: true },
      { key: "organizationStructureText", label: "Organization structure", type: "textarea" },
      { key: "managementRepresentative", label: "Management representative", type: "text", critical: true },
      { key: "qualityManager", label: "Quality manager", type: "text", critical: true },
      { key: "regulatoryResponsible", label: "Regulatory responsible (PRRC)", type: "text" },
      { key: "productionResponsible", label: "Production responsible", type: "text" },
      { key: "purchasingResponsible", label: "Purchasing responsible", type: "text" },
      { key: "complaintHandlingResponsible", label: "Complaint handling responsible", type: "text" },
      { key: "internalAuditResponsible", label: "Internal audit responsible", type: "text" },
      { key: "managementReviewOwner", label: "Management review owner", type: "text" },
    ],
  },
  {
    step: 4, key: "processMap", title: "Process Map",
    description: "Core, support and management processes and their interactions.",
    fields: [
      { key: "coreProcesses", label: "Core processes", type: "textarea", critical: true },
      { key: "supportProcesses", label: "Support processes", type: "textarea" },
      { key: "managementProcesses", label: "Management processes", type: "textarea" },
      { key: "processInteractions", label: "Process interactions", type: "textarea" },
      { key: "keyProcessKPIs", label: "Key process KPIs", type: "textarea" },
    ],
  },
  {
    step: 5, key: "procedures", title: "Documented Procedures",
    description: "Reference the procedure codes that implement each requirement. Existing QMS documents are shown for reference.",
    fields: [
      { key: "documentControlProcedureCode", label: "Document control procedure", type: "text", critical: true },
      { key: "recordControlProcedureCode", label: "Record control procedure", type: "text", critical: true },
      { key: "riskManagementProcedureCode", label: "Risk management procedure", type: "text" },
      { key: "capaProcedureCode", label: "CAPA procedure", type: "text", critical: true },
      { key: "complaintProcedureCode", label: "Complaint handling procedure", type: "text", critical: true },
      { key: "internalAuditProcedureCode", label: "Internal audit procedure", type: "text", critical: true },
      { key: "managementReviewProcedureCode", label: "Management review procedure", type: "text", critical: true },
      { key: "organizationProcedureCode", label: "Organization & roles procedure", type: "text", critical: true },
      { key: "supplierProcedureCode", label: "Supplier evaluation procedure", type: "text" },
      { key: "productionProcedureCode", label: "Production control procedure", type: "text" },
      { key: "sterilizationProcedureCode", label: "Sterilization control procedure", type: "text" },
      { key: "trainingProcedureCode", label: "Training procedure", type: "text" },
      { key: "vigilanceProcedureCode", label: "Vigilance procedure", type: "text" },
      { key: "changeControlProcedureCode", label: "Change control procedure", type: "text" },
    ],
  },
  {
    step: 6, key: "riskCompliance", title: "Risk & Compliance",
    description: "Quality and regulatory risks and the applicable framework.",
    fields: [
      { key: "qualityRisks", label: "Quality risks", type: "textarea" },
      { key: "regulatoryRisks", label: "Regulatory risks", type: "textarea" },
      { key: "supplierRisks", label: "Supplier risks", type: "textarea" },
      { key: "productionRisks", label: "Production risks", type: "textarea" },
      { key: "postMarketRisks", label: "Post-market risks", type: "textarea" },
      { key: "riskManagementStandard", label: "Risk management standard", type: "text", help: "e.g. ISO 14971 or internal" },
      { key: "applicableRegulations", label: "Applicable regulations", type: "text", help: "e.g. MDR, IVDR, FDA, local" },
    ],
  },
  {
    step: 7, key: "productionContext", title: "Product & Production Context",
    description: "Manufacturing, sterilization, traceability and validation context.",
    fields: [
      { key: "productFamilies", label: "Product families", type: "textarea" },
      { key: "manufacturingMethods", label: "Manufacturing methods", type: "textarea" },
      { key: "cleanroomUsed", label: "Cleanroom used?", type: "boolean" },
      { key: "sterilizationMethod", label: "Sterilization method", type: "text", help: "e.g. EO, gamma, steam, none" },
      { key: "traceabilityMethod", label: "Traceability method", type: "textarea" },
      { key: "packagingValidation", label: "Packaging validation", type: "textarea" },
      { key: "shelfLifeValidation", label: "Shelf life validation", type: "textarea" },
      { key: "testAndInspectionActivities", label: "Test & inspection activities", type: "textarea" },
      { key: "nonconformingProductControl", label: "Nonconforming product control", type: "textarea" },
    ],
  },
  {
    step: 8, key: "customerPms", title: "Customer / PMS / Complaint / CAPA",
    description: "Feedback, surveillance and corrective action methods.",
    fields: [
      { key: "customerFeedbackMethod", label: "Customer feedback method", type: "textarea" },
      { key: "complaintHandlingMethod", label: "Complaint handling method", type: "textarea", critical: true },
      { key: "vigilanceReportingMethod", label: "Vigilance reporting method", type: "textarea" },
      { key: "pmsMethod", label: "PMS method", type: "textarea", critical: true },
      { key: "capaMethod", label: "CAPA method", type: "textarea", critical: true },
      { key: "recallMethod", label: "Recall / FSCA method", type: "textarea" },
      { key: "trendAnalysisMethod", label: "Trend analysis method", type: "textarea" },
    ],
  },
  {
    step: 9, key: "review", title: "Review & Gap Check", kind: "review",
    description: "Run a consultant-style gap check before generating the manual.",
    fields: [],
  },
  {
    step: 10, key: "generate", title: "Generate", kind: "generate",
    description: "Generate the Quality Manual draft via AI Composer.",
    fields: [],
  },
];

export const QM_TOTAL_STEPS = QM_STEPS.length;
export const QM_FORM_STEPS = QM_STEPS.filter((s) => (s.kind ?? "form") === "form");

/** All field keys, used by gap-check / serialization. */
export const QM_FIELD_KEYS = QM_FORM_STEPS.flatMap((s) => s.fields.map((f) => f.key));

export const QM_CRITICAL_FIELDS = QM_FORM_STEPS.flatMap((s) =>
  s.fields.filter((f) => f.critical).map((f) => ({ key: f.key, label: f.label, step: s.step })),
);

export function qmFieldLabel(key: string): string {
  for (const s of QM_STEPS) {
    const f = s.fields.find((x) => x.key === key);
    if (f) return f.label;
  }
  return key;
}

export type StandardMode = "ISO_9001" | "ISO_13485" | "BOTH";

export const STANDARD_MODE_LABEL: Record<StandardMode, string> = {
  ISO_9001: "ISO 9001",
  ISO_13485: "ISO 13485",
  BOTH: "ISO 9001 + ISO 13485",
};

export function isBooleanTrue(v: unknown): boolean {
  return v === true || v === "true" || v === "yes" || v === "YES";
}
