"use client";

import { useMemo, useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";

export function ClinicalExportButton({ productId }: { productId: string }) {
  const { t } = useI18n();

  const formatOptions = useMemo(
    () => [
      { value: "docx", label: t("qms.download.formatDocx") },
      { value: "pdf", label: t("qms.download.formatPdf") },
      { value: "zip", label: t("clinical.export.formatZip") },
    ],
    [t],
  );

  return (
    <DownloadSelectButton
      formatOptions={formatOptions}
      hideLangWhenFormat="zip"
      hint={t("clinical.export.zipHint")}
      onDownload={({ lang, format }) => {
        const langParam = format === "zip" ? "both" : lang;
        const a = document.createElement("a");
        a.href = `/api/products/${productId}/clinical-evaluation/export?format=${format}&lang=${langParam}`;
        a.rel = "noopener";
        a.click();
      }}
    />
  );
}

export function ClinicalPmcfSyncButton({
  productId,
  onSynced,
}: {
  productId: string;
  onSynced: (evaluation: ClinicalEvaluationData) => void;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/sync-pmcf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang === "tr" ? "tr" : "en" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof body.error === "string" ? body.error : t("clinical.pmcfSyncError"));
      }
      if (body.evaluation) onSynced(body.evaluation);
      setFeedback(t("clinical.pmcfSyncDone"));
    } catch (e) {
      setFeedback(e instanceof Error ? e.message : t("clinical.pmcfSyncError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" disabled={loading} onClick={run} className="gap-1.5">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        {t("clinical.pmcfSync")}
      </Button>
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
