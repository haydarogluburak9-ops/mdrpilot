import { PrismaClient } from "@prisma/client";
import { ensureRiskSequences, resequenceProductRiskItems } from "../src/lib/products/risk-service";

async function main() {
  const p = new PrismaClient();
  const product = await p.product.findFirst({
    where: { deletedAt: null },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true },
  });
  if (!product) {
    console.log("no product");
    return;
  }
  console.log("product", product.name, product.id);

  const before = await p.riskItem.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: "asc" },
    select: { id: true, sequenceNo: true, riskNo: true, hazardousSituation: true, createdAt: true },
  });
  console.log("BEFORE", before.map((r) => ({ seq: r.sequenceNo, no: r.riskNo, h: r.hazardousSituation?.slice(0, 40) })));

  const changed = await ensureRiskSequences(product.id);
  console.log("ensureRiskSequences changed:", changed);

  const after = await p.riskItem.findMany({
    where: { productId: product.id },
    orderBy: { createdAt: "asc" },
    select: { sequenceNo: true, riskNo: true },
  });
  console.log("AFTER", after);

  await p.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
