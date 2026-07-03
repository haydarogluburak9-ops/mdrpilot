import type { ProductBrandVariant, SterilizationMethod } from "@/lib/domain/types";
import { normalizeModelSterilizations } from "@/lib/domain/sterilization";

export interface DeclarationModelRow {
  orderNo: number;
  modelName: string;
  productName: string;
  emdnCode: string;
  sterilization: string;
}

const STER_LABEL: Record<string, { tr: string; en: string }> = {
  EO: { tr: "EO", en: "EO" },
  GAMMA: { tr: "Gamma", en: "Gamma" },
  STEAM: { tr: "Buhar", en: "Steam" },
  OTHER: { tr: "Diğer", en: "Other" },
  NON_STERILE: { tr: "—", en: "—" },
};

function sterLabel(code: string): string {
  const m = STER_LABEL[code];
  return m ? m.tr : code;
}

/** Flatten the device-family matrix into declaration model table rows. */
export function flattenDeclarationModels(
  productName: string,
  variants: unknown,
  emdnCode: string | null | undefined,
  fallbackModel?: string | null,
  fallbackBrand?: string | null,
): DeclarationModelRow[] {
  const emdn = emdnCode?.trim() || "—";
  const rows: DeclarationModelRow[] = [];
  if (Array.isArray(variants) && variants.length) {
    let n = 0;
    for (const b of variants as ProductBrandVariant[]) {
      const brand = b.brand?.trim() || "";
      for (const m of b.models ?? []) {
        const model = m.name?.trim();
        if (!model) continue;
        const sterList = normalizeModelSterilizations(
          model,
          (m.sterilizations ?? []).filter((s) => s && s !== "NON_STERILE") as SterilizationMethod[],
        );
        n++;
        rows.push({
          orderNo: n,
          modelName: brand ? `${brand} – ${model}` : model,
          productName: productName,
          emdnCode: emdn,
          sterilization: sterList.length ? sterLabel(sterList[0]) : "—",
        });
      }
    }
  }
  if (!rows.length) {
    const model = [fallbackBrand, fallbackModel].filter(Boolean).join(" – ") || "[MODEL]";
    rows.push({
      orderNo: 1,
      modelName: model,
      productName: productName,
      emdnCode: emdn,
      sterilization: "—",
    });
  }
  return rows;
}

export function brandListFromVariants(variants: unknown, fallback?: string | null): string {
  return brandsFromVariants(variants, fallback).join(" / ");
}

/** One brand per line — matches D1004.04 template layout. */
export function brandsFromVariants(variants: unknown, fallback?: string | null): string[] {
  if (Array.isArray(variants) && variants.length) {
    const brands = (variants as ProductBrandVariant[]).map((b) => b.brand?.trim()).filter(Boolean);
    if (brands.length) return brands;
  }
  const fb = fallback?.trim();
  return fb ? [fb] : ["[MARKA / BRAND]"];
}
