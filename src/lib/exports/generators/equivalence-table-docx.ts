import {
  AlignmentType,
  BorderStyle,
  ImageRun,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextDirection,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from "docx";
import {
  parseEquivalenceTableMarker,
  sectionLabel,
  type EquivalenceTableDocxSpec,
  type EquivalenceTableRowSpec,
  type EquivalenceTableSection,
} from "@/lib/domain/clinical-equivalence-table";
import { scalePhoto } from "../product-photos";
import { readImageSize } from "../logo";

const GRID = { style: BorderStyle.SINGLE, size: 4, color: "9ca3af" } as const;
const GRID_BORDERS = {
  top: GRID,
  bottom: GRID,
  left: GRID,
  right: GRID,
  insideHorizontal: GRID,
  insideVertical: GRID,
} as const;

const INK = "111827";
const HEADER_FILL = "D9D9D9";
const SIDEBAR_FILL = "E8E8E8";

function cellText(text: string, opts?: { bold?: boolean; size?: number; color?: string }): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new TextRun({
        text: text || "—",
        bold: opts?.bold,
        size: opts?.size ?? 16,
        color: opts?.color ?? INK,
      }),
    ],
  });
}

function bodyCellParagraphs(text: string): Paragraph[] {
  const parts = text.split(/\n+/).map((p) => p.trim()).filter(Boolean);
  if (!parts.length) return [cellText("—")];
  return parts.map((p) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: p, size: 16, color: INK })],
    }),
  );
}

function mergedCell(
  children: Paragraph[],
  opts: {
    widthPct: number;
    fill?: string;
    verticalMerge?: (typeof VerticalMergeType)[keyof typeof VerticalMergeType];
    textDirection?: (typeof TextDirection)[keyof typeof TextDirection];
  },
): TableCell {
  return new TableCell({
    width: { size: opts.widthPct, type: WidthType.PERCENTAGE },
    shading: opts.fill ? { fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    verticalMerge: opts.verticalMerge,
    textDirection: opts.textDirection,
    margins: { top: 80, bottom: 80, left: 100, right: 100 },
    children,
  });
}

function imageCell(base64: string | undefined, locale: "tr" | "en", widthPct: number): TableCell {
  if (!base64) {
    return mergedCell(
      [cellText(locale === "tr" ? "Ürün fotoğrafı yok" : "No product photo", { size: 14, color: "6b7280" })],
      { widthPct },
    );
  }
  try {
    const data = Buffer.from(base64, "base64");
    const dims = readImageSize(data);
    const size = scalePhoto(dims ?? { width: 120, height: 120 }, 90, 70);
    return mergedCell(
      [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data,
              transformation: { width: size.width, height: size.height },
            }),
          ],
        }),
      ],
      { widthPct },
    );
  } catch {
    return mergedCell([cellText("—")], { widthPct });
  }
}

function sectionCounts(rows: EquivalenceTableRowSpec[]): Record<EquivalenceTableSection, number> {
  const counts: Record<EquivalenceTableSection, number> = {
    technical: 0,
    biological: 0,
    clinical: 0,
  };
  for (const row of rows) counts[row.section]++;
  return counts;
}

