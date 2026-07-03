import type { Product } from "@/lib/domain/types";
import type { SterilizationMethod } from "@/lib/domain/types";

export const STERILIZATION_METHODS = ["EO", "GAMMA", "STEAM", "OTHER"] as const;
export type SterMethod = (typeof STERILIZATION_METHODS)[number];

export interface ModelVariantForm {
  name: string;
  sterilizations: SterMethod[];
}

export interface BrandVariantForm {
  brand: string;
  models: ModelVariantForm[];
  bulkText: string;
  bulkSters: SterMethod[];
}

export const emptyModel = (): ModelVariantForm => ({ name: "", sterilizations: [] });

export const emptyBrand = (): BrandVariantForm => ({
  brand: "",
  models: [emptyModel()],
  bulkText: "",
  bulkSters: [],
});

/** Split a pasted block (newlines / commas / semicolons / tabs) into model codes. */
export function parseModelCodes(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(/[\n,;\t]+/)
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

/** Hydrate the variant editor from a saved product. */
export function variantsFromProduct(p: Product): BrandVariantForm[] {
  if (Array.isArray(p.variants) && p.variants.length) {
    return p.variants.map((b) => ({
      brand: b.brand ?? "",
      models: (b.models ?? []).map((m) => ({
        name: m.name ?? "",
        sterilizations: (m.sterilizations ?? []).filter((s): s is SterMethod =>
          (STERILIZATION_METHODS as readonly string[]).includes(s),
        ),
      })),
      bulkText: "",
      bulkSters: [],
    }));
  }
  const brand = p.brand?.split(",")[0]?.trim() ?? "";
  const model = p.model?.trim() ?? "";
  if (brand || model) {
    const ster: SterMethod[] =
      p.isSterile && p.sterilization && p.sterilization !== "NON_STERILE"
        ? (STERILIZATION_METHODS as readonly string[]).includes(p.sterilization)
          ? [p.sterilization as SterMethod]
          : []
        : [];
    return [{ brand, models: [{ name: model, sterilizations: ster }], bulkText: "", bulkSters: [] }];
  }
  return [emptyBrand()];
}

/** Strip UI-only bulk fields before API submit. */
export function stripVariantsForApi(variants: BrandVariantForm[]) {
  return variants.map((b) => ({
    brand: b.brand,
    models: b.models.map((m) => ({
      name: m.name,
      sterilizations: m.sterilizations as SterilizationMethod[],
    })),
  }));
}

export function variantCounts(variants: BrandVariantForm[]) {
  const brandCount = variants.filter((b) => b.brand.trim()).length;
  const modelCount = variants.reduce((acc, b) => acc + b.models.filter((m) => m.name.trim()).length, 0);
  return { brandCount, modelCount };
}
