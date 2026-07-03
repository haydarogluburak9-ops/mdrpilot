import "server-only";
import { exportLangToUiLang, type ExportLanguage } from "@/lib/exports/i18n";
import { resolveLocalizedMarkdown } from "@/lib/exports/localized-markdown";

export async function resolveTechnicalSectionExportMarkdown(params: {
  sectionId: string;
  sectionKey: string;
  title: string;
  content: string;
  revisionNo: number;
  updatedAt: Date;
  productName: string;
  companyName: string;
  companyId?: string;
  lang: ExportLanguage;
}): Promise<string> {
  const targetLocale = exportLangToUiLang(params.lang);
  return resolveLocalizedMarkdown({
    markdown: params.content,
    targetLocale,
    entityKey: `tf-section:${params.sectionId}`,
    revisionToken: `${params.revisionNo}:${params.updatedAt.toISOString()}`,
    context: {
      code: params.sectionKey,
      title: params.title,
      companyName: params.companyName,
    },
    companyId: params.companyId,
  });
}
