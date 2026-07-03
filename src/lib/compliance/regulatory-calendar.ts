import type { DeviceClass } from "@/lib/domain/types";

export type RegulatoryReminderKind = "PSUR" | "CER" | "VIGILANCE";

export type RegulatoryReminderStatus = "OK" | "DUE_SOON" | "OVERDUE" | "NOT_APPLICABLE";

export interface RegulatoryReminder {
  kind: RegulatoryReminderKind;
  title: string;
  dueDate: string | null;
  lastCompletedAt: string | null;
  intervalMonths: number | null;
  status: RegulatoryReminderStatus;
  reference: string;
  note?: string;
}

/** MDCG 2022-21 aligned PSUR reporting intervals (months). */
export function psurIntervalMonths(deviceClass: DeviceClass): number | null {
  switch (deviceClass) {
    case "CLASS_I":
    case "CLASS_IS":
    case "CLASS_IM":
    case "CLASS_IR":
      return null;
    case "CLASS_IIA":
      return 24;
    case "CLASS_IIB":
    case "CLASS_III":
      return 12;
    default:
      return null;
  }
}

export function cerUpdateIntervalMonths(deviceClass: DeviceClass): number {
  switch (deviceClass) {
    case "CLASS_III":
    case "CLASS_IIB":
      return 12;
    case "CLASS_IIA":
      return 24;
    default:
      return 36;
  }
}

function addMonths(iso: string, months: number): Date {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d;
}

function reminderStatus(due: Date | null): RegulatoryReminderStatus {
  if (!due) return "NOT_APPLICABLE";
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "OVERDUE";
  if (diffDays <= 60) return "DUE_SOON";
  return "OK";
}

export function buildPsurReminder(input: {
  deviceClass: DeviceClass;
  psurApprovedAt?: string | null;
  psurSectionUpdatedAt?: string | null;
  locale: "tr" | "en";
}): RegulatoryReminder {
  const tr = input.locale === "tr";
  const interval = psurIntervalMonths(input.deviceClass);
  const anchor = input.psurApprovedAt ?? input.psurSectionUpdatedAt ?? null;
  const due = interval && anchor ? addMonths(anchor, interval) : null;

  return {
    kind: "PSUR",
    title: tr ? "Periyodik Güvenlik Güncelleme Raporu (PSUR)" : "Periodic Safety Update Report (PSUR)",
    lastCompletedAt: anchor,
    dueDate: due?.toISOString() ?? null,
    intervalMonths: interval,
    status: interval ? reminderStatus(due) : "NOT_APPLICABLE",
    reference: "MDCG 2022-21 / MDR Art. 86",
    note:
      interval == null
        ? tr
          ? "Sınıf I cihazlar için PSUR gerekmez; PMS raporu yeterlidir."
          : "PSUR not required for Class I; PMS report applies."
        : undefined,
  };
}

export function buildCerReminder(input: {
  deviceClass: DeviceClass;
  cerApprovedAt?: string | null;
  locale: "tr" | "en";
}): RegulatoryReminder {
  const tr = input.locale === "tr";
  const interval = cerUpdateIntervalMonths(input.deviceClass);
  const anchor = input.cerApprovedAt ?? null;
  const due = anchor ? addMonths(anchor, interval) : null;

  return {
    kind: "CER",
    title: tr ? "Klinik Değerlendirme Raporu (CER) güncellemesi" : "Clinical Evaluation Report (CER) update",
    lastCompletedAt: anchor,
    dueDate: due?.toISOString() ?? null,
    intervalMonths: interval,
    status: anchor ? reminderStatus(due) : "DUE_SOON",
    reference: "MDCG 2020-5 / MDR Art. 61",
    note: !anchor
      ? tr
        ? "CER henüz onaylanmadı — ilk onay sonrası periyodik güncelleme başlar."
        : "CER not yet approved — periodic update starts after first approval."
      : undefined,
  };
}

export type VigilanceSeverity = "DEATH_SERIOUS" | "SERIOUS" | "NON_SERIOUS";

/** MDR Art. 87 simplified reporting deadlines (calendar days from awareness). */
export function vigilanceReportDays(severity: VigilanceSeverity): number {
  switch (severity) {
    case "DEATH_SERIOUS":
      return 10;
    case "SERIOUS":
      return 15;
    case "NON_SERIOUS":
      return 30;
  }
}

export function buildVigilanceDeadline(input: {
  eventAt: string;
  severity: VigilanceSeverity;
  reportedAt?: string | null;
  locale: "tr" | "en";
}): RegulatoryReminder {
  const tr = input.locale === "tr";
  const days = vigilanceReportDays(input.severity);
  const event = new Date(input.eventAt);
  const due = new Date(event);
  due.setDate(due.getDate() + days);
  const closed = Boolean(input.reportedAt);

  return {
    kind: "VIGILANCE",
    title: tr ? "Vigilans bildirim süresi" : "Vigilance reporting deadline",
    lastCompletedAt: input.reportedAt ?? null,
    dueDate: due.toISOString(),
    intervalMonths: null,
    status: closed ? "OK" : reminderStatus(due),
    reference: `MDR Art. 87 (${days} ${tr ? "gün" : "days"})`,
    note:
      input.severity === "DEATH_SERIOUS"
        ? tr
          ? "Ölüm veya ciddi sağlık durumu kötüleşmesi — 10 gün."
          : "Death or unanticipated serious deterioration — 10 days."
        : undefined,
  };
}
