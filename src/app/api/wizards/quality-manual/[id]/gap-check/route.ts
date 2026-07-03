import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { isAppLocale, type Lang } from "@/lib/i18n/locales";
import { gapCheckWizard } from "@/lib/wizards/quality-manual/service";

export const runtime = "nodejs";

// POST /api/wizards/quality-manual/[id]/gap-check — run gap check (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    let locale: Lang = "tr";
    try {
      const body = await req.json();
      if (body?.locale && isAppLocale(body.locale)) locale = body.locale;
    } catch {
      // empty body — default Turkish
    }
    const { gap } = await gapCheckWizard({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      id: params.id,
      locale,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ gap });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/[id]/gap-check]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
