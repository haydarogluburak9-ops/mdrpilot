import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import type {
  DocStatus,
  GsprItem,
  Product,
  RiskItem,
  TechnicalSection,
} from "@/lib/domain/types";
import { sortByGsprNo } from "@/lib/domain/gspr-sort";
import { parseMitigationsJson, resolveMitigations } from "@/lib/domain/risk-template";
import { parseAnnexARowsJson } from "@/lib/domain/risk-annex-a";
import { parseTableERowsJson } from "@/lib/domain/risk-table-e";
import {
  detectRiskDocSubtype,
  extractRiskDocumentIdentity,
  formatRiskDocumentLabel,
  type RiskDocumentIdentity,
} from "@/lib/domain/risk-document-meta";
import {
  formatStandardReference,
  formatStandardsInText,
} from "@/lib/domain/standards-catalog";
import { parseSectionExtras } from "@/lib/domain/pmcf-survey";
import {
  TECHNICAL_FILE_TEMPLATE,
  POST_MARKET_SECTION_KEYS,
  REMOVED_TECHNICAL_FILE_KEYS,
  isTechnicalFileSectionKey,
  QMS_REGISTER_EXCLUDED_CODES,
} from "@/lib/domain/constants";
import { normalizeQmsRevision } from "@/lib/qms/revision";
import { scaffoldCompanyQms } from "@/lib/qms/scaffold";
import { inferQmsLayerFromCode, sortQmsDocsByKysTree } from "@/lib/qms/kys-structure";
import { dedupeQmsDocsByCode, inferParentProcedureCode, buildProcedureTree } from "@/lib/qms/procedure-children";
import { parseLinkedProcedureCodes } from "@/lib/qms/procedure-packs";
import { syncTechnicalFileSections } from "@/lib/products/technical-file-sync";
import { ensureRiskSequences } from "@/lib/products/risk-service";

// ============================================================
// Company-isolated data access. EVERY function takes companyId and
// scopes its query by it. Cross-company reads are impossible by design.
// ============================================================

const u = <T>(v: T | null | undefined): T | undefined => v ?? undefined;

function needsTechnicalFileSectionSync(sectionKeys: string[]): boolean {
  const tfKeys = new Set(TECHNICAL_FILE_TEMPLATE.map((t) => t.key));
  const pmKeys = new Set(POST_MARKET_SECTION_KEYS);

  if (sectionKeys.some((k) => REMOVED_TECHNICAL_FILE_KEYS.includes(k as typeof REMOVED_TECHNICAL_FILE_KEYS[number]))) {
    return true;
  }

  const tfPresent = new Set(sectionKeys.filter((k) => tfKeys.has(k)));
  const pmPresent = new Set(sectionKeys.filter((k) => pmKeys.has(k)));

  return tfPresent.size !== tfKeys.size || pmPresent.size !== pmKeys.size;
}

const productInclude = {
  technicalSections: { orderBy: { order: "asc" as const } },
  gsprItems: { orderBy: { gsprNo: "asc" as const } },
  riskItems: { orderBy: { createdAt: "asc" as const } },
  riskManagementFile: true,
};

type UploadedFileLite = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  textExtract?: string | null;
  analysisJson?: unknown;
};

function riskFileMetaFromUpload(f: UploadedFileLite) {
  const json = f.analysisJson as Record<string, unknown> | null | undefined;
  const identity =
    (json?.riskDocumentIdentity as RiskDocumentIdentity | undefined) ??
    extractRiskDocumentIdentity(f.fileName, f.textExtract);
  const detectedSubtype =
    (json?.riskDocSubtype as "plan" | "report" | "policy" | undefined) ??
    detectRiskDocSubtype(f.fileName, f.textExtract);
  return {
    documentLabel: formatRiskDocumentLabel(identity, f.fileName, "tr"),
    detectedSubtype: detectedSubtype ?? undefined,
  };
}

function serializeLinkedRiskFile(f: UploadedFileLite | undefined) {
  if (!f) return undefined;
  const meta = riskFileMetaFromUpload(f);
  return {
    id: f.id,
    fileName: f.fileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    documentLabel: meta.documentLabel,
    detectedSubtype: meta.detectedSubtype,
  };
}

