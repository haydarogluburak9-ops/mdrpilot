"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import { defaultSurveyResultsPlaceholder } from "@/lib/domain/pmcf-survey";

export function PmcfSurveyResultsPanel({
  productId,
  initialResults,
  canEdit,
}: {
  productId: string;
  initialResults?: string;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const locale = lang === "tr" ? "tr" : "en";
  const [value, setValue] = useState(
    initialResults?.trim() || defaultSurveyResultsPlaceholder(locale),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function save() {
    setLoading(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/products/${productId}/pmcf-survey/results`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results: value }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("pms.survey.resultsSaveError"));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("pms.survey.resultsSaveError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
      <div>
        <h4 className="text-sm font-semibold">{t("pms.survey.resultsTitle")}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{t("pms.survey.resultsHint")}</p>
      </div>

      {canEdit ? (
        <>
          <textarea
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSaved(false);
            }}
            rows={10}
            className="w-full rounded-lg border border-input bg-card px-3 py-2 text-sm font-mono"
            placeholder={t("pms.survey.resultsPlaceholder")}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={loading} onClick={save} className="gap-1.5">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {t("pms.survey.resultsSave")}
            </Button>
            {saved && <span className="text-xs text-muted-foreground">{t("pms.survey.resultsSaved")}</span>}
            {error && <span className="text-xs text-destructive">{error}</span>}
          </div>
        </>
      ) : (
        <pre className="whitespace-pre-wrap text-sm text-muted-foreground">{value}</pre>
      )}
    </div>
  );
}
