import "server-only";
import { prisma } from "@/lib/db";
import {
  DESIGN_CONTROL_PHASES,
  loadDesignControl,
} from "@/lib/products/design-control-service";
import type { DesignControlPhase } from "@prisma/client";
import { buildSectionDocx } from "@/lib/exports/generators/section-docx";
import { buildSectionPdf } from "@/lib/exports/generators/section-pdf";
import { loadCompanyLogo } from "@/lib/exports/logo";
import type { ExportLanguage } from "@/lib/exports/i18n";
import { exportLangToUiLang } from "@/lib/exports/i18n";
import { binaryContentLang } from "@/lib/i18n/locales";
import { resolveLocalizedMarkdown } from "@/lib/exports/localized-markdown";
import { STATUS_LABEL } from "@/lib/domain/constants";
import type { DocStatus } from "@/lib/domain/types";

const PHASE_CLAUSE: Record<DesignControlPhase, string> = {
  DESIGN_INPUT: "ISO 13485:2016 §7.3.2",
  DESIGN_OUTPUT: "ISO 13485:2016 §7.3.3",
  DESIGN_REVIEW: "ISO 13485:2016 §7.3.4",
  DESIGN_VERIFICATION: "ISO 13485:2016 §7.3.5",
  DESIGN_VALIDATION: "ISO 13485:2016 §7.3.6",
  DESIGN_TRANSFER: "ISO 13485:2016 §7.3.7",
};

export type DhfExportRecord = {
  phase: string;
  title: string;
  description: string | null;
  reference: string | null;
  status: DocStatus;
  ownerName: string | null;
  completedAt: string | null;
  evidenceLabels: string[];
};

export function buildDhfMarkdown(
  records: DhfExportRecord[],
  locale: "tr" | "en",
  productName: string,
): string {
  const tr = locale === "tr";
  const lines: string[] = [
    tr
      ? `Bu doküman **${productName}** için tasarım geçmiş dosyası (DHF) özetidir ve ISO 13485:2016 Madde 7.3 tasarım ve geliştirme kontrollerini destekler.`
      : `This document is the design history file (DHF) summary for **${productName}** and supports ISO 13485:2016 Clause 7.3 design and development controls.`,
    "",
    tr ? "## Tasarım kontrol özeti" : "## Design control summary",
    "",
    `| ${tr ? "Aşama" : "Phase"} | ${tr ? "Durum" : "Status"} | ${tr ? "Sorumlu" : "Owner"} | ${tr ? "Referans" : "Reference"} |`,
    "| --- | --- | --- | --- |",
  ];

  const ordered = DESIGN_CONTROL_PHASES.map(
    (phase) => records.find((r) => r.phase === phase),
  ).filter(Boolean) as DhfExportRecord[];

  for (const r of ordered) {
    const status = (STATUS_LABEL as Record<string, string>)[r.status] ?? r.status;
    lines.push(
      `| ${r.title} | ${status} | ${r.ownerName ?? "—"} | ${r.reference ?? "—"} |`,
    );
  }

  for (const r of ordered) {
    lines.push("", `## ${r.title}`, "", `**${tr ? "Madde" : "Clause"}:** ${PHASE_CLAUSE[r.phase as DesignControlPhase] ?? "ISO 13485 §7.3"}`, "");
    if (r.description?.trim()) {
      lines.push(r.description.trim(), "");
    } else {
      lines.push(tr ? "_İçerik henüz girilmedi._" : "_Content not yet entered._", "");
    }
    if (r.completedAt) {
      lines.push(`**${tr ? "Tamamlanma" : "Completed"}:** ${r.completedAt.slice(0, 10)}`, "");
    }
    if (r.evidenceLabels.length > 0) {
      lines.push(`**${tr ? "Bağlı kanıtlar" : "Linked evidence"}:**`, "");
      r.evidenceLabels.forEach((e) => lines.push(`- ${e}`));
      lines.push("");
    }
  }

  lines.push(
    "",
    tr
      ? "_DHF, risk yönetimi dosyası, V&V kayıtları ve teknik dosya ile birlikte değerlendirilmelidir._"
      : "_The DHF should be evaluated together with the risk management file, V&V records and technical documentation._",
  );

  return lines.join("\n").trim();
}

