import "server-only";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";
import type { TranslatorFileKind } from "./types";
import type { TranslatorLocale } from "./locales";

function paragraphsFromText(text: string): Paragraph[] {
  return text.split(/\n/).map((line) =>
    new Paragraph({
      children: [new TextRun({ text: line || " ", size: 22 })],
      spacing: { after: line.trim() ? 80 : 40 },
    }),
  );
}

export async function buildTranslatedDocx(text: string): Promise<Buffer> {
  return Packer.toBuffer(
    new Document({
      sections: [{ children: paragraphsFromText(text) }],
    }),
  );
}

export async function buildTranslatedPdf(text: string, title: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);

    try {
      const contentWidth = pdf.page.width - pdf.page.margins.left - pdf.page.margins.right;
      pdf.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(11).text("MDRpilot");
      pdf.moveDown(0.3);
      pdf.fillColor("#111827").fontSize(14).text(title);
      pdf.moveDown(0.5);
      pdf.font("Helvetica").fontSize(10);

      for (const rawLine of text.split("\n")) {
        const line = rawLine.replace(/\r$/, "");
        if (!line.trim()) {
          pdf.moveDown(0.25);
          continue;
        }
        if (line.startsWith("## ")) {
          pdf.moveDown(0.2).font("Helvetica-Bold").fontSize(11).text(line.slice(3), { width: contentWidth });
          pdf.font("Helvetica").fontSize(10);
          continue;
        }
        if (line.startsWith("# ")) {
          pdf.moveDown(0.2).font("Helvetica-Bold").fontSize(12).text(line.slice(2), { width: contentWidth });
          pdf.font("Helvetica").fontSize(10);
          continue;
        }
        if (line.startsWith("- ")) {
          pdf.text(`•  ${line.slice(2)}`, { width: contentWidth, indent: 12 });
          continue;
        }
        pdf.text(line, { width: contentWidth, lineGap: 2 });
      }

      pdf.end();
    } catch (err) {
      reject(err);
    }
  });
}

export async function buildTranslatedXlsx(
  sourceBuffer: Buffer,
  sourceLang: TranslatorLocale | "auto",
  targetLang: TranslatorLocale,
  translateFn: (text: string, from: TranslatorLocale | "auto", to: TranslatorLocale) => Promise<string>,
): Promise<Buffer> {
  const mod = (await import("exceljs")) as unknown as { default?: typeof import("exceljs") } & typeof import("exceljs");
  const ExcelJS = mod.default ?? mod;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(sourceBuffer as unknown as ArrayBuffer);

  const cells: { cell: import("exceljs").Cell; value: string }[] = [];
  wb.eachSheet((ws) => {
    ws.eachRow((row) => {
      row.eachCell((cell) => {
        const v = cell.value;
        if (typeof v === "string" && v.trim()) {
          cells.push({ cell, value: v });
        } else if (v && typeof v === "object" && "richText" in v && Array.isArray((v as { richText: { text: string }[] }).richText)) {
          const plain = (v as { richText: { text: string }[] }).richText.map((r) => r.text).join("");
          if (plain.trim()) cells.push({ cell, value: plain });
        }
      });
    });
  });

  const unique = [...new Map(cells.map((c) => [c.value, c.value])).keys()].slice(0, 400);
  const translationMap = new Map<string, string>();
  for (const value of unique) {
    translationMap.set(value, await translateFn(value, sourceLang, targetLang));
  }

  for (const { cell, value } of cells) {
    cell.value = translationMap.get(value) ?? value;
  }

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

export function outputKindForInput(kind: TranslatorFileKind, pdfAsDocx = false): TranslatorFileKind {
  if (kind === "pdf" && pdfAsDocx) return "docx";
  return kind;
}

export function mimeForKind(kind: TranslatorFileKind): string {
  switch (kind) {
    case "pdf":
      return "application/pdf";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    default:
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
}

export function translatedFileName(original: string, outputKind: TranslatorFileKind, targetLang: string): string {
  const base = original.replace(/\.[^.]+$/, "");
  const ext = outputKind === "pdf" ? "pdf" : outputKind === "xlsx" ? "xlsx" : "docx";
  return `${base}_${targetLang.toUpperCase()}.${ext}`;
}
