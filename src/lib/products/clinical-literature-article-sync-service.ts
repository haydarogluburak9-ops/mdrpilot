import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { saveLiteratureData } from "@/lib/products/clinical-evaluation-service";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";
import {
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

  literatureData.acceptedArticles = articleSync.articles.length ? articleSync.articles : undefined;
  const evaluation = await saveLiteratureData(companyId, productId, literatureData, locale);
  return evaluation ? { evaluation, articleSync } : null;
}
