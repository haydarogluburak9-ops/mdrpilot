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
  PageOrientation,
  Table,
  TableCell,
  TableOfContents,
  TableRow,
  TabStopType,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";
import { DISCLAIMER_TEXT } from "../manifest";
import { tx, generatedLine, localeUppercase, type ExportLanguage } from "../i18n";
import { logoImageRunOptions, type CompanyLogo } from "../logo";
import { formatStandardsInText } from "@/lib/domain/standards-catalog";
import { loadSymbolImage, symbolDisplaySize } from "../iso-symbol-images";
import { detectRegistryStatusFromText } from "@/lib/domain/clinical-literature-model";
import { getFlowDiagramDocxBlocks, isLandscapeDiagramExport } from "./flow-diagram-docx";
import { tryConsumeOrgChartBlock } from "./org-chart-docx";
import { tryConsumeEquivalenceTableBlock } from "./equivalence-table-docx";
import { tryConsumeLiteratureEvidenceBlock } from "./literature-evidence-docx";

export interface SectionDocxData {
  titlePrimary: string;
  titleSecondary: string;
  annexRef: string;
  contentMarkdown: string;
  companyName: string;
  productName: string | null;
  documentNo: string;
  revisionNo: string;
  issueDate: string;
  revisionDate: string;
  revisionHistory: { rev: number; date: string; by: string; note: string }[];
  language: ExportLanguage;
  logo: CompanyLogo | null;
  generatedBy: string;
  generatedAt: Date;
  documentCode?: string | null;
  documentLayer?: string | null;
}

const GRID = { style: BorderStyle.SINGLE, size: 4, color: "9ca3af" } as const;
const GRID_BORDERS = { top: GRID, bottom: GRID, left: GRID, right: GRID, insideHorizontal: GRID, insideVertical: GRID } as const;
const NO = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const NO_BORDERS = { top: NO, bottom: NO, left: NO, right: NO, insideHorizontal: NO, insideVertical: NO } as const;
const ROW_ONLY = { top: NO, bottom: NO, left: NO, right: NO, insideHorizontal: GRID, insideVertical: NO } as const;

const BRAND = "1d4ed8";
const INK = "111827";
const SUBTLE = "6b7280";

/** Markdown başlıkları — açık mavi (BRAND); Word varsayılan siyah Heading stiline düşmemek için TextRun ile. */
function mdHeadingParagraph(level: 1 | 2 | 3 | 4, text: string): Paragraph {
  const cfg = {
    1: { heading: HeadingLevel.HEADING_1, size: 26, before: 260, after: 90 },
    2: { heading: HeadingLevel.HEADING_2, size: 22, before: 180, after: 60 },
    3: { heading: HeadingLevel.HEADING_3, size: 20, before: 120, after: 40 },
    4: { heading: HeadingLevel.HEADING_4, size: 18, before: 100, after: 30 },
  }[level];
  return new Paragraph({
    heading: cfg.heading,
    spacing: { before: cfg.before, after: cfg.after },
    children: [new TextRun({ text, bold: true, size: cfg.size, color: BRAND })],
  });
}

function tocHeading(text: string): Paragraph {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 260, after: 90 },
    children: [new TextRun({ text, bold: true, size: 26, color: BRAND })],
  });
}

function metaRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 48, type: WidthType.PERCENTAGE },
        borders: { top: NO, bottom: NO, left: NO, right: NO },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 13, color: INK })] })],
      }),
      new TableCell({
        width: { size: 52, type: WidthType.PERCENTAGE },
        borders: { top: NO, bottom: NO, left: NO, right: NO },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: `: ${value}`, size: 13, color: INK })] })],
      }),
    ],
  });
}

/** Bordered three-column document header that mirrors a classic QMS title block. */
function buildHeader(data: SectionDocxData): Header {
  const lang = data.language;

  const logoPara = data.logo
    ? new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun(logoImageRunOptions(data.logo, 160, 64))],
      })
    : new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: data.companyName, bold: true, color: BRAND, size: 22 })],
      });

  const centerCell = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40 },
      children: [new TextRun({ text: localeUppercase(data.titlePrimary, lang), bold: true, size: 22, color: INK })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: data.titleSecondary, italics: true, size: 18, color: SUBTLE })],
    }),
  ];

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: ROW_ONLY,
    rows: [
      metaRow(tx(lang, "sec.docNo"), data.documentNo),
      metaRow(tx(lang, "sec.issueDate"), data.issueDate),
      metaRow(tx(lang, "sec.revNo"), data.revisionNo),
      metaRow(tx(lang, "sec.revDate"), data.revisionDate),
      pageRow(tx(lang, "sec.pageNo")),
    ],
  });

  const headerTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 60, right: 60 }, children: [logoPara] }),
          new TableCell({ width: { size: 42, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, children: centerCell }),
          new TableCell({ width: { size: 28, type: WidthType.PERCENTAGE }, verticalAlign: VerticalAlign.CENTER, margins: { top: 40, bottom: 40, left: 80, right: 40 }, children: [metaTable] }),
        ],
      }),
    ],
  });

  return new Header({ children: [headerTable, new Paragraph({ spacing: { after: 80 }, children: [] })] });
}

