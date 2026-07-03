import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { prisma } from "@/lib/db";
import { requireCompany } from "@/lib/auth/guards";
import { statusForError, NotFoundError } from "@/lib/auth/errors";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

// GET /api/files/[id]/download — auth + company isolation, then stream privately.
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const file = await prisma.uploadedFile.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!file || file.companyId !== ctx.companyId || !file.storageKey) throw new NotFoundError();

    const storage = getUploadsStorage();
    if (!(await storage.exists(file.storageKey))) {
      return NextResponse.json({ error: "File no longer available" }, { status: 410 });
    }

    await writeAuditLog({
      action: "file.download",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "UploadedFile",
      entityId: file.id,
      ip: ipFromRequest(req),
    });

    const webStream = Readable.toWeb(storage.createReadStream(file.storageKey)) as unknown as ReadableStream;
    return new NextResponse(webStream, {
      headers: {
        "Content-Type": file.mimeType || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${file.fileName}"`,
        "Content-Length": String(file.sizeBytes),
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/files/[id]/download]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
