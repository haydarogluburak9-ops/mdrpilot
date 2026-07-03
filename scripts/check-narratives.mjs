import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const productId = "cmqhzvw570007xslineek0cdo";

const rows = await prisma.riskItem.findMany({
  where: { productId },
  orderBy: { sequenceNo: "asc" },
  select: { sequenceNo: true, residualAssessment: true, benefitRiskJustification: true },
});

for (const r of rows) {
  const ra = (r.residualAssessment ?? "").slice(0, 60);
  const br = (r.benefitRiskJustification ?? "").slice(0, 60);
  const hasBr = Boolean(r.benefitRiskJustification?.trim());
  console.log(
    String(r.sequenceNo).padStart(2),
    hasBr ? "BR:yes" : "BR:no",
    "| RA:",
    ra || "(empty)",
    "| BR:",
    br || "(empty)",
  );
}

await prisma.$disconnect();
