import { requireCompany } from "@/lib/auth/guards";
import { getCompanyPlanUsage } from "@/lib/billing/plan-limits";
import { BillingView } from "./billing-view";

export default async function BillingPage() {
  const ctx = await requireCompany();
  const usage = await getCompanyPlanUsage(ctx.companyId);
  const isOwner = ctx.role === "OWNER";
  return <BillingView usage={usage} isOwner={isOwner} />;
}
