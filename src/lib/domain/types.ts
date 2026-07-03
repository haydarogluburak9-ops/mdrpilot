// Shared domain types used across UI and (mock) data layer.

import type { RiskAnnexARow } from "@/lib/domain/risk-annex-a";
import type { RiskPlanTableERow } from "@/lib/domain/risk-table-e";
import type { SectionExtras } from "@/lib/domain/pmcf-survey";

export type DocStatus = "MISSING" | "DRAFT" | "IN_REVIEW" | "APPROVED" | "REJECTED";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type RiskMitigationCategory = "DESIGN" | "PRODUCTION" | "POST_MARKET";

export interface RiskMitigationRow {
  category: RiskMitigationCategory;
  actions: string;
  residualSeverity: number;
  residualProbability: number;
}

export type DeviceClass =
  | "CLASS_I"
  | "CLASS_IS"
  | "CLASS_IM"
  | "CLASS_IR"
  | "CLASS_IIA"
  | "CLASS_IIB"
  | "CLASS_III";

export type SterilizationMethod = "NON_STERILE" | "EO" | "GAMMA" | "STEAM" | "OTHER";

export type GsprApplicability = "YES" | "NO" | "JUSTIFICATION";

export type CompanyRole =
  | "OWNER"
  | "QUALITY_MANAGER"
  | "REGULATORY_AFFAIRS"
  | "CONSULTANT"
  | "VIEWER";

export interface TechnicalSection {
  id: string;
  key: string;
  title: string;
  annexRef: string;
  status: DocStatus;
  applicable?: boolean;
  naReason?: string;
  ownerName?: string;
  updatedAt: string;
  content?: string;
  sectionExtras?: SectionExtras;
}

export interface GsprItem {
  id: string;
  gsprNo: string;
  requirementSummary: string;
  applicable: GsprApplicability;
  justification?: string;
  /** Raw DB value — used for evidence validation (display text may be edition-formatted). */
  evidenceDocumentRaw?: string;
  evidenceDocument?: string;
  evidenceManual?: boolean;
  standardReference?: string;
  complianceStatement?: string;
  status: DocStatus;
  aiGapComment?: string;
}

export interface RiskMitigationRow {
  category: RiskMitigationCategory;
  actions: string;
  residualSeverity: number;
  residualProbability: number;
}

export interface RiskItem {
  id: string;
  sequenceNo: number;
  riskNo?: string;
  hazard: string;
  sequenceOfEvents?: string;
  hazardousSituation?: string;
  harm?: string;
  riskSource?: string;
  initialSeverity: number;
  initialProbability: number;
  initialRiskLevel: RiskLevel;
  riskControlMeasure?: string;
  mitigations?: RiskMitigationRow[];
  residualSeverity: number;
  residualProbability: number;
  residualRiskLevel: RiskLevel;
  residualAssessment?: string;
  benefitRiskJustification?: string;
  verificationOfControl?: string;
  linkedReferences?: string;
  tableERef?: string;
}

export interface ProductModelVariant {
  name: string;
  sterilizations: SterilizationMethod[];
}

export interface ProductBrandVariant {
  brand: string;
  models: ProductModelVariant[];
}

export interface RiskManagementLinkedFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentLabel?: string;
  detectedSubtype?: "plan" | "report" | "policy";
}

export interface RiskManagementFile {
  id: string;
  plan?: string;
  report?: string;
  managementPolicy?: string;
  annexAQuestions?: string;
  annexARows?: RiskAnnexARow[];
  planTableE1Rows?: RiskPlanTableERow[];
  planTableE2Rows?: RiskPlanTableERow[];
  fmeaBenefitRiskAnalysis?: string;
  planFile?: RiskManagementLinkedFile;
  reportFile?: RiskManagementLinkedFile;
  policyFile?: RiskManagementLinkedFile;
  status: DocStatus;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  model?: string;
  variants?: ProductBrandVariant[];
  basicUdiDi?: string;
  udiDi?: string;
  emdnCode?: string;
  photoKey?: string;
  deviceClass: DeviceClass;
  intendedPurpose?: string;
  userProfile?: string;
  patientPopulation?: string;
  indications?: string;
  contraindications?: string;
  isSterile: boolean;
  sterilization: SterilizationMethod;
  hasMeasuringFn: boolean;
  containsSoftware: boolean;
  isInvasive: boolean;
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
  bodyContactDuration?: string;
  materials?: string;
  packagingType?: string;
  shelfLife?: string;
  manufacturingProcess?: string;
  criticalSuppliers?: string;
  appliedStandards?: string;
  complianceScore: number;
  updatedAt: string;
  technicalSections: TechnicalSection[];
  gsprItems: GsprItem[];
  riskItems: RiskItem[];
  riskManagementFile?: RiskManagementFile;
}

export interface AiResult<T = unknown> {
  summary: string;
  complianceStatus: "compliant" | "partial" | "non_compliant" | "unknown";
  missingItems: string[];
  risks: string[];
  recommendedDocuments: string[];
  regulatoryReferences: string[];
  confidence: number;
  disclaimer: string;
  data?: T;
}
