import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { PmsView } from "./pms-view";

export default async function PmsPage() {
  const ctx = await requireCompany();
  const products = await listProductsWithDossier(ctx.companyId);
  const canEdit = hasRole(ctx.role, "CONSULTANT");
  return <PmsView products={products} canEdit={canEdit} />;
}
