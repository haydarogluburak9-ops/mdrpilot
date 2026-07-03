import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { createDemoExecutiveExport } from "@/lib/compliance/export";
import { coerceLanguage } from "@/lib/exports/i18n";
import type { ComplianceStandardScope } from "@/lib/compliance/types";

export const runtime = "nodejs";

// POST /api/executive/export — generate the Demo Executive Report PDF (CONSULTANT+).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { productId?: string; standard?: string; language?: string };
    const job = await createDemoExecutiveExport({
      companyId: ctx.companyId, userId: ctx.user.id,
      productId: body.productId ?? null, standard: (body.standard as ComplianceStandardScope) ?? "COMBINED",
      ip: ipFromRequest(req), language: coerceLanguage(body.language),
    });
    return NextResponse.json({ job: { id: job.id, status: job.status, fileName: job.fileName } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/executive/export]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
