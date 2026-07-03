import { NextResponse } from "next/server";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { listStandards } from "@/lib/data/queries";

export const runtime = "nodejs";

// GET /api/standards — company standards + public templates/regulations.
export async function GET() {
  try {
    const ctx = await requireCompany();
    const standards = await listStandards(ctx.companyId);
    return NextResponse.json({ standards });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/standards GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