async function loadRiskMgmtUploadedFiles(rows: { riskManagementFile?: {
  planUploadedFileId?: string | null;
  reportUploadedFileId?: string | null;
  policyUploadedFileId?: string | null;
} | null }[]): Promise<Map<string, UploadedFileLite>> {
  const ids = new Set<string>();
  for (const p of rows) {
    const rm = p.riskManagementFile;
    if (rm?.planUploadedFileId) ids.add(rm.planUploadedFileId);
    if (rm?.reportUploadedFileId) ids.add(rm.reportUploadedFileId);
    if (rm?.policyUploadedFileId) ids.add(rm.policyUploadedFileId);
  }
  if (ids.size === 0) return new Map();
  const files = await prisma.uploadedFile.findMany({
    where: { id: { in: [...ids] } },
    select: {
      id: true,
      fileName: true,
      mimeType: true,
      sizeBytes: true,
      textExtract: true,
      analysisJson: true,
    },
  });
  return new Map(files.map((f) => [f.id, f]));
}

function sortRiskItems(items: RiskItem[]): RiskItem[] {
  return [...items].sort((a, b) => {
    const seqA = a.sequenceNo > 0 ? a.sequenceNo : Number.MAX_SAFE_INTEGER;
    const seqB = b.sequenceNo > 0 ? b.sequenceNo : Number.MAX_SAFE_INTEGER;
    if (seqA !== seqB) return seqA - seqB;
    return a.id.localeCompare(b.id);
  });
}

type PrismaProduct = Awaited<ReturnType<typeof prisma.product.findFirst>> &
  Record<string, unknown>;

function serializeSection(s: any): TechnicalSection {
  const annexRef = u(s.annexRef) ?? "";
  return {
    id: s.id,
    key: s.key,
    title: s.title,
    annexRef: formatStandardsInText(annexRef) ?? annexRef,
    status: s.status,
    applicable: s.applicable ?? true,
    naReason: u(s.naReason),
    ownerName: u(s.ownerName),
    updatedAt: s.updatedAt.toISOString(),
    content: u(s.content),
    sectionExtras: parseSectionExtras(s.sectionExtrasJson),
  };
}

function serializeGspr(g: any): GsprItem {
  const standardReference = u(g.standardReference);
  const evidenceDocumentRaw = u(g.evidenceDocument);
  return {
    id: g.id,
    gsprNo: g.gsprNo,
    requirementSummary: g.requirementSummary,
    applicable: g.applicable,
    justification: u(g.justification),
    evidenceDocumentRaw: evidenceDocumentRaw ?? undefined,
    evidenceDocument: evidenceDocumentRaw
      ? (formatStandardsInText(evidenceDocumentRaw) ?? evidenceDocumentRaw)
      : undefined,
    evidenceManual: g.evidenceManual ?? false,
    standardReference: standardReference
      ? (formatStandardReference(standardReference) ?? standardReference)
      : undefined,
    complianceStatement: u(g.complianceStatement),
    status: g.status,
    aiGapComment: u(g.aiGapComment),
  };
}

function serializeRisk(r: any): RiskItem {
  const mitigations = parseMitigationsJson(r.mitigations);
  const item = {
    id: r.id,
    sequenceNo: r.sequenceNo ?? 0,
    riskNo: u(r.riskNo),
    hazard: r.hazard,
    sequenceOfEvents: u(r.sequenceOfEvents),
    hazardousSituation: u(r.hazardousSituation),
    harm: u(r.harm),
    riskSource: u(r.riskSource),
    initialSeverity: r.initialSeverity,
    initialProbability: r.initialProbability,
    initialRiskLevel: r.initialRiskLevel,
    riskControlMeasure: u(r.riskControlMeasure),
    mitigations: mitigations ?? undefined,
    residualSeverity: r.residualSeverity,
    residualProbability: r.residualProbability,
    residualRiskLevel: r.residualRiskLevel,
    residualAssessment: u(r.residualAssessment),
    benefitRiskJustification: u(r.benefitRiskJustification),
    verificationOfControl: u(r.verificationOfControl),
    linkedReferences: u(r.linkedReferences),
    tableERef: u(r.tableERef),
  };
  if (!item.mitigations) {
    item.mitigations = resolveMitigations(item);
  }
  return item;
}

