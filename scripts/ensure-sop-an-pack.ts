import { PrismaClient } from "@prisma/client";
import { ensureProcedurePack } from "../src/lib/qms/procedure-packs";

const p = new PrismaClient();

async function main() {
  const company = await p.company.findFirst({
    where: { name: { contains: "Yılmaz" } },
    select: { id: true, name: true },
  });
  if (!company) {
    console.log("no company");
    return;
  }
  const r = await ensureProcedurePack(company.id, "SOP-AN");
  console.log(company.name, JSON.stringify(r, null, 2));
  const children = await p.qMSDocument.findMany({
    where: {
      companyId: company.id,
      deletedAt: null,
      OR: [
        { parentProcedureCode: "SOP-AN" },
        { code: { in: ["FORM-CH-01", "FORM-CAPA-01", "FORM-NCP-01"] } },
      ],
    },
    select: { code: true, parentProcedureCode: true, linkedProcedureCodesJson: true },
    orderBy: { code: "asc" },
  });
  console.log(children);
}

main().finally(() => p.$disconnect());
