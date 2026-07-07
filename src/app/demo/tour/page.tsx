import { requireCompany } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { getDashboardData } from "@/lib/data/queries";
import { computeDossierWorkflow, loadDossierWorkflowInput } from "@/lib/workflow/dossier-checklist";
import { DemoTourView } from "../demo-tour-view";

export const dynamic = "force-dynamic";

export default async function DemoTourPage() {
  const ctx = await requireCompany();
  const { products } = await getDashboardData(ctx.companyId);
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
  const workflowInput = await loadDossierWorkflowInput(ctx.companyId, products);
  const workflowSteps = computeDossierWorkflow(workflowInput);
  return (
    <DemoTourView
      productId={product?.id ?? null}
      productName={product?.name ?? null}
      workflowSteps={workflowSteps}
    />
  );
}
