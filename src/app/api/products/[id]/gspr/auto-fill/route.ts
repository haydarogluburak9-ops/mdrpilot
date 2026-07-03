import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { autoFillGspr } from "@/lib/products/gspr-auto-fill";

export const runtime = "nodejs";

// POST /api/products/[id]/gspr/auto-fill — fill standards + link evidence from files.
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { _locale?: string };
    const locale = body._locale === "en" ? "en" : "tr";
    const result = await autoFillGspr(params.id, ctx.companyId, ctx.user.id, locale);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/gspr/auto-fill POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
