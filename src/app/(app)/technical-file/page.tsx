import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { TechnicalFileView } from "./technical-file-view";

export default async function TechnicalFilePage() {
  const ctx = await requireCompany();
  const products = await listProductsWithDossier(ctx.companyId);
  const canEdit = hasRole(ctx.role, "CONSULTANT");
  return <TechnicalFileView products={products} canEdit={canEdit} />;
}
