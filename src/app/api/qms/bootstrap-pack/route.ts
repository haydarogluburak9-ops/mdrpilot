import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { runBootstrapKysPack } from "@/lib/qms/bootstrap-kys-pack";

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  generateAi: z.boolean().optional(),
});

// POST /api/qms/bootstrap-pack — critical SOPs, children, IN_REVIEW, wizard enrich, coverage
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const result = await runBootstrapKysPack({
      companyId: ctx.companyId,
      generatedBy: ctx.user.name ?? ctx.user.email,
      locale: parsed.data.locale ?? "tr",
      generateAi: parsed.data.generateAi ?? true,
    });

    await writeAuditLog({
      action: "qms.bootstrap_pack",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      metadata: {
        coveragePercent: result.coveragePercent,
        inReviewCount: result.inReviewCount,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/bootstrap-pack]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
