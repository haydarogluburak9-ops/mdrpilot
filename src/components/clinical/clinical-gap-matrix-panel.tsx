"use client";

import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/components/providers/i18n-provider";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";
import type { ClinicalGapRow } from "@/lib/domain/clinical-gap-matrix";

function severityVariant(severity: ClinicalGapRow["severity"]) {
  if (severity === "major") return "destructive" as const;
  if (severity === "minor") return "secondary" as const;
  return "outline" as const;
}

export function ClinicalGapMatrixPanel({
  productId,
  evaluation,
  canEdit,
  onUpdated,
}: {
  productId: string;
  evaluation: ClinicalEvaluationData | null;
  canEdit: boolean;
  onUpdated: (ev: ClinicalEvaluationData) => void;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tr = lang === "tr";
  const matrix = evaluation?.gapMatrix;

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/clinical-evaluation/gap-matrix/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: lang }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("clinical.gap.syncError"));
        return;
      }
      if (data.evaluation) onUpdated(data.evaluation);
    } catch {
      setError(t("clinical.gap.syncError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{t("clinical.gap.title")}</h3>
          <p className="text-xs text-muted-foreground">{t("clinical.gap.desc")}</p>
        </div>
        {canEdit && (
          <Button size="sm" variant="outline" className="gap-1.5" disabled={loading} onClick={refresh}>
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t("clinical.gap.refresh")}
          </Button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!matrix?.rows?.length ? (
        <p className="text-sm text-muted-foreground">{t("clinical.gap.empty")}</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">{t("clinical.gap.col.claim")}</th>
                <th className="px-3 py-2">{t("clinical.gap.col.evidence")}</th>
                <th className="px-3 py-2">{t("clinical.gap.col.gap")}</th>
                <th className="px-3 py-2">{t("clinical.gap.col.pmcf")}</th>
                <th className="px-3 py-2">{t("clinical.gap.col.severity")}</th>
              </tr>
            </thead>
            <tbody>
              {matrix.rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-3 py-2 align-top">{tr ? row.claimTr : row.claimEn}</td>
                  <td className="px-3 py-2 align-top text-muted-foreground">{row.evidenceSource}</td>
                  <td className="px-3 py-2 align-top">{tr ? row.gapTr : row.gapEn}</td>
                  <td className="px-3 py-2 align-top text-muted-foreground">
                    {tr ? row.pmcfActionTr : row.pmcfActionEn}
                  </td>
                  <td className="px-3 py-2 align-top">
                    <Badge variant={severityVariant(row.severity)}>
                      {t(`clinical.gap.severity.${row.severity}`)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {matrix.generatedAt && (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              {tr
                ? `Güncelleme: ${matrix.generatedAt.slice(0, 10)}`
                : `Updated: ${matrix.generatedAt.slice(0, 10)}`}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