function pageRow(label: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        width: { size: 48, type: WidthType.PERCENTAGE },
        borders: { top: NO, bottom: NO, left: NO, right: NO },
        verticalAlign: VerticalAlign.CENTER,
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 13, color: INK })] })],
      }),
      new TableCell({
        width: { size: 52, type: WidthType.PERCENTAGE },
        borders: { top: NO, bottom: NO, left: NO, right: NO },
        verticalAlign: VerticalAlign.CENTER,
        children: [
          new Paragraph({
            children: [
              new TextRun({ text: ": ", size: 13, color: INK }),
              new TextRun({ children: [PageNumber.CURRENT], size: 13, color: INK }),
              new TextRun({ text: " / ", size: 13, color: INK }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 13, color: INK }),
            ],
          }),
        ],
      }),
    ],
  });
}

/** Footer: company name (left) · document no + revision (right). No confidential label. */
function buildFooter(data: SectionDocxData): Footer {
  const lang = data.language;
  const revisionLine = `${tx(lang, "sec.revNo")} ${data.revisionNo} · ${tx(lang, "sec.revDate")} ${data.revisionDate}`;
  const rightText = `${data.documentNo} · ${revisionLine}`;

  return new Footer({
    children: [
      new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb", space: 2 } },
        tabStops: [{ type: TabStopType.RIGHT, position: 9638 }],
        children: [
          new TextRun({ text: data.companyName, size: 14, color: SUBTLE }),
          new TextRun({ text: "\t", size: 14 }),
          new TextRun({ text: rightText, size: 14, color: SUBTLE }),
        ],
      }),
    ],
  });
}

function isFormDocument(data: SectionDocxData): boolean {
  return data.documentLayer === "FORM";
}

/** Drop embedded form template header (form info table) — corporate header/footer carry metadata. */
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

/** Lightweight Markdown → DOCX with inline bold, headings feeding the TOC. */
function inlineRuns(text: string, baseSize = 20, color = INK): TextRun[] {
  const runs: TextRun[] = [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    const b = /^\*\*([^*]+)\*\*$/.exec(part);
    if (b) runs.push(new TextRun({ text: b[1], bold: true, size: baseSize, color }));
    else runs.push(new TextRun({ text: part, size: baseSize, color }));
  }
  return runs.length ? runs : [new TextRun({ text, size: baseSize, color })];
}

/** "Label: value" → a paragraph with the label in bold (no bullet). Returns null if not key-value. */
function kvParagraph(text: string): Paragraph | null {
  // Defensive: some drafts prefix the literal word "Label:" before the real fact
  // (e.g. "Label: Device name: ..."). Strip it so the real label is bolded.
  const cleaned = text.trim().replace(/^label\s*[:\-]\s*/i, "");
  const m = /^([^:]{1,48}):\s+(.+)$/.exec(cleaned);
  if (!m) return null;
  // The label is already rendered bold; strip any markdown bold markers the model
  // may have added (e.g. "**Device name**:") so the asterisks don't show literally.
  const label = m[1].replace(/\*\*/g, "").replace(/^__|__$/g, "").trim();
  // Avoid matching prose with a mid-sentence colon: the label should be short and contain no period.
  if (/[.!?]/.test(label)) return null;
  return new Paragraph({
    spacing: { after: 80 },
    children: [new TextRun({ text: `${label}: `, bold: true, size: 20, color: BRAND }), ...inlineRuns(m[2])],
  });
}

/**
 * "<name> (ISO 15223-1, <clause>): <note>" — used for the symbols table.
 * Returns null when the line is not an ISO 15223-1 symbol line.
 */
interface ParsedSymbol { name: string; clause: string; note: string }

function parseSymbolLine(text: string): ParsedSymbol | null {
  const m = /^(.*?)\s*\(ISO 15223-1,\s*([^)]+)\)\s*:?\s*(.*)$/.exec(text.trim());
  if (!m) return null;
  const name = m[1].replace(/\*\*/g, "").trim();
  if (!name) return null;
  return { name, clause: m[2].trim(), note: m[3].trim() };
}

