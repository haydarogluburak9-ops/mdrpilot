import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { getClinicalEvaluation } from "@/lib/products/clinical-evaluation-service";
import { transitionClinicalEvaluation } from "@/lib/products/clinical-evaluation-workflow";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    await transitionClinicalEvaluation({
      companyId: ctx.companyId,
      productId: params.id,
      userId: ctx.user.id,
      userName: ctx.user.name ?? ctx.user.email,
      status: "REJECTED",
      action: "clinical_evaluation.reject",
      canApprove: true,
      ip: ipFromRequest(req),
    });
    const evaluation = await getClinicalEvaluation(ctx.companyId, params.id);
    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/reject]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
