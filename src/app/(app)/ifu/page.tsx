import { requireCompany } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { prisma } from "@/lib/db";
import { IfuView } from "./ifu-view";

export default async function IfuPage() {
  const ctx = await requireCompany();
  const [products, company] = await Promise.all([
    listProductsWithDossier(ctx.companyId),
    prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true, legalName: true, address: true, notifiedBodyNumber: true },
    }),
  ]);
  if (!company) return null;
  return <IfuView products={products} company={company} />;
}
