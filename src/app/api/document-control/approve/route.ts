import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { approveControlledDocument } from "@/lib/document-control/service";

export const runtime = "nodejs";

const schema = z.object({
  sourceType: z.enum(["QMS", "TECHNICAL_FILE", "COMPOSER", "CLINICAL_EVAL"]),
  sourceId: z.string().min(1),
  intentText: z.string().min(10).max(2000),
});

export async function POST(req: Request) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const parsed = schema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const approval = await approveControlledDocument({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      userName: ctx.user.name ?? ctx.user.email,
      sourceType: parsed.data.sourceType,
      sourceId: parsed.data.sourceId,
      intentText: parsed.data.intentText,
      ipAddress: ipFromRequest(req) ?? undefined,
    });

    await writeAuditLog({
      action: "document.approve",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: parsed.data.sourceType,
      entityId: parsed.data.sourceId,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      approval: {
        id: approval.id,
        approvedAt: approval.approvedAt.toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error";
    if (message === "docControl.notInReview") {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    if (message === "Not found") {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    const { status, message: msg } = statusForError(err);
    if (status === 500) console.error("[api/document-control/approve POST]", err);
    return NextResponse.json({ error: msg }, { status });
  }
}
