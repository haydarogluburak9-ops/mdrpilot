import { prisma } from "@/lib/db";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { getQmsOnboardingPath } from "@/lib/qms/onboarding-path";
import { aiProviderInfo } from "@/lib/ai/provider-factory";
import { getAiTokenBalance } from "@/lib/billing/ai-tokens";
import { SettingsView } from "./settings-view";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const ctx = await requireCompany();
  const company = await prisma.company.findUnique({
    where: { id: ctx.companyId },
    include: { members: { include: { user: { select: { name: true, email: true } } } } },
  });

  const qmsWithContent = await prisma.qMSDocument.count({
    where: {
      companyId: ctx.companyId,
      deletedAt: null,
      content: { not: null },
      NOT: { content: "" },
    },
  });
  const qmsTotal = await prisma.qMSDocument.count({
    where: { companyId: ctx.companyId, deletedAt: null },
  });

  const ai = aiProviderInfo();
  const aiBalance = await getAiTokenBalance(ctx.companyId);

  return (
    <SettingsView
      company={{
        name: company?.name ?? "",
        legalName: company?.legalName ?? null,
        country: company?.country ?? null,
        address: company?.address ?? null,
        contactEmail: company?.contactEmail ?? null,
        contactPhone: company?.contactPhone ?? null,
        manufacturingSites: company?.manufacturingSites ?? null,
        authorizedRep: company?.authorizedRep ?? null,
        srnNumber: company?.srnNumber ?? null,
        notifiedBody: company?.notifiedBody ?? null,
        notifiedBodyNumber: company?.notifiedBodyNumber ?? null,
        hasLogo: !!company?.logoKey,
      }}
      members={(company?.members ?? []).map((m) => ({
        name: m.user.name ?? m.user.email,
        role: m.role,
      }))}
      currentRole={ctx.role}
      canEditBranding={hasRole(ctx.role, "QUALITY_MANAGER")}
      canManageTeam={ctx.role === "OWNER"}
      qmsPath={getQmsOnboardingPath(company?.profileJson)}
      qmsStats={{ total: qmsTotal, withContent: qmsWithContent }}
      aiProvider={ai.provider}
      aiModel={ai.model}
      aiConfigured={ai.configured}
      aiPlanKey={aiBalance.planKey}
      aiTokensRemaining={aiBalance.remaining}
      aiAllowsDocumentAi={aiBalance.allowsLiveAi}
    />
  );
}
