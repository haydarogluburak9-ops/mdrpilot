"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import { translateGsprApiError } from "@/lib/domain/gspr-api-errors";

export function GsprAutoFillButton({ productId, canEdit }: { productId: string; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!canEdit) {
    return (
      <Button variant="outline" size="sm" className="gap-1.5" disabled title={t("gspr.autoFill.noPermission")}>
        <Sparkles className="h-4 w-4" />
        {t("gspr.autoFill.button")}
      </Button>
    );
  }

  async function run() {
    setLoading(true);
    setMessage(t("gspr.autoFill.runningAi"));
    setSuccess(false);
    try {
      const res = await fetch(`/api/products/${productId}/gspr/auto-fill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _locale: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage(translateGsprApiError(data.error, t));
        return;
      }
      const parts = [
        data.rowsAdded ? t("gspr.autoFill.rows").replace("{n}", String(data.rowsAdded)) : null,
        data.standardsUpdated ? t("gspr.autoFill.standards").replace("{n}", String(data.standardsUpdated)) : null,
        data.linksCreated ? t("gspr.autoFill.links").replace("{n}", String(data.linksCreated)) : null,
        data.hintsUpdated ? t("gspr.autoFill.hints").replace("{n}", String(data.hintsUpdated)) : null,
        data.justificationsUpdated
          ? t("gspr.autoFill.justifications")
              .replace("{n}", String(data.justificationsUpdated))
              .replace(
                "{source}",
                data.justificationSource === "ai"
                  ? t("gspr.autoFill.source.ai")
                  : t("gspr.autoFill.source.rules"),
              )
          : null,
      ].filter(Boolean);
      setSuccess(true);
      setMessage(parts.length ? parts.join(" · ") : t("gspr.autoFill.nothing"));
      router.refresh();
    } catch {
      setMessage(t("gspr.autoFill.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" className="gap-1.5" onClick={run} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? t("gspr.autoFill.runningShort") : t("gspr.autoFill.button")}
      </Button>
      {loading && <AiAnalyzingHint className="max-w-md text-right" />}
      {message && !loading && (
        <p className={`max-w-md text-right text-xs ${success ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
          {message}
        </p>
      )}
    </div>
  );
}