function symbolTableRow(s: ParsedSymbol): TableRow {
  const img = loadSymbolImage(s.clause);
  const isCE = /annex\s*v/i.test(s.clause);
  const nb = isCE ? /\b(\d{4})\b/.exec(s.note) : null;

  const imageParas: Paragraph[] = [];
  if (img) {
    const size = symbolDisplaySize(s.clause, img);
    imageParas.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 40, after: nb ? 20 : 40 },
      children: [new ImageRun({ data: img.data, transformation: size })],
    }));
  }
  if (isCE && nb) {
    imageParas.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: nb[1], bold: true, size: 28, color: INK })],
    }));
  }
  if (!imageParas.length) {
    imageParas.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: "—", color: SUBTLE })] }));
  }

  const descChildren: TextRun[] = [
    new TextRun({ text: s.name, bold: true, size: 20, color: INK }),
    new TextRun({ text: ` (ISO 15223-1, ${s.clause})`, size: 18, color: SUBTLE }),
  ];
  if (s.note) descChildren.push(new TextRun({ text: ": ", size: 20, color: INK }), ...inlineRuns(s.note));

  return new TableRow({
    children: [
      new TableCell({
        width: { size: 20, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        children: imageParas,
      }),
      new TableCell({
        width: { size: 80, type: WidthType.PERCENTAGE },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 100, right: 80 },
        children: [new Paragraph({ spacing: { after: 40 }, children: descChildren })],
      }),
    ],
  });
}

function isMarkdownTableRow(line: string): boolean {
  const t = line.trim();
  return t.startsWith("|") && t.endsWith("|") && t.length > 2;
}

function parseTableCells(line: string): string[] {
  const inner = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return inner.split("|").map((c) => c.trim());
}

function isMarkdownTableSeparator(line: string): boolean {
  const cells = parseTableCells(line);
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c.replace(/\s/g, "")));
}

function isSignatureColumnHeader(header: string): boolean {
  return /imza|signature/i.test(header.trim());
}

const RISK_ZONE_FILLS = {
  ACC: "c6efce",
  AFAP: "ffeb9c",
  NACC: "ffc7ce",
} as const;

function normalizeRiskZoneCode(cell: string): keyof typeof RISK_ZONE_FILLS | null {
  const t = cell.replace(/\*\*/g, "").trim().toUpperCase().replace(/\s+/g, "");
  if (t === "ACC") return "ACC";
  if (t === "AFAP") return "AFAP";
  if (t === "NACC" || t === "N/ACC") return "NACC";
  return null;
}

function isRiskMatrixTable(headerCells: string[]): boolean {
  const h0 = headerCells[0]?.toLowerCase() ?? "";
  return /şiddet|severity/.test(h0) && /olasılık|probability/.test(h0);
}

function isRiskZoneDefinitionTable(headerCells: string[]): boolean {
  const h0 = headerCells[0]?.toLowerCase() ?? "";
  const h1 = headerCells[1]?.toLowerCase() ?? "";
  return (h0.includes("bölge") || h0 === "zone") && (h1.includes("tanım") || h1.includes("definition"));
}

function riskZoneRowFill(zoneCell: string): string | undefined {
  const z = zoneCell.toLowerCase();
  if (/kırmızı|kirmizi|red|n\/acc|nacc/.test(z)) return RISK_ZONE_FILLS.NACC;
  if (/sarı|sari|yellow|afap/.test(z)) return RISK_ZONE_FILLS.AFAP;
  if (/yeşil|yesil|green|\bacc\b/.test(z)) return RISK_ZONE_FILLS.ACC;
  return undefined;
}

