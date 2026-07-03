import "server-only";
import {
  AlignmentType, Document, HeadingLevel, ImageRun, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType, BorderStyle,
} from "docx";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import type { ExportJob } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog } from "@/lib/audit";
import { NotFoundError } from "@/lib/auth/errors";
import { DISCLAIMER } from "@/lib/domain/constants";
import { FORMAT_EXT } from "@/lib/exports/types";
import { tx, generatedLine, coerceLanguage, langFileTag, type ExportLanguage } from "@/lib/exports/i18n";
import { loadCompanyLogo, scaledLogo, type CompanyLogo } from "@/lib/exports/logo";
import type { AuditFindingDto, AuditSummary, CapaSuggestion } from "./types";

export type AuditExportFormat = "pdf" | "docx" | "findings" | "capa";

interface AuditExportData {
  companyName: string;
  productName: string | null;
  standard: string;
  assessmentType: string;
  score: number;
  summary: AuditSummary | null;
  findings: AuditFindingDto[];
  generatedAt: Date;
  generatedBy: string;
  language: ExportLanguage;
  logo: CompanyLogo | null;
}

const EXPORT_TYPE = {
  pdf: "AUDIT_SIM_REPORT_PDF",
  docx: "AUDIT_SIM_REPORT_DOCX",
  findings: "AUDIT_SIM_FINDINGS_XLSX",
  capa: "AUDIT_SIM_CAPA_XLSX",
} as const;

const EXPORT_FORMAT = {
  pdf: "PDF", docx: "WORD", findings: "EXCEL", capa: "EXCEL",
} as const;

function slug(s: string) {
  return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "audit";
}

function sevLabel(lang: ExportLanguage, sev: string): string {
  return tx(lang, `sev.${sev}`) || sev;
}

// ---------- PDF ----------
function buildPdf(d: AuditExportData): Promise<Buffer> {
  const lang = d.language;
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];
    pdf.on("data", (c: Buffer) => chunks.push(c));
    pdf.on("end", () => resolve(Buffer.concat(chunks)));
    pdf.on("error", reject);
    try {
      if (d.logo) {
        const top = pdf.y;
        try { pdf.image(d.logo.data, 50, top, { height: 36 }); pdf.y = top + 42; } catch { /* ignore bad image */ }
      }
      pdf.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(16).text(tx(lang, "aud.title"));
      pdf.fillColor("#111827").fontSize(20).text(`${d.standard} ${tx(lang, "aud.audit")}`);
      pdf.fillColor("#6b7280").font("Helvetica").fontSize(9)
        .text(`${d.companyName}${d.productName ? ` · ${d.productName}` : ""} · ${d.assessmentType} · ${generatedLine(lang, d.generatedAt.toISOString().slice(0, 10), d.generatedBy)}`);
      pdf.moveDown(0.5);
      pdf.fillColor("#111827").font("Helvetica-Bold").fontSize(28).text(`${tx(lang, "aud.score")}: ${d.score}/100`);
      pdf.moveDown(0.4);

      if (d.summary) {
        pdf.font("Helvetica").fontSize(10).fillColor("#374151").text(d.summary.narrative);
        pdf.moveDown(0.5);
        pdf.font("Helvetica-Bold").fontSize(12).fillColor("#1d4ed8").text(tx(lang, "aud.findingSummary")).fillColor("#111827");
        pdf.font("Helvetica").fontSize(10)
          .text(`${tx(lang, "aud.major")}: ${d.summary.major}   ${tx(lang, "aud.minor")}: ${d.summary.minor}   ${tx(lang, "aud.observations")}: ${d.summary.observations}   ${tx(lang, "aud.positive")}: ${d.summary.positive}`);
      }

      pdf.moveDown(0.6).font("Helvetica-Bold").fontSize(12).fillColor("#1d4ed8").text(tx(lang, "aud.detailed")).fillColor("#111827");
      for (const f of d.findings) {
        pdf.moveDown(0.3).font("Helvetica-Bold").fontSize(10).text(`[${sevLabel(lang, f.severity)}] ${f.standardCode} ${f.clauseNo}`);
        pdf.font("Helvetica").fontSize(9).fillColor("#374151").text(f.description);
        if (f.rootCause) pdf.text(`${tx(lang, "aud.rootCause")}: ${f.rootCause}`);
        if (f.correctiveAction) pdf.text(`${tx(lang, "aud.correctiveAction")}: ${f.correctiveAction}`);
        if (f.dueDateSuggestion) pdf.text(`${tx(lang, "aud.suggestedDue")}: ${f.dueDateSuggestion.slice(0, 10)}`);
        pdf.fillColor("#111827");
      }

      pdf.moveDown(1).moveTo(50, pdf.y).lineTo(545, pdf.y).strokeColor("#f59e0b").stroke().moveDown(0.4);
      pdf.fillColor("#92400e").font("Helvetica-Oblique").fontSize(8).text(`${tx(lang, "disclaimerPrefix")}: ${d.summary?.disclaimer ?? DISCLAIMER}`);
      pdf.end();
    } catch (err) { reject(err); }
  });
}

