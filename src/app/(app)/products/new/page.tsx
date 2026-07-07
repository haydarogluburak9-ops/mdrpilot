import { requireCompany } from "@/lib/auth/guards";
import { BackLink } from "@/components/layout/back-link";
import { NewProductForm } from "./new-product-form";

export default async function NewProductPage({
  searchParams,
}: {
  searchParams?: { welcome?: string };
}) {
  await requireCompany();
  return (
    <div>
      <BackLink href="/products" labelKey="products.backToList" />
      <NewProductForm welcome={searchParams?.welcome === "1"} />
    </div>
  );
}