function buildRiskMatrixTable(headerCells: string[], dataRows: string[][]): Table {
  const colCount = headerCells.length;
  const widthPct = colCount === 6 ? [28, 14, 14, 14, 14, 14] : Array.from({ length: colCount }, () => 100 / colCount);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map((cell, ci) =>
      new TableCell({
        width: { size: widthPct[ci], type: WidthType.PERCENTAGE },
        shading: { fill: "f3f4f6" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 60, right: 60 },
        children: [
          new Paragraph({
            alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
            children: [new TextRun({ text: cell.replace(/\\\|/g, "|"), bold: true, size: 17, color: INK })],
          }),
        ],
      }),
    ),
  });
  const bodyRows = dataRows.map((row) =>
    new TableRow({
      children: Array.from({ length: colCount }, (_, ci) => {
        const cell = (row[ci] ?? "").replace(/\\\|/g, "|").trim();
        const zone = ci > 0 ? normalizeRiskZoneCode(cell) : null;
        const fill = zone ? RISK_ZONE_FILLS[zone] : undefined;
        return new TableCell({
          width: { size: widthPct[ci], type: WidthType.PERCENTAGE },
          shading: fill ? { fill } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 50, bottom: 50, left: 50, right: 50 },
          children: [
            new Paragraph({
              alignment: ci === 0 ? AlignmentType.LEFT : AlignmentType.CENTER,
              children: [
                new TextRun({
                  text: cell,
                  bold: zone !== null,
                  size: zone ? 18 : 17,
                  color: INK,
                }),
              ],
            }),
          ],
        });
      }),
    }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

function buildRiskZoneDefinitionTable(headerCells: string[], dataRows: string[][]): Table {
  const colCount = headerCells.length;
  const widthPct = colCount === 2 ? [32, 68] : Array.from({ length: colCount }, () => 100 / colCount);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map((cell, ci) =>
      new TableCell({
        width: { size: widthPct[ci], type: WidthType.PERCENTAGE },
        shading: { fill: "f3f4f6" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: cell.replace(/\\\|/g, "|"), bold: true, size: 18, color: INK })],
          }),
        ],
      }),
    ),
  });
  const bodyRows = dataRows.map((row) => {
    const zoneCell = (row[0] ?? "").replace(/\\\|/g, "|").trim();
    const zoneFill = riskZoneRowFill(zoneCell);
    return new TableRow({
      children: Array.from({ length: colCount }, (_, ci) => {
        const cell = (row[ci] ?? "").replace(/\\\|/g, "|").trim();
        const fill = ci === 0 && zoneFill ? zoneFill : undefined;
        return new TableCell({
          width: { size: widthPct[ci], type: WidthType.PERCENTAGE },
          shading: fill ? { fill } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 50, bottom: 50, left: 80, right: 80 },
          children: [new Paragraph({ children: inlineRuns(cell, 18) })],
        });
      }),
    });
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

const VIGILANCE_STATUS_STYLE: Record<string, { fill: string; color: string }> = {
  no_signal: { fill: "dcfce7", color: "166534" },
  review_required: { fill: "fef9c3", color: "854d0e" },
  records_found: { fill: "fee2e2", color: "991b1b" },
};

function isVigilanceStatusColumn(header: string): boolean {
  return /^(durum|status)$/i.test(header.trim());
}

function tableCellParagraphs(header: string, cell: string, isBody: boolean): Paragraph[] {
  const text = cell.replace(/\\\|/g, "|").trim();
  if (isBody && isSignatureColumnHeader(header) && !text) {
    return [
      new Paragraph({ spacing: { before: 280, after: 40 }, children: [] }),
      new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: INK, space: 1 } },
        spacing: { after: 80 },
        children: [],
      }),
    ];
  }
  if (isBody && isVigilanceStatusColumn(header)) {
    const statusKey = detectRegistryStatusFromText(text);
    const style = statusKey ? VIGILANCE_STATUS_STYLE[statusKey] : undefined;
    return [
      new Paragraph({
        children: [
          new TextRun({
            text,
            size: 18,
            color: style?.color ?? INK,
          }),
        ],
      }),
    ];
  }
  return [new Paragraph({ children: inlineRuns(text, 18) })];
}

function isRolesResponsibilityTable(headerCells: string[]): boolean {
  const joined = headerCells.join(" ").toLowerCase();
  return /(görev|rol|role)/.test(joined) && /(sorumluluk|responsib)/.test(joined);
}

function splitNumberedResponsibilities(cell: string): string[] {
  const t = cell.replace(/\\\|/g, "|").trim();
  if (!t) return [];
  const bySemi = t.split(/;\s*(?=\d+[\).])/);
  if (bySemi.length > 1) {
    return bySemi.map((p) => p.replace(/^\d+[\).]\s*/, "").trim()).filter(Boolean);
  }
  const byNum = t
    .split(/(?=\d+[\).]\s)/)
    .map((p) => p.replace(/^\d+[\).]\s*/, "").trim())
    .filter(Boolean);
  if (byNum.length > 1) return byNum;
  return [t];
}

