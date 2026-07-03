import { NextResponse } from "next/server";
import { requireRole, requireCompany } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { rateLimit, clientKey } from "@/lib/security/rate-limit";
import { ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";
import { getUploadsStorage } from "@/lib/storage/storage-provider";
import { NotFoundError } from "@/lib/auth/errors";
import {
  PRODUCT_PHOTO_MAX_BYTES,
  removeProductPhoto,
  setProductPhoto,
} from "@/lib/products/photo";

export const runtime = "nodejs";

// GET /api/products/[id]/photo — stream product image.
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireCompany();
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { photoKey: true, photoMime: true },
    });
    if (!product?.photoKey) throw new NotFoundError();
    const storage = getUploadsStorage();
    if (!(await storage.exists(product.photoKey))) throw new NotFoundError();
    const buffer = await storage.read(product.photoKey);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": product.photoMime || "image/png",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/photo GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/products/[id]/photo — upload product photo (CONSULTANT+).
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    if (!rateLimit(clientKey(req, "product-photo")).ok) {
      return NextResponse.json({ error: "Rate limit exceeded." }, { status: 429 });
    }
    const form = await req.formData().catch(() => null);
    if (!form) return NextResponse.json({ error: "Invalid multipart form" }, { status: 400 });
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Missing file" }, { status: 400 });
    if (file.size > PRODUCT_PHOTO_MAX_BYTES) {
      return NextResponse.json({ error: "Photo exceeds 5 MB limit" }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await setProductPhoto({
      companyId: ctx.companyId,
      productId: params.id,
      userId: ctx.user.id,
      buffer,
      mimeType: file.type,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ photo: result }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/photo POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// DELETE /api/products/[id]/photo
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    await removeProductPhoto({
      companyId: ctx.companyId,
      productId: params.id,
      userId: ctx.user.id,
      ip: ipFromRequest(req),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/photo DELETE]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
