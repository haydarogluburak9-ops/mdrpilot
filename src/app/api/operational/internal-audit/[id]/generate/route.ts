import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { generateInternalAuditDoc } from "@/lib/operational/internal-audit-generate";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  kind: z.enum(["plan", "checklist", "report"]),
  locale: z.enum(["tr", "en"]).optional(),
  userContext: z.string().max(8000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const locale = parsed.data.locale ?? "tr";
    const result = await generateInternalAuditDoc({
      companyId: ctx.companyId,
      cycleId: params.id,
      kind: parsed.data.kind,
      locale,
      generatedBy: ctx.user.name ?? ctx.user.email,
      userContext: parsed.data.userContext,
    });

    await writeAuditLog({
      action: "internal_audit.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "INTERNAL_AUDIT",
      entityId: params.id,
      metadata: {
        kind: parsed.data.kind,
        source: result.source,
        liveAiUsed: result.liveAiUsed,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/internal-audit generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