function rolesResponsibilityTableToBlocks(headerCells: string[], dataRows: string[][]): DocxBlock[] {
  const headers = headerCells.map((h) => h.toLowerCase());
  const roleIdx = headers.findIndex((h) => /(görev|rol|role)/.test(h) && !/(sorumluluk|responsib)/.test(h));
  const respIdx = headers.findIndex((h) => /(sorumluluk|responsib)/.test(h));
  const rIdx = roleIdx >= 0 ? roleIdx : 0;
  const sIdx = respIdx >= 0 ? respIdx : headerCells.length - 1;

  const blocks: DocxBlock[] = [];
  for (const row of dataRows) {
    const role = (row[rIdx] ?? "").replace(/\\\|/g, "|").trim();
    if (!role) continue;
    blocks.push(mdHeadingParagraph(3, role));
    for (const item of splitNumberedResponsibilities(row[sIdx] ?? "")) {
      const kv = kvParagraph(item);
      blocks.push(
        kv ??
          new Paragraph({
            numbering: { reference: "sec-numbered", level: 0 },
            children: inlineRuns(item),
          }),
      );
    }
    blocks.push(new Paragraph({ spacing: { after: 100 }, children: [] }));
  }
  return blocks;
}

function buildMarkdownDataTable(headerCells: string[], dataRows: string[][]): Table {
  const colCount = Math.max(headerCells.length, 1);
  const hasSignatureCol = headerCells.some(isSignatureColumnHeader);
  const widthPct =
    hasSignatureCol && colCount === 4
      ? [22, 34, 24, 22]
      : Array.from({ length: colCount }, () => 100 / colCount);
  const headerRow = new TableRow({
    tableHeader: true,
    children: headerCells.map((cell, ci) =>
      new TableCell({
        width: { size: widthPct[ci], type: WidthType.PERCENTAGE },
        shading: { fill: "f3f4f6" },
        verticalAlign: VerticalAlign.CENTER,
        margins: { top: 60, bottom: 60, left: 80, right: 80 },
        children: [
          new Paragraph({
            children: [new TextRun({ text: cell.replace(/\\\|/g, "|"), bold: true, size: 18, color: INK })],
          }),
        ],
      }),
    ),
  });
  const bodyRows = dataRows.map((row) =>
    new TableRow({
      children: Array.from({ length: colCount }, (_, ci) => {
        const header = headerCells[ci] ?? "";
        const cell = row[ci] ?? "";
        const text = cell.replace(/\\\|/g, "|").trim();
        const statusKey =
          isVigilanceStatusColumn(header) ? detectRegistryStatusFromText(text) : null;
        const vigStyle = statusKey ? VIGILANCE_STATUS_STYLE[statusKey] : undefined;
        return new TableCell({
          width: { size: widthPct[ci], type: WidthType.PERCENTAGE },
          shading: vigStyle ? { fill: vigStyle.fill } : undefined,
          verticalAlign: VerticalAlign.CENTER,
          margins: { top: 50, bottom: 50, left: 80, right: 80 },
          children: tableCellParagraphs(header, cell, true),
        });
      }),
    }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: [headerRow, ...bodyRows],
  });
}

function buildSymbolsTable(symbols: ParsedSymbol[], lang: ExportLanguage): Table {
  const colSymbol = lang === "tr" ? "Sembol" : "Symbol";
  const colDesc = lang === "tr" ? "Açıklama" : "Description";
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          new TableCell({
            width: { size: 20, type: WidthType.PERCENTAGE },
            shading: { fill: "f3f4f6" },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: colSymbol, bold: true, size: 18 })] })],
          }),
          new TableCell({
            width: { size: 80, type: WidthType.PERCENTAGE },
            shading: { fill: "f3f4f6" },
            verticalAlign: VerticalAlign.CENTER,
            children: [new Paragraph({ children: [new TextRun({ text: colDesc, bold: true, size: 18 })] })],
          }),
        ],
      }),
      ...symbols.map(symbolTableRow),
    ],
  });
}

function stripMarkdownEmphasis(text: string): string {
  const t = text.trim();
  const bold = /^\*\*([^*]+)\*\*$/.exec(t);
  if (bold) return bold[1].trim();
  const underline = /^__([^_]+)__$/.exec(t);
  if (underline) return underline[1].trim();
  return t;
}

