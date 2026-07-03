import { NextResponse } from "next/server";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError, NotFoundError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { getQualityManualWizard } from "@/lib/data/queries";
import { updateWizardSession } from "@/lib/wizards/quality-manual/service";
import type { StandardMode } from "@/lib/wizards/quality-manual/steps";

export const runtime = "nodejs";

// GET /api/wizards/quality-manual/[id] — session detail (company-isolated).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const session = await getQualityManualWizard(ctx.companyId, params.id);
    if (!session) throw new NotFoundError();
    return NextResponse.json({ session });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/[id] GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// PATCH /api/wizards/quality-manual/[id] — update answers / current step (CONSULTANT+).
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = await req.json().catch(() => ({}));
    const session = await updateWizardSession({
      companyId: ctx.companyId, userId: ctx.user.id, id: params.id,
      answers: body.answers && typeof body.answers === "object" ? body.answers : undefined,
      currentStep: typeof body.currentStep === "number" ? body.currentStep : undefined,
      standardMode: body.standardMode as StandardMode | undefined,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ session: { id: session.id, currentStep: session.currentStep, status: session.status } });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/wizards/quality-manual/[id] PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
