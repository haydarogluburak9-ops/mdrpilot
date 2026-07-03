import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { approveControlledDocument } from "@/lib/document-control/service";
import { approveDocumentReviewStep } from "@/lib/document-control/workflow";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const schema = z.object({
  sourceType: z.enum(["QMS", "TECHNICAL_FILE", "COMPOSER", "CLINICAL_EVAL"]),
  sourceId: z.string().min(1),
  stepOrder: z.number().int().min(1).max(3),
  intentText: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    let revisionNo = 0;
    if (parsed.data.sourceType === "QMS") {
      const doc = await prisma.qMSDocument.findFirst({
        where: { id: parsed.data.sourceId, companyId: ctx.companyId, deletedAt: null },
      });
      if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });
      revisionNo = doc.revisionNo;
    } else {
      return NextResponse.json({ error: "Use /api/document-control/approve for this source type" }, { status: 400 });
    }

    const stepResult = await approveDocumentReviewStep({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      userName: ctx.user.name ?? ctx.user.email,
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      revisionNo,
      stepOrder: parsed.data.stepOrder,
      intentText: parsed.data.intentText,
      ipAddress: ipFromRequest(req) ?? undefined,
    });

    if (stepResult.allApproved) {
      await approveControlledDocument({
        companyId: ctx.companyId,
        userId: ctx.user.id,
        userName: ctx.user.name ?? ctx.user.email,
        sourceType: parsed.data.sourceType,
        sourceId: parsed.data.sourceId,
        intentText: parsed.data.intentText,
        ipAddress: ipFromRequest(req) ?? undefined,
      });
    }

    await writeAuditLog({
      action: "document.approveStep",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: parsed.data.sourceType,
      entityId: parsed.data.sourceId,
      metadata: { stepOrder: parsed.data.stepOrder, allApproved: stepResult.allApproved },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true, allApproved: stepResult.allApproved, stepRole: stepResult.stepRole });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (message.startsWith("docControl.")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    const { status, message: msg } = statusForError(err);
    return NextResponse.json({ error: msg }, { status });
  }
}
