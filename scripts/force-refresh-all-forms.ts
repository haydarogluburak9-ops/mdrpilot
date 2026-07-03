import { PrismaClient } from "@prisma/client";
import { getRuleBasedFormContent } from "../src/lib/qms/form-templates";

async function main() {
  const p = new PrismaClient();
  const company = await p.company.findFirst({ where: { name: { contains: "Yılmaz" } } });
  if (!company) throw new Error("no company");

  const forms = await p.qMSDocument.findMany({
    where: { companyId: company.id, deletedAt: null, code: { startsWith: "FORM-" } },
    select: { id: true, code: true, title: true, parentProcedureCode: true, clauseRefs: true },
  });

  for (const doc of forms) {
    const content = getRuleBasedFormContent(doc.code, "tr", {
      title: doc.title,
      parentProcedureCode: doc.parentProcedureCode,
      clauseRefs: doc.clauseRefs,
    });
    if (!content) continue;
    await p.qMSDocument.update({ where: { id: doc.id }, data: { content, status: "DRAFT" } });
    console.log("updated", doc.code);
  }
  await p.$disconnect();
}

main();
