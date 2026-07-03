"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { QmsDoc } from "@/lib/data/queries";

export function QmsBulkAiButton({ docs, canEdit }: { docs: QmsDoc[]; canEdit: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ ok: number; failed: number } | null>(null);

  if (!canEdit) return null;

  const pending = docs.filter((d) => !d.hasContent);

  async function runBulk() {
    if (pending.length === 0) return;
    setRunning(true);
    setError(null);
    setLastResult(null);

    try {
      const res = await fetch("/api/qms/bulk-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale: lang,
          onlyEmpty: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("qms.generate.error"));
        return;
      }
      setLastResult({ ok: data.ok ?? 0, failed: data.failed ?? 0 });
      if ((data.failed ?? 0) > 0) {
        setError(
          t("qms.bulkGenerate.result")
            .replace("{ok}", String(data.ok ?? 0))
            .replace("{failed}", String(data.failed ?? 0)),
        );
      }
      router.refresh();
    } catch {
      setError(t("qms.generate.error"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        variant="outline"
        size="sm"
        className="gap-1.5"
        disabled={running || pending.length === 0}
        onClick={runBulk}
      >
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
        {running
          ? t("qms.bulkGenerate.running")
              .replace("{done}", "…")
              .replace("{total}", String(pending.length))
          : t("qms.bulkGenerate.btn")}
      </Button>
      {running && (
        <p className="max-w-[16rem] text-xs text-muted-foreground">{t("qms.bulkGenerate.serverNote")}</p>
      )}
      {!running && pending.length === 0 && (
        <p className="text-xs text-muted-foreground">{t("qms.bulkGenerate.allDone")}</p>
      )}
      {!running && lastResult && lastResult.failed === 0 && (
        <p className="text-xs text-muted-foreground">
          {t("qms.bulkGenerate.result")
            .replace("{ok}", String(lastResult.ok))
            .replace("{failed}", "0")}
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