function parseMarkdownHeading(line: string): { level: 1 | 2 | 3 | 4; text: string } | null {
  const trimmed = line.trim();
  const m = /^(#{1,6})\s+(.*)$/.exec(trimmed);
  if (!m) return null;
  const hashCount = m[1].length;
  if (hashCount === 1) return null;
  // AI bazen "## ##### 3.1.4.1" üretir — fazla hashtag'leri metinden temizle
  const text = m[2]
    .replace(/^(?:#{1,6}\s+)+/, "")
    .trim();
  if (!text) return null;
  const level = Math.min(hashCount - 1, 4) as 1 | 2 | 3 | 4;
  return { level, text };
}

/** "3.1.4 Endikasyonlar", "4.1. Alt başlık", "ISO 13485 — 4.1 …", "4.1.1 — alt madde" */
function parseSectionNumberHeading(line: string): { level: 1 | 2 | 3 | 4; text: string } | null {
  const trimmed = stripMarkdownEmphasis(line.trim());
  if (trimmed.startsWith("#")) return null;

  const iso = /^ISO\s+13485(?:\s*:?\s*2016)?(?:\+[A\d:]+)?\s*[—\-–]\s*(.+)$/i.exec(trimmed);
  if (iso) {
    const clauseM = /^(\d+(?:\.\d+)*)\s*(.*)$/.exec(iso[1].trim());
    if (clauseM) {
      const depth = clauseM[1].split(".").length;
      const level = Math.min(Math.max(depth, 1), 4) as 1 | 2 | 3 | 4;
      return { level, text: trimmed };
    }
    return { level: 1, text: trimmed };
  }

  const dashM = /^(\d+(?:\.\d+)+)\s*[—\-–:]\s*(.+)$/.exec(trimmed);
  if (dashM) {
    const depth = dashM[1].split(".").length;
    const level = Math.min(Math.max(depth - 1, 1), 4) as 1 | 2 | 3 | 4;
    return { level, text: `${dashM[1]} ${dashM[2].trim()}` };
  }

  const m = /^(\d+(?:\.\d+)*)\.?\s+(.+)$/.exec(trimmed);
  if (!m) return null;
  const depth = m[1].split(".").length;
  const rest = m[2].trim();

  // Single-level numbers under "5. Prosedür" (e.g. "5.1 Title") → heading 3
  if (depth === 1) {
    return { level: 2, text: `${m[1]}. ${rest}` };
  }
  // Two levels (e.g. "5.2.1 Title") → heading 3; three+ → heading 4
  const level = Math.min(Math.max(depth, 2), 4) as 1 | 2 | 3 | 4;
  return { level, text: `${m[1]} ${rest}` };
}

type DocxBlock = Paragraph | Table;

/** Skip in-app flow summary table when Word injects a boxed diagram. */
function markdownWithoutFlowSummary(markdown: string): string {
  const lines = markdown.split("\n");
  const out: string[] = [];
  let skipping = false;
  for (const line of lines) {
    if (/^##\s+(Akış|Flow)/i.test(line.trim())) {
      skipping = true;
      continue;
    }
    if (skipping && /^##\s+/.test(line.trim())) {
      skipping = false;
    }
    if (!skipping) out.push(line);
  }
  return out.join("\n").trim();
}

function markdownToDocx(markdown: string, lang: ExportLanguage): DocxBlock[] {
  const out: DocxBlock[] = [];
  let symbolBuf: ParsedSymbol[] = [];
  const lines = markdown.split("\n");
  let i = 0;

  const flushSymbols = () => {
    if (symbolBuf.length) {
      out.push(buildSymbolsTable(symbolBuf, lang));
      out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      symbolBuf = [];
    }
  };

  const trySymbol = (text: string): boolean => {
    const parsed = parseSymbolLine(text);
    if (!parsed) return false;
    symbolBuf.push(parsed);
    return true;
  };

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.replace(/\r$/, "");
    const trimmed = line.trim();
    if (!trimmed) {
      flushSymbols();
      out.push(new Paragraph({ text: "" }));
      i++;
      continue;
    }

    if (isMarkdownTableRow(trimmed)) {
      flushSymbols();
      const tableRows: string[][] = [];
      while (i < lines.length && isMarkdownTableRow(lines[i].trim())) {
        const rowLine = lines[i].trim();
        if (!isMarkdownTableSeparator(rowLine)) {
          tableRows.push(parseTableCells(rowLine));
        }
        i++;
      }
      if (tableRows.length >= 1) {
        const [header, ...data] = tableRows;
        if (isRiskMatrixTable(header)) {
          out.push(buildRiskMatrixTable(header, data));
        } else if (isRiskZoneDefinitionTable(header)) {
          out.push(buildRiskZoneDefinitionTable(header, data));
        } else if (isRolesResponsibilityTable(header)) {
          out.push(...rolesResponsibilityTableToBlocks(header, data));
        } else {
          out.push(buildMarkdownDataTable(header, data));
        }
        out.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
      }
      continue;
    }

    const mdHead = parseMarkdownHeading(trimmed);
    if (mdHead) {
      flushSymbols();
      out.push(mdHeadingParagraph(mdHead.level, mdHead.text));
      i++;
      continue;
    }

    const secHead = parseSectionNumberHeading(trimmed);
    if (secHead) {
      flushSymbols();
      out.push(mdHeadingParagraph(secHead.level, secHead.text));
      i++;
      continue;
    }

    if (trimmed.startsWith("> ")) {
      flushSymbols();
      out.push(new Paragraph({ shading: { fill: "fef3c7" }, spacing: { after: 60 }, children: [new TextRun({ text: trimmed.slice(2), italics: true, color: "92400e", size: 18 })] }));
      i++;
      continue;
    }
    if (trimmed.startsWith("---")) {
      flushSymbols();
      out.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "e5e7eb", space: 1 } }, children: [] }));
      i++;
      continue;
    }
    const numbered = /^(\d+)\.\s+(.*)$/.exec(trimmed);
    if (numbered) {
      if (trySymbol(numbered[2])) {
        i++;
        continue;
      }
      flushSymbols();
      const kv = kvParagraph(numbered[2]);
      out.push(kv ?? new Paragraph({ numbering: { reference: "sec-numbered", level: 0 }, children: inlineRuns(numbered[2]) }));
      i++;
      continue;
    }
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      const rest = trimmed.slice(2);
      if (trySymbol(rest)) {
        i++;
        continue;
      }
      flushSymbols();
      const kv = kvParagraph(rest);
      out.push(kv ?? new Paragraph({ bullet: { level: 0 }, children: inlineRuns(rest) }));
      i++;
      continue;
    }
    const italic = /^\*(.+)\*$/.exec(trimmed);
    if (italic) {
      flushSymbols();
      out.push(new Paragraph({ children: [new TextRun({ text: italic[1], italics: true, color: SUBTLE, size: 18 })] }));
      i++;
      continue;
    }
    if (trySymbol(trimmed)) {
      i++;
      continue;
    }
    flushSymbols();
    const equivBlock = tryConsumeEquivalenceTableBlock(lines, i);
    if (equivBlock.table) {
      out.push(equivBlock.table);
      if (equivBlock.extraBlocks?.length) {
        for (const block of equivBlock.extraBlocks) out.push(block);
      }
      out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
      i = equivBlock.nextIndex;
      continue;
    }
    const litEvidence = tryConsumeLiteratureEvidenceBlock(lines, i);
    if (litEvidence) {
      for (const block of litEvidence.blocks) out.push(block);
      out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
      i = litEvidence.nextIndex;
      continue;
    }
    const orgBlock = tryConsumeOrgChartBlock(lines, i);
    if (orgBlock.table) {
      out.push(orgBlock.table);
      out.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
      i = orgBlock.nextIndex;
      continue;
    }

    const kv = kvParagraph(trimmed);
    if (kv) {
      out.push(kv);
      i++;
      continue;
    }
    const plain = trimmed.replace(/^(?:#{1,6}\s+)+/, "").trim();
    out.push(new Paragraph({ children: inlineRuns(plain), spacing: { after: 60 } }));
    i++;
  }
  flushSymbols();
  return out;
}

