"use client";

import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed, ArrowRight, ListChecks } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DossierWorkflowStep } from "@/lib/workflow/dossier-checklist";

function StatusIcon({ status }: { status: DossierWorkflowStep["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />;
  if (status === "in_progress") return <CircleDashed className="h-5 w-5 shrink-0 text-amber-600" />;
  return <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />;
}

export function DossierChecklistPanel({ steps }: { steps: DossierWorkflowStep[] }) {
  const { t } = useI18n();

  const done = steps.filter((s) => s.status === "done").length;
  const total = steps.length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const next = steps.find((s) => s.status !== "done");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListChecks className="h-5 w-5 text-primary" />
              {t("workflow.title")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{t("workflow.desc")}</p>
          </div>
          <Badge variant={pct >= 80 ? "success" : pct >= 40 ? "warning" : "secondary"}>
            {done}/{total} · {pct}%
          </Badge>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {next && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
            <span className="font-medium text-primary">{t("workflow.nextStep")}:</span>
            <span>{t(next.titleKey)}</span>
            <Link href={next.href}>
              <Button size="sm" variant="default" className="ml-auto gap-1 h-7 text-xs">
                {t("workflow.go")} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <ol className="space-y-2">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/50"
              >
                <StatusIcon status={step.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{step.order}.</span>
                    <span className="text-sm font-medium">{t(step.titleKey)}</span>
                    {step.status === "in_progress" && (
                      <Badge variant="warning" className="text-[10px]">{t("workflow.inProgress")}</Badge>
                    )}
                    {step.status === "done" && (
                      <Badge variant="success" className="text-[10px]">{t("workflow.done")}</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{t(step.descKey)}</p>
                  {step.hintKey && step.status !== "done" && (
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-500">{t(step.hintKey)}</p>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}
