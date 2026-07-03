import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireCompany, requireRole } from "@/lib/auth/guards";
import { statusForError, NotFoundError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";

export const runtime = "nodejs";

// GET /api/files/[id] — metadata + analysis (company-scoped).
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const file = await prisma.uploadedFile.findFirst({
      where: { id: params.id, deletedAt: null },
      include: { product: { select: { name: true } } },
    });
    if (!file || file.companyId !== ctx.companyId) throw new NotFoundError();

    return NextResponse.json({
      file: {
        id: file.id,
        fileName: file.fileName,
        documentKind: file.documentKind,
        mimeType: file.mimeType,
        extension: file.extension,
        sizeBytes: file.sizeBytes,
        checksumSha256: file.checksumSha256,
        analysisStatus: file.analysisStatus,
        analysisSummary: file.analysisSummary,
        analysisJson: file.analysisJson,
        productId: file.productId,
        productName: file.product?.name ?? null,
        createdAt: file.createdAt.toISOString(),
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/files/[id] GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/files/[id] — soft delete (Owner / Quality Manager).
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("QUALITY_MANAGER");
    const file = await prisma.uploadedFile.findFirst({ where: { id: params.id, deletedAt: null } });
    if (!file || file.companyId !== ctx.companyId) throw new NotFoundError();

    await prisma.uploadedFile.update({ where: { id: file.id }, data: { deletedAt: new Date() } });

    await writeAuditLog({
      action: "file.delete",
      userId: ctx.user.id,
      companyId: ctx.companyId,
      entity: "UploadedFile",
      entityId: file.id,
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/files/[id] DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
