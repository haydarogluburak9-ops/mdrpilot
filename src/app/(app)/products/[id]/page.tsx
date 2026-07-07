import { notFound } from "next/navigation";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { getProductForCompany, getProductEvidence, listFilesDetailed } from "@/lib/data/queries";
import { recomputeAllGsprStatuses } from "@/lib/products/gspr-status-sync";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { BackLink } from "@/components/layout/back-link";
import { ProductDetailTabs } from "./product-detail-tabs";

import { computeProductWorkflowSteps } from "@/lib/workflow/dossier-checklist";

const PRODUCT_TABS = new Set([
  "overview", "technical", "gspr", "risk", "clinical", "pms", "ifu", "udi",
  "tests", "design", "software", "cyber", "quality", "audit", "ai",
]);

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { tab?: string; setup?: string };
}) {
  const ctx = await requireCompany();

  let product = null;
  try {
    product = await getProductForCompany(ctx.companyId, params.id);
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
  if (!product) notFound();

  try {
    await recomputeAllGsprStatuses(params.id);
    product = await getProductForCompany(ctx.companyId, params.id);
  } catch (err) {
    console.error("[products/[id]/page] GSPR status sync failed:", err);
  }
  if (!product) notFound();

  const [evidence, files, company] = await Promise.all([
    getProductEvidence(ctx.companyId, params.id),
    listFilesDetailed(ctx.companyId),
    prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true, legalName: true, address: true, notifiedBodyNumber: true },
    }),
  ]);
  if (!company) notFound();
  const fileOptions = files.map((f) => ({ id: f.id, fileName: f.fileName, documentKind: f.documentKind }));
  const canEdit = hasRole(ctx.role, "CONSULTANT");
  const canApprove = hasRole(ctx.role, "QUALITY_MANAGER");

  // Map AI recommended links (targetIdOrHint -> file ids) for "AI suggested evidence" badges.
  const recommendations: Record<string, string[]> = {};
  for (const f of files) {
    const links = (f.analysisJson as { recommendedLinks?: { targetIdOrHint?: string }[] } | null)?.recommendedLinks ?? [];
    for (const l of links) {
      if (typeof l.targetIdOrHint === "string") (recommendations[l.targetIdOrHint] ??= []).push(f.id);
    }
  }

  const tab = searchParams?.tab;
  const defaultTab = tab && PRODUCT_TABS.has(tab) ? tab : "overview";
  const productWorkflowSteps = computeProductWorkflowSteps(product);

  return (
    <div>
      <BackLink href="/products" labelKey="common.backToProducts" />
      <ProductDetailTabs
        product={product}
        evidence={evidence}
        fileOptions={fileOptions}
        recommendations={recommendations}
        canEdit={canEdit}
        canApprove={canApprove}
        company={company}
        defaultTab={defaultTab}
        productWorkflowSteps={productWorkflowSteps}
      />
    </div>
  );
}
