"use client";

import Link from "next/link";
import { CheckCircle2, Circle, CircleDashed, ListChecks, ArrowRight } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DossierWorkflowStep } from "@/lib/workflow/dossier-checklist";

function StatusIcon({ status }: { status: DossierWorkflowStep["status"] }) {
  if (status === "done") return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />;
  if (status === "in_progress") return <CircleDashed className="h-4 w-4 shrink-0 text-amber-600" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function ProductWorkflowMini({ steps }: { steps: DossierWorkflowStep[] }) {
  const { t } = useI18n();
  const done = steps.filter((s) => s.status === "done").length;
  const next = steps.find((s) => s.status !== "done");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-primary" />
            {t("workflow.product.title")}
          </span>
          <Badge variant="secondary" className="text-[10px]">
            {done}/{steps.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {next && (
          <Link
            href={next.href}
            className="flex items-center justify-between gap-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-2 text-xs transition-colors hover:bg-primary/10"
          >
            <span>
              <span className="font-medium text-primary">{t("workflow.nextStep")}: </span>
              {t(next.titleKey)}
            </span>
            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-primary" />
          </Link>
        )}
        <ul className="space-y-1">
          {steps.map((step) => (
            <li key={step.id}>
              <Link
                href={step.href}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-muted/60"
              >
                <StatusIcon status={step.status} />
                <span className={step.status === "done" ? "text-muted-foreground line-through" : ""}>
                  {t(step.titleKey)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/demo/tour#dossier-checklist" className="block pt-1 text-[11px] text-primary hover:underline">
          {t("workflow.product.fullChecklist")}
        </Link>
      </CardContent>
    </Card>
  );
}
