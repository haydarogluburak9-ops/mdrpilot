import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listStandards } from "@/lib/data/queries";
import { StandardsView } from "./standards-view";

export const dynamic = "force-dynamic";

export default async function StandardsPage() {
  const ctx = await requireCompany();
  const standards = await listStandards(ctx.companyId);
  return <StandardsView standards={standards} canManage={hasRole(ctx.role, "CONSULTANT")} />;
}
