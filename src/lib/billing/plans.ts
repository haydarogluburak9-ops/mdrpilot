/**
 * Single source of truth for subscription plan catalog (limits + display pricing + AI tokens).
 * DB `SubscriptionPlan` rows should stay in sync via seed; this file drives UI copy.
 */

export type PlanKey = "starter" | "basic" | "plus" | "pro" | "enterprise";

/** Paid annually = 10 months (2 months free). */
export const ANNUAL_FREE_MONTHS = 2;

export interface PlanCatalogEntry {
  key: PlanKey;
  /** i18n key for display name */
  nameKey: string;
  /** Monthly price in EUR; null = custom / contact sales */
  priceMonthly: number | null;
  maxProducts: number;
  maxSeats: number;
  /** Monthly AI token quota (one full TR+EN dossier pass ≈ 500k tokens per product). */
  monthlyAiTokens: number;
  featureKeys: string[];
}

/** Legacy DB keys mapped to current catalog keys. */
const PLAN_KEY_ALIASES: Record<string, PlanKey> = {};

/** ~500k tokens ≈ one product dossier (TR+EN, all modules once). */
export const TOKENS_PER_PRODUCT_FULL_DOSSIER = 500_000;

export const PLAN_CATALOG: PlanCatalogEntry[] = [
  {
    key: "starter",
    nameKey: "plan.starter",
    priceMonthly: 0,
    maxProducts: 1,
    maxSeats: 1,
    monthlyAiTokens: 0,
    featureKeys: ["billing.f.products1", "billing.f.seats1", "billing.f.mockAi"],
  },
  {
    key: "basic",
    nameKey: "plan.basic",
    priceMonthly: 250,
    maxProducts: 1,
    maxSeats: 1,
    monthlyAiTokens: 1 * TOKENS_PER_PRODUCT_FULL_DOSSIER,
    featureKeys: [
      "billing.f.products1",
      "billing.f.seats1",
      "billing.f.liveAi",
      "billing.f.exportCenter",
      "billing.f.tokens1m",
    ],
  },
  {
    key: "plus",
    nameKey: "plan.plus",
    priceMonthly: 450,
    maxProducts: 3,
    maxSeats: 3,
    monthlyAiTokens: 3 * TOKENS_PER_PRODUCT_FULL_DOSSIER,
    featureKeys: [
      "billing.f.products3",
      "billing.f.seats3",
      "billing.f.liveAi",
      "billing.f.exportCenter",
      "billing.f.tokens3m",
    ],
  },
  {
    key: "pro",
    nameKey: "plan.pro",
    priceMonthly: 750,
    maxProducts: 5,
    maxSeats: 5,
    monthlyAiTokens: 5 * TOKENS_PER_PRODUCT_FULL_DOSSIER,
    featureKeys: [
      "billing.f.products5",
      "billing.f.seats5",
      "billing.f.liveAi",
      "billing.f.exportCenter",
      "billing.f.tokens5m",
    ],
  },
  {
    key: "enterprise",
    nameKey: "plan.enterprise",
    priceMonthly: null,
    maxProducts: 9999,
    maxSeats: 9999,
    monthlyAiTokens: 50_000_000,
    featureKeys: ["billing.f.unlimited", "billing.f.sso", "billing.f.privateAi"],
  },
];

export interface TokenPack {
  key: string;
  tokens: number;
  priceEur: number;
  labelKey: string;
  /** When set, only this plan (normalized key) may purchase the pack. */
  requiredPlanKey?: PlanKey;
}

export const TOKEN_PACKS: TokenPack[] = [
  { key: "pack_500k", tokens: 500_000, priceEur: 49, labelKey: "billing.tokens.pack500k" },
  {
    key: "pack_1m",
    tokens: 1_000_000,
    priceEur: 89,
    labelKey: "billing.tokens.pack1m",
    requiredPlanKey: "pro",
  },
];

export function planAllowsTokenPurchases(planKey: string): boolean {
  return normalizePlanKey(planKey) !== "starter";
}

export function canPurchaseTokenPack(planKey: string, packKey: string): boolean {
  if (!planAllowsTokenPurchases(planKey)) return false;
  const pack = tokenPackByKey(packKey);
  if (!pack) return false;
  if (!pack.requiredPlanKey) return true;
  return normalizePlanKey(planKey) === pack.requiredPlanKey;
}

export function normalizePlanKey(key: string): string {
  return PLAN_KEY_ALIASES[key] ?? key;
}

export function planByKey(key: string): PlanCatalogEntry | undefined {
  const normalized = normalizePlanKey(key);
  return PLAN_CATALOG.find((p) => p.key === normalized);
}

export function tokenPackByKey(key: string): TokenPack | undefined {
  return TOKEN_PACKS.find((p) => p.key === key);
}

export function formatPlanPrice(priceMonthly: number | null): string {
  if (priceMonthly === null) return "Custom";
  if (priceMonthly === 0) return "€0";
  return `€${priceMonthly}`;
}

export function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return String(n);
}

/** Annual billing: pay for 10 months, get 12 (2 months free). */
export function planAnnualPrice(priceMonthly: number): number {
  return priceMonthly * (12 - ANNUAL_FREE_MONTHS);
}

export function planAnnualListPrice(priceMonthly: number): number {
  return priceMonthly * 12;
}

export function planAnnualSavingsPercent(): number {
  return Math.round((ANNUAL_FREE_MONTHS / 12) * 100);
}

export function hasAnnualDiscount(priceMonthly: number | null): priceMonthly is number {
  return priceMonthly !== null && priceMonthly > 0;
}
