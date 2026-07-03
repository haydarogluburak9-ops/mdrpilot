import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { transitionComposer } from "@/lib/composer/workflow";

export const runtime = "nodejs";

// POST /api/composer/[id]/submit-review — move to IN_REVIEW (min Consultant).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const doc = await transitionComposer({ companyId: ctx.companyId, userId: ctx.user.id, id: params.id, status: "IN_REVIEW", action: "composer.submit_review", ip: ipFromRequest(req) });
    return NextResponse.json({ document: { id: doc.id, status: doc.status } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer submit-review]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
