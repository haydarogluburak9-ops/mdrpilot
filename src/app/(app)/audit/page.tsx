import { requireCompany } from "@/lib/auth/guards";
import { listProductsWithDossier } from "@/lib/data/queries";
import { computeClauseGaps } from "@/lib/rag/audit-gaps";
import { loadAuditReadiness } from "@/lib/audit-readiness/load";
import { AuditView } from "./audit-view";

export default async function AuditPage() {
  const ctx = await requireCompany();
  const [products, readiness] = await Promise.all([
    listProductsWithDossier(ctx.companyId),
    loadAuditReadiness(ctx.companyId),
  ]);
  const clauseGaps = Object.fromEntries(products.map((p) => [p.id, computeClauseGaps(p)]));
  return <AuditView products={products} clauseGaps={clauseGaps} readiness={readiness} />;
}
