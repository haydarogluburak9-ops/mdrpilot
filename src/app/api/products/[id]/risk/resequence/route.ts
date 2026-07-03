import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { forceResequenceProductRiskItems } from "@/lib/products/risk-service";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

// POST /api/products/[id]/risk/resequence — fix SIRA NO and category-based risk codes.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await forceResequenceProductRiskItems(params.id);

    await writeAuditLog({
      action: "risk.resequence",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Product",
      entityId: params.id,
      metadata: { productId: params.id },
      ip: ipFromRequest(req),
    });

    const count = await prisma.riskItem.count({ where: { productId: params.id } });
    return NextResponse.json({ ok: true, count });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk/resequence POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
