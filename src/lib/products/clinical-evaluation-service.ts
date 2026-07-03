import "server-only";
import type { DocStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import {
  CLINICAL_SECTION_KEYS,
  type ClinicalEvaluationData,
  type ClinicalSectionKey,
} from "@/lib/domain/clinical-evaluation";
import type { ClinicalStudyRecord } from "@/lib/domain/clinical-study-model";
import {
  databaseLabel,
  parseLiteratureSearchJson,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";
import { embedLiteratureEvidenceMarker } from "@/lib/domain/clinical-literature-evidence-export";
import {
  parseEquivalentDevicesJson,
  serializeEquivalentDevicesMarkdown,
  type EquivalentDevicesData,
} from "@/lib/domain/clinical-equivalent-model";
import {
  buildPreparedEquivalentDevices,
  mergeEquivalentDevices,
} from "@/lib/domain/clinical-equivalent-generator";
import {
  buildEquivalenceTableSpec,
  embedEquivalenceTableMarker,
  type EquivalenceSubjectProduct,
} from "@/lib/domain/clinical-equivalence-table";
import { buildIncludedLiteratureStudies } from "@/lib/domain/clinical-included-studies-generator";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { displayRiskNo } from "@/lib/domain/risk-category-codes";
import { readEquivalentEvidenceBuffer } from "@/lib/products/equivalent-evidence";
import { readLiteratureEvidenceBuffer } from "@/lib/products/literature-evidence";
import { loadProductPhotoBuffer } from "@/lib/products/photo";
import {
  applyLiteratureToStrategy,
  applyStudiesToDataSummary,
  buildPmcfInputsMarkdown,
  parseClinicalStudiesJson,
} from "@/lib/products/clinical-evaluation-sync";
import { buildCepCore } from "@/lib/domain/clinical-cep-builder";
import { buildCepInput } from "@/lib/products/clinical-cep-service";
import {
  buildClinicalGapMatrix,
  parseClinicalGapMatrix,
} from "@/lib/domain/clinical-gap-matrix";
import { parseClinicalQpDocuments } from "@/lib/domain/clinical-qp-documents";
import { isCerMutable, parseCerRevisionHistory } from "@/lib/products/clinical-evaluation-workflow";
import { BadRequestError } from "@/lib/auth/errors";
import { serializeGapMatrixMarkdown } from "@/lib/domain/clinical-gap-matrix";
import { serializeQpDocumentsMarkdown } from "@/lib/domain/clinical-qp-documents";

function nz(v: string | null | undefined) {
  return v && v.trim() ? v.trim() : undefined;
}

type ClinicalRow = {
  id: string;
  plan: string | null;
  stateOfTheArt: string | null;
  equivalentDevices: string | null;
  literatureStrategy: string | null;
  clinicalDataSummary: string | null;
  benefitRiskConclusion: string | null;
  pmsPmcfInputs: string | null;
  report: string | null;
  literatureDataJson: unknown;
  clinicalStudiesJson: unknown;
  equivalentDevicesDataJson: unknown;
  status: DocStatus;
  submittedById: string | null;
  approvedById: string | null;
  approvedAt: Date | null;
  revisionNo: number;
  revisionHistoryJson: unknown;
  gapMatrixJson: unknown;
  qpDocumentsJson: unknown;
  updatedAt: Date;
  submittedBy?: { id: string; name: string | null; email: string } | null;
  approvedBy?: { id: string; name: string | null; email: string } | null;
};

function deriveStatus(row: Omit<ClinicalRow, "id" | "updatedAt" | "literatureDataJson" | "clinicalStudiesJson">): DocStatus {
  const filled = CLINICAL_SECTION_KEYS.filter((k) => {
    const v = row[k as keyof typeof row];
    return typeof v === "string" && v.trim().length > 40;
  }).length;
  if (filled === 0) return "MISSING";
  if (row.status === "APPROVED") return "APPROVED";
  if (row.status === "IN_REVIEW") return "IN_REVIEW";
  if (row.status === "REJECTED") return "REJECTED";
  return "DRAFT";
}

function serialize(row: ClinicalRow): ClinicalEvaluationData {
  return {
    id: row.id,
    plan: nz(row.plan),
    stateOfTheArt: nz(row.stateOfTheArt),
    equivalentDevices: nz(row.equivalentDevices),
    literatureStrategy: nz(row.literatureStrategy),
    clinicalDataSummary: nz(row.clinicalDataSummary),
    benefitRiskConclusion: nz(row.benefitRiskConclusion),
    pmsPmcfInputs: nz(row.pmsPmcfInputs),
    report: nz(row.report),
    literatureData: parseLiteratureSearchJson(row.literatureDataJson),
    clinicalStudies: parseClinicalStudiesJson(row.clinicalStudiesJson),
    equivalentDevicesData: parseEquivalentDevicesJson(row.equivalentDevicesDataJson),
    status: deriveStatus(row),
    updatedAt: row.updatedAt.toISOString(),
    submittedBy: row.submittedBy ?? undefined,
    approvedBy: row.approvedBy ?? undefined,
    approvedAt: row.approvedAt?.toISOString() ?? undefined,
    revisionNo: row.revisionNo ?? 0,
    revisionHistory: parseCerRevisionHistory(row.revisionHistoryJson),
    gapMatrix: parseClinicalGapMatrix(row.gapMatrixJson),
    qpDocuments: parseClinicalQpDocuments(row.qpDocumentsJson),
  };
}

export async function refreshCerPlanFromSources(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
): Promise<string | null> {
  const input = await buildCepInput(companyId, productId, locale);
  if (!input) return null;
  return buildCepCore(input);
}

async function syncClinicalGapMatrix(
  companyId: string,
  productId: string,
  locale: "tr" | "en",
): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: { name: true, deviceClass: true, isSterile: true },
  });
  const cer = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  if (!product || !cer) return;

  const matrix = buildClinicalGapMatrix({
    locale,
    productName: product.name,
    deviceClass: product.deviceClass,
    isSterile: product.isSterile,
    usesEquivalence: (parseEquivalentDevicesJson(cer.equivalentDevicesDataJson)?.devices?.length ?? 0) > 0,
    literatureData: parseLiteratureSearchJson(cer.literatureDataJson),
    equivalentDevicesData: parseEquivalentDevicesJson(cer.equivalentDevicesDataJson),
    studies: parseClinicalStudiesJson(cer.clinicalStudiesJson),
    hasBenefitRisk: Boolean(cer.benefitRiskConclusion?.trim()),
    hasPmsPmcf: Boolean(cer.pmsPmcfInputs?.trim()),
  });

  await prisma.clinicalEvaluation.update({
    where: { productId },
    data: { gapMatrixJson: matrix as object },
  });
}

