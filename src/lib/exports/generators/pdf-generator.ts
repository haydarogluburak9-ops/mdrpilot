import "server-only";
import PDFDocument from "pdfkit";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { buildLabelDisplayData, buildLabelDisplayDataForModel, type LabelDisplayData, type LabelSymbolSlot } from "@/lib/domain/label-data";
import { flattenLabelModels } from "@/lib/domain/label-models";
import { computeAuditReadiness } from "@/lib/domain/scoring";
import type { Product, ProductBrandVariant } from "@/lib/domain/types";
import { loadSymbolImage, symbolDisplaySize } from "../iso-symbol-images";
import { DISCLAIMER_TEXT } from "../manifest";
import { tx, generatedLine, type ExportLanguage } from "../i18n";
import { buildUdiPayload } from "@/lib/udi/udi-payload";
import { renderDataMatrixPng } from "@/lib/udi/datamatrix";
import type { ExportContext } from "../types";

function classLabel(code: string): string {
  return (DEVICE_CLASS_LABEL as Record<string, string>)[code] ?? code;
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

function brandHeader(doc: PDFKit.PDFDocument, ctx: ExportContext, title: string) {
  const logo = ctx.company.logo;
  if (logo) {
    const top = doc.y;
    try {
      doc.image(logo.data, 50, top, { height: 36 });
      doc.y = top + 42;
    } catch {
      doc.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(16).text("MDRpilot");
    }
  } else {
    doc.fillColor("#1d4ed8").font("Helvetica-Bold").fontSize(16).text("MDRpilot");
  }
  doc.moveDown(0.2);
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(20).text(title);
  doc.moveDown(0.3);
  doc.fillColor("#6b7280").font("Helvetica").fontSize(9).text(
    `${ctx.company.name}${ctx.product ? ` · ${ctx.product.name} (${classLabel(ctx.product.deviceClass)})` : ""}`,
  );
  doc.text(generatedLine(ctx.language, ctx.generatedAt.toISOString().slice(0, 10), ctx.generatedBy));
  doc.moveTo(50, doc.y + 6).lineTo(545, doc.y + 6).strokeColor("#e5e7eb").stroke();
  doc.moveDown(1);
  doc.fillColor("#111827");
}

function footerDisclaimer(doc: PDFKit.PDFDocument, ctx: ExportContext) {
  doc.moveDown(1.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#f59e0b").stroke();
  doc.moveDown(0.4);
  doc.fillColor("#92400e").font("Helvetica-Oblique").fontSize(8).text(`${tx(ctx.language, "disclaimerPrefix")}: ${DISCLAIMER_TEXT}`);
}

function drawSymbolAt(
  doc: PDFKit.PDFDocument,
  sym: LabelSymbolSlot,
  x: number,
  y: number,
  maxSize = 22,
) {
  const img = loadSymbolImage(sym.clause);
  if (img) {
    const size = symbolDisplaySize(sym.clause, img);
    const scale = Math.min(maxSize / size.width, maxSize / size.height, 1);
    const w = Math.round(size.width * scale);
    const h = Math.round(size.height * scale);
    try {
      doc.image(img.data, x, y, { width: w, height: h });
      return w;
    } catch {
      doc.font("Helvetica-Bold").fontSize(6).fillColor("#111827").text(sym.fallback, x, y + 4, { width: maxSize });
      return maxSize;
    }
  }
  doc.font("Helvetica-Bold").fontSize(6).fillColor("#111827").text(sym.fallback, x, y + 4, { width: maxSize });
  return maxSize;
}

function drawLabelBox(
  doc: PDFKit.PDFDocument,
  label: LabelDisplayData,
  caution: string,
  lang: ExportLanguage,
  dataMatrixPng: Buffer | null,
) {
  const boxX = 50;
  const boxY = doc.y;
  const boxW = 360;
  const boxH = 248;
  doc.roundedRect(boxX, boxY, boxW, boxH, 8).lineWidth(1).strokeColor("#111827").stroke();

  const fs = label.fieldSymbols;

  // Product name
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(13).text(label.productName, boxX + 14, boxY + 12, {
    width: boxW - 90,
  });

  // CE + notified body (top right)
  const ceX = boxX + boxW - 72;
  drawSymbolAt(doc, fs.ce, ceX, boxY + 10, 28);
  if (label.notifiedBodyNumber) {
    doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827").text(label.notifiedBodyNumber, ceX + 32, boxY + 16, {
      width: 36,
    });
  } else {
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827").text("CE", ceX + 32, boxY + 14);
  }

  const fieldRow = (sym: LabelSymbolSlot, rowLabel: string, value: string, x: number, y: number, w: number) => {
    drawSymbolAt(doc, sym, x, y, 18);
    doc.font("Helvetica").fontSize(7).fillColor("#6b7280").text(rowLabel, x + 22, y);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827").text(value, x + 22, y + 10, { width: w - 24 });
  };

  const gy = boxY + 34;
  const rightX = boxX + 188;
  fieldRow(fs.ref, tx(lang, "label.ref"), label.ref, boxX + 14, gy, 150);
  fieldRow(fs.lot, tx(lang, "label.lot"), label.lot, boxX + 14, gy + 28, 150);
  fieldRow(fs.udi, tx(lang, "label.udi"), label.udi, rightX, gy, 158);
  fieldRow(fs.exp, tx(lang, "label.exp"), label.exp, rightX, gy + 28, 158);

  doc.font("Helvetica-Bold").fontSize(7).fillColor("#374151").text(
    `${tx(lang, "label.singleUse")}  ·  ${tx(lang, "label.doNotReuse")}`,
    boxX + 14,
    gy + 54,
    { width: 158 },
  );

  doc.font("Helvetica").fontSize(8).fillColor("#374151").text(
    `${tx(lang, "tf.shelfLife")}: ${label.shelfLifeText}`,
    boxX + 14,
    gy + 68,
    { width: boxW - 28 },
  );

  let sterY = gy + 84;
  if (fs.sterilization && label.sterilizationBadge) {
    drawSymbolAt(doc, fs.sterilization, boxX + 14, sterY, 22);
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827").text(
      `${tx(lang, "label.sterile")} ${label.sterilizationBadge}`,
      boxX + 40,
      sterY + 6,
    );
    sterY += 28;
  }

  let ax = boxX + 14;
  for (const sym of label.auxiliarySymbols) {
    const w = drawSymbolAt(doc, sym, ax, sterY, 18);
    ax += w + 6;
  }

  const footerY = sterY + 30;
  drawSymbolAt(doc, fs.manufacturer, boxX + 14, footerY, 20);
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827").text(label.manufacturer, boxX + 38, footerY, {
    width: boxW - 52,
  });
  if (label.manufacturerAddress) {
    doc.font("Helvetica").fontSize(7).fillColor("#374151").text(label.manufacturerAddress, boxX + 38, doc.y + 1, {
      width: boxW - 52,
    });
  }

  if (dataMatrixPng) {
    try {
      doc.image(dataMatrixPng, boxX + boxW - 78, boxY + boxH - 78, { width: 64, height: 64 });
    } catch {
      /* skip if image fails */
    }
  }

  doc.font("Helvetica").fontSize(8).fillColor("#374151");
  let ty = boxY + boxH + 14;
  doc.text(caution || tx(lang, "label.caution"), 50, ty, { width: 495 });
  doc.y = ty + 36;
}

