import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsLite } from "@/lib/data/queries";
import { ConsultantView } from "./consultant-view";

export const dynamic = "force-dynamic";

export default async function ConsultantPage() {
  const ctx = await requireCompany();
  const products = await listProductsLite(ctx.companyId);
  return <ConsultantView products={products} canAnalyze={hasRole(ctx.role, "CONSULTANT")} />;
}
