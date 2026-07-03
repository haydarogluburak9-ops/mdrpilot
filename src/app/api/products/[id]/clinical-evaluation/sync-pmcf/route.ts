import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { syncPmcfInputsToClinical } from "@/lib/products/clinical-evaluation-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
});

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
    const evaluation = await syncPmcfInputsToClinical(ctx.companyId, params.id, locale);
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "clinical_evaluation.sync_pmcf",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: evaluation.id,
      metadata: { productId: params.id },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/sync-pmcf POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
