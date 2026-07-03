import { Badge } from "@/components/ui/badge";
import {
  PLAN_CATALOG,
  formatPlanPrice,
  hasAnnualDiscount,
  planAnnualListPrice,
  planAnnualPrice,
  planAnnualSavingsPercent,
} from "@/lib/billing/plans";
import type { PlanCatalogEntry } from "@/lib/billing/plans";
import type { BillingPeriod } from "./billing-period-toggle";

export function PlanPriceBlock({
  plan,
  t,
  size = "lg",
  billingPeriod = "monthly",
}: {
  plan: PlanCatalogEntry;
  t: (key: string) => string;
  size?: "lg" | "md";
  billingPeriod?: BillingPeriod;
}) {
  const priceClass = size === "lg" ? "text-4xl" : "text-3xl";

  if (!hasAnnualDiscount(plan.priceMonthly)) {
    return (
      <div className="mt-3 flex items-end gap-1">
        <span className={`${priceClass} font-bold`}>{formatPlanPrice(plan.priceMonthly)}</span>
        {plan.priceMonthly !== null && plan.priceMonthly > 0 && (
          <span className="text-muted-foreground">/mo</span>
        )}
      </div>
    );
  }

  const monthly = plan.priceMonthly;
  const annual = planAnnualPrice(monthly);
  const list = planAnnualListPrice(monthly);
  const savePct = planAnnualSavingsPercent();

  if (billingPeriod === "monthly") {
    return (
      <div className="mt-3 flex items-end gap-1">
        <span className={`${priceClass} font-bold`}>{formatPlanPrice(monthly)}</span>
        <span className="text-muted-foreground">/mo</span>
      </div>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-end gap-2">
        <span className={`${priceClass} font-bold`}>{formatPlanPrice(annual)}</span>
        <span className="pb-1 text-muted-foreground">/yr</span>
        <Badge variant="success" className="mb-1 shrink-0">
          {t("billing.annual.badge").replace("{months}", "2")}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="line-through">{formatPlanPrice(list)}/yr</span>
        <span className="font-medium text-success">
          {t("billing.annual.save").replace("{pct}", String(savePct))}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{t("billing.annual.note")}</p>
    </div>
  );
}

export { PLAN_CATALOG };
