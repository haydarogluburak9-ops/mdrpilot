import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import {
  assertEvidenceKeyOwned,
  readEquivalentEvidenceBuffer,
  uploadEquivalentEvidenceScreenshot,
} from "@/lib/products/equivalent-evidence";

export const runtime = "nodejs";

// POST multipart: deviceId, file, optional caption
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
    const caption = String(form.get("caption") ?? "").trim();
    const file = form.get("file");
    if (!deviceId) return NextResponse.json({ error: "deviceId required" }, { status: 400 });
    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const screenshot = await uploadEquivalentEvidenceScreenshot({
      companyId: ctx.companyId,
      productId: product.id,
      deviceId,
      buffer,
      mimeType: file.type || "image/png",
      fileName: file.name || "evidence.png",
      caption: caption || undefined,
    });

    return NextResponse.json({ screenshot });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/equivalents/evidence POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// GET ?deviceId=&key= — stream evidence image (company-scoped)
export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("VIEWER");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const url = new URL(req.url);
    const deviceId = url.searchParams.get("deviceId") ?? "";
    const key = url.searchParams.get("key") ?? "";
    if (!deviceId || !key) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    assertEvidenceKeyOwned(key, ctx.companyId, product.id, deviceId);
    const buffer = await readEquivalentEvidenceBuffer(key);
    if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const mime = key.endsWith(".png")
      ? "image/png"
      : key.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

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
