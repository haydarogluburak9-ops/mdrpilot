import {
  CLINICAL_DATABASE_CATALOG,
  databaseLabel,
  type LiteratureSearchData,
} from "@/lib/domain/clinical-literature-model";

const CATALOG_BY_ID_MAP = new Map(CLINICAL_DATABASE_CATALOG.map((d) => [d.id, d]));

function splitPrismaCount(total: number, count: number, index: number): number {
  if (count <= 0) return 0;
  const base = Math.floor(total / count);
  return index === count - 1 ? total - base * (count - 1) : base;
}

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

export function buildLiteratureDatabaseRows(
  data: LiteratureSearchData,
  locale: "tr" | "en",
): LiteratureDatabaseSearchRow[] {
  const tr = locale === "tr";
  const litIds = data.databases.filter((id) => CATALOG_BY_ID_MAP.get(id)?.group === "literature");
  const query = data.searchQuery.trim() || "—";
  const pubmedPdfCount = data.acceptedArticles?.length ?? 0;

  return litIds.map((id, idx) => {
    const label = databaseLabel(id, locale);
    const isPubmed = id === "pubmed";
    const live = isPubmed && data.liveLiteratureSearch === true;
    const includedCount = isPubmed
      ? (data.includedStudies?.length ?? data.prisma.included)
      : splitPrismaCount(data.prisma.included, litIds.length, idx);

    if (live) {
      return {
        databaseId: id,
        label,
        query: data.searchQuery.trim() || query,
        status: "live_done" as const,
        recordsFound: data.pubmedTotal,
        includedCount,
        pdfCount: pubmedPdfCount,
        queryUrl: data.pubmedQueryUrl,
        live: true,
        summary:
          data.literatureSummary?.trim() ||
          (tr
            ? `${label}: ${data.pubmedTotal?.toLocaleString("tr-TR") ?? "—"} kayıt tarandı, ${includedCount} çalışma dahil edildi.`
            : `${label}: ${data.pubmedTotal?.toLocaleString() ?? "—"} records screened, ${includedCount} studies included.`),
      };
    }

    return {
      databaseId: id,
      label,
      query,
      status: data.preparedByMedDoc ? ("manual_required" as const) : ("pending" as const),
      includedCount,
      pdfCount: 0,
      live: false,
      summary: tr
        ? `${label}: abonelikli veri tabanı — MDRpilot ile tarama yapıldıktan sonra ayrı sorgu ve kanıt (ekran görüntüsü/PDF) eklenmelidir.`
        : `${label}: subscription database — run separate query after MDRpilot search and attach evidence (screenshot/PDF).`,
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
