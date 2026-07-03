import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({ where: { deletedAt: null } });
  if (!c) return;
  const docs = await prisma.qMSDocument.findMany({
    where: { companyId: c.id, deletedAt: null },
    select: { id: true, code: true, title: true, status: true, content: true, layer: true, parentProcedureCode: true },
    orderBy: { code: "asc" },
  });
  const empty = docs.filter((d) => (d.content?.trim() ?? "").length <= 80);
  console.log(`Total: ${docs.length}, empty: ${empty.length}`);
  for (const d of empty) {
    console.log(`${d.code} | ${d.status} | parent=${d.parentProcedureCode ?? "—"} | layer=${d.layer}`);
  }
}

main().finally(() => prisma.$disconnect());
