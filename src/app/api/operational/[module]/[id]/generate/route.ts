import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { getModuleDef } from "@/lib/operational/modules";
import { getOperationalRecord } from "@/lib/operational/record-service";
import { generateOperationalQmsForm } from "@/lib/operational/operational-generate";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  locale: z.enum(["tr", "en"]).optional(),
  userContext: z.string().max(8000).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { module: string; id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const def = getModuleDef(params.module);
    if (!def) return NextResponse.json({ error: "Invalid module" }, { status: 404 });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const record = await getOperationalRecord(ctx.companyId, params.id);
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const locale = parsed.data.locale ?? "tr";
    const hint = parsed.data.userContext?.trim() || record.title;

    const result = await generateOperationalQmsForm({
      companyId: ctx.companyId,
      formCode: record.formCode,
      sopCode: def.sopCode,
      locale,
      generatedBy: ctx.user.name ?? ctx.user.email,
      userContext: hint,
      operationalLink: { module: def.slug, id: record.id },
    });

    await writeAuditLog({
      action: "operational.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: def.kind,
      entityId: record.id,
      metadata: { source: result.source, liveAiUsed: result.liveAiUsed },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/operational generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
