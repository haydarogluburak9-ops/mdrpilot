import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { collectEqmsReminders } from "@/lib/eqms/reminders";

export const runtime = "nodejs";

// GET /api/eqms/reminders — actionable CAPA, operational, document review, supplier items
export async function GET() {
  try {
    const ctx = await requireCompany();
    const reminders = await collectEqmsReminders(ctx.companyId);
    return NextResponse.json({ reminders, count: reminders.length });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