export async function applyCerPlanSync(
  companyId: string,
  productId: string,
  locale: "tr" | "en",
): Promise<void> {
  const plan = await refreshCerPlanFromSources(companyId, productId, locale);
  if (!plan) return;
  const existing = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  if (!existing || !isCerMutable(existing.status)) return;
  await prisma.clinicalEvaluation.update({
    where: { productId },
    data: { plan },
  });
  await syncClinicalGapMatrix(companyId, productId, locale);
}

export async function syncCerGapMatrix(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
): Promise<ClinicalEvaluationData | null> {
  await syncClinicalGapMatrix(companyId, productId, locale);
  return getClinicalEvaluation(companyId, productId);
}

const cerInclude = {
  submittedBy: { select: { id: true, name: true, email: true } },
  approvedBy: { select: { id: true, name: true, email: true } },
} as const;

export type UpsertClinicalEvaluationPatch = Partial<Record<ClinicalSectionKey, string | null>> & {
  literatureData?: LiteratureSearchData | null;
  clinicalStudies?: ClinicalStudyRecord[] | null;
  equivalentDevicesData?: EquivalentDevicesData | null;
  qpDocuments?: import("@/lib/domain/clinical-qp-documents").ClinicalQpDocuments | null;
};

async function assertProduct(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { companyId: true },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);
  return product;
}

async function loadRiskItems(productId: string) {
  return prisma.riskItem.findMany({
    where: { productId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      riskNo: true,
      tableERef: true,
      riskSource: true,
      hazardousSituation: true,
      harm: true,
      initialSeverity: true,
      initialProbability: true,
      residualSeverity: true,
      residualProbability: true,
    },
  });
}

