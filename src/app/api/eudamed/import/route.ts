import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { prisma } from "@/lib/db";
import {
  parseUdiImportFile,
  toProductUdiPatch,
  type ImportedUdiDevice,
} from "@/lib/eudamed/import-packages";
import { eudamedReadiness, buildUdiPayload } from "@/lib/udi/udi-payload";
import { createProduct } from "@/lib/products/service";

export const runtime = "nodejs";

const applySchema = z.object({
  productId: z.string().min(1),
  deviceIndex: z.number().int().min(0).default(0),
  markRegistered: z.boolean().default(true),
  updateCompanySrn: z.boolean().default(false),
  createMissingProducts: z.boolean().default(false),
  devices: z
    .array(
      z.object({
        tradeName: z.string().nullable(),
        basicUdiDi: z.string().nullable(),
        udiDi: z.string().nullable(),
        emdnCode: z.string().nullable(),
        eudamedDeviceId: z.string().nullable(),
        deviceClass: z.string().nullable(),
        gmdn: z.string().nullable(),
        issuingAgency: z.string().nullable(),
        manufacturerName: z.string().nullable(),
        srnNumber: z.string().nullable(),
      }),
    )
    .min(1),
});

function mapDeviceClass(raw: string | null): "CLASS_I" | "CLASS_IIA" | "CLASS_IIB" | "CLASS_III" | undefined {
  if (!raw) return undefined;
  const s = raw.toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
  if (s.includes("III") || s === "3" || s.includes("CLASSIII")) return "CLASS_III";
  if (s.includes("IIB") || s === "2B" || s.includes("CLASSIIB")) return "CLASS_IIB";
  if (s.includes("IIA") || s === "2A" || s.includes("CLASSIIA")) return "CLASS_IIA";
  if (s.includes("I") || s === "1" || s.includes("CLASSI")) return "CLASS_I";
  return undefined;
}

/** POST multipart: parse XML/CSV and return preview devices (no DB write). */
export async function POST(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file required" }, { status: 400 });
    }
    if (file.size > 2_000_000) {
      return NextResponse.json({ error: "File too large (max 2 MB)" }, { status: 400 });
    }

    const content = await file.text();
    const parsed = parseUdiImportFile(file.name || "upload.csv", content);
    if (!parsed.devices.length) {
      return NextResponse.json(
        { error: "No devices found", warnings: parsed.warnings, format: parsed.format },
        { status: 400 },
      );
    }

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      action: "eudamed.udi.import.parse",
      entity: "Product",
      metadata: { format: parsed.format, count: parsed.devices.length, filename: file.name },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      format: parsed.format,
      warnings: parsed.warnings,
      devices: parsed.devices,
      count: parsed.devices.length,
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    return NextResponse.json({ error: message }, { status });
  }
}

/**
 * PUT: apply parsed devices onto a product (and optionally create extra products /
 * update company SRN from an existing EUDAMED registration package).
 */
export async function PUT(req: Request) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const body = applySchema.safeParse(await req.json().catch(() => null));
    if (!body.success) {
      return NextResponse.json({ error: "Invalid input", details: body.error.flatten() }, { status: 400 });
    }

    const { productId, deviceIndex, markRegistered, updateCompanySrn, createMissingProducts, devices } =
      body.data;

    const product = await prisma.product.findFirst({
      where: { id: productId, companyId: ctx.companyId, deletedAt: null },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const primary = devices[deviceIndex] as ImportedUdiDevice | undefined;
    if (!primary) return NextResponse.json({ error: "deviceIndex out of range" }, { status: 400 });

    const patch = toProductUdiPatch(primary, markRegistered);
    await prisma.product.update({
      where: { id: product.id },
      data: {
        basicUdiDi: patch.basicUdiDi,
        udiDi: patch.udiDi,
        emdnCode: patch.emdnCode,
        eudamedDeviceId: patch.eudamedDeviceId,
        eudamedRegistrationStatus: patch.eudamedRegistrationStatus,
        ...(primary.tradeName && !product.name ? { name: primary.tradeName } : {}),
      },
    });

    let companySrnUpdated = false;
    if (updateCompanySrn && primary.srnNumber?.trim()) {
      await prisma.company.update({
        where: { id: ctx.companyId },
        data: { srnNumber: primary.srnNumber.trim() },
      });
      companySrnUpdated = true;
    }

    const createdProductIds: string[] = [];
    if (createMissingProducts && devices.length > 1) {
      for (let i = 0; i < devices.length; i++) {
        if (i === deviceIndex) continue;
        const d = devices[i] as ImportedUdiDevice;
        const name = d.tradeName?.trim() || d.udiDi || d.basicUdiDi || `Imported device ${i + 1}`;
        const p = toProductUdiPatch(d, markRegistered);
        const cls = mapDeviceClass(d.deviceClass) ?? "CLASS_I";
        const created = await createProduct(ctx.companyId, {
          name,
          deviceClass: cls,
          isInvasive: false,
          hasMeasuringFn: false,
          containsSoftware: false,
          variants: [],
        });
        await prisma.product.update({
          where: { id: created.id },
          data: {
            basicUdiDi: p.basicUdiDi,
            udiDi: p.udiDi,
            emdnCode: p.emdnCode,
            eudamedDeviceId: p.eudamedDeviceId,
            eudamedRegistrationStatus: p.eudamedRegistrationStatus,
          },
        });
        createdProductIds.push(created.id);
      }
    }

    const company = await prisma.company.findUnique({
      where: { id: ctx.companyId },
      select: { srnNumber: true },
    });
    const updated = await prisma.product.findFirst({
      where: { id: product.id },
      select: {
        basicUdiDi: true,
        udiDi: true,
        emdnCode: true,
        eudamedDeviceId: true,
        eudamedRegistrationStatus: true,
      },
    });

    await writeAuditLog({
      companyId: ctx.companyId,
      userId: ctx.user.id,
      action: "eudamed.udi.import.apply",
      entity: "Product",
      entityId: product.id,
      metadata: {
        deviceIndex,
        createdCount: createdProductIds.length,
        companySrnUpdated,
        udiDi: patch.udiDi,
      },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({
      ok: true,
      product: updated,
      createdProductIds,
      companySrnUpdated,
      srnNumber: company?.srnNumber ?? null,
      udiPayload: buildUdiPayload({ udiDi: updated?.udiDi ?? "" }),
      eudamedReadiness: eudamedReadiness({
        ...(updated ?? {
          basicUdiDi: null,
          udiDi: null,
          emdnCode: null,
          eudamedDeviceId: null,
          eudamedRegistrationStatus: null,
        }),
        srnNumber: company?.srnNumber ?? null,
      }),
    });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/eudamed/import PUT]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
