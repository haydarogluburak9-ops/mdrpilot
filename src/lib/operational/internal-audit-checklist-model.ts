import { buildFormIa01 } from "@/lib/qms/form-templates";
import { parseMarkdownFormFields, pickField } from "@/lib/qms/form-content-parser";

export interface InternalAuditChecklistItem {
  item: string;
  ok: boolean;
  nonConforming: boolean;
  minor: boolean;
  major: boolean;
  note: string;
}

export interface InternalAuditChecklistData {
  auditNo: string;
  date: string;
  leadAuditor: string;
  scope: string;
  items: InternalAuditChecklistItem[];
}

export const DEFAULT_IA_CHECKLIST_ITEMS_TR: readonly string[] = [
  "4.2 Doküman kontrolü",
  "4.2.4 Kayıtların kontrolü",
  "6.2 İnsan kaynakları / yetkinlik",
  "7.4 Satın alma ve tedarikçi",
  "7.5 Üretim ve süreç kontrolü",
  "7.5.8 İzlenebilirlik",
  "7.6 Kalibrasyon / ölçüm cihazları",
  "8.2.1 Geri bildirim (genel)",
  "8.2.2 Şikâyet yönetimi",
  "8.2.3 Yetkili kuruluş bildirimleri",
  "8.2.4 İç tetkik süreci",
  "8.5 CAPA",
];

export const DEFAULT_IA_CHECKLIST_ITEMS_EN: readonly string[] = [
  "4.2 Document control",
  "4.2.4 Control of records",
  "6.2 Human resources / competence",
  "7.4 Purchasing and suppliers",
  "7.5 Production and process control",
  "7.5.8 Traceability",
  "7.6 Calibration / measuring equipment",
  "8.2.1 Feedback (general)",
  "8.2.2 Complaint handling",
  "8.2.3 Regulatory reporting",
  "8.2.4 Internal audit process",
  "8.5 CAPA",
];

function cellChecked(cell: string): boolean {
  return /☑|✓|✔|\[x\]/i.test(cell.trim());
}

function chk(marked: boolean): string {
  return marked ? "☑" : "☐";
}

function defaultItems(locale: "tr" | "en"): InternalAuditChecklistItem[] {
  const labels = locale === "tr" ? DEFAULT_IA_CHECKLIST_ITEMS_TR : DEFAULT_IA_CHECKLIST_ITEMS_EN;
  return labels.map((item) => ({
    item,
    ok: false,
    nonConforming: false,
    minor: false,
    major: false,
    note: "",
  }));
}

function parseChecklistTable(content: string): InternalAuditChecklistItem[] {
  const items: InternalAuditChecklistItem[] = [];
  const lines = content.split("\n");
  let inChecklist = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^##\s+(kontrol listesi|checklist)\b/i.test(trimmed)) {
      inChecklist = true;
      continue;
    }
    if (inChecklist && trimmed.startsWith("##")) break;
    if (!inChecklist || !trimmed.startsWith("|")) continue;

    const cells = trimmed
      .split("|")
      .map((c) => c.trim())
      .filter((c, i, arr) => i > 0 && i < arr.length - 1);
    if (cells.length < 5) continue;

    const first = cells[0].toLowerCase();
    if (/^[-:]+$/.test(first) || first === "madde" || first === "item") continue;

    items.push({
      item: cells[0],
      ok: cellChecked(cells[1] ?? ""),
      nonConforming: cellChecked(cells[2] ?? ""),
      minor: cellChecked(cells[3] ?? ""),
      major: cellChecked(cells[4] ?? ""),
      note: (cells[5] ?? "").trim(),
    });
  }

  return items;
}

export function emptyInternalAuditChecklistData(locale: "tr" | "en", year?: string): InternalAuditChecklistData {
  const data = parseInternalAuditChecklistMarkdown(buildFormIa01(locale), locale);
  if (year && !data.auditNo.trim()) {
    data.auditNo = `IA-${year}`;
  }
  return data;
}

