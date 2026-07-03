"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";

export function RiskAutoFillButton({
  productId,
  canEdit,
}: {
  productId: string;
  canEdit: boolean;
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" disabled title={t("risk.autoFill.noPermission")}>
        <Sparkles className="h-4 w-4" />
        {t("risk.autoFill.button")}
      </Button>
    );
  }

  async function run() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/products/${productId}/risk-management/auto-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang, fillFmea: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(typeof data.error === "string" ? data.error : t("risk.autoFill.error"));
        return;
      }

      const parts = [
        data.sectionsUpdated
          ? t("risk.autoFill.sections").replace("{n}", String(data.sectionsUpdated))
          : null,
        data.documentsGenerated?.length
          ? t("risk.autoFill.documents").replace("{n}", String(data.documentsGenerated.length))
          : null,
        data.fmeaAdded
          ? t("risk.autoFill.fmea").replace("{n}", String(data.fmeaAdded))
          : null,
        data.narrativesFilled
          ? (lang === "tr"
              ? `${data.narrativesFilled} satır fayda-risk dolduruldu`
              : `${data.narrativesFilled} row(s) benefit-risk filled`)
          : null,
        data.annexFilled ? (lang === "tr" ? "Ek A dolduruldu" : "Annex A filled") : null,
        data.source === "ai" ? t("risk.autoFill.source.ai") : t("risk.autoFill.source.rules"),
      ].filter(Boolean);

      setMessage(parts.length ? parts.join(" · ") : t("risk.autoFill.nothing"));
      router.refresh();
    } catch {
      setMessage(t("risk.autoFill.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button size="sm" variant="outline" className="gap-1.5" disabled={loading} onClick={run}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? t("risk.autoFill.running") : t("risk.autoFill.button")}
      </Button>
      {loading && <AiAnalyzingHint className="text-right" />}
      {message && !loading && (
        <p className="max-w-md text-right text-xs text-muted-foreground">{message}</p>
      )}
    </div>
  );
}
