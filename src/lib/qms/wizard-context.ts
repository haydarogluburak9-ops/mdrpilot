import "server-only";
import { prisma } from "@/lib/db";
import { mergeCompanyProfileIntoWizardAnswers } from "@/lib/wizards/quality-manual/company-profile-sync";
import { buildWizardQmsContext, procedureScopeGuidance } from "@/lib/qms/scope-procedure-guidance";

/** Latest quality-manual wizard answers merged with company profile (for KYS AI context). */
export async function loadQmsWizardAnswers(companyId: string): Promise<Record<string, unknown>> {
  const [session, company] = await Promise.all([
    prisma.qualityManualWizardSession.findFirst({
      where: { companyId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      select: { answersJson: true },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        name: true,
        legalName: true,
        country: true,
        address: true,
        manufacturingSites: true,
        authorizedRep: true,
        srnNumber: true,
        notifiedBody: true,
        notifiedBodyNumber: true,
        contactEmail: true,
        contactPhone: true,
      },
    }),
  ]);

  const base = (session?.answersJson as Record<string, unknown> | null) ?? {};
  if (!company) return base;
  return mergeCompanyProfileIntoWizardAnswers(base, company, true);
}

export async function buildQmsAiContext(
  companyId: string,
  locale: "tr" | "en",
  procedureCode?: string | null,
  answers?: Record<string, unknown>,
): Promise<string> {
  const merged = answers ?? await loadQmsWizardAnswers(companyId);
  const base = buildWizardQmsContext(merged, locale);
  if (!procedureCode?.trim()) return base;
  const scopeNote = procedureScopeGuidance(procedureCode.trim(), merged, locale);
  if (!scopeNote) return base;

  const label =
    locale === "tr" ? "Prosedüre özel gereklilikler" : "Procedure-specific requirements";
  return [base, `${label}:\n${scopeNote}`].filter(Boolean).join("\n\n");
}
