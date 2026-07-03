import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import {
  getClinicalEvaluation,
  upsertClinicalEvaluation,
} from "@/lib/products/clinical-evaluation-service";

export const runtime = "nodejs";

/** CER markdown sections can grow large (registry tables, PRISMA, annex text). */
const SECTION_TEXT_MAX = 500_000;

const qpSchema = z.object({
  evaluatorName: z.string().max(200).optional(),
  qualifications: z.string().max(2000).optional(),
  cvSummary: z.string().max(10000).optional(),
  cvFileKey: z.string().max(500).optional(),
  cvFileName: z.string().max(500).optional(),
  coiDeclared: z.boolean().optional(),
  coiStatement: z.string().max(5000).optional(),
  coiFileKey: z.string().max(500).optional(),
  coiFileName: z.string().max(500).optional(),
});

const patchSchema = z.object({
  plan: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  stateOfTheArt: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  equivalentDevices: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  literatureStrategy: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  clinicalDataSummary: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  benefitRiskConclusion: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  pmsPmcfInputs: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  report: z.string().max(SECTION_TEXT_MAX).optional().nullable(),
  qpDocuments: qpSchema.optional().nullable(),
});

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("VIEWER");
    const evaluation = await getClinicalEvaluation(ctx.companyId, params.id);
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const evaluation = await upsertClinicalEvaluation(ctx.companyId, params.id, parsed.data);
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "clinical_evaluation.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: evaluation.id,
      metadata: { productId: params.id, fields: Object.keys(parsed.data) },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation PATCH]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
