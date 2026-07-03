import "server-only";
import type { QualityManualWizardSession, QualityManualStandardMode } from "@prisma/client";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { NotFoundError, BadRequestError } from "@/lib/auth/errors";
import { QM_TOTAL_STEPS, type StandardMode } from "./steps";
import { runQualityManualGapCheck, type GapCheckResult, type QmsDocGapRef } from "./gap-check";
import { listCompanyQmsDocs } from "./gap-check";
import { scaffoldCompanyQms } from "@/lib/qms/scaffold";
import { mergeProcedureCodesFromQms } from "./procedure-codes";
import { mergeAnswersFromKysRegister } from "./kys-answer-sync";
import { applyScopeGuidanceToKys } from "./scope-kys-apply";
import { generateQualityManual } from "./generate";
import { mergeCompanyProfileIntoWizardAnswers, type CompanyProfileFields } from "./company-profile-sync";
import { binaryContentLang, isAppLocale, type Lang } from "@/lib/i18n/locales";

function enrichAnswersFromKys(
  answers: Record<string, unknown>,
  qmsDocs: Awaited<ReturnType<typeof listCompanyQmsDocs>>,
  step: number,
  onlyFillEmpty = true,
  locale: "tr" | "en" = "tr",
  company?: CompanyProfileFields | null,
): Record<string, unknown> {
  let merged = answers;
  if (company) merged = mergeCompanyProfileIntoWizardAnswers(merged, company, onlyFillEmpty);
  const withCodes = mergeProcedureCodesFromQms(merged, qmsDocs, onlyFillEmpty);
  return mergeAnswersFromKysRegister(withCodes, qmsDocs, step, onlyFillEmpty, locale);
}

async function loadCompanyProfileFields(companyId: string): Promise<CompanyProfileFields | null> {
  const c = await prisma.company.findUnique({
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
  });
  return c ?? null;
}

async function loadSession(companyId: string, id: string): Promise<QualityManualWizardSession> {
  const s = await prisma.qualityManualWizardSession.findFirst({ where: { id } });
  if (!s || s.companyId !== companyId) throw new NotFoundError();
  return s;
}

function assertEditable(s: QualityManualWizardSession) {
  if (s.status === "ARCHIVED") throw new BadRequestError("This wizard session is archived.");
  if (s.status === "GENERATED") throw new BadRequestError("This wizard has already generated a document.");
}

export async function createWizardSession(params: {
  companyId: string; userId: string; standardMode: StandardMode; ip?: string | null;
}): Promise<QualityManualWizardSession> {
  const session = await prisma.qualityManualWizardSession.create({
    data: {
      companyId: params.companyId,
      createdById: params.userId,
      standardMode: params.standardMode as QualityManualStandardMode,
      status: "DRAFT",
      currentStep: 1,
      answersJson: enrichAnswersFromKys(
        {},
        await listCompanyQmsDocs(params.companyId),
        4,
        true,
        "tr",
        await loadCompanyProfileFields(params.companyId),
      ) as object,
    },
  });
  await writeAuditLog({
    action: "wizard.quality_manual.create", userId: params.userId, companyId: params.companyId,
    entity: "QualityManualWizardSession", entityId: session.id, metadata: { standardMode: params.standardMode }, ip: params.ip,
  });
  return session;
}

export async function updateWizardSession(params: {
  companyId: string; userId: string; id: string;
  answers?: Record<string, unknown>; currentStep?: number; standardMode?: StandardMode; ip?: string | null;
}): Promise<QualityManualWizardSession> {
  const existing = await loadSession(params.companyId, params.id);
  assertEditable(existing);

  const mergedAnswers = params.answers
    ? { ...((existing.answersJson as Record<string, unknown> | null) ?? {}), ...params.answers }
    : (existing.answersJson as Record<string, unknown> | null) ?? {};

  const step = params.currentStep !== undefined
    ? Math.min(Math.max(1, params.currentStep), QM_TOTAL_STEPS)
    : existing.currentStep;

  await scaffoldCompanyQms(params.companyId, ["ISO 13485", "ISO 9001"]);
  const qmsDocs = await listCompanyQmsDocs(params.companyId);
  const companyProfile = await loadCompanyProfileFields(params.companyId);
  const answersWithKys = enrichAnswersFromKys(mergedAnswers, qmsDocs, step, true, "tr", companyProfile);

  const updated = await prisma.qualityManualWizardSession.update({
    where: { id: existing.id },
    data: {
      answersJson: answersWithKys as object,
      currentStep: step,
      standardMode: (params.standardMode as QualityManualStandardMode | undefined) ?? existing.standardMode,
    },
  });
  await writeAuditLog({
    action: "wizard.quality_manual.update", userId: params.userId, companyId: params.companyId,
    entity: "QualityManualWizardSession", entityId: existing.id, metadata: { currentStep: step }, ip: params.ip,
  });
  return updated;
}

