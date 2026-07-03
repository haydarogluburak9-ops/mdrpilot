import { NextResponse } from "next/server";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError, BadRequestError } from "@/lib/auth/errors";
import { ipFromRequest } from "@/lib/audit";
import { createAuditSession, listAuditSessions } from "@/lib/audit-sim/service";
import { ASSESSMENT_COUNT, type AssessmentType, type AuditStandardScope } from "@/lib/audit-sim/types";

export const runtime = "nodejs";

const SCOPES: AuditStandardScope[] = ["MDR", "ISO_13485", "ISO_9001", "ISO_14971", "COMBINED"];

// GET /api/audit-simulator — list audit sessions (company-scoped).
export async function GET() {
  try {
    const ctx = await requireCompany();
    const sessions = await listAuditSessions(ctx.companyId);
    return NextResponse.json({ sessions });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/audit-simulator — start a new audit session (CONSULTANT+; Viewer 403).
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = (await req.json().catch(() => ({}))) as { productId?: string; standard?: string; assessmentType?: string };

    const standard = (body.standard ?? "ISO_13485") as AuditStandardScope;
    const assessmentType = (body.assessmentType ?? "STANDARD") as AssessmentType;
    if (!SCOPES.includes(standard)) throw new BadRequestError("Invalid standard");
    if (!(assessmentType in ASSESSMENT_COUNT)) throw new BadRequestError("Invalid assessment type");

    const session = await createAuditSession({
      companyId: ctx.companyId, userId: ctx.user.id, productId: body.productId ?? null,
      standard, assessmentType, ip: ipFromRequest(req),
    });
    return NextResponse.json({ session });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/audit-simulator POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
