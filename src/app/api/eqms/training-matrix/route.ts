import { NextResponse } from "next/server";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import {
  completeTrainingCompetency,
  listTrainingCompetencies,
} from "@/lib/eqms/training-matrix";

export const runtime = "nodejs";

export async function GET() {
  try {
    const ctx = await requireCompany();
    const rows = await listTrainingCompetencies(ctx.companyId);
    return NextResponse.json({
      competencies: rows.map((r) => ({
        id: r.id,
        procedureCode: r.procedureCode,
        roleLabel: r.roleLabel,
        personName: r.personName,
        department: r.department,
        required: r.required,
        lastTrainedAt: r.lastTrainedAt?.toISOString() ?? null,
        nextDueAt: r.nextDueAt?.toISOString() ?? null,
        status: r.status,
      })),
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => null)) as {
      id?: string;
      personName?: string;
      trainingRecordId?: string;
    };
    if (!body?.id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const updated = await completeTrainingCompetency({
      companyId: ctx.companyId,
      id: body.id,
      personName: body.personName,
      trainingRecordId: body.trainingRecordId,
    });

    return NextResponse.json({ ok: true, competency: updated });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
