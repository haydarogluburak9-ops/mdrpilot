import { notFound } from "next/navigation";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { getProductForCompany } from "@/lib/data/queries";
import { NotFoundError } from "@/lib/auth/errors";
import { BackLink } from "@/components/layout/back-link";
import { EditProductForm } from "./edit-product-form";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const ctx = await requireCompany();
  if (!hasRole(ctx.role, "CONSULTANT")) notFound();

  let product = null;
  try {
    product = await getProductForCompany(ctx.companyId, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  if (!product) notFound();

  const canDelete = hasRole(ctx.role, "QUALITY_MANAGER");

  return (
    <div>
      <BackLink href={`/products/${product.id}`} labelKey="products.edit.back" />
      <EditProductForm product={product} canDelete={canDelete} />
    </div>
  );
}
