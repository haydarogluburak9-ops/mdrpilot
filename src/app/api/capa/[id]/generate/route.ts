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

    const capa = await prisma.cAPA.findFirst({ where: { id: params.id, companyId: ctx.companyId } });
    if (!capa) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const locale = parsed.data.locale ?? "tr";
    const hint = parsed.data.userContext?.trim() || capa.title;

    const result = await generateOperationalQmsForm({
      companyId: ctx.companyId,
      formCode: "FORM-CAPA-01",
      sopCode: "SOP-CAPA",
      locale,
      generatedBy: ctx.user.name ?? ctx.user.email,
      userContext: hint,
      operationalLink: { module: "capa", id: capa.id },
    });

    await writeAuditLog({
      action: "capa.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "CAPA",
      entityId: capa.id,
      metadata: { source: result.source, liveAiUsed: result.liveAiUsed },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/capa generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
