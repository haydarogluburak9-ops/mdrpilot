import "server-only";
import fs from "node:fs";
import path from "node:path";
import type { DocumentComposerType } from "@prisma/client";
import type {
  DeviceClass,
  GsprItem,
  Product,
  RiskItem,
  SterilizationMethod,
  TechnicalSection,
} from "@/lib/domain/types";
import type { ComplianceSnapshot } from "@/lib/compliance/snapshot";
import type { ComplianceStandardScope } from "@/lib/compliance/types";

// ---------------- Golden case schema ----------------

export interface GoldenSnapshotContext {
  qmsTitles: string[];
  qmsApproved: number;
  qmsTotal: number;
  uploadedFiles: number;
  analyzedFiles: number;
  capaTotal: number;
  capaOpen: number;
  capaOverdue: number;
  evidenceItemsTotal: number;
  evidenceItemsWithEvidence: number;
}

export interface GoldenAuditAnswer {
  standardCode: string;
  clauseNo: string;
  question: string;
  expectedEvidence: string | null;
  weight: number;
  answerText: string;
}

export interface GoldenExpectedFinding {
  severity: "MAJOR" | "MINOR" | "OBSERVATION";
  label: string; // matched against finding description/clause
}

export interface GoldenCase {
  id: string;
  title: string;
  /** Primary scope for the consultant benchmark. */
  standardScope: ComplianceStandardScope;
  product: Partial<Product> & {
    name: string;
    deviceClass: DeviceClass;
    technicalSections?: TechnicalSection[];
    gsprItems?: GsprItem[];
    riskItems?: RiskItem[];
  };
  snapshot: GoldenSnapshotContext;
  expected: {
    gaps: string[];
    clauses: string[];
    evidence: string[];
    recommendations: string[];
  };
  audit?: {
    standard: string;
    assessmentType: string;
    answers: GoldenAuditAnswer[];
    expectedFindings: GoldenExpectedFinding[];
    expectedCapa: string[];
  };
  composer?: {
    type: DocumentComposerType;
    requiredSections: string[];
  };
  fileAnalysis?: {
    fileName: string;
    documentKind: string;
    text: string;
    expectedKind: string;
    expectedStandards: string[];
  };
}

// ---------------- Loading ----------------

function goldenDir(): string {
  return path.join(process.cwd(), "evaluation", "golden-cases");
}

/** Loads all golden case JSON files from evaluation/golden-cases/. */
export function loadGoldenCases(): GoldenCase[] {
  const dir = goldenDir();
  let files: string[] = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const cases: GoldenCase[] = [];
  for (const f of files.sort()) {
    try {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      cases.push(JSON.parse(raw) as GoldenCase);
    } catch (err) {
      console.error(`[evaluation] failed to parse golden case ${f}`, err);
    }
  }
  return cases;
}

export function loadGoldenCase(id: string): GoldenCase | null {
  return loadGoldenCases().find((c) => c.id === id) ?? null;
}

// ---------------- Builders ----------------

const DEFAULT_STERILIZATION: SterilizationMethod = "NON_STERILE";

/** Builds a full domain Product from the golden case partial, filling safe defaults. */
export function buildProduct(c: GoldenCase): Product {
  const p = c.product;
  return {
    id: `golden-${c.id}`,
    name: p.name,
    brand: p.brand,
    model: p.model,
    basicUdiDi: p.basicUdiDi,
    udiDi: p.udiDi,
    deviceClass: p.deviceClass,
    intendedPurpose: p.intendedPurpose,
    userProfile: p.userProfile,
    patientPopulation: p.patientPopulation,
    indications: p.indications,
    contraindications: p.contraindications,
    isSterile: p.isSterile ?? false,
    sterilization: p.sterilization ?? DEFAULT_STERILIZATION,
    hasMeasuringFn: p.hasMeasuringFn ?? false,
    containsSoftware: p.containsSoftware ?? false,
    isInvasive: p.isInvasive ?? false,
    bodyContactDuration: p.bodyContactDuration,
    materials: p.materials,
    packagingType: p.packagingType,
    shelfLife: p.shelfLife,
    manufacturingProcess: p.manufacturingProcess,
    criticalSuppliers: p.criticalSuppliers,
    appliedStandards: p.appliedStandards,
    complianceScore: p.complianceScore ?? 0,
    updatedAt: new Date().toISOString(),
    technicalSections: p.technicalSections ?? [],
    gsprItems: p.gsprItems ?? [],
    riskItems: p.riskItems ?? [],
  };
}

/** Builds an in-memory ComplianceSnapshot from a golden case (no DB writes). */
export function buildSnapshot(c: GoldenCase, companyId: string, companyName: string): ComplianceSnapshot {
  const product = buildProduct(c);
  const s = c.snapshot;
  return {
    companyId,
    companyName,
    product,
    evidence: {
      itemsTotal: s.evidenceItemsTotal,
      itemsWithEvidence: s.evidenceItemsWithEvidence,
      uploadedFiles: s.uploadedFiles,
      analyzedFiles: s.analyzedFiles,
    },
    composer: { total: 0, approved: 0, avgConfidence: 0 },
    qms: { total: s.qmsTotal, approved: s.qmsApproved, titles: s.qmsTitles },
    capa: { total: s.capaTotal, open: s.capaOpen, overdue: s.capaOverdue },
    auditFindings: { total: 0, open: 0 },
    citations: 0,
  };
}
