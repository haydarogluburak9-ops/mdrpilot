import "server-only";
import { prisma } from "@/lib/db";
import { operationalHrefForKind } from "@/lib/operational/module-kind-slug";

export type EqmsReminderKind =
  | "CAPA_DUE"
  | "CAPA_OVERDUE"
  | "OPERATIONAL_DUE"
  | "VIGILANCE_DUE"
  | "VIGILANCE_OVERDUE"
  | "CALIBRATION_DUE"
  | "DOC_REVIEW_DUE"
  | "DOC_REVIEW_OVERDUE"
  | "SUPPLIER_REEVAL"
  | "INTERNAL_AUDIT_OPEN"
  | "TRAINING_DUE"
  | "COMPETENCY_DUE";

export interface EqmsReminder {
  id: string;
  kind: EqmsReminderKind;
  title: string;
  dueDate: string | null;
  href: string;
  priority: "high" | "medium" | "low";
}

function daysUntil(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

/** Collect actionable eQMS reminders from CAPA, operational records, document reviews, suppliers. */
export async function collectEqmsReminders(companyId: string): Promise<EqmsReminder[]> {
  const reminders: EqmsReminder[] = [];
  const now = new Date();

  const [capas, operational, docReviews, suppliers, auditCycles, trainingRecords, competencies] =
    await Promise.all([
    prisma.cAPA.findMany({
      where: {
        companyId,
        status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] },
        dueDate: { not: null },
      },
      select: { id: true, title: true, referenceNo: true, dueDate: true, status: true },
      take: 50,
    }),
    prisma.qmsOperationalRecord.findMany({
      where: {
        companyId,
        status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] },
        dueDate: { not: null },
      },
      select: { id: true, title: true, module: true, dueDate: true },
      take: 50,
    }),
    prisma.qMSDocument.findMany({
      where: {
        companyId,
        deletedAt: null,
        reviewDueDate: { not: null },
        status: { in: ["APPROVED", "IN_REVIEW", "DRAFT"] },
      },
      select: { id: true, code: true, title: true, reviewDueDate: true, parentProcedureCode: true },
      take: 50,
    }),
    prisma.approvedSupplier.findMany({
      where: {
        companyId,
        reEvalDue: { not: null },
      },
      select: { id: true, name: true, reEvalDue: true },
      take: 30,
    }),
    prisma.internalAuditCycle.findMany({
      where: {
        companyId,
        status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] },
      },
      select: { id: true, year: true, title: true, status: true },
      take: 20,
    }),
    prisma.qmsOperationalRecord.findMany({
      where: {
        companyId,
        module: "TRAINING",
        status: { in: ["OPEN", "IN_PROGRESS", "OVERDUE"] },
        dueDate: { not: null },
      },
      select: { id: true, title: true, dueDate: true },
      take: 30,
    }),
    prisma.trainingCompetency.findMany({
      where: {
        companyId,
        status: "PENDING",
        nextDueAt: { not: null },
      },
      select: { id: true, procedureCode: true, roleLabel: true, nextDueAt: true },
      take: 30,
    }),
  ]);

  for (const c of capas) {
    if (!c.dueDate) continue;
    const overdue = c.dueDate < now;
    reminders.push({
      id: `capa:${c.id}`,
      kind: overdue ? "CAPA_OVERDUE" : "CAPA_DUE",
      title: c.referenceNo ? `${c.referenceNo} — ${c.title}` : c.title,
      dueDate: c.dueDate.toISOString().slice(0, 10),
      href: `/operational/capa/${c.id}`,
      priority: overdue ? "high" : daysUntil(c.dueDate) <= 7 ? "high" : "medium",
    });
  }

  for (const r of operational) {
    if (!r.dueDate) continue;
    const overdue = r.dueDate < now;
    const isVigilance = r.module === "VIGILANCE";
    const isCalibration = r.module === "CALIBRATION";
    let kind: EqmsReminderKind = "OPERATIONAL_DUE";
    if (isVigilance) kind = overdue ? "VIGILANCE_OVERDUE" : "VIGILANCE_DUE";
    else if (isCalibration && overdue) kind = "CALIBRATION_DUE";

    reminders.push({
      id: `op:${r.id}`,
      kind,
      title: r.title,
      dueDate: r.dueDate.toISOString().slice(0, 10),
      href: operationalHrefForKind(r.module, r.id),
      priority: overdue ? "high" : daysUntil(r.dueDate) <= 7 ? "medium" : "low",
    });
  }

  for (const d of docReviews) {
    if (!d.reviewDueDate) continue;
    const overdue = d.reviewDueDate < now;
    const proc =
      d.code?.startsWith("SOP-") ? d.code : d.parentProcedureCode ?? "SOP-DC";
    const docParam = d.code && !d.code.startsWith("SOP-") ? `?doc=${encodeURIComponent(d.code)}` : "";
    reminders.push({
      id: `doc:${d.id}`,
      kind: overdue ? "DOC_REVIEW_OVERDUE" : "DOC_REVIEW_DUE",
      title: d.code ? `${d.code} — ${d.title}` : d.title,
      dueDate: d.reviewDueDate.toISOString().slice(0, 10),
      href: `/qms/procedures/${encodeURIComponent(proc)}${docParam}`,
      priority: overdue ? "high" : daysUntil(d.reviewDueDate) <= 30 ? "medium" : "low",
    });
  }

  for (const s of suppliers) {
    if (!s.reEvalDue) continue;
    const overdue = s.reEvalDue < now;
    reminders.push({
      id: `sup:${s.id}`,
      kind: "SUPPLIER_REEVAL",
      title: s.name,
      dueDate: s.reEvalDue.toISOString().slice(0, 10),
      href: "/operational/suppliers",
      priority: overdue ? "high" : daysUntil(s.reEvalDue) <= 30 ? "medium" : "low",
    });
  }

  const currentYear = now.getFullYear();
  for (const cycle of auditCycles) {
    const due = new Date(cycle.year, 11, 31);
    const overdue = cycle.year < currentYear || (cycle.year === currentYear && due < now);
    reminders.push({
      id: `ia:${cycle.id}`,
      kind: "INTERNAL_AUDIT_OPEN",
      title: `${cycle.year} — ${cycle.title}`,
      dueDate: due.toISOString().slice(0, 10),
      href: "/operational/internal-audit",
      priority: overdue ? "high" : cycle.year < currentYear ? "high" : "medium",
    });
  }

  for (const tr of trainingRecords) {
    if (!tr.dueDate) continue;
    const overdue = tr.dueDate < now;
    reminders.push({
      id: `tr:${tr.id}`,
      kind: "TRAINING_DUE",
      title: tr.title,
      dueDate: tr.dueDate.toISOString().slice(0, 10),
      href: `/operational/training/${tr.id}`,
      priority: overdue ? "high" : daysUntil(tr.dueDate) <= 14 ? "medium" : "low",
    });
  }

  for (const c of competencies) {
    if (!c.nextDueAt) continue;
    const overdue = c.nextDueAt < now;
    reminders.push({
      id: `tc:${c.id}`,
      kind: "COMPETENCY_DUE",
      title: `${c.procedureCode} — ${c.roleLabel}`,
      dueDate: c.nextDueAt.toISOString().slice(0, 10),
      href: "/operational/training-matrix",
      priority: overdue ? "high" : daysUntil(c.nextDueAt) <= 14 ? "medium" : "low",
    });
  }

  const order = { high: 0, medium: 1, low: 2 };
  return reminders.sort((a, b) => order[a.priority] - order[b.priority]);
}
