import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { autoFillRiskManagement } from "@/lib/products/risk-management-auto-fill";

export const runtime = "nodejs";

// POST /api/products/[id]/risk-management/auto-fill
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as {
      locale?: string;
      overwrite?: boolean;
      fillFmea?: boolean;
    };

    const result = await autoFillRiskManagement(params.id, ctx.companyId, {
      locale: body.locale,
      overwrite: body.overwrite,
      fillFmea: body.fillFmea ?? true,
    });

    await writeAuditLog({
      action: "risk_management.auto_fill",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskManagementFile",
      entityId: params.id,
      metadata: { productId: params.id, ...result },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id]/risk-management/auto-fill POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
