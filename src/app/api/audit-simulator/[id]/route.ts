import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { getAuditSessionDetail } from "@/lib/audit-sim/service";

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
