import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { archiveAuditSession } from "@/lib/audit-sim/service";

export const runtime = "nodejs";

// POST /api/audit-simulator/[id]/archive — archive a session (QUALITY_MANAGER+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    await archiveAuditSession({ companyId: ctx.companyId, userId: ctx.user.id, sessionId: params.id, ip: ipFromRequest(req) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator/[id]/archive]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
