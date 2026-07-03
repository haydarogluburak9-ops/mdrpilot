import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { CapaView } from "@/app/(app)/capa/capa-view";

export default async function OperationalCapaPage() {
  const ctx = await requireCompany();
  const [products, capas] = await Promise.all([
    listProductsWithDossier(ctx.companyId),
    prisma.cAPA.findMany({
      where: { companyId: ctx.companyId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  return (
    <CapaView
      products={products}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
      capas={capas.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        rootCause: c.rootCause,
        correction: c.correction,
        correctiveAction: c.correctiveAction,
        ownerName: c.ownerName,
        dueDate: c.dueDate ? c.dueDate.toISOString() : null,
        productId: c.productId,
        productName: c.product?.name ?? null,
        referenceNo: c.referenceNo,
        qmsDocumentId: c.qmsDocumentId,
        formContent: c.formContent,
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  );
}
