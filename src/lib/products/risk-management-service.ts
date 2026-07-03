import "server-only";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import {
  annexAHasAnswers,
  parseAnnexARowsJson,
  type RiskAnnexARow,
} from "@/lib/domain/risk-annex-a";
import {
  normalizeTableERows,
  parseTableERowsJson,
  type RiskPlanTableERow,
} from "@/lib/domain/risk-table-e";
import {
  detectRiskDocSubtype,
  extractRiskDocumentIdentity,
  formatRiskDocumentLabel,
  type RiskDocSubtype,
  type RiskDocumentIdentity,
} from "@/lib/domain/risk-document-meta";

export interface RiskManagementLinkedFile {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentLabel?: string;
  detectedSubtype?: RiskDocSubtype;
}

export interface RiskManagementFileData {
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

function nz(v: string | null | undefined) {
  return v && v.trim() ? v.trim() : null;
}

function hasPlan(row: {
  plan: string | null;
  planUploadedFileId: string | null;
}) {
  return Boolean(row.planUploadedFileId || row.plan?.trim());
}

function hasReport(row: {
  report: string | null;
  reportUploadedFileId: string | null;
}) {
  return Boolean(row.reportUploadedFileId || row.report?.trim());
}

function hasPolicy(row: {
  managementPolicy: string | null;
  policyUploadedFileId: string | null;
}) {
  return Boolean(row.policyUploadedFileId || row.managementPolicy?.trim());
}

function hasAnnexA(row: {
  annexARows: unknown;
  annexAQuestions: string | null;
}) {
  const rows = parseAnnexARowsJson(row.annexARows, "tr");
  if (annexAHasAnswers(rows)) return true;
  return Boolean(row.annexAQuestions?.trim());
}

function deriveStatus(row: {
  plan: string | null;
  report: string | null;
  planUploadedFileId: string | null;
  reportUploadedFileId: string | null;
  policyUploadedFileId: string | null;
  managementPolicy: string | null;
  annexARows: unknown;
  annexAQuestions: string | null;
}): DocStatus {
  const filled = [
    hasPlan(row),
    hasReport(row),
    hasPolicy(row),
    hasAnnexA(row),
  ].filter(Boolean).length;
  if (filled === 0) return "MISSING";
  if (filled === 4) return "DRAFT";
  return "DRAFT";
}

type FileRow = {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  textExtract?: string | null;
  analysisJson?: unknown;
};

function linkedFileFromRow(f: FileRow | null | undefined): RiskManagementLinkedFile | undefined {
  if (!f) return undefined;
  const json = f.analysisJson as Record<string, unknown> | null | undefined;
  const identity =
    (json?.riskDocumentIdentity as RiskDocumentIdentity | undefined) ??
    extractRiskDocumentIdentity(f.fileName, f.textExtract);
  const detectedSubtype =
    (json?.riskDocSubtype as RiskDocSubtype | undefined) ??
    detectRiskDocSubtype(f.fileName, f.textExtract);
  return {
    id: f.id,
    fileName: f.fileName,
    mimeType: f.mimeType,
    sizeBytes: f.sizeBytes,
    documentLabel: formatRiskDocumentLabel(identity, f.fileName, "tr"),
    detectedSubtype: detectedSubtype ?? undefined,
  };
}

function normalizeAnnexRows(raw: RiskAnnexARow[]): object[] {
  return raw.map((r) => ({
    id: r.id,
    no: r.no,
    characteristic: r.characteristic.slice(0, 500),
    question: r.question.slice(0, 2000),
    answer: r.answer.slice(0, 4000),
    approved: r.approved === true,
  }));
}

function normalizeTableERowsPatch(rows: RiskPlanTableERow[]): object[] {
  return normalizeTableERows(rows);
}

function serialize(row: {
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
  status: DocStatus;
  updatedAt: Date;
  planFile?: FileRow | null;
  reportFile?: FileRow | null;
  policyFile?: FileRow | null;
}): RiskManagementFileData {
  return {
    id: row.id,
    plan: row.plan ?? undefined,
    report: row.report ?? undefined,
    managementPolicy: row.managementPolicy ?? undefined,
    annexAQuestions: row.annexAQuestions ?? undefined,
    annexARows: parseAnnexARowsJson(row.annexARows, "tr"),
    planTableE1Rows: parseTableERowsJson(row.planTableE1Rows, "E1", "tr"),
    planTableE2Rows: parseTableERowsJson(row.planTableE2Rows, "E2", "tr"),
    fmeaBenefitRiskAnalysis: row.fmeaBenefitRiskAnalysis ?? undefined,
    planFile: linkedFileFromRow(row.planFile),
    reportFile: linkedFileFromRow(row.reportFile),
    policyFile: linkedFileFromRow(row.policyFile),
    status: row.status,
    updatedAt: row.updatedAt.toISOString(),
  };
}

const fileSelect = {
  id: true,
  fileName: true,
  mimeType: true,
  sizeBytes: true,
  textExtract: true,
  analysisJson: true,
};

async function loadUploadedFilesByIds(ids: string[]) {
  if (ids.length === 0) return new Map<string, FileRow>();
  const files = await prisma.uploadedFile.findMany({
    where: { id: { in: ids } },
    select: fileSelect,
  });
  return new Map(files.map((f) => [f.id, f]));
}

function attachRiskMgmtFiles(
  row: {
    planUploadedFileId: string | null;
    reportUploadedFileId: string | null;
    policyUploadedFileId: string | null;
  },
  fileMap: Map<string, FileRow>,
) {
  return {
    planFile: row.planUploadedFileId ? fileMap.get(row.planUploadedFileId) ?? null : null,
    reportFile: row.reportUploadedFileId ? fileMap.get(row.reportUploadedFileId) ?? null : null,
    policyFile: row.policyUploadedFileId ? fileMap.get(row.policyUploadedFileId) ?? null : null,
  };
}

async function assertProduct(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, companyId: true },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);
  return product;
}

