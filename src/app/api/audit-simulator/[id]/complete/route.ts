import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { completeAuditSession } from "@/lib/audit-sim/service";

export const runtime = "nodejs";

// POST /api/audit-simulator/[id]/complete — evaluate answers, produce findings & score (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const result = await completeAuditSession({ companyId: ctx.companyId, userId: ctx.user.id, sessionId: params.id, ip: ipFromRequest(req) });
    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator/[id]/complete]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
