import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listProductsWithDossier, getProductEvidence, listFilesDetailed } from "@/lib/data/queries";
import { recomputeAllGsprStatuses } from "@/lib/products/gspr-status-sync";
import { GsprView } from "./gspr-view";
import type { EvidenceFile } from "@/components/modules/evidence-panel";

function buildRecommendations(files: { id: string; analysisJson: unknown }[]): Record<string, string[]> {
  const recommendations: Record<string, string[]> = {};
  for (const f of files) {
    const links = (f.analysisJson as { recommendedLinks?: { targetIdOrHint?: string }[] } | null)?.recommendedLinks ?? [];
    for (const l of links) {
      if (typeof l.targetIdOrHint === "string") (recommendations[l.targetIdOrHint] ??= []).push(f.id);
    }
  }
  return recommendations;
}

export default async function GsprPage() {
  const ctx = await requireCompany();
  const [products, files] = await Promise.all([
    listProductsWithDossier(ctx.companyId),
    listFilesDetailed(ctx.companyId),
  ]);

  let refreshedProducts = products;
  try {
    await Promise.all(products.map((p) => recomputeAllGsprStatuses(p.id)));
    refreshedProducts = await listProductsWithDossier(ctx.companyId);
  } catch (err) {
    console.error("[gspr/page] status sync failed:", err);
  }

  const fileOptions = files.map((f) => ({ id: f.id, fileName: f.fileName, documentKind: f.documentKind }));
  const recommendations = buildRecommendations(files);

  const evidenceByProduct: Record<string, Record<string, EvidenceFile[]>> = {};
  await Promise.all(
    refreshedProducts.map(async (p) => {
      const ev = await getProductEvidence(ctx.companyId, p.id);
      evidenceByProduct[p.id] = ev.gspr;
    }),
  );

  return (
    <GsprView
      products={refreshedProducts}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
      canApprove={hasRole(ctx.role, "QUALITY_MANAGER")}
      evidenceByProduct={evidenceByProduct}
      fileOptions={fileOptions}
      recommendations={recommendations}
    />
  );
}
