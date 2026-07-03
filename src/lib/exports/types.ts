import type { ExportFormat, ExportType } from "@prisma/client";
import type { ExportLanguage } from "./i18n";
import type { CompanyLogo } from "./logo";
import type { IfuContentOverride } from "./ifu-content";

export type ExportTypeKey = ExportType;

export interface ExportOptions {
  /** Selected model IDs (brand::model) for per-model label PDF export. */
  modelRefs?: string[];
  /** AI-enriched IFU section overrides merged into the document. */
  ifuContent?: IfuContentOverride;
  /** Optional caution line on generated labels (e.g. from AI). */
  labelCaution?: string;
}

export interface ExportDef {
  type: ExportType;
  format: ExportFormat;
  label: string;
  /** Whether a productId is required for this export. */
  requiresProduct: boolean;
}

export const EXPORT_DEFS: Record<ExportType, ExportDef> = {
  TECHNICAL_FILE_DOCX: { type: "TECHNICAL_FILE_DOCX", format: "WORD", label: "MDR Technical File (DOCX)", requiresProduct: true },
  FULL_MDR_TECHNICAL_FILE_ZIP: { type: "FULL_MDR_TECHNICAL_FILE_ZIP", format: "ZIP", label: "Full MDR Technical File (ZIP)", requiresProduct: true },
  GSPR_XLSX: { type: "GSPR_XLSX", format: "EXCEL", label: "GSPR Checklist (XLSX)", requiresProduct: true },
  RISK_XLSX: { type: "RISK_XLSX", format: "EXCEL", label: "ISO 14971 Risk File (XLSX)", requiresProduct: true },
  IFU_DOCX: { type: "IFU_DOCX", format: "WORD", label: "IFU (DOCX)", requiresProduct: true },
  LABEL_PDF: { type: "LABEL_PDF", format: "PDF", label: "Label (PDF)", requiresProduct: true },
  PMS_PMCF_DOCX: { type: "PMS_PMCF_DOCX", format: "WORD", label: "PMS / PMCF (DOCX)", requiresProduct: true },
  QMS_PACKAGE_ZIP: { type: "QMS_PACKAGE_ZIP", format: "ZIP", label: "ISO 13485 QMS Package (ZIP)", requiresProduct: false },
  AUDIT_READINESS_PDF: { type: "AUDIT_READINESS_PDF", format: "PDF", label: "Audit Readiness Report (PDF)", requiresProduct: true },
  PRODUCT_DOSSIER_ZIP: { type: "PRODUCT_DOSSIER_ZIP", format: "ZIP", label: "Product Dossier (ZIP)", requiresProduct: true },
  COMPOSER_DOCUMENT_DOCX: { type: "COMPOSER_DOCUMENT_DOCX", format: "WORD", label: "AI Composer Document (DOCX)", requiresProduct: false },
  COMPOSER_DOCUMENT_PDF: { type: "COMPOSER_DOCUMENT_PDF", format: "PDF", label: "AI Composer Document (PDF)", requiresProduct: false },
  DEMO_EXECUTIVE_REPORT_PDF: { type: "DEMO_EXECUTIVE_REPORT_PDF", format: "PDF", label: "Executive Report (PDF)", requiresProduct: false },
  AUDIT_SIM_REPORT_PDF: { type: "AUDIT_SIM_REPORT_PDF", format: "PDF", label: "Audit Report (PDF)", requiresProduct: false },
  AUDIT_SIM_REPORT_DOCX: { type: "AUDIT_SIM_REPORT_DOCX", format: "WORD", label: "Audit Report (DOCX)", requiresProduct: false },
  AUDIT_SIM_FINDINGS_XLSX: { type: "AUDIT_SIM_FINDINGS_XLSX", format: "EXCEL", label: "Audit Findings (XLSX)", requiresProduct: false },
  AUDIT_SIM_CAPA_XLSX: { type: "AUDIT_SIM_CAPA_XLSX", format: "EXCEL", label: "CAPA Plan (XLSX)", requiresProduct: false },
  DHF_DOCX: { type: "DHF_DOCX", format: "WORD", label: "Design History File (DHF)", requiresProduct: true },
  DHF_PDF: { type: "DHF_PDF", format: "PDF", label: "Design History File (DHF)", requiresProduct: true },
};

export const EXPORT_TYPES = Object.keys(EXPORT_DEFS) as ExportType[];

export const FORMAT_EXT: Record<ExportFormat, string> = {
  WORD: "docx",
  EXCEL: "xlsx",
  PDF: "pdf",
  ZIP: "zip",
};

export const FORMAT_MIME: Record<ExportFormat, string> = {
  WORD: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  EXCEL: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  PDF: "application/pdf",
  ZIP: "application/zip",
};

export interface EvidenceRef {
  fileName: string;
  documentKind: string;
}

export interface LinkedEvidence {
  fileName: string;
  originalName: string | null;
  documentKind: string;
  target: "GSPR" | "TECHNICAL_FILE" | "RISK";
  targetLabel: string;
  analysisSummary: string | null;
  checksumSha256: string | null;
}

/** The data bundle passed to every generator. */
export interface ExportContext {
    company: {
      id: string;
      name: string;
      legalName: string | null;
      address: string | null;
      country: string | null;
      contactEmail: string | null;
      contactPhone: string | null;
      srnNumber: string | null;
      notifiedBody: string | null;
      notifiedBodyNumber: string | null;
      logo?: CompanyLogo | null;
    };
  product?: ProductExportData | null;
  qmsDocs: { code: string | null; title: string; standard: string; clauseRefs: string | null; status: string; version: string }[];
  capas: { title: string; status: string; dueDate: string | null }[];
  linkedEvidence: LinkedEvidence[];
  generatedAt: Date;
  generatedBy: string;
  /** Output language for this export (mode B — one language per file). */
  language: ExportLanguage;
  /** Per-export options (model filter, AI content, etc.). */
  exportOptions?: ExportOptions;
}

export interface ProductExportData {
  id: string;
  name: string;
  brand: string | null;
  model: string | null;
  variantsJson?: unknown;
  deviceClass: string;
  basicUdiDi: string | null;
  udiDi: string | null;
  intendedPurpose: string | null;
  indications: string | null;
  contraindications: string | null;
  isSterile: boolean;
  isReusable: boolean;
  sterilization: string;
  isInvasive: boolean;
  hasMeasuringFn: boolean;
  containsSoftware: boolean;
  materials: string | null;
  packagingType: string | null;
  shelfLife: string | null;
  complianceScore: number;
  technicalSections: { key: string; title: string; annexRef: string | null; status: string; ownerName: string | null; evidenceFiles: EvidenceRef[] }[];
  gsprItems: {
    gsprNo: string; requirementSummary: string; applicable: string; justification: string | null;
    evidenceDocument: string | null; standardReference: string | null; complianceStatement: string | null;
    status: string; aiGapComment: string | null; evidenceFiles: EvidenceRef[];
  }[];
    riskItems: {
    hazard: string; sequenceOfEvents: string | null; hazardousSituation: string | null; harm: string | null;
    initialSeverity: number; initialProbability: number; initialRiskLevel: string;
    riskControlMeasure: string | null; residualSeverity: number; residualProbability: number; residualRiskLevel: string;
    benefitRiskJustification: string | null; verificationOfControl: string | null; evidenceFiles: EvidenceRef[];
  }[];
  fmeaBenefitRiskAnalysis?: string | null;
}
