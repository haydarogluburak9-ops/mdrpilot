import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { fillAnnexAQuestions } from "@/lib/products/risk-annex-a-fill";

export const runtime = "nodejs";

const bodySchema = z.object({
  locale: z.string().optional(),
  overwrite: z.boolean().optional(),
});

// POST /api/products/[id]/risk-management/annex-a-fill
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const result = await fillAnnexAQuestions(params.id, ctx.companyId, {
      locale: parsed.data.locale,
      overwrite: parsed.data.overwrite,
    });

    await writeAuditLog({
      action: "risk_management.annex_a_fill",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskManagementFile",
      entityId: params.id,
      metadata: { productId: params.id, source: result.source },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk-management/annex-a-fill POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
