import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { buildPico } from "@/lib/domain/clinical-literature-generator";

export async function suggestPicoForProduct(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      riskItems: { orderBy: { createdAt: "asc" }, take: 1 },
    },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  return buildPico({
    locale,
    product: {
      name: product.name,
      model: product.model,
      deviceClass: DEVICE_CLASS_LABEL[product.deviceClass] ?? product.deviceClass,
      intendedPurpose: product.intendedPurpose,
      indications: product.indications,
      patientPopulation: product.patientPopulation,
      userProfile: product.userProfile,
      isSterile: product.isSterile,
      isInvasive: product.isInvasive,
      containsSoftware: product.containsSoftware,
      isImplantable: product.isImplantable,
      materials: product.materials,
    },
    risks: [],
  });
}
