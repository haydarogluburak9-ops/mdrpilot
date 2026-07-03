"use client";

import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { Button } from "@/components/ui/button";
import type { PlanKey } from "@/lib/billing/plans";

export function PlanUpgradePrompt({
  moduleLabel,
  requiredPlanKey,
}: {
  moduleLabel: string;
  requiredPlanKey: PlanKey;
}) {
  const { t } = useI18n();
  const requiredPlanName = t(`plan.${requiredPlanKey}`);

  return (
    <div className="flex min-h-[min(70vh,640px)] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="h-7 w-7" />
      </div>
      <h1 className="mt-6 text-2xl font-bold tracking-tight">{t("plan.upgrade.title")}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        {t("plan.upgrade.desc")
          .replace("{module}", moduleLabel)
          .replace("{plan}", requiredPlanName)}
      </p>
      <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-muted-foreground">
        <Sparkles className="h-4 w-4 text-primary" />
        {t("plan.upgrade.hint")}
      </p>
      <Link href="/billing#plans" className="mt-8">
        <Button size="lg">{t("plan.upgrade.cta")}</Button>
      </Link>
    </div>
  );
}
