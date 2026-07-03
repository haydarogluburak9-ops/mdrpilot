import "server-only";
import PDFDocument from "pdfkit";
import { tx, generatedLine, localeUppercase, type ExportLanguage } from "../i18n";
import type { CompanyLogo } from "../logo";

export interface SectionPdfData {
  titlePrimary: string;
  titleSecondary: string;
  annexRef: string;
  contentMarkdown: string;
  companyName: string;
  documentNo: string;
  revisionNo: string;
  issueDate: string;
  revisionDate: string;
  language: ExportLanguage;
  generatedBy: string;
  generatedAt: Date;
  logo?: CompanyLogo | null;
  documentLayer?: string | null;
}

function stripFormExportPreamble(markdown: string): string {
  const lines = markdown.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (/^##\s+/i.test(trimmed) && !/^##\s+Form (bilgileri|information)/i.test(trimmed)) {
      return lines.slice(i).join("\n");
    }
  }
  return markdown;
}

function markdownToPlain(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\|/g, " ")
    .replace(/^[-*]\s+/gm, "• ")
    .replace(/\r\n/g, "\n")
    .trim();
}

function footerRightText(data: SectionPdfData): string {
  const lang = data.language;
  const revisionLine = `${tx(lang, "sec.revNo")} ${data.revisionNo} · ${tx(lang, "sec.revDate")} ${data.revisionDate}`;
  return `${data.documentNo} · ${revisionLine}`;
}

function renderPdf(draw: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    try {
      draw(doc);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function buildSectionPdf(data: SectionPdfData): Promise<Buffer> {
  const isForm = data.documentLayer === "FORM";
  const rawMarkdown = isForm ? stripFormExportPreamble(data.contentMarkdown) : data.contentMarkdown;
  const margin = 50;
  const headerHeight = 95;
  const footerHeight = 28;

  return renderPdf((doc) => {
    const pageW = doc.page.width;
    const contentW = pageW - margin * 2;

    function drawFooter() {
      const footerY = doc.page.height - margin + 8;
      doc
        .moveTo(margin, footerY)
        .lineTo(pageW - margin, footerY)
        .strokeColor("#e5e7eb")
        .stroke();
      doc.fontSize(8).fillColor("#6b7280").font("Helvetica");
      doc.text(data.companyName, margin, footerY + 6, {
        width: contentW / 2,
        align: "left",
        lineBreak: false,
      });
      doc.text(footerRightText(data), margin + contentW / 2, footerY + 6, {
        width: contentW / 2,
        align: "right",
        lineBreak: false,
      });
    }

    function drawHeader() {
      const top = margin - 10;
      const colW = contentW / 3;
      doc.rect(margin, top, contentW, headerHeight).strokeColor("#9ca3af").stroke();

      if (data.logo) {
        try {
          doc.image(data.logo.data, margin + 12, top + 10, { fit: [colW - 24, headerHeight - 20], align: "center" });
        } catch {
          doc.fontSize(10).fillColor("#1d4ed8").font("Helvetica-Bold").text(data.companyName, margin + 8, top + 28, {
            width: colW - 16,
            align: "center",
          });
        }
      } else {
        doc.fontSize(10).fillColor("#1d4ed8").font("Helvetica-Bold").text(data.companyName, margin + 8, top + 28, {
          width: colW - 16,
          align: "center",
        });
      }

      doc
        .fontSize(13)
        .fillColor("#111827")
        .font("Helvetica-Bold")
        .text(localeUppercase(data.titlePrimary, data.language), margin + colW, top + 28, {
          width: colW,
          align: "center",
        });

      const metaX = margin + colW * 2 + 8;
      let metaY = top + 10;
      doc.fontSize(8).fillColor("#111827").font("Helvetica-Bold");
      const metaRows: [string, string][] = [
        [tx(data.language, "sec.docNo"), data.documentNo],
        [tx(data.language, "sec.issueDate"), data.issueDate],
        [tx(data.language, "sec.revNo"), data.revisionNo],
        [tx(data.language, "sec.revDate"), data.revisionDate],
      ];
      for (const [label, value] of metaRows) {
        doc.text(`${label}: ${value}`, metaX, metaY, { width: colW - 16, lineBreak: false });
        metaY += 14;
      }

      doc.y = top + headerHeight + 14;
    }

    drawHeader();
    drawFooter();

    doc.on("pageAdded", () => {
      drawFooter();
      doc.y = margin + headerHeight + 14;
    });

    if (!isForm) {
      doc.moveDown(0.3);
      if (data.titleSecondary && data.titleSecondary !== data.titlePrimary) {
        doc.fontSize(11).fillColor("#6b7280").font("Helvetica").text(data.titleSecondary);
      }
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor("#374151").font("Helvetica");
      doc.text(
        generatedLine(data.language, data.generatedAt.toISOString().slice(0, 10), data.generatedBy),
      );
      doc.moveDown(0.5);
      doc.moveTo(margin, doc.y).lineTo(pageW - margin, doc.y).strokeColor("#e5e7eb").stroke();
      doc.moveDown(0.8);
    }

    doc.fillColor("#111827").font("Helvetica").fontSize(10);
    const body = markdownToPlain(rawMarkdown);
    const bottomLimit = doc.page.height - margin - footerHeight;
    doc.text(body, margin, doc.y, {
      width: contentW,
      align: "left",
      lineGap: 3,
      continued: false,
    });

    if (doc.y > bottomLimit) {
      // pdfkit auto-adds pages; footer hook handles new pages
    }
  });
}
