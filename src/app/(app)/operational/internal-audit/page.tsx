import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listInternalAuditCycles } from "@/lib/operational/internal-audit-service";
import { InternalAuditView } from "@/components/operational/internal-audit-view";

export default async function InternalAuditOperationalPage() {
  const ctx = await requireCompany();
  const cycles = await listInternalAuditCycles(ctx.companyId);

  return (
    <InternalAuditView
      cycles={cycles}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
    />
  );
}
