import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { prisma } from "@/lib/db";
import { eudamedReadiness } from "@/lib/udi/udi-payload";
import { buildUdiPayload } from "@/lib/udi/udi-payload";
import { renderDataMatrixPng } from "@/lib/udi/datamatrix";

export const runtime = "nodejs";

const patchSchema = z.object({
  eudamedDeviceId: z.string().max(200).optional().nullable(),
  eudamedRegistrationStatus: z
    .enum(["NOT_REGISTERED", "IN_PROGRESS", "REGISTERED"])
    .optional()
    .nullable(),
  basicUdiDi: z.string().max(200).optional().nullable(),
  udiDi: z.string().max(200).optional().nullable(),
  emdnCode: z.string().max(50).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: {
        basicUdiDi: true,
        udiDi: true,
        emdnCode: true,
        eudamedDeviceId: true,
        eudamedRegistrationStatus: true,
      },
    });
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { srnNumber: true },
    });

    const payload = buildUdiPayload({ udiDi: product.udiDi ?? "" });
    const readiness = eudamedReadiness({
      ...product,
      srnNumber: company?.srnNumber ?? null,
    });

    return NextResponse.json({
      ...product,
      srnNumber: company?.srnNumber ?? null,
      udiPayload: payload,
      eudamedReadiness: readiness,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const parsed = patchSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

    const product = await prisma.product.update({
      where: { id: params.id },
      data: parsed.data,
    });
    if (product.companyId !== ctx.companyId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

/** POST returns Data Matrix PNG for preview */
export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const ctx = await requireRole("VIEWER");
    const product = await prisma.product.findFirst({
      where: { id: params.id, companyId: ctx.companyId, deletedAt: null },
      select: { udiDi: true },
    });
    if (!product?.udiDi) {
      return NextResponse.json({ error: "UDI-DI required" }, { status: 400 });
    }

    const body = (await req.json().catch(() => ({}))) as { lot?: string; expiry?: string };
    const payload = buildUdiPayload({
      udiDi: product.udiDi,
      lot: body.lot,
      expiry: body.expiry,
    });
    const png = await renderDataMatrixPng(payload);
    if (!png) {
      return NextResponse.json({ error: "DataMatrix generation failed", payload }, { status: 503 });
    }
    return new NextResponse(new Uint8Array(png), {
      headers: { "Content-Type": "image/png", "X-UDI-Payload": payload },
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}
