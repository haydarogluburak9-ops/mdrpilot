import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { resolveGsprNaReason, type ApplicabilityInput } from "@/lib/domain/applicability";
import { isEnglishNaJustification } from "@/lib/domain/gspr-na-reasons";
import { gsprRequirementText } from "@/lib/domain/gspr-text";
import { formatStandardReference } from "@/lib/domain/standards-catalog";
import { describeProduct } from "@/lib/ai/prompts/input";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { sterilizationText } from "@/lib/domain/sterilization";
import { getMeteredAiProvider, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { REGULATORY_GUARDRAILS } from "@/lib/ai/prompts/shared";
import { buildGsprDossierContext } from "@/lib/products/gspr-justification-context";
import {
  detailedRuleJustification,
  isGenericJustification,
} from "@/lib/products/gspr-justification-rules";

export interface GsprJustificationFillResult {
  justificationsUpdated: number;
  source: "ai" | "rules";
}

export interface GsprJustificationFillOptions {
  overwriteNo?: boolean;
  /** Replace generic placeholder justifications (e.g. "teknik dosyada belgelenecektir"). */
  overwriteGeneric?: boolean;
  /** Use AI when a provider is configured. Defaults to true if API key exists. */
  useAi?: boolean;
}

const AI_BATCH_SIZE = 8;

function productApplicabilityInput(product: {
  deviceClass: ApplicabilityInput["deviceClass"];
  isSterile: boolean;
  containsSoftware: boolean;
  hasMeasuringFn: boolean;
  isInvasive: boolean;
  isImplantable: boolean;
  isActive: boolean;
  isReusable: boolean;
  emitsRadiation: boolean;
  administersMedicineOrEnergy: boolean;
  containsMedicinalSubstance: boolean;
  containsBiologicalMaterial: boolean;
  isAbsorbable: boolean;
  containsCmrOrEndocrine: boolean;
  containsNanomaterial: boolean;
  isForLayUser: boolean;
}): ApplicabilityInput {
  return {
    deviceClass: product.deviceClass,
    isSterile: product.isSterile,
    containsSoftware: product.containsSoftware,
    hasMeasuringFn: product.hasMeasuringFn,
    isInvasive: product.isInvasive,
    isImplantable: product.isImplantable,
    isActive: product.isActive,
    isReusable: product.isReusable,
    emitsRadiation: product.emitsRadiation,
    administersMedicineOrEnergy: product.administersMedicineOrEnergy,
    containsMedicinalSubstance: product.containsMedicinalSubstance,
    containsBiologicalMaterial: product.containsBiologicalMaterial,
    isAbsorbable: product.isAbsorbable,
    containsCmrOrEndocrine: product.containsCmrOrEndocrine,
    containsNanomaterial: product.containsNanomaterial,
    isForLayUser: product.isForLayUser,
  };
}

async function aiJustifications(
  dossier: Awaited<ReturnType<typeof buildGsprDossierContext>>,
  items: {
    gsprNo: string;
    applicable: string;
    requirementSummary: string;
    standardReference: string | null;
  }[],
  locale: string,
  companyId: string,
): Promise<Map<string, string>> {
  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId, feature: "gspr-justification" });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }
  const out = new Map<string, string>();
  if (!provider) return out;

  const lang = locale === "tr" ? "Turkish" : "English";

  for (let i = 0; i < items.length; i += AI_BATCH_SIZE) {
    const chunk = items.slice(i, i + AI_BATCH_SIZE);
    const list = chunk
      .map((g) => {
        const row = dossier.rowContexts.get(g.gsprNo);
        const req = gsprRequirementText(g.gsprNo, g.requirementSummary, locale === "tr" ? "tr" : "en");
        const std = g.standardReference
          ? formatStandardReference(g.standardReference) ?? g.standardReference
          : "";
        const rowEvidence = row?.linkedFiles.length
          ? `Linked files: ${row.linkedFiles.join("; ")}`
          : row?.evidenceDocument
            ? `Evidence note: ${row.evidenceDocument}`
            : "No file linked yet";
        return [
          `- GSPR ${g.gsprNo} [${g.applicable}]`,
          `  Requirement: ${req}`,
          std ? `  Standard: ${std}` : "",
          `  ${rowEvidence}`,
        ]
          .filter(Boolean)
          .join("\n");
      })
      .join("\n\n");

    const system = `${REGULATORY_GUARDRAILS}

Task: Write substantive GSPR checklist justifications for a medical device technical file.
Write ALL text in ${lang}. Keep GSPR numbers and standard edition labels unchanged.

Each justification MUST be 3–5 sentences and follow this structure:
1) Why this GSPR applies to THIS specific device (use device characteristics from context).
2) What was DONE: concrete processes, analyses, validations, controls (use dossier/file/risk context when available).
3) Outcome: e.g. benefit-risk acceptable, biocompatibility demonstrated, sterilization validated, label/IFU compliant.
4) Final sentence ONLY: where evidence is filed (document names from context). Do NOT use the closing sentence as the whole answer.

FORBIDDEN as sole content:
- "uygunluk gerekçesi teknik dosyada belgelenecektir" / "compliance will be demonstrated in the technical file" without describing work done.
- Truncating the requirement text in parentheses instead of explaining compliance.

Do not invent test results, certificates or clinical data not supported by the dossier context.`;

    const user = [
      "=== DEVICE ===",
      dossier.productDesc,
      "",
      dossier.riskBlock,
      "",
      dossier.filesBlock,
      "",
      "=== GSPR ROWS ===",
      list,
      "",
      'Return ONLY JSON: { "justifications": [{ "gsprNo": string, "justification": string }] }',
    ].join("\n");

    try {
      const raw = await provider.complete(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { json: true },
      );
      const json = extractJson(raw) as { justifications?: { gsprNo?: string; justification?: string }[] };
      for (const row of json.justifications ?? []) {
        if (row.gsprNo && row.justification?.trim()) out.set(row.gsprNo, row.justification.trim());
      }
    } catch (err) {
      console.error("[gspr-justification-fill] AI batch failed", err);
    }
  }
  return out;
}

