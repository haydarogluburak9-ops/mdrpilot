/**
 * One-off: fill FMEA row narratives in Turkish (no server-only imports).
 */
import { PrismaClient } from "@prisma/client";
import { buildRiskNarratives } from "../src/lib/domain/risk-narratives";
import {
  finalResidualFromMitigations,
  parseMitigationsJson,
  resolveMitigations,
  riskScore,
} from "../src/lib/domain/risk-template";

async function main() {
  const prisma = new PrismaClient();
  const productId = process.argv[2] ?? "cmqhzvw570007xslineek0cdo";
  const locale = "tr" as const;

  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { name: true, intendedPurpose: true },
  });

  const items = await prisma.riskItem.findMany({
    where: { productId },
    orderBy: { sequenceNo: "asc" },
  });

  let updated = 0;
  for (const item of items) {
    const mitigations = resolveMitigations({
      mitigations: parseMitigationsJson(item.mitigations),
      riskControlMeasure: item.riskControlMeasure,
      residualSeverity: item.residualSeverity,
      residualProbability: item.residualProbability,
    });
    const final = finalResidualFromMitigations(mitigations);
    const narratives = buildRiskNarratives(
      {
        hazardousSituation: item.hazardousSituation ?? item.hazard,
        harm: item.harm,
        residualScore: riskScore(final.severity, final.probability),
        residualLevel: final.level,
        intendedPurpose: product?.intendedPurpose,
        productName: product?.name,
      },
      locale,
    );

    await prisma.riskItem.update({
      where: { id: item.id },
      data: {
        residualAssessment: narratives.residualAssessment,
        benefitRiskJustification: narratives.benefitRiskJustification,
      },
    });
    updated++;
  }

  console.log(`Updated ${updated} risk rows for product ${productId}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
