"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import type { DossierWorkflowStep } from "@/lib/workflow/dossier-checklist";

function storageKey(companyId: string) {
  return `mdrpilot-setup-banner-dismissed:${companyId}`;
}

export function WorkflowWelcomeBanner({
  companyId,
  showSetup,
  steps,
}: {
  companyId: string;
  showSetup: boolean;
  steps: DossierWorkflowStep[];
}) {
  const { t } = useI18n();
  const [dismissed, setDismissed] = useState(true);

  const done = steps.filter((s) => s.status === "done").length;
  const pct = steps.length ? Math.round((done / steps.length) * 100) : 0;
  const next = steps.find((s) => s.status !== "done");

  useEffect(() => {
    const wasDismissed = localStorage.getItem(storageKey(companyId)) === "1";
    setDismissed(wasDismissed && !showSetup);
  }, [companyId, showSetup]);

  if (dismissed || pct >= 85) return null;

  function dismiss() {
    localStorage.setItem(storageKey(companyId), "1");
    setDismissed(true);
  }

  return (
    <div className="mb-4 rounded-2xl border border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="font-semibold">{t("workflow.welcome.title")}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("workflow.welcome.desc")}</p>
            {next && (
              <p className="mt-2 text-sm">
                <span className="font-medium text-primary">{t("workflow.nextStep")}:</span>{" "}
                {t(next.titleKey)}
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("common.cancel")}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {next && (
          <Link href={next.href}>
            <Button size="sm" className="gap-1.5">
              {t("workflow.welcome.cta")} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        )}
        <a href="#dossier-checklist">
          <Button size="sm" variant="outline">
            {t("workflow.welcome.checklist")}
          </Button>
        </a>
      </div>
    </div>
  );
}
