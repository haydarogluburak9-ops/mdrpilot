import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { generateOperationalQmsForm } from "@/lib/operational/operational-generate";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  userContext: z.string().max(8000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const complaint = await prisma.complaint.findFirst({
      where: { id: params.id, companyId: ctx.companyId },
    });
    if (!complaint) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const locale = parsed.data.locale ?? "tr";
    const hint =
      parsed.data.userContext?.trim() ||
      [complaint.title, complaint.complaintNo].filter(Boolean).join(" — ");

    const result = await generateOperationalQmsForm({
      companyId: ctx.companyId,
      formCode: "FORM-CH-01",
      sopCode: "SOP-CH",
      locale,
      generatedBy: ctx.user.name ?? ctx.user.email,
      userContext: hint,
      operationalLink: { module: "complaint", id: complaint.id },
    });

    await writeAuditLog({
      action: "complaint.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Complaint",
      entityId: complaint.id,
      metadata: { source: result.source, liveAiUsed: result.liveAiUsed },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/complaints generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
