"use client";

import { useState } from "react";
import { Sparkles, AlertCircle, CheckCircle2, FileText, BookMarked } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Disclaimer } from "@/components/ui/disclaimer";
import { AiAnalyzingHint } from "@/components/ai/ai-analyzing-hint";
import { useI18n } from "@/components/providers/i18n-provider";
import type { AiResult } from "@/lib/domain/types";

const statusVariant: Record<string, React.ComponentProps<typeof Badge>["variant"]> = {
  compliant: "success",
  partial: "warning",
  non_compliant: "destructive",
  unknown: "muted",
};

export function AiPanel({
  promptId,
  input,
  label,
  title,
}: {
  promptId: string;
  input: Record<string, unknown>;
  label?: string;
  title?: string;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiResult | null>(null);
  const [source, setSource] = useState<string>("");
  const [error, setError] = useState<string>("");

  async function run() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch(`/api/ai/${promptId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...input, _locale: lang }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg = typeof data?.error === "string" ? data.error : `Request failed (${res.status})`;
        throw new Error(msg);
      }
      setResult(data.result);
      setSource(data.source);
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("ai.unknownError");
      setError(msg === "Failed to fetch" ? t("ai.networkError") : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border-accent/30">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">{title ?? t("ai.title")}</p>
              <p className="text-xs text-muted-foreground">{t("ai.subtitle")}</p>
            </div>
          </div>
          <Button onClick={run} disabled={loading} variant="accent" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {loading ? t("ai.analyzing") : (label ?? t("common.generateAI"))}
          </Button>
        </div>

        {loading && <AiAnalyzingHint className="mt-3" />}

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {result && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant[result.complianceStatus]}>
                {t(`ai.status.${result.complianceStatus}`)}
              </Badge>
              <Badge variant="muted">{t("ai.confidence")} {(result.confidence * 100).toFixed(0)}%</Badge>
              {source && <Badge variant="outline">{t("ai.engine")}: {source}</Badge>}
            </div>

            <p className="text-sm">{result.summary}</p>

            {result.missingItems.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <AlertCircle className="h-4 w-4 text-destructive" /> {t("ai.missingItems")}
                </p>
                <ul className="space-y-1">
                  {result.missingItems.map((m, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-destructive" />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.recommendedDocuments.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <FileText className="h-4 w-4 text-primary" /> {t("ai.recommendedDocs")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.recommendedDocuments.map((d, i) => (
                    <Badge key={i} variant="default">{d}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.regulatoryReferences.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <BookMarked className="h-4 w-4 text-primary" /> {t("ai.regulatoryRefs")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {result.regulatoryReferences.map((r, i) => (
                    <Badge key={i} variant="secondary">{r}</Badge>
                  ))}
                </div>
              </div>
            )}

            {result.risks.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-warning" /> {t("ai.identifiedRisks")}
                </p>
                <ul className="space-y-1">
                  {result.risks.map((r, i) => (
                    <li key={i} className="text-sm text-muted-foreground">• {r}</li>
                  ))}
                </ul>
              </div>
            )}

            <Disclaimer text={result.disclaimer} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
