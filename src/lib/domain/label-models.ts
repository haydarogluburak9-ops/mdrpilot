import type { ProductBrandVariant, SterilizationMethod } from "./types";
import { normalizeModelSterilizations } from "./sterilization";

export interface LabelModelEntry {
  id: string;
  brand: string;
  modelName: string;
  displayRef: string;
  sterilizations: SterilizationMethod[];
}

export function encodeModelId(brand: string, modelName: string): string {
  return `${brand}::${modelName}`;
}

export function decodeModelId(id: string): { brand: string; modelName: string } {
  const idx = id.indexOf("::");
  if (idx < 0) return { brand: "", modelName: id };
  return { brand: id.slice(0, idx), modelName: id.slice(idx + 2) };
}

/** Flatten variant matrix into per-model label rows (one physical label per model). */
export function flattenLabelModels(
  variants: unknown,
  fallbackBrand?: string | null,
  fallbackModel?: string | null,
): LabelModelEntry[] {
  const rows: LabelModelEntry[] = [];
  if (Array.isArray(variants) && variants.length) {
    for (const b of variants as ProductBrandVariant[]) {
      const brand = b.brand?.trim() || "";
      for (const m of b.models ?? []) {
        const modelName = m.name?.trim();
        if (!modelName) continue;
        const sterilizations = normalizeModelSterilizations(
          modelName,
          (m.sterilizations ?? []).filter((s) => s && s !== "NON_STERILE") as SterilizationMethod[],
        );
        rows.push({
          id: encodeModelId(brand, modelName),
          brand,
          modelName,
          displayRef: brand ? `${brand} – ${modelName}` : modelName,
          sterilizations,
        });
      }
    }
  }
  if (!rows.length) {
    const modelName = fallbackModel?.trim() || "—";
    const brand = fallbackBrand?.trim() || "";
    rows.push({
      id: encodeModelId(brand, modelName),
      brand,
      modelName,
      displayRef: [brand, modelName].filter(Boolean).join(" – ") || "—",
      sterilizations: [],
    });
  }
  return rows;
}

/** Group models by brand for compact UI navigation. */
export function groupLabelModelsByBrand(models: LabelModelEntry[]): Map<string, LabelModelEntry[]> {
  const map = new Map<string, LabelModelEntry[]>();
  for (const m of models) {
    const key = m.brand || "—";
    const list = map.get(key) ?? [];
    list.push(m);
    map.set(key, list);
  }
  return map;
}
