import "server-only";
import type { DeviceClass, SterilizationMethod } from "@prisma/client";
import { prisma } from "@/lib/db";
import { assertCompanyAccess } from "@/lib/auth/guards";
import { TECHNICAL_FILE_TEMPLATE, GSPR_TEMPLATE } from "@/lib/domain/constants";
import { applyApplicability } from "@/lib/products/applicability";
import { normalizeModelSterilizations } from "@/lib/domain/sterilization";

export interface ProductModelVariantInput {
  name: string;
  sterilizations: SterilizationMethod[];
}

export interface ProductBrandVariantInput {
  brand: string;
  models: ProductModelVariantInput[];
}

/** Extended device-characteristic flags that drive section / GSPR applicability. */
export interface DevicePropertyFlags {
  isImplantable?: boolean;
  isActive?: boolean;
  isReusable?: boolean;
  emitsRadiation?: boolean;
  administersMedicineOrEnergy?: boolean;
  containsMedicinalSubstance?: boolean;
  containsBiologicalMaterial?: boolean;
  isAbsorbable?: boolean;
  containsCmrOrEndocrine?: boolean;
  containsNanomaterial?: boolean;
  isForLayUser?: boolean;
}

export interface CreateProductInput extends DevicePropertyFlags {
  name: string;
  deviceClass: DeviceClass;
  intendedPurpose?: string | null;
  userProfile?: string | null;
  patientPopulation?: string | null;
  isInvasive: boolean;
  hasMeasuringFn: boolean;
  containsSoftware: boolean;
  materials?: string | null;
  appliedStandards?: string | null;
  variants: ProductBrandVariantInput[];
}

/** Pull the optional device-property flags into a Prisma-writable object (defaults false). */
function devicePropertyData(input: DevicePropertyFlags) {
  return {
    isImplantable: input.isImplantable ?? false,
    isActive: input.isActive ?? false,
    isReusable: input.isReusable ?? false,
    emitsRadiation: input.emitsRadiation ?? false,
    administersMedicineOrEnergy: input.administersMedicineOrEnergy ?? false,
    containsMedicinalSubstance: input.containsMedicinalSubstance ?? false,
    containsBiologicalMaterial: input.containsBiologicalMaterial ?? false,
    isAbsorbable: input.isAbsorbable ?? false,
    containsCmrOrEndocrine: input.containsCmrOrEndocrine ?? false,
    containsNanomaterial: input.containsNanomaterial ?? false,
    isForLayUser: input.isForLayUser ?? false,
  };
}

/** Drop empty brands/models and de-duplicate sterilization methods per model. */
function cleanVariants(variants: ProductBrandVariantInput[]): ProductBrandVariantInput[] {
  return variants
    .map((b) => ({
      brand: b.brand.trim(),
      models: (b.models ?? [])
        .map((m) => ({
          name: m.name.trim(),
          sterilizations: normalizeModelSterilizations(m.name.trim(), Array.from(new Set(m.sterilizations ?? []))),
        }))
        .filter((m) => m.name.length > 0),
    }))
    .filter((b) => b.brand.length > 0 || b.models.length > 0);
}

/**
 * Derive the legacy scalar columns (brand/model/isSterile/sterilization) from the
 * device-family variant matrix so the rest of the app (lists, AI prompts, exports)
 * keeps working while the full matrix lives in variantsJson.
 */
function deriveScalars(variants: ProductBrandVariantInput[]) {
  const brands = Array.from(new Set(variants.map((b) => b.brand).filter(Boolean)));
  const modelNames = Array.from(
    new Set(variants.flatMap((b) => b.models.map((m) => m.name)).filter(Boolean)),
  );
  const methods = Array.from(
    new Set(
      variants.flatMap((b) => b.models.flatMap((m) => m.sterilizations)).filter(Boolean),
    ),
  ).filter((s) => s !== "NON_STERILE") as SterilizationMethod[];

  const brand = brands.length ? brands.join(", ") : null;
  const model =
    modelNames.length === 0
      ? null
      : modelNames.length <= 5
        ? modelNames.join(", ")
        : `${modelNames.length} models`;

  const isSterile = methods.length > 0;
  let sterilization: SterilizationMethod = "NON_STERILE";
  if (methods.length === 1) sterilization = methods[0];
  else if (methods.length > 1) sterilization = "OTHER";

  return { brand, model, isSterile, sterilization };
}

/**
 * Create a product (one technical file) that may cover a whole device family:
 * multiple brands, each with multiple models, each model with one or more
 * sterilization methods (e.g. EO and GAMMA). Scaffolds the dossier so downstream
 * modules have something to work with immediately.
 */
