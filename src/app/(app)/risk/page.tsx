import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { RiskView } from "./risk-view";

export default async function RiskPage() {
  const ctx = await requireCompany();
  const products = await listProductsWithDossier(ctx.companyId);
  return <RiskView products={products} canEdit={hasRole(ctx.role, "CONSULTANT")} />;
}