function serializeRiskManagement(r: {
  id: string;
  plan: string | null;
  report: string | null;
  managementPolicy: string | null;
  annexAQuestions: string | null;
  annexARows: unknown;
  planTableE1Rows: unknown;
  planTableE2Rows: unknown;
  fmeaBenefitRiskAnalysis: string | null;
  planUploadedFileId: string | null;
  reportUploadedFileId: string | null;
  policyUploadedFileId: string | null;
  status: string;
  updatedAt: Date;
} | null | undefined, fileMap?: Map<string, UploadedFileLite>) {
  if (!r) return undefined;
  const planFile = r.planUploadedFileId ? fileMap?.get(r.planUploadedFileId) : undefined;
  const reportFile = r.reportUploadedFileId ? fileMap?.get(r.reportUploadedFileId) : undefined;
  const policyFile = r.policyUploadedFileId ? fileMap?.get(r.policyUploadedFileId) : undefined;
  return {
    id: r.id,
    plan: u(r.plan),
    report: u(r.report),
    managementPolicy: u(r.managementPolicy),
    annexAQuestions: u(r.annexAQuestions),
    annexARows: r.annexARows ? parseAnnexARowsJson(r.annexARows, "tr") : undefined,
    planTableE1Rows: r.planTableE1Rows ? parseTableERowsJson(r.planTableE1Rows, "E1", "tr") : undefined,
    planTableE2Rows: r.planTableE2Rows ? parseTableERowsJson(r.planTableE2Rows, "E2", "tr") : undefined,
    fmeaBenefitRiskAnalysis: u(r.fmeaBenefitRiskAnalysis),
    planFile: serializeLinkedRiskFile(planFile),
    reportFile: serializeLinkedRiskFile(reportFile),
    policyFile: serializeLinkedRiskFile(policyFile),
    status: r.status as DocStatus,
    updatedAt: r.updatedAt.toISOString(),
  };
}

function serializeProduct(p: any, fileMap?: Map<string, UploadedFileLite>): Product {
  return {
    id: p.id,
    name: p.name,
    brand: u(p.brand),
    model: u(p.model),
    variants: Array.isArray(p.variantsJson) ? p.variantsJson : undefined,
    basicUdiDi: u(p.basicUdiDi),
    udiDi: u(p.udiDi),
    emdnCode: u(p.emdnCode),
    photoKey: u(p.photoKey),
    deviceClass: p.deviceClass,
    intendedPurpose: u(p.intendedPurpose),
    userProfile: u(p.userProfile),
    patientPopulation: u(p.patientPopulation),
    indications: u(p.indications),
    contraindications: u(p.contraindications),
    isSterile: p.isSterile,
    sterilization: p.sterilization,
    hasMeasuringFn: p.hasMeasuringFn,
    containsSoftware: p.containsSoftware,
    isInvasive: p.isInvasive,
    isImplantable: p.isImplantable,
    isActive: p.isActive,
    isReusable: p.isReusable,
    emitsRadiation: p.emitsRadiation,
    administersMedicineOrEnergy: p.administersMedicineOrEnergy,
    containsMedicinalSubstance: p.containsMedicinalSubstance,
    containsBiologicalMaterial: p.containsBiologicalMaterial,
    isAbsorbable: p.isAbsorbable,
    containsCmrOrEndocrine: p.containsCmrOrEndocrine,
    containsNanomaterial: p.containsNanomaterial,
    isForLayUser: p.isForLayUser,
    bodyContactDuration: u(p.bodyContactDuration),
    materials: u(p.materials),
    packagingType: u(p.packagingType),
    shelfLife: u(p.shelfLife),
    manufacturingProcess: u(p.manufacturingProcess),
    criticalSuppliers: u(p.criticalSuppliers),
    appliedStandards: (() => {
      const raw = u(p.appliedStandards);
      return raw ? (formatStandardsInText(raw) ?? raw) : undefined;
    })(),
    complianceScore: p.complianceScore,
    updatedAt: p.updatedAt.toISOString(),
    technicalSections: (p.technicalSections ?? []).map(serializeSection),
    gsprItems: sortByGsprNo((p.gsprItems ?? []).map(serializeGspr)),
    riskItems: sortRiskItems((p.riskItems ?? []).map(serializeRisk)),
    riskManagementFile: serializeRiskManagement(p.riskManagementFile, fileMap),
  };
}

