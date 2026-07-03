import { notFound } from "next/navigation";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { getQualityManualWizard } from "@/lib/data/queries";
import { listCompanyQmsDocs } from "@/lib/wizards/quality-manual/gap-check";
import { WizardDetailView, type SessionShape } from "./wizard-detail-view";

export const dynamic = "force-dynamic";

export default async function WizardDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireCompany();
  const [session, qmsDocs] = await Promise.all([
    getQualityManualWizard(ctx.companyId, params.id),
    listCompanyQmsDocs(ctx.companyId),
  ]);
  if (!session) notFound();

  return (
    <WizardDetailView
      session={session as unknown as SessionShape}
      qmsDocs={qmsDocs}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
      canArchive={hasRole(ctx.role, "QUALITY_MANAGER")}
    />
  );
}
