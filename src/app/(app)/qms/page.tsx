import { prisma } from "@/lib/db";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { listQmsDocuments } from "@/lib/data/queries";
import { evaluateIso13485ManualCoverage } from "@/lib/qms/iso13485-manual-coverage";
import { getQmsOnboardingPath } from "@/lib/qms/onboarding-path";
import { loadQmsWizardAnswers } from "@/lib/qms/wizard-context";
import { listCompanyQmsDocs } from "@/lib/wizards/quality-manual/gap-check";
import { QmsView } from "./qms-view";

export default async function QmsPage() {
  const ctx = await requireCompany();
  const [iso13485, iso9001, company, kysDocs, wizardAnswers, qmSession] = await Promise.all([
    listQmsDocuments(ctx.companyId, "ISO 13485"),
    listQmsDocuments(ctx.companyId, "ISO 9001"),
    prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true, profileJson: true },
    }),
    listCompanyQmsDocs(ctx.companyId),
    loadQmsWizardAnswers(ctx.companyId),
    prisma.qualityManualWizardSession.findFirst({
      where: { companyId: ctx.companyId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      select: { composerDocumentId: true },
    }),
  ]);

  let manualSectionHeadings: string[] = [];
  if (qmSession?.composerDocumentId) {
    const composer = await prisma.composerDocument.findFirst({
      where: { id: qmSession.composerDocumentId, companyId: ctx.companyId },
      select: { contentJson: true },
    });
    const sections = (composer?.contentJson as { sections?: { heading?: string; title?: string }[] })?.sections;
    if (sections?.length) {
      manualSectionHeadings = sections
        .map((s) => (s.heading ?? s.title ?? "").trim())
        .filter(Boolean);
    }
  }

  const qmsPath = getQmsOnboardingPath(company?.profileJson);
  const coverage = evaluateIso13485ManualCoverage({
    answers: wizardAnswers,
    kysDocs,
    manualSectionHeadings,
    qualityManualGenerated: qmSession?.composerDocumentId != null,
    locale: "tr",
  });

  return (
    <QmsView
      iso13485={iso13485}
      iso9001={iso9001}
      companyName={company?.name ?? "Company"}
      canEdit={hasRole(ctx.role, "CONSULTANT")}
      canApprove={hasRole(ctx.role, "QUALITY_MANAGER")}
      qmsPath={qmsPath}
      coveragePercent={coverage.percent}
      coverageSummaryTr={coverage.summaryTr}
      coverageSummaryEn={coverage.summaryEn}
      coverageRows={coverage.rows}
    />
  );
}
