import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import {
  buildPreparedClinicalStudies,
  mergePreparedStudies,
} from "@/lib/domain/clinical-findings-generator";
import { parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { parseClinicalStudiesJson } from "@/lib/domain/clinical-study-model";
import { displayRiskNo } from "@/lib/domain/risk-category-codes";
import {
  getClinicalEvaluation,
  saveClinicalStudies,
} from "@/lib/products/clinical-evaluation-service";

export async function generatePreparedClinicalFindings(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
  options: { merge?: boolean } = {},
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      riskItems: { orderBy: { createdAt: "asc" } },
      clinicalEvaluation: true,
    },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const literatureData = parseLiteratureSearchJson(
    product.clinicalEvaluation?.literatureDataJson ?? null,
  );

  const codingCtx = product.riskItems.map((r) => ({
    id: r.id,
    riskNo: r.riskNo,
    tableERef: r.tableERef,
    riskSource: r.riskSource,
  }));

  const prepared = buildPreparedClinicalStudies({
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
    literatureData,
    risks: product.riskItems.map((r) => ({
      riskNo: displayRiskNo(r, codingCtx),
      hazardousSituation: r.hazardousSituation,
      harm: r.harm,
    })),
  });

  const existing = parseClinicalStudiesJson(product.clinicalEvaluation?.clinicalStudiesJson);
  const studies =
    options.merge && existing.length > 0
      ? mergePreparedStudies(existing, prepared)
      : prepared;

  return saveClinicalStudies(companyId, productId, studies, locale);
}

export async function getClinicalEvaluationWithProduct(
  companyId: string,
  productId: string,
) {
  const evaluation = await getClinicalEvaluation(companyId, productId);
  return evaluation;
}
