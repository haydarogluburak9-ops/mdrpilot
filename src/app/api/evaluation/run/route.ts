import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { runEvaluation } from "@/lib/evaluation/runner";

export const runtime = "nodejs";
export const maxDuration = 300;

// POST /api/evaluation/run — run the full AI evaluation harness (QUALITY_MANAGER+).
// Body: { compare?: boolean, caseId?: string }
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const body = (await req.json().catch(() => ({}))) as { compare?: boolean; caseId?: string };

    const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true } });

    const report = await runEvaluation(ctx.companyId, company?.name ?? "Company", {
      compare: Boolean(body.compare),
      caseId: typeof body.caseId === "string" ? body.caseId : undefined,
    });

    await writeAuditLog({
      action: "evaluation.run",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "Evaluation",
      metadata: {
        compare: report.comparison,
        cases: report.caseCount,
        best: report.best?.provider,
        overall: report.best?.overallAiScore,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ report });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/evaluation/run]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
