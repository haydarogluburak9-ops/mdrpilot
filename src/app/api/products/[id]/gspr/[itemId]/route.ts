import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError, BadRequestError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { writeAuditLog } from "@/lib/audit";
import { ipFromRequest } from "@/lib/audit";
import { recomputeGsprStatus, setGsprStatus } from "@/lib/products/gspr-status-sync";
import { hasRole } from "@/lib/auth/guards";
import type { DocStatus } from "@/lib/domain/types";

export const runtime = "nodejs";

const patchSchema = z.object({
  justification: z.string().max(8000).optional(),
  evidenceDocument: z.string().max(2000).optional(),
  status: z.enum(["MISSING", "DRAFT", "IN_REVIEW", "APPROVED"]).optional(),
});

// PATCH /api/products/[id]/gspr/[itemId] — update GSPR justification or evidence hint (CONSULTANT+).
export async function PATCH(req: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = patchSchema.parse(await req.json().catch(() => ({})));

    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
      select: { id: true, name: true },
    });
    if (!product) return NextResponse.json({ error: "gspr.api.err.productNotFound" }, { status: 404 });

    const item = await prisma.gSPRItem.findFirst({
      where: { id: params.itemId, productId: product.id },
      select: { id: true, gsprNo: true, justification: true, evidenceDocument: true, status: true },
    });
    if (!item) return NextResponse.json({ error: "gspr.api.err.itemNotFound" }, { status: 404 });

    if (
      body.justification === undefined &&
      body.evidenceDocument === undefined &&
      body.status === undefined
    ) {
      throw new BadRequestError("gspr.api.err.bodyRequired");
    }

    const data: { justification?: string | null; evidenceDocument?: string | null; evidenceManual?: boolean } = {};
    if (body.justification !== undefined) data.justification = body.justification.trim() || null;
    if (body.evidenceDocument !== undefined) {
      const trimmed = body.evidenceDocument.trim();
      data.evidenceDocument = trimmed || null;
      data.evidenceManual = !!trimmed;
    }

    if (Object.keys(data).length) {
      await prisma.gSPRItem.update({ where: { id: item.id }, data });
      await recomputeGsprStatus(item.id);
    }

    if (body.status !== undefined) {
      await setGsprStatus(item.id, body.status as DocStatus, {
        allowApprove: hasRole(ctx.role, "QUALITY_MANAGER"),
      });
    }

    const updated = await prisma.gSPRItem.findUnique({
      where: { id: item.id },
      select: { id: true, justification: true, evidenceDocument: true, evidenceManual: true, status: true },
    });

    const action =
      body.status !== undefined
        ? "gspr.status.update"
        : body.evidenceDocument !== undefined
          ? "gspr.evidence.update"
          : "gspr.justification.update";

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      action,
      entity: "GSPRItem",
      entityId: item.id,
      metadata: { productId: product.id, gsprNo: item.gsprNo, status: updated?.status },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/gspr/[itemId] PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
