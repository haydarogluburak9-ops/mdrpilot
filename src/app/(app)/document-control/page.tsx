import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { DocumentControlPageView } from "./document-control-page-view";

export default async function DocumentControlPage() {
  const ctx = await requireCompany();
  const products = await listProductsWithDossier(ctx.companyId);

  return (
    <DocumentControlPageView
      products={products.map((p) => ({ id: p.id, name: p.name }))}
      canApprove={hasRole(ctx.role, "QUALITY_MANAGER")}
      canWorkflow={hasRole(ctx.role, "CONSULTANT")}
    />
  );
}
