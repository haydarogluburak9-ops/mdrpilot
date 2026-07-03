"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

export function QmsOperationalPackButton({ canEdit }: { canEdit: boolean }) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) return null;

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/qms/operational-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang, generateAi: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("qms.operational.failed"));

      setResult(
        t("qms.operational.result")
          .replace("{filled}", String(data.bulkGenerate?.ok ?? 0))
          .replace("{samples}", String(
            (data.sampleRecordsCreated?.length ?? 0) + (data.sampleRecordsUpdated?.length ?? 0),
          ))
          .replace("{content}", String(data.kysWithContent ?? 0))
          .replace("{empty}", String(data.emptyRemaining ?? 0)),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qms.operational.failed"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="outline" size="sm" className="gap-1.5" disabled={running} onClick={run}>
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ClipboardList className="h-3.5 w-3.5" />}
        {running ? t("qms.operational.running") : t("qms.operational.btn")}
      </Button>
      {result && <p className="text-xs text-muted-foreground max-w-[20rem] text-right">{result}</p>}
      {error && <p className="text-xs text-destructive max-w-[20rem] text-right">{error}</p>}
    </div>
  );
}
