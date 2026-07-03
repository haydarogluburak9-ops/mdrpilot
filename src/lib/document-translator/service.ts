import "server-only";
import { extractDocumentText } from "./extract";
import { translateDocumentText } from "./translate-text";
import {
  buildTranslatedDocx,
  buildTranslatedPdf,
  buildTranslatedXlsx,
  mimeForKind,
  outputKindForInput,
  translatedFileName,
} from "./output";
import type { TranslateDocumentParams, TranslateDocumentResult } from "./types";

export async function translateUploadedDocument(
  params: TranslateDocumentParams,
): Promise<TranslateDocumentResult> {
  const { buffer, fileName, kind, sourceLang, targetLang } = params;

  if (kind === "xlsx") {
    const outBuffer = await buildTranslatedXlsx(buffer, sourceLang, targetLang, (text, from, to) =>
      translateDocumentText(text, from, to, params.companyId),
    );
    return {
      buffer: outBuffer,
      mimeType: mimeForKind("xlsx"),
      fileName: translatedFileName(fileName, "xlsx", targetLang),
      outputKind: "xlsx",
      charCount: 0,
      truncated: false,
    };
  }

  const extracted = await extractDocumentText(kind, buffer);
  const translated = await translateDocumentText(extracted.text, sourceLang, targetLang, params.companyId);
  const pdfAsDocx = kind === "pdf" && params.pdfOutputFormat === "docx";
  const outputKind = outputKindForInput(kind, pdfAsDocx);
  const title = fileName.replace(/\.[^.]+$/, "");
  const outBuffer =
    outputKind === "pdf"
      ? await buildTranslatedPdf(translated, title)
      : await buildTranslatedDocx(translated);

  return {
    buffer: outBuffer,
    mimeType: mimeForKind(outputKind),
    fileName: translatedFileName(fileName, outputKind, targetLang),
    outputKind,
    charCount: extracted.text.length,
    truncated: extracted.truncated,
  };
}
