import "server-only";
import {
  AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle,
} from "docx";
import PDFDocument from "pdfkit";
import { DISCLAIMER } from "@/lib/domain/constants";
import { tx, generatedLine, revisionForLang, type ExportLanguage } from "@/lib/exports/i18n";
import { scaledLogo, type CompanyLogo } from "@/lib/exports/logo";
import { docxBrandHeading, markdownContentToDocxBlocks } from "@/lib/exports/generators/section-docx";
import { COMPOSER_TYPE_LABEL, COMPOSER_TYPE_STANDARD } from "./types";
import type { ComposerDocument } from "@prisma/client";

export interface ComposerExportData {
  doc: ComposerDocument;
  companyName: string;
  productName: string | null;
  createdByName: string | null;
  approvedByName: string | null;
  language: ExportLanguage;
  logo: CompanyLogo | null;
}

function meta(doc: ComposerDocument) {
  const label = COMPOSER_TYPE_LABEL[doc.type] ?? doc.type;
  const standard = COMPOSER_TYPE_STANDARD[doc.type] ?? "";
  const missing = (doc.missingInformationJson as string[] | null) ?? [];
  const gaps = (doc.complianceGapsJson as string[] | null) ?? [];
  const evidence = (doc.evidenceUsedJson as string[] | null) ?? [];
  return { label, standard, missing, gaps, evidence };
}

// ---------------- DOCX ----------------

function kvRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({ width: { size: 32, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })] }),
      new TableCell({ width: { size: 68, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value || "—", size: 18 })] })] }),
    ],
  });
}

export async function buildComposerDocx(data: ComposerExportData): Promise<Buffer> {
  const { doc } = data;
  const lang = data.language;
  const { label, standard, missing, gaps, evidence } = meta(doc);

  const brand = data.logo
    ? new Paragraph({ alignment: AlignmentType.LEFT, children: [new ImageRun({ data: data.logo.data, transformation: scaledLogo(data.logo, 180, 56) })] })
    : new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "MDRpilot", bold: true, color: "1d4ed8", size: 22 })] });

  const children: (Paragraph | Table)[] = [
    brand,
    new Paragraph({ text: doc.title, heading: HeadingLevel.TITLE }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        kvRow(tx(lang, "ch.company"), data.companyName),
        kvRow(tx(lang, "cmp.docType"), label),
        kvRow(tx(lang, "cmp.standard"), standard),
        kvRow(tx(lang, "ch.product"), data.productName ?? "—"),
        kvRow(tx(lang, "cmp.version"), revisionForLang(`v${doc.version}`, lang)),
        kvRow(tx(lang, "cmp.status"), doc.status),
        kvRow(tx(lang, "cmp.aiConfidence"), `${Math.round(doc.aiConfidence * 100)}%`),
        kvRow(tx(lang, "generated"), generatedLine(lang, doc.createdAt.toISOString().slice(0, 10), data.createdByName ?? "—")),
      ],
    }),
    new Paragraph({ text: "" }),
    ...markdownContentToDocxBlocks(doc.contentMarkdown, lang),
  ];

  if (missing.length) {
    children.push(docxBrandHeading(1, tx(lang, "cmp.missing")));
    for (const m of missing) children.push(new Paragraph({ text: m, bullet: { level: 0 } }));
  }
  if (gaps.length) {
    children.push(docxBrandHeading(1, tx(lang, "cmp.gaps")));
    for (const g of gaps) children.push(new Paragraph({ text: g, bullet: { level: 0 } }));
  }
  if (evidence.length) {
    children.push(docxBrandHeading(1, tx(lang, "cmp.evidence")));
    for (const e of evidence) children.push(new Paragraph({ text: e, bullet: { level: 0 } }));
  }

  children.push(docxBrandHeading(1, tx(lang, "cmp.approval")));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: [tx(lang, "tf.col.role"), tx(lang, "tf.col.name"), tx(lang, "tf.col.date")].map((h) => new TableCell({ shading: { fill: "1d4ed8" }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "ffffff", size: 16 })] })] })) }),
      new TableRow({ children: [tx(lang, "tf.preparedBy"), data.createdByName ?? "—", doc.createdAt.toISOString().slice(0, 10)].map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, size: 16 })] })] })) }),
      new TableRow({ children: [tx(lang, "tf.approvedBy"), data.approvedByName ?? "—", doc.approvedAt ? doc.approvedAt.toISOString().slice(0, 10) : "—"].map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, size: 16 })] })] })) }),
    ],
  }));

  children.push(new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: "f59e0b", space: 6 } },
    spacing: { before: 240 },
    children: [new TextRun({ text: `${tx(lang, "disclaimerPrefix")}: ${doc.disclaimer ?? DISCLAIMER}`, italics: true, size: 16, color: "92400e" })],
  }));

  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

// ---------------- PDF ----------------

