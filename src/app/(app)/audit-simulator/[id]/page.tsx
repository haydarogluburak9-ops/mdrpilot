import { notFound } from "next/navigation";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { getAuditSessionDetail } from "@/lib/audit-sim/service";
import { NotFoundError } from "@/lib/auth/errors";
import { AuditDetailView, type AuditSessionDetail } from "./audit-detail-view";

export const dynamic = "force-dynamic";

export default async function AuditDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireCompany();
  try {
    const session = await getAuditSessionDetail(ctx.companyId, params.id);
    return <AuditDetailView session={session as unknown as AuditSessionDetail} canEdit={hasRole(ctx.role, "CONSULTANT")} />;
  } catch (err) {
    if (err instanceof NotFoundError) notFound();
    throw err;
  }
}
