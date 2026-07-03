import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsLite } from "@/lib/data/queries";
import { AuditListView } from "./audit-list-view";

export const dynamic = "force-dynamic";

export default async function AuditSimulatorPage() {
  const ctx = await requireCompany();
  const products = await listProductsLite(ctx.companyId);
  return <AuditListView products={products} canStart={hasRole(ctx.role, "CONSULTANT")} />;
}