export async function loadDhfExportData(companyId: string, productId: string, locale: "tr" | "en") {
  const product = await prisma.product.findFirst({
    where: { id: productId, companyId, deletedAt: null },
    select: {
      id: true,
      name: true,
      deviceClass: true,
      intendedPurpose: true,
      company: { select: { name: true } },
    },
  });
  if (!product) return null;

  const raw = await loadDesignControl(productId, companyId, locale);
  if (!raw) return null;

  const allFileIds = [...new Set(raw.flatMap((r) => r.evidenceFileIds))];
  const files =
    allFileIds.length > 0
      ? await prisma.uploadedFile.findMany({
          where: { id: { in: allFileIds }, companyId },
          select: { id: true, fileName: true, originalName: true },
        })
      : [];
  const fileMap = new Map(files.map((f) => [f.id, f.originalName ?? f.fileName]));

  const records: DhfExportRecord[] = raw.map((r) => ({
    phase: r.phase,
    title: r.title,
    description: r.description,
    reference: r.reference,
    status: r.status,
    ownerName: r.ownerName,
    completedAt: r.completedAt,
    evidenceLabels: r.evidenceFileIds.map((id) => fileMap.get(id) ?? id),
  }));

  return { product, records };
}

function fmtDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${day}.${month}.${d.getFullYear()}`;
}

export type DhfExportInput = {
  companyId: string;
  productId: string;
  exportLang: ExportLanguage;
  generatedBy: string;
};

async function prepareDhfExportContent(input: DhfExportInput) {
  const locale = binaryContentLang(exportLangToUiLang(input.exportLang));
  const bundle = await loadDhfExportData(input.companyId, input.productId, locale);
  if (!bundle) throw new Error("Not found");

  const { product, records } = bundle;
  const now = new Date();
  let markdown = buildDhfMarkdown(records, locale, product.name);

  const revisionToken = records
    .map((r) => `${r.phase}:${r.title}|${r.description ?? ""}|${r.reference ?? ""}`)
    .join(";");

  markdown = await resolveLocalizedMarkdown({
    markdown,
    targetLocale: locale,
    entityKey: `dhf:${input.productId}`,
    revisionToken,
    context: {
      title: locale === "en" ? "Design History File (DHF)" : "Tasarım Geçmiş Dosyası (DHF)",
      code: "DHF-01",
      companyName: product.company.name,
    },
    companyId: input.companyId,
  });

  const titleTr = "Tasarım Geçmiş Dosyası (DHF)";
  const titleEn = "Design History File (DHF)";
  const logo = await loadCompanyLogo(input.companyId);

  return {
    product,
    locale,
    now,
    section: {
      titlePrimary: locale === "en" ? titleEn : titleTr,
      titleSecondary: locale === "en" ? titleTr : titleEn,
      annexRef: "ISO 13485:2016 §7.3 / MDR Annex II",
      contentMarkdown: markdown,
      companyName: product.company.name,
      documentNo: "DHF-01",
      revisionNo: "01",
      issueDate: fmtDate(now),
      revisionDate: fmtDate(now),
      language: input.exportLang,
      logo,
      generatedBy: input.generatedBy,
      generatedAt: now,
      documentLayer: "DHF" as const,
    },
  };
}

export async function buildDhfDocxBuffer(input: DhfExportInput): Promise<Buffer> {
  const { product, locale, now, section } = await prepareDhfExportContent(input);

  return buildSectionDocx({
    ...section,
    productName: product.name,
    revisionHistory: [
      {
        rev: 1,
        date: now.toISOString().slice(0, 10),
        by: input.generatedBy,
        note: locale === "tr" ? "DHF dışa aktarım" : "DHF export",
      },
    ],
    documentCode: "DHF-01",
  });
}

export async function buildDhfPdfBuffer(input: DhfExportInput): Promise<Buffer> {
  const { section } = await prepareDhfExportContent(input);
  return buildSectionPdf(section);
}
