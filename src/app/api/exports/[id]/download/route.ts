import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError, NotFoundError } from "@/lib/auth/errors";
import { getStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { FORMAT_MIME } from "@/lib/exports/types";

export const runtime = "nodejs";

// GET /api/exports/[id]/download — auth + company isolation, then stream the file.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();

    const job = await prisma.exportJob.findUnique({ where: { id: params.id } });
    // Hide other companies' exports as 404 (no existence leak).
    if (!job || job.companyId !== ctx.companyId) throw new NotFoundError();

    if (job.status !== "COMPLETED" || !job.fileKey) {
      return NextResponse.json({ error: `Export is ${job.status.toLowerCase()}` }, { status: 409 });
    }

    const storage = getStorage();
    if (!(await storage.exists(job.fileKey))) {
      return NextResponse.json({ error: "Export file no longer available" }, { status: 410 });
    }

    await writeAuditLog({
      action: "export.download",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "ExportJob",
      entityId: job.id,
      ip: ipFromRequest(req),
    });

    const nodeStream = storage.createReadStream(job.fileKey);
    const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream;
    const fileName = job.fileName ?? `export-${job.id}`;

    return new NextResponse(webStream, {
      headers: {
        "Content-Type": FORMAT_MIME[job.format],
        "Content-Disposition": `attachment; filename="${fileName}"`,
        ...(job.sizeBytes ? { "Content-Length": String(job.sizeBytes) } : {}),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/exports download]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
