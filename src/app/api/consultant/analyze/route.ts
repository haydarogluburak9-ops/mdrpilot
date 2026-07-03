import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError, BadRequestError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { runConsultantAnalysis } from "@/lib/compliance/engine";
import { aiProviderInfo } from "@/lib/ai/provider-factory";
import type { ComplianceStandardScope } from "@/lib/compliance/types";

export const runtime = "nodejs";

const SCOPES: ComplianceStandardScope[] = ["MDR", "ISO_13485", "ISO_14971", "ISO_9001", "COMBINED"];

// POST /api/consultant/analyze — run a compliance gap assessment (CONSULTANT+; Viewer 403).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { productId?: string; standard?: string };

    const standard = (body.standard ?? "COMBINED") as ComplianceStandardScope;
    if (!SCOPES.includes(standard)) throw new BadRequestError("Invalid standard");

    const result = await runConsultantAnalysis(ctx.companyId, standard, body.productId ?? null);

    const ai = aiProviderInfo();
    await writeAuditLog({
      action: "consultant.analyze",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "Product",
      entityId: body.productId ?? undefined,
      metadata: { standard, overallScore: result.overallScore, gaps: result.gaps.length, provider: ai.provider, model: ai.model },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ result });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/consultant/analyze]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
