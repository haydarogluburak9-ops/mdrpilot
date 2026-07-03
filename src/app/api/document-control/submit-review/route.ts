import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { initDocumentReviewWorkflow } from "@/lib/document-control/workflow";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  sourceType: z.enum(["QMS", "TECHNICAL_FILE", "COMPOSER", "CLINICAL_EVAL"]),
  sourceId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    let revisionNo = 0;
    if (parsed.data.sourceType === "QMS") {
      const doc = await prisma.qMSDocument.findFirst({
        where: { id: parsed.data.sourceId, companyId: ctx.companyId, deletedAt: null },
      });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      revisionNo = doc.revisionNo;

      if (doc.status === "DRAFT") {
        await prisma.qMSDocument.update({
          where: { id: doc.id },
          data: { status: "IN_REVIEW" },
        });
      } else if (doc.status !== "IN_REVIEW") {
        return NextResponse.json({ error: "docControl.notInReview" }, { status: 400 });
      }

      const existing = await prisma.documentReviewStep.count({
        where: {
          companyId: ctx.companyId,
          sourceType: parsed.data.sourceType,
          sourceId: parsed.data.sourceId,
          revisionNo,
        },
      });
      if (existing > 0) {
        return NextResponse.json({ error: "docControl.workflowExists" }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Multi-step workflow for this source type: set IN_REVIEW first" }, { status: 400 });
    }

    await initDocumentReviewWorkflow({
      companyId: ctx.companyId,
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      revisionNo,
    });

    await writeAuditLog({
      action: "document.submitReview",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: parsed.data.sourceType,
      entityId: parsed.data.sourceId,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, revisionNo });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
