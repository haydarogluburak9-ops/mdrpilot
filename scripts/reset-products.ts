/* Resets all products and product-linked data so you can add your own product and test.
 * Keeps: users, companies, memberships, subscription plans, standards knowledge base.
 * Removes: products (+cascaded children) and the records that only reference a product
 *          via SetNull (composer documents, audit sessions, uploaded files,
 *          legacy audit findings, CAPAs).
 *
 * Usage: npx tsx scripts/reset-products.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const before = await prisma.product.count();
  console.log(`Products before: ${before}`);

  // Records that reference a product only via SetNull — delete explicitly so we
  // don't leave orphaned, product-less rows behind after the products are gone.
  const composer = await prisma.composerDocument.deleteMany({});
  const auditSessions = await prisma.auditSession.deleteMany({});
  const uploaded = await prisma.uploadedFile.deleteMany({});
  const auditFindings = await prisma.auditFinding.deleteMany({});
  const capas = await prisma.cAPA.deleteMany({});

  // Deleting products cascades to: technical file sections, GSPR items, risk items,
  // clinical evaluation, PMS/PMCF plans, IFU/label documents, documents, AI analyses
  // and all of their evidence links.
  const products = await prisma.product.deleteMany({});

  const after = await prisma.product.count();

  console.log("---- Reset summary ----");
  console.log(`Composer documents deleted: ${composer.count}`);
  console.log(`Audit sessions deleted:     ${auditSessions.count}`);
  console.log(`Uploaded files deleted:     ${uploaded.count}`);
  console.log(`Audit findings deleted:     ${auditFindings.count}`);
  console.log(`CAPAs deleted:              ${capas.count}`);
  console.log(`Products deleted:           ${products.count}`);
  console.log(`Products after:             ${after}`);
  console.log("Done. You can now add your own product and test.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