async function finalizeRow(productId: string, row: ClinicalRow): Promise<ClinicalEvaluationData> {
  const status = deriveStatus(row);
  if (status !== row.status) {
    await prisma.clinicalEvaluation.update({
      where: { productId },
      data: { status },
    });
  }
  const fresh = await prisma.clinicalEvaluation.findUnique({
    where: { productId },
    include: cerInclude,
  });
  if (!fresh) return serialize(row);
  await syncTfClinicalSection(productId, fresh);
  return serialize(fresh as ClinicalRow);
}

export async function getClinicalEvaluation(
  companyId: string,
  productId: string,
): Promise<ClinicalEvaluationData | null> {
  const product = await assertProduct(companyId, productId);
  if (!product) return null;

  const row = await prisma.clinicalEvaluation.findUnique({
    where: { productId },
    include: cerInclude,
  });
  if (!row) {
    const created = await prisma.clinicalEvaluation.create({
      data: { productId, status: "MISSING" },
    });
    return serialize(created as ClinicalRow);
  }
  return serialize(row as ClinicalRow);
}

export async function upsertClinicalEvaluation(
  companyId: string,
  productId: string,
  patch: UpsertClinicalEvaluationPatch,
): Promise<ClinicalEvaluationData | null> {
  const product = await assertProduct(companyId, productId);
  if (!product) return null;

  const existing = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  if (existing && !isCerMutable(existing.status)) {
    throw new BadRequestError("cer.status.err.locked");
  }

  const data: Record<string, unknown> = {};
  for (const key of CLINICAL_SECTION_KEYS) {
    if (patch[key] !== undefined) data[key] = patch[key];
  }
  if (patch.literatureData !== undefined) {
    data.literatureDataJson = patch.literatureData;
  }
  if (patch.clinicalStudies !== undefined) {
    data.clinicalStudiesJson = patch.clinicalStudies;
  }
  if (patch.equivalentDevicesData !== undefined) {
    data.equivalentDevicesDataJson = patch.equivalentDevicesData;
  }
  if (patch.qpDocuments !== undefined) {
    data.qpDocumentsJson = patch.qpDocuments
      ? { ...patch.qpDocuments, updatedAt: new Date().toISOString() }
      : null;
  }

  const row = existing
    ? await prisma.clinicalEvaluation.update({
        where: { productId },
        data,
      })
    : await prisma.clinicalEvaluation.create({
        data: { productId, status: "DRAFT", ...data },
      });

  return finalizeRow(productId, row as ClinicalRow);
}

export async function saveLiteratureData(
  companyId: string,
  productId: string,
  literatureData: LiteratureSearchData,
  locale: "tr" | "en" = "tr",
): Promise<ClinicalEvaluationData | null> {
  const product = await assertProduct(companyId, productId);
  if (!product) return null;

  const literatureStrategy = applyLiteratureToStrategy(literatureData, locale);
  const existing = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  const row = existing
    ? await prisma.clinicalEvaluation.update({
        where: { productId },
        data: {
          literatureDataJson: literatureData as object,
          literatureStrategy,
          status: existing.status === "MISSING" ? "DRAFT" : existing.status,
        },
      })
    : await prisma.clinicalEvaluation.create({
        data: {
          productId,
          status: "DRAFT",
          literatureDataJson: literatureData as object,
          literatureStrategy,
        },
      });

  await applyCerPlanSync(companyId, productId, locale);
  return getClinicalEvaluation(companyId, productId);
}

export async function saveClinicalStudies(
  companyId: string,
  productId: string,
  studies: ClinicalStudyRecord[],
  locale: "tr" | "en" = "tr",
): Promise<ClinicalEvaluationData | null> {
  const product = await assertProduct(companyId, productId);
  if (!product) return null;

  const risks = await loadRiskItems(productId);
  const existing = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  const literatureData = parseLiteratureSearchJson(existing?.literatureDataJson ?? null);
  const clinicalDataSummary = applyStudiesToDataSummary(studies, locale, risks, literatureData);
  const row = existing
    ? await prisma.clinicalEvaluation.update({
        where: { productId },
        data: {
          clinicalStudiesJson: studies as object[],
          clinicalDataSummary,
          status: existing.status === "MISSING" ? "DRAFT" : existing.status,
        },
      })
    : await prisma.clinicalEvaluation.create({
        data: {
          productId,
          status: "DRAFT",
          clinicalStudiesJson: studies as object[],
          clinicalDataSummary,
        },
      });

  await finalizeRow(productId, row as ClinicalRow);
  await applyCerPlanSync(companyId, productId, locale);
  return getClinicalEvaluation(companyId, productId);
}

