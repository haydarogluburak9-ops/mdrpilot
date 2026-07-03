import { PrismaClient } from "@prisma/client";
import { buildAnDecisionFlowDiagram } from "../src/lib/qms/diagram-flow-templates";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: "Yılmaz" } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error("Company not found");

  const content = buildAnDecisionFlowDiagram("tr");
  const updated = await prisma.qMSDocument.updateMany({
    where: { companyId: company.id, code: "DIA-AN-01", deletedAt: null },
    data: { content, status: "DRAFT" },
  });
  console.log(company.name, "DIA-AN-01 updated:", updated.count, "chars:", content.length);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
