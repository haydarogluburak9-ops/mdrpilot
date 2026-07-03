import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { createComposerRevision } from "@/lib/composer/service";

export const runtime = "nodejs";

// POST /api/composer/[id]/new-revision — clone into a new DRAFT (min Consultant).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const doc = await createComposerRevision({ companyId: ctx.companyId, userId: ctx.user.id, id: params.id, ip: ipFromRequest(req) });
    return NextResponse.json({ document: { id: doc.id, title: doc.title, status: doc.status, version: doc.version } }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/composer new-revision]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
