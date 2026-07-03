import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError, BadRequestError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { submitAuditAnswer } from "@/lib/audit-sim/service";

export const runtime = "nodejs";

// PATCH /api/audit-simulator/[id]/answer — record an answer (CONSULTANT+).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { questionId?: string; answerText?: string; evidenceFileIds?: string[] };
    if (!body.questionId) throw new BadRequestError("questionId is required");

    const answer = await submitAuditAnswer({
      companyId: ctx.companyId, userId: ctx.user.id, sessionId: params.id,
      questionId: body.questionId, answerText: body.answerText ?? "",
      evidenceFileIds: body.evidenceFileIds, ip: ipFromRequest(req),
    });
    return NextResponse.json({ answer: { id: answer.id, answerText: answer.answerText } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator/[id]/answer]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
