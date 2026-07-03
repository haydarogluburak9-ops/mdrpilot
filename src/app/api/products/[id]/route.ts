import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { updateProduct } from "@/lib/products/service";
import { productVariantsSchema } from "@/lib/products/variant-schema";

export const runtime = "nodejs";

const optText = (max: number) => z.string().trim().max(max).optional().nullable();

const schema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  deviceClass: z.enum([
    "CLASS_I",
    "CLASS_IS",
    "CLASS_IM",
    "CLASS_IR",
    "CLASS_IIA",
    "CLASS_IIB",
    "CLASS_III",
  ]),
  basicUdiDi: optText(100),
  udiDi: optText(100),
  emdnCode: optText(50),
  intendedPurpose: optText(5000),
  userProfile: optText(2000),
  patientPopulation: optText(2000),
  indications: optText(3000),
  contraindications: optText(3000),
  bodyContactDuration: optText(200),
  materials: optText(2000),
  packagingType: optText(500),
  shelfLife: optText(200),
  manufacturingProcess: optText(2000),
  criticalSuppliers: optText(2000),
  appliedStandards: optText(2000),
  isInvasive: z.boolean().default(false),
  hasMeasuringFn: z.boolean().default(false),
  containsSoftware: z.boolean().default(false),
  isImplantable: z.boolean().default(false),
  isActive: z.boolean().default(false),
  isReusable: z.boolean().default(false),
  emitsRadiation: z.boolean().default(false),
  administersMedicineOrEnergy: z.boolean().default(false),
  containsMedicinalSubstance: z.boolean().default(false),
  containsBiologicalMaterial: z.boolean().default(false),
  isAbsorbable: z.boolean().default(false),
  containsCmrOrEndocrine: z.boolean().default(false),
  containsNanomaterial: z.boolean().default(false),
  isForLayUser: z.boolean().default(false),
  variants: productVariantsSchema.optional(),
});

// PUT /api/products/[id] — update product specification (CONSULTANT+).
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const ctx = await requireRole("CONSULTANT");
    const json = await req.json().catch(() => ({}));
    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }

    const updated = await updateProduct(ctx.companyId, params.id, parsed.data);
    if (!updated) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await writeAuditLog({
      action: "product.update",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Product",
      entityId: updated.id,
      metadata: { name: updated.name },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ id: updated.id });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products/[id] PUT]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
