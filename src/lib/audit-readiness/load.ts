import "server-only";
import { prisma } from "@/lib/db";
import { listProductsWithDossier } from "@/lib/data/queries";
import { QMS_REGISTER_EXCLUDED_CODES } from "@/lib/domain/constants";
import { evaluateIso13485ManualCoverage } from "@/lib/qms/iso13485-manual-coverage";
import { summarizeAuditReadiness, type CompanyAuditInput } from "./gaps";
import type { AuditReadinessSummary } from "./types";

export async function loadAuditReadiness(companyId: string): Promise<AuditReadinessSummary> {
  const [company, products, qmsDocs, capas, session] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, srnNumber: true, notifiedBody: true },
    }),
    listProductsWithDossier(companyId),
    prisma.qMSDocument.findMany({
      where: {
        companyId,
        deletedAt: null,
        NOT: { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } },
      },
      select: { code: true, title: true, layer: true, status: true, content: true },
    }),
    prisma.cAPA.findMany({
      where: { companyId },
      include: { product: { select: { name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.qualityManualWizardSession.findFirst({
      where: { companyId, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      select: { answersJson: true, composerDocumentId: true },
    }),
  ]);

  let composerQmStatus: string | null = null;
  if (session?.composerDocumentId) {
    const composer = await prisma.composerDocument.findFirst({
      where: { id: session.composerDocumentId, companyId },
      select: { status: true },
    });
    composerQmStatus = composer?.status ?? null;
  }

  const answers = (session?.answersJson as Record<string, unknown> | null) ?? {};
  const coverage = evaluateIso13485ManualCoverage({
    answers,
    kysDocs: qmsDocs,
    qualityManualGenerated: Boolean(session?.composerDocumentId),
  });

  const input: CompanyAuditInput = {
    companyName: company?.name ?? "",
    srnNumber: company?.srnNumber,
    notifiedBody: company?.notifiedBody,
    qmsDocs,
    composerQmStatus,
    products,
    contentScorePercent: coverage.percent,
    capas: capas.map((c) => ({
      id: c.id,
      title: c.title,
      status: c.status,
      dueDate: c.dueDate ? c.dueDate.toISOString() : null,
      productName: c.product?.name,
    })),
  };

  return summarizeAuditReadiness(input);
}
