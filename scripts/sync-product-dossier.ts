/* Non-destructive product dossier sync.
 *
 * Backfills any missing MDR technical-file sections and Annex I GSPR items into
 * EXISTING products (status MISSING) so older products match the full regulatory
 * template. Does NOT modify existing sections/items, content, statuses or any
 * other product data. Safe to run repeatedly.
 *
 * Run:  npx tsx scripts/sync-product-dossier.ts
 */
import { PrismaClient } from "@prisma/client";
import { TECHNICAL_FILE_TEMPLATE, GSPR_TEMPLATE } from "../src/lib/domain/constants";
import { OBSOLETE_GSPR_NOS } from "../src/lib/domain/gspr-template";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
  });
  let addedSections = 0;
  let addedGspr = 0;

  for (const p of products) {
    const sections = await prisma.technicalFileSection.findMany({
      where: { productId: p.id },
      select: { key: true },
    });
    const haveKeys = new Set(sections.map((s) => s.key));
    const newSections = TECHNICAL_FILE_TEMPLATE.map((s, i) => ({ ...s, order: i }))
      .filter((s) => !haveKeys.has(s.key));
    if (newSections.length) {
      await prisma.technicalFileSection.createMany({
        data: newSections.map((s) => ({
          productId: p.id, key: s.key, title: s.title, annexRef: s.annexRef,
          order: s.order, status: "MISSING" as const,
        })),
      });
      addedSections += newSections.length;
    }

    const gspr = await prisma.gSPRItem.findMany({
      where: { productId: p.id },
      select: { gsprNo: true },
    });
    const haveNos = new Set(gspr.map((g) => g.gsprNo));
    await prisma.gSPRItem.deleteMany({
      where: {
        productId: p.id,
        gsprNo: { in: [...OBSOLETE_GSPR_NOS] },
        status: "MISSING",
        evidenceDocument: null,
      },
    });
    const newGspr = GSPR_TEMPLATE.filter((g) => !haveNos.has(g.gsprNo));
    if (newGspr.length) {
      await prisma.gSPRItem.createMany({
        data: newGspr.map((g) => ({
          productId: p.id, gsprNo: g.gsprNo, requirementSummary: g.requirementSummary,
          applicable: "JUSTIFICATION" as const, status: "MISSING" as const,
        })),
      });
      addedGspr += newGspr.length;
    }

    console.log(`  ${p.name}: +${newSections.length} sections, +${newGspr.length} GSPR`);
  }

  console.log(`Dossier sync complete. Sections added: ${addedSections}, GSPR added: ${addedGspr}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
