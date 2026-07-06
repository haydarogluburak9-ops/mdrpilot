import "server-only";

import { prisma } from "@/lib/db";
import { normalizePlanKey } from "@/lib/billing/plans";

const PLAN_DB_ROWS: Record<
  string,
  { name: string; priceMonthly: number; maxProducts: number; maxSeats: number; monthlyAiTokens: number }
> = {
  starter: { name: "Starter", priceMonthly: 0, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 0 },
  basic: { name: "Basic", priceMonthly: 250, maxProducts: 1, maxSeats: 1, monthlyAiTokens: 500_000 },
  plus: { name: "Plus", priceMonthly: 450, maxProducts: 3, maxSeats: 3, monthlyAiTokens: 1_500_000 },
  pro: { name: "Pro", priceMonthly: 750, maxProducts: 5, maxSeats: 5, monthlyAiTokens: 2_500_000 },
  enterprise: { name: "Enterprise", priceMonthly: 0, maxProducts: 9999, maxSeats: 9999, monthlyAiTokens: 50_000_000 },
};

export async function ensureSubscriptionPlanDb(planKey: string) {
  const key = normalizePlanKey(planKey);
  const row = PLAN_DB_ROWS[key] ?? PLAN_DB_ROWS.plus;
  return prisma.subscriptionPlan.upsert({
    where: { key },
    update: row,
    create: { key, ...row },
  });
}

/** Set company subscription row (no payment). Caller should revoke active demo first if needed. */
export async function setCompanySubscriptionPlan(companyId: string, planKey: string) {
  const plan = await ensureSubscriptionPlanDb(planKey);
  await prisma.company.update({
    where: { id: companyId },
    data: { subscriptionId: plan.id },
  });
  return plan;
}
