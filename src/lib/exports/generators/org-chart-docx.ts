import {
  AlignmentType,
  BorderStyle,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
} from "docx";

const GRID = { style: BorderStyle.SINGLE, size: 4, color: "9ca3af" } as const;
const GRID_BORDERS = {
  top: GRID,
  bottom: GRID,
  left: GRID,
  right: GRID,
  insideHorizontal: GRID,
  insideVertical: GRID,
} as const;
const NO = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const NO_BORDERS = { top: NO, bottom: NO, left: NO, right: NO, insideHorizontal: NO, insideVertical: NO } as const;

const BRAND = "1d4ed8";
const INK = "111827";
const BOX_FILL = "eff6ff";

export interface OrgChartNode {
  label: string;
  children: OrgChartNode[];
}

export function hasOrgChartTreeMark(line: string): boolean {
  return /├──|└──/.test(line) || line.trimStart().startsWith("│");
}

/** Parse ASCII tree (├── / │ / └──) into a hierarchy. */
export function parseAsciiOrgChart(text: string): OrgChartNode | null {
  const rawLines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const parsed: { depth: number; label: string }[] = [];

  for (const line of rawLines) {
    if (!line.trim()) continue;
    const item = parseOrgChartLine(line);
    if (item) parsed.push(item);
  }

  if (parsed.length === 0) return null;
  if (parsed.length === 1 && !hasOrgChartTreeMark(text)) return null;

  const root: OrgChartNode = { label: parsed[0].label, children: [] };
  const stack: { node: OrgChartNode; depth: number }[] = [{ node: root, depth: parsed[0].depth }];

  for (let i = 1; i < parsed.length; i++) {
    const { depth, label } = parsed[i];
    const newNode: OrgChartNode = { label, children: [] };
    while (stack.length > 1 && stack[stack.length - 1].depth >= depth) {
      stack.pop();
    }
    stack[stack.length - 1].node.children.push(newNode);
    stack.push({ node: newNode, depth });
  }

  return root;
}

function parseOrgChartLine(line: string): { depth: number; label: string } | null {
  let rest = line.replace(/\r$/, "");
  let pipes = 0;
  while (rest.startsWith("│   ") || rest.startsWith("│ ")) {
    pipes++;
    rest = rest.startsWith("│   ") ? rest.slice(4) : rest.slice(2);
  }
  const hasBranch = /^├──/.test(rest) || /^└──/.test(rest);
  if (hasBranch) rest = rest.replace(/^(?:├──|└──)\s*/, "");
  const label = rest.trim();
  if (!label) return null;

  const depth = pipes + (hasBranch ? 1 : 0);
  return { depth, label };
}

function roleBoxParagraph(label: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: label, bold: true, size: 17, color: INK })],
  });
}

function roleBoxCell(label: string): TableCell {
  return new TableCell({
    shading: { fill: BOX_FILL },
    borders: GRID_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    children: [roleBoxParagraph(label)],
  });
}

function connectorCell(): TableCell {
  return new TableCell({
    borders: NO_BORDERS,
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 40, after: 40 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: BRAND, space: 1 } },
        children: [],
      }),
    ],
  });
}

/** Nested tables: boxed roles with vertical connectors (Word org-chart layout). */
function buildSubtreeTable(node: OrgChartNode): Table {
  if (node.children.length === 0) {
    return new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: NO_BORDERS,
      rows: [new TableRow({ children: [roleBoxCell(node.label)] })],
    });
  }

  const childCols = node.children.length;
  const childCells = node.children.map((child) =>
    new TableCell({
      borders: NO_BORDERS,
      verticalAlign: VerticalAlign.TOP,
      width: { size: Math.floor(100 / childCols), type: WidthType.PERCENTAGE },
      children: [buildSubtreeTable(child)],
    }),
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [roleBoxCell(node.label)] }),
      new TableRow({ children: [connectorCell()] }),
      new TableRow({ children: childCells }),
    ],
  });
}

export function buildOrgChartTable(root: OrgChartNode): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            borders: NO_BORDERS,
            children: [buildSubtreeTable(root)],
          }),
        ],
      }),
    ],
  });
}

/** Detect and consume an ASCII org-chart block starting at line index i. */
export function tryConsumeOrgChartBlock(
  lines: string[],
  start: number,
): { nextIndex: number; table: Table | null } {
  const first = lines[start]?.trim() ?? "";
  if (!first || first.startsWith("#") || (first.startsWith("|") && first.includes("|"))) {
    return { nextIndex: start, table: null };
  }

  const chunk: string[] = [];
  let j = start;

  if (hasOrgChartTreeMark(lines[start])) {
    chunk.push(lines[start]);
    j = start + 1;
  } else if (lines[start + 1] && hasOrgChartTreeMark(lines[start + 1])) {
    chunk.push(lines[start]);
    j = start + 1;
  } else {
    return { nextIndex: start, table: null };
  }

  while (j < lines.length) {
    const t = lines[j]?.trim() ?? "";
    if (!t) break;
    if (!hasOrgChartTreeMark(lines[j])) break;
    chunk.push(lines[j]);
    j++;
  }

  if (chunk.length < 2) return { nextIndex: start, table: null };
  const tree = parseAsciiOrgChart(chunk.join("\n"));
  if (!tree) return { nextIndex: start, table: null };
  return { nextIndex: j, table: buildOrgChartTable(tree) };
}
