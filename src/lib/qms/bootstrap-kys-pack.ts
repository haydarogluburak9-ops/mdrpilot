import "server-only";
import { prisma } from "@/lib/db";
import {
  evaluateIso13485ManualCoverage,
  ISO13485_MANUAL_CLAUSE_MAP,
} from "@/lib/qms/iso13485-manual-coverage";
import { scaffoldCompanyQms, dedupeCompanyQmsByCode } from "@/lib/qms/scaffold";
import { generateQmsDocument } from "@/lib/qms/generate-document";

export const CRITICAL_SOP_CODES = [
  "SOP-ORG",
  "SOP-DC",
  "SOP-PC",
  "SOP-CH",
  "SOP-CAPA",
  "SOP-IA",
  "SOP-VG",
  "SOP-DD",
  "SOP-ST",
] as const;

/** Child docs that close manual-only coverage gaps when populated. */
export const COVERAGE_CHILD_CODES = ["LIST-DC-01", "DOC-OTH-01"] as const;

function manualHeadingsFromComposer(contentJson: unknown): string[] {
  const doc = contentJson as { sections?: { heading?: string; title?: string }[] };
  if (!doc?.sections?.length) return [];
  return doc.sections.map((s) => (s.heading ?? s.title ?? "").trim()).filter(Boolean);
}

export async function enrichWizardAnswersForCoverage(
  companyId: string,
  answers: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { name: true, legalName: true, manufacturingSites: true },
  });
  const patch: Record<string, unknown> = { ...answers };

  const setIfEmpty = (key: string, value: string) => {
    if (!value) return;
    const cur = patch[key];
    if (cur === null || cur === undefined || String(cur).trim() === "") patch[key] = value;
  };

  setIfEmpty("companyLegalName", company?.legalName ?? company?.name ?? "");
  setIfEmpty("sites", company?.manufacturingSites ?? "");
  setIfEmpty("applicableRegulations", "EU MDR 2017/745, ISO 13485:2016");
  setIfEmpty(
    "scopeStatement",
    `${company?.legalName ?? company?.name ?? "Firma"} tıbbi cihaz üretimi ve ilgili kalite yönetim süreçleri`,
  );
  setIfEmpty(
    "qmsScope",
    company?.manufacturingSites?.trim()
      ? `KYS kapsamı: ${company.manufacturingSites.trim()}`
      : "Ürün gerçekleştirme, doküman kontrolü, izleme ve iyileştirme süreçleri",
  );
  setIfEmpty("generalManager", "Genel Müdür");

  const kys = await prisma.qMSDocument.findMany({
    where: { companyId, deletedAt: null, code: { not: null } },
    select: { code: true },
  });
  const codes = new Set(kys.map((d) => d.code!.trim()));

  const procFields: Record<string, string> = {
    documentControlProcedureCode: "SOP-DC",
    recordControlProcedureCode: "SOP-RC",
    trainingProcedureCode: "SOP-HR",
    internalAuditProcedureCode: "SOP-IA",
    capaProcedureCode: "SOP-CAPA",
    complaintProcedureCode: "SOP-CH",
    productionProcedureCode: "SOP-PC",
    supplierProcedureCode: "SOP-SE",
    riskManagementProcedureCode: "SOP-RM",
    managementReviewProcedureCode: "SOP-MR",
    organizationProcedureCode: "SOP-ORG",
  };
  for (const [field, code] of Object.entries(procFields)) {
    if (codes.has(code)) setIfEmpty(field, code);
  }

  setIfEmpty("capaMethod", "DÖF prosedürü (SOP-CAPA) ve CAPA formu ile takip");
  setIfEmpty("complaintHandlingMethod", "Şikâyet kaydı, değerlendirme ve CAPA bağlantısı (SOP-CH)");
  setIfEmpty("customerFeedbackMethod", "Müşteri geri bildirimi ve şikâyet kanalları");
  setIfEmpty("pmsMethod", "PMS planı ve periyodik güvenlik güncelleme raporu");
  setIfEmpty("vigilanceReportingMethod", "Vigilance bildirimleri (SOP-VG)");
  setIfEmpty("trendAnalysisMethod", "Veri analizi ve trend raporlama (SOP-DA)");
  setIfEmpty("traceabilityMethod", "Lot/seri izlenebilirlik (SOP-TR)");
  setIfEmpty("keyProcessKPIs", "Kalite hedefleri ve süreç KPI tablosu");
  setIfEmpty("qualityRisks", "KYS riskleri ve fırsatlar değerlendirmesi");
  setIfEmpty("regulatoryRisks", "Regülasyon değişiklikleri izleme");
  setIfEmpty("managementReviewOwner", "Genel Müdür / Kalite Müdürü");
  setIfEmpty("qualityManager", "Kalite Müdürü");
  setIfEmpty("managementRepresentative", "Yönetim Temsilcisi");
  setIfEmpty("nonconformingProductControl", "Uygunsuz ürün kontrolü (SOP-NCP)");

  return patch;
}

export interface BootstrapKysPackResult {
  deduped: number;
  sopsGenerated: string[];
  childrenGenerated: Record<string, number>;
  inReviewCount: number;
  coveragePercent: number;
  covered: number;
  partial: number;
  missing: number;
  missingClauses: string[];
  kysWithContent: number;
  kysTotal: number;
  wizardStatus: string | null;
  composerDocumentId: string | null;
  composerExportPath: string | null;
}

