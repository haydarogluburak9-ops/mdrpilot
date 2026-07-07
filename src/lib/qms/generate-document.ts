import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/auth/errors";
import { runPrompt } from "@/lib/ai/orchestrator";
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
  const { result, source, meta } = ruleBasedContent
    ? {
        result: {
          summary:
            rulesLocale === "tr"
              ? procedureTemplate
                ? "Kontrollü prosedür şablonu"
                : docLayer === "FORM"
                ? "Kontrollü form şablonu"
                : docLayer === "DIAGRAM"
                  ? "Kontrollü şema şablonu"
                  : docLayer === "INSTRUCTION"
                    ? "Kontrollü iş talimatı şablonu"
                    : "Kontrollü alt doküman şablonu"
              : procedureTemplate
                ? "Controlled procedure template"
                : docLayer === "FORM"
                ? "Controlled form template"
                : docLayer === "DIAGRAM"
                  ? "Controlled diagram template"
                  : docLayer === "INSTRUCTION"
                    ? "Controlled work instruction template"
                    : "Controlled child document template",
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
          context: aiContext || undefined,
          _locale: locale,
        },
        { companyId, feature: "qms-generate" },
      );

  const fromSections = sectionsToMarkdown(result.data);
  const content =
    ruleBasedContent?.trim() ||
    fromSections.trim() ||
    (result.summary.trim() ? `## ${localizedTitle}\n\n${result.summary}` : "");

  const liveAiUsed = !ruleBasedContent && source !== "mock";
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
    source: ruleBasedContent ? "rules" : source,
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
