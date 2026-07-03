import { notFound } from "next/navigation";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { getComposerDocumentDetail } from "@/lib/data/queries";
import { BackLink } from "@/components/layout/back-link";
import { ComposerEditor } from "./composer-editor";

export const dynamic = "force-dynamic";

export default async function ComposerDetailPage({ params }: { params: { id: string } }) {
  const ctx = await requireCompany();
  const document = await getComposerDocumentDetail(ctx.companyId, params.id);
  if (!document) notFound();

  return (
    <div>
      <BackLink href="/composer" labelKey="common.backToComposer" />
      <ComposerEditor
        document={document}
        canEdit={hasRole(ctx.role, "CONSULTANT")}
        canApprove={hasRole(ctx.role, "QUALITY_MANAGER")}
      />
    </div>
  );
}