export function buildEquivalenceTable(spec: EquivalenceTableDocxSpec): Table {
  const locale = spec.locale;
  const counts = sectionCounts(spec.rows);
  const widthPct = [10, 12, 22, 28, 28];

  const tableRows: TableRow[] = [];

  tableRows.push(
    new TableRow({
      tableHeader: true,
      children: [
        mergedCell([cellText("", { bold: true })], { widthPct: widthPct[0], fill: HEADER_FILL }),
        mergedCell([cellText("", { bold: true })], { widthPct: widthPct[1], fill: HEADER_FILL }),
        mergedCell(
          [cellText(locale === "tr" ? "ÖZELLİKLER" : "FEATURES", { bold: true })],
          { widthPct: widthPct[2], fill: HEADER_FILL },
        ),
        mergedCell([cellText(spec.subjectName, { bold: true })], { widthPct: widthPct[3], fill: HEADER_FILL }),
        mergedCell([cellText(spec.equivalentName, { bold: true })], { widthPct: widthPct[4], fill: HEADER_FILL }),
      ],
    }),
  );

  let sectionEmitted: EquivalenceTableSection | null = null;
  let sectionRemaining = 0;

  spec.rows.forEach((row, rowIndex) => {
    const isFirstBodyRow = rowIndex === 0;
    const sidebarMerge = isFirstBodyRow ? VerticalMergeType.RESTART : VerticalMergeType.CONTINUE;

    let sectionCell: TableCell;
    if (sectionEmitted !== row.section) {
      sectionEmitted = row.section;
      sectionRemaining = counts[row.section];
      sectionCell = mergedCell(
        [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: sectionLabel(row.section, locale),
                bold: true,
                size: 16,
                color: INK,
              }),
            ],
          }),
        ],
        {
          widthPct: widthPct[1],
          fill: SIDEBAR_FILL,
          verticalMerge: VerticalMergeType.RESTART,
          textDirection: TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT,
        },
      );
      sectionRemaining--;
    } else {
      sectionCell = mergedCell([cellText("")], {
        widthPct: widthPct[1],
        fill: SIDEBAR_FILL,
        verticalMerge: VerticalMergeType.CONTINUE,
      });
      sectionRemaining--;
    }

    const sidebarCell = mergedCell(
      [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: isFirstBodyRow ? spec.sidebarLabel : "",
              bold: true,
              size: 16,
              color: INK,
            }),
          ],
        }),
      ],
      {
        widthPct: widthPct[0],
        fill: SIDEBAR_FILL,
        verticalMerge: sidebarMerge,
        textDirection: isFirstBodyRow ? TextDirection.TOP_TO_BOTTOM_RIGHT_TO_LEFT : undefined,
      },
    );

    const featureCell = mergedCell(
      [cellText(row.feature, { bold: true })],
      { widthPct: widthPct[2] },
    );

    let subjectCell: TableCell;
    let equivCell: TableCell;
    if (row.kind === "image") {
      subjectCell = imageCell(spec.subjectPhotoBase64, locale, widthPct[3]);
      equivCell = imageCell(spec.equivalentPhotoBase64, locale, widthPct[4]);
    } else {
      subjectCell = mergedCell(bodyCellParagraphs(row.subject), { widthPct: widthPct[3] });
      equivCell = mergedCell(bodyCellParagraphs(row.equivalent), { widthPct: widthPct[4] });
    }

    tableRows.push(new TableRow({ children: [sidebarCell, sectionCell, featureCell, subjectCell, equivCell] }));
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: tableRows,
  });
}

export function tryConsumeEquivalenceTableBlock(
  lines: string[],
  start: number,
): { table: Table | null; title: string | null; nextIndex: number; extraBlocks?: (Table | Paragraph)[] } {
  const line = lines[start]?.trim() ?? "";
  const spec = parseEquivalenceTableMarker(line);
  if (!spec) return { table: null, title: null, nextIndex: start };

  const extraBlocks: (Table | Paragraph)[] = [];
  if (spec.evidenceScreenshots?.length) {
    const locale = spec.locale;
    extraBlocks.push(
      new Paragraph({
        spacing: { before: 120, after: 80 },
        children: [
          new TextRun({
            text:
              locale === "tr"
                ? "Canlı sorgu kanıtı — ekran görüntüleri"
                : "Live query evidence — screenshots",
            bold: true,
            size: 20,
            color: INK,
          }),
        ],
      }),
    );
    for (const shot of spec.evidenceScreenshots) {
      try {
        const data = Buffer.from(shot.base64, "base64");
        const dims = readImageSize(data);
        const size = scalePhoto(dims ?? { width: 800, height: 600 }, 480, 360);
        extraBlocks.push(
          new Paragraph({
            spacing: { after: 40 },
            children: [new TextRun({ text: shot.caption, italics: true, size: 16, color: "4b5563" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new ImageRun({
                data,
                transformation: { width: size.width, height: size.height },
              }),
            ],
          }),
        );
      } catch {
        /* skip bad image */
      }
    }
  }

  return {
    table: buildEquivalenceTable(spec),
    title: spec.title,
    nextIndex: start + 1,
    extraBlocks: extraBlocks.length ? extraBlocks : undefined,
  };
}
