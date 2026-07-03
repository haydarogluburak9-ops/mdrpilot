/**
 * Refresh SOP-CC content with consistent 5.x numbering.
 * Usage: npx tsx scripts/refresh-sop-cc.ts [companyNameSubstring]
 */
import { PrismaClient } from "@prisma/client";
import { buildSopCcProcedure } from "../src/lib/qms/procedure-templates";

const prisma = new PrismaClient();
const locale = "tr" as const;

async function main() {
  const filter = process.argv[2] ?? "Yılmaz";
  const company = await prisma.company.findFirst({
    where: { name: { contains: filter } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error(`Company not found: ${filter}`);

  const docs = await prisma.qMSDocument.findMany({
    where: {
      companyId: company.id,
      deletedAt: null,
      code: "SOP-CC",
    },
    select: { id: true, code: true, title: true, content: true },
  });

  if (!docs.length) {
    console.log(`No SOP-CC found for ${company.name}`);
    return;
  }

  const content = buildSopCcProcedure(locale);
  for (const doc of docs) {
    const hadMangled =
      /(?:^|\n)1\.?\s+Etki Değerlendirmesi/i.test(doc.content ?? "") ||
      /(?:^|\n)2\.?\s+Onay Süreci/i.test(doc.content ?? "") ||
      /(?:^|\n)2\.1\s+/m.test(doc.content ?? "");

    await prisma.qMSDocument.update({
      where: { id: doc.id },
      data: { content },
    });
    console.log(
      `Updated ${doc.code} (${doc.title})${hadMangled ? " — fixed mangled subheadings" : ""}`,
    );
  }

  console.log(`Done. ${docs.length} document(s) refreshed for ${company.name}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