export async function gapCheckWizard(params: {
  companyId: string; userId: string; id: string; locale?: Lang; ip?: string | null;
}): Promise<{ session: QualityManualWizardSession; gap: GapCheckResult }> {
  const existing = await loadSession(params.companyId, params.id);
  assertEditable(existing);

  const locale: Lang = params.locale && isAppLocale(params.locale) ? params.locale : "tr";
  const contentLocale = binaryContentLang(locale);
  const qmsDocs = await listCompanyQmsDocs(params.companyId);
  const companyProfile = await loadCompanyProfileFields(params.companyId);
  const answers = enrichAnswersFromKys(
    (existing.answersJson as Record<string, unknown> | null) ?? {},
    qmsDocs,
    QM_TOTAL_STEPS,
    true,
    contentLocale,
    companyProfile,
  );

  const gap = await runQualityManualGapCheck({
    companyId: params.companyId,
    standardMode: existing.standardMode as StandardMode,
    answers,
    qmsDocs,
    locale,
  });

  const session = await prisma.qualityManualWizardSession.update({
    where: { id: existing.id },
    data: { gapCheckJson: gap as object, status: "GAP_CHECKED", answersJson: answers as object },
  });
  await writeAuditLog({
    action: "wizard.quality_manual.gap_check", userId: params.userId, companyId: params.companyId,
    entity: "QualityManualWizardSession", entityId: existing.id,
    metadata: { criticalGaps: gap.criticalGaps.length, ready: gap.readyToGenerate }, ip: params.ip,
  });
  return { session, gap };
}

export async function generateWizardDocument(params: {
  companyId: string; userId: string; id: string; language?: "tr" | "en"; ip?: string | null;
}): Promise<{ session: QualityManualWizardSession; composerDocumentId: string; gap: GapCheckResult }> {
  const existing = await loadSession(params.companyId, params.id);
  assertEditable(existing);

  const qmsDocs = await listCompanyQmsDocs(params.companyId);
  const companyProfile = await loadCompanyProfileFields(params.companyId);
  const locale = params.language === "en" ? "en" : "tr";
  const answers = enrichAnswersFromKys(
    (existing.answersJson as Record<string, unknown> | null) ?? {},
    qmsDocs,
    QM_TOTAL_STEPS,
    true,
    locale,
    companyProfile,
  );

  const freshGap = await runQualityManualGapCheck({
    companyId: params.companyId,
    standardMode: existing.standardMode as StandardMode,
    answers,
    qmsDocs,
    locale: params.language === "en" ? "en" : "tr",
  });

  const result = await generateQualityManual({
    companyId: params.companyId,
    userId: params.userId,
    standardMode: existing.standardMode as StandardMode,
    answers,
    gapResult: freshGap,
    qmsDocs,
    language: params.language,
    ip: params.ip,
  });

  const session = await prisma.qualityManualWizardSession.update({
    where: { id: existing.id },
    data: {
      status: "GENERATED",
      composerDocumentId: result.composerDocumentId,
      gapCheckJson: result.gap as object,
      answersJson: answers as object,
      generatedAt: new Date(),
    },
  });
  await writeAuditLog({
    action: "wizard.quality_manual.generate", userId: params.userId, companyId: params.companyId,
    entity: "QualityManualWizardSession", entityId: existing.id,
    metadata: { composerDocumentId: result.composerDocumentId, type: result.type }, ip: params.ip,
  });
  return { session, composerDocumentId: result.composerDocumentId, gap: result.gap };
}

export async function applyKysScopeFromWizard(params: {
  companyId: string;
  userId: string;
  id: string;
  locale?: "tr" | "en";
  ip?: string | null;
}): Promise<{
  session: QualityManualWizardSession;
  apply: Awaited<ReturnType<typeof applyScopeGuidanceToKys>>;
  gap: GapCheckResult;
}> {
  const existing = await loadSession(params.companyId, params.id);
  assertEditable(existing);

  const locale = params.locale === "en" ? "en" : "tr";
  const qmsDocs = await listCompanyQmsDocs(params.companyId);
  const companyProfile = await loadCompanyProfileFields(params.companyId);
  const answers = enrichAnswersFromKys(
    (existing.answersJson as Record<string, unknown> | null) ?? {},
    qmsDocs,
    QM_TOTAL_STEPS,
    true,
    locale,
    companyProfile,
  );

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: { name: true, email: true },
  });
  const generatedBy = user?.name ?? user?.email ?? "system";

  const apply = await applyScopeGuidanceToKys({
    companyId: params.companyId,
    userId: params.userId,
    answers,
    qmsDocs,
    locale,
    generatedBy,
  });

  const answersAfter = enrichAnswersFromKys(
    answers,
    await listCompanyQmsDocs(params.companyId),
    QM_TOTAL_STEPS,
    true,
    locale,
    companyProfile,
  );
  const gap = await runQualityManualGapCheck({
    companyId: params.companyId,
    standardMode: existing.standardMode as StandardMode,
    answers: answersAfter,
    qmsDocs: await listCompanyQmsDocs(params.companyId),
    locale,
  });

  const session = await prisma.qualityManualWizardSession.update({
    where: { id: existing.id },
    data: {
      answersJson: answersAfter as object,
      gapCheckJson: gap as object,
      status: "GAP_CHECKED",
    },
  });

  await writeAuditLog({
    action: "wizard.quality_manual.apply_kys_scope",
    userId: params.userId,
    companyId: params.companyId,
    entity: "QualityManualWizardSession",
    entityId: existing.id,
    metadata: { generated: apply.generated.map((g) => g.code), failed: apply.failed.length },
    ip: params.ip,
  });

  return { session, apply, gap };
}

export async function archiveWizard(params: {
  companyId: string; userId: string; id: string; ip?: string | null;
}): Promise<QualityManualWizardSession> {
  const existing = await loadSession(params.companyId, params.id);
  if (existing.status === "ARCHIVED") return existing;
  const session = await prisma.qualityManualWizardSession.update({
    where: { id: existing.id }, data: { status: "ARCHIVED" },
  });
  await writeAuditLog({
    action: "wizard.quality_manual.archive", userId: params.userId, companyId: params.companyId,
    entity: "QualityManualWizardSession", entityId: existing.id, ip: params.ip,
  });
  return session;
}