export async function runBootstrapKysPack(params: {
  companyId: string;
  generatedBy: string;
  locale?: "tr" | "en";
  generateAi?: boolean;
}): Promise<BootstrapKysPackResult> {
  const locale = params.locale ?? "tr";
  const generateAi = params.generateAi !== false;

  await scaffoldCompanyQms(params.companyId, ["ISO 13485", "ISO 9001"]);
  const deduped = await dedupeCompanyQmsByCode(params.companyId);

  const sopsGenerated: string[] = [];
  const childrenGenerated: Record<string, number> = {};

  if (generateAi) {
    for (const code of CRITICAL_SOP_CODES) {
      const doc = await prisma.qMSDocument.findFirst({
        where: { companyId: params.companyId, code, deletedAt: null },
      });
      if (!doc) continue;
      if ((doc.content?.trim() ?? "").length > 80) continue;
      try {
        await generateQmsDocument(params.companyId, doc.id, locale, params.generatedBy);
        sopsGenerated.push(code);
      } catch {
        /* continue */
      }
    }

    for (const code of CRITICAL_SOP_CODES) {
      try {
        const emptyChildren = await prisma.qMSDocument.findMany({
          where: {
            companyId: params.companyId,
            deletedAt: null,
            parentProcedureCode: code,
            OR: [{ content: null }, { content: "" }],
          },
          select: { id: true, code: true },
          take: 5,
        });
        let generated = 0;
        for (const child of emptyChildren) {
          try {
            const { generateProcedureChild } = await import("@/lib/qms/procedure-document-service");
            const result = await generateProcedureChild({
              companyId: params.companyId,
              documentId: child.id,
              locale,
              generatedBy: params.generatedBy,
            });
            if (result.content.trim()) generated++;
          } catch {
            /* continue */
          }
        }
        childrenGenerated[code] = generated;
      } catch {
        childrenGenerated[code] = 0;
      }
    }

    for (const childCode of COVERAGE_CHILD_CODES) {
      const child = await prisma.qMSDocument.findFirst({
        where: {
          companyId: params.companyId,
          code: childCode,
          deletedAt: null,
          OR: [{ content: null }, { content: "" }],
        },
        select: { id: true },
      });
      if (!child) continue;
      try {
        const { generateProcedureChild } = await import("@/lib/qms/procedure-document-service");
        await generateProcedureChild({
          companyId: params.companyId,
          documentId: child.id,
          locale,
          generatedBy: params.generatedBy,
        });
      } catch {
        /* continue */
      }
    }
  }

  const toReview = await prisma.qMSDocument.findMany({
    where: {
      companyId: params.companyId,
      deletedAt: null,
      status: { in: ["DRAFT", "MISSING"] },
      NOT: { content: null },
    },
    select: { id: true, content: true },
  });
  const reviewIds = toReview.filter((d) => (d.content?.trim() ?? "").length > 80).map((d) => d.id);
  if (reviewIds.length > 0) {
    await prisma.qMSDocument.updateMany({
      where: { id: { in: reviewIds } },
      data: { status: "IN_REVIEW" },
    });
  }

  const session = await prisma.qualityManualWizardSession.findFirst({
    where: { companyId: params.companyId, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
  });

  let enrichedAnswers: Record<string, unknown> = {};
  if (session) {
    enrichedAnswers = await enrichWizardAnswersForCoverage(
      params.companyId,
      (session.answersJson as Record<string, unknown>) ?? {},
    );
    await prisma.qualityManualWizardSession.update({
      where: { id: session.id },
      data: { answersJson: enrichedAnswers as object },
    });
  }

  const kysDocs = await prisma.qMSDocument.findMany({
    where: { companyId: params.companyId, deletedAt: null },
    select: { code: true, content: true, status: true },
  });

  let manualHeadings: string[] = [];
  const composerId = session?.composerDocumentId ?? null;
  if (composerId) {
    const composer = await prisma.composerDocument.findUnique({
      where: { id: composerId },
      select: { contentJson: true },
    });
    manualHeadings = manualHeadingsFromComposer(composer?.contentJson);
  }

  const cov = evaluateIso13485ManualCoverage({
    answers: enrichedAnswers,
    kysDocs,
    manualSectionHeadings: manualHeadings,
    qualityManualGenerated: Boolean(composerId),
  });

  const inReviewCount = await prisma.qMSDocument.count({
    where: { companyId: params.companyId, deletedAt: null, status: "IN_REVIEW" },
  });

  return {
    deduped,
    sopsGenerated,
    childrenGenerated,
    inReviewCount,
    coveragePercent: cov.percent,
    covered: cov.rows.filter((r) => r.status === "covered").length,
    partial: cov.rows.filter((r) => r.status === "partial").length,
    missing: cov.rows.filter((r) => r.status === "missing").length,
    missingClauses: cov.rows.filter((r) => r.status === "missing").map((r) => r.clauseNo),
    kysWithContent: kysDocs.filter((d) => (d.content?.trim() ?? "").length > 80).length,
    kysTotal: kysDocs.length,
    wizardStatus: session?.status ?? null,
    composerDocumentId: composerId,
    composerExportPath: composerId
      ? `/composer/${composerId}`
      : null,
  };
}
