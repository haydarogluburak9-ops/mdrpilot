import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { applyKysScopeFromWizard } from "@/lib/wizards/quality-manual/service";

export const runtime = "nodejs";

// POST /api/wizards/quality-manual/[id]/apply-kys-scope — generate scope-relevant KYS procedures
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    let locale: "tr" | "en" = "tr";
    try {
      const body = await req.json();
      if (body?.locale === "en") locale = "en";
    } catch {
      // default Turkish
    }
    const { apply, gap } = await applyKysScopeFromWizard({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      id: params.id,
      locale,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ apply, gap });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/[id]/apply-kys-scope]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