async function loadEquivalenceSubjectProduct(productId: string): Promise<EquivalenceSubjectProduct | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: {
      name: true,
      brand: true,
      model: true,
      variantsJson: true,
      emdnCode: true,
      intendedPurpose: true,
      indications: true,
      patientPopulation: true,
      userProfile: true,
      materials: true,
      shelfLife: true,
      bodyContactDuration: true,
      isSterile: true,
      sterilization: true,
      isReusable: true,
      isInvasive: true,
      photoKey: true,
    },
  });
  return product;
}

async function serializeEquivalentDevicesForExport(
  product: EquivalenceSubjectProduct,
  data: EquivalentDevicesData,
  locale: "tr" | "en",
): Promise<string> {
  const subjectPhoto = await loadProductPhotoBuffer(product.photoKey);
  const markers = await Promise.all(
    data.devices.map(async (device) => {
      const evidenceScreenshots: { base64: string; caption: string }[] = [];
      for (const ss of device.evidenceScreenshots ?? []) {
        const buf = await readEquivalentEvidenceBuffer(ss.storageKey);
        if (buf) {
          evidenceScreenshots.push({
            base64: buf.toString("base64"),
            caption: ss.caption?.trim() || ss.fileName,
          });
        }
      }
      const spec = buildEquivalenceTableSpec(product, device, locale, { subject: subjectPhoto });
      if (evidenceScreenshots.length) spec.evidenceScreenshots = evidenceScreenshots;
      return embedEquivalenceTableMarker(spec);
    }),
  );
  return serializeEquivalentDevicesMarkdown(data, locale, product.name, markers);
}

async function loadLiteratureEvidenceBase64(
  shots:
    | Array<{ storageKey: string; caption?: string; fileName: string }>
    | undefined,
): Promise<{ base64: string; caption: string }[]> {
  const result: { base64: string; caption: string }[] = [];
  for (const ss of shots ?? []) {
    const buf = await readLiteratureEvidenceBuffer(ss.storageKey);
    if (buf) {
      result.push({
        base64: buf.toString("base64"),
        caption: ss.caption?.trim() || ss.fileName,
      });
    }
  }
  return result;
}

async function serializeLiteratureStrategyForExport(
  data: LiteratureSearchData,
  locale: "tr" | "en",
): Promise<string> {
  const base = applyLiteratureToStrategy(data, locale);
  const markers: string[] = [];
  const tr = locale === "tr";

  const pubmedShots = await loadLiteratureEvidenceBase64(data.evidenceScreenshots);
  if (pubmedShots.length) {
    markers.push(
      embedLiteratureEvidenceMarker({
        locale,
        title: tr ? "Canlı PubMed — kanıt ekran görüntüleri" : "Live PubMed — evidence screenshots",
        screenshots: pubmedShots,
      }),
    );
  }

  for (const row of data.registryResults ?? []) {
    const shots = await loadLiteratureEvidenceBase64(row.evidenceScreenshots);
    if (!shots.length) continue;
    const label = databaseLabel(row.registryId, locale);
    markers.push(
      embedLiteratureEvidenceMarker({
        locale,
        title: tr ? `${label} — kanıt ekran görüntüleri` : `${label} — evidence screenshots`,
        screenshots: shots,
      }),
    );
  }

  if (!markers.length) return base;
  return [
    base,
    "",
    tr ? "### Kanıt ekran görüntüleri (canlı sorgu)" : "### Evidence screenshots (live query)",
    "",
    ...markers,
  ].join("\n");
}

