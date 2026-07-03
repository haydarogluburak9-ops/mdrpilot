import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listQualityManualWizards } from "@/lib/data/queries";
import { WizardListView } from "./wizard-list-view";

export const dynamic = "force-dynamic";

export default async function QualityManualWizardPage() {
  const ctx = await requireCompany();
  const sessions = await listQualityManualWizards(ctx.companyId);
  return <WizardListView sessions={sessions} canCreate={hasRole(ctx.role, "CONSULTANT")} />;
}
