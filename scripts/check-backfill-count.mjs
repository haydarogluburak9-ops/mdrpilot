import { PrismaClient } from "@prisma/client";

// Minimal copy of narrative build for test
const prisma = new PrismaClient();
const productId = "cmqhzvw570007xslineek0cdo";

const count = await prisma.riskItem.count({
  where: {
    productId,
    OR: [
      { residualAssessment: null },
      { residualAssessment: "" },
      { benefitRiskJustification: null },
      { benefitRiskJustification: "" },
    ],
  },
});
console.log("rows needing backfill:", count);

await prisma.$disconnect();