export async function buildSectionDocx(data: SectionDocxData): Promise<Buffer> {
  const lang = data.language;
  const formDoc = isFormDocument(data);
  const rawMarkdown = formDoc ? stripFormExportPreamble(data.contentMarkdown) : data.contentMarkdown;
  const flowBlocks = getFlowDiagramDocxBlocks(data.documentCode, lang);
  const useLandscape = flowBlocks && isLandscapeDiagramExport(data.documentCode, data.documentLayer);
  const bodyMarkdown = flowBlocks ? markdownWithoutFlowSummary(rawMarkdown) : rawMarkdown;
  const contentBlocks = flowBlocks
    ? [...flowBlocks, ...markdownToDocx(bodyMarkdown, lang)]
    : markdownToDocx(rawMarkdown, lang);

  const infoTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: [
      kvRow(tx(lang, "ch.company"), data.companyName),
      kvRow(tx(lang, "ch.product"), data.productName ?? "—"),
      kvRow(tx(lang, "ch.document"), `${data.titlePrimary} — ${data.titleSecondary}`),
      kvRow(tx(lang, "sec.docNo"), data.documentNo),
      kvRow(tx(lang, "ch.revision"), `REV${data.revisionNo} · ${data.revisionDate}`),
      kvRow(tx(lang, "sec.issueDate"), data.issueDate),
      kvRow(tx(lang, "generated"), generatedLine(lang, data.generatedAt.toISOString().slice(0, 10), data.generatedBy)),
    ],
  });

  const portraitIntro: (Paragraph | Table)[] = [
    new Paragraph({ text: data.titlePrimary, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: `${data.titleSecondary}${data.annexRef ? `  ·  ${formatStandardsInText(data.annexRef) ?? data.annexRef}` : ""}`, italics: true, color: SUBTLE, size: 18 })] }),
    infoTable,
    new Paragraph({ text: "" }),
    tocHeading(tx(lang, "sec.toc")),
    new TableOfContents(tx(lang, "sec.toc"), { hyperlink: true, headingStyleRange: "1-4" }),
    new Paragraph({ text: "", pageBreakBefore: true }),
  ];

  const mainBody: (Paragraph | Table)[] = [...contentBlocks, ...revisionHistoryTable(data)];

  const disclaimer = formDoc
    ? null
    : new Paragraph({
        border: { top: { style: BorderStyle.SINGLE, size: 6, color: "f59e0b", space: 6 } },
        spacing: { before: 240 },
        children: [new TextRun({ text: `${tx(lang, "disclaimerPrefix")}: ${DISCLAIMER_TEXT}`, italics: true, size: 16, color: "92400e" })],
      });

  const portraitChildren: (Paragraph | Table)[] = formDoc
    ? mainBody
    : [...portraitIntro, ...mainBody, disclaimer!];

  const landscapeBodyChildren: (Paragraph | Table)[] = disclaimer ? [...mainBody, disclaimer] : mainBody;

  const doc = new Document({
    features: { updateFields: true },
    numbering: {
      config: [
        {
          reference: "sec-numbered",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: AlignmentType.START, style: { paragraph: { indent: { left: 480, hanging: 260 } } } }],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 20, color: INK } },
      },
      paragraphStyles: [
        { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 36, bold: true, color: INK }, paragraph: { spacing: { before: 120, after: 80 } } },
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 26, bold: true, color: BRAND }, paragraph: { spacing: { before: 260, after: 90 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 22, bold: true, color: BRAND }, paragraph: { spacing: { before: 180, after: 60 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 20, bold: true, color: BRAND }, paragraph: { spacing: { before: 120, after: 40 }, outlineLevel: 2 } },
        { id: "Heading4", name: "Heading 4", basedOn: "Normal", next: "Normal", quickFormat: true, run: { size: 18, bold: true, color: BRAND }, paragraph: { spacing: { before: 100, after: 30 }, outlineLevel: 3 } },
      ],
    },
    sections: useLandscape
      ? [
          {
            properties: {},
            headers: { default: buildHeader(data) },
            footers: { default: buildFooter(data) },
            children: formDoc ? [new Paragraph({ text: "" })] : portraitIntro,
          },
          {
            properties: {
              page: {
                size: {
                  orientation: PageOrientation.LANDSCAPE,
                },
              },
            },
            headers: { default: buildHeader(data) },
            footers: { default: buildFooter(data) },
            children: landscapeBodyChildren,
          },
        ]
      : [
          {
            properties: {},
            headers: { default: buildHeader(data) },
            footers: { default: buildFooter(data) },
            children: portraitChildren,
          },
        ],
  });

  return Packer.toBuffer(doc);
}

