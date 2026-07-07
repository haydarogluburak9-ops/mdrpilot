import { NextResponse } from "next/server";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { deleteAuditSession, getAuditSessionDetail } from "@/lib/audit-sim/service";

export const runtime = "nodejs";

// GET /api/audit-simulator/[id] — session detail (company-scoped, 404 on cross-company).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const session = await getAuditSessionDetail(ctx.companyId, params.id);
    return NextResponse.json({ session });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator/[id] GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/audit-simulator/[id] — permanently remove a session (QUALITY_MANAGER+).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    await deleteAuditSession({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      sessionId: params.id,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator/[id] DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
