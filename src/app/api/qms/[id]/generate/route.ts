import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { generateProcedureChild } from "@/lib/qms/procedure-document-service";
import { appLocaleSchema, parseAppLocale } from "@/lib/i18n/api-locale";
import type { OperationalLinkModule } from "@/lib/operational/modules";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  locale: appLocaleSchema.optional(),
  userContext: z.string().max(8000).optional(),
  operationalLink: z
    .object({
      module: z.string().min(1),
      id: z.string().min(1),
    })
    .optional(),
});

// POST /api/qms/[id]/generate — AI draft (optional user context for child docs)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const locale = parseAppLocale(parsed.data.locale);
    const generatedBy = ctx.user.name ?? ctx.user.email;

    const operationalLink = parsed.data.operationalLink as
      | { module: OperationalLinkModule; id: string }
      | undefined;

    const result = parsed.data.userContext?.trim()
      ? await generateProcedureChild({
          companyId: ctx.companyId,
          documentId: params.id,
          locale,
          generatedBy,
          userContext: parsed.data.userContext,
          operationalLink,
        })
      : await (async () => {
          const { generateQmsDocument } = await import("@/lib/qms/generate-document");
          return generateQmsDocument(
            ctx.companyId,
            params.id,
            locale,
            generatedBy,
            undefined,
            undefined,
            operationalLink,
          );
        })();

    await writeAuditLog({
      action: "qms.generate",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "QMSDocument",
      entityId: params.id,
      metadata: { source: result.source, model: result.model, liveAiUsed: result.liveAiUsed },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/generate]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
