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
import type { ExportLanguage } from "../i18n";

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
const DECISION_FILL = "fef3c7";

type DocxBlock = Paragraph | Table;

function boxCell(lines: string[], fill = BOX_FILL): TableCell {
  const children = lines.map((line, i) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: i === 0 ? 0 : 50, after: 0 },
      children: [
        new TextRun({
          text: line,
          bold: i === 0,
          size: i === 0 ? 19 : 17,
          color: INK,
        }),
      ],
    }),
  );
  return new TableCell({
    shading: { fill },
    borders: GRID_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 110, bottom: 110, left: 180, right: 180 },
    children,
  });
}

function arrowRow(): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        borders: NO_BORDERS,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 70, after: 70 },
            children: [new TextRun({ text: "▼", bold: true, size: 24, color: BRAND })],
          }),
        ],
      }),
    ],
  });
}

function singleBoxRow(lines: string[], fill?: string): TableRow {
  return new TableRow({ children: [boxCell(lines, fill)] });
}

function flowTable(rows: TableRow[]): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows,
  });
}

/** Landscape-friendly vertical boxed flowchart for DIA-AN-01 (no ASCII). */
export function buildAnDecisionFlowDiagramDocx(lang: ExportLanguage): DocxBlock[] {
  const tr = lang === "tr";
  const no = tr ? "HAYIR" : "NO";
  const yes = tr ? "EVET" : "YES";

  const rows: TableRow[] = [
    singleBoxRow(
      tr
        ? ["GİRİŞ", "Şikâyet (SOP-CH / FORM-CH-01)", "Vigilans (SOP-VG)", "İç/dış uyarı, PMS sinyali"]
        : ["ENTRY", "Complaint (SOP-CH / FORM-CH-01)", "Vigilance (SOP-VG)", "Internal/external alert, PMS"],
    ),
    arrowRow(),
    singleBoxRow(
      tr
        ? ["İlk değerlendirme ve kayıt", "FORM-AN-01 — FSCA başlatma formu"]
        : ["Initial assessment & logging", "FORM-AN-01 — FSCA initiation form"],
    ),
    arrowRow(),
    singleBoxRow(
      tr
        ? [
            "Karar: Hasta / kullanıcı emniyet riski var mı?",
            `${no} → Danışma Bildirimi (FORM-AN-03)`,
            `${yes} → Aşağıdaki FSCA kararı`,
          ]
        : [
            "Decision: Patient / user safety risk?",
            `${no} → Advisory Notice (FORM-AN-03)`,
            `${yes} → FSCA decision below`,
          ],
      DECISION_FILL,
    ),
    arrowRow(),
    singleBoxRow(
      tr
        ? [
            "Karar: FSCA gerekli mi?",
            "(ölüm, ciddi bozulma, ciddi kamu sağlığı tehdidi)",
            `${no} → Risk azaltma / izleme (SOP-RM)`,
            `${yes} → FSCA başlat (FORM-AN-01 onay)`,
            "FSN hazırla (FORM-AN-02)",
            "Dağıtım (FORM-AN-04) · İade takip (FORM-AN-05)",
          ]
        : [
            "Decision: FSCA required?",
            "(death, serious deterioration, serious public health threat)",
            `${no} → Risk mitigation / monitoring (SOP-RM)`,
            `${yes} → Initiate FSCA (FORM-AN-01 approval)`,
            "Prepare FSN (FORM-AN-02)",
            "Distribute (FORM-AN-04) · Return tracking (FORM-AN-05)",
          ],
      DECISION_FILL,
    ),
    arrowRow(),
    singleBoxRow(
      tr
        ? [
            "MDR bildirim süreleri (yetkili otorite)",
            "2 gün — ciddi kamu sağlığı tehdidi",
            "10 gün — ölüm / ciddi sağlık bozulması",
            "15 gün — diğer ciddi olaylar",
            "WI-AN-01 — EUDAMED / ulusal portal",
          ]
        : [
            "MDR reporting timelines (competent authority)",
            "2 days — serious public health threat",
            "10 days — death / serious deterioration",
            "15 days — other serious incidents",
            "WI-AN-01 — EUDAMED / national portal",
          ],
    ),
    arrowRow(),
    singleBoxRow(
      tr
        ? [
            "Etkinlik doğrulama (FORM-AN-06)",
            "Gerekirse CAPA (FORM-CAPA-01)",
            "Vaka kapanışı (REC-AN-01 örneği)",
          ]
        : [
            "Effectiveness verification (FORM-AN-06)",
            "CAPA if needed (FORM-CAPA-01)",
            "Case closure (REC-AN-01 sample)",
          ],
    ),
  ];

  const heading = tr ? "Akış şeması" : "Flow diagram";
  const note = tr
    ? "Şema — prosedür metni değildir. Yatay sayfa düzeninde kutu akış şeması."
    : "Diagram — not a procedure. Boxed flowchart on landscape layout.";

  return [
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [new TextRun({ text: heading, bold: true, size: 24, color: BRAND })],
    }),
    new Paragraph({
      spacing: { after: 140 },
      children: [new TextRun({ text: note, italics: true, size: 17, color: "6b7280" })],
    }),
    flowTable(rows),
    new Paragraph({ spacing: { after: 200 }, children: [] }),
  ];
}

const FLOW_DIAGRAM_BUILDERS: Record<string, (lang: ExportLanguage) => DocxBlock[]> = {
  "DIA-AN-01": buildAnDecisionFlowDiagramDocx,
};

export function getFlowDiagramDocxBlocks(
  documentCode: string | null | undefined,
  lang: ExportLanguage,
): DocxBlock[] | null {
  if (!documentCode) return null;
  const builder = FLOW_DIAGRAM_BUILDERS[documentCode.trim().toUpperCase()];
  return builder ? builder(lang) : null;
}

export function isLandscapeDiagramExport(documentCode: string | null | undefined, layer?: string | null): boolean {
  if (!documentCode) return layer === "DIAGRAM";
  const code = documentCode.trim().toUpperCase();
  if (code.startsWith("DIA-") || layer === "DIAGRAM") return true;
  return Boolean(FLOW_DIAGRAM_BUILDERS[code]);
}
