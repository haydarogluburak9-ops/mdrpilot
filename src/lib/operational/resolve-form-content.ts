import "server-only";
import { prisma } from "@/lib/db";
import { initGenericFormContent } from "@/lib/operational/generic-form-model";
import { exportLangToUiLang, type ExportLanguage } from "@/lib/exports/i18n";
import { binaryContentLang } from "@/lib/i18n/locales";
import { resolveQmsExportMarkdown } from "@/lib/qms/resolve-qms-export-content";
import { resolveLocalizedMarkdown } from "@/lib/exports/localized-markdown";
import { getRuleBasedFormContent } from "@/lib/qms/form-templates";

export async function resolveOperationalFormContent(params: {
  companyId: string;
  formContent?: string | null;
  formCode: string;
  qmsDocumentId?: string | null;
  referenceNo?: string | null;
  lang: ExportLanguage;
}): Promise<{ content: string; formCode: string }> {
  const targetLocale = exportLangToUiLang(params.lang);
  const contentLocale = binaryContentLang(targetLocale);
  let content = params.formContent?.trim() ?? "";
  let formCode = params.formCode.trim().toUpperCase();

  if (!content && params.qmsDocumentId) {
    const doc = await prisma.qMSDocument.findFirst({
      where: { id: params.qmsDocumentId, companyId: params.companyId, deletedAt: null },
    });
    if (doc) {
      content = await resolveQmsExportMarkdown(
        {
          id: doc.id,
          companyId: params.companyId,
          code: doc.code,
          title: doc.title,
          layer: doc.layer,
          parentProcedureCode: doc.parentProcedureCode,
          clauseRefs: doc.clauseRefs,
          content: doc.content,
          revisionNo: doc.revisionNo ?? 0,
          updatedAt: doc.updatedAt,
          company: { name: (await prisma.company.findUnique({ where: { id: params.companyId }, select: { name: true } }))?.name ?? "Company" },
        },
        targetLocale,
      );
      if (doc.code) formCode = doc.code.trim().toUpperCase();
    }
  }

  if (!content) {
    const ruleForm = getRuleBasedFormContent(formCode, contentLocale, {
      title: formCode,
      parentProcedureCode: null,
      clauseRefs: null,
    });
    content =
      ruleForm?.trim() ||
      initGenericFormContent(formCode, contentLocale, params.referenceNo ?? undefined).trim();
  } else if (params.formContent?.trim()) {
    content = await resolveLocalizedMarkdown({
      markdown: content,
      targetLocale,
      entityKey: `operational-form:${formCode}:${params.referenceNo ?? "draft"}`,
      revisionToken: hashToken(content),
      context: { code: formCode },
      companyId: params.companyId,
    });
  }

  return { content, formCode };
}

function hashToken(s: string): string {
  return String(s.length) + ":" + s.slice(0, 64);
}
