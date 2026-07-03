"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCopy, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import { formatPmcfSurveyMarkdown, type PmcfSurvey } from "@/lib/domain/pmcf-survey";
import { formatDate } from "@/lib/utils";

export function PmcfSurveyPanel({
  productId,
  survey,
  canEdit,
}: {
  productId: string;
  survey?: PmcfSurvey;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSurvey, setLocalSurvey] = useState<PmcfSurvey | undefined>(survey);
  const [copied, setCopied] = useState(false);

  const active = localSurvey ?? survey;
  const markdown = active ? formatPmcfSurveyMarkdown(active) : "";

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/pmcf-survey/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("pms.survey.generateError"));
        return;
      }
      setLocalSurvey(data.survey as PmcfSurvey);
      router.refresh();
    } catch {
      setError(t("pms.survey.generateError"));
    } finally {
      setLoading(false);
    }
  }

  async function copyMarkdown() {
    if (!markdown) return;
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t("pms.survey.copyError"));
    }
  }

  return (
    <div className="rounded-lg border border-border bg-muted/10 p-4 space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">{t("pms.survey.title")}</h4>
          <p className="text-xs text-muted-foreground mt-0.5">{t("pms.survey.hint")}</p>
          {active?.generatedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {t("pms.survey.generated")}: {formatDate(active.generatedAt)}
            </p>
          )}
        </div>
        {canEdit && (
          <div className="flex flex-col items-end gap-1">
            <Button size="sm" variant="secondary" className="gap-1.5" disabled={loading} onClick={generate}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? t("pms.survey.generating") : active ? t("pms.survey.regenerate") : t("pms.survey.generate")}
            </Button>
            {loading && <AiAnalyzingHint className="text-right" />}
          </div>
        )}
      </div>

      {active ? (
        <>
          <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-3 text-sm text-muted-foreground">
            {markdown}
          </pre>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={copyMarkdown}>
              <ClipboardCopy className="h-3.5 w-3.5" />
              {copied ? t("pms.survey.copied") : t("pms.survey.copy")}
            </Button>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">{t("pms.survey.empty")}</p>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