export async function buildLabelPdf(ctx: ExportContext): Promise<Buffer> {
  const p = ctx.product;
  if (!p) throw new Error("Label export requires a product");

  const lang = ctx.language;
  const variants = Array.isArray(p.variantsJson) ? (p.variantsJson as ProductBrandVariant[]) : undefined;
  const allModels = flattenLabelModels(p.variantsJson, p.brand, p.model);
  const selectedIds = ctx.exportOptions?.modelRefs?.filter(Boolean);
  const models =
    selectedIds?.length
      ? allModels.filter((m) => selectedIds.includes(m.id))
      : allModels;

  const company = {
    name: ctx.company.name,
    legalName: ctx.company.legalName,
    address: ctx.company.address,
    notifiedBodyNumber: ctx.company.notifiedBodyNumber,
  };

  const productBase = {
    name: p.name,
    model: p.model ?? undefined,
    variants,
    basicUdiDi: p.basicUdiDi ?? undefined,
    udiDi: p.udiDi ?? undefined,
    isSterile: p.isSterile,
    isReusable: p.isReusable,
    sterilization: p.sterilization as Product["sterilization"],
    shelfLife: p.shelfLife ?? undefined,
    deviceClass: p.deviceClass as Product["deviceClass"],
  };

  const caution = ctx.exportOptions?.labelCaution?.trim() || "";

  const labelRows = models.map((model) => ({
    model,
    label: buildLabelDisplayDataForModel(productBase, company, lang, model, ctx.generatedAt),
  }));

  const dmByUdi = new Map<string, Buffer | null>();
  await Promise.all(
    labelRows.map(async ({ label }) => {
      const payload = buildUdiPayload({ udiDi: label.udi });
      const key = payload || label.udi;
      if (!key || dmByUdi.has(key)) return;
      dmByUdi.set(key, payload ? await renderDataMatrixPng(payload) : null);
    }),
  );

  return renderPdf((doc) => {
    brandHeader(doc, ctx, tx(lang, "doc.label"));

    labelRows.forEach(({ model, label }, index) => {
      if (index > 0) doc.addPage();
      doc.font("Helvetica-Bold").fontSize(10).fillColor("#374151").text(`${tx(lang, "label.ref")}: ${model.displayRef}`, 50, doc.y);
      doc.moveDown(0.4);
      const payload = buildUdiPayload({ udiDi: label.udi });
      const dm = dmByUdi.get(payload || label.udi) ?? null;
      drawLabelBox(doc, label, caution, lang, dm);
    });

    footerDisclaimer(doc, ctx);
  });
}

