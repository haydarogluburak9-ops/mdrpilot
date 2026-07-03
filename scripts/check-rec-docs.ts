import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const c = await prisma.company.findFirst({ where: { deletedAt: null } });
  if (!c) return;
  const rec = await prisma.qMSDocument.findMany({
    where: { companyId: c.id, code: { startsWith: "REC-" }, deletedAt: null },
    select: { code: true, status: true, content: true },
    orderBy: { code: "asc" },
  });
  for (const r of rec) console.log(r.code, (r.content?.length ?? 0), r.status);
  console.log("total docs", await prisma.qMSDocument.count({ where: { companyId: c.id, deletedAt: null } }));
}

main().finally(() => prisma.$disconnect());
