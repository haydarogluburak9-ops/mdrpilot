import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { createRiskItem } from "@/lib/products/risk-service";
import { riskItemBodySchema } from "@/lib/products/risk-api-schema";

export const runtime = "nodejs";

// POST /api/products/[id]/risk — create a risk item (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = riskItemBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const item = await createRiskItem(ctx.companyId, params.id, parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await writeAuditLog({
      action: "risk.create",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskItem",
      entityId: item.id,
      metadata: { productId: params.id, hazard: item.hazard },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ id: item.id }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
