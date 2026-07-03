// Helpers to present the actual sterilization method(s) of a device family.
// A product can cover several models sterilized by different validated methods
// (e.g. EO and GAMMA). The legacy scalar `sterilization` column collapses this
// to "OTHER" when more than one method is present, which is meaningless for AI
// prompts, exports and labels. These helpers recover the real method list from
// the variant matrix (variantsJson) and fall back to the scalar otherwise.

/** True when the model code denotes a radiation-validated variant (…-R). */
export function isRadiationModelCode(modelName: string): boolean {
  return /-R$/i.test(modelName.trim());
}

/**
 * Pick one sterilization method for a model when several were stored (e.g. bulk
 * add with EO+Gamma selected). Convention applies only when multiple methods
 * are present: standard models → EO, …-R → Gamma. A single stored method is
 * always kept as entered (EO stays EO, GAMMA stays GAMMA).
 */
export function resolveModelSterilization(modelName: string, methods: string[]): string | null {
  const list = methods.filter((s) => s && s !== "NON_STERILE");
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  if (isRadiationModelCode(modelName) && list.includes("GAMMA")) return "GAMMA";
  if (!isRadiationModelCode(modelName) && list.includes("EO")) return "EO";
  return list[0];
}

/** Collapse accidental multi-method rows to a single validated method per model. */
export function normalizeModelSterilizations<T extends string>(
  modelName: string,
  methods: T[],
): T[] {
  const unique = Array.from(new Set(methods.filter((s) => s && s !== "NON_STERILE"))) as T[];
  if (unique.length <= 1) return unique;
  const resolved = resolveModelSterilization(modelName, unique);
  return resolved ? ([resolved] as T[]) : unique;
}

/** Distinct, real sterilization method codes from the variant matrix, e.g. ["EO","GAMMA"]. */
export function sterilizationMethodsFromVariants(variants: unknown): string[] {
  if (!Array.isArray(variants)) return [];
  const set = new Set<string>();
  for (const b of variants as Array<{ models?: Array<{ sterilizations?: unknown }> }>) {
    for (const m of b?.models ?? []) {
      const list = Array.isArray(m?.sterilizations) ? (m.sterilizations as unknown[]) : [];
      for (const s of list) {
        if (typeof s === "string" && s && s !== "NON_STERILE") set.add(s);
      }
    }
  }
  return Array.from(set);
}

/**
 * Human/AI-readable sterilization text, e.g. "EO, GAMMA".
 * Prefers the variant matrix; falls back to the scalar enum (ignoring the
 * meaningless "OTHER"/"NON_STERILE"). Returns "" for non-sterile devices.
 */
export function sterilizationText(p: {
  isSterile?: boolean;
  sterilization?: string | null;
  variantsJson?: unknown;
  variants?: unknown;
}): string {
  if (p.isSterile === false) return "";
  const methods = sterilizationMethodsFromVariants(p.variantsJson ?? p.variants);
  if (methods.length) return methods.join(", ");
  const scalar = p.sterilization;
  if (scalar && scalar !== "OTHER" && scalar !== "NON_STERILE") return scalar;
  return "";
}
