import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const codes = ["PLAN-IA-01","FORM-IA-01","FORM-CH-01","FORM-CAPA-01","FORM-MR-01","PLAN-MR-01","PLAN-QA-01","SOP-HR"];

async function main() {
  const c = await prisma.company.findFirst({ where: { deletedAt: null } });
  const docs = await prisma.qMSDocument.findMany({
    where: { companyId: c!.id, code: { in: codes }, deletedAt: null },
    select: { code: true, content: true, status: true },
  });
  for (const d of docs) console.log(d.code, (d.content??"").length, d.status);
}

main().finally(() => prisma.$disconnect());