export async function saveEquivalentDevices(
  companyId: string,
  productId: string,
  data: EquivalentDevicesData,
  locale: "tr" | "en" = "tr",
): Promise<ClinicalEvaluationData | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { companyId: true, name: true },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const subjectProduct = await loadEquivalenceSubjectProduct(productId);
  const equivalentDevices = subjectProduct
    ? await serializeEquivalentDevicesForExport(subjectProduct, data, locale)
    : serializeEquivalentDevicesMarkdown(data, locale, product.name);
  const existing = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  const row = existing
    ? await prisma.clinicalEvaluation.update({
        where: { productId },
        data: {
          equivalentDevicesDataJson: data as object,
          equivalentDevices,
          status: existing.status === "MISSING" ? "DRAFT" : existing.status,
        },
      })
    : await prisma.clinicalEvaluation.create({
        data: {
          productId,
          status: "DRAFT",
          equivalentDevicesDataJson: data as object,
          equivalentDevices,
        },
      });

  await applyCerPlanSync(companyId, productId, locale);
  return getClinicalEvaluation(companyId, productId);
}

export async function generatePreparedEquivalentDevices(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
  options: { merge?: boolean } = {},
): Promise<ClinicalEvaluationData | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: {
      companyId: true,
      name: true,
      brand: true,
      model: true,
      variantsJson: true,
      emdnCode: true,
      intendedPurpose: true,
      indications: true,
      patientPopulation: true,
      userProfile: true,
      materials: true,
      shelfLife: true,
      bodyContactDuration: true,
      isSterile: true,
      sterilization: true,
      isReusable: true,
      isInvasive: true,
      containsSoftware: true,
      isImplantable: true,
      deviceClass: true,
    },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const prepared = await buildPreparedEquivalentDevices({
    locale,
    product: {
      name: product.name,
      model: product.model,
      brand: product.brand,
      variantsJson: product.variantsJson,
      emdnCode: product.emdnCode,
      deviceClass: DEVICE_CLASS_LABEL[product.deviceClass] ?? product.deviceClass,
      intendedPurpose: product.intendedPurpose,
      indications: product.indications,
      patientPopulation: product.patientPopulation,
      userProfile: product.userProfile,
      isSterile: product.isSterile,
      sterilization: product.sterilization,
      isReusable: product.isReusable,
      isInvasive: product.isInvasive,
      containsSoftware: product.containsSoftware,
      isImplantable: product.isImplantable,
      materials: product.materials,
      shelfLife: product.shelfLife,
      bodyContactDuration: product.bodyContactDuration,
    },
  });

  const existing = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  const current = parseEquivalentDevicesJson(existing?.equivalentDevicesDataJson ?? null);
  const devices =
    options.merge && current?.devices?.length
      ? mergeEquivalentDevices(current.devices, prepared.devices)
      : prepared.devices;

  return saveEquivalentDevices(companyId, productId, { ...prepared, devices }, locale);
}

export async function syncPmcfInputsToClinical(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
): Promise<ClinicalEvaluationData | null> {
  const product = await assertProduct(companyId, productId);
  if (!product) return null;

  const pmsPmcfInputs = await buildPmcfInputsMarkdown(productId, locale);
  const existing = await prisma.clinicalEvaluation.findUnique({ where: { productId } });
  const row = existing
    ? await prisma.clinicalEvaluation.update({
        where: { productId },
        data: {
          pmsPmcfInputs,
          status: existing.status === "MISSING" ? "DRAFT" : existing.status,
        },
      })
    : await prisma.clinicalEvaluation.create({
        data: { productId, status: "DRAFT", pmsPmcfInputs },
      });

  return finalizeRow(productId, row as ClinicalRow);
}

async function syncTfClinicalSection(
  productId: string,
  row: {
    plan: string | null;
    report: string | null;
    benefitRiskConclusion: string | null;
    status: DocStatus;
  },
) {
  const reportBody = nz(row.report) ?? nz(row.benefitRiskConclusion);
  const planBody = nz(row.plan);
  const content = reportBody ?? planBody;
  if (!content) return;

  const section = await prisma.technicalFileSection.findFirst({
    where: { productId, key: "clinical-evaluation" },
  });
  if (!section) return;

  const status =
    row.status === "APPROVED"
      ? "APPROVED"
      : content.length > 80
        ? row.status === "IN_REVIEW"
          ? "IN_REVIEW"
          : "DRAFT"
        : section.status;

  await prisma.technicalFileSection.update({
    where: { id: section.id },
    data: {
      content: content.slice(0, 50000),
      status,
    },
  });
}

export async function getClinicalEvaluationForExport(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      clinicalEvaluation: {
        include: cerInclude,
      },
    },
  });
  return product;
}

