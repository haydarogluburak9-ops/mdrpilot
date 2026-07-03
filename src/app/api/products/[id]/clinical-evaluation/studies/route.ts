import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { saveClinicalStudies } from "@/lib/products/clinical-evaluation-service";

export const runtime = "nodejs";

const studySchema = z.object({
  id: z.string().max(64),
  registryId: z.string().max(64).optional(),
  source: z.string().max(500),
  design: z.string().max(300),
  n: z.string().max(50),
  outcomes: z.string().max(2000),
  deviceSpecific: z.boolean(),
  quality: z.enum(["HIGH", "MED", "LOW"]),
  notes: z.string().max(2000),
  cerComment: z.string().max(2000).optional(),
  evidenceUrl: z.string().max(500).optional(),
});

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  studies: z.array(studySchema).max(500),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const locale = parsed.data.locale ?? "tr";
    const evaluation = await saveClinicalStudies(
      ctx.companyId,
      params.id,
      parsed.data.studies,
      locale,
    );
    if (!evaluation) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await writeAuditLog({
      action: "clinical_evaluation.studies",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "ClinicalEvaluation",
      entityId: evaluation.id,
      metadata: { productId: params.id, count: parsed.data.studies.length },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ evaluation });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/studies POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
