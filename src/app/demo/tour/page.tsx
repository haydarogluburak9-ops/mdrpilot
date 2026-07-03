import { requireCompany } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { DemoTourView } from "../demo-tour-view";

export const dynamic = "force-dynamic";

export default async function DemoTourPage() {
  const ctx = await requireCompany();
  const demoProduct = await prisma.product.findFirst({
    where: { companyId: ctx.companyId, name: "EO Sterile Ophthalmic Cannula" },
    select: { id: true, name: true },
  });
  const fallback = demoProduct
    ? null
    : await prisma.product.findFirst({
        where: { companyId: ctx.companyId },
        select: { id: true, name: true },
        orderBy: { createdAt: "asc" },
      });
  const product = demoProduct ?? fallback;
  return <DemoTourView productId={product?.id ?? null} productName={product?.name ?? null} />;
}