export interface ProductLite {
  id: string;
  name: string;
  deviceClass: string;
  complianceScore: number;
}

/** Lightweight product list (id/name/class/score), company-isolated. */
export async function listProductsLite(companyId: string): Promise<ProductLite[]> {
  const rows = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    select: { id: true, name: true, deviceClass: true, complianceScore: true },
    orderBy: { createdAt: "asc" },
  });
  return rows;
}

/** All products for a company, each with full dossier relations. */
export async function listProductsWithDossier(companyId: string): Promise<Product[]> {
  let rows = await prisma.product.findMany({
    where: { companyId, deletedAt: null },
    include: productInclude,
    orderBy: { createdAt: "asc" },
  });

  const needsSync = rows.filter((p) =>
    needsTechnicalFileSectionSync(p.technicalSections.map((s) => s.key)),
  );
  if (needsSync.length > 0) {
    await Promise.all(needsSync.map((p) => syncTechnicalFileSections(p.id)));
    rows = await prisma.product.findMany({
      where: { companyId, deletedAt: null },
      include: productInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  const withRisks = rows.filter((p) => p.riskItems.length > 0);
  if (withRisks.length > 0) {
    await Promise.all(withRisks.map((p) => ensureRiskSequences(p.id)));
    rows = await prisma.product.findMany({
      where: { companyId, deletedAt: null },
      include: productInclude,
      orderBy: { createdAt: "asc" },
    });
  }

  const fileMap = await loadRiskMgmtUploadedFiles(rows);
  return rows.map((p) => serializeProduct(p, fileMap));
}

/** Single product, scoped to company. Throws NotFound (via assert) on mismatch. */
export async function getProductForCompany(
  companyId: string,
  productId: string,
): Promise<Product | null> {
  let row = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: productInclude,
  });
  if (!row) return null;
  assertCompanyAccess(row.companyId, companyId);

  await syncTechnicalFileSections(productId);
  await ensureRiskSequences(productId);
  row = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: productInclude,
  });
  if (!row) return null;

  const fileMap = await loadRiskMgmtUploadedFiles([row]);
  return serializeProduct(row, fileMap);
}

export interface DashboardData {
  products: Product[];
  capas: {
    id: string;
    title: string;
    referenceNo: string | null;
    status: string;
    dueDate: string | null;
    product: string;
  }[];
  complaints: {
    id: string;
    title: string;
    complaintNo: string | null;
    status: string;
    receivedAt: string;
  }[];
  openCapaCount: number;
  openComplaintCount: number;
}

