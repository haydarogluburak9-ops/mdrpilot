import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { buildRuleBasedFmeaBenefitRisk } from "@/lib/domain/fmea-benefit-risk";
import { parseMitigationsJson, resolveMitigations } from "@/lib/domain/risk-template";
import { getMeteredAiProvider, aiProviderInfo, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { REGULATORY_GUARDRAILS } from "@/lib/ai/prompts/shared";
import { upsertRiskManagementFile } from "@/lib/products/risk-management-service";
import type { RiskItem } from "@/lib/domain/types";

const resultSchema = z.object({
  text: z.string(),
});

export type FmeaBenefitRiskSource = "openai" | "anthropic" | "mock";

function serializeRisk(r: {
  hazardousSituation: string | null;
  harm: string | null;
  hazard: string;
  initialSeverity: number;
  initialProbability: number;
  residualSeverity: number;
  residualProbability: number;
  mitigations: unknown;
  residualAssessment: string | null;
  benefitRiskJustification: string | null;
}): RiskItem {
  const mitigations = parseMitigationsJson(r.mitigations);
  const item: RiskItem = {
    id: "",
    sequenceNo: 0,
    hazard: r.hazard,
    hazardousSituation: r.hazardousSituation ?? undefined,
    harm: r.harm ?? undefined,
    initialSeverity: r.initialSeverity,
    initialProbability: r.initialProbability,
    initialRiskLevel: "LOW",
    residualSeverity: r.residualSeverity,
    residualProbability: r.residualProbability,
    residualRiskLevel: "LOW",
    residualAssessment: r.residualAssessment ?? undefined,
    benefitRiskJustification: r.benefitRiskJustification ?? undefined,
    mitigations: mitigations ?? undefined,
  };
  if (!item.mitigations) item.mitigations = resolveMitigations(item);
  return item;
}

export async function generateFmeaBenefitRisk(
  companyId: string,
  productId: string,
  locale: "tr" | "en" = "tr",
): Promise<{ text: string; source: FmeaBenefitRiskSource; model: string } | null> {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: { riskItems: { orderBy: { createdAt: "asc" } } },
  });
  if (!product) return null;

  const risks = product.riskItems.map(serializeRisk);
  const ruleText = buildRuleBasedFmeaBenefitRisk(product, risks, locale);

  let text = ruleText;
  let source: FmeaBenefitRiskSource = "mock";
  let model = "rules";

  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId, feature: "fmea-benefit-risk" });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }
  if (provider && risks.length > 0) {
    const riskSummary = risks
      .map((r) => {
        const sit = r.hazardousSituation ?? r.hazard;
        const harm = r.harm ?? "—";
        return `- ${sit} → ${harm} (initial ${r.initialSeverity}×${r.initialProbability}, residual ${r.residualSeverity}×${r.residualProbability})`;
      })
      .join("\n");

    try {
      const raw = await provider.complete(
        [
          {
            role: "system",
            content: [
              REGULATORY_GUARDRAILS,
              "",
              "You are MDRpilot drafting ISO 14971 FMEA overall Risk/Benefit Analysis footer text.",
              `Language: ${locale === "tr" ? "Turkish" : "English"}.`,
              "Return JSON only: { \"text\": string } — one consolidated paragraph, plain text.",
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `Product: ${product.name}`,
              `Intended purpose: ${product.intendedPurpose ?? "—"}`,
              `Sterile: ${product.isSterile}, sterilization: ${product.sterilization}`,
              `Materials: ${product.materials ?? "—"}`,
              "",
              "FMEA risks:",
              riskSummary,
              "",
              "Cover manufacturing/sterilization where relevant, clinical risks, residual risk after controls, and benefit-risk conclusion.",
            ].join("\n"),
          },
        ],
        { json: true },
      );
      const parsed = resultSchema.safeParse(extractJson(raw));
      if (parsed.success && parsed.data.text.trim()) {
        text = parsed.data.text.trim();
        source = aiProviderInfo().provider === "anthropic" ? "anthropic" : "openai";
        model = aiProviderInfo().model;
      }
    } catch {
      // keep rule-based fallback
    }
  }

  await upsertRiskManagementFile(companyId, productId, { fmeaBenefitRiskAnalysis: text });
  return { text, source, model };
}
