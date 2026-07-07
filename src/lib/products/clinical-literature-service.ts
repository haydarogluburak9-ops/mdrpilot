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

export function buildInitialLiteratureData(
  productName: string,
  productIndications: string | null | undefined,
  locale: "tr" | "en",
  pico: Awaited<ReturnType<typeof suggestPicoForProduct>>,
): LiteratureSearchData {
  const empty = emptyLiteratureSearchData(productName, locale);
  const outcomes =
    productIndications?.trim() || pico?.outcomes || empty.outcomes;
  return {
    ...empty,
    ...(pico ?? {}),
    outcomes,
    searchDate: new Date().toISOString().slice(0, 10),
  };
}

export async function resetLiteratureSearch(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, companyId: true, name: true, indications: true },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const pico = await suggestPicoForProduct(companyId, productId, locale);
  const literatureData = buildInitialLiteratureData(
    product.name,
    product.indications,
    locale,
    pico,
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
    select: { literatureDataJson: true },
  });
  const existingLit = parseLiteratureSearchJson(existingEval?.literatureDataJson ?? null);

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
