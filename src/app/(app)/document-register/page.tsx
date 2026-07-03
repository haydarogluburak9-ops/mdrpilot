import { requireCompany } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { loadDocumentRegister } from "@/lib/document-register/load-register";
import { DocumentRegisterView } from "./document-register-view";

export default async function DocumentRegisterPage({
  searchParams,
}: {
  searchParams: { productId?: string };
}) {
  const ctx = await requireCompany();
  const products = await listProductsWithDossier(ctx.companyId);
  const productId = searchParams.productId ?? products[0]?.id;
  const data = await loadDocumentRegister(ctx.companyId, productId, "tr");

  return (
    <DocumentRegisterView
      data={data}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
      selectedProductId={productId}
    />
  );
}
