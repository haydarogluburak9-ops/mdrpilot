"use client";

import { useState } from "react";
import { FileText, ExternalLink, FileSpreadsheet, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  RISK_FORM_META,
  riskSectionExportFileName,
} from "@/lib/domain/risk-management-templates";
import type { RiskManagementLinkedFile } from "@/lib/domain/types";

export type RiskSectionKey = "plan" | "report" | "policy" | "annexA" | "fmea";

const TAB_TITLE_KEY: Record<RiskSectionKey, string> = {
  plan: "risk.mgmt.tab.plan",
  report: "risk.mgmt.tab.report",
  policy: "risk.mgmt.tab.policy",
  annexA: "risk.mgmt.tab.annexA",
  fmea: "risk.mgmt.tab.fmea",
};

function triggerExportDownload(jobId: string) {
  const a = document.createElement("a");
  a.href = `/api/exports/${jobId}/download`;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function RiskSectionFileCard({
  productId,
  section,
  content,
  uploadedFile,
  ready,
}: {
  productId: string;
  section: RiskSectionKey;
  content?: string;
  uploadedFile?: RiskManagementLinkedFile;
  /** When set, overrides content-based readiness (e.g. annex rows, FMEA items). */
  ready?: boolean;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "tr" ? "tr" : "en";
  const [exportBusy, setExportBusy] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const metaKey =
    section === "annexA" ? "annexA" : section === "fmea" ? "fmea" : section;
  const meta = RISK_FORM_META[metaKey];
  const displayTitle = locale === "en" ? meta.titleEn : meta.titleTr;
  const fileName = riskSectionExportFileName(section, locale);

  const hasAi = ready ?? Boolean(content?.trim());
  const hasUpload = Boolean(uploadedFile);
  const isReady = hasAi || hasUpload;
  const isFmea = section === "fmea";
  const isWordSection = section === "plan" || section === "report" || section === "policy" || section === "annexA";

  function downloadWord(lang: string) {
    const kind = section === "annexA" ? "annexA" : section;
    const a = document.createElement("a");
    a.href = `/api/products/${productId}/risk-management/docx?kind=${kind}&lang=${lang}`;
    a.rel = "noopener";
    a.click();
  }

  async function downloadFmeaXlsx() {
    setExportBusy(true);
    setExportError(null);
    try {
      const res = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "RISK_XLSX", productId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExportError(data.error ?? t("exports.failed"));
        return;
      }
      triggerExportDownload(data.job.id);
    } catch {
      setExportError(t("exports.networkError"));
    } finally {
      setExportBusy(false);
    }
  }

  return (
    <Card className="border-border bg-muted/15">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">
            {isFmea ? t("risk.wordDocs.pageTitleExcel") : t("risk.wordDocs.pageTitle")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(TAB_TITLE_KEY[section])} · {displayTitle} · {meta.formNo} Rev.{meta.rev}
          </p>
          {isReady ? (
            <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
              {isFmea ? (
                <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              ) : (
                <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              )}
              <span className="break-all">{hasUpload ? uploadedFile!.fileName : fileName}</span>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">—</p>
          )}
          <div className="flex flex-wrap gap-2 pt-0.5">
            {hasAi ? (
              <Badge variant="outline">{t("risk.wordDocs.status.ai")}</Badge>
            ) : hasUpload ? (
              <Badge variant="outline">{t("risk.wordDocs.status.upload")}</Badge>
            ) : (
              <Badge variant="secondary">{t("risk.wordDocs.status.empty")}</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-1.5 sm:items-end">
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {hasAi && isWordSection && (
              <DownloadSelectButton
                formatOptions={[{ value: "docx", label: t("qms.download.formatDocx") }]}
                onDownload={({ lang }) => downloadWord(lang)}
              />
            )}
            {hasAi && isFmea && (
              <DownloadSelectButton
                langOptions={false}
                formatOptions={[{ value: "xlsx", label: t("exports.formatXlsx") }]}
                dialogTitle={t("exports.selectTitle")}
                showEnDocNoHint={false}
                disabled={exportBusy}
                onDownload={async () => {
                  await downloadFmeaXlsx();
                }}
              />
            )}
            {hasUpload && uploadedFile && (
              <a
                href={`/api/files/${uploadedFile.id}/download`}
                className={buttonVariants({ variant: "outline", size: "sm", className: "gap-1.5" })}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("risk.wordDocs.openUpload")}
              </a>
            )}
          </div>
          {exportError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              {exportError}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
