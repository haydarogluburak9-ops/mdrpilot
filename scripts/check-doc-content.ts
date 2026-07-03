import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const codes = ["DOC-OTH-01", "LIST-DC-01", "SOP-MR", "SOP-HR", "SOP-INF", "SOP-DC"];

async function main() {
  const c = await prisma.company.findFirst({ where: { deletedAt: null } });
  if (!c) return;
  const docs = await prisma.qMSDocument.findMany({
    where: { companyId: c.id, code: { in: codes }, deletedAt: null },
    select: { id: true, code: true, content: true, status: true },
  });
  for (const d of docs) {
    console.log(d.code, (d.content ?? "").length, d.status, d.id);
  }
}

main().finally(() => prisma.$disconnect());
