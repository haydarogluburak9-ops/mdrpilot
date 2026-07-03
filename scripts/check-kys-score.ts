import { PrismaClient } from "@prisma/client";
import { ISO13485_DOCS } from "../src/lib/domain/constants";
import { evaluateIso13485ManualCoverage } from "../src/lib/qms/iso13485-manual-coverage";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });

  for (const c of companies) {
    const [kysDocs, session] = await Promise.all([
      prisma.qMSDocument.findMany({
        where: { companyId: c.id, deletedAt: null },
        select: { code: true, title: true, standard: true, status: true, content: true },
        orderBy: { code: "asc" },
      }),
      prisma.qualityManualWizardSession.findFirst({
        where: { companyId: c.id, status: { not: "ARCHIVED" } },
        orderBy: { updatedAt: "desc" },
        select: { answersJson: true, status: true, composerDocumentId: true },
      }),
    ]);

    let manualSectionHeadings: string[] = [];
    if (session?.composerDocumentId) {
      const composer = await prisma.composerDocument.findFirst({
        where: { id: session.composerDocumentId, companyId: c.id },
        select: { contentJson: true },
      });
      const sections = (composer?.contentJson as { sections?: { heading?: string; title?: string }[] })?.sections;
      if (sections?.length) {
        manualSectionHeadings = sections
          .map((s) => (s.heading ?? s.title ?? "").trim())
          .filter(Boolean);
      }
    }

    const answers = (session?.answersJson as Record<string, unknown> | null) ?? {};
    const cov = evaluateIso13485ManualCoverage({
      answers,
      kysDocs,
      manualSectionHeadings,
      qualityManualGenerated: session?.composerDocumentId != null,
    });
    const withContent = kysDocs.filter(
      (d) => (d.content ?? "").trim().length > 80 && d.status !== "MISSING",
    );
    const sopsWithContent = withContent.filter((d) => d.code?.startsWith("SOP-")).length;
    const approved = kysDocs.filter((d) => d.status === "APPROVED").length;

    console.log(`--- ${c.name}`);
    console.log(`ISO 13485 madde skoru: ${cov.percent}/100`);
    console.log(
      `Tam: ${cov.rows.filter((r) => r.status === "covered").length} | Kısmi: ${cov.rows.filter((r) => r.status === "partial").length} | Eksik: ${cov.rows.filter((r) => r.status === "missing").length} (toplam ${cov.rows.length} madde)`,
    );
    console.log(`KYS içerikli: ${withContent.length}/${kysDocs.length} | Onaylı: ${approved}`);
    console.log(`SOP içerikli: ${sopsWithContent}/${ISO13485_DOCS.length}`);
    console.log(`Wizard: ${session?.status ?? "yok"}`);
    console.log(cov.summaryTr);
    console.log();
  }
}

main()
  .finally(() => prisma.$disconnect());
