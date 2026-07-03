/** Parse markdown table fields from KYS form templates (FORM-CAPA-01, FORM-CH-01, etc.). */

export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const SKIP_LABELS = new Set([
  "alan",
  "field",
  "değer",
  "value",
  "soru",
  "question",
  "evet",
  "yes",
  "hayır",
  "no",
  "not",
  "sonuç",
  "result",
  "doğrulama yöntemi",
  "verification method",
  "------",
  "-------",
]);

function isPlaceholder(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  if (/^_+$/.test(v.replace(/\s/g, ""))) return true;
  if (v === "________") return true;
  return false;
}

export function parseMarkdownFormFields(content: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let inExample = false;

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (/^##\s+(örnek|example)\b/i.test(line)) {
      inExample = true;
      continue;
    }
    if (inExample) continue;

    const match = line.match(/^\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/);
    if (!match) continue;

    const label = normalizeLabel(match[1]);
    const value = match[2].trim();
    if (SKIP_LABELS.has(label) || /^[-:]+$/.test(label)) continue;
    if (isPlaceholder(value)) continue;

    fields[label] = value;
  }

  return fields;
}

export function pickField(
  fields: Record<string, string>,
  ...aliases: string[]
): string | undefined {
  for (const alias of aliases) {
    const key = normalizeLabel(alias);
    const direct = fields[key];
    if (direct && !isPlaceholder(direct)) return direct;

    for (const [k, v] of Object.entries(fields)) {
      if (k.includes(key) || key.includes(k)) {
        if (!isPlaceholder(v)) return v;
      }
    }
  }
  return undefined;
}

export function parseFormDate(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const v = value.trim();

  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return new Date(`${iso[1]}-${iso[2]}-${iso[3]}T12:00:00.000Z`);

  const tr = v.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (tr) {
    const d = String(tr[1]).padStart(2, "0");
    const m = String(tr[2]).padStart(2, "0");
    return new Date(`${tr[3]}-${m}-${d}T12:00:00.000Z`);
  }

  const us = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (us) {
    const m = String(us[1]).padStart(2, "0");
    const d = String(us[2]).padStart(2, "0");
    return new Date(`${us[3]}-${m}-${d}T12:00:00.000Z`);
  }

  const parsed = Date.parse(v);
  return Number.isNaN(parsed) ? null : new Date(parsed);
}

export function checkboxChecked(value: string | undefined, option: string): boolean {
  if (!value) return false;
  const opt = option.toLowerCase();
  const parts = value.split("☐").map((p) => p.trim().toLowerCase());
  for (let i = 0; i < parts.length - 1; i++) {
    const label = parts[i].replace(/^[|☑✓✔x]+\s*/i, "").trim();
    const next = parts[i + 1];
    if (label.includes(opt) && /^[☑✓✔x]/i.test(next.charAt(0))) return true;
  }
  if (/☑|✓|✔|\[x\]/i.test(value) && value.toLowerCase().includes(opt)) return true;
  return false;
}

export function inferCapaRequired(fields: Record<string, string>): boolean {
  const row =
    pickField(fields, "capa gerekli mi?", "capa required?", "capa gerekli") ??
    Object.entries(fields).find(([k]) => k.includes("capa gerekli") || k.includes("capa required"))?.[1];
  if (!row) return false;
  if (/hayır|no|gerekmedi|not required/i.test(row)) return false;
  if (checkboxChecked(row, "evet") || checkboxChecked(row, "yes")) return true;
  return /evet|yes|gerekli|required/i.test(row);
}

export function inferComplaintStatus(fields: Record<string, string>): "OPEN" | "MONITORING" | "CLOSED" {
  const statusRow =
    pickField(fields, "durum", "status", "şikâyet durumu", "complaint status") ??
    Object.entries(fields).find(([k]) => k.includes("durum") || k.includes("status"))?.[1];

  if (statusRow) {
    if (/izlemede|monitoring|capa açık|capa open/i.test(statusRow)) return "MONITORING";
    if (/kapat|closed|kapand/i.test(statusRow)) return "CLOSED";
    if (checkboxChecked(statusRow, "kapat") || checkboxChecked(statusRow, "closed")) return "CLOSED";
    if (checkboxChecked(statusRow, "izlemede") || checkboxChecked(statusRow, "monitoring")) {
      return "MONITORING";
    }
  }
  return inferCapaRequired(fields) ? "MONITORING" : "OPEN";
}

export function inferCapaStatus(fields: Record<string, string>, dueDate: Date | null): "OPEN" | "IN_PROGRESS" | "CLOSED" | "OVERDUE" {
  const closure = pickField(fields, "kapanış onayı", "closure approval");

  const statusRow = pickField(fields, "capa durumu", "capa status");
  if (statusRow && /kapalı|closed|kapand/i.test(statusRow)) return "CLOSED";
  if (closure && closure.length > 2) return "CLOSED";

  const corrective = pickField(fields, "düzeltici faaliyet", "corrective action");
  const rootCause = pickField(fields, "kök neden analizi", "root cause analysis");
  if (corrective || rootCause) {
    if (dueDate && dueDate.getTime() < Date.now()) return "OVERDUE";
    return "IN_PROGRESS";
  }

  if (dueDate && dueDate.getTime() < Date.now()) return "OVERDUE";
  return "OPEN";
}
