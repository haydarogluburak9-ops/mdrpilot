import { z } from "zod";
import { binaryContentLang, type Lang } from "./locales";

const localeTuple = ["tr", "en", "de", "fr", "es", "it", "nl"] as const satisfies readonly Lang[];

export const appLocaleSchema = z.enum(localeTuple);

export function parseAppLocale(value: unknown, fallback: Lang = "tr"): Lang {
  const parsed = appLocaleSchema.safeParse(value);
  return parsed.success ? parsed.data : fallback;
}

/** Rule-based QMS templates are TR/EN; AI prompts accept all seven UI locales. */
export function qmsGeneratorLocale(lang: Lang): { ui: Lang; rules: "tr" | "en" } {
  return { ui: lang, rules: binaryContentLang(lang) };
}
