import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { riskOutlineFor, type RiskDocKind } from "@/lib/domain/risk-document-outlines";
import { normalizeRiskDocMarkdown } from "@/lib/domain/risk-markdown-normalize";
import {
  buildRiskTemplateContext,
  buildRuleBasedRiskDocuments,
  buildRiskPlanMarkdown,
  RISK_FORM_META,
} from "@/lib/domain/risk-management-templates";
import { sterilizationText } from "@/lib/domain/sterilization";
import { getMeteredAiProvider, aiProviderInfo, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { env } from "@/lib/env";
import { REGULATORY_GUARDRAILS } from "@/lib/ai/prompts/shared";
import { injectPlanApprovalBlock, injectPlanTableESections } from "@/lib/domain/risk-plan-table-e-markdown";
import { injectPlanRiskMatrixBlock } from "@/lib/domain/risk-plan-risk-matrix";
import { parseTableERowsJson } from "@/lib/domain/risk-table-e";
import { upsertRiskManagementFile } from "@/lib/products/risk-management-service";

const resultSchema = z.object({
  markdown: z.string(),
  missingInformation: z.array(z.string()).default([]),
});

export type RiskDocSource = "openai" | "anthropic" | "rules" | "mock";

export interface GeneratedRiskDocument {
  kind: RiskDocKind;
  content: string;
  source: RiskDocSource;
  model: string;
  missingInformation: string[];
  liveAiUsed: boolean;
  aiFallbackReason?: string;
}

const LANG_NAME: Record<string, string> = { tr: "Turkish", en: "English" };
const L = (locale: string, en: string, tr: string) => (locale === "tr" ? tr : en);

/** Numbered template text → markdown with ## headings (teknik dosya ile aynı mantık). */
function numberedTemplateToMarkdown(template: string): string {
  const body = template.replace(/^[\s\S]*?─{3,}[\s\S]*?─{3,}\s*/m, "").trim();
  const chunks = body.split(/\n(?=\d+\.\s)/).filter((c) => c.trim());
  const sections: string[] = [];

  for (const chunk of chunks) {
    const lines = chunk.trim().split("\n");
    const head = lines[0]?.trim() ?? "";
    const m = /^\d+\.\s*(.+)$/.exec(head);
    if (m) {
      const rest = lines.slice(1).join("\n").trim();
      sections.push(`## ${m[1].trim()}\n\n${rest}`);
    } else if (head.startsWith("ONAY") || head.startsWith("APPROVAL")) {
      sections.push(`## ${head.split(":")[0].trim()}\n\n${lines.slice(1).join("\n").trim() || head}`);
    }
  }

  const onay = body.match(/^(ONAY:[\s\S]+)$/m);
  if (onay && !sections.some((s) => /onay|approval/i.test(s))) {
    sections.push(`## Onay\n\n${onay[1].trim()}`);
  }

  return sections.join("\n\n");
}

function ruleBasedMarkdown(kind: RiskDocKind, ctx: ReturnType<typeof buildRiskTemplateContext>, locale: "tr" | "en") {
  if (kind === "plan") {
    return locale === "tr" ? buildRiskPlanMarkdown(ctx) : buildRiskPlanMarkdown(ctx);
  }

  const containsSoftwareNote =
    locale === "tr"
      ? "Yazılım içerir — IEC 62304 değerlendirmesi."
      : "Contains software — IEC 62304 assessment.";
  const ruled = buildRuleBasedRiskDocuments({ ...ctx, containsSoftwareNote });
  const raw = kind === "report" ? ruled.report : ruled.managementPolicy;
  return numberedTemplateToMarkdown(raw);
}

function describeProductBlock(p: {
  name: string;
  brand?: string | null;
  model?: string | null;
  deviceClass: string;
  intendedPurpose?: string | null;
  indications?: string | null;
  contraindications?: string | null;
  materials?: string | null;
  isSterile: boolean;
  sterilization: string;
  containsSoftware: boolean;
  isInvasive: boolean;
  isImplantable: boolean;
  riskItemCount: number;
}, locale: string) {
  return [
    `${L(locale, "Device name", "Cihaz adı")}: ${p.name}`,
    p.brand ? `${L(locale, "Brand", "Marka")}: ${p.brand}` : "",
    p.model ? `${L(locale, "Model", "Model")}: ${p.model}` : "",
    `${L(locale, "Device class", "Cihaz sınıfı")}: ${DEVICE_CLASS_LABEL[p.deviceClass as keyof typeof DEVICE_CLASS_LABEL] ?? p.deviceClass}`,
    p.intendedPurpose ? `${L(locale, "Intended purpose", "Kullanım amacı")}: ${p.intendedPurpose}` : "",
    p.indications ? `${L(locale, "Indications", "Endikasyonlar")}: ${p.indications}` : "",
    p.contraindications ? `${L(locale, "Contraindications", "Kontrendikasyonlar")}: ${p.contraindications}` : "",
    p.materials ? `${L(locale, "Materials", "Malzemeler")}: ${p.materials}` : "",
    `${L(locale, "Sterilization", "Sterilizasyon")}: ${p.sterilization}`,
    `${L(locale, "Risk items (FMEA)", "Risk satırları (FMEA)")}: ${p.riskItemCount}`,
    p.containsSoftware ? L(locale, "Contains software", "Yazılım içerir") : "",
    p.isInvasive ? L(locale, "Invasive", "İnvaziv") : "",
    p.isImplantable ? L(locale, "Implantable", "İmplant") : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function generateRiskDocument(
  companyId: string,
  productId: string,
  kind: RiskDocKind,
  locale: string,
): Promise<GeneratedRiskDocument | null> {
  const row = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: {
      company: true,
      riskItems: { select: { id: true } },
      technicalSections: { select: { key: true, content: true, applicable: true } },
      riskManagementFile: true,
    },
  });
  if (!row) return null;

  const sterLabel =
    sterilizationText({
      isSterile: row.isSterile,
      sterilization: row.sterilization,
      variants: Array.isArray(row.variantsJson) ? row.variantsJson : undefined,
    }) || row.sterilization;

  const loc = locale === "tr" ? "tr" : "en";
  const e1Rows = parseTableERowsJson(row.riskManagementFile?.planTableE1Rows, "E1", loc);
  const e2Rows = parseTableERowsJson(row.riskManagementFile?.planTableE2Rows, "E2", loc);
  const ctx = buildRiskTemplateContext(
    { ...row, riskItems: row.riskItems },
    row.company,
    sterLabel,
    loc,
    row.technicalSections,
    e1Rows,
    e2Rows,
  );

  const meta = RISK_FORM_META[kind];
  const langName = LANG_NAME[locale] ?? "English";
  const outline = riskOutlineFor(kind, locale === "tr" ? "tr" : "en");
  const tbc = L(locale, "[TO BE CONFIRMED]", "[TEYİT EDİLECEK]");

  let content = ruleBasedMarkdown(kind, ctx, locale === "tr" ? "tr" : "en");
  let source: RiskDocSource = "rules";
  let model = "rules";
  let missingInformation: string[] = [];
  let liveAiUsed = false;
  let aiFallbackReason: string | undefined;

  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId, feature: `risk-doc:${kind}` });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }
  if (provider) {
    const structureRule = [
      "- Use EXACTLY the following second-level (##) subheadings, in this exact order, verbatim.",
      "  Do NOT add, remove, reorder, rename, merge or translate them differently:",
      "  Use ONLY ## for headings — never ###, #### or #####.",
      ...outline.map((h) => `    ## ${h}`),
      "  Under each subheading write relevant product-specific content (short paragraphs or bullet lists).",
      "  Keep each section concise (2–4 sentences or a short bullet list) unless technical file excerpts require more detail.",
      ...(kind === "plan"
        ? [
            "  For ## 3.1.5 Biouyumluluk Sınıfı, ## 3.1.6 Ambalaj Malzeme Bilgisi and ## 3.1.8 EMDN Kodu ve Açıklaması use the TECHNICAL FILE excerpts below — expand with detail, do not replace with generic boilerplate.",
            "  For ## 6. Tablo E.1 and ## 7. Tablo E.2 output ONLY the ## heading line — full Table E.1/E.2 content is injected automatically from FMEA-linked data; do not write summary paragraphs instead of tables.",
          ]
        : []),
      `  If information is unknown, use "${tbc}" and list it in missingInformation.`,
    ];

    const docLabel =
      kind === "plan"
        ? L(locale, "Risk Management Plan", "Risk Yönetim Planı")
        : kind === "report"
          ? L(locale, "Risk Management Report", "Risk Yönetim Raporu")
          : L(locale, "Risk Management Policy", "Risk Yönetim Politikası");

    try {
      const raw = await provider.complete(
        [
          {
            role: "system",
            content: [
              REGULATORY_GUARDRAILS,
              "",
              "You are MDRpilot drafting ISO 14971:2019 risk management documentation.",
              `Document: ${docLabel} (${meta.formNo}).`,
              "",
              "Rules:",
              "- Produce a complete professional DRAFT in Markdown.",
              ...structureRule,
              "- Reference ISO 14971, ISO 13485, MDR Annex I where appropriate.",
              "- Do NOT invent test reports, certificate numbers or clinical data.",
              `- Write ALL natural-language text in ${langName}.`,
              '- Reply with JSON only: {"markdown": string, "missingInformation": string[]}.',
            ].join("\n"),
          },
          {
            role: "user",
            content: [
              `Draft: ${docLabel}`,
              "",
              "=== MANUFACTURER ===",
              `${L(locale, "Legal name", "Yasal unvan")}: ${ctx.legalName}`,
              `${L(locale, "Manufacturing sites", "Üretim yerleri")}: ${ctx.manufacturingSites}`,
              `${L(locale, "Notified Body", "Bildirilen kuruluş")}: ${ctx.notifiedBody}`,
              "",
              "=== PRODUCT ===",
              describeProductBlock(
                {
                  name: row.name,
                  brand: row.brand,
                  model: row.model,
                  deviceClass: row.deviceClass,
                  intendedPurpose: row.intendedPurpose,
                  indications: row.indications,
                  contraindications: row.contraindications,
                  materials: row.materials,
                  isSterile: row.isSterile,
                  sterilization: sterLabel,
                  containsSoftware: row.containsSoftware,
                  isInvasive: row.isInvasive,
                  isImplantable: row.isImplantable,
                  riskItemCount: row.riskItems.length,
                },
                locale,
              ),
              "",
              kind === "plan"
                ? [
                    "=== TECHNICAL FILE — use for sections 3.1.5, 3.1.6 and 3.1.8 (expand, do not contradict) ===",
                    "",
                    "3.1.5 Biocompatibility (from technical file):",
                    ctx.biocompatibilityDetail,
                    "",
                    "3.1.6 Packaging (from technical file):",
                    ctx.packagingDetail,
                    "",
                    "3.1.8 EMDN (from product / technical file):",
                    ctx.emdnDetail,
                  ].join("\n")
                : "",
              "",
              "Rule-based draft for structure reference (expand with product-specific detail):",
              content.slice(0, 3500),
            ].join("\n"),
          },
        ],
        { json: true },
      );
      const parsed = resultSchema.safeParse(extractJson(raw));
      if (parsed.success && parsed.data.markdown.trim().length > 80) {
        content = normalizeRiskDocMarkdown(parsed.data.markdown.trim());
        missingInformation = parsed.data.missingInformation;
        source = aiProviderInfo().provider === "anthropic" ? "anthropic" : "openai";
        model = aiProviderInfo().model;
        liveAiUsed = true;
      } else {
        aiFallbackReason =
          !raw.trim()
            ? "empty_response"
            : parsed.success
              ? "short_response"
              : "invalid_json";
        console.warn("[generate-risk-document] AI output not used:", {
          reason: aiFallbackReason,
          rawLength: raw.length,
          parseOk: parsed.success,
          markdownLength: parsed.success ? parsed.data.markdown.trim().length : 0,
        });
      }
    } catch (err) {
      aiFallbackReason = err instanceof Error ? err.message.slice(0, 200) : "provider_error";
      console.error("[generate-risk-document] AI failed, using rules", err);
    }
  } else if (env.ai.provider !== "mock" && !env.ai.apiKey) {
    aiFallbackReason = "missing_api_key";
  } else if (env.ai.provider === "mock") {
    aiFallbackReason = "mock_provider";
  }

  if (kind === "plan") {
    content = injectPlanTableESections(content, ctx.tableE1Detail, ctx.tableE2Detail, loc);
    content = injectPlanRiskMatrixBlock(content, ctx.riskMatrixDetail);
    content = injectPlanApprovalBlock(content, ctx.date, loc);
  }

  content = normalizeRiskDocMarkdown(content);

  const patch =
    kind === "plan"
      ? { plan: content }
      : kind === "report"
        ? { report: content }
        : { managementPolicy: content };

  await upsertRiskManagementFile(companyId, productId, patch);

  return { kind, content, source, model, missingInformation, liveAiUsed, aiFallbackReason };
}