function mergeChecklistItems(
  parsed: InternalAuditChecklistItem[],
  locale: "tr" | "en",
): InternalAuditChecklistItem[] {
  const defaults = defaultItems(locale);
  const byItem = new Map(parsed.map((row) => [row.item, row]));
  for (const def of defaults) {
    if (!byItem.has(def.item)) byItem.set(def.item, def);
  }
  return defaults.map((def) => byItem.get(def.item) ?? def);
}

export function parseInternalAuditChecklistMarkdown(
  content: string,
  locale: "tr" | "en",
  yearHint?: string,
): InternalAuditChecklistData {
  const fields = parseMarkdownFormFields(content);
  const parsed = parseChecklistTable(content);

  const data: InternalAuditChecklistData = {
    auditNo:
      pickField(fields, "tetkik no", "audit no")?.replace(/_+/g, "").trim() ??
      (yearHint ? `IA-${yearHint}` : ""),
    date: pickField(fields, "tarih", "date")?.replace(/_+/g, "").trim() ?? "",
    leadAuditor: pickField(fields, "denetçi", "lead auditor")?.replace(/_+/g, "").trim() ?? "",
    scope: pickField(fields, "kapsam / alan", "scope / area")?.replace(/_+/g, "").trim() ?? "",
    items: mergeChecklistItems(parsed, locale),
  };

  return data;
}

export function serializeInternalAuditChecklistMarkdown(
  data: InternalAuditChecklistData,
  locale: "tr" | "en",
): string {
  const header = buildFormIa01(locale).split("## Tetkik bilgileri")[0].split("## Audit information")[0];
  // buildFormIa01 returns full doc - better rebuild body only

  const auditSection =
    locale === "tr"
      ? [
          "## Tetkik bilgileri",
          "",
          "| Alan | Değer |",
          "|------|-------|",
          `| Tetkik no | ${data.auditNo || "IA-________"} |`,
          `| Tarih | ${data.date || "__________"} |`,
          `| Denetçi | ${data.leadAuditor || "__________"} |`,
          `| Kapsam / alan | ${data.scope || "__________"} |`,
        ].join("\n")
      : [
          "## Audit information",
          "",
          "| Field | Value |",
          "|-------|-------|",
          `| Audit no | ${data.auditNo || "IA-________"} |`,
          `| Date | ${data.date || "__________"} |`,
          `| Lead auditor | ${data.leadAuditor || "__________"} |`,
          `| Scope / area | ${data.scope || "__________"} |`,
        ].join("\n");

  const checklistHeader =
    locale === "tr"
      ? [
          "## Kontrol listesi",
          "",
          "| Madde | Uygun | Uygunsuz | Minör | Majör | Not |",
          "|-------|-------|----------|-------|-------|-----|",
        ]
      : [
          "## Checklist",
          "",
          "| Item | OK | NC | Minor | Major | Note |",
          "|------|----|----|-------|-------|------|",
        ];

  const checklistRows = data.items.map(
    (row) =>
      `| ${row.item} | ${chk(row.ok)} | ${chk(row.nonConforming)} | ${chk(row.minor)} | ${chk(row.major)} | ${row.note} |`,
  );

  const approval =
    locale === "tr"
      ? [
          "## Onay",
          "",
          "| Rol | Ad / imza | Tarih |",
          "|-----|-----------|-------|",
          "| Hazırlayan | | |",
          "| Kalite Müdürü | | |",
          "| Onay (üst yönetim / PRRC) | | |",
        ].join("\n")
      : [
          "## Approval",
          "",
          "| Role | Name / signature | Date |",
          "|------|------------------|------|",
          "| Prepared by | | |",
          "| Quality Manager | | |",
          "| Approved by (top management / PRRC) | | |",
        ].join("\n");

  const formHeaderPart = buildFormIa01(locale).split(
    locale === "tr" ? "## Tetkik bilgileri" : "## Audit information",
  )[0];

  return [formHeaderPart.trim(), auditSection, "", ...checklistHeader, ...checklistRows, "", approval].join("\n");
}
