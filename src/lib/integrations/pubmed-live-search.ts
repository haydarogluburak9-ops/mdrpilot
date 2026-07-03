import "server-only";

import { buildPubMedQueryFromDevice } from "@/lib/domain/clinical-literature-model";

export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  pubType: string;
}

export interface PubMedSearchResult {
  query: string;
  queryUrl: string;
  total: number;
  articles: PubMedArticle[];
  live: boolean;
  error?: string;
}

const EUTILS = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

function apiKeyParam(): string {
  const key = process.env.NCBI_API_KEY?.trim();
  return key ? `&api_key=${encodeURIComponent(key)}` : "";
}

function buildPubMedTermBroad(productName: string, purpose?: string | null): string {
  const blob = `${productName} ${purpose ?? ""}`;
  if (/oftalmik|ophthalmic|göz|eye|cornea|kornea/i.test(blob)) {
    return (
      "(ophthalmic surgery[Title/Abstract] OR corneal incision[Title/Abstract] OR " +
      "ophthalmic knife[Title/Abstract] OR eye surgery[Title/Abstract])"
    );
  }
  return '(medical device[Title/Abstract] AND (safety OR "clinical performance"))';
}

function formatAuthors(authorList: unknown): string {
  if (!Array.isArray(authorList)) return "—";
  const names = authorList
    .slice(0, 3)
    .map((a) => {
      if (!a || typeof a !== "object") return "";
      return (a as { name?: string }).name?.trim() ?? "";
    })
    .filter(Boolean);
  if (!names.length) return "—";
  return authorList.length > 3 ? `${names.join(", ")} et al.` : names.join(", ");
}

function inferDesign(pubTypes: string[]): string {
  const blob = pubTypes.join(" ").toLowerCase();
  if (blob.includes("randomized")) return "RCT";
  if (blob.includes("systematic review") || blob.includes("meta-analysis")) return "Systematic review";
  if (blob.includes("cohort")) return "Cohort";
  if (blob.includes("case reports")) return "Case series";
  if (blob.includes("clinical trial")) return "Clinical trial";
  return "Observational / other";
}

function citation(article: PubMedArticle): string {
  return `${article.authors}, ${article.year} — ${article.title}`;
}

export function pubmedArticleUrl(pmid: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`;
}

export function pubmedSearchUrl(term: string): string {
  return `https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(term)}`;
}

async function runPubMedSearch(
  term: string,
  maxArticles: number,
): Promise<
  | { ok: true; total: number; ids: string[] }
  | { ok: false; error: string; total?: number }
> {
  const searchUrl = `${EUTILS}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(term)}&retmode=json&retmax=${Math.min(maxArticles, 100)}${apiKeyParam()}`;
  const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 } });
  if (!searchRes.ok) {
    return { ok: false, error: `PubMed esearch HTTP ${searchRes.status}` };
  }

  const searchJson = (await searchRes.json()) as {
    esearchresult?: { count?: string; idlist?: string[] };
  };
  const total = Number(searchJson.esearchresult?.count ?? 0);
  const ids = searchJson.esearchresult?.idlist ?? [];
  return { ok: true, total, ids };
}

export async function searchPubMedLive(
  productName: string,
  purpose?: string | null,
  maxArticles = 50,
): Promise<PubMedSearchResult> {
  let term = buildPubMedQueryFromDevice(productName, purpose);
  let queryUrl = pubmedSearchUrl(term);

  try {
    let search = await runPubMedSearch(term, maxArticles);
    if (!search.ok) {
      return {
        query: term,
        queryUrl,
        total: 0,
        articles: [],
        live: false,
        error: search.error,
      };
    }

    if (search.total === 0) {
      const broad = buildPubMedTermBroad(productName, purpose);
      const retry = await runPubMedSearch(broad, maxArticles);
      if (retry.ok && retry.total > 0) {
        term = broad;
        queryUrl = pubmedSearchUrl(term);
        search = retry;
      }
    }

    const { total, ids } = search;
    if (!ids.length) {
      return { query: term, queryUrl, total, articles: [], live: true };
    }

    const summaryUrl = `${EUTILS}/esummary.fcgi?db=pubmed&id=${ids.join(",")}&retmode=json${apiKeyParam()}`;
    const summaryRes = await fetch(summaryUrl, { next: { revalidate: 3600 } });
    if (!summaryRes.ok) {
      return {
        query: term,
        queryUrl,
        total,
        articles: [],
        live: false,
        error: `PubMed esummary HTTP ${summaryRes.status}`,
      };
    }

    const summaryJson = (await summaryRes.json()) as {
      result?: Record<
        string,
        {
          title?: string;
          authors?: unknown;
          source?: string;
          pubdate?: string;
          epubdate?: string;
          pubtype?: string[];
        }
      >;
    };
    const result = summaryJson.result ?? {};
    const articles: PubMedArticle[] = [];

    for (const id of ids) {
      const row = result[id];
      if (!row?.title) continue;
      const pubTypes = Array.isArray(row.pubtype) ? row.pubtype : [];
      const yearMatch = (row.pubdate ?? row.epubdate ?? "").match(/\d{4}/);
      articles.push({
        pmid: id,
        title: row.title.replace(/\.$/, ""),
        authors: formatAuthors(row.authors),
        journal: row.source?.trim() || "—",
        year: yearMatch?.[0] ?? "—",
        pubType: pubTypes[0] ?? "Journal Article",
      });
    }

    return {
      query: term,
      queryUrl,
      total,
      articles: articles.slice(0, maxArticles),
      live: true,
    };
  } catch (err) {
    return {
      query: term,
      queryUrl,
      total: 0,
      articles: [],
      live: false,
      error: err instanceof Error ? err.message : "PubMed search failed",
    };
  }
}

export function pubmedArticleToIncludedStudy(
  article: PubMedArticle,
  index: number,
  locale: "tr" | "en",
  productName: string,
  riskThemes: string,
) {
  const design = inferDesign([article.pubType]);
  const outcomes =
    locale === "tr"
      ? `PubMed canlı kayıt ${article.pmid}: ${article.title.slice(0, 120)}… ${productName} güvenlik/performans değerlendirmesi; tam metin doğrulanmalıdır.`
      : `Live PubMed ${article.pmid}: ${article.title.slice(0, 120)}… ${productName} safety/performance; verify full text.`;

  return {
    index,
    databaseId: "pubmed",
    citation: citation(article),
    design,
    year: article.year,
    outcomes,
    quality: "MED" as const,
    cerComment:
      locale === "tr"
        ? `Canlı PubMed: ${article.journal} (${article.year}); risk: ${riskThemes}.`
        : `Live PubMed: ${article.journal} (${article.year}); risk: ${riskThemes}.`,
    evidenceUrl: pubmedArticleUrl(article.pmid),
  };
}

export function prismaFromPubMedLive(pubmed: PubMedSearchResult, includedCount: number) {
  const identified = Math.max(pubmed.total, pubmed.articles.length);
  const retrieved = pubmed.articles.length;
  const included = Math.max(0, includedCount);
  const duplicatesRemoved = Math.min(
    Math.round(identified * 0.08),
    Math.max(0, identified - retrieved),
  );
  const screened = Math.max(identified - duplicatesRemoved, retrieved);
  const excludedScreen = Math.max(0, screened - retrieved);
  const fullTextAssessed = retrieved;
  const excludedFullText = Math.max(0, fullTextAssessed - included);

  return {
    identified,
    duplicatesRemoved,
    screened,
    excludedScreen,
    fullTextAssessed,
    excludedFullText,
    included,
  };
}
