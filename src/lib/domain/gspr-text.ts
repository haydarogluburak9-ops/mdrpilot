import { resolveDictionary } from "@/lib/i18n/resolve";
import { binaryContentLang, isAppLocale, type Lang } from "@/lib/i18n/locales";
import { GSPR_REQUIREMENTS_TR } from "./gspr-requirements-i18n";
import { localizeStoredJustification } from "./gspr-na-reasons";

function resolveLang(locale: string): Lang {
  return isAppLocale(locale) ? locale : "en";
}

/** Localized GSPR requirement label (UI + exports). */
export function gsprRequirementText(
  gsprNo: string,
  fallback: string,
  locale: string,
): string {
  const lang = resolveLang(locale);
  const key = `gspr.req.${gsprNo}`;
  const fromDict = resolveDictionary(lang)[key];
  if (fromDict) return fromDict;
  if (binaryContentLang(lang) === "tr" && GSPR_REQUIREMENTS_TR[gsprNo]) return GSPR_REQUIREMENTS_TR[gsprNo];
  return resolveDictionary("en")[key] ?? fallback;
}

/** Localized justification for display/export. */
export function gsprJustificationText(
  text: string | null | undefined,
  applicable: string,
  locale: string,
): string | undefined {
  return localizeStoredJustification(text, applicable, resolveLang(locale));
}