// ---------- DOCX ----------
async function buildDocx(d: AuditExportData): Promise<Buffer> {
  const lang = d.language;
  const brand = d.logo
    ? new Paragraph({ alignment: AlignmentType.LEFT, children: [new ImageRun({ data: d.logo.data, transformation: scaledLogo(d.logo, 180, 56) })] })
    : new Paragraph({ alignment: AlignmentType.LEFT, children: [new TextRun({ text: "MDRpilot", bold: true, color: "1d4ed8", size: 22 })] });
  const children: (Paragraph | Table)[] = [
    brand,
    new Paragraph({ text: `${d.standard} ${tx(lang, "aud.reportTitle")}`, heading: HeadingLevel.TITLE }),
    new Paragraph({ children: [new TextRun({ text: `${d.companyName}${d.productName ? ` · ${d.productName}` : ""} · ${d.assessmentType} · ${generatedLine(lang, d.generatedAt.toISOString().slice(0, 10), d.generatedBy)}`, size: 18, color: "6b7280" })] }),
    new Paragraph({ text: `${tx(lang, "aud.score")}: ${d.score}/100`, heading: HeadingLevel.HEADING_1 }),
  ];
  if (d.summary) {
    children.push(new Paragraph({ children: [new TextRun({ text: d.summary.narrative, size: 20 })] }));
    children.push(new Paragraph({ text: tx(lang, "aud.findingSummary"), heading: HeadingLevel.HEADING_1 }));
    children.push(new Paragraph({ children: [new TextRun({ text: `${tx(lang, "aud.major")}: ${d.summary.major}  ${tx(lang, "aud.minor")}: ${d.summary.minor}  ${tx(lang, "aud.observations")}: ${d.summary.observations}  ${tx(lang, "aud.positive")}: ${d.summary.positive}`, size: 20 })] }));
  }
  children.push(new Paragraph({ text: tx(lang, "aud.detailed"), heading: HeadingLevel.HEADING_1 }));
  const headerCells = [tx(lang, "aud.col.severity"), tx(lang, "aud.col.standardClause"), tx(lang, "aud.col.description"), tx(lang, "aud.col.correctiveAction"), tx(lang, "aud.col.due")].map(
    (h) => new TableCell({ shading: { fill: "1d4ed8" }, children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "ffffff", size: 16 })] })] }),
  );
  const rows = [new TableRow({ children: headerCells })];
  for (const f of d.findings) {
    rows.push(new TableRow({
      children: [
        sevLabel(lang, f.severity),
        `${f.standardCode} ${f.clauseNo}`,
        f.description,
        f.correctiveAction ?? "—",
        f.dueDateSuggestion ? f.dueDateSuggestion.slice(0, 10) : "—",
      ].map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c, size: 16 })] })] })),
    }));
  }
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }));
  children.push(new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: "f59e0b", space: 6 } }, spacing: { before: 240 },
    children: [new TextRun({ text: `${tx(lang, "disclaimerPrefix")}: ${d.summary?.disclaimer ?? DISCLAIMER}`, italics: true, size: 16, color: "92400e" })],
  }));
  return Packer.toBuffer(new Document({ sections: [{ children }] }));
}