export async function getDashboardData(companyId: string): Promise<DashboardData> {
  const [products, capas, complaints] = await Promise.all([
    listProductsWithDossier(companyId),
    prisma.cAPA.findMany({
      where: { companyId },
      include: { product: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.complaint.findMany({
      where: { companyId },
      orderBy: { receivedAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    products,
    capas: capas.map((c) => ({
      id: c.id,
      title: c.title,
      referenceNo: c.referenceNo,
      status: c.status,
      dueDate: c.dueDate ? c.dueDate.toISOString() : null,
      product: c.product?.name ?? "—",
    })),
    complaints: complaints.map((c) => ({
      id: c.id,
      title: c.title,
      complaintNo: c.complaintNo,
      status: c.status,
      receivedAt: c.receivedAt.toISOString(),
    })),
    openCapaCount: capas.filter((c) => c.status !== "CLOSED").length,
    openComplaintCount: complaints.filter((c) => c.status !== "CLOSED").length,
  };
}

export interface QmsDoc {
  id: string;
  code: string | null;
  title: string;
  standard: string;
  layer: string;
  parentProcedureCode: string | null;
  linkedProcedureCodes: string[];
  clauseRefs: string | null;
  status: string;
  version: string;
  hasContent: boolean;
  /** Populated on procedure detail page for preview. */
  content?: string | null;
  issueDate?: string | null;
  reviewDueDate?: string | null;
}

export async function listQmsDocuments(companyId: string, standard?: string): Promise<QmsDoc[]> {
  // Ensure new catalog procedures (e.g. SOP-ORG) appear without manual db:sync-qms.
  await scaffoldCompanyQms(companyId, ["ISO 13485", "ISO 9001"]);

  const rows = await prisma.qMSDocument.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(standard ? { standard } : {}),
      NOT: { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } },
    },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      title: true,
      standard: true,
      layer: true,
      parentProcedureCode: true,
      linkedProcedureCodesJson: true,
      clauseRefs: true,
      status: true,
      version: true,
      content: true,
    },
  });
  const deduped = dedupeQmsDocsByCode(
    rows.map((d) => ({
      ...d,
      hasContent: Boolean(d.content?.trim()),
    })),
  );

  const mapped = deduped.map((d) => {
    const layer = d.layer ?? inferQmsLayerFromCode(d.code);
    return {
      id: d.id,
      code: d.code,
      title: d.title,
      standard: d.standard,
      layer,
      parentProcedureCode:
        d.parentProcedureCode ??
        (layer !== "PROCEDURE" && layer !== "MANUAL" ? inferParentProcedureCode(d.code) : null),
      linkedProcedureCodes: parseLinkedProcedureCodes(d.linkedProcedureCodesJson),
      clauseRefs: d.clauseRefs,
      status: d.status,
      version: normalizeQmsRevision(d.version),
      hasContent: Boolean(d.content?.trim()),
    };
  });
  return sortQmsDocsByKysTree(mapped);
}

export interface QmsProcedureDetail {
  procedure: QmsDoc & { content: string | null };
  children: QmsDoc[];
  companyName: string;
}

/** Load one procedure SOP and its linked child documents for the detail page. */
export async function getQmsProcedureBundle(
  companyId: string,
  procedureCode: string,
): Promise<QmsProcedureDetail | null> {
  const code = procedureCode.trim().toUpperCase();
  if (!code.startsWith("SOP-")) return null;

  const row = await prisma.qMSDocument.findFirst({
    where: { companyId, code, deletedAt: null, layer: "PROCEDURE" },
    select: {
      id: true,
      code: true,
      title: true,
      standard: true,
      layer: true,
      parentProcedureCode: true,
      clauseRefs: true,
      status: true,
      version: true,
      content: true,
      issueDate: true,
      reviewDueDate: true,
    },
  });
  if (!row) return null;

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true },
  });

  const allForStandard = await listQmsDocuments(companyId, row.standard);
  const { procedures } = buildProcedureTree(allForStandard);
  const node = procedures.find((p) => p.procedure.code?.trim().toUpperCase() === code);
  const baseChildren = node?.children ?? [];

  const contentRows =
    baseChildren.length > 0
      ? await prisma.qMSDocument.findMany({
          where: { companyId, deletedAt: null, id: { in: baseChildren.map((c) => c.id) } },
          select: { id: true, content: true, issueDate: true, reviewDueDate: true },
        })
      : [];
  const metaById = new Map(
    contentRows.map((r) => [
      r.id,
      {
        content: r.content,
        issueDate: r.issueDate?.toISOString().slice(0, 10) ?? null,
        reviewDueDate: r.reviewDueDate?.toISOString().slice(0, 10) ?? null,
      },
    ]),
  );

  const children: QmsDoc[] = baseChildren.map((c) => {
    const meta = metaById.get(c.id);
    const content = meta?.content ?? null;
    return {
      ...c,
      content,
      hasContent: Boolean(content?.trim()),
      issueDate: meta?.issueDate ?? null,
      reviewDueDate: meta?.reviewDueDate ?? null,
    };
  });

  const procedure: QmsDoc & { content: string | null } = {
    id: row.id,
    code: row.code,
    title: row.title,
    standard: row.standard,
    layer: row.layer ?? "PROCEDURE",
    parentProcedureCode: row.parentProcedureCode,
    linkedProcedureCodes: [],
    clauseRefs: row.clauseRefs,
    status: row.status,
    version: normalizeQmsRevision(row.version),
    hasContent: Boolean(row.content?.trim()),
    content: row.content,
    issueDate: row.issueDate?.toISOString().slice(0, 10) ?? null,
    reviewDueDate: row.reviewDueDate?.toISOString().slice(0, 10) ?? null,
  };

  return {
    procedure,
    children,
    companyName: company?.name ?? "Company",
  };
}

