import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError, AiTokenLimitError } from "@/lib/auth/errors";
import { runPrompt } from "@/lib/ai/orchestrator";
import { getMeteredAiProvider } from "@/lib/ai/provider-factory";
import { getAiTokenBalance } from "@/lib/billing/ai-tokens";
import { canonicalQmsClauseRefs } from "@/lib/domain/constants";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import {
  appendRevisionHistory,
  parseRevisionHistory,
  planQmsRevisionOnContentChange,
  revisionNoToLabel,
} from "@/lib/qms/revision";
import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";
import { getRuleBasedChildContent } from "@/lib/qms/rule-based-child-content";
import { getRuleBasedProcedureContent } from "@/lib/qms/procedure-templates";
import type { DocStatus } from "@/lib/domain/types";
import type { Lang } from "@/lib/i18n/locales";
import { binaryContentLang } from "@/lib/i18n/locales";

function sectionsToMarkdown(data: unknown): string {
  const doc = (data as { document?: { sections?: { heading?: string; body?: string }[] } })?.document;
  if (!doc?.sections?.length) return "";
  return doc.sections
    .map((s) => {
      const h = (s.heading ?? "").trim();
      const b = (s.body ?? "").trim();
      if (!h && !b) return "";
      if (h.startsWith("#")) return `${h}\n\n${b}`.trim();
      return `## ${h}\n\n${b}`.trim();
    })
    .filter(Boolean)
    .join("\n\n");
}

function templateHintForAi(template: string, locale: "tr" | "en"): string {
  const label =
    locale === "tr"
      ? "Yapısal referans şablonu (bölüm sırası ve numaralandırmayı koru; metni şirket bağlamına göre özelleştir — aynen kopyalama)"
      : "Structural reference template (keep section order and numbering; customize text for company context — do not copy verbatim)";
  return `${label}:\n${template.trim()}`;
}

async function liveQmsAiAvailable(companyId: string): Promise<boolean> {
  try {
    const provider = await getMeteredAiProvider({ companyId, feature: "qms-generate" });
    return provider !== null;
  } catch (err) {
    if (err instanceof AiTokenLimitError) return false;
    throw err;
  }
}

function ruleTemplateSummary(
  rulesLocale: "tr" | "en",
  procedureTemplate: string | null,
  docLayer: ReturnType<typeof inferQmsLayerFromCode>,
): string {
  if (rulesLocale === "tr") {
    if (procedureTemplate) return "Kontrollü prosedür şablonu";
    if (docLayer === "FORM") return "Kontrollü form şablonu";
    if (docLayer === "DIAGRAM") return "Kontrollü şema şablonu";
    if (docLayer === "INSTRUCTION") return "Kontrollü iş talimatı şablonu";
    return "Kontrollü alt doküman şablonu";
  }
  if (procedureTemplate) return "Controlled procedure template";
  if (docLayer === "FORM") return "Controlled form template";
  if (docLayer === "DIAGRAM") return "Controlled diagram template";
  if (docLayer === "INSTRUCTION") return "Controlled work instruction template";
  return "Controlled child document template";
}

export interface QmsGenerateResult {
  content: string;
  source: string;
  model: string;
  summary: string;
  missingItems: string[];
  liveAiUsed: boolean;
  aiFallbackReason?: string;
  status: DocStatus;
  version: string;
  sync?: import("@/lib/qms/sync-operational-forms").OperationalFormSyncResult;
}

