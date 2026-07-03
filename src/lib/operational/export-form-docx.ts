import "server-only";
import { prisma } from "@/lib/db";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { buildSectionPdf } from "@/lib/exports/generators/section-pdf";
import type { Lang } from "@/lib/i18n/locales";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

export async function exportOperationalForm(params: {
  companyId: string;
  formContent: string;
  title: string;
  documentCode: string;
  lang: Lang;
  generatedBy: string;
  fileSuffix: string;
  format: "docx" | "pdf";
}): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { name: true },
  });
  const logo = await loadCompanyLogo(params.companyId);
  const now = new Date();
  const ext = params.format === "pdf" ? "pdf" : "docx";
  const displayTitle = qmsDocTitle(params.documentCode, params.title, params.lang);

  const sectionData = {
    titlePrimary: displayTitle,
    titleSecondary: "",
    annexRef: "",
    contentMarkdown: params.formContent,
    companyName: company?.name ?? "Company",
    productName: null,
    documentNo: params.documentCode,
    revisionNo: "00",
    issueDate: fmtDate(now),
    revisionDate: fmtDate(now),
    revisionHistory: [
      {
        rev: 0,
        date: fmtDate(now),
        by: params.generatedBy,
        note: params.lang === "tr" ? "İlk yayın" : "Initial issue",
      },
    ],
    language: params.lang,
    logo,
    generatedBy: params.generatedBy,
    generatedAt: now,
    documentCode: params.documentCode,
    documentLayer: "FORM" as const,
  };

  const buffer =
    params.format === "pdf"
      ? await buildSectionPdf(sectionData)
      : await buildSectionDocx(sectionData);

  return {
    buffer,
    fileName: `${params.documentCode}-${params.fileSuffix}.${ext}`,
    mimeType:
      params.format === "pdf"
        ? "application/pdf"
        : "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  };
}

/** @deprecated use exportOperationalForm */
export async function exportOperationalFormDocx(
  params: Omit<Parameters<typeof exportOperationalForm>[0], "format"> & {
    qmsDocumentId?: string | null;
  },
): Promise<{ buffer: Buffer; fileName: string }> {
  const result = await exportOperationalForm({ ...params, format: "docx" });
  return { buffer: result.buffer, fileName: result.fileName };
}
