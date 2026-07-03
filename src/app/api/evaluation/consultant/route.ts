import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { loadGoldenCases } from "@/lib/evaluation/datasets";
import { evaluateCase } from "@/lib/evaluation/evaluator";
import { aiProviderInfo } from "@/lib/ai/provider-factory";
import { mean } from "@/lib/evaluation/metrics";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * POST /api/evaluation/consultant — Consultant benchmark only.
 * Runs the Compliance Consultant against every golden case and compares the
 * detected gaps with the expected gaps to produce Precision / Recall / F1.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const company = await prisma.company.findUnique({ where: { id: ctx.companyId }, select: { name: true } });
    const info = aiProviderInfo();

    const cases = loadGoldenCases();
    const perCase = [];
    for (const c of cases) {
      const r = await evaluateCase(c, { companyId: ctx.companyId, companyName: company?.name ?? "Company" });
      perCase.push({
        caseId: c.id,
        title: c.title,
        precision: r.consultant.precision,
        recall: r.consultant.recall,
        f1: r.consultant.f1,
        matched: r.consultant.matched,
        missed: r.consultant.missed,
        falseAlarms: r.consultant.falseAlarms,
        predictedGaps: r.consultant.predictedGaps,
      });
    }

    const summary = {
      provider: info.provider,
      model: info.model,
      precision: Math.round(mean(perCase.map((p) => p.precision))),
      recall: Math.round(mean(perCase.map((p) => p.recall))),
      f1: Math.round(mean(perCase.map((p) => p.f1))),
      totalMissed: perCase.reduce((a, p) => a + p.missed.length, 0),
      totalFalseAlarms: perCase.reduce((a, p) => a + p.falseAlarms.length, 0),
      totalMatched: perCase.reduce((a, p) => a + p.matched.length, 0),
    };

    await writeAuditLog({
      action: "evaluation.consultant",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "Evaluation",
      metadata: { provider: info.provider, model: info.model, f1: summary.f1, cases: cases.length },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ summary, perCase });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/evaluation/consultant]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