function pdfSubheading(pdf: InstanceType<typeof PDFDocument>, text: string, size = 11) {
  pdf.moveDown(0.25).font("Helvetica-Bold").fontSize(size).fillColor("#1d4ed8").text(text).fillColor("#111827");
}

export async function buildComposerPdf(data: ComposerExportData): Promise<Buffer> {
  const { doc } = data;
  const lang = data.language;
  const { label, standard, missing, gaps, evidence } = meta(doc);

  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    try {
      if (data.logo) {
        const top = pdf.y;
        try { pdf.image(data.logo.data, 50, top, { height: 36 }); pdf.y = top + 42; } catch { /* ignore bad image */ }
      } else {
        pdf.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(16).text("MDRpilot");
      }
      pdf.moveDown(0.2);
      pdf.fillColor("#111827").fontSize(20).text(doc.title);
      pdf.fillColor("#6b7280").font("Helvetica").fontSize(9)
        .text(`${label} · ${standard} · ${data.companyName}${data.productName ? ` · ${data.productName}` : ""}`);
      pdf.text(`${revisionForLang(`v${doc.version}`, lang)} · ${doc.status} · ${tx(lang, "cmp.aiConfidence")} ${Math.round(doc.aiConfidence * 100)}% · ${doc.createdAt.toISOString().slice(0, 10)}`);
      pdf.moveTo(50, pdf.y + 6).lineTo(545, pdf.y + 6).strokeColor("#e5e7eb").stroke();
      pdf.moveDown(1).fillColor("#111827");

      for (const rawLine of doc.contentMarkdown.split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.trim()) { pdf.moveDown(0.3); continue; }
        if (line.startsWith("# ")) continue;
        if (line.startsWith("## ")) { pdfSubheading(pdf, line.slice(3), 13); continue; }
        if (line.startsWith("### ")) { pdfSubheading(pdf, line.slice(4), 11); continue; }
        if (line.startsWith("#### ")) { pdfSubheading(pdf, line.slice(5), 10); continue; }
        const isoHead = /^ISO\s+13485/i.test(line.trim());
        if (isoHead) { pdfSubheading(pdf, line.trim(), 11); continue; }
        const clauseHead = /^\d+(?:\.\d+)+(?:\s*[—\-–:]\s*|\s+)/.test(line.trim()) && line.trim().length < 120;
        if (clauseHead) { pdfSubheading(pdf, line.trim(), 10); continue; }
        if (line.startsWith("> ")) { pdf.font("Helvetica-Oblique").fontSize(9).fillColor("#92400e").text(line.slice(2)).fillColor("#111827"); continue; }
        if (line.startsWith("- ")) { pdf.font("Helvetica").fontSize(10).text(`•  ${line.slice(2)}`, { indent: 10 }); continue; }
        if (line.startsWith("---")) { pdf.moveDown(0.2).moveTo(50, pdf.y).lineTo(545, pdf.y).strokeColor("#e5e7eb").stroke().moveDown(0.2); continue; }
        const italic = /^\*(.+)\*$/.exec(line.trim());
        if (italic) { pdf.font("Helvetica-Oblique").fontSize(9).fillColor("#6b7280").text(italic[1]).fillColor("#111827"); continue; }
        const kv = /^([^:]{1,48}):\s+(.+)$/.exec(line.trim());
        if (kv && !/[.!?]/.test(kv[1])) {
          pdf.font("Helvetica-Bold").fontSize(10).fillColor("#1d4ed8").text(`${kv[1]}: `, { continued: true });
          pdf.fillColor("#111827").font("Helvetica").text(kv[2]);
          continue;
        }
        pdf.font("Helvetica").fontSize(10).text(line);
      }

      const list = (heading: string, items: string[]) => {
        if (!items.length) return;
        pdfSubheading(pdf, heading, 12);
        pdf.font("Helvetica").fontSize(10);
        for (const it of items) pdf.text(`•  ${it}`, { indent: 10 });
      };
      list(tx(lang, "cmp.missing"), missing);
      list(tx(lang, "cmp.gaps"), gaps);
      list(tx(lang, "cmp.evidence"), evidence);

      pdfSubheading(pdf, tx(lang, "cmp.approval"), 12);
      pdf.font("Helvetica").fontSize(10)
        .text(`${tx(lang, "tf.preparedBy")}: ${data.createdByName ?? "—"} (${doc.createdAt.toISOString().slice(0, 10)})`)
        .text(`${tx(lang, "tf.approvedBy")}: ${data.approvedByName ?? "—"} (${doc.approvedAt ? doc.approvedAt.toISOString().slice(0, 10) : "—"})`);

      pdf.moveDown(1.2).moveTo(50, pdf.y).lineTo(545, pdf.y).strokeColor("#f59e0b").stroke().moveDown(0.4);
      pdf.fillColor("#92400e").font("Helvetica-Oblique").fontSize(8).text(`${tx(lang, "disclaimerPrefix")}: ${doc.disclaimer ?? DISCLAIMER}`);

      pdf.end();
    } catch (err) {
      reject(err);
    }
  });
}
