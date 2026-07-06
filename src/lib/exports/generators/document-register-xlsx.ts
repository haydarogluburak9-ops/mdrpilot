import "server-only";
import ExcelJS from "exceljs";
import type { DocumentRegisterBundle, DocumentRegisterRow } from "@/lib/document-register/load-register";
import type { Lang } from "@/lib/i18n/locales";
import { STATUS_LABEL } from "@/lib/domain/constants";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
}

const STATUS_TR: Record<string, string> = {
  MISSING: "Eksik",
  DRAFT: "Taslak",
  IN_REVIEW: "İncelemede",
  APPROVED: "Onaylandı",
};

function statusLabel(status: string, lang: Lang): string {
  if (lang === "tr") return STATUS_TR[status] ?? status;
  return STATUS_LABEL[status as keyof typeof STATUS_LABEL] ?? status;
}

function addSheet(
  wb: ExcelJS.Workbook,
  sheetName: string,
  title: string,
  subtitle: string,
  rows: DocumentRegisterRow[],
  lang: Lang,
) {
  const ws = wb.addWorksheet(sheetName);
  const headers =
    lang === "tr"
      ? ["Kod", "Doküman", "Referans", "Revizyon", "İlk yayın", "Revizyon tarihi", "Durum", "Sorumlu"]
      : ["Code", "Document", "Reference", "Revision", "First issue", "Revision date", "Status", "Owner"];

  ws.mergeCells(1, 1, 1, headers.length);
  ws.getCell(1, 1).value = title;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF1D4ED8" } };
  ws.mergeCells(2, 1, 2, headers.length);
  ws.getCell(2, 1).value = subtitle;
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
  ws.addRow([]);
  const headerRow = ws.addRow(headers);
  styleHeader(headerRow);

  for (const r of rows) {
    ws.addRow([
      r.code,
      r.title,
      r.reference ?? "",
      r.revision,
      r.issueDate ?? "",
      r.revisionDate ?? "",
      statusLabel(r.status, lang),
      r.owner ?? "",
    ]);
  }

  ws.columns.forEach((c, i) => {
    c.width = [12, 42, 22, 10, 14, 14, 14, 18][i] ?? 16;
    c.alignment = { wrapText: true, vertical: "top" };
  });
}

export async function buildDocumentRegisterXlsx(
  data: DocumentRegisterBundle,
  lang: Lang,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MDRpilot";

  const tfTitle = lang === "tr" ? "Teknik Dosya (MDR)" : "Technical File (MDR)";
  const iso13485Title = lang === "tr" ? "ISO 13485 KYS" : "ISO 13485 QMS";
  const subtitle = [
    data.companyName,
    data.productName ? (lang === "tr" ? `Ürün: ${data.productName}` : `Product: ${data.productName}`) : null,
  ]
    .filter(Boolean)
    .join(" · ");

  addSheet(wb, lang === "tr" ? "Teknik Dosya" : "Technical File", tfTitle, subtitle, data.technicalFile, lang);
  addSheet(wb, lang === "tr" ? "ISO 13485" : "ISO 13485", iso13485Title, subtitle, data.iso13485, lang);

  return Buffer.from(await wb.xlsx.writeBuffer());
}
