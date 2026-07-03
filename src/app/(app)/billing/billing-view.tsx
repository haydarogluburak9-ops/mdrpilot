"use client";

import { useState } from "react";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useI18n } from "@/components/providers/i18n-provider";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PLAN_CATALOG, TOKEN_PACKS, canPurchaseTokenPack, formatTokenCount, planAllowsTokenPurchases } from "@/lib/billing/plans";
import type { PlanKey } from "@/lib/billing/plans";
import { PlanPriceBlock } from "@/components/billing/plan-price-block";
import { BillingPeriodToggle } from "@/components/billing/billing-period-toggle";
import type { BillingPeriod } from "@/components/billing/billing-period-toggle";
import type { CompanyPlanUsage } from "@/lib/billing/plan-limits";
import { SalesRequestPanel, type SalesRequestKind } from "@/components/sales/sales-request-panel";

export function BillingView({ usage, isOwner }: { usage: CompanyPlanUsage; isOwner: boolean }) {
  const { t } = useI18n();
  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesKind, setSalesKind] = useState<SalesRequestKind>("purchase");
  const [salesPlan, setSalesPlan] = useState<PlanKey>(usage.planKey as PlanKey);
  const [salesTokenPack, setSalesTokenPack] = useState<{
    key: string;
    label: string;
    priceEur: number;
  } | null>(null);

  function openSales(kind: SalesRequestKind, planKey: PlanKey) {
    setSalesKind(kind);
    setSalesPlan(planKey);
    setSalesTokenPack(null);
    setSalesOpen(true);
  }

  function openTokenPackSales(pack: { key: string; labelKey: string; priceEur: number }) {
    setSalesKind("token_pack");
    setSalesTokenPack({
      key: pack.key,
      label: t(pack.labelKey),
      priceEur: pack.priceEur,
    });
    setSalesOpen(true);
  }

  const tokenAllowance = usage.monthlyAiTokens + usage.extraAiTokens;
  const tokenPct =
    tokenAllowance > 0 ? Math.min(100, Math.round((usage.aiTokensUsed / tokenAllowance) * 100)) : 0;

  return (
    <div>
      <PageHeader title={t("billing.title")} description={t("billing.desc")} />

      <Card className="mb-6">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">{usage.planName}</span>
              <Badge variant="success">{t("billing.active")}</Badge>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {t("billing.usageSummary")
                .replace("{products}", String(usage.productCount))
                .replace("{maxProducts}", String(usage.maxProducts))
                .replace("{seats}", String(usage.seatCount + usage.pendingInvites))
                .replace("{maxSeats}", String(usage.maxSeats))}
            </p>
          </div>
          <Button variant="outline" onClick={() => openSales("purchase", usage.planKey as PlanKey)}>
            {t("billing.managePayment")}
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">{t("billing.tokens.title")}</h3>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t("billing.tokens.desc")}</p>

          {tokenAllowance > 0 ? (
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-sm">
                <span>
                  {t("billing.tokens.used")
                    .replace("{used}", formatTokenCount(usage.aiTokensUsed))
                    .replace("{total}", formatTokenCount(tokenAllowance))}
                </span>
                <span className="text-muted-foreground">
                  {t("billing.tokens.remaining").replace("{n}", formatTokenCount(usage.aiTokensRemaining))}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full rounded-full transition-all ${tokenPct >= 90 ? "bg-destructive" : "bg-primary"}`}
                  style={{ width: `${tokenPct}%` }}
                />
              </div>
              {usage.extraAiTokens > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("billing.tokens.extraBalance").replace("{n}", formatTokenCount(usage.extraAiTokens))}
                </p>
              )}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">{t("billing.tokens.starterHint")}</p>
          )}

          {!planAllowsTokenPurchases(usage.planKey) && (
            <p className="mt-6 text-sm text-muted-foreground">{t("billing.tokens.starterNoPurchase")}</p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {TOKEN_PACKS.map((pack) => {
              const allowed = canPurchaseTokenPack(usage.planKey, pack.key);
              const disabled = !isOwner || !allowed;
              return (
                <div
                  key={pack.key}
                  className={`rounded-xl border border-border bg-card p-4 ${!allowed ? "opacity-80" : ""}`}
                >
                  <p className="font-medium">{t(pack.labelKey)}</p>
                  <p className="mt-1 text-2xl font-bold">€{pack.priceEur}</p>
                  {!allowed && pack.requiredPlanKey === "pro" && (
                    <p className="mt-2 text-xs text-muted-foreground">{t("billing.tokens.proOnly")}</p>
                  )}
                  {!allowed && !planAllowsTokenPurchases(usage.planKey) && (
                    <p className="mt-2 text-xs text-muted-foreground">{t("billing.tokens.upgradeRequired")}</p>
                  )}
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    variant={allowed ? "default" : "outline"}
                    disabled={disabled}
                    onClick={() => allowed && openTokenPackSales(pack)}
                  >
                    {t("billing.tokens.buy")}
                  </Button>
                </div>
              );
            })}
          </div>
          {!isOwner && (
            <p className="mt-3 text-xs text-muted-foreground">{t("billing.tokens.ownerOnly")}</p>
          )}
          <p className="mt-3 text-xs text-muted-foreground">{t("billing.tokens.pilotNote")}</p>
        </CardContent>
      </Card>

      <div id="plans" className="mb-6 space-y-4 scroll-mt-24">
        <p className="text-center text-sm text-muted-foreground">{t("billing.plansIntro")}</p>
        <BillingPeriodToggle
          value={billingPeriod}
          onChange={setBillingPeriod}
          monthlyLabel={t("billing.period.monthly")}
          annualLabel={t("billing.period.annual")}
          savingsHint={t("billing.period.annualHint")}
          className="w-full"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {PLAN_CATALOG.map((p) => {
          const current = p.key === usage.planKey;
          return (
            <Card key={p.key} className={current ? "border-primary ring-1 ring-primary/20" : ""}>
              <CardContent className="p-6">
                {current && <Badge className="mb-3">{t("billing.current")}</Badge>}
                <h3 className="text-lg font-semibold">{t(p.nameKey)}</h3>
                <PlanPriceBlock plan={p} t={t} size="md" billingPeriod={billingPeriod} />
                <ul className="mt-5 space-y-2 text-sm">
                  {p.featureKeys.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" /> {t(f)}
                    </li>
                  ))}
                </ul>
                <Button
                  className="mt-6 w-full"
                  variant={current ? "outline" : "default"}
                  disabled={current}
                  onClick={() => !current && openSales("purchase", p.key)}
                >
                  {current ? t("billing.currentPlan") : `${t("billing.switchTo")} ${t(p.nameKey)}`}
                </Button>
                {p.key === "pro" && !current && (
                  <Button className="mt-2 w-full" variant="outline" onClick={() => openSales("demo_trial", "pro")}>
                    {t("sales.demo.cta")}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{t("billing.stripeSoon")}</p>

      <SalesRequestPanel
        open={salesOpen}
        onClose={() => setSalesOpen(false)}
        kind={salesKind}
        planKey={salesPlan}
        billingPeriod={billingPeriod}
        tokenPackKey={salesTokenPack?.key}
        tokenPackLabel={salesTokenPack?.label}
        tokenPackPriceEur={salesTokenPack?.priceEur}
      />
    </div>
  );
}
