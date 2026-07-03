import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { collectEqmsReminders } from "@/lib/eqms/reminders";
import { sendEqmsReminderDigest } from "@/lib/eqms/reminder-email";

export const runtime = "nodejs";

// POST /api/eqms/reminders/email — email digest to current user (QUALITY_MANAGER+)
export async function POST() {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const reminders = await collectEqmsReminders(ctx.companyId);
    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { name: true },
    });

    const result = await sendEqmsReminderDigest({
      to: ctx.user.email,
      companyName: company?.name ?? "Company",
      reminders,
      appName: env.appName,
    });

    return NextResponse.json({ ok: result.ok, count: reminders.length });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
