import { NextResponse } from "next/server";
import { z } from "zod";
import { requireCompany, hasRole } from "@/lib/auth/guards";
import { statusForError, BadRequestError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { writeAuditLog } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { bulkSetGsprStatus } from "@/lib/products/gspr-status-sync";

export const runtime = "nodejs";

const bodySchema = z.object({
  status: z.enum(["IN_REVIEW", "APPROVED"]),
});

// POST /api/products/[id]/gspr/bulk-status — submit for review or approve eligible rows.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    if (!hasRole(ctx.role, "CONSULTANT")) {
      throw new BadRequestError("gspr.api.err.consultantRole");
    }

    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "gspr.api.err.productNotFound" }, { status: 404 });

    const body = bodySchema.parse(await req.json().catch(() => ({})));
    const allowApprove = hasRole(ctx.role, "QUALITY_MANAGER");

    const result = await bulkSetGsprStatus(product.id, body.status, { allowApprove });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      action: body.status === "APPROVED" ? "gspr.bulk.approve" : "gspr.bulk.review",
      entity: "Product",
      entityId: product.id,
      metadata: { ...result },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/gspr/bulk-status POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
