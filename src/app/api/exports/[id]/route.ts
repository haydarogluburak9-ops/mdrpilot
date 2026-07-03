import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireRole } from "@/lib/auth/guards";
import { statusForError, NotFoundError } from "@/lib/auth/errors";
import { getStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

// DELETE /api/exports/[id] — Owner / Quality Manager only.
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");

    const job = await prisma.exportJob.findUnique({ where: { id: params.id } });
    if (!job || job.companyId !== ctx.companyId) throw new NotFoundError();

    if (job.fileKey) {
      await getStorage().delete(job.fileKey);
    }
    await prisma.exportJob.delete({ where: { id: job.id } });

    await writeAuditLog({
      action: "export.delete",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "ExportJob",
      entityId: job.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/exports DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
