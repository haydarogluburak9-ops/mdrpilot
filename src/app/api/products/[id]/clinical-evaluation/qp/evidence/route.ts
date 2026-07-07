import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import {
  assertQpEvidenceKeyOwned,
  readQpEvidenceBuffer,
  uploadQpEvidenceFile,
  type QpEvidenceKind,
} from "@/lib/products/clinical-qp-evidence";

export const runtime = "nodejs";

// POST multipart: kind=cv|coi, file
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const form = await req.formData();
    const kind = String(form.get("kind") ?? "").trim() as QpEvidenceKind;
    const file = form.get("file");
    if (kind !== "cv" && kind !== "coi") {
      return NextResponse.json({ error: "kind must be cv or coi" }, { status: 400 });
    }
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploaded = await uploadQpEvidenceFile({
      companyId: ctx.companyId,
      productId: product.id,
      kind,
      buffer,
      mimeType: file.type || "application/pdf",
      fileName: file.name || `${kind}.pdf`,
    });

    return NextResponse.json({ file: uploaded, kind });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/qp/evidence POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("VIEWER");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const key = new URL(req.url).searchParams.get("key") ?? "";
    if (!key) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    assertQpEvidenceKeyOwned(key, ctx.companyId, product.id);
    const buffer = await readQpEvidenceBuffer(key);
    if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mime = key.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/pdf";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
