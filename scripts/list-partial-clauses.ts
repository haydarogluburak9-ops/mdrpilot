import { PrismaClient } from "@prisma/client";
import { evaluateIso13485ManualCoverage } from "../src/lib/qms/iso13485-manual-coverage";

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  if (!c) return;

  const [kysDocs, session] = await Promise.all([
    prisma.qMSDocument.findMany({
      where: { companyId: c.id, deletedAt: null },
      select: { code: true, content: true, status: true },
    }),
    prisma.qualityManualWizardSession.findFirst({
      where: { companyId: c.id, status: { not: "ARCHIVED" } },
      orderBy: { updatedAt: "desc" },
      select: { answersJson: true, composerDocumentId: true },
    }),
  ]);

  let manualSectionHeadings: string[] = [];
  if (session?.composerDocumentId) {
    const composer = await prisma.composerDocument.findUnique({
      where: { id: session.composerDocumentId },
      select: { contentJson: true },
    });
    const sections = (composer?.contentJson as { sections?: { heading?: string; title?: string }[] })?.sections;
    if (sections?.length) {
      manualSectionHeadings = sections
        .map((s) => (s.heading ?? s.title ?? "").trim())
        .filter(Boolean);
    }
  }

  const answers = (session?.answersJson as Record<string, unknown>) ?? {};
  const cov = evaluateIso13485ManualCoverage({
    answers,
    kysDocs,
    manualSectionHeadings,
    qualityManualGenerated: session?.composerDocumentId != null,
  });

  console.log(`--- ${c.name} (${cov.percent}%)`);
  for (const r of cov.rows.filter((x) => x.status === "partial")) {
    console.log(`${r.clauseNo} | ${r.titleTr} | sources: ${r.sources.join(",")} | sop: ${r.sopCode ?? "—"}`);
  }
}

main().finally(() => prisma.$disconnect());
