"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Save, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";

export function RiskFmeaBenefitRisk({
  productId,
  initialText,
  canEdit,
  hasRisks,
}: {
  productId: string;
  initialText?: string;
  canEdit: boolean;
  hasRisks: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [text, setText] = useState(initialText ?? "");
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setText(initialText ?? "");
  }, [initialText]);

  async function save(next = text) {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fmeaBenefitRiskAnalysis: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("evidence.networkError"));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("evidence.networkError"));
    } finally {
      setSaving(false);
    }
  }

  async function generate() {
    setAiLoading(true);
    setError(null);
    try {
      const backfillRes = await fetch(
        `/api/products/${productId}/risk-management/backfill-narratives`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: lang === "en" ? "en" : "tr", overwrite: true }),
        },
      );
      if (!backfillRes.ok) {
        const backfillData = await backfillRes.json().catch(() => ({}));
        setError(typeof backfillData.error === "string" ? backfillData.error : t("risk.fmea.benefitRisk.error"));
        return;
      }

      const res = await fetch(`/api/products/${productId}/risk-management/fmea-benefit-risk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("risk.fmea.benefitRisk.error"));
        return;
      }
      if (typeof data.text === "string") setText(data.text);
      setSaved(true);
      router.refresh();
    } catch {
      setError(t("risk.fmea.benefitRisk.error"));
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {canEdit && hasRisks && (
        <div className="flex justify-end">
          <div className="flex flex-col items-end gap-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={aiLoading || saving}
              onClick={generate}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiLoading ? t("risk.fmea.benefitRisk.generating") : t("risk.fmea.benefitRisk.generate")}
            </Button>
            {aiLoading && <AiAnalyzingHint className="text-right" />}
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full table-fixed text-sm">
          <thead>
            <tr className="bg-cyan-600/90 text-center text-xs uppercase tracking-wide text-white">
              <th className="px-3 py-2 font-medium">{t("risk.tpl.benefitRisk")}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="px-3 py-3 align-top">
                {canEdit ? (
                  <Textarea
                    value={text}
                    onChange={(e) => {
                      setText(e.target.value);
                      setSaved(false);
                    }}
                    rows={8}
                    className="min-h-[160px] w-full min-w-0 text-sm"
                    placeholder={t("risk.fmea.benefitRisk.placeholder")}
                  />
                ) : (
                  <p className="whitespace-pre-wrap text-muted-foreground">{text || "—"}</p>
                )}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" className="gap-1.5" onClick={() => save()} disabled={saving || aiLoading}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("risk.mgmt.save")}
          </Button>
          {saved && <span className="text-sm text-muted-foreground">{t("risk.mgmt.saved")}</span>}
          {!hasRisks && (
            <span className="text-sm text-muted-foreground">{t("risk.fmea.benefitRisk.needsRisks")}</span>
          )}
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
