"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { StatusBadge } from "@/components/ui/status-badge";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import type { TechnicalSection } from "@/lib/domain/types";
import { isPostMarketSectionKey, POST_MARKET_REGULATORY_REFS } from "@/lib/domain/post-market-mdcg-outlines";
import { PmcfSurveyPanel } from "@/components/pms/pmcf-survey-panel";
import { PmcfSurveyResultsPanel } from "@/components/pms/pmcf-survey-results-panel";
import { formatDate } from "@/lib/utils";

export function PostMarketSectionPanel({
  productId,
  section,
  canEdit,
}: {
  productId: string;
  section?: TechnicalSection;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [missing, setMissing] = useState<string[]>([]);

  if (!section) {
    return <p className="text-sm text-muted-foreground">{t("pms.section.missing")}</p>;
  }

  const sec = section;
  const titleKey = `tf.section.${sec.key}`;
  const title = t(titleKey) === titleKey ? sec.title : t(titleKey);
  const hasContent = Boolean(sec.content?.trim());
  const regulatoryRef = isPostMarketSectionKey(sec.key)
    ? POST_MARKET_REGULATORY_REFS[sec.key][lang === "tr" ? "tr" : "en"]
    : sec.annexRef;

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/generate-section`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionId: sec.id, _locale: lang }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? t("tf.generateError"));
        return;
      }
      setDraftContent(data.content ?? "");
      setMissing(data.missingInformation ?? []);
      setDraftOpen(true);
      router.refresh();
    } catch {
      setError(t("tf.generateError"));
    } finally {
      setLoading(false);
    }
  }

  function downloadSection(exportLang: string, format: string) {
    const a = document.createElement("a");
    a.href = `/api/products/${productId}/section-docx?sectionId=${encodeURIComponent(sec.id)}&lang=${exportLang}&format=${format}`;
    a.rel = "noopener";
    a.click();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-xs text-muted-foreground">{regulatoryRef}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <StatusBadge status={sec.status} />
            <span>{t("tf.col.updated")}: {formatDate(sec.updatedAt)}</span>
          </div>
        </div>
        {canEdit && (
          <div className="flex flex-col items-end gap-1">
            <Button size="sm" variant="outline" className="gap-1.5" disabled={loading} onClick={generate}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? t("risk.mgmt.generate.running") : t("risk.mgmt.generate.btn")}
            </Button>
            {loading && <AiAnalyzingHint className="text-right" />}
          </div>
        )}
      </div>

      {hasContent && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="success" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            {t("risk.mgmt.generate.ready")}
          </Badge>
          <DownloadSelectButton onDownload={({ lang, format }) => downloadSection(lang, format)} />
        </div>
      )}

      {draftOpen && (
        <div className="rounded-lg border border-border bg-muted/20 p-4">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium">{t("risk.mgmt.generate.preview")}</p>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDraftOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">
            {draftContent || sec.content || "—"}
          </pre>
          {missing.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t("risk.mgmt.generate.missing")}: {missing.join(", ")}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}

      {sec.key === "pmcf-plan" && (
        <PmcfSurveyPanel
          productId={productId}
          survey={sec.sectionExtras?.pmcfSurvey}
          canEdit={canEdit}
        />
      )}

      {sec.key === "pmcf-report" && (
        <PmcfSurveyResultsPanel
          productId={productId}
          initialResults={sec.sectionExtras?.pmcfSurveyResults}
          canEdit={canEdit}
        />
      )}
    </div>
  );
}
