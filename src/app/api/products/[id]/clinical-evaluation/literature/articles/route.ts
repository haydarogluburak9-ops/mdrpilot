import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import {
  assertAcceptedArticleKeyOwned,
  readAcceptedArticleBuffer,
  uploadAcceptedArticlePdf,
} from "@/lib/products/clinical-article-evidence";

export const runtime = "nodejs";

// POST multipart: file, optional citation, optional studyIndex
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const form = await req.formData();
    const file = form.get("file");
    const citation = String(form.get("citation") ?? "").trim();
    const studyIndexRaw = form.get("studyIndex");
    const studyIndex =
      typeof studyIndexRaw === "string" && studyIndexRaw
        ? Number.parseInt(studyIndexRaw, 10)
        : undefined;

    if (!(file instanceof File)) return NextResponse.json({ error: "file required" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const article = await uploadAcceptedArticlePdf({
      companyId: ctx.companyId,
      productId: product.id,
      buffer,
      mimeType: file.type || "application/pdf",
      fileName: file.name || "article.pdf",
      citation: citation || undefined,
      studyIndex: Number.isFinite(studyIndex) ? studyIndex : undefined,
    });

    return NextResponse.json({ article });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/clinical-evaluation/literature/articles POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// GET ?key= — stream article PDF
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

    assertAcceptedArticleKeyOwned(key, ctx.companyId, product.id);
    const buffer = await readAcceptedArticleBuffer(key);
    if (!buffer) return NextResponse.json({ error: "Not found" }, { status: 404 });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
