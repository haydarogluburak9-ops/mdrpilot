"use client";

import { useMemo } from "react";
import { AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/providers/i18n-provider";
import {
  computeClinicalReadiness,
  type ClinicalReadinessTab,
} from "@/lib/domain/clinical-readiness";
import type { ClinicalEvaluationData } from "@/lib/domain/clinical-evaluation";

export function ClinicalReadinessBanner({
  evaluation,
  onNavigate,
}: {
  evaluation: ClinicalEvaluationData | null;
  onNavigate: (tab: ClinicalReadinessTab) => void;
}) {
  const { t, lang } = useI18n();
  const readiness = useMemo(() => computeClinicalReadiness(evaluation), [evaluation]);
  const pending = readiness.items.filter((i) => !i.done);
  const tr = lang === "tr";

  if (!evaluation) return null;

  return (
    <div className="mb-4 rounded-lg border border-border bg-muted/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold">{t("clinical.readiness.title")}</p>
          <p className="text-xs text-muted-foreground">{t("clinical.readiness.desc")}</p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-2xl font-bold tabular-nums ${
              readiness.percent >= 80
                ? "text-emerald-600"
                : readiness.percent >= 50
                  ? "text-amber-600"
                  : "text-muted-foreground"
            }`}
          >
            {readiness.percent}%
          </span>
          <span className="text-xs text-muted-foreground">
            {readiness.score}/{readiness.total}
          </span>
        </div>
      </div>

      {pending.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {pending.slice(0, 5).map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Circle className="h-3 w-3 shrink-0" />
                {tr ? item.labelTr : item.labelEn}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={() => onNavigate(item.tab)}
              >
                {t("clinical.readiness.complete")}
              </Button>
            </li>
          ))}
          {pending.length > 5 && (
            <li className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              {t("clinical.readiness.more").replace("{n}", String(pending.length - 5))}
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" />
          {t("clinical.readiness.done")}
        </p>
      )}
    </div>
  );
}
