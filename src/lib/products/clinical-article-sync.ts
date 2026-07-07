import "server-only";
import type { AcceptedArticleFile } from "@/lib/products/clinical-article-evidence";
import type { IncludedLiteratureStudy } from "@/lib/domain/clinical-literature-model";
import { fetchOpenAccessPdfForPmid, sleep } from "@/lib/integrations/pubmed-open-access-pdf";
import { uploadAcceptedArticlePdf } from "@/lib/products/clinical-article-evidence";

export interface AcceptedArticleSyncResult {
  articles: AcceptedArticleFile[];
  fetched: number;
  alreadyPresent: number;
  unavailable: number;
  attempted: number;
}

const MAX_AUTO_FETCH = 50;
const DELAY_MS = 200;

export function pmidFromStudy(study: IncludedLiteratureStudy): string | null {
  if (study.pmid?.trim()) return study.pmid.replace(/\D/g, "") || null;
  const fromUrl = study.evidenceUrl?.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1];
  return fromUrl ?? null;
}

function hasArticleForStudy(
  articles: AcceptedArticleFile[],
  study: IncludedLiteratureStudy,
  pmid: string | null,
): boolean {
  if (articles.some((a) => a.studyIndex === study.index)) return true;
  if (pmid && articles.some((a) => a.pmid === pmid)) return true;
  return false;
}

export async function syncAcceptedArticlesFromStudies(params: {
  companyId: string;
  productId: string;
  includedStudies: IncludedLiteratureStudy[];
  existingArticles?: AcceptedArticleFile[];
}): Promise<AcceptedArticleSyncResult> {
  const existing = [...(params.existingArticles ?? [])];
  const pubmedStudies = params.includedStudies
    .filter((s) => s.databaseId === "pubmed" || pmidFromStudy(s))
    .sort((a, b) => a.index - b.index);

  let fetched = 0;
  let alreadyPresent = 0;
  let unavailable = 0;
  let attempted = 0;

  for (const study of pubmedStudies) {
    if (attempted >= MAX_AUTO_FETCH) break;

    const pmid = pmidFromStudy(study);
    if (!pmid) continue;

    if (hasArticleForStudy(existing, study, pmid)) {
      alreadyPresent += 1;
      continue;
    }

    attempted += 1;
    const buffer = await fetchOpenAccessPdfForPmid(pmid);
    if (!buffer) {
      unavailable += 1;
      await sleep(DELAY_MS);
      continue;
    }

    const uploaded = await uploadAcceptedArticlePdf({
      companyId: params.companyId,
      productId: params.productId,
      buffer,
      mimeType: "application/pdf",
      fileName: `PMID-${pmid}.pdf`,
      citation: study.citation,
      studyIndex: study.index,
      pmid,
    });

    existing.push(uploaded);
    fetched += 1;
    await sleep(DELAY_MS);
  }

  return {
    articles: existing,
    fetched,
    alreadyPresent,
    unavailable,
    attempted,
  };
}

export async function syncAcceptedArticleForStudy(params: {
  companyId: string;
  productId: string;
  study: IncludedLiteratureStudy;
  existingArticles?: AcceptedArticleFile[];
}): Promise<{
  article: AcceptedArticleFile | null;
  unavailable: boolean;
  alreadyPresent: boolean;
}> {
  const pmid = pmidFromStudy(params.study);
  if (!pmid) {
    return { article: null, unavailable: true, alreadyPresent: false };
  }

  const existing = [...(params.existingArticles ?? [])];
  if (hasArticleForStudy(existing, params.study, pmid)) {
    const found =
      existing.find((a) => a.studyIndex === params.study.index) ||
      existing.find((a) => a.pmid === pmid);
    return { article: found ?? null, unavailable: false, alreadyPresent: true };
  }

  const buffer = await fetchOpenAccessPdfForPmid(pmid);
  if (!buffer) {
    return { article: null, unavailable: true, alreadyPresent: false };
  }

  const uploaded = await uploadAcceptedArticlePdf({
    companyId: params.companyId,
    productId: params.productId,
    buffer,
    mimeType: "application/pdf",
    fileName: `PMID-${pmid}.pdf`,
    citation: params.study.citation,
    studyIndex: params.study.index,
    pmid,
  });

  return { article: uploaded, unavailable: false, alreadyPresent: false };
}
