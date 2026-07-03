"use client";

import { riskLevelFromScore } from "@/lib/domain/constants";
import { useI18n } from "@/components/providers/i18n-provider";
import type { RiskItem, RiskLevel } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const levelBg: Record<RiskLevel, string> = {
  LOW: "bg-success/70",
  MEDIUM: "bg-warning/70",
  HIGH: "bg-destructive/60",
  CRITICAL: "bg-destructive",
};

export function RiskMatrix({
  risks,
  mode = "initial",
}: {
  risks: RiskItem[];
  mode?: "initial" | "residual";
}) {
  const { t } = useI18n();
  // Build 5x5 grid: rows = severity (5 top), cols = probability (1..5)
  function countAt(sev: number, prob: number): number {
    return risks.filter((r) => {
      const s = mode === "initial" ? r.initialSeverity : r.residualSeverity;
      const p = mode === "initial" ? r.initialProbability : r.residualProbability;
      return s === sev && p === prob;
    }).length;
  }

  const severities = [5, 4, 3, 2, 1];
  const probabilities = [1, 2, 3, 4, 5];

  return (
    <div className="inline-block">
      <div className="flex">
        <div className="flex w-6 items-center justify-center">
          <span className="-rotate-90 whitespace-nowrap text-xs font-medium text-muted-foreground">
            {t("risk.axis.severity")} →
          </span>
        </div>
        <div>
          <div className="grid grid-cols-5 gap-1">
            {severities.map((sev) =>
              probabilities.map((prob) => {
                const level = riskLevelFromScore(sev, prob);
                const count = countAt(sev, prob);
                return (
                  <div
                    key={`${sev}-${prob}`}
                    title={`${t("risk.axis.severity")} ${sev} × ${t("risk.axis.probability")} ${prob} — ${t(`risk.level.${level}`)}`}
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-md text-sm font-bold text-white/95",
                      levelBg[level],
                    )}
                  >
                    {count > 0 ? count : ""}
                  </div>
                );
              }),
            )}
          </div>
          <div className="mt-1 grid grid-cols-5 gap-1">
            {probabilities.map((p) => (
              <div key={p} className="text-center text-xs text-muted-foreground">
                {p}
              </div>
            ))}
          </div>
          <p className="mt-1 text-center text-xs font-medium text-muted-foreground">{t("risk.axis.probability")} →</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs">
        {(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as RiskLevel[]).map((l) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className={cn("h-3 w-3 rounded", levelBg[l])} />
            {t(`risk.level.${l}`)}
          </div>
        ))}
      </div>
    </div>
  );
}
