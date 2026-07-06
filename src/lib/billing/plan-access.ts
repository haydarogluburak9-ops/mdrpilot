import type { PlanKey } from "@/lib/billing/plans";
import { normalizePlanKey } from "@/lib/billing/plans";

const PLAN_RANK: Record<PlanKey, number> = {
  starter: 0,
  basic: 1,
  plus: 2,
  pro: 3,
  enterprise: 4,
};

/** Longest-prefix match: pathname → minimum plan required. */
const ROUTE_MIN_PLAN: { prefix: string; minPlan: PlanKey; labelKey: string }[] = [
  { prefix: "/audit-simulator", minPlan: "pro", labelKey: "nav.auditSimulator" },
  { prefix: "/executive", minPlan: "pro", labelKey: "nav.executive" },
  { prefix: "/consultant", minPlan: "plus", labelKey: "nav.consultant" },
  { prefix: "/document-translator", minPlan: "basic", labelKey: "nav.documentTranslator" },
  { prefix: "/exports", minPlan: "basic", labelKey: "nav.exports" },
];

export type PlanAccessRequirement = {
  minPlan: PlanKey;
  labelKey: string;
};

export function planRank(planKey: string): number {
  const key = normalizePlanKey(planKey) as PlanKey;
  return PLAN_RANK[key] ?? 0;
}

export function hasPlanAccess(currentPlanKey: string, minPlan: PlanKey): boolean {
  return planRank(currentPlanKey) >= planRank(minPlan);
}

export function getPlanAccessRequirement(pathname: string): PlanAccessRequirement | null {
  const match = ROUTE_MIN_PLAN.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (!match) return null;
  return { minPlan: match.minPlan, labelKey: match.labelKey };
}

export function isPlanGatedPath(pathname: string, currentPlanKey: string): boolean {
  const req = getPlanAccessRequirement(pathname);
  if (!req) return false;
  return !hasPlanAccess(currentPlanKey, req.minPlan);
}
