"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";

export function QmsBootstrapPackButton({ canEdit }: { canEdit: boolean }) {
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
      const res = await fetch("/api/qms/bootstrap-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang, generateAi: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("qms.bootstrap.failed"));

      setResult(
        t("qms.bootstrap.result")
          .replace("{score}", String(data.coveragePercent ?? 0))
          .replace("{review}", String(data.inReviewCount ?? 0))
          .replace("{content}", String(data.kysWithContent ?? 0)),
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("qms.bootstrap.failed"));
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="default" size="sm" className="gap-1.5" disabled={running} onClick={run}>
        {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
        {running ? t("qms.bootstrap.running") : t("qms.bootstrap.btn")}
      </Button>
      {result && <p className="text-xs text-muted-foreground max-w-[18rem] text-right">{result}</p>}
      {error && <p className="text-xs text-destructive max-w-[18rem] text-right">{error}</p>}
    </div>
  );
}
