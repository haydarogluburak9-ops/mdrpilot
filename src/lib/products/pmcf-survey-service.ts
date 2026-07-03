import "server-only";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { getMeteredAiProvider, aiProviderInfo, extractJson } from "@/lib/ai/provider-factory";
import { AiTokenLimitError } from "@/lib/auth/errors";
import { buildPmcfSurveyTemplate } from "@/lib/domain/post-market-mdcg-builder";
import {
  formatPmcfSurveyMarkdown,
  parseSectionExtras,
  replaceMarkdownSection,
  type PmcfSurvey,
  type SectionExtras,
} from "@/lib/domain/pmcf-survey";
import { parseClinicalGapMatrix } from "@/lib/domain/clinical-gap-matrix";

const surveySchema = z.object({
  intro: z.string(),
  method: z.string(),
  targetPopulation: z.string(),
  sampleSizeNote: z.string(),
  questions: z
    .array(
      z.object({
        id: z.string().optional(),
        text: z.string(),
        responseType: z.enum(["yes_no", "likert_5", "frequency", "open"]).optional(),
      }),
    )
    .min(5)
    .max(15),
});

async function loadProductContext(companyId: string, productId: string) {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    include: {
      company: { select: { name: true } },
      clinicalEvaluation: { select: { gapMatrixJson: true } },
      technicalSections: { where: { key: { in: ["pmcf-plan", "pmcf-report"] } } },
    },
  });
  if (!product) throw new NotFoundError();
  return product;
}

function templateFallback(product: Awaited<ReturnType<typeof loadProductContext>>, locale: "tr" | "en"): PmcfSurvey {
  const body = buildPmcfSurveyTemplate(
    {
      name: product.name,
      brand: product.brand,
      model: product.model,
      deviceClass: product.deviceClass,
      intendedPurpose: product.intendedPurpose,
      userProfile: product.userProfile,
      patientPopulation: product.patientPopulation,
      company: product.company,
    },
    locale,
  );
  const questionLines = body
    .split("\n")
    .filter((l) => /^\d+\./.test(l.trim()) || l.trim().startsWith("- "))
    .map((l) => l.replace(/^[-\s]+/, "").replace(/^\d+\.\s*/, "").trim())
    .filter(Boolean);

  return {
    intro: locale === "tr"
      ? `MDCG 2020-7 kapsamında ${product.name} için PMCF kullanıcı geri bildirim anketi taslağı.`
      : `Draft PMCF user-feedback survey for ${product.name} per MDCG 2020-7.`,
    method: locale === "tr"
      ? "Yapılandırılmış anket; hedef kullanıcılara e-posta, yüz yüze veya dijital form ile uygulanır."
      : "Structured questionnaire administered via email, in-person, or digital form to target users.",
    targetPopulation: product.userProfile?.trim() || (locale === "tr" ? "[TEYİT EDİLECEK]" : "[TO BE CONFIRMED]"),
    sampleSizeNote: locale === "tr"
      ? "Örneklem büyüklüğü ve kabul kriterleri istatistiksel gerekçe ile planlanacaktır."
      : "Sample size and acceptance criteria to be planned with statistical justification.",
    questions: questionLines.map((text, i) => ({
      id: `q${i + 1}`,
      text,
      responseType: /likert|1–5|1-5/i.test(text) ? "likert_5" as const : /evet|yes\/no/i.test(text) ? "yes_no" as const : "open" as const,
    })),
    locale,
    generatedAt: new Date().toISOString(),
    source: "template",
  };
}

function gapSummary(product: Awaited<ReturnType<typeof loadProductContext>>, locale: "tr" | "en"): string {
  const matrix = parseClinicalGapMatrix(product.clinicalEvaluation?.gapMatrixJson ?? null);
  if (!matrix?.rows.length) return "";
  const tr = locale === "tr";
  return matrix.rows
    .filter((r) => (tr ? r.pmcfActionTr : r.pmcfActionEn) && (tr ? r.pmcfActionTr : r.pmcfActionEn) !== "—")
    .slice(0, 5)
    .map((r) => `- ${tr ? r.pmcfActionTr : r.pmcfActionEn}`)
    .join("\n");
}

