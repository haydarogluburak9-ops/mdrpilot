import { NextResponse } from "next/server";
import { contentDispositionAttachment } from "@/lib/exports/download-headers";
import { exportLangToUiLang, type ExportLanguage } from "@/lib/exports/i18n";
import { exportOperationalForm } from "@/lib/operational/export-form-docx";
import { resolveOperationalFormContent } from "@/lib/operational/resolve-form-content";

export async function respondOperationalFormExport(params: {
  companyId: string;
  generatedBy: string;
  formContent?: string | null;
  formCode: string;
  qmsDocumentId?: string | null;
  referenceNo?: string | null;
  title: string;
  fileSuffix: string;
  lang: ExportLanguage;
  format: "docx" | "pdf";
}): Promise<NextResponse> {
  const resolved = await resolveOperationalFormContent({
    companyId: params.companyId,
    formContent: params.formContent,
    formCode: params.formCode,
    qmsDocumentId: params.qmsDocumentId,
    referenceNo: params.referenceNo,
    lang: params.lang,
  });

  if (!resolved.content.trim()) {
    return NextResponse.json({ error: "No form content" }, { status: 400 });
  }

  const { buffer, fileName, mimeType } = await exportOperationalForm({
    companyId: params.companyId,
    formContent: resolved.content,
    title: params.title,
    documentCode: resolved.formCode,
    lang: exportLangToUiLang(params.lang),
    generatedBy: params.generatedBy,
    fileSuffix: params.fileSuffix,
    format: params.format,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": mimeType,
      "Content-Disposition": contentDispositionAttachment(fileName),
    },
  });
}
