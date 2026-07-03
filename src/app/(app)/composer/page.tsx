import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listComposerDocuments, listProductsWithDossier } from "@/lib/data/queries";
import { ComposerView } from "./composer-view";

export const dynamic = "force-dynamic";

export default async function ComposerPage() {
  const ctx = await requireCompany();
  const [documents, products] = await Promise.all([
    listComposerDocuments(ctx.companyId),
    listProductsWithDossier(ctx.companyId),
  ]);

  return (
    <ComposerView
      initialDocuments={documents}
      products={products.map((p) => ({ id: p.id, name: p.name }))}
      canCreate={hasRole(ctx.role, "CONSULTANT")}
    />
  );
}
