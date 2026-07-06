import "server-only";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  VerticalMergeType,
  WidthType,
} from "docx";
import type { CompanyLogo } from "@/lib/exports/logo";
import { logoImageRunOptions } from "@/lib/exports/logo";
import type { CalibrationPlanRow } from "./calibration-form-model";

export interface CalibrationPlanDocxInput {
  companyName: string;
  logo: CompanyLogo | null;
  documentDate: string;
  rows: CalibrationPlanRow[];
  locale: "tr" | "en";
}

const FONT = "Arial";
const SZ = 14;
const GRID = { style: BorderStyle.SINGLE, size: 4, color: "000000" } as const;
const GRID_BORDERS = {
  top: GRID,
  bottom: GRID,
  left: GRID,
  right: GRID,
  insideHorizontal: GRID,
  insideVertical: GRID,
} as const;

function run(text: string, opts?: { bold?: boolean; size?: number }): TextRun {
  return new TextRun({
    text,
    font: FONT,
    size: opts?.size ?? SZ,
    bold: opts?.bold,
  });
}

function para(children: (TextRun | ImageRun)[], align?: (typeof AlignmentType)[keyof typeof AlignmentType]): Paragraph {
  return new Paragraph({ alignment: align, children });
}

function cell(
  text: string,
  opts?: { bold?: boolean; widthPct?: number; merge?: "restart" | "continue"; align?: (typeof AlignmentType)[keyof typeof AlignmentType] },
): TableCell {
  const children = text ? [para([run(text)], opts?.align ?? AlignmentType.CENTER)] : [para([])];
  return new TableCell({
    width: opts?.widthPct ? { size: opts.widthPct, type: WidthType.PERCENTAGE } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 40, bottom: 40, left: 60, right: 60 },
    verticalMerge: opts?.merge === "restart" ? VerticalMergeType.RESTART : opts?.merge === "continue" ? VerticalMergeType.CONTINUE : undefined,
    children,
  });
}

function headerCell(text: string, widthPct: number): TableCell {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 60, bottom: 60, left: 40, right: 40 },
    shading: { fill: "E8EEF4" },
    children: [para([run(text, { bold: true, size: 12 })], AlignmentType.CENTER)],
  });
}

function buildPlanTable(rows: CalibrationPlanRow[], locale: "tr" | "en"): Table {
  const headers =
    locale === "tr"
      ? [
          "S.No",
          "Cihaz Kodu",
          "Cihaz Adı",
          "Cihaz Sorumlusu",
          "Marka/ Seri No",
          "Kalibrasyon Tarihi Sertifika No",
          "Ölçüm Aralıkları",
          "Sapma",
          "Belirsizlik",
          "Toplam Sapma",
          "Tolerans",
          "Uygunluk",
          "Gelecek Kalibrasyon Tarihi",
        ]
      : [
          "No",
          "Device Code",
          "Device Name",
          "Responsible",
          "Brand/Serial",
          "Cal. Date / Cert. No",
          "Meas. Range",
          "Deviation",
          "Uncertainty",
          "Total Dev.",
          "Tolerance",
          "Compliance",
          "Next Cal. Date",
        ];

  const widths = [4, 6, 10, 8, 9, 10, 8, 7, 7, 7, 7, 6, 11];
  const tableRows: TableRow[] = [
    new TableRow({ children: headers.map((h, i) => headerCell(h, widths[i] ?? 7)) }),
  ];

  for (const row of rows) {
    const points = row.measurementPoints.length > 0 ? row.measurementPoints : [{ label: "", deviation: "", uncertainty: "", totalDeviation: "" }];
    const span = points.length;

    for (let i = 0; i < span; i++) {
      const pt = points[i];
      const merge = span > 1 ? (i === 0 ? "restart" : "continue") : undefined;
      const shared = { merge } as const;

      tableRows.push(
        new TableRow({
          children: [
            cell(i === 0 ? String(row.serialNo) : "", { ...shared, widthPct: widths[0] }),
            cell(i === 0 ? row.deviceCode : "", { ...shared, widthPct: widths[1] }),
            cell(i === 0 ? row.deviceName : "", { ...shared, widthPct: widths[2] }),
            cell(i === 0 ? row.responsiblePerson : "", { ...shared, widthPct: widths[3] }),
            cell(i === 0 ? row.brandSerialNo : "", { ...shared, widthPct: widths[4] }),
            cell(i === 0 ? row.calibrationDateCertNo : "", { ...shared, widthPct: widths[5] }),
            cell(i === 0 ? row.measurementRange : "", { ...shared, widthPct: widths[6] }),
            cell(pt.label ? `${pt.label}\n${pt.deviation}`.trim() : pt.deviation, { widthPct: widths[7] }),
            cell(pt.uncertainty, { widthPct: widths[8] }),
            cell(pt.totalDeviation, { widthPct: widths[9] }),
            cell(i === 0 ? row.tolerance : "", { ...shared, widthPct: widths[10] }),
            cell(i === 0 ? row.compliance : "", { ...shared, widthPct: widths[11] }),
            cell(i === 0 ? row.nextCalibrationDate : "", { ...shared, widthPct: widths[12] }),
          ],
        }),
      );
    }
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GRID_BORDERS,
    rows: tableRows,
  });
}

