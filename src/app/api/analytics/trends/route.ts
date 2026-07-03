import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { collectQualityTrendMetrics } from "@/lib/analytics/trend-metrics";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireCompany();
    const metrics = await collectQualityTrendMetrics(ctx.companyId);
    return NextResponse.json({ metrics });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
