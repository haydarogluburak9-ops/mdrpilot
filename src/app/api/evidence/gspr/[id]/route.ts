import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { unlinkEvidence } from "@/lib/files/evidence-service";

export const runtime = "nodejs";

// DELETE /api/evidence/gspr/[id] — remove a GSPR evidence link (min role CONSULTANT).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    await unlinkEvidence("gspr", { companyId: ctx.companyId, userId: ctx.user.id, linkId: params.id, ip: ipFromRequest(req) });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/evidence/gspr DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
