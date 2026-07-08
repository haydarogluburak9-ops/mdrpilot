import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HeadingLevel,
  ImageRun,
  Packer,
  PageNumber,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { DEVICE_CLASS_LABEL } from "@/lib/domain/constants";
import { flattenDeclarationModels } from "../declaration-models";
import { buildIfuContent, type IfuContentOverride } from "../ifu-content";
import { DISCLAIMER_TEXT } from "../manifest";
import { tx, generatedLine, localeUppercase, type ExportLanguage } from "../i18n";
import { logoImageRunOptions } from "../logo";
import type { ExportContext } from "../types";

const INK = "111827";
const BRAND = "1d4ed8";
const SUBTLE = "6b7280";
const SZ = { TITLE: 32, H1: 26, BODY: 22, SMALL: 18 } as const;

function run(text: string, opts?: { bold?: boolean; size?: number; color?: string; italics?: boolean }): TextRun {
  return new TextRun({
    text,
    bold: opts?.bold,
    size: opts?.size ?? SZ.BODY,
    color: opts?.color ?? INK,
    italics: opts?.italics,
    font: "Arial",
  });
}

function para(children: TextRun[], spacing?: { before?: number; after?: number }): Paragraph {
  return new Paragraph({ spacing: spacing ?? { after: 120 }, children });
}

function sectionHeading(num: number, title: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 120 },
    children: [run(`${num}. ${title}`, { bold: true, size: SZ.H1, color: BRAND })],
  });
}

function subHeading(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 80 },
    children: [run(title, { bold: true, size: SZ.BODY, color: BRAND })],
  });
}

function bullet(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    indent: { left: 360, hanging: 360 },
    children: [run(`• ${text}`, { size: SZ.BODY })],
  });
}

function textBlock(text: string): Paragraph[] {
  return text.split(/\n+/).filter(Boolean).map((line) => para([run(line)]));
}

function metaRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 34, type: WidthType.PERCENTAGE },
        children: [para([run(label, { bold: true, size: SZ.SMALL })])],
      }),
      new TableCell({
        width: { size: 66, type: WidthType.PERCENTAGE },
        children: [para([run(value || "—", { size: SZ.SMALL })])],
      }),
    ],
  });
}

function buildDocHeader(ctx: ExportContext, docNo: string, revision: string): Header {
  const logo = ctx.company.logo;
  const logoPara = logo
    ? new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new ImageRun(logoImageRunOptions(logo, 140, 48))],
      })
    : new Paragraph({ children: [run(ctx.company.legalName?.trim() || ctx.company.name, { bold: true, color: BRAND, size: 24 })] });

  const meta = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      metaRow(tx(ctx.language, "sec.docNo"), docNo),
      metaRow(tx(ctx.language, "ch.product"), ctx.product?.name ?? "—"),
      metaRow(tx(ctx.language, "ch.revision"), revision),
      metaRow(
        tx(ctx.language, "generated"),
        generatedLine(ctx.language, ctx.generatedAt.toISOString().slice(0, 10), ctx.generatedBy),
      ),
    ],
  });

  return new Header({
    children: [
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({ width: { size: 45, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: [logoPara] }),
              new TableCell({ width: { size: 55, type: WidthType.PERCENTAGE }, children: [meta] }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 80 } }),
    ],
  });
}

function buildDocFooter(lang: ExportLanguage): Footer {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          run(tx(lang, "sec.pageNo") + " ", { size: SZ.SMALL, color: SUBTLE }),
          new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: SZ.SMALL, color: SUBTLE }),
        ],
      }),
    ],
  });
}

function modelsTable(ctx: ExportContext): Table {
  const p = ctx.product!;
  const models = flattenDeclarationModels(p.name, p.variantsJson, null, p.model, p.brand);
  const header = new TableRow({
    tableHeader: true,
    children: ["#", tx(ctx.language, "label.ref"), "EMDN", tx(ctx.language, "label.sterilization")].map(
      (h) =>
        new TableCell({
          shading: { fill: BRAND },
          children: [para([run(h, { bold: true, color: "FFFFFF", size: SZ.SMALL })])],
        }),
    ),
  });
  const body = models.map((m) =>
    new TableRow({
      children: [String(m.orderNo), m.modelName, m.emdnCode, m.sterilization].map(
        (c) => new TableCell({ children: [para([run(c, { size: SZ.SMALL })])] }),
      ),
    }),
  );
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...body] });
}

function revisionTable(content: string): (Paragraph | Table)[] {
  const lines = content.split("\n").filter(Boolean);
  if (lines.length < 2 || !lines[0].startsWith("|")) {
    return textBlock(content);
  }
  const headerCells = lines[0].split("|").map((c) => c.trim()).filter(Boolean);
  const rows = lines.slice(2).map((line) => line.split("|").map((c) => c.trim()).filter(Boolean));
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          tableHeader: true,
          children: headerCells.map(
            (h) =>
              new TableCell({
                shading: { fill: BRAND },
                children: [para([run(h, { bold: true, color: "FFFFFF", size: SZ.SMALL })])],
              }),
          ),
        }),
        ...rows.map(
          (cells) =>
            new TableRow({
              children: cells.map((c) => new TableCell({ children: [para([run(c, { size: SZ.SMALL })])] })),
            }),
        ),
      ],
    }),
  ];
}

