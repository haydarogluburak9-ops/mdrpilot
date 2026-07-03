import type { VigilanceSeverity } from "@/lib/compliance/regulatory-calendar";
import {
  buildVigilanceDeadline,
  vigilanceReportDays,
} from "@/lib/compliance/regulatory-calendar";

export type { VigilanceSeverity };

/** Infer MDR Art. 87 severity from incident text (TR + EN keywords). */
export function inferVigilanceSeverity(title: string, description: string | null): VigilanceSeverity {
  const text = `${title} ${description ?? ""}`.toLowerCase();
  if (/ölüm|death|fatal|ölümcül|beklenmeyen ciddi/.test(text)) return "DEATH_SERIOUS";
  if (/ciddi|serious|ağır|hastane|hospital/.test(text)) return "SERIOUS";
  return "NON_SERIOUS";
}

export function computeVigilanceDueDate(eventAt: Date, severity: VigilanceSeverity): Date {
  const due = new Date(eventAt);
  due.setDate(due.getDate() + vigilanceReportDays(severity));
  return due;
}

export function vigilanceDeadlineSummary(input: {
  eventAt: string;
  severity: VigilanceSeverity;
  reportedAt?: string | null;
  locale: "tr" | "en";
}) {
  return buildVigilanceDeadline(input);
}
