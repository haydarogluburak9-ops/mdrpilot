import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { transitionComposer } from "@/lib/composer/workflow";

export const runtime = "nodejs";

// POST /api/composer/[id]/archive — archive (min Quality Manager).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const doc = await transitionComposer({ companyId: ctx.companyId, userId: ctx.user.id, id: params.id, status: "ARCHIVED", action: "composer.archive", ip: ipFromRequest(req) });
    return NextResponse.json({ document: { id: doc.id, status: doc.status } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer archive]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
