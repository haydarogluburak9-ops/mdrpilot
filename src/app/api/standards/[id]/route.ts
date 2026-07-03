import { NextResponse } from "next/server";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError, NotFoundError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { getStandardDetail } from "@/lib/data/queries";
import { deleteStandard } from "@/lib/rag/standards-service";

export const runtime = "nodejs";

// GET /api/standards/[id] — standard detail with clauses (company-isolated).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const standard = await getStandardDetail(ctx.companyId, params.id);
    if (!standard) throw new NotFoundError();
    return NextResponse.json({ standard });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/standards/[id] GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/standards/[id] — remove a company-owned standard (CONSULTANT+).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    await deleteStandard(ctx.companyId, params.id, ctx.user.id, ipFromRequest(req));
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/standards/[id] DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
