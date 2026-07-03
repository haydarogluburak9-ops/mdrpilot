import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { createCustomProcedure } from "@/lib/qms/create-custom-procedure";
import { appLocaleSchema } from "@/lib/i18n/api-locale";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  title: z.string().min(1).max(500),
  userContext: z.string().min(10).max(8000),
  locale: appLocaleSchema.optional(),
  standard: z.string().max(64).optional(),
  clauseRefs: z.string().max(200).optional(),
  generate: z.boolean().optional(),
});

// POST /api/qms/procedures/create — custom SOP from prompt
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const result = await createCustomProcedure({
      companyId: ctx.companyId,
      title: parsed.data.title,
      userContext: parsed.data.userContext,
      locale: parsed.data.locale ?? "tr",
      standard: parsed.data.standard,
      clauseRefs: parsed.data.clauseRefs,
      generatedBy: ctx.user.name ?? ctx.user.email,
      generate: parsed.data.generate,
    });

    await writeAuditLog({
      action: "qms.procedure.create_custom",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "QMSDocument",
      entityId: result.documentId,
      metadata: { code: result.code },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/procedures/create]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
