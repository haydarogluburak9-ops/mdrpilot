/**
 * QMS onboarding path — greenfield vs imported existing documentation.
 * Stored in Company.profileJson alongside onboarding fields.
 */

export type QmsOnboardingPath = "GREENFIELD" | "IMPORTED";

export interface CompanyProfileJson {
  industry?: string;
  standards?: string[];
  productCount?: number;
  goal?: string;
  qmsPath?: QmsOnboardingPath;
}

export function parseProfileJson(raw: unknown): CompanyProfileJson {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const qmsPath = o.qmsPath;
  return {
    industry: typeof o.industry === "string" ? o.industry : undefined,
    standards: Array.isArray(o.standards) ? o.standards.filter((s) => typeof s === "string") : undefined,
    productCount: typeof o.productCount === "number" ? o.productCount : undefined,
    goal: typeof o.goal === "string" ? o.goal : undefined,
    qmsPath: qmsPath === "GREENFIELD" || qmsPath === "IMPORTED" ? qmsPath : undefined,
  };
}

export function getQmsOnboardingPath(profileJson: unknown): QmsOnboardingPath | null {
  return parseProfileJson(profileJson).qmsPath ?? null;
}

export function mergeProfileJson(
  existing: unknown,
  patch: Partial<CompanyProfileJson>,
): CompanyProfileJson {
  const base = parseProfileJson(existing);
  return { ...base, ...patch };
}

/** Recommended next step label key for i18n. */
export function qmsPathNextStepKey(path: QmsOnboardingPath | null): string {
  if (path === "IMPORTED") return "settings.phase0.nextImport";
  if (path === "GREENFIELD") return "settings.phase0.nextGreenfield";
  return "settings.phase0.nextChoose";
}