export async function createProduct(companyId: string, input: CreateProductInput) {
  const variants = cleanVariants(input.variants ?? []);
  const { brand, model, isSterile, sterilization } = deriveScalars(variants);

  const product = await prisma.product.create({
    data: {
      companyId,
      name: input.name,
      brand,
      model,
      variantsJson: variants.length ? (variants as object[]) : undefined,
      deviceClass: input.deviceClass,
      intendedPurpose: input.intendedPurpose || null,
      userProfile: input.userProfile || null,
      patientPopulation: input.patientPopulation || null,
      isSterile,
      sterilization,
      isInvasive: input.isInvasive,
      hasMeasuringFn: input.hasMeasuringFn,
      containsSoftware: input.containsSoftware,
      ...devicePropertyData(input),
      materials: input.materials || null,
      appliedStandards: input.appliedStandards || null,
      complianceScore: 0,
    },
  });

  await prisma.technicalFileSection.createMany({
    data: TECHNICAL_FILE_TEMPLATE.map((s, i) => ({
      productId: product.id,
      key: s.key,
      title: s.title,
      annexRef: s.annexRef,
      order: i,
      status: "MISSING" as const,
    })),
  });

  await prisma.gSPRItem.createMany({
    data: GSPR_TEMPLATE.map((g) => ({
      productId: product.id,
      gsprNo: g.gsprNo,
      requirementSummary: g.requirementSummary,
      applicable: "JUSTIFICATION" as const,
      status: "MISSING" as const,
    })),
  });

  // Auto-mark sections / GSPR not applicable to this device (class, sterility,
  // software, measuring function). Safe: only touches untouched items.
  await applyApplicability(product.id).catch(() => undefined);

  return product;
}

export interface UpdateProductInput extends DevicePropertyFlags {
  name: string;
  deviceClass: DeviceClass;
  basicUdiDi?: string | null;
  udiDi?: string | null;
  emdnCode?: string | null;
  intendedPurpose?: string | null;
  userProfile?: string | null;
  patientPopulation?: string | null;
  indications?: string | null;
  contraindications?: string | null;
  bodyContactDuration?: string | null;
  materials?: string | null;
  packagingType?: string | null;
  shelfLife?: string | null;
  manufacturingProcess?: string | null;
  criticalSuppliers?: string | null;
  appliedStandards?: string | null;
  isInvasive: boolean;
  hasMeasuringFn: boolean;
  containsSoftware: boolean;
  /** When provided, replaces the brand/model/sterilization matrix. */
  variants?: ProductBrandVariantInput[];
}

/**
 * Update a product's specification fields (company-scoped). When `variants` is
 * included, the device-family matrix and derived sterility scalars are updated too.
 */
export async function updateProduct(
  companyId: string,
  productId: string,
  input: UpdateProductInput,
) {
  const existing = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { companyId: true },
  });
  if (!existing) return null;
  assertCompanyAccess(existing.companyId, companyId);

  const nz = (v: string | null | undefined) => (v && v.trim() ? v.trim() : null);

  const variants =
    input.variants !== undefined ? cleanVariants(input.variants) : undefined;
  const scalars = variants ? deriveScalars(variants) : null;

  const updated = await prisma.product.update({
    where: { id: productId },
    data: {
      name: input.name.trim(),
      deviceClass: input.deviceClass,
      basicUdiDi: nz(input.basicUdiDi),
      udiDi: nz(input.udiDi),
      emdnCode: nz(input.emdnCode),
      intendedPurpose: nz(input.intendedPurpose),
      userProfile: nz(input.userProfile),
      patientPopulation: nz(input.patientPopulation),
      indications: nz(input.indications),
      contraindications: nz(input.contraindications),
      bodyContactDuration: nz(input.bodyContactDuration),
      materials: nz(input.materials),
      packagingType: nz(input.packagingType),
      shelfLife: nz(input.shelfLife),
      manufacturingProcess: nz(input.manufacturingProcess),
      criticalSuppliers: nz(input.criticalSuppliers),
      appliedStandards: nz(input.appliedStandards),
      isInvasive: input.isInvasive,
      hasMeasuringFn: input.hasMeasuringFn,
      containsSoftware: input.containsSoftware,
      ...devicePropertyData(input),
      ...(scalars
        ? {
            brand: scalars.brand,
            model: scalars.model,
            isSterile: scalars.isSterile,
            sterilization: scalars.sterilization,
            variantsJson: variants!.length ? (variants as object[]) : undefined,
          }
        : {}),
    },
  });

  // Device class / properties / sterility may have changed → re-evaluate applicability.
  await applyApplicability(productId).catch(() => undefined);

  return updated;
}
