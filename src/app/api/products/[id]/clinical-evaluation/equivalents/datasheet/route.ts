import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { uploadEquivalentDatasheetPdf } from "@/lib/products/equivalent-evidence";

export const runtime = "nodejs";

// POST multipart: deviceId, file (PDF)
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const form = await req.formData();
    const deviceId = String(form.get("deviceId") ?? "").trim();
    const file = form.get("file");
    if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const datasheet = await uploadEquivalentDatasheetPdf({
      companyId: ctx.companyId,
      productId: product.id,
      deviceId,
      buffer,
      mimeType: file.type || "application/pdf",
      fileName: file.name || "datasheet.pdf",
    });

    return NextResponse.json({ datasheet });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/equivalents/datasheet POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
