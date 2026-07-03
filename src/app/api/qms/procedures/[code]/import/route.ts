import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { importQmsToProcedure } from "@/lib/qms/import-documents";
import { binaryContentLang, isAppLocale } from "@/lib/i18n/locales";

export const runtime = "nodejs";

const bodySchema = z.object({
  uploadedFileIds: z.array(z.string().min(1)).min(1).max(20),
  locale: z.string().optional(),
  overwrite: z.boolean().optional(),
  targetCode: z.string().max(64).optional(),
});

// POST /api/qms/procedures/[code]/import — controlled upload into this procedure folder
export async function POST(req: Request, { params }: { params: { code: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const localeRaw = parsed.data.locale;
    const locale =
      localeRaw && isAppLocale(localeRaw) ? binaryContentLang(localeRaw) : "tr";
    const procedureCode = decodeURIComponent(params.code).trim();
    const importedBy = ctx.user.name ?? ctx.user.email;

    const result = await importQmsToProcedure({
      companyId: ctx.companyId,
      procedureCode,
      fileIds: parsed.data.uploadedFileIds,
      importedBy,
      locale,
      overwrite: parsed.data.overwrite ?? false,
      targetCode: parsed.data.targetCode,
    });

    await writeAuditLog({
      action: "qms.procedure.import",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "QMSDocument",
      metadata: {
        procedureCode,
        targetCode: parsed.data.targetCode ?? null,
        imported: result.imported,
        skipped: result.skipped,
        unmatched: result.unmatched,
        failed: result.failed,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json(result);
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/qms/procedures/import]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
