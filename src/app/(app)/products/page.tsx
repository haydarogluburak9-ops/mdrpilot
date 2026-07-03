import { requireCompany } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { ProductsView } from "./products-view";

export default async function ProductsPage() {
  const ctx = await requireCompany();
  const products = await listProductsWithDossier(ctx.companyId);
  return <ProductsView products={products} />;
}
