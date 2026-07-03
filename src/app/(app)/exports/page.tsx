import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { listExports } from "@/lib/exports/export-service";
import { ExportsView } from "./exports-view";

export const dynamic = "force-dynamic";

export default async function ExportsPage() {
  const ctx = await requireCompany();
  const [products, exports] = await Promise.all([
    listProductsWithDossier(ctx.companyId),
    listExports(ctx.companyId),
  ]);

  return (
    <ExportsView
      products={products.map((p) => ({ id: p.id, name: p.name }))}
      initialExports={exports}
      canCreate={hasRole(ctx.role, "CONSULTANT")}
      canDelete={hasRole(ctx.role, "QUALITY_MANAGER")}
    />
  );
}
