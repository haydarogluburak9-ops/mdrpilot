import { NextResponse } from "next/server";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { listQualityManualWizards } from "@/lib/data/queries";
import { createWizardSession } from "@/lib/wizards/quality-manual/service";
import type { StandardMode } from "@/lib/wizards/quality-manual/steps";

export const runtime = "nodejs";

const MODES: StandardMode[] = ["ISO_9001", "ISO_13485", "BOTH"];

// GET /api/wizards/quality-manual — company session list.
export async function GET() {
  try {
    const ctx = await requireCompany();
    const sessions = await listQualityManualWizards(ctx.companyId);
    return NextResponse.json({ sessions });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/wizards/quality-manual — create a new session (CONSULTANT+).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = await req.json().catch(() => ({}));
    const mode = body.standardMode as StandardMode;
    if (!MODES.includes(mode)) {
      return NextResponse.json({ error: "Invalid standardMode" }, { status: 400 });
    }
    const session = await createWizardSession({
      companyId: ctx.companyId, userId: ctx.user.id, standardMode: mode, ip: ipFromRequest(req),
    });
    return NextResponse.json({ session: { id: session.id, status: session.status, standardMode: session.standardMode } }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
