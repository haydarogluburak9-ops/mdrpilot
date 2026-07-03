import "server-only";
import { inferQmsLayerFromCode } from "@/lib/qms/kys-structure";
import { getRuleBasedChildContent } from "@/lib/qms/rule-based-child-content";
import { getRuleBasedProcedureContent } from "@/lib/qms/procedure-templates";
import { resolveLocalizedMarkdown, type UiLocale } from "@/lib/exports/localized-markdown";
import { binaryContentLang } from "@/lib/i18n/locales";

function normalizeWhitespace(s: string): string {
  return s.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
}

function ruleBasedContent(
  doc: {
    code: string | null;
    title: string;
    layer: string;
    parentProcedureCode: string | null;
    clauseRefs: string | null;
  },
  locale: UiLocale,
): string | null {
  const contentLocale = binaryContentLang(locale);
  return (
    getRuleBasedProcedureContent(doc.code, contentLocale) ??
    getRuleBasedChildContent({
      code: doc.code,
      title: doc.title,
      layer: doc.layer,
      locale: contentLocale,
      parentProcedureCode: doc.parentProcedureCode,
      clauseRefs: doc.clauseRefs,
    })
  );
}

export async function resolveQmsExportMarkdown(
  doc: {
    id: string;
    companyId: string;
    code: string | null;
    title: string;
    layer: string;
    parentProcedureCode: string | null;
    clauseRefs: string | null;
    content: string | null;
    revisionNo: number;
    updatedAt: Date;
    company: { name: string };
  },
  lang: UiLocale,
): Promise<string> {
  const stored = doc.content?.trim() ?? "";
  const layer = inferQmsLayerFromCode(doc.code);
  const entityKey = `qms:${doc.id}`;
  const revisionToken = `${doc.revisionNo}:${doc.updatedAt.toISOString()}`;
  const context = {
    code: doc.code ?? undefined,
    title: doc.title,
    companyName: doc.company.name,
  };

  async function localize(markdown: string, target: UiLocale): Promise<string> {
    if (!markdown.trim()) return markdown;
    return resolveLocalizedMarkdown({
      markdown,
      targetLocale: target,
      entityKey,
      revisionToken,
      context,
      companyId: doc.companyId,
    });
  }

  if (lang === "tr") {
    if (stored) return localize(stored, "tr");
    return ruleBasedContent(doc, "tr") || doc.title;
  }

  const ruleEn = ruleBasedContent(doc, "en");
  const ruleTr = ruleBasedContent(doc, "tr");
  const isChild = layer !== "PROCEDURE" && layer !== "MANUAL";
  const matchesTrTemplate =
    ruleTr && stored && normalizeWhitespace(stored) === normalizeWhitespace(ruleTr);

  let enBase: string;
  if (ruleEn && (isChild || matchesTrTemplate || !stored)) {
    enBase = ruleEn;
  } else if (!stored) {
    enBase = ruleEn ?? doc.title;
  } else {
    enBase = await localize(stored, "en");
  }

  if (lang === "en") return enBase;
  return localize(enBase, lang);
}
