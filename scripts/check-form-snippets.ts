import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const codes = ["FORM-CAPA-01", "FORM-CH-01", "FORM-IA-01", "FORM-MR-01", "FORM-NCP-01"];
const c = await p.company.findFirst({ where: { name: { contains: "Yılmaz" } } });
const docs = await p.qMSDocument.findMany({
  where: { companyId: c!.id, code: { in: codes }, deletedAt: null },
  select: { code: true, parentProcedureCode: true, content: true },
});
for (const d of docs) {
  console.log("---", d.code, d.parentProcedureCode);
  console.log((d.content ?? "").slice(0, 180).replace(/\n/g, " "));
}
await p.$disconnect();
