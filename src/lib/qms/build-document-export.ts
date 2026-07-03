import "server-only";
import { prisma } from "@/lib/db";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { coerceLanguage, exportLangToUiLang, type ExportLanguage } from "@/lib/exports/i18n";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { buildSectionPdf } from "@/lib/exports/generators/section-pdf";
import { buildQmsDocx } from "@/lib/exports/generators/docx-generator";
import type { ExportContext } from "@/lib/exports/types";
import { qmsDocTitle } from "@/lib/i18n/qms-doc-titles";
import { parseRevisionHistory } from "@/lib/qms/revision";
import {
  formatQmsDocumentNo,
  qmsExportFileName,
  qmsExportRevisionDisplay,
  qmsExportRevisionLabel,
} from "@/lib/qms/document-export-meta";
import { resolveQmsExportMarkdown } from "@/lib/qms/resolve-qms-export-content";

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

function slug(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "qms-doc"
  );
}

function resolveQmsDisplayTitle(
  doc: { code: string | null; title: string },
  lang: ExportLanguage,
  bodyMarkdown: string,
): string {
  const uiLang = exportLangToUiLang(lang);
  const base = qmsDocTitle(doc.code, doc.title, uiLang);
  if (lang === "tr") return base;
  const heading = bodyMarkdown.match(/^#\s+(.+)$/m)?.[1]?.trim();
  return heading || base;
}

export async function buildQmsDocumentExport(params: {
  companyId: string;
  documentId: string;
  lang: ExportLanguage;
  format: "docx" | "pdf";
  generatedBy: string;
}): Promise<{ buffer: Buffer; fileName: string; mimeType: string }> {
  const lang = coerceLanguage(params.lang);

  const doc = await prisma.qMSDocument.findFirst({
    where: { id: params.documentId, companyId: params.companyId, deletedAt: null },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          legalName: true,
          address: true,
          country: true,
          contactEmail: true,
          contactPhone: true,
          srnNumber: true,
          notifiedBody: true,
          notifiedBodyNumber: true,
        },
      },
    },
  });
  if (!doc) throw new Error("Not found");

  const logo = await loadCompanyLogo(params.companyId);
  const now = new Date();
  const documentNo = formatQmsDocumentNo(doc.code, lang);
  const revLabel = qmsExportRevisionLabel(doc.revisionNo, doc.version);
  const revNoPadded = qmsExportRevisionDisplay(doc.revisionNo, revLabel);
  const issueStr = fmtDate(doc.issueDate ?? doc.publishedAt ?? doc.createdAt);
  const revStr = fmtDate(doc.revisionDate ?? doc.updatedAt);
  const bodyMarkdown = await resolveQmsExportMarkdown(doc, exportLangToUiLang(lang));
  const displayTitle = resolveQmsDisplayTitle(doc, lang, bodyMarkdown);
  const hasContent = Boolean(bodyMarkdown?.trim());

  const sectionBase = {
    titlePrimary: displayTitle,
    titleSecondary: lang === "tr" ? doc.title : displayTitle,
    annexRef: doc.clauseRefs ? `${doc.standard} — ${doc.clauseRefs}` : doc.standard,
    contentMarkdown: hasContent ? bodyMarkdown : displayTitle,
    companyName: doc.company.name,
    productName: null as string | null,
    documentNo,
    revisionNo: revNoPadded,
    issueDate: issueStr,
    revisionDate: revStr,
    revisionHistory: parseRevisionHistory(doc.revisionHistoryJson).map((h) => ({
      rev: h.rev,
      date: h.date,
      by: h.by,
      note: h.note,
    })),
    language: lang,
    logo,
    generatedBy: params.generatedBy,
    generatedAt: now,
    documentCode: doc.code,
    documentLayer: doc.layer,
  };

  let buffer: Buffer;
  if (params.format === "pdf") {
    buffer = await buildSectionPdf({
      titlePrimary: sectionBase.titlePrimary,
      titleSecondary: sectionBase.titleSecondary,
      annexRef: sectionBase.annexRef,
      contentMarkdown: sectionBase.contentMarkdown,
      companyName: sectionBase.companyName,
      documentNo: sectionBase.documentNo,
      revisionNo: sectionBase.revisionNo,
      issueDate: sectionBase.issueDate,
      revisionDate: sectionBase.revisionDate,
      language: lang,
      generatedBy: params.generatedBy,
      generatedAt: now,
      logo: sectionBase.logo,
      documentLayer: sectionBase.documentLayer,
    });
  } else if (hasContent) {
    buffer = await buildSectionDocx(sectionBase);
  } else {
    buffer = await buildQmsDocx(
      {
        company: { ...doc.company, logo },
        product: null,
        qmsDocs: [],
        capas: [],
        linkedEvidence: [],
        generatedAt: now,
        generatedBy: params.generatedBy,
        language: lang,
      } satisfies ExportContext,
      { title: displayTitle, standard: doc.standard, clauseRefs: doc.clauseRefs },
    );
  }

  const fileName = qmsExportFileName({
    code: doc.code,
    titleSlug: slug(displayTitle),
    revisionLabel: revLabel,
    lang,
    format: params.format,
  });

  const mimeType =
    params.format === "pdf"
      ? "application/pdf"
      : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  return { buffer, fileName, mimeType };
}