export async function buildIfuDocx(ctx: ExportContext, override?: IfuContentOverride): Promise<Buffer> {
  const p = ctx.product;
  if (!p) throw new Error("IFU export requires a product");
  const lang = ctx.language;
  const content = buildIfuContent(ctx, override ?? ctx.exportOptions?.ifuContent);
  const docNo = `IFU-${p.name.replace(/[^a-zA-Z0-9]/g, "").slice(0, 12).toUpperCase() || "01"}`;
  const revision = "01";
  const mfr = ctx.company.legalName?.trim() || ctx.company.name;
  const mfrAddr = [ctx.company.address, ctx.company.country].filter(Boolean).join(", ");
  const cls = (DEVICE_CLASS_LABEL as Record<string, string>)[p.deviceClass] ?? p.deviceClass;

  const body: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [run(localeUppercase(tx(lang, "doc.ifu"), lang), { bold: true, size: SZ.TITLE, color: BRAND })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 280 },
      children: [run(p.name, { bold: true, size: 28 })],
    }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        metaRow(tx(lang, "sec.docNo"), docNo),
        metaRow(tx(lang, "ch.company"), mfr),
        metaRow(tx(lang, "ifu.manufacturer"), mfrAddr || "—"),
        metaRow(tx(lang, "ch.classification"), cls),
        metaRow(tx(lang, "ch.basicUdi"), p.basicUdiDi ?? "—"),
        metaRow(tx(lang, "ch.udi"), p.udiDi ?? "—"),
        metaRow(tx(lang, "ifu.ceNb"), content.regulatoryInfo.split("\n")[0] ?? "—"),
      ],
    }),
    new Paragraph({ text: "", spacing: { after: 160 } }),

    sectionHeading(1, tx(lang, "ifu.productDescription")),
    ...textBlock(content.productDescription),
    subHeading(tx(lang, "ifu.technicalSpecs")),
    ...textBlock(content.technicalSpecifications),

    sectionHeading(2, tx(lang, "ifu.intended")),
    para([run(content.intendedPurpose)]),
    subHeading(tx(lang, "ifu.intendedUsers")),
    para([run(content.intendedUsers)]),
    subHeading(tx(lang, "ifu.patientPopulation")),
    para([run(content.patientPopulation)]),
    subHeading(tx(lang, "ifu.clinicalBenefits")),
    para([run(content.clinicalBenefits)]),

    sectionHeading(3, tx(lang, "ifu.indications")),
    para([run(content.indications)]),

    sectionHeading(4, tx(lang, "ifu.contraindications")),
    para([run(content.contraindications)]),

    sectionHeading(5, tx(lang, "ifu.warnings")),
    ...content.warnings.map(bullet),

    sectionHeading(6, tx(lang, "ifu.precautions")),
    ...content.precautions.map(bullet),

    sectionHeading(7, tx(lang, "ifu.instructions")),
    ...textBlock(content.instructions),

    sectionHeading(8, tx(lang, "ifu.biocompatibility")),
    ...textBlock(content.biocompatibility),

    sectionHeading(9, tx(lang, "ifu.storage")),
    ...textBlock(content.storage),
    subHeading(tx(lang, "ifu.shelfLife")),
    ...textBlock(content.shelfLifeDetail),

    sectionHeading(10, tx(lang, "ifu.sterility")),
    para([run(content.sterilityInfo)]),

    sectionHeading(11, tx(lang, "ifu.disposal")),
    ...textBlock(content.disposal),
    subHeading(tx(lang, "ifu.wasteSeparation")),
    ...textBlock(content.wasteSeparation),

    sectionHeading(12, tx(lang, "ifu.mdrAnnexI")),
    ...textBlock(content.mdrAnnexIDeclaration),

    sectionHeading(13, tx(lang, "ifu.incidentReporting")),
    ...textBlock(content.incidentReporting),

    sectionHeading(14, tx(lang, "ifu.troubleshooting")),
    ...content.troubleshooting.map(bullet),

    sectionHeading(15, tx(lang, "ifu.symbolsGlossary")),
    ...content.symbolsGlossary.map(bullet),

    sectionHeading(16, tx(lang, "ifu.regulatory")),
    ...textBlock(content.regulatoryInfo),

    sectionHeading(17, tx(lang, "ifu.modelCatalogue")),
    modelsTable(ctx),

    sectionHeading(18, tx(lang, "ifu.manufacturer")),
    para([run(mfr)]),
    ...(mfrAddr ? [para([run(mfrAddr, { size: SZ.SMALL, color: SUBTLE })])] : []),
    para([run(`${tx(lang, "ifu.srn")}: ${ctx.company.srnNumber?.trim() || "—"}`, { size: SZ.SMALL })]),
    para([run(`${tx(lang, "ifu.email")}: ${ctx.company.contactEmail?.trim() || "—"}`, { size: SZ.SMALL })]),
    para([run(`${tx(lang, "ifu.phone")}: ${ctx.company.contactPhone?.trim() || "—"}`, { size: SZ.SMALL })]),
    para([run(`${tx(lang, "ch.udi")}: ${p.udiDi ?? "—"} · ${tx(lang, "ch.basicUdi")}: ${p.basicUdiDi ?? "—"}`, { size: SZ.SMALL })]),

    sectionHeading(19, tx(lang, "ifu.revisionHistory")),
    ...revisionTable(content.revisionHistory),

    new Paragraph({
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: "f59e0b", space: 8 } },
      spacing: { before: 400 },
      children: [run(`${tx(lang, "disclaimerPrefix")}: ${DISCLAIMER_TEXT}`, { italics: true, size: SZ.SMALL, color: "92400e" })],
    }),
  ];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: { margin: { top: 1200, right: 1000, bottom: 1000, left: 1000 } },
        },
        headers: { default: buildDocHeader(ctx, docNo, revision) },
        footers: { default: buildDocFooter(lang) },
        children: body,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
