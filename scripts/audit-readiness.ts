import { PrismaClient } from "@prisma/client";
import { summarizeAuditReadiness } from "../src/lib/audit-readiness/gaps";
import { listProductsWithDossier } from "../src/lib/data/queries";
import { QMS_REGISTER_EXCLUDED_CODES } from "../src/lib/domain/constants";
import { evaluateIso13485ManualCoverage } from "../src/lib/qms/iso13485-manual-coverage";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: "Yılmaz" } },
    select: { id: true, name: true, srnNumber: true, notifiedBody: true },
  });
  if (!company) {
    console.log("Company not found");
    return;
  }

  const [products, qmsDocs, capas, session] = await Promise.all([
    listProductsWithDossier(company.id),
    prisma.qMSDocument.findMany({
      where: {
        companyId: company.id,
        deletedAt: null,
        NOT: { code: { in: [...QMS_REGISTER_EXCLUDED_CODES] } },
      },
      select: { code: true, title: true, layer: true, status: true, content: true },
    }),
    prisma.cAPA.findMany({
      where: { product: { companyId: company.id } },
      include: { product: { select: { name: true } } },
    }),
    prisma.qualityManualWizardSession.findFirst({
      where: { companyId: company.id, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      select: { answersJson: true, composerDocumentId: true },
    }),
  ]);

  let composerQmStatus: string | null = null;
  if (session?.composerDocumentId) {
    const composer = await prisma.composerDocument.findFirst({
      where: { id: session.composerDocumentId, companyId: company.id },
      select: { status: true },
    });
    composerQmStatus = composer?.status ?? null;
  }

  const coverage = evaluateIso13485ManualCoverage({
    answers: (session?.answersJson as Record<string, unknown> | null) ?? {},
    kysDocs: qmsDocs,
    qualityManualGenerated: Boolean(session?.composerDocumentId),
  });

  const summary = summarizeAuditReadiness({
    companyName: company.name,
    srnNumber: company.srnNumber,
    notifiedBody: company.notifiedBody,
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
  });

  console.log(`=== ${company.name} ===`);
  console.log(`Overall: ${summary.overallScore} | QMS: ${summary.qmsScore} | MDR: ${summary.mdrScore}`);
  console.log(`Content: ${summary.contentScorePercent}% | Approved: ${summary.qmsApproved}/${summary.qmsTotal}`);
  console.log(`Major: ${summary.majorCount} | Minor: ${summary.minorCount} | Obs: ${summary.observationCount}`);
  console.log("\nMajor gaps:");
  for (const g of summary.gaps.filter((x) => x.severity === "major").slice(0, 10)) {
    console.log(`- ${g.titleTr}`);
  }
}

main().finally(() => prisma.$disconnect());
