import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { buildPreparedLiteratureSearch, mergeLiteratureSearchEvidence } from "@/lib/domain/clinical-literature-generator";
import {
  emptyLiteratureSearchData,
  parseLiteratureSearchJson,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";
import { displayRiskNo } from "@/lib/domain/risk-category-codes";
import { generatePreparedClinicalFindings } from "@/lib/products/clinical-findings-service";
import { saveLiteratureData } from "@/lib/products/clinical-evaluation-service";
import { syncAcceptedArticlesFromStudies } from "@/lib/products/clinical-article-sync";
import { suggestPicoForProduct } from "@/lib/products/clinical-literature-pico-service";
import { parseEquivalentDevicesJson } from "@/lib/domain/clinical-equivalent-model";
import { buildLiteratureSearchKeywords, buildLiteratureSearchQuery } from "@/lib/domain/clinical-literature-search-keywords";

export function buildInitialLiteratureData(
  productName: string,
  productIndications: string | null | undefined,
  locale: "tr" | "en",
  pico: Awaited<ReturnType<typeof suggestPicoForProduct>>,
  productMeta?: {
    model?: string | null;
    intendedPurpose?: string | null;
    isSterile?: boolean;
    equivalentDeviceNames?: string[];
  },
): LiteratureSearchData {
  const empty = emptyLiteratureSearchData(productName, locale);
  const outcomes =
    productIndications?.trim() || pico?.outcomes || empty.outcomes;
  const searchKeywords = buildLiteratureSearchKeywords({
    productName,
    model: productMeta?.model,
    indications: productIndications,
    intendedPurpose: productMeta?.intendedPurpose,
    isSterile: productMeta?.isSterile,
    equivalentDeviceNames: productMeta?.equivalentDeviceNames,
  });
  return {
    ...empty,
    ...(pico ?? {}),
    outcomes,
    searchDate: new Date().toISOString().slice(0, 10),
    searchKeywords,
    searchQuery: buildLiteratureSearchQuery({
      productName,
      model: productMeta?.model,
      indications: productIndications,
      intendedPurpose: productMeta?.intendedPurpose,
      isSterile: productMeta?.isSterile,
      equivalentDeviceNames: productMeta?.equivalentDeviceNames,
    }),
  };
}

export async function resetLiteratureSearch(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, companyId: true, name: true, indications: true, model: true, intendedPurpose: true, isSterile: true },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const existingEval = await prisma.clinicalEvaluation.findFirst({
    where: { productId },
    select: { equivalentDevicesDataJson: true },
  });
  const equiv = parseEquivalentDevicesJson(existingEval?.equivalentDevicesDataJson ?? null);
  const equivalentDeviceNames =
    equiv?.devices.map((d) => d.deviceName.trim()).filter(Boolean) ?? [];

  const pico = await suggestPicoForProduct(companyId, productId, locale);
  const literatureData = buildInitialLiteratureData(
    product.name,
    product.indications,
    locale,
    pico,
    {
      model: product.model,
      intendedPurpose: product.intendedPurpose,
      isSterile: product.isSterile,
      equivalentDeviceNames,
    },
  );

  return saveLiteratureData(companyId, productId, literatureData, locale);
}

export async function generatePreparedLiteratureSearch(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
  options: { syncFindings?: boolean; syncArticles?: boolean } = {},
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      riskItems: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const codingCtx = product.riskItems.map((r) => ({
    id: r.id,
    riskNo: r.riskNo,
    tableERef: r.tableERef,
    riskSource: r.riskSource,
  }));

  const existingEval = await prisma.clinicalEvaluation.findFirst({
    where: { productId },
    select: { literatureDataJson: true, equivalentDevicesDataJson: true },
  });
  const existingLit = parseLiteratureSearchJson(existingEval?.literatureDataJson ?? null);
  const equiv = parseEquivalentDevicesJson(existingEval?.equivalentDevicesDataJson ?? null);
  const equivalentDeviceNames =
    equiv?.devices.map((d) => d.deviceName.trim()).filter(Boolean) ?? [];

  const prepared = await buildPreparedLiteratureSearch({
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
    risks: product.riskItems.map((r) => ({
      riskNo: displayRiskNo(r, codingCtx),
      hazardousSituation: r.hazardousSituation,
      harm: r.harm,
    })),
    equivalentDeviceNames,
  });

  const literatureData = mergeLiteratureSearchEvidence(existingLit, prepared);

  let articleSync = null;
  if (options.syncArticles !== false) {
    articleSync = await syncAcceptedArticlesFromStudies({
      companyId,
      productId,
      includedStudies: literatureData.includedStudies ?? [],
      existingArticles: existingLit?.acceptedArticles,
    });
    if (articleSync.articles.length) {
      literatureData.acceptedArticles = articleSync.articles;
    }
  }

  const evaluation = await saveLiteratureData(companyId, productId, literatureData, locale);
  if (!evaluation) return null;

  if (options.syncFindings !== false) {
    const withFindings = await generatePreparedClinicalFindings(companyId, productId, locale, { merge: true });
    return { evaluation: withFindings ?? evaluation, articleSync };
  }

  return { evaluation, articleSync };
}