async function assertUploadedFile(companyId: string, fileId: string, productId: string) {
  const file = await prisma.uploadedFile.findFirst({
    where: { id: fileId, companyId, deletedAt: null },
    select: { id: true, productId: true },
  });
  if (!file) return false;
  if (file.productId && file.productId !== productId) return false;
  return true;
}

export async function getRiskManagementFile(
  companyId: string,
  productId: string,
): Promise<RiskManagementFileData | null> {
  const product = await assertProduct(companyId, productId);
  if (!product) return null;

  const row = await prisma.riskManagementFile.findUnique({
    where: { productId },
  });
  if (!row) {
    return {
      id: "",
      status: "MISSING",
      updatedAt: new Date().toISOString(),
    };
  }
  const fileMap = await loadUploadedFilesByIds(
    [row.planUploadedFileId, row.reportUploadedFileId, row.policyUploadedFileId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  return serialize({ ...row, ...attachRiskMgmtFiles(row, fileMap) });
}

export interface RiskManagementPatch {
  plan?: string | null;
  report?: string | null;
  managementPolicy?: string | null;
  annexARows?: RiskAnnexARow[] | null;
  planTableE1Rows?: RiskPlanTableERow[] | null;
  planTableE2Rows?: RiskPlanTableERow[] | null;
  fmeaBenefitRiskAnalysis?: string | null;
  planUploadedFileId?: string | null;
  reportUploadedFileId?: string | null;
  policyUploadedFileId?: string | null;
}

export async function upsertRiskManagementFile(
  companyId: string,
  productId: string,
  patch: RiskManagementPatch,
): Promise<RiskManagementFileData | null> {
  const product = await assertProduct(companyId, productId);
  if (!product) return null;

  const data: Record<string, unknown> = {};
  if ("plan" in patch) data.plan = nz(patch.plan ?? null);
  if ("report" in patch) data.report = nz(patch.report ?? null);
  if ("managementPolicy" in patch) data.managementPolicy = nz(patch.managementPolicy ?? null);
  if ("fmeaBenefitRiskAnalysis" in patch) data.fmeaBenefitRiskAnalysis = nz(patch.fmeaBenefitRiskAnalysis ?? null);

  if ("annexARows" in patch) {
    data.annexARows =
      patch.annexARows && patch.annexARows.length > 0
        ? normalizeAnnexRows(patch.annexARows)
        : null;
  }
  if ("planTableE1Rows" in patch) {
    data.planTableE1Rows =
      patch.planTableE1Rows && patch.planTableE1Rows.length > 0
        ? normalizeTableERowsPatch(patch.planTableE1Rows)
        : null;
  }
  if ("planTableE2Rows" in patch) {
    data.planTableE2Rows =
      patch.planTableE2Rows && patch.planTableE2Rows.length > 0
        ? normalizeTableERowsPatch(patch.planTableE2Rows)
        : null;
  }

  if ("planUploadedFileId" in patch) {
    const id = patch.planUploadedFileId;
    if (id && !(await assertUploadedFile(companyId, id, productId))) return null;
    data.planUploadedFileId = id ?? null;
  }
  if ("reportUploadedFileId" in patch) {
    const id = patch.reportUploadedFileId;
    if (id && !(await assertUploadedFile(companyId, id, productId))) return null;
    data.reportUploadedFileId = id ?? null;
  }
  if ("policyUploadedFileId" in patch) {
    const id = patch.policyUploadedFileId;
    if (id && !(await assertUploadedFile(companyId, id, productId))) return null;
    data.policyUploadedFileId = id ?? null;
  }

  const existing = await prisma.riskManagementFile.findUnique({ where: { productId } });
  const merged = {
    plan: "plan" in data ? (data.plan as string | null) : existing?.plan ?? null,
    report: "report" in data ? (data.report as string | null) : existing?.report ?? null,
    managementPolicy:
      (data.managementPolicy as string | null | undefined) ?? existing?.managementPolicy ?? null,
    fmeaBenefitRiskAnalysis:
      (data.fmeaBenefitRiskAnalysis as string | null | undefined) ??
      existing?.fmeaBenefitRiskAnalysis ??
      null,
    annexARows:
      "annexARows" in data ? (data.annexARows as object[] | null) : existing?.annexARows ?? null,
    planTableE1Rows:
      "planTableE1Rows" in data
        ? (data.planTableE1Rows as object[] | null)
        : existing?.planTableE1Rows ?? null,
    planTableE2Rows:
      "planTableE2Rows" in data
        ? (data.planTableE2Rows as object[] | null)
        : existing?.planTableE2Rows ?? null,
    annexAQuestions: existing?.annexAQuestions ?? null,
    planUploadedFileId:
      "planUploadedFileId" in data
        ? (data.planUploadedFileId as string | null)
        : existing?.planUploadedFileId ?? null,
    reportUploadedFileId:
      "reportUploadedFileId" in data
        ? (data.reportUploadedFileId as string | null)
        : existing?.reportUploadedFileId ?? null,
    policyUploadedFileId:
      "policyUploadedFileId" in data
        ? (data.policyUploadedFileId as string | null)
        : existing?.policyUploadedFileId ?? null,
  };

  const status = deriveStatus({ ...merged, ...data } as typeof merged);
  const createData: Record<string, unknown> = { productId, status };
  for (const [key, value] of Object.entries(data)) {
    createData[key] = value;
  }

  const row = await prisma.riskManagementFile.upsert({
    where: { productId },
    create: createData as Parameters<typeof prisma.riskManagementFile.upsert>[0]["create"],
    update: {
      ...data,
      status,
    },
  });

  const fileMap = await loadUploadedFilesByIds(
    [row.planUploadedFileId, row.reportUploadedFileId, row.policyUploadedFileId].filter(
      (id): id is string => Boolean(id),
    ),
  );
  return serialize({ ...row, ...attachRiskMgmtFiles(row, fileMap) });
}