function buildDocHeader(input: CalibrationPlanDocxInput): (Paragraph | Table)[] {
  const title = input.locale === "tr" ? "KALİBRASYON PLANI" : "CALIBRATION PLAN";

  const logoPara = input.logo
    ? para([new ImageRun(logoImageRunOptions(input.logo, 90, 36))])
    : para([run(input.companyName.slice(0, 40), { bold: true, size: 16 })]);

  const metaTable = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.NONE, size: 0, color: "auto" },
      bottom: { style: BorderStyle.NONE, size: 0, color: "auto" },
      left: { style: BorderStyle.NONE, size: 0, color: "auto" },
      right: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideHorizontal: { style: BorderStyle.NONE, size: 0, color: "auto" },
      insideVertical: { style: BorderStyle.NONE, size: 0, color: "auto" },
    },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [logoPara],
          }),
          new TableCell({
            width: { size: 50, type: WidthType.PERCENTAGE },
            children: [para([run(title, { bold: true, size: 22 })], AlignmentType.CENTER)],
          }),
          new TableCell({
            width: { size: 25, type: WidthType.PERCENTAGE },
            children: [
              para(
                [
                  run(
                    input.locale === "tr"
                      ? `REVİZYON TARİHİ: ${input.documentDate}`
                      : `REVISION DATE: ${input.documentDate}`,
                    { size: 12 },
                  ),
                ],
                AlignmentType.RIGHT,
              ),
            ],
          }),
        ],
      }),
    ],
  });

  const updateLabel =
    input.locale === "tr"
      ? `Güncelleme Tarihi: ${input.documentDate}`
      : `Update date: ${input.documentDate}`;

  return [metaTable, para([run(updateLabel, { size: 12 })], AlignmentType.LEFT), para([])];
}

export async function buildCalibrationPlanDocx(input: CalibrationPlanDocxInput): Promise<Buffer> {
  const body = [...buildDocHeader(input), buildPlanTable(input.rows, input.locale)];

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: { orientation: PageOrientation.LANDSCAPE },
            margin: { top: 720, right: 720, bottom: 720, left: 720 },
          },
        },
        headers: {
          default: new Header({
            children: [
              para(
                [
                  run(
                    input.locale === "tr" ? "SAYFA NO: " : "PAGE: ",
                    { size: 12 },
                  ),
                ],
                AlignmentType.RIGHT,
              ),
            ],
          }),
        },
        footers: {
          default: new Footer({ children: [para([run(input.companyName, { size: 12 })], AlignmentType.CENTER)] }),
        },
        children: body,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
