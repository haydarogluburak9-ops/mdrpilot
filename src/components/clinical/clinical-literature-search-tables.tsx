"use client";

import { Download, ExternalLink, FileText, Loader2, Wand2 } from "lucide-react";
import { externalLinksForPmid } from "@/lib/domain/literature-article-external-links";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  buildIncludedStudyRows,
  buildLiteratureDatabaseRows,
  literatureDbStatusLabel,
  type IncludedStudySearchRow,
  type LiteratureDatabaseSearchRow,
} from "@/lib/domain/clinical-literature-search-rows";
import {
  databaseLabel,
  registryStatusExportLabel,
  registryStatusShortLabel,
  type LiteratureSearchData,
  type RegistrySearchResult,
  type RegistrySearchStatus,
} from "@/lib/domain/clinical-literature-model";

const STATUS_UI_FOOTNOTE: Record<RegistrySearchStatus, string> = {
  no_signal: "¹",
  review_required: "²",
  records_found: "³",
};

function registryStatusClass(status: RegistrySearchStatus): string {
  if (status === "records_found") {
    return "bg-red-100 text-red-900 dark:bg-red-950/50 dark:text-red-100";
  }
  if (status === "review_required") {
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100";
  }
  return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100";
}

function literatureStatusClass(status: LiteratureDatabaseSearchRow["status"]): string {
  if (status === "live_done") {
    return "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100";
  }
  if (status === "manual_required") {
    return "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-100";
  }
  return "bg-muted text-muted-foreground";
}

function articlePdfUrl(productId: string, storageKey: string) {
  return `/api/products/${productId}/clinical-evaluation/literature/articles?key=${encodeURIComponent(storageKey)}`;
}

