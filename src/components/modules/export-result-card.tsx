"use client";

import { useState } from "react";
import Link from "next/link";
import { Download, Loader2, CheckCircle2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { downloadExportJob } from "@/lib/exports/download-client";

function fmtSize(b: number | null | undefined) {
  if (!b) return "";
  return b > 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`;
}

export function ExportResultCard({
  jobId,
  fileName,
  sizeBytes,
  downloadLabel,
}: {
  jobId: string;
  fileName: string | null;
  sizeBytes?: number | null;
  downloadLabel: string;
}) {
  const { t } = useI18n();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function handleDownload() {
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadExportJob(jobId, fileName);
    } catch {
      setDownloadError(t("ifu.downloadError"));
    } finally {
      setDownloading(false);
    }
  }

  const size = fmtSize(sizeBytes);

  return (
    <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">{t("ifu.downloadReady")}</p>
            <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{fileName ?? jobId}</span>
              {size && <span className="shrink-0">· {size}</span>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" className="gap-1.5" disabled={downloading} onClick={handleDownload}>
              {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
              {downloadLabel}
            </Button>
            <Link href="/exports" className="text-xs text-primary hover:underline">
              {t("ifu.exportsLink")}
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("ifu.downloadHint")}</p>
          {downloadError && <p className="text-xs text-destructive">{downloadError}</p>}
        </div>
      </div>
    </div>
  );
}
