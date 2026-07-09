import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { generateClinicalEvaluationDraft } from "@/lib/products/clinical-evaluation-draft";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
});

// POST /api/products/[id]/clinical-evaluation/draft — rule-based CER sections from product + risk file.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const locale = parsed.data.locale ?? "tr";
    const draft = await generateClinicalEvaluationDraft(ctx.companyId, params.id, locale);
    if (!draft?.evaluation) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const { evaluation, aiSource } = draft;

    await writeAuditLog({
      action: "clinical_evaluation.draft",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: evaluation.id,
      metadata: { productId: params.id, locale, aiSource },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ evaluation, aiSource });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/draft POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