function revisionHistoryTable(data: SectionDocxData): (Paragraph | Table)[] {
  const lang = data.language;
  if (!data.revisionHistory.length) return [];
  const headers = [tx(lang, "sec.col.rev"), tx(lang, "sec.col.date"), tx(lang, "sec.col.by"), tx(lang, "sec.col.note")];
  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map(
      (h) =>
        new TableCell({
          shading: { fill: BRAND },
          children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: "ffffff", size: 16 })] })],
        }),
    ),
  });
  const rows = data.revisionHistory.map(
    (e) =>
      new TableRow({
        children: [
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(e.rev).padStart(2, "0"), size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: e.date, size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: e.by || "—", size: 16 })] })] }),
          new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: e.note || "—", size: 16 })] })] }),
        ],
      }),
  );
  return [
    tocHeading(tx(lang, "sec.revHistory")),
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: GRID_BORDERS, rows: [headerRow, ...rows] }),
  ];
}

function kvRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({ width: { size: 30, type: WidthType.PERCENTAGE }, shading: { fill: "f3f4f6" }, children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18 })] })] }),
      new TableCell({ width: { size: 70, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: value || "—", size: 18 })] })] }),
    ],
  });
}

/** Shared markdown → DOCX blocks (blue headings, tables, numbered subheadings). */
export function markdownContentToDocxBlocks(markdown: string, lang: ExportLanguage): DocxBlock[] {
  return markdownToDocx(markdown, lang);
}

export function docxBrandHeading(level: 1 | 2 | 3 | 4, text: string): Paragraph {
  return mdHeadingParagraph(level, text);
}
