import "server-only";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import {
  buildRuleBasedCerDraft,
  extractCerSectionsFromAi,
  mergeCerSections,
} from "@/lib/domain/clinical-cer-builder";
import { buildPreparedLiteratureSearch } from "@/lib/domain/clinical-literature-generator";
import { buildPreparedClinicalStudies } from "@/lib/domain/clinical-findings-generator";
import { displayRiskNo } from "@/lib/domain/risk-category-codes";
import {
  saveClinicalStudies,
  upsertClinicalEvaluation,
} from "@/lib/products/clinical-evaluation-service";
import { runPrompt } from "@/lib/ai/orchestrator";
import { AiTokenLimitError } from "@/lib/auth/errors";

/**
 * Full CER draft: rule-based base → optional live AI overlay (mergeCerSections) →
 * literature + studies scaffolding. Always persists a usable draft even if AI fails.
 */
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

  const productForCer = {
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
  };

  let sections = buildRuleBasedCerDraft({
    locale,
    product: productForCer,
    risks: riskItems.map((r) => ({
      ...r,
      riskNo: displayRiskNo(r, codingCtx),
    })),
  });

  let aiSource: "openai" | "anthropic" | "mock" | "skipped" = "skipped";
  try {
    const riskExtra = riskItems
      .slice(0, 40)
      .map(
        (r) =>
          `- ${displayRiskNo(r, codingCtx)}: ${r.hazardousSituation ?? ""} → ${r.harm ?? ""} (residual ${r.residualSeverity ?? "?"}/${r.residualProbability ?? "?"})`,
      )
      .join("\n");

    const { result, source } = await runPrompt(
      "cer",
      {
        name: product.name,
        deviceClass: productForCer.deviceClass,
        intendedPurpose: product.intendedPurpose ?? undefined,
        isSterile: product.isSterile,
        sterilization: product.sterilization ?? undefined,
        containsSoftware: product.containsSoftware,
        isInvasive: product.isInvasive,
        hasMeasuringFn: product.hasMeasuringFn,
        materials: product.materials ?? undefined,
        indications: product.indications ?? undefined,
        contraindications: product.contraindications ?? undefined,
        bodyContactDuration: product.bodyContactDuration ?? undefined,
        extra: riskExtra ? `Risk file excerpt:\n${riskExtra}` : undefined,
        _locale: locale,
      },
      { companyId, feature: "clinical-cer-draft" },
    );
    aiSource = source;
    const overlay = extractCerSectionsFromAi(result);
    if (overlay) sections = mergeCerSections(sections, overlay);

    const dataGaps = (result.data as { cer?: { dataGaps?: unknown } } | null)?.cer?.dataGaps;
    if (Array.isArray(dataGaps) && dataGaps.length) {
      // Persist gaps via literature/gap sync later; keep in report footnote for now
      const gapLines = dataGaps.filter((g): g is string => typeof g === "string" && g.trim().length > 0);
      if (gapLines.length) {
        sections = {
          ...sections,
          report: `${sections.report}\n\n### ${locale === "tr" ? "Veri boşlukları (AI)" : "Data gaps (AI)"}\n\n${gapLines.map((g) => `- ${g}`).join("\n")}`,
        };
      }
    }
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
    console.warn("[clinical-evaluation-draft] AI CER overlay skipped:", err);
  }

  const literatureData = await buildPreparedLiteratureSearch({
    locale,
    product: {
      name: product.name,
      model: product.model,
      deviceClass: productForCer.deviceClass,
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
      deviceClass: productForCer.deviceClass,
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

  const evaluation = await saveClinicalStudies(companyId, productId, preparedStudies, locale);
  return { evaluation, aiSource };
}
