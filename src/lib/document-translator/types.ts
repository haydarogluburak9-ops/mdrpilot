export type { TranslatorLocale } from "./locales";
export { TRANSLATOR_LOCALES, isTranslatorLocale } from "./locales";

export type TranslatorFileKind = "docx" | "pdf" | "xlsx";

export interface TranslateDocumentParams {
  buffer: Buffer;
  fileName: string;
  kind: TranslatorFileKind;
  sourceLang: import("./locales").TranslatorLocale | "auto";
  targetLang: import("./locales").TranslatorLocale;
  /** When input is PDF: `pdf` (default) or `docx`. */
  pdfOutputFormat?: "pdf" | "docx";
  companyId?: string;
}

export interface TranslateDocumentResult {
  buffer: Buffer;
  mimeType: string;
  fileName: string;
  outputKind: TranslatorFileKind;
  charCount: number;
  truncated: boolean;
}
