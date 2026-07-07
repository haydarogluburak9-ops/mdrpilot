"use client";

import { ArrowDown, AlertCircle } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import type { GsprNextAction } from "@/lib/domain/gspr-next-action";
import { gsprRequirementText } from "@/lib/domain/gspr-text";

const REASON_KEY: Record<GsprNextAction["reason"], string> = {
  missing: "gspr.nextAction.missing",
  no_evidence: "gspr.nextAction.noEvidence",
  no_justification: "gspr.nextAction.noJustification",
  not_approved: "gspr.nextAction.notApproved",
};

export function GsprNextActionBanner({ action }: { action: GsprNextAction }) {
  const { t, lang } = useI18n();
  const { item, reason } = action;
  const summary = gsprRequirementText(item.gsprNo, item.requirementSummary, lang);

  function scrollToRow() {
    const el = document.getElementById(`gspr-row-${item.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    el?.classList.add("ring-2", "ring-primary", "ring-offset-2");
    window.setTimeout(() => el?.classList.remove("ring-2", "ring-primary", "ring-offset-2"), 2500);
  }

  return (
    <div className="mb-4 flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-sm font-semibold text-amber-800 dark:text-amber-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {t("gspr.nextAction.title")}
        </p>
        <p className="mt-1 text-sm">
          <span className="font-medium">GSPR {item.gsprNo}</span>
          <span className="text-muted-foreground"> — {t(REASON_KEY[reason])}</span>
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{summary}</p>
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={scrollToRow}>
        <ArrowDown className="h-3.5 w-3.5" />
        {t("gspr.nextAction.go")}
      </Button>
    </div>
  );
}
