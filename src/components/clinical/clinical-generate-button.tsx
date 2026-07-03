"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";

export function ClinicalGenerateButton({
  productId,
  onGenerated,
}: {
  productId: string;
  onGenerated: (evaluation: ClinicalEvaluationData) => void;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/draft`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang === "tr" ? "tr" : "en" }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : t("clinical.draftError"));
      }
      if (data.evaluation) onGenerated(data.evaluation);
      setFeedback(t("clinical.draftDone"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("clinical.draftError");
      setFeedback(msg === "Failed to fetch" ? t("ai.networkError") : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button onClick={run} disabled={loading} variant="default" className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {loading ? t("clinical.draftGenerating") : t("clinical.draftGenerate")}
      </Button>
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
