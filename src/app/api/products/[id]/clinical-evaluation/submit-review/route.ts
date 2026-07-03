import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { getClinicalEvaluation } from "@/lib/products/clinical-evaluation-service";
import { transitionClinicalEvaluation } from "@/lib/products/clinical-evaluation-workflow";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    await transitionClinicalEvaluation({
      companyId: ctx.companyId,
      productId: params.id,
      userId: ctx.user.id,
      userName: ctx.user.name ?? ctx.user.email,
      status: "IN_REVIEW",
      action: "clinical_evaluation.submit_review",
      canApprove: false,
      ip: ipFromRequest(req),
    });
    const evaluation = await getClinicalEvaluation(ctx.companyId, params.id);
    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/submit-review]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