export function LiteratureDatabaseTable({
  data,
}: {
  data: LiteratureSearchData;
  productId: string;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "tr" ? "tr" : "en";
  const rows = buildLiteratureDatabaseRows(data, locale);
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.source")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.query")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.status")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.col.records")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.col.included")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.col.file")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.summary")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.databaseId} className="border-b border-border last:border-0 align-top">
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span>{row.label}</span>
                  {row.live && (
                    <span className="inline-flex w-fit rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
                      {t("clinical.lit.livePubmed")}
                    </span>
                  )}
                  {row.subscription && (
                    <span className="inline-flex w-fit rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-950 dark:bg-amber-950/50 dark:text-amber-100">
                      {t("clinical.lit.subscriptionDb")}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 font-mono text-[11px] max-w-[140px] break-all">
                {row.query}
                {row.queryUrl && (
                  <a
                    href={row.queryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 block text-primary underline"
                  >
                    {row.live
                      ? t("clinical.lit.openPubmedQuery")
                      : t("clinical.lit.openDbSearch")}
                  </a>
                )}
              </td>
              <td className="px-3 py-2">
                <p className={`rounded-md px-2 py-1.5 text-[11px] ${literatureStatusClass(row.status)}`}>
                  {literatureDbStatusLabel(row.status, locale)}
                </p>
              </td>
              <td className="px-3 py-2 text-muted-foreground">
                {row.recordsFound != null ? row.recordsFound.toLocaleString(locale) : "—"}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.includedCount}</td>
              <td className="px-3 py-2 text-[11px]">
                {row.databaseId === "pubmed" ? (
                  <div className="space-y-0.5">
                    {row.pdfCount > 0 ? (
                      <span className="block text-emerald-700 dark:text-emerald-400">
                        {t("clinical.lit.pdfCountBadge")
                          .replace("{n}", String(row.pdfCount))
                          .replace("{total}", String(row.includedCount))}
                      </span>
                    ) : (
                      <span className="block text-muted-foreground">{t("clinical.lit.noPdfYet")}</span>
                    )}
                    <span className="block text-muted-foreground">
                      {t("clinical.lit.ssCountBadge").replace("{n}", String(row.screenshotCount))}
                    </span>
                  </div>
                ) : row.subscription ? (
                  <span className="text-muted-foreground">{t("clinical.lit.subscriptionImportHint")}</span>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground">{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function IncludedStudiesTable({
  data,
  productId,
  canEdit,
  onUploadForStudy,
  onFetchPdfForStudy,
  uploadingStudyIndex,
  fetchingPdfStudyIndex,
}: {
  data: LiteratureSearchData;
  productId: string;
  canEdit: boolean;
  onUploadForStudy?: (studyIndex: number, file: File) => void;
  onFetchPdfForStudy?: (studyIndex: number) => void;
  uploadingStudyIndex?: number | null;
  fetchingPdfStudyIndex?: number | null;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "tr" ? "tr" : "en";
  const rows = buildIncludedStudyRows(data, locale);
  if (!rows.length) return null;

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[800px] text-left text-xs">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.source")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.col.citation")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.col.design")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.col.file")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.cerComment")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <IncludedStudyRow
              key={row.index}
              row={row}
              productId={productId}
              canEdit={canEdit}
              onUpload={onUploadForStudy}
              onFetchPdf={onFetchPdfForStudy}
              uploading={uploadingStudyIndex === row.index}
              fetchingPdf={fetchingPdfStudyIndex === row.index}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IncludedStudyRow({
  row,
  productId,
  canEdit,
  onUpload,
  onFetchPdf,
  uploading,
  fetchingPdf,
}: {
  row: IncludedStudySearchRow;
  productId: string;
  canEdit: boolean;
  onUpload?: (studyIndex: number, file: File) => void;
  onFetchPdf?: (studyIndex: number) => void;
  uploading: boolean;
  fetchingPdf: boolean;
}) {
  const { t } = useI18n();
  const externalLinks = row.pmid ? externalLinksForPmid(row.pmid) : null;

  return (
    <tr className="border-b border-border last:border-0 align-top">
      <td className="px-3 py-2 font-medium">{row.index}</td>
      <td className="px-3 py-2 whitespace-nowrap">{row.sourceLabel}</td>
      <td className="px-3 py-2 max-w-[240px]">
        <p className="line-clamp-3">{row.citation}</p>
        {row.evidenceUrl && (
          <a
            href={row.evidenceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-primary underline"
          >
            {row.pmid ? `PMID ${row.pmid}` : t("clinical.lit.registryCol.openRegistry")}
          </a>
        )}
      </td>
      <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
        {row.design}
        {row.year ? ` (${row.year})` : ""}
      </td>
      <td className="px-3 py-2 text-[11px]">
        {row.hasPdf && row.pdfStorageKey ? (
          <a
            href={articlePdfUrl(productId, row.pdfStorageKey)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary underline"
          >
            <FileText className="h-3.5 w-3.5" />
            {row.pdfFileName ?? "PDF"}
          </a>
        ) : (
          <div className="space-y-1.5">
            <span className="text-muted-foreground">{t("clinical.lit.noPdfYet")}</span>
            {canEdit && row.pmid && onFetchPdf && (
              <button
                type="button"
                disabled={fetchingPdf || uploading}
                onClick={() => onFetchPdf(row.index)}
                className="flex items-center gap-1 text-primary underline disabled:opacity-50"
              >
                {fetchingPdf ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Wand2 className="h-3 w-3" />
                )}
                {t("clinical.lit.tryAutoFetchPdf")}
              </button>
            )}
            {canEdit && onUpload && (
              <label className="flex cursor-pointer items-center gap-1 text-primary underline">
                {uploading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <FileText className="h-3 w-3" />
                )}
                {t("clinical.lit.uploadStudyPdf")}
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  disabled={uploading || fetchingPdf}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onUpload(row.index, file);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
            {externalLinks && (
              <div className="space-y-0.5 pt-0.5">
                <p className="text-[10px] text-muted-foreground">{t("clinical.lit.findPdfLinks")}</p>
                <a
                  href={externalLinks.europePmcPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline"
                >
                  <Download className="h-3 w-3 shrink-0" />
                  {t("clinical.lit.downloadEuropePmcPdf")}
                </a>
                <a
                  href={externalLinks.europePmcArticle}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {t("clinical.lit.openEuropePmc")}
                </a>
                <a
                  href={externalLinks.pubmed}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary underline"
                >
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {t("clinical.lit.openPubMed")}
                </a>
              </div>
            )}
          </div>
        )}
      </td>
      <td className="px-3 py-2 text-muted-foreground max-w-[180px]">{row.cerComment || "—"}</td>
    </tr>
  );
}

export function RegistryResultsTable({
  rows,
  locale,
  evidenceSlot,
}: {
  rows: RegistrySearchResult[];
  locale: "tr" | "en";
  evidenceSlot?: (row: RegistrySearchResult) => React.ReactNode;
}) {
  const { t } = useI18n();

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-border bg-muted/40">
          <tr>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.source")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.query")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.status")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.col.file")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.cerComment")}</th>
            <th className="px-3 py-2 font-medium">{t("clinical.lit.registryCol.summary")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.registryId} className="border-b border-border last:border-0 align-top">
              <td className="px-3 py-2 font-medium whitespace-nowrap">
                <div className="flex flex-col gap-1">
                  <span>{databaseLabel(row.registryId, locale)}</span>
                  {row.liveVerified && (
                    <span className="inline-flex w-fit rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
                      {t("clinical.lit.liveRegistry")}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 font-mono text-[11px] max-w-[140px] break-all">{row.query}</td>
              <td className="px-3 py-2">
                <p
                  className={`rounded-md px-2 py-1.5 text-[11px] ${registryStatusClass(row.status)}`}
                  title={registryStatusExportLabel(row.status, locale)}
                >
                  {registryStatusShortLabel(row.status, locale)}
                  <span className="ml-0.5 opacity-70">{STATUS_UI_FOOTNOTE[row.status]}</span>
                </p>
              </td>
              <td className="px-3 py-2 text-[11px] space-y-1">
                {evidenceSlot ? (
                  evidenceSlot(row)
                ) : row.evidenceUrl ? (
                  <a
                    href={row.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline break-all block"
                  >
                    {t("clinical.lit.registryCol.openRegistry")}
                  </a>
                ) : (
                  <span className="text-muted-foreground">{t("clinical.lit.noPdfYet")}</span>
                )}
              </td>
              <td className="px-3 py-2 text-muted-foreground max-w-[180px]">{row.cerComment || "—"}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.summary}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