export async function buildAuditReadinessPdf(ctx: ExportContext): Promise<Buffer> {
  const p = ctx.product;
  if (!p) throw new Error("Audit Readiness export requires a product");

  const readiness = computeAuditReadiness(p as unknown as Product);
  const bandColor: Record<string, string> = { green: "#16a34a", yellow: "#d97706", red: "#dc2626" };

  const lang = ctx.language;
  const criticalGaps: string[] = [];
  for (const s of p.technicalSections) if (s.status === "MISSING") criticalGaps.push(`${tx(lang, "ar.tfMissing")}: ${s.title} ${tx(lang, "missing")}`);
  for (const g of p.gsprItems) if (g.status === "MISSING") criticalGaps.push(`GSPR ${g.gsprNo} ${tx(lang, "ar.gsprMissing")}`);
  const highRisks = p.riskItems.filter((r) => r.initialRiskLevel === "HIGH" || r.initialRiskLevel === "CRITICAL");
  const openCapas = ctx.capas.filter((c) => c.status !== "CLOSED");

  return renderPdf((doc) => {
    brandHeader(doc, ctx, tx(lang, "doc.auditReadiness"));

    doc.font("Helvetica-Bold").fontSize(40).fillColor(bandColor[readiness.band]).text(`${readiness.score}%`, { continued: false });
    doc.font("Helvetica").fontSize(11).fillColor("#374151").text(`${tx(lang, "ar.overall")} — ${readiness.band.toUpperCase()}`);
    doc.moveDown(0.8);

    doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text(tx(lang, "ar.breakdown"));
    doc.moveDown(0.3);
    readiness.breakdown.forEach((b) => {
      doc.font("Helvetica").fontSize(9).fillColor("#374151").text(`${b.label}: ${b.value}%  (${tx(lang, "ar.weight")} ${Math.round(b.weight * 100)}%)`);
    });

    const section = (title: string, items: string[]) => {
      doc.moveDown(0.7);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#111827").text(title);
      doc.moveDown(0.2);
      doc.font("Helvetica").fontSize(9).fillColor("#374151");
      if (items.length === 0) {
        doc.text(`• ${tx(lang, "none")}`);
      } else {
        items.forEach((it) => doc.text(`• ${it}`));
      }
    };

    section(tx(lang, "ar.criticalGaps"), criticalGaps);
    section(tx(lang, "ar.missingDocs"), p.technicalSections.filter((s) => s.status === "MISSING").map((s) => s.title));
    section(tx(lang, "ar.highRisks"), highRisks.map((r) => `${r.hazard} → ${r.harm ?? ""} (${r.initialRiskLevel})`));
    section(tx(lang, "ar.openCapa"), openCapas.map((c) => `${c.title} (${c.status})`));
    section(tx(lang, "ar.nextActions"), [
      ...(criticalGaps.length ? [tx(lang, "ar.actClose")] : []),
      ...(highRisks.length ? [tx(lang, "ar.actRisk")] : []),
      ...(openCapas.length ? [tx(lang, "ar.actCapa")] : []),
      tx(lang, "ar.actCer"),
    ]);

    footerDisclaimer(doc, ctx);
  });
}
