import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { savePmcfSurveyResults } from "@/lib/products/pmcf-survey-service";

export const runtime = "nodejs";

const schema = z.object({
  results: z.string().max(120_000),
});

// PATCH /api/products/[id]/pmcf-survey/results
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const { sectionId } = await savePmcfSurveyResults(ctx.companyId, params.id, parsed.data.results);

    await writeAuditLog({
      action: "product.pmcf-survey.results",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "TechnicalFileSection",
      entityId: sectionId,
      metadata: { productId: params.id },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/pmcf-survey/results]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
