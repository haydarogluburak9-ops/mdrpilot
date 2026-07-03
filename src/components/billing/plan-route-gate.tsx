"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/components/providers/i18n-provider";
import { getPlanAccessRequirement, isPlanGatedPath } from "@/lib/billing/plan-access";
import { PlanUpgradePrompt } from "@/components/billing/plan-upgrade-prompt";

export function PlanRouteGate({
  planKey,
  children,
}: {
  planKey: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useI18n();

  if (pathname === "/billing" || pathname.startsWith("/billing/")) {
    return <>{children}</>;
  }

  if (!isPlanGatedPath(pathname, planKey)) {
    return <>{children}</>;
  }

  const req = getPlanAccessRequirement(pathname);
  if (!req) return <>{children}</>;

  return (
    <PlanUpgradePrompt
      moduleLabel={t(req.labelKey)}
      requiredPlanKey={req.minPlan}
    />
  );
}
