import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { generateFmeaBenefitRisk } from "@/lib/products/generate-fmea-benefit-risk";

export const runtime = "nodejs";

// POST /api/products/[id]/risk-management/fmea-benefit-risk
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { locale?: string };
    const locale = body.locale === "tr" ? "tr" : "en";

    const result = await generateFmeaBenefitRisk(ctx.companyId, params.id, locale);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "risk_management.fmea_benefit_risk_generate",
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
    if (status === 500) console.error("[api/risk-management/fmea-benefit-risk POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
