import "server-only";
import {
  AlignmentType,
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  BorderStyle,
} from "docx";
import { DEVICE_CLASS_LABEL, STATUS_LABEL } from "@/lib/domain/constants";
import { DISCLAIMER_TEXT } from "../manifest";
import { tx, generatedLine, revisionForLang, formatGsprApplicable, type ExportLanguage } from "../i18n";
import { gsprRequirementText, gsprJustificationText } from "@/lib/domain/gspr-text";
import { formatStandardsInText } from "@/lib/domain/standards-catalog";
import { logoImageRunOptions } from "../logo";
import type { ExportContext, ProductExportData } from "../types";

/** Top-left brand block: the company logo if uploaded, else the MDRpilot wordmark. */
function brandParagraph(ctx: ExportContext): Paragraph {
  const logo = ctx.company.logo;
  if (logo) {
    return new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new ImageRun(logoImageRunOptions(logo, 180, 56))],
    });
  }
  return new Paragraph({
    alignment: AlignmentType.LEFT,
    children: [new TextRun({ text: "MDRpilot", bold: true, color: "1d4ed8", size: 22 })],
  });
}

function classLabel(code: string): string {
  return (DEVICE_CLASS_LABEL as Record<string, string>)[code] ?? code;
}
function statusLabel(code: string): string {
  return (STATUS_LABEL as Record<string, string>)[code] ?? code;
}

function kv(label: string, value: string | null | undefined): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 32, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })],
      }),
      new TableCell({
        width: { size: 68, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ children: [new TextRun({ text: value ?? "—", size: 18 })] })],
      }),
    ],
  });
}

function corporateHeader(ctx: ExportContext, docTitle: string, revision = "1.0"): (Paragraph | Table)[] {
  const p = ctx.product;
  const lang = ctx.language;
  const rows: TableRow[] = [
    kv(tx(lang, "ch.company"), ctx.company.name),
    kv(tx(lang, "ch.document"), docTitle),
    kv(tx(lang, "ch.product"), p?.name),
    kv(tx(lang, "ch.classification"), p ? classLabel(p.deviceClass) : undefined),
    kv(tx(lang, "ch.basicUdi"), p?.basicUdiDi),
    kv(tx(lang, "ch.udi"), p?.udiDi),
    kv(tx(lang, "ch.revision"), revisionForLang(`v${revision}`, lang)),
    kv(tx(lang, "generated"), generatedLine(lang, ctx.generatedAt.toISOString().slice(0, 10), ctx.generatedBy)),
  ];

  return [
    brandParagraph(ctx),
    new Paragraph({ text: docTitle, heading: HeadingLevel.TITLE }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows,
    }),
    new Paragraph({ text: "" }),
  ];
}

function disclaimerParagraph(lang: ExportLanguage): Paragraph {
  return new Paragraph({
    border: { top: { style: BorderStyle.SINGLE, size: 6, color: "f59e0b", space: 6 } },
    spacing: { before: 240 },
    children: [new TextRun({ text: `${tx(lang, "disclaimerPrefix")}: ${DISCLAIMER_TEXT}`, italics: true, size: 16, color: "92400e" })],
  });
}

function heading(text: string): Paragraph {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 80 } });
}

function para(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 20 })], spacing: { after: 60 } });
}

function table(headers: string[], rows: string[][]): Table {
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: { fill: "1d4ed8" },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "ffffff", size: 16 })] })],
        }),
    ),
  });
  const bodyRows = rows.map(
    (cells) =>
      new TableRow({
        children: cells.map(
          (c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c || "—", size: 16 })] })] }),
        ),
      }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [headerRow, ...bodyRows] });
}

async function pack(children: (Paragraph | Table)[]): Promise<Buffer> {
  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}

// ---------------- Technical File ----------------

