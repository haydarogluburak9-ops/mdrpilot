import { NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/lib/auth/guards";
import { statusForError } from "@/lib/auth/errors";
import { writeAuditLog, ipFromRequest } from "@/lib/audit";
import { listProductsWithDossier } from "@/lib/data/queries";
import { createProduct } from "@/lib/products/service";
import { assertCanAddProduct } from "@/lib/billing/plan-limits";
import { productVariantsSchema } from "@/lib/products/variant-schema";

export const runtime = "nodejs";

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
  intendedPurpose: z.string().trim().max(5000).optional().nullable(),
  userProfile: z.string().trim().max(2000).optional().nullable(),
  patientPopulation: z.string().trim().max(2000).optional().nullable(),
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
  materials: z.string().trim().max(2000).optional().nullable(),
  appliedStandards: z.string().trim().max(2000).optional().nullable(),
  variants: productVariantsSchema,
});

// GET /api/products — company-scoped product list with dossier.
export async function GET() {
  try {
    const ctx = await requireRole("VIEWER");
    const products = await listProductsWithDossier(ctx.companyId);
    return NextResponse.json({ products });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products GET]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

// POST /api/products — create a product (CONSULTANT+).
export async function POST(req: Request) {
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

    await assertCanAddProduct(ctx.companyId);
    const product = await createProduct(ctx.companyId, parsed.data);

    await writeAuditLog({
      action: "product.create",
      companyId: ctx.companyId,
      userId: ctx.user.id,
      entity: "Product",
      entityId: product.id,
      metadata: { name: product.name, deviceClass: product.deviceClass },
      ip: ipFromRequest(req),
    });

    return NextResponse.json({ id: product.id }, { status: 201 });
  } catch (err) {
    const { status, message } = statusForError(err);
    if (status === 500) console.error("[api/products POST]", err);
    return NextResponse.json({ error: message }, { status });
  }
}
