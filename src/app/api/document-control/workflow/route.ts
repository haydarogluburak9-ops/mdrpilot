import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { getDocumentReviewSteps } from "@/lib/document-control/workflow";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const querySchema = z.object({
  sourceType: z.enum(["QMS", "TECHNICAL_FILE", "COMPOSER", "CLINICAL_EVAL"]),
  sourceId: z.string().min(1),
  revisionNo: z.coerce.number().int().min(0).optional(),
});

export async function GET(req: Request) {
  try {
    const ctx = await requireRole("VIEWER");
    const url = new URL(req.url);
    const parsed = querySchema.safeParse({
      sourceType: url.searchParams.get("sourceType"),
      sourceId: url.searchParams.get("sourceId"),
      revisionNo: url.searchParams.get("revisionNo") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid query" }, { status: 400 });
    }

    let revisionNo = parsed.data.revisionNo ?? 0;
    if (parsed.data.revisionNo === undefined && parsed.data.sourceType === "QMS") {
      const doc = await prisma.qMSDocument.findFirst({
        where: { id: parsed.data.sourceId, companyId: ctx.companyId, deletedAt: null },
        select: { revisionNo: true },
      });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      revisionNo = doc.revisionNo;
    }

    const steps = await getDocumentReviewSteps(
      ctx.companyId,
      parsed.data.sourceType,
      parsed.data.sourceId,
      revisionNo,
    );

    return NextResponse.json({
      revisionNo,
      steps: steps.map((s) => ({
        stepOrder: s.stepOrder,
        stepRole: s.stepRole,
        status: s.status,
        assignedRole: s.assignedRole,
        reviewerName: s.reviewerName,
        reviewedAt: s.reviewedAt?.toISOString() ?? null,
        intentText: s.intentText,
      })),
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
