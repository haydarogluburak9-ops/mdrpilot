import { requireCompany } from "@/lib/auth/guards";
import { BackLink } from "@/components/layout/back-link";
import { NewProductForm } from "./new-product-form";

export default async function NewProductPage() {
  await requireCompany();
  return (
    <div>
      <BackLink href="/products" labelKey="products.backToList" />
      <NewProductForm />
    </div>
  );
}
