import type { Product, ProductBrandVariant, SterilizationMethod } from "./types";
import { sterilizationMethodsFromVariants } from "./sterilization";
import type { LabelModelEntry } from "./label-models";

export interface CompanyLabelProfile {
  name: string;
  legalName?: string | null;
  address?: string | null;
  notifiedBodyNumber?: string | null;
}

export interface LabelSymbolSlot {
  clause: string;
  title: string;
  imagePath: string;
  fallback: string;
}

export interface LabelFieldSymbols {
  manufacturer: LabelSymbolSlot;
  ref: LabelSymbolSlot;
  udi: LabelSymbolSlot;
  lot: LabelSymbolSlot;
  exp: LabelSymbolSlot;
  sterilization: LabelSymbolSlot | null;
  ce: LabelSymbolSlot;
}

export interface LabelDisplayData {
  productName: string;
  manufacturer: string;
  manufacturerAddress: string;
  notifiedBodyNumber: string;
  ref: string;
  udi: string;
  lot: string;
  exp: string;
  shelfLifeText: string;
  /** Primary sterilization for this label (per model). */
  primarySterilization: SterilizationMethod | null;
  /** Badge text e.g. "EO", "R" */
  sterilizationBadge: string | null;
  fieldSymbols: LabelFieldSymbols;
  /** Package, single-use, IFU, MD — shown in a compact row below data fields. */
  auxiliarySymbols: LabelSymbolSlot[];
}

function symbolPath(clause: string): string {
  if (/20417/i.test(clause)) return "/iso-symbols/udi.png";
  if (/annex\s*v/i.test(clause)) return "/iso-symbols/ce.png";
  return `/iso-symbols/${clause.replace(/\s+/g, "")}.png`;
}

export function makeLabelSymbol(
  clause: string,
  titleTr: string,
  titleEn: string,
  fallback: string,
  locale: string,
): LabelSymbolSlot {
  return {
    clause,
    title: locale === "tr" ? titleTr : titleEn,
    imagePath: symbolPath(clause),
    fallback,
  };
}

/** ISO 15223-1 sterilization pictogram for a single validated method. */
export function sterilizationSymbolForMethod(
  method: SterilizationMethod | string,
  locale: string,
): LabelSymbolSlot | null {
  switch (method) {
    case "EO":
      return makeLabelSymbol("5.2.3", "EO ile steril", "EO sterile", "STERILE EO", locale);
    case "GAMMA":
      return makeLabelSymbol("5.2.4", "Gama ile steril", "Gamma sterile", "STERILE R", locale);
    case "STEAM":
      return makeLabelSymbol("5.2.6", "Buhar ile steril", "Steam sterile", "STEAM", locale);
    default:
      return null;
  }
}

function sterilizationBadgeText(method: SterilizationMethod | string): string {
  if (method === "GAMMA") return "R";
  if (method === "EO") return "EO";
  if (method === "STEAM") return "STEAM";
  return method;
}

function resolvePrimarySterilization(methods: SterilizationMethod[]): SterilizationMethod | null {
  if (!methods.length) return null;
  if (methods.length === 1) return methods[0];
  // Per-model rows should already be normalized to one method; prefer Gamma for -R models.
  if (methods.includes("GAMMA")) return "GAMMA";
  if (methods.includes("EO")) return "EO";
  return methods[0];
}

function buildFieldSymbols(
  locale: string,
  primarySter: SterilizationMethod | null,
): LabelFieldSymbols {
  return {
    manufacturer: makeLabelSymbol("5.1.1", "Üretici", "Manufacturer", "MFR", locale),
    ref: makeLabelSymbol("5.1.6", "REF", "REF", "REF", locale),
    udi: makeLabelSymbol("ISO 20417", "UDI", "UDI", "UDI", locale),
    lot: makeLabelSymbol("5.1.5", "LOT", "LOT", "LOT", locale),
    exp: makeLabelSymbol("5.1.4", "SKT", "EXP", "EXP", locale),
    sterilization: primarySter ? sterilizationSymbolForMethod(primarySter, locale) : null,
    ce: makeLabelSymbol("MDR Annex V", "CE", "CE", "CE", locale),
  };
}

