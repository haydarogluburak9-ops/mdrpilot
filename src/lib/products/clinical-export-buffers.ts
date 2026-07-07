import "server-only";
import { loadCompanyLogo } from "@/lib/exports/logo";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { buildSectionPdf } from "@/lib/exports/generators/section-pdf";
import { CLINICAL_FORM_META } from "@/lib/domain/clinical-cer-meta";
import { CLINICAL_SECTION_KEYS } from "@/lib/domain/clinical-evaluation";
import { enrichCerExportMarkdown } from "@/lib/domain/clinical-cer-premium";
import { parseLiteratureSearchJson } from "@/lib/domain/clinical-literature-model";
import { parseCerRevisionHistory } from "@/lib/products/clinical-evaluation-workflow";
import {
  getClinicalEvaluationForExport,
  resolveCerExportSections,
} from "@/lib/products/clinical-evaluation-service";
import { resolveCepExportMarkdown } from "@/lib/products/clinical-cep-service";
import { resolveLocalizedMarkdown } from "@/lib/exports/localized-markdown";
import type { CompanyContext } from "@/lib/auth/guards";

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
      .slice(0, 40) || "clinical"
  );
}

export type ClinicalExportLang = "tr" | "en";

export async function buildCerExportBuffer(
  product: NonNullable<Awaited<ReturnType<typeof getClinicalEvaluationForExport>>>,
  cer: NonNullable<typeof product.clinicalEvaluation>,
  lang: ClinicalExportLang,
  ctx: CompanyContext,
  format: "docx" | "pdf" = "docx",
): Promise<{ buffer: Buffer; fileName: string }> {
  const sections = await resolveCerExportSections(product.id, cer, lang);
  const literatureData = parseLiteratureSearchJson(cer.literatureDataJson);
  const rawContent = enrichCerExportMarkdown(sections, lang, product.name, {
    preparedAt: literatureData?.preparedAt || literatureData?.searchDate,
    searchDate: literatureData?.searchDate,
    approval: {
      status: cer.status,
      submittedBy: cer.submittedBy?.name ?? cer.submittedBy?.email ?? null,
      approvedBy: cer.approvedBy?.name ?? cer.approvedBy?.email ?? null,
      approvedAt: cer.approvedAt?.toISOString() ?? null,
      revisionNo: cer.revisionNo ?? 0,
      revisionHistory: parseCerRevisionHistory(cer.revisionHistoryJson),
    },
  });

  const content = await resolveLocalizedMarkdown({
    markdown: rawContent,
    targetLocale: lang,
    entityKey: `cer:${product.id}`,
    revisionToken: `${cer.revisionNo ?? 0}:${cer.updatedAt.toISOString()}`,
    context: { title: "CER", companyName: product.company.name },
    companyId: ctx.companyId,
  });

  const meta = CLINICAL_FORM_META.cer;
  const primary = lang === "en" ? meta.titleEn : meta.titleTr;
  const secondary = lang === "en" ? meta.titleTr : meta.titleEn;
  const revPadded = meta.rev.padStart(2, "0");
  const now = new Date();
  const logo = await loadCompanyLogo(ctx.companyId);

  const sectionData = {
    titlePrimary: primary,
    titleSecondary: secondary,
    annexRef: meta.annexRef,
    contentMarkdown: content,
    companyName: product.company.name,
    productName: product.name,
    documentNo: meta.formNo,
    revisionNo: revPadded,
    issueDate: fmtDate(now),
    revisionDate: fmtDate(now),
    revisionHistory: [
      {
        rev: Number(meta.rev) || 1,
        date: now.toISOString().slice(0, 10),
        by: ctx.user.name ?? ctx.user.email,
        note: lang === "tr" ? "CER taslağı" : "CER draft",
      },
    ],
    language: lang,
    logo,
    generatedBy: ctx.user.name ?? ctx.user.email,
    generatedAt: now,
  };

  const buffer =
    format === "pdf"
      ? await buildSectionPdf(sectionData)
      : await buildSectionDocx(sectionData);

  const ext = format === "pdf" ? "pdf" : "docx";
  const langTag = lang === "en" ? "EN" : "TR";
  const fileName = `${meta.formNo} ${slug(primary)} REV${revPadded} ${langTag}.${ext}`;
  return { buffer, fileName };
}

export async function buildCepExportBuffer(
  product: NonNullable<Awaited<ReturnType<typeof getClinicalEvaluationForExport>>>,
  companyId: string,
  lang: ClinicalExportLang,
  ctx: CompanyContext,
  format: "docx" | "pdf" = "docx",
): Promise<{ buffer: Buffer; fileName: string }> {
  const resolved = await resolveCepExportMarkdown(companyId, product.id, lang);
  if (!resolved?.markdown.trim()) {
    throw new Error(lang === "tr" ? "CEP içeriği boş" : "CEP content is empty");
  }

  const meta = CLINICAL_FORM_META.cep;
  const primary = lang === "en" ? meta.titleEn : meta.titleTr;
  const secondary = lang === "en" ? meta.titleTr : meta.titleEn;
  const revPadded = meta.rev.padStart(2, "0");
  const now = new Date();
  const logo = await loadCompanyLogo(ctx.companyId);

  const sectionData = {
    titlePrimary: primary,
    titleSecondary: secondary,
    annexRef: meta.annexRef,
    contentMarkdown: resolved.markdown,
    companyName: product.company.name,
    productName: resolved.productName,
    documentNo: meta.formNo,
    revisionNo: revPadded,
    issueDate: fmtDate(now),
    revisionDate: fmtDate(now),
    revisionHistory: [
      {
        rev: Number(meta.rev) || 1,
        date: now.toISOString().slice(0, 10),
        by: ctx.user.name ?? ctx.user.email,
        note: lang === "tr" ? "CEP taslağı (MDCG 2020-1)" : "CEP draft (MDCG 2020-1)",
      },
    ],
    language: lang,
    logo,
    generatedBy: ctx.user.name ?? ctx.user.email,
    generatedAt: now,
  };

  const buffer =
    format === "pdf"
      ? await buildSectionPdf(sectionData)
      : await buildSectionDocx(sectionData);

  const ext = format === "pdf" ? "pdf" : "docx";
  const langTag = lang === "en" ? "EN" : "TR";
  const fileName = `${meta.formNo} ${slug(primary)} REV${revPadded} ${langTag}.${ext}`;
  return { buffer, fileName };
}

export function cerHasExportContent(
  cer: NonNullable<
    NonNullable<Awaited<ReturnType<typeof getClinicalEvaluationForExport>>>["clinicalEvaluation"]
  >,
  productId: string,
): Promise<boolean> {
  return resolveCerExportSections(productId, cer, "tr").then((sections) =>
    CLINICAL_SECTION_KEYS.some((k) => sections[k]?.trim()),
  );
}