// ---------- Findings XLSX ----------
async function buildFindingsXlsx(d: AuditExportData): Promise<Buffer> {
  const lang = d.language;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MDRpilot";
  const ws = wb.addWorksheet(tx(lang, "aud.findingsSheet"));
  ws.mergeCells(1, 1, 1, 8);
  ws.getCell(1, 1).value = `MDRpilot — ${d.standard} ${tx(lang, "aud.findingsSheet")} (${tx(lang, "aud.score")} ${d.score}/100)`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF1D4ED8" } };
  ws.addRow([]);
  const headers = [tx(lang, "aud.col.severity"), tx(lang, "aud.col.standard"), tx(lang, "aud.col.clause"), tx(lang, "aud.col.description"), tx(lang, "aud.col.evidence"), tx(lang, "aud.col.rootCause"), tx(lang, "aud.col.correctiveAction"), tx(lang, "aud.col.dueDate"), tx(lang, "aud.col.priority")];
  const hr = ws.addRow(headers);
  hr.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } }; });
  const sevColor: Record<string, string> = { MAJOR: "FFFECACA", MINOR: "FFFEF9C3", OBSERVATION: "FFE0E7FF", POSITIVE: "FFDCFCE7" };
  for (const f of d.findings) {
    const row = ws.addRow([
      sevLabel(lang, f.severity), f.standardCode, f.clauseNo, f.description,
      f.evidence ?? "", f.rootCause ?? "", f.correctiveAction ?? "",
      f.dueDateSuggestion ? f.dueDateSuggestion.slice(0, 10) : "", f.priority,
    ]);
    const col = sevColor[f.severity];
    if (col) row.getCell(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: col } };
  }
  ws.columns.forEach((c, i) => { c.width = [12, 16, 12, 40, 24, 28, 30, 12, 10][i] ?? 16; c.alignment = { wrapText: true, vertical: "top" }; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

// ---------- CAPA XLSX ----------
async function buildCapaXlsx(d: AuditExportData): Promise<Buffer> {
  const lang = d.language;
  const wb = new ExcelJS.Workbook();
  wb.creator = "MDRpilot";
  const ws = wb.addWorksheet(tx(lang, "aud.capaSheet"));
  const capas: CapaSuggestion[] = d.summary?.capaSuggestions ?? [];
  ws.mergeCells(1, 1, 1, 7);
  ws.getCell(1, 1).value = `MDRpilot — ${tx(lang, "aud.capaTitle")} (${d.standard})`;
  ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: "FF1D4ED8" } };
  ws.addRow([]);
  const headers = [tx(lang, "aud.col.num"), tx(lang, "aud.col.title"), tx(lang, "aud.col.standardClause"), tx(lang, "aud.col.rootCause"), tx(lang, "aud.col.correctiveAction"), tx(lang, "aud.col.dueDate"), tx(lang, "aud.col.priority")];
  const hr = ws.addRow(headers);
  hr.eachCell((c) => { c.font = { bold: true, color: { argb: "FFFFFFFF" } }; c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1D4ED8" } }; });
  capas.forEach((c, i) => {
    ws.addRow([i + 1, c.title, `${c.standardCode} ${c.clauseNo}`, c.rootCause, c.correctiveAction, c.dueDate ? c.dueDate.slice(0, 10) : "", c.priority]);
  });
  ws.columns.forEach((c, i) => { c.width = [6, 40, 18, 30, 34, 12, 10][i] ?? 16; c.alignment = { wrapText: true, vertical: "top" }; });
  return Buffer.from(await wb.xlsx.writeBuffer());
}

export async function createAuditExport(params: { companyId: string; userId: string; sessionId: string; format: AuditExportFormat; ip?: string | null; language?: ExportLanguage }): Promise<ExportJob> {
  const language = coerceLanguage(params.language);
  const session = await prisma.auditSession.findFirst({
    where: { id: params.sessionId },
    include: { product: { select: { name: true } }, findings: { orderBy: { priority: "desc" } } },
  });
  if (!session || session.companyId !== params.companyId) throw new NotFoundError();

  const type = EXPORT_TYPE[params.format];
  const format = EXPORT_FORMAT[params.format];

  const job = await prisma.exportJob.create({
    data: { companyId: params.companyId, productId: session.productId, createdById: params.userId, type, format, status: "PROCESSING" },
  });

  try {
    const company = await prisma.company.findUnique({ where: { id: params.companyId }, select: { name: true } });
    const u = await prisma.user.findUnique({ where: { id: params.userId }, select: { name: true, email: true } });
    const logo = await loadCompanyLogo(params.companyId);

    const data: AuditExportData = {
      companyName: company?.name ?? "—",
      productName: session.product?.name ?? null,
      standard: session.standard,
      assessmentType: session.assessmentType,
      score: session.score ?? 0,
      summary: (session.summaryJson as AuditSummary | null) ?? null,
      findings: session.findings.map((f) => ({
        standardCode: f.standardCode, clauseNo: f.clauseNo, severity: f.severity, description: f.description,
        evidence: f.evidence, rootCause: f.rootCause, correctiveAction: f.correctiveAction,
        dueDateSuggestion: f.dueDateSuggestion?.toISOString() ?? null, priority: f.priority,
      })),
      generatedAt: new Date(),
      generatedBy: u?.name ?? u?.email ?? "—",
      language,
      logo,
    };

    const buffer =
      params.format === "pdf" ? await buildPdf(data)
      : params.format === "docx" ? await buildDocx(data)
      : params.format === "findings" ? await buildFindingsXlsx(data)
      : await buildCapaXlsx(data);

    const ext = FORMAT_EXT[format];
    const displayName = `${slug(`${data.standard}-audit`)}-${params.format}-${langFileTag(language)}-${data.generatedAt.toISOString().slice(0, 10)}.${ext}`;
    const key = `${params.companyId}/${job.id}.${ext}`;
    const saved = await getStorage().save(key, buffer);

    const done = await prisma.exportJob.update({
      where: { id: job.id }, data: { status: "COMPLETED", fileKey: key, fileName: displayName, sizeBytes: saved.size },
    });

    await writeAuditLog({
      action: "export.create", userId: params.userId, companyId: params.companyId,
      entity: "ExportJob", entityId: job.id, metadata: { type, auditSessionId: session.id, size: saved.size, language }, ip: params.ip,
    });
    return done;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Audit export failed";
    const failed = await prisma.exportJob.update({ where: { id: job.id }, data: { status: "FAILED", errorMessage: message.slice(0, 500) } });
    await writeAuditLog({
      action: "export.failed", userId: params.userId, companyId: params.companyId,
      entity: "ExportJob", entityId: job.id, metadata: { type, error: message.slice(0, 200) }, ip: params.ip,
    });
    return failed;
  }
}
