import { prisma } from "../src/lib/db";

async function main() {
  const company = await prisma.company.findFirst({
    where: { name: { contains: "Yılmaz" } },
  });
  if (!company) {
    console.log("Company not found");
    process.exit(0);
  }

  const qms = await prisma.qMSDocument.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { status: true, code: true, layer: true },
  });

  const statusCounts: Record<string, number> = {};
  for (const d of qms) statusCounts[d.status] = (statusCounts[d.status] ?? 0) + 1;

  const products = await prisma.product.findMany({
    where: { companyId: company.id, deletedAt: null },
    select: { id: true, name: true, deviceClass: true, basicUdiDi: true, udiDi: true },
  });

  const productDetails = [];
  for (const p of products.slice(0, 5)) {
    const tfTotal = await prisma.technicalFileSection.count({ where: { productId: p.id } });
    const tfApproved = await prisma.technicalFileSection.count({
      where: { productId: p.id, status: "APPROVED" },
    });
    const gsprTotal = await prisma.gSPRItem.count({ where: { productId: p.id } });
    const gsprApproved = await prisma.gSPRItem.count({
      where: { productId: p.id, status: "APPROVED" },
    });
    const risks = await prisma.riskItem.count({ where: { productId: p.id } });
    const clinical = await prisma.clinicalEvaluation.findFirst({ where: { productId: p.id } });

    productDetails.push({
      name: p.name,
      class: p.deviceClass,
      udi: p.udiDi || p.basicUdiDi || "—",
      tfApproved,
      tfTotal,
      gsprApproved,
      gsprTotal,
      risks,
      clinical: clinical?.status ?? "NO_RECORD",
    });
  }

  const capas = await prisma.cAPA.count({ where: { companyId: company.id } });

  console.log(
    JSON.stringify(
      {
        company: company.name,
        srn: company.srnNumber,
        notifiedBody: company.notifiedBody,
        qmsTotal: qms.length,
        qmsStatus: statusCounts,
        approvedQms: statusCounts.APPROVED ?? 0,
        inReviewQms: statusCounts.IN_REVIEW ?? 0,
        productCount: products.length,
        productDetails,
        capaRecords: capas,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
