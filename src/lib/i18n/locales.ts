import {
  TRANSLATOR_LOCALES,
  TRANSLATOR_LOCALE_LABELS,
  type TranslatorLocale,
} from "@/lib/document-translator/locales";

/** UI + document translator share the same seven locales. */
export type Lang = TranslatorLocale;

export const APP_LOCALES = TRANSLATOR_LOCALES;

export const LANG_SHORT: Record<Lang, string> = {
  tr: "TR",
  en: "EN",
  de: "DE",
  fr: "FR",
  es: "ES",
  it: "IT",
  nl: "NL",
};

export const LANGS: { code: Lang; label: string; short: string }[] = APP_LOCALES.map((code) => ({
  code,
  short: LANG_SHORT[code],
  label: TRANSLATOR_LOCALE_LABELS[code],
}));

export function isAppLocale(v: unknown): v is Lang {
  return typeof v === "string" && (APP_LOCALES as readonly string[]).includes(v);
}

/** Generators with TR/EN-only prose templates use English for other UI locales. */
export function binaryContentLang(lang: Lang): "tr" | "en" {
  return lang === "tr" ? "tr" : "en";
}
