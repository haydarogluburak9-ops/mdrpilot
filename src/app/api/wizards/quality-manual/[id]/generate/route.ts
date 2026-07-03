import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { generateWizardDocument } from "@/lib/wizards/quality-manual/service";

export const runtime = "nodejs";

// POST /api/wizards/quality-manual/[id]/generate — generate ComposerDocument (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = await req.json().catch(() => ({}));
    const language = body.language === "tr" ? "tr" : "en";
    const result = await generateWizardDocument({
      companyId: ctx.companyId, userId: ctx.user.id, id: params.id, language, ip: ipFromRequest(req),
    });
    return NextResponse.json({
      composerDocumentId: result.composerDocumentId,
      gap: result.gap,
      documentUrl: `/composer/${result.composerDocumentId}`,
    }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/[id]/generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