export interface FileItem {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  aiSummary: string | null;
  category: string | null;
}

export async function listFiles(companyId: string): Promise<FileItem[]> {
  const rows = await prisma.uploadedFile.findMany({
    where: { companyId, deletedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((f) => ({
    id: f.id,
    fileName: f.fileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    aiSummary: f.aiSummary,
    category: f.category,
  }));
}

export interface FileDetail {
  id: string;
  fileName: string;
  documentKind: string;
  mimeType: string;
  extension: string | null;
  sizeBytes: number;
  checksumSha256: string | null;
  analysisStatus: string;
  analysisSummary: string | null;
  analysisJson: unknown;
  productId: string | null;
  productName: string | null;
  uploadedBy: string | null;
  linkCount: number;
  createdAt: string;
}

export async function listFilesDetailed(
  companyId: string,
  opts?: { productId?: string; documentKind?: string },
): Promise<FileDetail[]> {
  const rows = await prisma.uploadedFile.findMany({
    where: {
      companyId,
      deletedAt: null,
      ...(opts?.productId ? { productId: opts.productId } : {}),
      ...(opts?.documentKind ? { documentKind: opts.documentKind as never } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true } },
      _count: { select: { gsprLinks: true, technicalFileLinks: true, riskLinks: true } },
    },
  });

  const userIds = Array.from(new Set(rows.map((r) => r.uploadedById).filter(Boolean))) as string[];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
  const userMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));

  return rows.map((f) => ({
    id: f.id,
    fileName: f.fileName,
    documentKind: f.documentKind,
    mimeType: f.mimeType,
    extension: f.extension,
    sizeBytes: f.sizeBytes,
    checksumSha256: f.checksumSha256,
    analysisStatus: f.analysisStatus,
    analysisSummary: f.analysisSummary,
    analysisJson: f.analysisJson,
    productId: f.productId,
    productName: f.product?.name ?? null,
    uploadedBy: f.uploadedById ? userMap.get(f.uploadedById) ?? null : null,
    linkCount: f._count.gsprLinks + f._count.technicalFileLinks + f._count.riskLinks,
    createdAt: f.createdAt.toISOString(),
  }));
}

export interface EvidenceFile {
  linkId: string;
  fileId: string;
  fileName: string;
  documentKind: string;
  note: string | null;
}

export interface ProductEvidence {
  gspr: Record<string, EvidenceFile[]>;
  technicalFile: Record<string, EvidenceFile[]>;
  risk: Record<string, EvidenceFile[]>;
}

export interface ComposerListItem {
  id: string;
  title: string;
  type: string;
  status: string;
  version: number;
  aiConfidence: number;
  productId: string | null;
  productName: string | null;
  createdBy: string | null;
  updatedAt: string;
}

export async function listComposerDocuments(
  companyId: string,
  opts?: { productId?: string; type?: string; status?: string },
): Promise<ComposerListItem[]> {
  const rows = await prisma.composerDocument.findMany({
    where: {
      companyId,
      ...(opts?.productId ? { productId: opts.productId } : {}),
      ...(opts?.type ? { type: opts.type as never } : {}),
      ...(opts?.status ? { status: opts.status as never } : {}),
    },
    orderBy: { updatedAt: "desc" },
    include: { product: { select: { name: true } } },
  });
  const userIds = Array.from(new Set(rows.map((r) => r.createdById).filter(Boolean))) as string[];
  const users = await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } });
  const userMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));
  return rows.map((d) => ({
    id: d.id, title: d.title, type: d.type, status: d.status, version: d.version, aiConfidence: d.aiConfidence,
    productId: d.productId, productName: d.product?.name ?? null,
    createdBy: d.createdById ? userMap.get(d.createdById) ?? null : null,
    updatedAt: d.updatedAt.toISOString(),
  }));
}

