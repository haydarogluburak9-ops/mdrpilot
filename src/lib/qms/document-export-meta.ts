import { revisionPadded, revisionNoToLabel } from "@/lib/qms/revision";
import { LANG_SHORT } from "@/lib/i18n/locales";import type { ExportLanguage } from "@/lib/exports/i18n";
import { langFileTag } from "@/lib/exports/i18n";

/** TR is the native document language (no suffix). Other exports append -EN, -FR, -DE, etc. */
export function formatQmsDocumentNo(code: string | null | undefined, lang: ExportLanguage): string {
  const base = (code?.trim() || "QMS-DOC").toUpperCase();
  if (lang === "tr") return base;
  const suffix = `-${LANG_SHORT[lang]}`;
  if (base.endsWith(suffix)) return base;
  return `${base}${suffix}`;
}

export function qmsExportRevisionDisplay(revisionNo: number | null, version: string): string {
  const label = revisionNo != null ? revisionNoToLabel(revisionNo) : version;
  return revisionPadded(label);
}

export function qmsExportFileName(params: {
  code: string | null;
  titleSlug: string;
  revisionLabel: string;
  lang: ExportLanguage;
  format: "docx" | "pdf";
}): string {
  const documentNo = formatQmsDocumentNo(params.code, params.lang);
  const rev = revisionPadded(params.revisionLabel);
  const ext = params.format === "pdf" ? "pdf" : "docx";
  return `${documentNo} ${params.titleSlug} REV${rev}-${langFileTag(params.lang)}.${ext}`;
}
export function qmsExportRevisionLabel(revisionNo: number | null, version: string): string {
  return revisionNo != null ? revisionNoToLabel(revisionNo) : version;
}