export async function generateQmsDocument(
  companyId: string,
  documentId: string,
  locale: Lang,
  generatedBy: string,
  extraContext?: string,
  wizardAnswers?: Record<string, unknown>,
  operationalLink?: { module: import("@/lib/operational/modules").OperationalLinkModule; id: string },
): Promise<QmsGenerateResult> {
  const rulesLocale = binaryContentLang(locale);
  const doc = await prisma.qMSDocument.findFirst({
    where: { id: documentId, companyId, deletedAt: null },
    include: {
      company: { select: { name: true } },
    },
  });
  if (!doc) throw new NotFoundError();

  const localizedTitle = qmsDocTitle(doc.code, doc.title, rulesLocale);

  const procedureTemplate = getRuleBasedProcedureContent(doc.code, rulesLocale);
  const ruleBasedContent =
    procedureTemplate ??
    getRuleBasedChildContent({
    code: doc.code,
    title: doc.title,
    layer: doc.layer,
    locale: rulesLocale,
    parentProcedureCode: doc.parentProcedureCode,
    clauseRefs: doc.clauseRefs,
  });

  let aiContext = extraContext?.trim();
  if (!aiContext) {
    if (doc.parentProcedureCode?.trim()) {
      const { buildProcedureChildAiContext } = await import("@/lib/qms/procedure-document-service");
      aiContext = await buildProcedureChildAiContext({
        companyId,
        locale: rulesLocale,
        childDoc: doc,
        wizardAnswers,
      });
    } else {
      const { buildQmsAiContext } = await import("@/lib/qms/wizard-context");
      aiContext = await buildQmsAiContext(companyId, rulesLocale, doc.code, wizardAnswers);
    }
  }

  const docLayer = inferQmsLayerFromCode(doc.code);
  const useLiveAi = await liveQmsAiAvailable(companyId);

  let promptContext = aiContext || "";
  if (useLiveAi && ruleBasedContent?.trim()) {
    promptContext = [promptContext, templateHintForAi(ruleBasedContent, rulesLocale)].filter(Boolean).join("\n\n");
  }

  const { result, source, meta } = useLiveAi
    ? await runPrompt(
        "qms",
        {
          documentTitle: localizedTitle,
          standard: doc.standard,
          clauseRefs: canonicalQmsClauseRefs(doc.code, doc.clauseRefs),
          documentCode: doc.code ?? undefined,
          documentLayer: doc.layer ?? undefined,
          companyName: doc.company.name,
          context: promptContext || undefined,
          _locale: locale,
        },
        { companyId, feature: "qms-generate" },
      )
    : ruleBasedContent
      ? {
          result: {
            summary: ruleTemplateSummary(rulesLocale, procedureTemplate, docLayer),
            missingItems: [] as string[],
            risks: [] as string[],
            recommendedDocuments: [] as string[],
            regulatoryReferences: [doc.standard],
            complianceStatus: "partial" as const,
            confidence: 0.95,
            disclaimer: "",
            data: {},
          },
          source: "rules" as const,
          meta: { source: "mock" as const, provider: "mock" as const, model: "rule-template", latencyMs: 0 },
        }
      : await runPrompt(
          "qms",
          {
            documentTitle: localizedTitle,
            standard: doc.standard,
            clauseRefs: canonicalQmsClauseRefs(doc.code, doc.clauseRefs),
            documentCode: doc.code ?? undefined,
            documentLayer: doc.layer ?? undefined,
            companyName: doc.company.name,
            context: promptContext || undefined,
            _locale: locale,
          },
          { companyId, feature: "qms-generate" },
        );

  const fromSections = sectionsToMarkdown(result.data);
  let content =
    fromSections.trim() ||
    (useLiveAi && result.summary.trim() ? `## ${localizedTitle}\n\n${result.summary}` : "");

  if (!content.trim() && ruleBasedContent?.trim()) {
    content = ruleBasedContent.trim();
  }

  const liveAiUsed = useLiveAi && source !== "mock";
  let aiFallbackReason: string | undefined;
  if (!liveAiUsed && !ruleBasedContent) {
    const balance = await getAiTokenBalance(companyId);
    if (!balance.allowsLiveAi) {
      aiFallbackReason = "starter_plan";
    } else if (meta.provider === "mock" && process.env.AI_PROVIDER && process.env.AI_PROVIDER !== "mock") {
      aiFallbackReason = "provider_error_or_invalid_json";
    } else {
      aiFallbackReason = "mock_or_no_provider";
    }
  } else if (useLiveAi && source === "mock" && ruleBasedContent) {
    aiFallbackReason = "provider_error_or_invalid_json";
  }

  let updatedStatus = doc.status as DocStatus;
  let updatedVersion = revisionNoToLabel(doc.revisionNo ?? 0);

  if (content.trim()) {
    const now = new Date();
    const plan = planQmsRevisionOnContentChange({
      status: doc.status as DocStatus,
      revisionNo: doc.revisionNo ?? 0,
      issueDate: doc.issueDate,
    });

    const entry = {
      rev: plan.revisionNo,
      date: now.toISOString().slice(0, 10),
      by: generatedBy,
      note: plan.bump
        ? rulesLocale === "tr"
          ? "Onaylı doküman revize edildi (AI taslak)"
          : "Approved document revised (AI draft)"
        : rulesLocale === "tr"
          ? "AI taslak oluşturuldu"
          : "AI draft generated",
    };
    let history = parseRevisionHistory(doc.revisionHistoryJson);
    if (plan.bump) {
      history = appendRevisionHistory(history, entry);
    } else if (history.length === 0) {
      history = [entry];
    }

    const updated = await prisma.qMSDocument.update({
      where: { id: doc.id },
      data: {
        content,
        contentTranslationsJson: Prisma.DbNull,
        status: plan.status,
        revisionNo: plan.revisionNo,
        version: revisionNoToLabel(plan.revisionNo),
        revisionDate: plan.bump ? now : doc.revisionDate ?? now,
        revisionHistoryJson: history as unknown as object,
      },
      select: { status: true, version: true, revisionNo: true },
    });

    updatedStatus = updated.status as DocStatus;
    updatedVersion = revisionNoToLabel(updated.revisionNo ?? 0);
  }

  let sync: QmsGenerateResult["sync"];
  if (content.trim()) {
    const { syncOperationalFormFromQmsDoc } = await import("@/lib/qms/sync-operational-forms");
    sync = await syncOperationalFormFromQmsDoc({
      companyId,
      documentId: doc.id,
      code: doc.code,
      content,
      userContext: extraContext,
      operationalLink,
    });
  }

  return {
    content,
    source: liveAiUsed ? source : ruleBasedContent && !useLiveAi ? "rules" : source,
    model: meta.model,
    summary: result.summary,
    missingItems: result.missingItems,
    liveAiUsed,
    aiFallbackReason,
    status: updatedStatus,
    version: updatedVersion,
    sync,
  };
}
