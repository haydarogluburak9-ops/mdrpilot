import "server-only";
import ExcelJS from "exceljs";
import { tx, generatedLine, formatGsprApplicable } from "../i18n";
import { gsprRequirementText, gsprJustificationText } from "@/lib/domain/gspr-text";
import { formatStandardReference, formatStandardsInText } from "@/lib/domain/standards-catalog";
import type { ExportContext } from "../types";

function styleHeader(row: ExcelJS.Row) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
  });
}

function addTitleBlock(ws: ExcelJS.Worksheet, ctx: ExportContext, title: string, cols: number) {
  ws.mergeCells(1, 1, 1, cols);
  ws.getCell(1, 1).value = `MDRpilot — ${title}`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF1D4ED8" } };
  ws.mergeCells(2, 1, 2, cols);
  ws.getCell(2, 1).value = `${ctx.company.name}${ctx.product ? ` · ${ctx.product.name} (${ctx.product.deviceClass})` : ""} · ${generatedLine(ctx.language, ctx.generatedAt.toISOString().slice(0, 10), ctx.generatedBy)}`;
  ws.getCell(2, 1).font = { italic: true, size: 9, color: { argb: "FF6B7280" } };
}

export async function buildGsprXlsx(ctx: ExportContext): Promise<Buffer> {
  const p = ctx.product;
  if (!p) throw new Error("GSPR export requires a product");

  const lang = ctx.language;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MDRpilot";
  const ws = wb.addWorksheet(tx(lang, "gx.sheet"));

  const headers = [
    tx(lang, "gx.gsprNo"), tx(lang, "gx.requirement"), tx(lang, "gx.applicable"), tx(lang, "gx.justification"), tx(lang, "gx.evidenceDoc"),
    tx(lang, "gx.standardRef"), tx(lang, "gx.complianceStmt"), tx(lang, "gx.status"), tx(lang, "gx.aiGap"),
  ];
  addTitleBlock(ws, ctx, tx(lang, "gx.title"), headers.length);
  ws.addRow([]);
  const headerRow = ws.addRow(headers);
  styleHeader(headerRow);

  for (const g of p.gsprItems) {
    const linkedNames = g.evidenceFiles.map((e) => e.fileName).join(", ");
    const evidenceCell =
      formatStandardsInText(linkedNames || g.evidenceDocument || "") ??
      (linkedNames || g.evidenceDocument || "");
    const reqText = gsprRequirementText(g.gsprNo, g.requirementSummary, lang);
    const justText = gsprJustificationText(g.justification, g.applicable, lang) ?? "";
    const row = ws.addRow([
      g.gsprNo, reqText, formatGsprApplicable(lang, g.applicable), justText,
      evidenceCell, formatStandardReference(g.standardReference) ?? "", g.complianceStatement ?? "",
      g.status, g.aiGapComment ?? "",
    ]);
    if (g.status === "MISSING" || !evidenceCell) {
      row.getCell(5).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
      row.getCell(8).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEE2E2" } };
    }
  }

  ws.columns.forEach((c, i) => {
    c.width = [10, 42, 12, 28, 22, 20, 28, 12, 32][i] ?? 18;
    c.alignment = { wrapText: true, vertical: "top" };
  });

  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function buildRiskXlsx(ctx: ExportContext): Promise<Buffer> {
  const p = ctx.product;
  if (!p) throw new Error("Risk export requires a product");

  const lang = ctx.language;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MDRpilot";
  const ws = wb.addWorksheet(tx(lang, "rx.sheet"));

  const headers = [
    tx(lang, "rx.hazard"), tx(lang, "rx.sequence"), tx(lang, "rx.situation"), tx(lang, "rx.harm"),
    tx(lang, "rx.initSev"), tx(lang, "rx.initProb"), tx(lang, "rx.initRisk"),
    tx(lang, "rx.control"), tx(lang, "rx.resSev"), tx(lang, "rx.resProb"), tx(lang, "rx.resRisk"),
    tx(lang, "rx.benefitRisk"), tx(lang, "rx.verification"),
  ];
  addTitleBlock(ws, ctx, tx(lang, "rx.title"), headers.length);
  ws.addRow([]);
  const headerRow = ws.addRow(headers);
  styleHeader(headerRow);

  const riskColor: Record<string, string> = {
    LOW: "FFDCFCE7",
    MEDIUM: "FFFEF9C3",
    HIGH: "FFFFE4E6",
    CRITICAL: "FFFECACA",
  };

  for (const r of p.riskItems) {
    const evidenceNote = r.evidenceFiles.length ? ` [${tx(lang, "rx.evidence")}: ${r.evidenceFiles.map((e) => e.fileName).join(", ")}]` : "";
    const verification = `${r.verificationOfControl ?? ""}${evidenceNote}`.trim();
    const row = ws.addRow([
      r.hazard, r.sequenceOfEvents ?? "", r.hazardousSituation ?? "", r.harm ?? "",
      r.initialSeverity, r.initialProbability, r.initialRiskLevel,
      r.riskControlMeasure ?? "", r.residualSeverity, r.residualProbability, r.residualRiskLevel,
      r.benefitRiskJustification ?? "", verification,
    ]);
    const ic = riskColor[r.initialRiskLevel];
    const rc = riskColor[r.residualRiskLevel];
    if (ic) row.getCell(7).fill = { type: "pattern", pattern: "solid", fgColor: { argb: ic } };
    if (rc) row.getCell(11).fill = { type: "pattern", pattern: "solid", fgColor: { argb: rc } };
  }

  ws.columns.forEach((c, i) => {
    c.width = [24, 26, 26, 22, 10, 10, 10, 28, 10, 10, 10, 28, 22][i] ?? 16;
    c.alignment = { wrapText: true, vertical: "top" };
  });

  const benefitText = p.fmeaBenefitRiskAnalysis?.trim();
  if (benefitText) {
    ws.addRow([]);
    const titleRow = ws.addRow([tx(lang, "rx.benefitRiskFooter")]);
    ws.mergeCells(titleRow.number, 1, titleRow.number, headers.length);
    const titleCell = titleRow.getCell(1);
    titleCell.font = { bold: true, color: { argb: "FFFFFFFF" } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0891B2" } };
    titleCell.alignment = { vertical: "middle", horizontal: "center" };

    const bodyRow = ws.addRow([benefitText]);
    ws.mergeCells(bodyRow.number, 1, bodyRow.number, headers.length);
    bodyRow.getCell(1).alignment = { wrapText: true, vertical: "top" };
    bodyRow.height = Math.min(200, Math.max(60, benefitText.length / 4));
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
