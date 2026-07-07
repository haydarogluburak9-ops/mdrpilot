import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { resetLiteratureSearch } from "@/lib/products/clinical-literature-service";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
});

// POST — clear literature search results and restore initial PICO from product profile
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

    const evaluation = await resetLiteratureSearch(
      ctx.companyId,
      params.id,
      parsed.data.locale ?? "tr",
    );
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "clinical_evaluation.literature.reset",
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
    if (status === 500) console.error("[api/clinical-evaluation/literature/reset POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
