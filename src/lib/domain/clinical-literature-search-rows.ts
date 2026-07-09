import {
  CLINICAL_DATABASE_CATALOG,
  databaseLabel,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";
import {
  buildRegistrySearchUrl,
  isSubscriptionLiteratureDb,
} from "@/lib/integrations/registry-deep-links";

const CATALOG_BY_ID_MAP = new Map(CLINICAL_DATABASE_CATALOG.map((d) => [d.id, d]));

export type LiteratureDbSearchStatus = "live_done" | "manual_required" | "pending";

export interface LiteratureDatabaseSearchRow {
  databaseId: string;
  label: string;
  query: string;
  status: LiteratureDbSearchStatus;
  recordsFound?: number;
  includedCount: number;
  pdfCount: number;
  queryUrl?: string;
  summary: string;
  live: boolean;
  /** Subscription / guide+import databases (no free live API). */
  subscription?: boolean;
  screenshotCount: number;
}

export interface IncludedStudySearchRow {
  index: number;
  databaseId: string;
  sourceLabel: string;
  citation: string;
  design: string;
  year: string;
  cerComment?: string;
  evidenceUrl?: string;
  pmid?: string;
  pdfFileName?: string;
  pdfStorageKey?: string;
  hasPdf: boolean;
}

function includedCountForDatabase(data: LiteratureSearchData, databaseId: string): number {
  const studies = data.includedStudies ?? [];
  if (studies.length > 0) {
    return studies.filter((s) => s.databaseId === databaseId).length;
  }
  if (databaseId === "pubmed" && data.liveLiteratureSearch) {
    return data.prisma.included;
  }
  return 0;
}

export function buildLiteratureDatabaseRows(
  data: LiteratureSearchData,
  locale: "tr" | "en",
): LiteratureDatabaseSearchRow[] {
  const tr = locale === "tr";
  const litIds = data.databases.filter((id) => CATALOG_BY_ID_MAP.get(id)?.group === "literature");
  const query = data.searchQuery.trim() || "—";
  const keywords = data.searchKeywords ?? [];
  const pubmedPdfCount = data.acceptedArticles?.length ?? 0;
  const pubmedSsCount = data.evidenceScreenshots?.length ?? 0;

  return litIds.map((id) => {
    const label = databaseLabel(id, locale);
    const isPubmed = id === "pubmed";
    const subscription = isSubscriptionLiteratureDb(id);
    const live = isPubmed && data.liveLiteratureSearch === true;
    const includedCount = includedCountForDatabase(data, id);
    const deepLink =
      (isPubmed && data.pubmedQueryUrl) ||
      buildRegistrySearchUrl(id, data.searchQuery.trim() || query, keywords) ||
      undefined;

    if (live) {
      return {
        databaseId: id,
        label,
        query: data.searchQuery.trim() || query,
        status: "live_done" as const,
        recordsFound: data.pubmedTotal,
        includedCount,
        pdfCount: pubmedPdfCount,
        queryUrl: deepLink,
        live: true,
        subscription: false,
        screenshotCount: pubmedSsCount,
        summary:
          data.literatureSummary?.trim() ||
          (tr
            ? `${label}: ${data.pubmedTotal?.toLocaleString("tr-TR") ?? "—"} kayıt tarandı, ${includedCount} çalışma dahil edildi. Kanıt SS: ${pubmedSsCount}.`
            : `${label}: ${data.pubmedTotal?.toLocaleString() ?? "—"} records screened, ${includedCount} studies included. Evidence SS: ${pubmedSsCount}.`),
      };
    }

    return {
      databaseId: id,
      label,
      query: isPubmed || subscription ? (data.searchQuery.trim() || query) : "—",
      status: data.preparedByMedDoc || subscription ? ("manual_required" as const) : ("pending" as const),
      recordsFound: undefined,
      includedCount,
      pdfCount: isPubmed ? pubmedPdfCount : 0,
      queryUrl: deepLink,
      live: false,
      subscription,
      screenshotCount: isPubmed ? pubmedSsCount : 0,
      summary:
        includedCount > 0
          ? tr
            ? `${label}: ${includedCount} çalışma bu kaynak için kayıtlı (manuel / abonelik tarama).`
            : `${label}: ${includedCount} study/studies recorded for this source (manual / subscription search).`
          : subscription
            ? tr
              ? `${label}: abonelikli veri tabanı — rehber + import; deep-link ile sorgulayın, sonuç SS ekleyin.`
              : `${label}: subscription database — guide + import; open deep-link, attach result screenshot.`
            : tr
              ? `${label}: canlı tarama yapılmadı — ayrı sorgu ve kanıt SS eklenmelidir.`
              : `${label}: not searched live — run a separate query and attach screenshot evidence.`,
    };
  });
}

export function buildIncludedStudyRows(
  data: LiteratureSearchData,
  locale: "tr" | "en",
): IncludedStudySearchRow[] {
  const studies = data.includedStudies ?? [];
  const articles = data.acceptedArticles ?? [];

  return studies.map((study) => {
    const pmid =
      study.pmid?.replace(/\D/g, "") ||
      study.evidenceUrl?.match(/pubmed\.ncbi\.nlm\.nih\.gov\/(\d+)/i)?.[1];
    const article =
      articles.find((a) => a.studyIndex === study.index) ||
      (pmid ? articles.find((a) => a.pmid === pmid) : undefined);

    return {
      index: study.index,
      databaseId: study.databaseId,
      sourceLabel: databaseLabel(study.databaseId, locale),
      citation: study.citation,
      design: study.design,
      year: study.year,
      cerComment: study.cerComment,
      evidenceUrl: study.evidenceUrl,
      pmid,
      pdfFileName: article?.fileName,
      pdfStorageKey: article?.storageKey,
      hasPdf: Boolean(article?.storageKey),
    };
  });
}

export function literatureDbStatusLabel(
  status: LiteratureDbSearchStatus,
  locale: "tr" | "en",
): string {
  const tr = locale === "tr";
  if (status === "live_done") return tr ? "Canlı tarama tamam" : "Live search complete";
  if (status === "manual_required") return tr ? "Manuel / abonelik tarama" : "Manual / subscription search";
  return tr ? "Bekliyor" : "Pending";
}
