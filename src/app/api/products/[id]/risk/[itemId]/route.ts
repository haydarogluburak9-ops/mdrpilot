import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { updateRiskItem, deleteRiskItem } from "@/lib/products/risk-service";
import { riskItemBodySchema } from "@/lib/products/risk-api-schema";

export const runtime = "nodejs";

// PATCH /api/products/[id]/risk/[itemId] — update a risk item (CONSULTANT+).
export async function PATCH(
  req: Request,
  { params }: { params: { id: string; itemId: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = riskItemBodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const item = await updateRiskItem(ctx.companyId, params.id, params.itemId, parsed.data);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await writeAuditLog({
      action: "risk.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskItem",
      entityId: item.id,
      metadata: { productId: params.id, hazard: item.hazard },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ id: item.id });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk/[itemId] PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/products/[id]/risk/[itemId] — delete a risk item (CONSULTANT+).
export async function DELETE(
  req: Request,
  { params }: { params: { id: string; itemId: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const item = await deleteRiskItem(ctx.companyId, params.id, params.itemId);
    if (!item) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await writeAuditLog({
      action: "risk.delete",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskItem",
      entityId: item.id,
      metadata: { productId: params.id, hazard: item.hazard },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk/[itemId] DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
