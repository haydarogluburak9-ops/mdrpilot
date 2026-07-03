import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { generatePreparedClinicalFindings } from "@/lib/products/clinical-findings-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  merge: z.boolean().optional(),
});

// POST — rule-based clinical findings per selected registries + literature.
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
    const evaluation = await generatePreparedClinicalFindings(
      ctx.companyId,
      params.id,
      locale,
      { merge: parsed.data.merge ?? false },
    );
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "clinical_evaluation.findings_generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: evaluation.id,
      metadata: {
        productId: params.id,
        count: evaluation.clinicalStudies?.length ?? 0,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/studies/generate POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
