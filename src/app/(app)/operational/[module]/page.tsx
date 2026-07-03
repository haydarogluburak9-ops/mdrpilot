import { notFound } from "next/navigation";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { getModuleDef } from "@/lib/operational/modules";
import { listOperationalRecords } from "@/lib/operational/record-service";
import { OperationalModuleView } from "@/components/operational/operational-module-view";

export default async function OperationalModulePage({
  params,
  searchParams,
}: {
  params: { module: string };
  searchParams?: { productId?: string };
}) {
  const ctx = await requireCompany();
  const def = getModuleDef(params.module);
  if (!def) notFound();
  if (params.module === "internal-audit") {
    const { redirect } = await import("next/navigation");
    redirect("/operational/internal-audit");
  }

  const productId = searchParams?.productId?.trim() || undefined;

  const [products, records] = await Promise.all([
    listProductsWithDossier(ctx.companyId),
    listOperationalRecords(ctx.companyId, def.kind, productId),
  ]);

  return (
    <OperationalModuleView
      def={def}
      records={records}
      products={products}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
      initialProductId={productId}
    />
  );
}
