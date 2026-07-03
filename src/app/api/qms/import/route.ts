import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { importQmsFromUploadedFiles } from "@/lib/qms/import-documents";

export const runtime = "nodejs";

const bodySchema = z.object({
  uploadedFileIds: z.array(z.string().min(1)).min(1).max(40),
  locale: z.enum(["tr", "en"]).optional(),
  overwrite: z.boolean().optional(),
});

// POST /api/qms/import — map Word/PDF uploads to KYS codes and import content
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
    }

    const locale = parsed.data.locale ?? "tr";
    const importedBy = ctx.user.name ?? ctx.user.email;
    const result = await importQmsFromUploadedFiles({
      companyId: ctx.companyId,
      fileIds: parsed.data.uploadedFileIds,
      importedBy,
      locale,
      overwrite: parsed.data.overwrite ?? false,
    });

    await writeAuditLog({
      action: "qms.import",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "QMSDocument",
      metadata: {
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
    if (status === 500) console.error("[api/qms/import]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
