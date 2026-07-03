import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      riskItems: {
        select: { id: true, sequenceNo: true, riskNo: true, hazardousSituation: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
    take: 5,
  });

  for (const p of products) {
    if (p.riskItems.length === 0) continue;
    console.log(`\n${p.name} (${p.id}) — ${p.riskItems.length} risks`);
    for (const r of p.riskItems) {
      const sit = (r.hazardousSituation ?? "").slice(0, 40);
      console.log(
        `  seq=${String(r.sequenceNo).padStart(2)} riskNo=${r.riskNo} created=${r.createdAt.toISOString().slice(0, 19)} ${sit}`,
      );
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