export async function getComposerDocumentDetail(companyId: string, id: string) {
  const d = await prisma.composerDocument.findFirst({
    where: { id },
    include: {
      product: { select: { name: true } },
      versions: { orderBy: { version: "desc" }, select: { id: true, version: true, changeSummary: true, createdAt: true, createdById: true } },
    },
  });
  if (!d || d.companyId !== companyId) return null;

  const ids = [d.createdById, d.approvedById, ...d.versions.map((v) => v.createdById)].filter(Boolean) as string[];
  const users = await prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, email: true } });
  const userMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));

  return {
    id: d.id,
    title: d.title,
    type: d.type,
    status: d.status,
    version: d.version,
    aiModel: d.aiModel,
    aiConfidence: d.aiConfidence,
    contentMarkdown: d.contentMarkdown,
    missingInformation: (d.missingInformationJson as string[] | null) ?? [],
    complianceGaps: (d.complianceGapsJson as string[] | null) ?? [],
    consistencyWarnings: (d.consistencyWarningsJson as string[] | null) ?? [],
    evidenceUsed: (d.evidenceUsedJson as string[] | null) ?? [],
    recommendedNextActions: ((d.contentJson as { recommendedNextActions?: string[] } | null)?.recommendedNextActions) ?? [],
    disclaimer: d.disclaimer,
    productId: d.productId,
    productName: d.product?.name ?? null,
    createdBy: d.createdById ? userMap.get(d.createdById) ?? null : null,
    approvedBy: d.approvedById ? userMap.get(d.approvedById) ?? null : null,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    approvedAt: d.approvedAt ? d.approvedAt.toISOString() : null,
    versions: d.versions.map((v) => ({
      id: v.id, version: v.version, changeSummary: v.changeSummary,
      createdAt: v.createdAt.toISOString(), createdBy: v.createdById ? userMap.get(v.createdById) ?? null : null,
    })),
  };
}

/** All evidence links for a product's GSPR / technical file / risk items. */
export async function getProductEvidence(companyId: string, productId: string): Promise<ProductEvidence> {
  const fileSel = { id: true, fileName: true, documentKind: true } as const;
  const [gsprLinks, tfLinks, riskLinks] = await Promise.all([
    prisma.gSPREvidenceLink.findMany({ where: { companyId, productId }, include: { uploadedFile: { select: fileSel } } }),
    prisma.technicalFileEvidenceLink.findMany({ where: { companyId, productId }, include: { uploadedFile: { select: fileSel } } }),
    prisma.riskEvidenceLink.findMany({ where: { companyId, productId }, include: { uploadedFile: { select: fileSel } } }),
  ]);

  const gspr: Record<string, EvidenceFile[]> = {};
  for (const l of gsprLinks) {
    (gspr[l.gsprItemId] ??= []).push({ linkId: l.id, fileId: l.uploadedFileId, fileName: l.uploadedFile.fileName, documentKind: l.uploadedFile.documentKind, note: l.note });
  }
  const technicalFile: Record<string, EvidenceFile[]> = {};
  for (const l of tfLinks) {
    (technicalFile[l.technicalFileSectionId] ??= []).push({ linkId: l.id, fileId: l.uploadedFileId, fileName: l.uploadedFile.fileName, documentKind: l.uploadedFile.documentKind, note: l.note });
  }
  const risk: Record<string, EvidenceFile[]> = {};
  for (const l of riskLinks) {
    (risk[l.riskItemId] ??= []).push({ linkId: l.id, fileId: l.uploadedFileId, fileName: l.uploadedFile.fileName, documentKind: l.uploadedFile.documentKind, note: l.note });
  }

  return { gspr, technicalFile, risk };
}

// ============================================================
// Standards Knowledge Base (company-isolated + public standards)
// ============================================================

export interface StandardListItem {
  id: string; code: string; title: string; version: string | null;
  sourceType: string; jurisdiction: string | null; isPublic: boolean;
  companyId: string | null; clauseCount: number; createdAt: string;
}

export interface StandardClauseDetail {
  id: string; clauseNo: string; title: string; summary: string;
  keywords: string | null; applicability: string | null;
  documentExpectations: string[]; evidenceExpectations: string[]; riskRelevance: string[];
}

