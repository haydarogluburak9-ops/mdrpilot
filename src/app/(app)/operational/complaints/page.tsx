import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { ComplaintsView } from "@/app/(app)/complaints/complaints-view";

export default async function OperationalComplaintsPage() {
  const ctx = await requireCompany();
  const [products, complaints] = await Promise.all([
    listProductsWithDossier(ctx.companyId),
    prisma.complaint.findMany({
      where: { companyId: ctx.companyId },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { receivedAt: "desc" },
    }),
  ]);

  return (
    <ComplaintsView
      products={products}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
      complaints={complaints.map((c) => ({
        id: c.id,
        complaintNo: c.complaintNo,
        title: c.title,
        description: c.description,
        status: c.status,
        capaRequired: c.capaRequired,
        capaRef: c.capaRef,
        ownerName: c.ownerName,
        lotNumber: c.lotNumber,
        productId: c.productId,
        productName: c.product?.name ?? null,
        qmsDocumentId: c.qmsDocumentId,
        formContent: c.formContent,
        receivedAt: c.receivedAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      }))}
    />
  );
}
