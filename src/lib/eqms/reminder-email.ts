import "server-only";
import { sendEmail } from "@/lib/email/send";
import { collectEqmsReminders, type EqmsReminder } from "@/lib/eqms/reminders";

function reminderLabel(kind: EqmsReminder["kind"]): string {
  const map: Record<EqmsReminder["kind"], string> = {
    CAPA_DUE: "CAPA due",
    CAPA_OVERDUE: "CAPA overdue",
    OPERATIONAL_DUE: "Operational record due",
    DOC_REVIEW_DUE: "Document review due",
    DOC_REVIEW_OVERDUE: "Document review overdue",
    SUPPLIER_REEVAL: "Supplier re-evaluation",
    INTERNAL_AUDIT_OPEN: "Internal audit cycle",
    TRAINING_DUE: "Training due",
    VIGILANCE_DUE: "Vigilance deadline",
    VIGILANCE_OVERDUE: "Vigilance overdue",
    CALIBRATION_DUE: "Calibration due",
    COMPETENCY_DUE: "Training competency due",
  };
  return map[kind] ?? "Action due";
}

export async function sendEqmsReminderDigest(params: {
  to: string;
  companyName: string;
  reminders: EqmsReminder[];
  appName: string;
}): Promise<{ ok: boolean }> {
  const top = params.reminders.slice(0, 15);
  if (top.length === 0) {
    return sendEmail({
      to: params.to,
      subject: `${params.appName} — eQMS reminders`,
      html: `<p>No overdue eQMS items for <strong>${params.companyName}</strong>.</p>`,
      text: `No overdue eQMS items for ${params.companyName}.`,
    }).then((r) => ({ ok: r.ok }));
  }

  const rows = top
    .map(
      (r) =>
        `<li><strong>${reminderLabel(r.kind)}</strong>: ${r.title}${
          r.dueDate ? ` — due ${r.dueDate}` : ""
        }</li>`,
    )
    .join("");

  const html = `
    <p>eQMS action items for <strong>${params.companyName}</strong>:</p>
    <ul>${rows}</ul>
    <p style="margin-top:16px;font-size:12px;color:#666">Open the app dashboard to review and dismiss items.</p>
  `;

  const text = top
    .map((r) => `- ${reminderLabel(r.kind)}: ${r.title}${r.dueDate ? ` (${r.dueDate})` : ""}`)
    .join("\n");

  const result = await sendEmail({
    to: params.to,
    subject: `${params.appName} — ${top.length} eQMS reminder(s)`,
    html,
    text: `eQMS reminders for ${params.companyName}:\n${text}`,
  });
  return { ok: result.ok };
}
