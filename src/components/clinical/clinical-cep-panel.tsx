"use client";

import { useMemo, useState } from "react";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DownloadSelectButton } from "@/components/ui/download-select-button";
import { ClinicalSectionPanel } from "@/components/clinical/clinical-section-panel";
import { useI18n } from "@/components/providers/i18n-provider";
import { sectionStatus, type ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";

export function ClinicalCepExportButton({ productId }: { productId: string }) {
  const { t } = useI18n();

  const formatOptions = useMemo(
    () => [
      { value: "docx", label: t("qms.download.formatDocx") },
      { value: "pdf", label: t("qms.download.formatPdf") },
      { value: "zip", label: t("clinical.cep.export.formatZip") },
    ],
    [t],
  );

  return (
    <DownloadSelectButton
      formatOptions={formatOptions}
      hideLangWhenFormat="zip"
      hint={t("clinical.cep.export.zipHint")}
      label={t("clinical.cep.export.label")}
      onDownload={({ lang, format }) => {
        const langParam = format === "zip" ? "both" : lang;
        const a = document.createElement("a");
        a.href = `/api/products/${productId}/clinical-evaluation/cep/export?format=${format}&lang=${langParam}`;
        a.rel = "noopener";
        a.click();
      }}
    />
  );
}

export function ClinicalCepPanel({
  productId,
  evaluation,
  canEdit,
  onSaved,
  onNavigate,
}: {
  productId: string;
  evaluation: ClinicalEvaluationData | null;
  canEdit: boolean;
  onSaved: (evaluation: ClinicalEvaluationData) => void;
  onNavigate: (tab: string) => void;
}) {
  const { t, lang } = useI18n();
  const locale = lang === "tr" ? "tr" : "en";
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const hasPlan = Boolean(evaluation?.plan?.trim() && evaluation.plan.trim().length >= 80);
  const litReady = Boolean(evaluation?.literatureData?.preparedByMedDoc);
  const equivCount = evaluation?.equivalentDevicesData?.devices?.length ?? 0;

  async function generateCep() {
    setGenerating(true);
    setError(null);
    setFeedback(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/cep/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : t("clinical.cep.generateError"));
        return;
      }
      if (body.evaluation) {
        onSaved(body.evaluation);
        setFeedback(t("clinical.cep.generateDone"));
      }
    } catch {
      setError(t("clinical.cep.generateError"));
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-violet-200 bg-violet-50/60 px-4 py-3 dark:border-violet-900 dark:bg-violet-950/30">
        <p className="text-sm font-medium">{t("clinical.cep.title")}</p>
        <p className="mt-1 text-xs text-muted-foreground">{t("clinical.cep.hint")}</p>
        <p className="mt-2 text-[11px] text-muted-foreground">{t("clinical.cep.mdcgRef")}</p>
        {canEdit && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              disabled={generating}
              onClick={generateCep}
              className="gap-1.5"
            >
              {generating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {generating ? t("clinical.cep.generating") : t("clinical.cep.generate")}
            </Button>
            <ClinicalCepExportButton productId={productId} />
          </div>
        )}
        {!canEdit && hasPlan && <ClinicalCepExportButton productId={productId} />}
      </div>

      <div className="grid gap-2 sm:grid-cols-3 text-xs">
        <button
          type="button"
          onClick={() => onNavigate("literature")}
          className="rounded-md border border-border px-3 py-2 text-left hover:bg-muted/50"
        >
          <span className="font-medium">{t("clinical.tab.literature")}</span>
          <p className="text-muted-foreground">
            {litReady ? t("clinical.cep.sourceReady") : t("clinical.cep.sourcePending")}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("equivalents")}
          className="rounded-md border border-border px-3 py-2 text-left hover:bg-muted/50"
        >
          <span className="font-medium">{t("clinical.tab.equivalents")}</span>
          <p className="text-muted-foreground">
            {equivCount > 0
              ? t("clinical.cep.equivCount").replace("{n}", String(equivCount))
              : t("clinical.cep.equivOptional")}
          </p>
        </button>
        <button
          type="button"
          onClick={() => onNavigate("pms")}
          className="rounded-md border border-border px-3 py-2 text-left hover:bg-muted/50"
        >
          <span className="font-medium">{t("clinical.tab.pms")}</span>
          <p className="text-muted-foreground">
            {evaluation?.pmsPmcfInputs?.trim()
              ? t("clinical.cep.sourceReady")
              : t("clinical.cep.sourcePending")}
          </p>
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}

      {hasPlan ? (
        <ClinicalSectionPanel
          productId={productId}
          sectionKey="plan"
          content={evaluation?.plan}
          status={sectionStatus(evaluation, "plan")}
          canEdit={canEdit}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground/50" />
          <p className="mt-2 text-sm text-muted-foreground">{t("clinical.cep.empty")}</p>
          {canEdit && (
            <Button type="button" size="sm" className="mt-3" disabled={generating} onClick={generateCep}>
              {t("clinical.cep.generate")}
            </Button>
          )}
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">{t("clinical.cep.exportNote")}</p>
    </div>
  );
}
