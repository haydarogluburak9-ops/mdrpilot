import { PrismaClient } from "@prisma/client";
import { getRuleBasedFormContent } from "../src/lib/qms/form-templates";

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: "Yılmaz" } },
    select: { id: true, name: true },
  });
  if (!company) throw new Error("Company not found");

  const forms = ["FORM-AN-01", "FORM-AN-02", "FORM-AN-03", "FORM-AN-04", "FORM-AN-05", "FORM-AN-06"];
  for (const code of forms) {
    const content = getRuleBasedFormContent(code, "tr");
    if (!content) continue;
    const updated = await prisma.qMSDocument.updateMany({
      where: { companyId: company.id, code, deletedAt: null },
      data: { content, status: "DRAFT" },
    });
    console.log(code, "updated:", updated.count);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
