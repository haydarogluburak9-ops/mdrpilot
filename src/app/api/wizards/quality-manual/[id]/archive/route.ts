import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { archiveWizard } from "@/lib/wizards/quality-manual/service";

export const runtime = "nodejs";

// POST /api/wizards/quality-manual/[id]/archive — archive session (QUALITY_MANAGER+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const session = await archiveWizard({ companyId: ctx.companyId, userId: ctx.user.id, id: params.id, ip: ipFromRequest(req) });
    return NextResponse.json({ session: { id: session.id, status: session.status } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/[id]/archive]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