export interface StandardDetail extends Omit<StandardListItem, "clauseCount"> {
  clauses: StandardClauseDetail[];
}

// ============================================================
// Quality Manual Wizard (company-isolated)
// ============================================================

export interface WizardListItem {
  id: string; status: string; standardMode: string; currentStep: number;
  composerDocumentId: string | null; createdBy: string | null;
  createdAt: string; updatedAt: string; generatedAt: string | null;
}

export interface WizardDetail extends WizardListItem {
  answers: Record<string, unknown>;
  gapCheck: unknown | null;
}

export async function listQualityManualWizards(companyId: string): Promise<WizardListItem[]> {
  const rows = await prisma.qualityManualWizardSession.findMany({
    where: { companyId }, orderBy: { updatedAt: "desc" },
  });
  const userIds = Array.from(new Set(rows.map((r) => r.createdById).filter(Boolean))) as string[];
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }) : [];
  const userMap = new Map(users.map((u) => [u.id, u.name ?? u.email]));
  return rows.map((r) => ({
    id: r.id, status: r.status, standardMode: r.standardMode, currentStep: r.currentStep,
    composerDocumentId: r.composerDocumentId,
    createdBy: r.createdById ? userMap.get(r.createdById) ?? null : null,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    generatedAt: r.generatedAt ? r.generatedAt.toISOString() : null,
  }));
}

export async function getQualityManualWizard(companyId: string, id: string): Promise<WizardDetail | null> {
  const r = await prisma.qualityManualWizardSession.findFirst({ where: { id } });
  if (!r || r.companyId !== companyId) return null;
  const createdBy = r.createdById
    ? (await prisma.user.findUnique({ where: { id: r.createdById }, select: { name: true, email: true } }))
    : null;
  return {
    id: r.id, status: r.status, standardMode: r.standardMode, currentStep: r.currentStep,
    composerDocumentId: r.composerDocumentId,
    createdBy: createdBy ? createdBy.name ?? createdBy.email : null,
    createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
    generatedAt: r.generatedAt ? r.generatedAt.toISOString() : null,
    answers: (r.answersJson as Record<string, unknown> | null) ?? {},
    gapCheck: r.gapCheckJson ?? null,
  };
}

/** Lists standards visible to a company: its own + public templates/regulations. */
export async function listStandards(companyId: string): Promise<StandardListItem[]> {
  const rows = await prisma.standard.findMany({
    where: { OR: [{ companyId }, { companyId: null, isPublic: true }] },
    include: { _count: { select: { clauses: true } } },
    orderBy: [{ companyId: "asc" }, { code: "asc" }],
  });
  return rows.map((s) => ({
    id: s.id, code: s.code, title: s.title, version: s.version,
    sourceType: s.sourceType, jurisdiction: s.jurisdiction, isPublic: s.isPublic,
    companyId: s.companyId, clauseCount: s._count.clauses, createdAt: s.createdAt.toISOString(),
  }));
}

/** Returns a standard with clauses, enforcing company isolation. */
export async function getStandardDetail(companyId: string, id: string): Promise<StandardDetail | null> {
  const s = await prisma.standard.findFirst({
    where: { id, OR: [{ companyId }, { companyId: null, isPublic: true }] },
    include: { clauses: { orderBy: { clauseNo: "asc" } } },
  });
  if (!s) return null;
  return {
    id: s.id, code: s.code, title: s.title, version: s.version,
    sourceType: s.sourceType, jurisdiction: s.jurisdiction, isPublic: s.isPublic,
    companyId: s.companyId, createdAt: s.createdAt.toISOString(),
    clauses: s.clauses.map((c) => ({
      id: c.id, clauseNo: c.clauseNo, title: c.title, summary: c.summary,
      keywords: c.keywords, applicability: c.applicability,
      documentExpectations: (c.documentExpectationsJson as string[] | null) ?? [],
      evidenceExpectations: (c.evidenceExpectationsJson as string[] | null) ?? [],
      riskRelevance: (c.riskRelevanceJson as string[] | null) ?? [],
    })),
  };
}