export async function generatePmcfSurvey(
  companyId: string,
  productId: string,
  locale: "tr" | "en",
): Promise<{ survey: PmcfSurvey; sectionId: string }> {
  const product = await loadProductContext(companyId, productId);
  const planSection = product.technicalSections.find((s) => s.key === "pmcf-plan");
  if (!planSection) throw new NotFoundError();

  const gapBlock = gapSummary(product, locale);
  let survey: PmcfSurvey | null = null;
  let provider: Awaited<ReturnType<typeof getMeteredAiProvider>> = null;
  try {
    provider = await getMeteredAiProvider({ companyId, feature: "pmcf-survey" });
  } catch (err) {
    if (err instanceof AiTokenLimitError) throw err;
  }

  if (provider) {
    const system = [
      "You design PMCF user-feedback questionnaires per MDR Annex XIV Part B and MDCG 2020-7 Section E.2.",
      `Write ALL text in ${locale === "tr" ? "Turkish" : "English"}.`,
      "Questions must be practical for real-world clinical users of the device.",
      "Cover safety, performance, IFU clarity, and vigilance reporting where relevant.",
      "Return JSON only.",
    ].join("\n");

    const user = [
      `Device: ${product.name}`,
      product.intendedPurpose ? `Intended purpose: ${product.intendedPurpose}` : "",
      product.userProfile ? `Intended user: ${product.userProfile}` : "",
      product.patientPopulation ? `Patient population: ${product.patientPopulation}` : "",
      `Device class: ${product.deviceClass}`,
      gapBlock ? `PMCF actions from clinical gap matrix:\n${gapBlock}` : "",
      "",
      'Return JSON: { "intro", "method", "targetPopulation", "sampleSizeNote", "questions": [{ "text", "responseType": "yes_no"|"likert_5"|"frequency"|"open" }] }',
      "Provide 8–10 questions.",
    ]
      .filter(Boolean)
      .join("\n");

    try {
      const raw = await provider.complete(
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { json: true },
      );
      const parsed = surveySchema.safeParse(extractJson(raw));
      if (parsed.success) {
        const info = aiProviderInfo();
        survey = {
          ...parsed.data,
          questions: parsed.data.questions.map((q, i) => ({
            id: q.id ?? `q${i + 1}`,
            text: q.text,
            responseType: q.responseType,
          })),
          locale,
          generatedAt: new Date().toISOString(),
          source: info.provider === "anthropic" ? "anthropic" : info.provider === "openai" ? "openai" : "mock",
        };
      }
    } catch (err) {
      console.error("[pmcf-survey] AI generation failed", err);
    }
  }

  if (!survey) survey = templateFallback(product, locale);

  const surveyMarkdown = formatPmcfSurveyMarkdown(survey);
  const prevExtras = parseSectionExtras(planSection.sectionExtrasJson);
  const nextExtras: SectionExtras = { ...prevExtras, pmcfSurvey: survey };

  const planContent = planSection.content?.trim()
    ? replaceMarkdownSection(
        planSection.content,
        /questionnaire|anket|soru formu/i,
        surveyMarkdown,
      )
    : null;

  await prisma.technicalFileSection.update({
    where: { id: planSection.id },
    data: {
      sectionExtrasJson: nextExtras as object,
      ...(planContent ? { content: planContent, status: planSection.status === "MISSING" ? "DRAFT" : planSection.status } : {}),
      updatedAt: new Date(),
    },
  });

  return { survey, sectionId: planSection.id };
}

export async function savePmcfSurveyResults(
  companyId: string,
  productId: string,
  resultsMarkdown: string,
): Promise<{ sectionId: string }> {
  const product = await loadProductContext(companyId, productId);
  const reportSection = product.technicalSections.find((s) => s.key === "pmcf-report");
  if (!reportSection) throw new NotFoundError();

  const prevExtras = parseSectionExtras(reportSection.sectionExtrasJson);
  const nextExtras: SectionExtras = { ...prevExtras, pmcfSurveyResults: resultsMarkdown.trim() };

  const reportContent = reportSection.content?.trim()
    ? replaceMarkdownSection(
        reportSection.content,
        /results.*questionnaire|sonuçlar.*anket/i,
        resultsMarkdown.trim(),
      )
    : null;

  await prisma.technicalFileSection.update({
    where: { id: reportSection.id },
    data: {
      sectionExtrasJson: nextExtras as object,
      ...(reportContent
        ? { content: reportContent, status: reportSection.status === "MISSING" ? "DRAFT" : reportSection.status }
        : {}),
      updatedAt: new Date(),
    },
  });

  return { sectionId: reportSection.id };
}
