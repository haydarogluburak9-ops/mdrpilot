import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { generateRiskDocument } from "@/lib/products/generate-risk-document";

export const runtime = "nodejs";

const bodySchema = z.object({
  kind: z.enum(["plan", "policy", "report"]),
  locale: z.enum(["tr", "en"]).optional(),
});

// POST /api/products/[id]/risk-management/generate — AI draft plan / policy / report
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const locale = parsed.data.locale ?? "tr";
    const result = await generateRiskDocument(ctx.companyId, params.id, parsed.data.kind, locale);
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "risk_management.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "RiskManagementFile",
      entityId: params.id,
      metadata: { kind: parsed.data.kind, source: result.source },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      kind: result.kind,
      content: result.content,
      source: result.source,
      model: result.model,
      missingInformation: result.missingInformation,
      liveAiUsed: result.liveAiUsed,
      aiFallbackReason: result.aiFallbackReason,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/risk-management/generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
