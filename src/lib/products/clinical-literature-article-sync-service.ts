import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { saveLiteratureData } from "@/lib/products/clinical-evaluation-service";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";
import {
  syncAcceptedArticleForStudy,
  syncAcceptedArticlesFromStudies,
  type AcceptedArticleSyncResult,
} from "@/lib/products/clinical-article-sync";

export async function syncLiteratureAcceptedArticles(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
): Promise<{ evaluation: ClinicalEvaluationData; articleSync: AcceptedArticleSyncResult } | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, companyId: true },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const existingEval = await prisma.clinicalEvaluation.findFirst({
    where: { productId },
    select: { literatureDataJson: true },
  });
  const literatureData = parseLiteratureSearchJson(existingEval?.literatureDataJson ?? null);
  if (!literatureData) return null;

  const articleSync = await syncAcceptedArticlesFromStudies({
    companyId,
    productId,
    includedStudies: literatureData.includedStudies ?? [],
    existingArticles: literatureData.acceptedArticles,
  });

  if (articleSync.articles.length) {
    literatureData.acceptedArticles = articleSync.articles;
  }
  const evaluation = await saveLiteratureData(companyId, productId, literatureData, locale);
  return evaluation ? { evaluation, articleSync } : null;
}

export async function fetchLiteratureAcceptedArticleForStudy(
  companyId: string,
  productId: string,
  studyIndex: number,
  locale: "tr" | "en" = "tr",
): Promise<{
  evaluation: ClinicalEvaluationData;
  fetched: boolean;
  unavailable: boolean;
  alreadyPresent: boolean;
} | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, companyId: true },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const existingEval = await prisma.clinicalEvaluation.findFirst({
    where: { productId },
    select: { literatureDataJson: true },
  });
  const literatureData = parseLiteratureSearchJson(existingEval?.literatureDataJson ?? null);
  if (!literatureData) return null;

  const study = literatureData.includedStudies?.find((s) => s.index === studyIndex);
  if (!study) return null;

  const result = await syncAcceptedArticleForStudy({
    companyId,
    productId,
    study,
    existingArticles: literatureData.acceptedArticles,
  });

  if (result.article && !result.alreadyPresent) {
    const articles = [...(literatureData.acceptedArticles ?? [])];
    articles.push(result.article);
    literatureData.acceptedArticles = articles;
  }

  const evaluation = await saveLiteratureData(companyId, productId, literatureData, locale);
  if (!evaluation) return null;

  return {
    evaluation,
    fetched: Boolean(result.article && !result.alreadyPresent),
    unavailable: result.unavailable,
    alreadyPresent: result.alreadyPresent,
  };
}