function buildAuxiliarySymbols(
  p: { isSterile: boolean; isReusable?: boolean },
  locale: string,
): LabelSymbolSlot[] {
  const slots: LabelSymbolSlot[] = [];
  if (p.isSterile) slots.push(makeLabelSymbol("5.2.8", "Ambalaj", "Package", "!", locale));
  if (!p.isReusable) slots.push(makeLabelSymbol("5.4.2", "Tek kullanım", "Single use", "1×", locale));
  slots.push(makeLabelSymbol("5.4.3", "KT", "IFU", "IFU", locale));
  slots.push(makeLabelSymbol("5.7.7", "Tıbbi cihaz", "MD", "MD", locale));
  return slots;
}

/** Parse shelf life text such as "5 yıl", "5 years", "5". */
export function parseShelfLifeYears(shelfLife?: string | null): number | null {
  if (!shelfLife?.trim()) return null;
  const m = shelfLife.trim().match(/(\d+)\s*(yıl|years?|yr|y\b)/i);
  if (m) return Number(m[1]);
  const plain = shelfLife.trim().match(/^(\d+)$/);
  if (plain) return Number(plain[1]);
  return null;
}

export function formatExpiryYm(from: Date, shelfYears: number): string {
  const d = new Date(from);
  d.setFullYear(d.getFullYear() + shelfYears);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function placeholderLot(from = new Date()): string {
  const y = from.getFullYear();
  const m = String(from.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-001`;
}

/** First catalogue number for label preview — labels are per model, not a model count. */
export function primaryRefFromProduct(p: {
  model?: string | null;
  variants?: ProductBrandVariant[];
}): string {
  if (Array.isArray(p.variants)) {
    for (const b of p.variants) {
      const model = b.models?.find((m) => m.name?.trim())?.name?.trim();
      if (model) return b.brand?.trim() ? `${b.brand.trim()} – ${model}` : model;
    }
  }
  const scalar = p.model?.trim();
  if (scalar && !/\bmodels?\b/i.test(scalar)) return scalar;
  return "—";
}

export function buildLabelDisplayData(
  product: Pick<
    Product,
    | "name"
    | "model"
    | "variants"
    | "basicUdiDi"
    | "udiDi"
    | "isSterile"
    | "isReusable"
    | "sterilization"
    | "shelfLife"
    | "deviceClass"
  >,
  company: CompanyLabelProfile,
  locale: string,
  generatedAt = new Date(),
  options?: { ref?: string; modelSterilizations?: SterilizationMethod[] },
): LabelDisplayData {
  const years = parseShelfLifeYears(product.shelfLife);
  const shelfLifeText = product.shelfLife?.trim() || (years ? `${years} ${locale === "tr" ? "yıl" : "years"}` : "—");
  const modelSter = options?.modelSterilizations ?? [];
  const methods = modelSter.length
    ? modelSter
    : sterilizationMethodsFromVariants(product.variants);
  const sterList =
    methods.length > 0
      ? methods
      : product.isSterile &&
          product.sterilization &&
          product.sterilization !== "NON_STERILE" &&
          product.sterilization !== "OTHER"
        ? [product.sterilization]
        : [];

  const primarySter = resolvePrimarySterilization(sterList as SterilizationMethod[]);

  return {
    productName: product.name,
    manufacturer: company.legalName?.trim() || company.name,
    manufacturerAddress: company.address?.trim() || "",
    notifiedBodyNumber: company.notifiedBodyNumber?.trim() || "",
    ref: options?.ref?.trim() || primaryRefFromProduct(product),
    udi: product.udiDi?.trim() || product.basicUdiDi?.trim() || "—",
    lot: placeholderLot(generatedAt),
    exp: years ? formatExpiryYm(generatedAt, years) : "—",
    shelfLifeText,
    primarySterilization: primarySter,
    sterilizationBadge: primarySter ? sterilizationBadgeText(primarySter) : null,
    fieldSymbols: buildFieldSymbols(locale, primarySter),
    auxiliarySymbols: buildAuxiliarySymbols(product, locale),
  };
}

export function buildLabelDisplayDataForModel(
  product: Pick<
    Product,
    | "name"
    | "model"
    | "variants"
    | "basicUdiDi"
    | "udiDi"
    | "isSterile"
    | "isReusable"
    | "sterilization"
    | "shelfLife"
    | "deviceClass"
  >,
  company: CompanyLabelProfile,
  locale: string,
  model: LabelModelEntry,
  generatedAt = new Date(),
): LabelDisplayData {
  return buildLabelDisplayData(product, company, locale, generatedAt, {
    ref: model.displayRef,
    modelSterilizations: model.sterilizations,
  });
}
