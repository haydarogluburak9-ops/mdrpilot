import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { buildRuleBasedCerDraft } from "@/lib/domain/clinical-cer-builder";
import { buildPreparedLiteratureSearch } from "@/lib/domain/clinical-literature-generator";
import { buildPreparedClinicalStudies } from "@/lib/domain/clinical-findings-generator";
import { displayRiskNo } from "@/lib/domain/risk-category-codes";
import {
  saveClinicalStudies,
  upsertClinicalEvaluation,
} from "@/lib/products/clinical-evaluation-service";

export async function generateClinicalEvaluationDraft(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
) {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      riskItems: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!product) return null;
  assertCompanyAccess(product.companyId, companyId);

  const riskItems = product.riskItems.map((r) => ({
    id: r.id,
    riskNo: r.riskNo,
    tableERef: r.tableERef,
    riskSource: r.riskSource,
    hazardousSituation: r.hazardousSituation,
    harm: r.harm,
    initialSeverity: r.initialSeverity,
    initialProbability: r.initialProbability,
    residualSeverity: r.residualSeverity,
    residualProbability: r.residualProbability,
    residualAssessment: r.residualAssessment,
    benefitRiskJustification: r.benefitRiskJustification,
  }));

  const codingCtx = riskItems.map((r) => ({
    id: r.id,
    riskNo: r.riskNo,
    tableERef: r.tableERef,
    riskSource: r.riskSource,
  }));

  const sections = buildRuleBasedCerDraft({
    locale,
    product: {
      name: product.name,
      model: product.model,
      deviceClass: DEVICE_CLASS_LABEL[product.deviceClass] ?? product.deviceClass,
      intendedPurpose: product.intendedPurpose,
      indications: product.indications,
      contraindications: product.contraindications,
      materials: product.materials,
      isSterile: product.isSterile,
      sterilization: product.sterilization,
      containsSoftware: product.containsSoftware,
      isInvasive: product.isInvasive,
      hasMeasuringFn: product.hasMeasuringFn,
      bodyContactDuration: product.bodyContactDuration,
      userProfile: product.userProfile,
    },
    risks: riskItems.map((r) => ({
      ...r,
      riskNo: displayRiskNo(r, codingCtx),
    })),
  });

  const literatureData = await buildPreparedLiteratureSearch({
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
    risks: riskItems.map((r) => ({
      riskNo: displayRiskNo(r, codingCtx),
      hazardousSituation: r.hazardousSituation,
      harm: r.harm,
    })),
  });
  const preparedStudies = buildPreparedClinicalStudies({
    locale,
    product: {
      name: product.name,
      deviceClass: DEVICE_CLASS_LABEL[product.deviceClass] ?? product.deviceClass,
      intendedPurpose: product.intendedPurpose,
      indications: product.indications,
      isSterile: product.isSterile,
      isInvasive: product.isInvasive,
      containsSoftware: product.containsSoftware,
    },
    literatureData,
    risks: riskItems.map((r) => ({
      riskNo: displayRiskNo(r, codingCtx),
      hazardousSituation: r.hazardousSituation,
      harm: r.harm,
    })),
  });

  await upsertClinicalEvaluation(companyId, productId, {
    ...sections,
    literatureData,
  });

  return saveClinicalStudies(companyId, productId, preparedStudies, locale);
}
