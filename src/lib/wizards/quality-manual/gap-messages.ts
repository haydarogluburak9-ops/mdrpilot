/** Client-safe gap action items and message formatting for the QM wizard gap check. */

export type GapActionKind =
  | "wizard_field"
  | "kys_content"
  | "procedure_ref"
  | "inconsistency"
  | "scope_warning";

export interface GapActionItem {
  kind: GapActionKind;
  severity: "critical" | "warning";
  step?: number;
  fieldKey?: string;
  kysCode?: string;
  messageKey: string;
  params?: Record<string, string>;
}

export interface KysContentGap {
  code: string;
  title: string;
  fieldKey?: string;
  status: string | null;
  reason: "empty_content" | "not_in_register" | "status_missing";
}

export function formatGapActionItem(
  item: GapActionItem,
  dict: Record<string, string>,
): string {
  const key = `qmGap.${item.messageKey}`;
  let template = dict[key] ?? key;
  if (!template || template === key) template = item.messageKey;
  let out = template;
  for (const [k, v] of Object.entries(item.params ?? {})) {
    out = out.replace(new RegExp(`\\{${k}\\}`, "g"), v);
  }
  return out;
}

export function formatKysContentGap(
  gap: KysContentGap,
  dict: Record<string, string>,
): string {
  const reasonKey = `qmGap.kys_${gap.reason}`;
  const reason = dict[reasonKey] ?? gap.reason;
  const fieldPart = gap.fieldKey
    ? (dict[`qmField.${gap.fieldKey}`] ?? gap.fieldKey)
    : "";
  const template = dict["qmGap.kys_content_line"] ?? "{code} — {title}: {reason}";
  return template
    .replace("{code}", gap.code)
    .replace("{title}", gap.title)
    .replace("{reason}", reason)
    .replace("{field}", fieldPart);
}
