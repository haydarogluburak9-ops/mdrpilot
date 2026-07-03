import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { bulkCreateRiskItems } from "@/lib/products/risk-service";
import { riskItemBodySchema } from "@/lib/products/risk-api-schema";

export const runtime = "nodejs";

const schema = z.object({
  items: z.array(riskItemBodySchema).min(1).max(50),
});

// POST /api/products/[id]/risk/bulk — create multiple risk items (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const created = await bulkCreateRiskItems(ctx.companyId, params.id, parsed.data.items);
    if (!created) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await writeAuditLog({
      action: "risk.bulk_create",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskItem",
      entityId: params.id,
      metadata: { productId: params.id, count: created.length },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ids: created.map((c) => c.id), count: created.length }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk/bulk POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