export async function buildTechnicalFileDocx(ctx: ExportContext): Promise<Buffer> {
  const p = ctx.product;
  if (!p) throw new Error("Technical File export requires a product");
  const lang = ctx.language;
  const yn = (v: boolean) => (v ? tx(lang, "yes") : tx(lang, "no"));

  const children: (Paragraph | Table)[] = [
    ...corporateHeader(ctx, tx(lang, "doc.technicalFile")),

    heading(tx(lang, "tf.h1")),
    para(`${p.name}${p.brand ? ` — ${p.brand}` : ""}${p.model ? ` (${p.model})` : ""}`),
    para(`${tx(lang, "tf.materials")}: ${p.materials ?? "—"}`),
    para(`${tx(lang, "tf.packaging")}: ${p.packagingType ?? "—"} · ${tx(lang, "tf.shelfLife")}: ${p.shelfLife ?? "—"}`),
    para(`${tx(lang, "tf.sterile")}: ${p.isSterile ? `${tx(lang, "yes")} (${p.sterilization})` : tx(lang, "no")} · ${tx(lang, "tf.invasive")}: ${yn(p.isInvasive)} · ${tx(lang, "tf.measuring")}: ${yn(p.hasMeasuringFn)} · ${tx(lang, "tf.software")}: ${yn(p.containsSoftware)}`),

    heading(tx(lang, "tf.h2")),
    para(p.intendedPurpose ?? "—"),
    para(`${tx(lang, "tf.indications")}: ${p.indications ?? "—"}`),
    para(`${tx(lang, "tf.contraindications")}: ${p.contraindications ?? "—"}`),

    heading(tx(lang, "tf.h3")),
    para(`${tx(lang, "tf.classLine")}: ${classLabel(p.deviceClass)} (MDR 2017/745, Annex VIII)`),

    heading(tx(lang, "tf.h4")),
    table(
      [tx(lang, "tf.col.section"), tx(lang, "tf.col.annex"), tx(lang, "tf.col.status"), tx(lang, "tf.col.owner"), tx(lang, "tf.col.linkedEvidence")],
      p.technicalSections.map((s) => [
        s.title, formatStandardsInText(s.annexRef ?? "") ?? s.annexRef ?? "", statusLabel(s.status), s.ownerName ?? "",
        s.evidenceFiles.map((e) => e.fileName).join(", "),
      ]),
    ),

    heading(tx(lang, "tf.h5")),
    table(
      [tx(lang, "tf.col.gspr"), tx(lang, "tf.col.requirement"), tx(lang, "tf.col.applicable"), tx(lang, "tf.col.evidence"), tx(lang, "tf.col.status")],
      p.gsprItems.map((g) => [
        g.gsprNo,
        gsprRequirementText(g.gsprNo, g.requirementSummary, lang),
        formatGsprApplicable(lang, g.applicable),
        g.evidenceFiles.map((e) => e.fileName).join(", ") || formatStandardsInText(g.evidenceDocument ?? "") || g.evidenceDocument || tx(lang, "missing"),
        statusLabel(g.status),
      ]),
    ),

    heading(tx(lang, "tf.h6")),
    table(
      [tx(lang, "tf.col.hazard"), tx(lang, "tf.col.harm"), tx(lang, "tf.col.initial"), tx(lang, "tf.col.control"), tx(lang, "tf.col.residual")],
      p.riskItems.map((r) => [r.hazard, r.harm ?? "", r.initialRiskLevel, r.riskControlMeasure ?? "", r.residualRiskLevel]),
    ),

    heading(tx(lang, "tf.h7")),
    para(tx(lang, "tf.clinicalBody")),

    heading(tx(lang, "tf.h8")),
    para(tx(lang, "tf.pmsBody")),

    heading(tx(lang, "tf.h9")),
    para(tx(lang, "tf.ifuBody")),

    heading(tx(lang, "tf.h10")),
    ...missingItems(p, lang).map(para),

    heading(tx(lang, "tf.h11")),
    table(
      [tx(lang, "tf.col.role"), tx(lang, "tf.col.name"), tx(lang, "tf.col.signature"), tx(lang, "tf.col.date")],
      [
        [tx(lang, "tf.preparedBy"), ctx.generatedBy, "", ""],
        [tx(lang, "tf.reviewedBy"), "", "", ""],
        [tx(lang, "tf.approvedBy"), "", "", ""],
      ],
    ),

    disclaimerParagraph(lang),
  ];

  return pack(children);
}

