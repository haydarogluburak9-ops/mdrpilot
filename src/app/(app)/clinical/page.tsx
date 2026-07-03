import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { ClinicalView } from "./clinical-view";

export default async function ClinicalPage() {
  const ctx = await requireCompany();
  const products = await listProductsWithDossier(ctx.companyId);
  const canEdit = hasRole(ctx.role, "CONSULTANT");
  const canApprove = hasRole(ctx.role, "QUALITY_MANAGER");
  return <ClinicalView products={products} canEdit={canEdit} canApprove={canApprove} />;
}
