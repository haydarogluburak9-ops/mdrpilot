import type { DocumentComposerType } from "@prisma/client";
import { CHANGE_CONTROL_CLAUSE_REFS } from "@/lib/domain/constants";
import { editionOf } from "@/lib/domain/standards-catalog";

const ISO13485 = editionOf("ISO 13485");
const ISO14971 = editionOf("ISO 14971");

export interface ComposerTypeDef {
  value: DocumentComposerType;
  label: string;
  standard: string;
  /** Whether a product context is recommended for this document type. */
  productScoped: boolean;
}

export const COMPOSER_TYPES: ComposerTypeDef[] = [
  { value: "ISO13485_QUALITY_MANUAL", label: `${ISO13485} Quality Manual`, standard: ISO13485, productScoped: false },
  { value: "ISO13485_DOCUMENT_CONTROL_PROCEDURE", label: `${ISO13485} Document Control Procedure`, standard: ISO13485, productScoped: false },
  { value: "ISO13485_CAPA_PROCEDURE", label: `${ISO13485} CAPA Procedure`, standard: ISO13485, productScoped: false },
  { value: "ISO13485_INTERNAL_AUDIT_PROCEDURE", label: `${ISO13485} Internal Audit Procedure`, standard: ISO13485, productScoped: false },
  { value: "ISO13485_MANAGEMENT_REVIEW_PROCEDURE", label: `${ISO13485} Management Review Procedure`, standard: ISO13485, productScoped: false },
  { value: "ISO13485_RISK_MANAGEMENT_PROCEDURE", label: `${ISO13485} Risk Management Procedure`, standard: ISO13485, productScoped: false },
  { value: "MDR_TECHNICAL_FILE_NARRATIVE", label: "MDR Technical File Narrative", standard: "MDR 2017/745", productScoped: true },
  { value: "MDR_DECLARATION_OF_CONFORMITY_DRAFT", label: "MDR Declaration of Conformity Draft", standard: "MDR 2017/745", productScoped: true },
  { value: "MDR_GSPR_COMPLIANCE_STATEMENT", label: "MDR GSPR Compliance Statement", standard: "MDR Annex I", productScoped: true },
  { value: "ISO14971_RISK_MANAGEMENT_PLAN", label: `${ISO14971} Risk Management Plan`, standard: ISO14971, productScoped: true },
  { value: "ISO14971_RISK_MANAGEMENT_REPORT", label: `${ISO14971} Risk Management Report`, standard: ISO14971, productScoped: true },
  { value: "PMS_PLAN", label: "PMS Plan", standard: "MDR Art. 83-86", productScoped: true },
  { value: "PMCF_PLAN", label: "PMCF Plan", standard: "MDR Annex XIV B", productScoped: true },
  { value: "PMCF_EVALUATION_REPORT", label: "PMCF Evaluation Report", standard: "MDR Annex XIV B", productScoped: true },
  { value: "CLINICAL_EVALUATION_PLAN", label: "Clinical Evaluation Plan", standard: "MDR Annex XIV A", productScoped: true },
  { value: "CLINICAL_EVALUATION_REPORT_DRAFT", label: "Clinical Evaluation Report Draft", standard: "MDR Annex XIV A", productScoped: true },
  { value: "IFU_DRAFT", label: "IFU Draft", standard: "MDR Annex I 23", productScoped: true },
  { value: "LABELING_TEXT_DRAFT", label: "Labeling Text Draft", standard: `MDR Annex I 23 / ${editionOf("ISO 15223-1")}`, productScoped: true },
  { value: "SUPPLIER_EVALUATION_PROCEDURE", label: "Supplier Evaluation Procedure", standard: `${ISO13485} 7.4`, productScoped: false },
  { value: "STERILIZATION_CONTROL_PROCEDURE", label: "Sterilization Control Procedure", standard: `${ISO13485} 7.5.7 / ${editionOf("ISO 11135")}`, productScoped: false },
  { value: "COMPLAINT_HANDLING_PROCEDURE", label: "Complaint Handling Procedure", standard: `${ISO13485} 8.2.2`, productScoped: false },
  { value: "VIGILANCE_PROCEDURE", label: "Vigilance Procedure", standard: "MDR Art. 87-90", productScoped: false },
  { value: "CHANGE_CONTROL_PROCEDURE", label: "Change Control Procedure", standard: `${ISO13485} ${CHANGE_CONTROL_CLAUSE_REFS}`, productScoped: false },
  { value: "TRAINING_PROCEDURE", label: "Training Procedure", standard: `${ISO13485} 6.2`, productScoped: false },
];

export const COMPOSER_TYPE_LABEL = Object.fromEntries(
  COMPOSER_TYPES.map((t) => [t.value, t.label]),
) as Record<DocumentComposerType, string>;

export const COMPOSER_TYPE_STANDARD = Object.fromEntries(
  COMPOSER_TYPES.map((t) => [t.value, t.standard]),
) as Record<DocumentComposerType, string>;

export type ComposerLanguage = "tr" | "en";