function missingItems(p: ProductExportData, lang: ExportLanguage): string[] {
  const items: string[] = [];
  for (const s of p.technicalSections) if (s.status === "MISSING") items.push(`${tx(lang, "tf.missingSection")}: ${s.title}`);
  for (const g of p.gsprItems) if (g.status === "MISSING") items.push(`GSPR ${g.gsprNo} — ${tx(lang, "tf.missingGspr")}`);
  if (items.length === 0) items.push(tx(lang, "tf.noMissing"));
  return items;
}

// IFU generation moved to generators/ifu-docx.ts

// ---------------- PMS / PMCF ----------------

export async function buildPmsPmcfDocx(ctx: ExportContext): Promise<Buffer> {
  const p = ctx.product;
  if (!p) throw new Error("PMS/PMCF export requires a product");
  const lang = ctx.language;

  const children: (Paragraph | Table)[] = [
    ...corporateHeader(ctx, tx(lang, "doc.pmsPmcf")),
    heading(tx(lang, "pms.h1")),
    para(tx(lang, "pms.body")),
    table(
      [tx(lang, "pms.col.element"), tx(lang, "pms.col.approach")],
      [
        [tx(lang, "pms.r1a"), tx(lang, "pms.r1b")],
        [tx(lang, "pms.r2a"), tx(lang, "pms.r2b")],
        [tx(lang, "pms.r3a"), tx(lang, "pms.r3b")],
        [tx(lang, "pms.r4a"), tx(lang, "pms.r4b")],
        [tx(lang, "pms.r5a"), tx(lang, "pms.r5b")],
        [tx(lang, "pms.r6a"), tx(lang, "pms.r6b")],
      ],
    ),
    heading(tx(lang, "pmcf.h1")),
    para(`${tx(lang, "pmcf.body")} ${classLabel(p.deviceClass)}.`),
    table(
      [tx(lang, "pmcf.col.element"), tx(lang, "pmcf.col.detail")],
      [
        [tx(lang, "pmcf.r1a"), tx(lang, "pmcf.r1b")],
        [tx(lang, "pmcf.r2a"), tx(lang, "pmcf.r2b")],
        [tx(lang, "pmcf.r3a"), tx(lang, "pmcf.r3b")],
        [tx(lang, "pmcf.r4a"), tx(lang, "pmcf.r4b")],
        [tx(lang, "pmcf.r5a"), tx(lang, "pmcf.r5b")],
      ],
    ),
    disclaimerParagraph(lang),
  ];

  return pack(children);
}

// ---------------- QMS document ----------------

export async function buildQmsDocx(
  ctx: ExportContext,
  doc: { title: string; standard: string; clauseRefs: string | null },
): Promise<Buffer> {
  const lang = ctx.language;
  const children: (Paragraph | Table)[] = [
    ...corporateHeader(ctx, doc.title),
    heading(tx(lang, "qms.purpose")),
    para(`${tx(lang, "qms.purposeBody")} ${doc.title.toLowerCase()} ${tx(lang, "qms.inAccordance")} ${doc.standard}${doc.clauseRefs ? ` (${tx(lang, "qms.clauses")} ${doc.clauseRefs})` : ""}.`),
    heading(tx(lang, "qms.scope")),
    para(`${tx(lang, "qms.scopeBody")} ${ctx.company.name} ${tx(lang, "qms.scopeBody2")}`),
    heading(tx(lang, "qms.responsibilities")),
    para(tx(lang, "qms.responsibilitiesBody")),
    heading(tx(lang, "qms.procedure")),
    para(tx(lang, "qms.procedureBody")),
    heading(tx(lang, "qms.records")),
    para(tx(lang, "qms.recordsBody")),
    disclaimerParagraph(lang),
  ];
  return pack(children);
}
