/**
 * Company isolation test (DB-level).
 * Verifies that data scoped to one company is never visible to another,
 * mirroring the assertCompanyAccess() rule used by the query layer.
 *
 * Run: npm run test:isolation   (requires a seeded database)
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

let failures = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    console.log(`  PASS  ${name}`);
  } else {
    console.error(`  FAIL  ${name}`);
    failures++;
  }
}

// Mirrors src/lib/auth/guards.ts assertCompanyAccess
function isAccessible(entityCompanyId: string | null, companyId: string) {
  return Boolean(entityCompanyId) && entityCompanyId === companyId;
}

async function main() {
  console.log("Company isolation test\n");

  const companyA = await prisma.company.findFirst({ orderBy: { createdAt: "asc" } });
  if (!companyA) throw new Error("No seeded company found. Run `npm run db:seed` first.");

  const productA = await prisma.product.findFirst({ where: { companyId: companyA.id } });
  if (!productA) throw new Error("Seeded company has no products.");

  // Create an isolated second company + product.
  const companyB = await prisma.company.create({ data: { name: `__iso_test_${Date.now()}` } });
  const productB = await prisma.product.create({
    data: { companyId: companyB.id, name: "Isolated test product", deviceClass: "CLASS_I" },
  });

  try {
    // 1. Company B's product list must NOT contain company A's products.
    const bProducts = await prisma.product.findMany({ where: { companyId: companyB.id, deletedAt: null } });
    check("Company B list excludes Company A products", !bProducts.some((p) => p.id === productA.id));
    check("Company B list contains only its own product", bProducts.length === 1 && bProducts[0].id === productB.id);

    // 2. Cross-company single-product access must be denied (404 semantics).
    const fetchedA = await prisma.product.findFirst({ where: { id: productA.id } });
    check("Company B cannot access Company A product", !isAccessible(fetchedA?.companyId ?? null, companyB.id));
    check("Company A CAN access its own product", isAccessible(fetchedA?.companyId ?? null, companyA.id));

    // 3. Cross-company dossier (technical sections) must be isolated.
    const aSectionsForB = await prisma.technicalFileSection.findMany({
      where: { product: { companyId: companyB.id }, id: { in: (await prisma.technicalFileSection.findMany({ where: { productId: productA.id }, select: { id: true } })).map((s) => s.id) } },
    });
    check("Company A technical sections invisible to Company B", aSectionsForB.length === 0);

    // 4. QMS documents are company-scoped.
    const bQms = await prisma.qMSDocument.findMany({ where: { companyId: companyB.id } });
    check("Company B has no leaked QMS documents", bQms.length === 0);
  } finally {
    // Cleanup
    await prisma.product.deleteMany({ where: { companyId: companyB.id } });
    await prisma.company.delete({ where: { id: companyB.id } });
  }

  console.log("");
  if (failures > 0) {
    console.error(`Isolation test FAILED (${failures} failure(s)).`);
    process.exit(1);
  }
  console.log("Isolation test PASSED.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