/**
 * Fill GSPR justification fields using AI (when configured) with detailed rule-based fallback.
 */
export async function fillGsprJustifications(
  productId: string,
  companyId: string,
  locale = "tr",
  opts?: GsprJustificationFillOptions,
): Promise<GsprJustificationFillResult> {
  const useAi =
    opts?.useAi ??
    Boolean(
      await getMeteredAiProvider({ companyId, feature: "gspr-justification" }).catch((err) => {
        if (err instanceof AiTokenLimitError) throw err;
        return null;
      }),
    );

  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: {
      name: true,
      deviceClass: true,
      intendedPurpose: true,
      isSterile: true,
      sterilization: true,
      containsSoftware: true,
      isInvasive: true,
      hasMeasuringFn: true,
      materials: true,
      indications: true,
      contraindications: true,
      bodyContactDuration: true,
      isImplantable: true,
      isActive: true,
      isReusable: true,
      emitsRadiation: true,
      administersMedicineOrEnergy: true,
      containsMedicinalSubstance: true,
      containsBiologicalMaterial: true,
      isAbsorbable: true,
      containsCmrOrEndocrine: true,
      containsNanomaterial: true,
      isForLayUser: true,
      variantsJson: true,
      gsprItems: {
        select: {
          id: true,
          gsprNo: true,
          applicable: true,
          requirementSummary: true,
          standardReference: true,
          justification: true,
          evidenceDocument: true,
        },
      },
    },
  });
  if (!product) throw new NotFoundError();

  const appInput = productApplicabilityInput(product);
  const needsFill = product.gsprItems.filter((g) => {
    if (!g.justification?.trim()) return true;
    if (g.applicable === "NO" && locale === "tr") {
      if (opts?.overwriteNo) return true;
      if (isEnglishNaJustification(g.justification)) return true;
    }
    if (opts?.overwriteGeneric && isGenericJustification(g.justification, locale)) return true;
    return false;
  });
  if (!needsFill.length) return { justificationsUpdated: 0, source: "rules" };

  const productDesc = describeProduct({
    name: product.name,
    deviceClass: DEVICE_CLASS_LABEL[product.deviceClass],
    intendedPurpose: product.intendedPurpose ?? undefined,
    isSterile: product.isSterile,
    sterilization:
      sterilizationText({
        isSterile: product.isSterile,
        sterilization: product.sterilization,
        variantsJson: product.variantsJson,
      }) ||
      product.sterilization ||
      undefined,
    containsSoftware: product.containsSoftware,
    isInvasive: product.isInvasive,
    hasMeasuringFn: product.hasMeasuringFn,
    materials: product.materials ?? undefined,
    indications: product.indications ?? undefined,
    contraindications: product.contraindications ?? undefined,
    bodyContactDuration: product.bodyContactDuration ?? undefined,
  });

  const dossier = await buildGsprDossierContext(
    productId,
    companyId,
    productDesc,
    product.gsprItems,
  );

  const aiItems = useAi ? needsFill.filter((g) => g.applicable !== "NO") : [];
  const aiMap = aiItems.length ? await aiJustifications(dossier, aiItems, locale, companyId) : new Map<string, string>();
  const usedAi = aiMap.size > 0;

  const updates: { id: string; justification: string }[] = [];

  for (const g of needsFill) {
    const naReason = g.applicable === "NO" ? resolveGsprNaReason(g.gsprNo, appInput) : undefined;
    const rowCtx = dossier.rowContexts.get(g.gsprNo)!;
    const text =
      aiMap.get(g.gsprNo) ??
      detailedRuleJustification(
        rowCtx,
        product.name,
        product.intendedPurpose,
        naReason,
        dossier.riskBlock,
        locale,
      );
    updates.push({ id: g.id, justification: text });
  }

  if (updates.length) {
    await prisma.$transaction(
      updates.map((u) =>
        prisma.gSPRItem.update({ where: { id: u.id }, data: { justification: u.justification } }),
      ),
    );
  }
  return { justificationsUpdated: updates.length, source: usedAi ? "ai" : "rules" };
}