/** Fresh markdown for export (PRISMA tables, split literature/registry tables). */
export async function resolveCerExportSections(
  productId: string,
  cer: NonNullable<NonNullable<Awaited<ReturnType<typeof getClinicalEvaluationForExport>>>["clinicalEvaluation"]>,
  locale: "tr" | "en",
): Promise<Partial<Record<ClinicalSectionKey, string | null>>> {
  const sections: Partial<Record<ClinicalSectionKey, string | null>> = {};
  for (const key of CLINICAL_SECTION_KEYS) {
    sections[key] = cer[key];
  }

  const literatureData = parseLiteratureSearchJson(cer.literatureDataJson);
  const studies = parseClinicalStudiesJson(cer.clinicalStudiesJson);

  let literatureForExport = literatureData;
  const includedN = literatureData?.prisma?.included ?? 0;
  if (
    literatureData &&
    includedN > 0 &&
    (literatureData.includedStudies?.length ?? 0) !== includedN
  ) {
    const product = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      select: {
        name: true,
        model: true,
        deviceClass: true,
        intendedPurpose: true,
        indications: true,
        patientPopulation: true,
        userProfile: true,
        isSterile: true,
        isInvasive: true,
        containsSoftware: true,
        isImplantable: true,
        materials: true,
      },
    });
    const riskRows = await loadRiskItems(productId);
    const codingCtx = riskRows.map((r) => ({
      id: r.id,
      riskNo: r.riskNo,
      tableERef: r.tableERef,
      riskSource: r.riskSource,
    }));
    if (product) {
      literatureForExport = {
        ...literatureData,
        includedStudies: buildIncludedLiteratureStudies(literatureData, {
          locale,
          product: {
            name: product.name,
            model: product.model,
            deviceClass: DEVICE_CLASS_LABEL[product.deviceClass] ?? product.deviceClass,
            intendedPurpose: product.intendedPurpose,
            indications: product.indications,
            patientPopulation: product.patientPopulation,
            userProfile: product.userProfile,
            isSterile: product.isSterile,
            isInvasive: product.isInvasive,
            containsSoftware: product.containsSoftware,
            isImplantable: product.isImplantable,
            materials: product.materials,
          },
          risks: riskRows.map((r) => ({
            riskNo: displayRiskNo(r, codingCtx),
            hazardousSituation: r.hazardousSituation,
            harm: r.harm,
          })),
        }),
      };
    }
  }

  if (literatureForExport) {
    sections.literatureStrategy = await serializeLiteratureStrategyForExport(
      literatureForExport,
      locale,
    );
  }

  if (studies.length > 0 || literatureForExport) {
    const risks = await loadRiskItems(productId);
    sections.clinicalDataSummary = applyStudiesToDataSummary(
      studies,
      locale,
      risks,
      literatureForExport,
    );
  }

  const equivData = parseEquivalentDevicesJson(cer.equivalentDevicesDataJson);
  if (equivData && equivData.devices.length > 0) {
    const subjectProduct = await loadEquivalenceSubjectProduct(productId);
    if (subjectProduct) {
      sections.equivalentDevices = await serializeEquivalentDevicesForExport(
        subjectProduct,
        equivData,
        locale,
      );
    }
  }

  const livePlan = await refreshCerPlanFromSources(
    (await prisma.product.findFirst({ where: { id: productId }, select: { companyId: true } }))?.companyId ?? "",
    productId,
    locale,
  );
  if (livePlan?.trim()) {
    sections.plan = livePlan;
  }

  const gapMatrix = parseClinicalGapMatrix(cer.gapMatrixJson);
  if (gapMatrix && gapMatrix.rows.length > 0) {
    const gapMd = serializeGapMatrixMarkdown(gapMatrix, locale);
    sections.benefitRiskConclusion = sections.benefitRiskConclusion
      ? `${sections.benefitRiskConclusion}\n\n${gapMd}`
      : gapMd;
  }

  const qp = parseClinicalQpDocuments(cer.qpDocumentsJson);
  if (qp && (qp.evaluatorName || qp.qualifications)) {
    const qpMd = serializeQpDocumentsMarkdown(qp, locale);
    sections.report = sections.report ? `${sections.report}\n\n${qpMd}` : qpMd;
  }

  return sections;
}
