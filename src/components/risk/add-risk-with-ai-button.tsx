"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import type { AiResult } from "@/lib/ai/types";
import {
  extractSuggestedRisks,
  hazardExistsInTable,
  type SuggestedRisk,
} from "@/lib/domain/risk-suggestions";

async function fetchRiskAudit(input: Record<string, unknown>, lang: string): Promise<AiResult> {
  const res = await fetch("/api/ai/risk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...input, _locale: lang }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const msg = typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data.result as AiResult;
}

async function bulkCreateRisks(productId: string, items: SuggestedRisk[]) {
  const res = await fetch(`/api/products/${productId}/risk/bulk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "bulk failed");
  }
  return data.count as number;
}

async function resequenceRisks(productId: string) {
  const res = await fetch(`/api/products/${productId}/risk/resequence`, { method: "POST" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(typeof data.error === "string" ? data.error : "resequence failed");
  }
}

async function backfillNarratives(productId: string, locale: "tr" | "en", overwrite = false) {
  const res = await fetch(`/api/products/${productId}/risk-management/backfill-narratives`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ locale, overwrite }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data.error === "string" ? data.error : "backfill failed");
  }
  return (data.updated as number) ?? 0;
}

export function AddRiskWithAiButton({
  productId,
  input,
  existingHazards,
}: {
  productId: string;
  input: Record<string, unknown>;
  existingHazards: string[];
}) {
  const { t, lang } = useI18n();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await fetchRiskAudit(input, lang);
      const suggestions = extractSuggestedRisks(result);
      const locale = lang === "tr" ? "tr" : "en";
      const narrativeContext = {
        productName: typeof input.name === "string" ? input.name : undefined,
        intendedPurpose: typeof input.intendedPurpose === "string" ? input.intendedPurpose : undefined,
        locale,
      };
      const pending = suggestions
        .filter((s) => !hazardExistsInTable(s.hazardousSituation ?? s.hazard, existingHazards))
        .map((s) => ({
          ...s,
          narrativeContext,
          residualAssessment: undefined,
          benefitRiskJustification: undefined,
        }));

      let added = 0;
      if (pending.length > 0) {
        added = await bulkCreateRisks(productId, pending);
      }

      await resequenceRisks(productId);
      const narrativesFilled = await backfillNarratives(productId, locale, true);

      if (added > 0) {
        setFeedback(t("risk.aiAdd.added").replace("{n}", String(added)));
      } else if (narrativesFilled > 0) {
        setFeedback(t("risk.mgmt.fmea.narrativesFilled").replace("{n}", String(narrativesFilled)));
      } else {
        setFeedback(t("risk.aiAdd.none"));
      }
      router.refresh();
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("ai.unknownError");
      setFeedback(msg === "Failed to fetch" ? t("ai.networkError") : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        size="sm"
        variant="outline"
        className="gap-1.5"
        disabled={loading}
        onClick={run}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {loading ? t("risk.aiAdd.running") : t("risk.mgmt.fmea.aiFill")}
      </Button>
      {loading && <AiAnalyzingHint className="text-right" />}
      {feedback && !loading && (
        <p className="max-w-xs text-right text-xs text-muted-foreground">{feedback}</p>
      )}
    </div>
  );
}
