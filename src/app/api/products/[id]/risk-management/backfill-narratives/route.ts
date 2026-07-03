import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { backfillRiskItemNarratives } from "@/lib/products/risk-service";

export const runtime = "nodejs";

// POST /api/products/[id]/risk-management/backfill-narratives
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { locale?: string; overwrite?: boolean };
    const locale = body.locale === "en" ? "en" : "tr";

    const updated = await backfillRiskItemNarratives(
      ctx.companyId,
      params.id,
      locale,
      body.overwrite ?? false,
    );

    await writeAuditLog({
      action: "risk_management.backfill_narratives",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskItem",
      entityId: params.id,
      metadata: { productId: params.id, updated },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ updated });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/risk-management/backfill-narratives POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
