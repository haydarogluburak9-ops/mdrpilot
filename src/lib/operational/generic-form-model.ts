import { getRuleBasedFormContent } from "@/lib/qms/form-templates";
import { normalizeLabel } from "@/lib/qms/form-content-parser";

export interface EditableFormRow {
  label: string;
  value: string;
  lineIndex: number;
}

const SKIP_LABELS = new Set([
  "alan",
  "field",
  "değer",
  "value",
  "------",
  "-------",
  "soru",
  "question",
  "evet",
  "yes",
  "hayır",
  "no",
  "madde",
  "item",
  "karar",
  "decision",
  "girdi",
  "input",
  "rol",
  "role",
]);

function isMultiColumnTable(headerLine: string): boolean {
  const cells = headerLine.split("|").map((c) => c.trim()).filter(Boolean);
  return cells.length > 3;
}

export function defaultFormContent(formCode: string, locale: "tr" | "en"): string {
  return getRuleBasedFormContent(formCode, locale) ?? "";
}

export function parseEditableFormRows(content: string): EditableFormRow[] {
  const lines = content.split("\n");
  const rows: EditableFormRow[] = [];
  let inExample = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (/^##\s+(örnek|example)\b/i.test(trimmed)) {
      inExample = true;
      continue;
    }
    if (inExample) continue;

    const match = trimmed.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!match) continue;

    const label = match[1].trim();
    const labelNorm = normalizeLabel(label);
    if (SKIP_LABELS.has(labelNorm) || /^[-:]+$/.test(labelNorm)) continue;

    const prev = lines[i - 1]?.trim() ?? "";
    if (prev.startsWith("|") && isMultiColumnTable(prev)) continue;

    rows.push({ label, value: match[2].trim(), lineIndex: i });
  }

  return rows;
}

export function applyEditableFormRows(content: string, rows: EditableFormRow[]): string {
  const lines = content.split("\n");
  for (const row of rows) {
    if (row.lineIndex < 0 || row.lineIndex >= lines.length) continue;
    const line = lines[row.lineIndex];
    const match = line.trim().match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!match) continue;
    const padding = line.match(/^\s*/)?.[0] ?? "";
    lines[row.lineIndex] = `${padding}| ${row.label} | ${row.value} |`;
  }
  return lines.join("\n");
}

export function initGenericFormContent(
  formCode: string,
  locale: "tr" | "en",
  referenceNo?: string,
): string {
  let content = defaultFormContent(formCode, locale);
  if (!content.trim()) return content;
  if (referenceNo?.trim()) {
    const rows = parseEditableFormRows(content);
    const refRow = rows.find((r) =>
      /referans|reference|no\.?$/i.test(normalizeLabel(r.label)),
    );
    if (refRow) {
      refRow.value = referenceNo.trim();
      content = applyEditableFormRows(content, rows);
    }
  }
  return content;
}
