import { PrismaClient } from "@prisma/client";
import { evaluateIso13485ManualCoverage } from "../src/lib/qms/iso13485-manual-coverage";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({ select: { id: true, name: true } });
  if (!company) return;

  const kysDocs = await prisma.qMSDocument.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { code: true, content: true, status: true },
  });

  const session = await prisma.qualityManualWizardSession.findFirst({
    where: { companyId: company.id, status: { not: "ARCHIVED" } },
    orderBy: { updatedAt: "desc" },
    select: { status: true, composerDocumentId: true, answersJson: true },
  });

  let headings: string[] = [];
  if (session?.composerDocumentId) {
    const c = await prisma.composerDocument.findUnique({
      where: { id: session.composerDocumentId },
      select: { contentJson: true },
    });
    const sections = (c?.contentJson as { sections?: { heading?: string }[] })?.sections;
    headings = sections?.map((s) => s.heading ?? "").filter(Boolean) ?? [];
  }

  const cov = evaluateIso13485ManualCoverage({
    answers: (session?.answersJson as Record<string, unknown>) ?? {},
    kysDocs,
    manualSectionHeadings: headings,
  });

  const critical = ["SOP-ORG", "SOP-DC", "SOP-PC", "SOP-CH", "SOP-CAPA", "SOP-IA", "SOP-ST"];
  console.log(company.name);
  console.log(`Score: ${cov.percent}/100 (tam ${cov.rows.filter((r) => r.status === "covered").length}, kısmi ${cov.rows.filter((r) => r.status === "partial").length}, eksik ${cov.rows.filter((r) => r.status === "missing").length})`);
  console.log(`IN_REVIEW: ${kysDocs.filter((d) => d.status === "IN_REVIEW").length}`);
  console.log(`With content: ${kysDocs.filter((d) => (d.content?.trim() ?? "").length > 80).length}/${kysDocs.length}`);
  console.log(`Wizard: ${session?.status} composer: ${session?.composerDocumentId ?? "—"}`);
  for (const code of critical) {
    const d = kysDocs.find((x) => x.code === code);
    const ch = await prisma.qMSDocument.count({
      where: { companyId: company.id, deletedAt: null, parentProcedureCode: code },
    });
    const chEmpty = await prisma.qMSDocument.count({
      where: {
        companyId: company.id,
        deletedAt: null,
        parentProcedureCode: code,
        OR: [{ content: null }, { content: "" }],
      },
    });
    console.log(`  ${code}: ${d?.status} content=${(d?.content?.trim().length ?? 0) > 80 ? "yes" : "no"} children=${ch} empty=${chEmpty}`);
  }
}

main().finally(() => prisma.$disconnect());
