import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { capturePageScreenshot } from "@/lib/integrations/literature-screenshot-capture";
import { uploadLiteratureEvidenceScreenshot } from "@/lib/products/literature-evidence";

export const runtime = "nodejs";
export const maxDuration = 60;

const bodySchema = z.object({
  target: z.string().min(1).max(64),
  url: z.string().url().max(2000),
  caption: z.string().max(200).optional(),
});

/** POST JSON: capture portal page screenshot via Playwright and store as evidence. */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { id: true },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "target and https url required" }, { status: 400 });
    }

    const { target, url, caption } = parsed.data;
    if (!/^https?:\/\//i.test(url)) {
      return NextResponse.json({ error: "Only http(s) URLs allowed" }, { status: 400 });
    }

    const captured = await capturePageScreenshot(url);
    if (!captured.ok) {
      return NextResponse.json({ error: captured.error }, { status: 422 });
    }

    const screenshot = await uploadLiteratureEvidenceScreenshot({
      companyId: ctx.companyId,
      productId: product.id,
      target,
      buffer: captured.buffer,
      mimeType: captured.contentType,
      fileName: `${target}-capture.png`,
      caption: caption?.trim() || `Auto-capture: ${captured.finalUrl}`,
    });

    return NextResponse.json({
      screenshot,
      finalUrl: captured.finalUrl,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) {
      console.error("[api/clinical-evaluation/literature/evidence/capture POST]", err);
    }
    return NextResponse.json({ error: message }, { status });
  }
}
