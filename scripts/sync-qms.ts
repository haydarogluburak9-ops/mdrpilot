/* Non-destructive QMS register sync.
 *
 * Adds any missing ISO 13485 documented-procedure rows to every existing
 * company's QMS register (status MISSING) WITHOUT touching existing documents,
 * products or other data. Safe to run repeatedly.
 *
 * Run:  npx tsx scripts/sync-qms.ts
 */
import { PrismaClient } from "@prisma/client";
import { ISO13485_DOCS } from "../src/lib/domain/constants";
import { DEFAULT_QMS_REVISION } from "../src/lib/qms/revision";

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({ select: { id: true, name: true } });
  let totalAdded = 0;

  for (const company of companies) {
    const existing = await prisma.qMSDocument.findMany({
      where: { companyId: company.id },
      select: { code: true },
    });
    const seen = new Set(existing.map((d) => d.code).filter(Boolean) as string[]);

    const rows = ISO13485_DOCS.filter((d) => !seen.has(d.code)).map((d) => ({
      companyId: company.id,
      code: d.code,
      title: d.title,
      standard: "ISO 13485",
      clauseRefs: d.clauseRefs,
      status: "MISSING" as const,
      version: DEFAULT_QMS_REVISION,
    }));

    if (rows.length) {
      await prisma.qMSDocument.createMany({ data: rows });
      totalAdded += rows.length;
      console.log(`  ${company.name}: +${rows.length} procedures`);
    } else {
      console.log(`  ${company.name}: already complete`);
    }
  }

  console.log(`QMS sync complete. Total procedures added: ${totalAdded}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
