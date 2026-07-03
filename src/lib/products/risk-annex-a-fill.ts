import "server-only";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { describeProduct } from "@/lib/ai/prompts/input";
import { REGULATORY_GUARDRAILS } from "@/lib/ai/prompts/shared";
import { getMeteredAiProvider, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { sterilizationText } from "@/lib/domain/sterilization";
import {
  annexAHasAnswers,
  parseAnnexARowsJson,
  ruleBasedAnnexARows,
  type RiskAnnexARow,
} from "@/lib/domain/risk-annex-a";
import { buildRiskTemplateContext } from "@/lib/domain/risk-management-templates";
import { getProductForCompany } from "@/lib/data/queries";
import { upsertRiskManagementFile } from "@/lib/products/risk-management-service";

export interface AnnexAFillResult {
  rows: RiskAnnexARow[];
  source: "ai" | "rules";
}

async function aiAnnexAnswers(
  dossier: string,
  rows: RiskAnnexARow[],
  locale: string,
  companyId: string,
): Promise<Map<string, string> | null> {
  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId, feature: "risk-annex-a" });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }
  if (!provider) return null;

  const lang = locale === "tr" ? "Turkish" : "English";
  const list = rows
    .map((r) => `${r.id} | ${r.characteristic} | ${r.question}`)
    .join("\n");

  const raw = await provider.complete(
    [
      {
        role: "system",
        content: `${REGULATORY_GUARDRAILS}

Task: Fill ISO 14971 Annex A question list answers for this specific medical device.
Write each answer in ${lang} (2-4 sentences, product-specific, reference standards/IFU where relevant).
Respond ONLY with JSON: { "answers": { "<rowId>": "<answer text>", ... } }`,
      },
      {
        role: "user",
        content: [dossier, "", "Annex A rows:", list].join("\n"),
      },
    ],
    { json: true },
  );

  const json = extractJson(raw) as { answers?: Record<string, string> } | null;
  if (!json?.answers || typeof json.answers !== "object") return null;

  const out = new Map<string, string>();
  for (const [id, text] of Object.entries(json.answers)) {
    if (typeof text === "string" && text.trim()) out.set(id, text.trim());
  }
  return out.size > 0 ? out : null;
}

export async function fillAnnexAQuestions(
  productId: string,
  companyId: string,
  options: { locale?: string; overwrite?: boolean } = {},
): Promise<AnnexAFillResult> {
  const locale = options.locale === "tr" ? "tr" : "en";
  const overwrite = options.overwrite ?? false;

  const row = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: { company: true, riskManagementFile: true },
  });
  if (!row) throw new NotFoundError("Product not found");

  const sterLabel =
    sterilizationText({
      isSterile: row.isSterile,
      sterilization: row.sterilization,
      variants: Array.isArray(row.variantsJson) ? row.variantsJson : undefined,
    }) || row.sterilization;

  const ctx = buildRiskTemplateContext(row, row.company, sterLabel, locale);
  const ruled = ruleBasedAnnexARows(
    {
      intendedPurpose: ctx.intendedPurpose,
      indications: ctx.indications,
      contraindications: ctx.contraindications,
      materials: ctx.materials,
      sterilization: ctx.sterilization,
      containsSoftware: row.containsSoftware,
      isImplantable: row.isImplantable,
      isInvasive: row.isInvasive,
      isSterile: row.isSterile,
      isActive: row.isActive,
      isReusable: row.isReusable,
      fmeaRef: ctx.fmeaRef,
      reportRef: ctx.reportRef,
    },
    locale,
  );

  const existing = parseAnnexARowsJson(row.riskManagementFile?.annexARows, locale);
  let merged = ruled;
  let source: "ai" | "rules" = "rules";

  const product = await getProductForCompany(companyId, productId);
  if (product) {
    const dossier = describeProduct({
      name: product.name,
      deviceClass: DEVICE_CLASS_LABEL[product.deviceClass] ?? product.deviceClass,
      intendedPurpose: product.intendedPurpose,
      isSterile: product.isSterile,
      sterilization: sterLabel,
      containsSoftware: product.containsSoftware,
      isInvasive: product.isInvasive,
      materials: product.materials,
      indications: product.indications,
      contraindications: product.contraindications,
      bodyContactDuration: product.bodyContactDuration,
      extra: `Company: ${row.company.name}`,
    });

    try {
      const aiMap = await aiAnnexAnswers(dossier, ruled, locale, companyId);
      if (aiMap) {
        merged = ruled.map((r) => ({
          ...r,
          answer: aiMap.get(r.id) ?? r.answer,
        }));
        source = "ai";
      }
    } catch (err) {
      console.error("[annex-a-fill] AI failed, using rules", err);
    }
  }

  if (!overwrite && annexAHasAnswers(existing)) {
    merged = existing.map((r) => {
      const filled = merged.find((m) => m.id === r.id);
      return {
        ...r,
        answer: r.answer.trim() ? r.answer : filled?.answer ?? "",
      };
    });
  }

  await upsertRiskManagementFile(companyId, productId, { annexARows: merged });

  return { rows: merged, source };
}
